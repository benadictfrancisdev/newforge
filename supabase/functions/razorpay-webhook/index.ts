import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PLAN_CREDITS: Record<string, number> = {
  free: 50, standard: 500, pro: 1500, team: 4000,
};

/**
 * Razorpay Webhook Handler
 * Handles: payment.captured, payment.failed, subscription.activated,
 *          subscription.charged, subscription.cancelled
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET");
    if (!RAZORPAY_KEY_SECRET) {
      return new Response(JSON.stringify({ error: "Webhook not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify Razorpay webhook signature
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature");

    if (!signature) {
      return new Response(JSON.stringify({ error: "Missing signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(RAZORPAY_KEY_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody));
    const expectedSig = Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    if (expectedSig !== signature) {
      console.error("Webhook signature mismatch");
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = JSON.parse(rawBody);
    const event = payload.event;
    const entity = payload.payload?.payment?.entity || payload.payload?.subscription?.entity;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`Webhook received: ${event}`);

    // ─── payment.captured ─────────────────────────────────
    if (event === "payment.captured") {
      const paymentId = entity.id;
      const orderId = entity.order_id;

      // Update payment record
      const { error } = await supabase
        .from("payments")
        .update({
          razorpay_payment_id: paymentId,
          status: "captured",
        })
        .eq("razorpay_order_id", orderId);

      if (error) console.error("Failed to update payment:", error.message);
      else console.log(`Payment captured: ${paymentId} for order ${orderId}`);
    }

    // ─── payment.failed ───────────────────────────────────
    if (event === "payment.failed") {
      const orderId = entity.order_id;
      const errorDesc = entity.error_description || "Payment failed";

      await supabase
        .from("payments")
        .update({
          status: "failed",
          metadata: { error: errorDesc, failed_at: new Date().toISOString() },
        })
        .eq("razorpay_order_id", orderId);

      console.log(`Payment failed for order ${orderId}: ${errorDesc}`);
    }

    // ─── subscription.activated ───────────────────────────
    if (event === "subscription.activated") {
      const rzSubId = entity.id;
      const planId = entity.plan_id;
      const customerId = entity.customer_id;

      console.log(`Subscription activated: ${rzSubId}, plan: ${planId}`);

      // Update subscription status in DB
      await supabase
        .from("user_subscriptions")
        .update({ status: "active" })
        .eq("razorpay_payment_id", rzSubId);
    }

    // ─── subscription.charged (recurring payment) ─────────
    if (event === "subscription.charged") {
      const rzSubId = entity.id;
      const paymentId = payload.payload?.payment?.entity?.id;

      // Find the subscription and extend it
      const { data: sub } = await supabase
        .from("user_subscriptions")
        .select("*, subscription_plans!inner(slug)")
        .eq("razorpay_payment_id", rzSubId)
        .eq("status", "active")
        .maybeSingle();

      if (sub) {
        const newExpiry = new Date(sub.expires_at || new Date());
        newExpiry.setDate(newExpiry.getDate() + 30);

        await supabase
          .from("user_subscriptions")
          .update({ expires_at: newExpiry.toISOString() })
          .eq("id", sub.id);

        // Reset monthly credits
        const planSlug = (sub as any).subscription_plans?.slug || "free";
        const monthlyCredits = PLAN_CREDITS[planSlug] || 50;

        await supabase
          .from("user_credits")
          .update({
            balance: monthlyCredits,
            monthly_credits: monthlyCredits,
            credits_reset_at: new Date().toISOString(),
          })
          .eq("user_id", sub.user_id);

        // Record payment
        await supabase.from("payments").insert({
          user_id: sub.user_id,
          razorpay_order_id: `renewal_${rzSubId}_${Date.now()}`,
          razorpay_payment_id: paymentId || rzSubId,
          amount_inr: 0, // Will be updated from actual amount
          status: "captured",
          subscription_id: sub.id,
        });

        await supabase.from("credit_transactions").insert({
          user_id: sub.user_id,
          amount: monthlyCredits,
          action: "renewal",
          feature: planSlug,
        });

        console.log(`Subscription renewed: ${rzSubId}, credits reset to ${monthlyCredits}`);
      }
    }

    // ─── subscription.cancelled ───────────────────────────
    if (event === "subscription.cancelled") {
      const rzSubId = entity.id;

      await supabase
        .from("user_subscriptions")
        .update({ status: "cancelled" })
        .eq("razorpay_payment_id", rzSubId);

      console.log(`Subscription cancelled: ${rzSubId}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Webhook error:", (err as Error).message);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
