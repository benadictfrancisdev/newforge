import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { action, whatsappNumber, email, insights, datasetName } = await req.json();

    if (action === 'send_test' || action === 'send_daily') {
      const insightsList = insights || [
        { title: "Revenue spike detected", summary: "Revenue jumped 34% above the 30-day average.", urgency: "high" },
        { title: "Customer retention declining", summary: "30-day retention rate dropped from 68% to 59%.", urgency: "high" },
        { title: "Untapped segment found", summary: "Tier-2 cities show 2.1x higher avg order value.", urgency: "medium" },
      ];

      // Format the message
      const messageLines = [
        `🔔 *SpaceForge AI — Daily Insight Digest*`,
        `📊 Dataset: ${datasetName || 'Your Data'}`,
        `⏰ ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`,
        ``,
        ...insightsList.map((insight: any, i: number) => {
          const emoji = insight.urgency === 'high' ? '🔴' : insight.urgency === 'medium' ? '🟡' : '🟢';
          return `${emoji} *${i + 1}. ${insight.title}*\n${insight.summary}`;
        }),
        ``,
        `💬 Reply "tell me more about #1" to start a conversation.`,
        `🔗 Open SpaceForge → https://spaceforge.lovable.app/agent`,
      ];

      const formattedMessage = messageLines.join('\n');

      const results: any = { message: formattedMessage };

      // Try WhatsApp via Twilio if configured
      if (whatsappNumber) {
        const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
        const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
        const TWILIO_WHATSAPP_FROM = Deno.env.get('TWILIO_WHATSAPP_FROM');

        // Also check for Lovable connector gateway
        const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
        const TWILIO_API_KEY = Deno.env.get('TWILIO_API_KEY');

        if (LOVABLE_API_KEY && TWILIO_API_KEY) {
          // Use Lovable connector gateway
          const GATEWAY_URL = 'https://connector-gateway.lovable.dev/twilio';
          
          const cleanNumber = whatsappNumber.replace(/\s+/g, '').replace(/^(\+?)/, '+');
          const whatsappTo = `whatsapp:${cleanNumber}`;

          const response = await fetch(`${GATEWAY_URL}/Messages.json`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${LOVABLE_API_KEY}`,
              'X-Connection-Api-Key': TWILIO_API_KEY,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              To: whatsappTo,
              From: 'whatsapp:+14155238886', // Twilio sandbox default
              Body: formattedMessage,
            }),
          });

          const data = await response.json();
          if (!response.ok) {
            console.error('Twilio gateway error:', data);
            results.whatsapp = { success: false, error: `Twilio API error [${response.status}]: ${JSON.stringify(data)}` };
          } else {
            results.whatsapp = { success: true, sid: data.sid };
          }
        } else if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_WHATSAPP_FROM) {
          // Direct Twilio API
          const cleanNumber = whatsappNumber.replace(/\s+/g, '').replace(/^(\+?)/, '+');
          const whatsappTo = `whatsapp:${cleanNumber}`;
          const whatsappFrom = `whatsapp:${TWILIO_WHATSAPP_FROM}`;

          const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
          const authString = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

          const response = await fetch(twilioUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${authString}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              To: whatsappTo,
              From: whatsappFrom,
              Body: formattedMessage,
            }),
          });

          const data = await response.json();
          if (!response.ok) {
            console.error('Twilio direct error:', data);
            results.whatsapp = { success: false, error: data.message || 'Failed to send WhatsApp message' };
          } else {
            results.whatsapp = { success: true, sid: data.sid };
          }
        } else {
          results.whatsapp = { 
            success: false, 
            error: 'WhatsApp not configured. Connect Twilio to enable WhatsApp delivery.',
            requires_setup: true
          };
        }
      }

      // Email would go here (future implementation)
      if (email) {
        results.email = { success: false, error: 'Email delivery coming soon. Use WhatsApp for now.' };
      }

      return new Response(JSON.stringify({ success: true, ...results }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error in send-whatsapp-insight:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unexpected error" }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
