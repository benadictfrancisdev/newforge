import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface WebhookPayload {
  [key: string]: unknown;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow POST requests for webhook data
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed. Use POST to send webhook data.' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Extract webhook ID from URL path
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const webhookId = pathParts[pathParts.length - 1];

    if (!webhookId || webhookId === 'webhook-receiver') {
      return new Response(
        JSON.stringify({ error: 'Webhook ID is required in URL path' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Webhook] Received data for webhook: ${webhookId}`);

    // Parse incoming data based on content type
    const contentType = req.headers.get('content-type') || '';
    let payload: WebhookPayload;

    if (contentType.includes('application/json')) {
      try {
        payload = await req.json();
      } catch {
        return new Response(
          JSON.stringify({ error: 'Invalid JSON payload' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
      try {
        const formData = await req.formData();
        payload = Object.fromEntries(formData.entries());
      } catch {
        return new Response(
          JSON.stringify({ error: 'Invalid form data' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      // Try to parse as JSON anyway
      try {
        const text = await req.text();
        payload = JSON.parse(text);
      } catch {
        return new Response(
          JSON.stringify({ error: 'Unsupported content type. Use application/json or form data.' }),
          { status: 415, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Validate payload is not empty
    if (!payload || (typeof payload === 'object' && Object.keys(payload).length === 0)) {
      return new Response(
        JSON.stringify({ error: 'Empty payload' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract headers for logging
    const headers: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      // Skip sensitive headers
      if (!['authorization', 'cookie'].includes(key.toLowerCase())) {
        headers[key] = value;
      }
    });

    // Get source IP
    const sourceIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                     req.headers.get('cf-connecting-ip') ||
                     'unknown';

    // Initialize Supabase client with service role for inserting data
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Look up the webhook configuration from scheduled_jobs to get user_id
    const { data: jobConfig, error: jobError } = await supabase
      .from('scheduled_jobs')
      .select('user_id, connector_config')
      .eq('connector_type', 'webhook')
      .filter('connector_config->>webhookId', 'eq', webhookId)
      .maybeSingle();

    let userId: string | null = null;
    
    if (jobConfig?.user_id) {
      userId = jobConfig.user_id;
    } else {
      // If no job found, check if webhookId looks like a user ID (for direct user webhooks)
      // This allows users to create webhooks with their own ID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(webhookId)) {
        userId = webhookId;
      }
    }

    // Insert webhook data
    const { data, error } = await supabase
      .from('webhook_data')
      .insert({
        webhook_id: webhookId,
        user_id: userId,
        payload,
        headers,
        source_ip: sourceIp,
        processed: false,
      })
      .select('id, received_at')
      .single();

    if (error) {
      console.error('[Webhook] Database error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to store webhook data', details: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Webhook] Stored data with ID: ${data.id}`);

    return new Response(
      JSON.stringify({
        received: true,
        id: data.id,
        timestamp: data.received_at,
        webhook_id: webhookId,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Webhook] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
