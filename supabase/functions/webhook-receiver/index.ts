import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed. Use POST.' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const webhookId = pathParts[pathParts.length - 1];

    if (!webhookId || webhookId === 'webhook-receiver') {
      return new Response(JSON.stringify({ error: 'Webhook ID is required in URL path' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[Webhook] Received for: ${webhookId}`);

    const contentType = req.headers.get('content-type') || '';
    let payload: Record<string, unknown>;

    if (contentType.includes('application/json')) {
      try { payload = await req.json(); }
      catch { return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); }
    } else if (contentType.includes('form')) {
      try { const fd = await req.formData(); payload = Object.fromEntries(fd.entries()) as Record<string, unknown>; }
      catch { return new Response(JSON.stringify({ error: 'Invalid form data' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); }
    } else {
      try { payload = JSON.parse(await req.text()); }
      catch { return new Response(JSON.stringify({ error: 'Unsupported content type' }), { status: 415, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); }
    }

    if (!payload || Object.keys(payload).length === 0) {
      return new Response(JSON.stringify({ error: 'Empty payload' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const headers: Record<string, string> = {};
    req.headers.forEach((v, k) => {
      if (!['authorization', 'cookie'].includes(k.toLowerCase())) headers[k] = v;
    });

    const sourceIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('cf-connecting-ip') || 'unknown';

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // Look up user from scheduled_jobs
    const { data: jobConfig } = await supabase
      .from('scheduled_jobs').select('user_id')
      .eq('connector_type', 'webhook').filter('connector_config->>webhookId', 'eq', webhookId).maybeSingle();

    const userId = jobConfig?.user_id || null;

    const { data, error } = await supabase
      .from('webhook_data')
      .insert({ webhook_id: webhookId, user_id: userId, payload, headers, source_ip: sourceIp, processed: false })
      .select('id, received_at').single();

    if (error) {
      console.error('[Webhook] DB error:', error);
      return new Response(JSON.stringify({ error: 'Failed to store webhook data' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ received: true, id: data.id, timestamp: data.received_at, webhook_id: webhookId }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[Webhook] Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
