import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PLAN_CREDITS: Record<string, number> = {
  free: 50, standard: 300, pro: 1500, team: 4000,
  micro: 120, power: 1500, hyper: 3000,
};

const VALID_PLAN_SLUGS = ["free", "standard", "pro", "team"];
const VALID_TOPUP_SLUGS = ["micro", "power", "hyper"];

function jsonRes(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errRes(error: string, code: string, status = 400) {
  return jsonRes({ error, code }, status);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID");
    const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { action, userId } = body;

    if (!action) return errRes("Missing action", "MISSING_ACTION");
    if (!userId) return errRes("Missing userId", "AUTH_REQUIRED", 401);

    // Verify user exists in profiles table
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    if (!profile) {
      // Auto-create profile if missing (first-time user)
      await supabase.from("profiles").upsert({ id: userId });
    }

    console.log(`Action: ${action}, User: ${userId}`);

    // ─── PAYMENT HISTORY ───────────────────────────────────────
    if (action === "payment-history") {
      const { data: payments } = await supabase
        .from("payments")
        .select("id, razorpay_order_id, razorpay_payment_id, amount_inr, status, created_at, subscription_id")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);

      const { data: subscriptions } = await supabase
        .from("user_subscriptions")
        .select("id, plan_id, status, starts_at, expires_at, razorpay_payment_id, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10);

      const enriched = [];
      for (const sub of subscriptions || []) {
        const { data: plan } = await supabase
          .from("subscription_plans")
          .select("name, slug")
          .eq("id", sub.plan_id)
          .single();
        enriched.push({ ...sub, plan_name: plan?.name || "Unknown", plan_slug: plan?.slug || "" });
      }

      return jsonRes({ payments: payments || [], subscriptions: enriched });
    }

    // ─── SUBSCRIPTION STATUS ──────────────────────────────────
    if (action === "subscription-status") {
      let { data: credits } = await supabase
        .from("user_credits")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      // Auto-provision 50 free credits for new users
      if (!credits) {
        const { data: newCredits, error: insertErr } = await supabase
          .from("user_credits")
          .insert({
            user_id: userId,
            balance: 50,
            monthly_credits: 50,
            plan_slug: "free",
          })
          .select()
          .single();

        if (insertErr) {
          console.error("Failed to provision free credits:", insertErr.message);
          credits = { balance: 50, plan_slug: "free", monthly_credits: 50, user_id: userId, updated_at: new Date().toISOString(), credits_reset_at: new Date().toISOString() };
        } else {
          credits = newCredits;
          // Log the initial grant
          await supabase.from("credit_transactions").insert({
            user_id: userId,
            amount: 50,
            action: "grant",
            feature: "free_tier_signup",
          });
        }
      }

      const { data: activeSub } = await supabase
        .from("user_subscriptions")
        .select("id, plan_id, status, starts_at, expires_at")
        .eq("user_id", userId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      let planInfo = null;
      if (activeSub) {
        const { data: plan } = await supabase
          .from("subscription_plans")
          .select("name, slug, features, limits")
          .eq("id", activeSub.plan_id)
          .single();
        planInfo = plan;
      }

      return jsonRes({
        credits,
        subscription: activeSub ? { ...activeSub, plan: planInfo } : null,
      });
    }
    // ─── DEDUCT CREDITS ──────────────────────────────────────
    if (action === "deduct-credits") {
      const { amount, feature } = body;
      if (!amount || amount <= 0) return errRes("Invalid amount", "INVALID_AMOUNT");

      const { data: existing } = await supabase
        .from("user_credits")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (!existing || existing.balance < amount) {
        return errRes("Insufficient credits", "INSUFFICIENT_CREDITS");
      }

      const newBalance = existing.balance - amount;
      await supabase.from("user_credits").update({ balance: newBalance }).eq("user_id", userId);
      await supabase.from("credit_transactions").insert({
        user_id: userId,
        amount: -amount,
        action: "deduct",
        feature: feature || "unknown",
      });

      return jsonRes({ success: true, balance: newBalance });
    }

    // ─── CANCEL SUBSCRIPTION ──────────────────────────────────
    if (action === "cancel-subscription") {
      const { subscription_id } = body;
      if (!subscription_id) return errRes("Missing subscription_id", "MISSING_FIELD");

      const { data: sub } = await supabase
        .from("user_subscriptions")
        .select("*")
        .eq("id", subscription_id)
        .eq("user_id", userId)
        .eq("status", "active")
        .maybeSingle();

      if (!sub) return errRes("Active subscription not found", "NOT_FOUND", 404);

      const { error: updateErr } = await supabase
        .from("user_subscriptions")
        .update({ status: "cancelled", expires_at: new Date().toISOString() })
        .eq("id", subscription_id);

      if (updateErr) return errRes("Failed to cancel subscription", "DB_ERROR", 500);

      await supabase
        .from("user_credits")
        .update({ plan_slug: "free", monthly_credits: 50 })
        .eq("user_id", userId);

      return jsonRes({ success: true, message: "Subscription cancelled" });
    }

    // ─── REFUND ───────────────────────────────────────────────
    if (action === "refund") {
      if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
        return errRes("Payment gateway not configured", "GATEWAY_NOT_CONFIGURED", 500);
      }

      const { payment_id } = body;
      if (!payment_id) return errRes("Missing payment_id", "MISSING_FIELD");

      const { data: payment } = await supabase
        .from("payments")
        .select("*")
        .eq("id", payment_id)
        .eq("user_id", userId)
        .maybeSingle();

      if (!payment) return errRes("Payment not found", "NOT_FOUND", 404);
      if (payment.status === "refunded") return errRes("Already refunded", "ALREADY_REFUNDED");

      if (!payment.razorpay_payment_id) {
        return errRes("No Razorpay payment ID found", "NO_PAYMENT_ID");
      }

      const rzRes = await fetch(
        `https://api.razorpay.com/v1/payments/${payment.razorpay_payment_id}/refund`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Basic " + btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`),
          },
          body: JSON.stringify({ amount: payment.amount_inr * 100 }),
        }
      );
      const rzData = await rzRes.json();
      if (!rzRes.ok) return errRes(rzData.error?.description || "Refund failed", "RAZORPAY_ERROR", 500);

      await supabase.from("payments").update({ status: "refunded" }).eq("id", payment_id);

      return jsonRes({ success: true, refund_id: rzData.id });
    }

    // ─── CREATE SUBSCRIPTION (auto-renewal) ────────────────────
    if (action === "create-subscription") {
      if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
        return errRes("Payment gateway not configured", "GATEWAY_NOT_CONFIGURED", 500);
      }

      const { plan_slug, is_annual } = body;
      if (!plan_slug) return errRes("Missing plan_slug", "MISSING_FIELD");
      if (!VALID_PLAN_SLUGS.includes(plan_slug) || plan_slug === "free") {
        return errRes("Invalid plan for subscription", "INVALID_PLAN");
      }

      const { data: plan } = await supabase.from("subscription_plans").select("*").eq("slug", plan_slug).single();
      if (!plan) return errRes("Plan not found", "NOT_FOUND", 404);

      const amount = Math.round((is_annual ? plan.annual_price_usd : plan.price_usd) * 100);
      const period = is_annual ? "yearly" : "monthly";

      const planRes = await fetch("https://api.razorpay.com/v1/plans", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Basic " + btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`),
        },
        body: JSON.stringify({
          period,
          interval: 1,
          item: {
            name: `${plan.name} ${is_annual ? "Annual" : "Monthly"}`,
            amount,
            currency: "USD",
            description: `SpaceForge ${plan.name} Plan`,
          },
        }),
      });
      const rzPlan = await planRes.json();
      if (!planRes.ok) {
        console.error("Razorpay plan creation failed:", JSON.stringify(rzPlan));
        return errRes("Failed to create subscription plan", "RAZORPAY_ERROR", 500);
      }

      const subRes = await fetch("https://api.razorpay.com/v1/subscriptions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Basic " + btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`),
        },
        body: JSON.stringify({
          plan_id: rzPlan.id,
          total_count: is_annual ? 10 : 120,
          quantity: 1,
          notes: { user_id: userId, plan_slug },
        }),
      });
      const rzSub = await subRes.json();
      if (!subRes.ok) {
        console.error("Razorpay subscription creation failed:", JSON.stringify(rzSub));
        return errRes("Failed to create subscription", "RAZORPAY_ERROR", 500);
      }

      return jsonRes({
        subscription_id: rzSub.id,
        razorpay_key_id: RAZORPAY_KEY_ID,
        plan_name: plan.name,
        amount,
        short_url: rzSub.short_url,
      });
    }

    // ─── CREATE ORDER ─────────────────────────────────────────
    if (action === "create-order") {
      if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
        return errRes("Payment gateway not configured", "GATEWAY_NOT_CONFIGURED", 500);
      }

      const { plan_slug, is_annual } = body;
      if (!plan_slug) return errRes("Missing plan_slug", "MISSING_FIELD");

      const isTopup = VALID_TOPUP_SLUGS.includes(plan_slug);
      const isPlan = VALID_PLAN_SLUGS.includes(plan_slug);
      if (!isTopup && !isPlan) return errRes("Invalid plan_slug", "INVALID_PLAN");

      let amount = 0;
      let planName = "";

      if (isTopup) {
        const { data: topup } = await supabase.from("credit_topups").select("*").eq("slug", plan_slug).single();
        if (!topup) return errRes("Top-up not found", "NOT_FOUND", 404);
        amount = Math.round(topup.price_usd * 100);
        planName = `${topup.name} Top-Up`;
      } else {
        const { data: plan } = await supabase.from("subscription_plans").select("*").eq("slug", plan_slug).single();
        if (!plan) return errRes("Plan not found", "NOT_FOUND", 404);
        amount = Math.round((is_annual ? plan.annual_price_usd : plan.price_usd) * 100);
        planName = plan.name;
      }

      if (amount <= 0) return errRes("Invalid plan for payment", "INVALID_AMOUNT");

      console.log(`Creating order: plan=${plan_slug}, amount=${amount}, user=${userId}`);

      const rzRes = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Basic " + btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`),
        },
        body: JSON.stringify({ amount, currency: "USD", receipt: `${plan_slug}_${userId.slice(0, 8)}` }),
      });

      const rzOrder = await rzRes.json();
      if (!rzRes.ok) {
        console.error("Razorpay order creation failed:", JSON.stringify(rzOrder));
        return errRes(rzOrder.error?.description || "Failed to create order", "RAZORPAY_ERROR", 500);
      }

      // Record payment
      await supabase.from("payments").insert({
        user_id: userId,
        razorpay_order_id: rzOrder.id,
        amount_inr: Math.round(amount * 0.83),
        status: "created",
      });

      console.log(`Order created: ${rzOrder.id}`);

      return jsonRes({
        order_id: rzOrder.id,
        amount: rzOrder.amount,
        currency: rzOrder.currency,
        razorpay_key_id: RAZORPAY_KEY_ID,
        plan_name: planName,
      });
    }

    // ─── VERIFY PAYMENT ───────────────────────────────────────
    if (action === "verify-payment") {
      if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
        return errRes("Payment gateway not configured", "GATEWAY_NOT_CONFIGURED", 500);
      }

      const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan_slug, is_annual } = body;

      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !plan_slug) {
        return errRes("Missing required fields", "MISSING_FIELD");
      }

      // Verify HMAC signature
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        "raw", encoder.encode(RAZORPAY_KEY_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
      );
      const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(`${razorpay_order_id}|${razorpay_payment_id}`));
      const expectedSig = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");

      if (expectedSig !== razorpay_signature) {
        console.error("Signature mismatch");
        return errRes("Invalid payment signature", "INVALID_SIGNATURE");
      }

      // Idempotency check
      const { data: existingVerified } = await supabase
        .from("payments")
        .select("id, status")
        .eq("razorpay_payment_id", razorpay_payment_id)
        .eq("status", "captured")
        .maybeSingle();

      if (existingVerified) return jsonRes({ success: true, message: "Payment already verified" });

      const isTopup = VALID_TOPUP_SLUGS.includes(plan_slug);

      if (isTopup) {
        const addCredits = PLAN_CREDITS[plan_slug] || 0;
        const { data: existing } = await supabase.from("user_credits").select("*").eq("user_id", userId).maybeSingle();
        if (existing) {
          await supabase.from("user_credits").update({ balance: existing.balance + addCredits }).eq("user_id", userId);
        } else {
          await supabase.from("user_credits").insert({ user_id: userId, balance: addCredits, plan_slug: "free", monthly_credits: 50 });
        }
        await supabase.from("credit_transactions").insert({ user_id: userId, amount: addCredits, action: "topup", feature: plan_slug });
      } else {
        const { data: plan } = await supabase.from("subscription_plans").select("*").eq("slug", plan_slug).single();
        if (!plan) return errRes("Plan not found", "NOT_FOUND", 404);

        const now = new Date();
        const expiresAt = new Date(now);
        expiresAt.setHours(expiresAt.getHours() + (is_annual ? 8760 : 720));

        await supabase.from("user_subscriptions").insert({
          user_id: userId,
          plan_id: plan.id,
          razorpay_order_id,
          razorpay_payment_id,
          razorpay_signature,
          status: "active",
          starts_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
        });

        const monthlyCredits = PLAN_CREDITS[plan_slug] || 50;
        const { data: existing } = await supabase.from("user_credits").select("*").eq("user_id", userId).maybeSingle();
        if (existing) {
          await supabase.from("user_credits").update({ balance: monthlyCredits, plan_slug, monthly_credits: monthlyCredits }).eq("user_id", userId);
        } else {
          await supabase.from("user_credits").insert({ user_id: userId, balance: monthlyCredits, plan_slug, monthly_credits: monthlyCredits });
        }
      }

      // Update payment record
      await supabase
        .from("payments")
        .update({ razorpay_payment_id, status: "captured" })
        .eq("razorpay_order_id", razorpay_order_id);

      console.log(`Payment verified: ${razorpay_payment_id}`);

      return jsonRes({ success: true });
    }

    return errRes("Invalid action", "INVALID_ACTION");
  } catch (err) {
    console.error("Edge function error:", (err as Error).message);
    return errRes((err as Error).message, "INTERNAL_ERROR", 500);
  }
});
