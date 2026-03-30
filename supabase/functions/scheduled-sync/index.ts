import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function parseCSV(csvText: string, hasHeaders = true): Record<string, unknown>[] {
  const lines = csvText.trim().split('\n');
  if (lines.length === 0) return [];
  const headers = hasHeaders
    ? lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
    : lines[0].split(',').map((_, i) => `column_${i + 1}`);
  const start = hasHeaders ? 1 : 0;
  const data: Record<string, unknown>[] = [];
  for (let i = start; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    const row: Record<string, unknown> = {};
    headers.forEach((h, idx) => {
      const v = values[idx] || '';
      const n = parseFloat(v);
      row[h] = !isNaN(n) && v !== '' ? n : v;
    });
    data.push(row);
  }
  return data;
}

function extractSpreadsheetId(url: string): string | null {
  const m = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return m ? m[1] : null;
}

function getAtPath(obj: unknown, path: string): unknown {
  if (!path) return obj;
  let cur: unknown = obj;
  for (const p of path.split('.')) {
    if (cur && typeof cur === 'object' && p in cur) cur = (cur as Record<string, unknown>)[p];
    else return null;
  }
  return cur;
}

async function fetchGoogleSheets(config: Record<string, string>) {
  const { url, sheet } = config;
  if (!url) throw new Error('Spreadsheet URL is required');
  const id = extractSpreadsheetId(url);
  if (!id) throw new Error('Invalid Google Sheets URL');
  const res = await fetch(`https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheet || 'Sheet1')}`);
  if (!res.ok) throw new Error(`Failed to fetch Google Sheet: ${res.status}`);
  return parseCSV(await res.text(), true);
}

async function fetchCSVUrl(config: Record<string, string>) {
  const { url, hasHeaders } = config;
  if (!url) throw new Error('CSV URL is required');
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch CSV: ${res.status}`);
  return parseCSV(await res.text(), hasHeaders !== 'false');
}

async function fetchJsonApi(config: Record<string, string>) {
  const { url, method, apiKey, jsonPath } = config;
  if (!url) throw new Error('API URL is required');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
  const res = await fetch(url, { method: method || 'GET', headers });
  if (!res.ok) throw new Error(`API request failed: ${res.status}`);
  const data = await res.json();
  let result = jsonPath ? getAtPath(data, jsonPath) : data;
  if (!Array.isArray(result)) {
    if (typeof result === 'object' && result !== null) result = [result];
    else throw new Error('API response is not an array or object');
  }
  return result as Record<string, unknown>[];
}

async function fetchAirtable(config: Record<string, string>) {
  const { baseId, tableId, apiKey } = config;
  if (!baseId || !tableId) throw new Error('Airtable Base ID and Table ID are required');
  if (!apiKey) throw new Error('Airtable API key is required');
  const res = await fetch(`https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableId)}`, {
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(`Airtable request failed: ${res.status}`);
  const data = await res.json();
  return (data.records || []).map((r: { id: string; createdTime: string; fields: Record<string, unknown> }) => ({
    _airtable_id: r.id, _created_time: r.createdTime, ...r.fields,
  }));
}

async function fetchNotion(config: Record<string, string>) {
  const { databaseId, apiKey } = config;
  if (!databaseId) throw new Error('Notion Database ID is required');
  if (!apiKey) throw new Error('Notion API key is required');
  const res = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'Notion-Version': '2022-06-28' },
    body: JSON.stringify({}),
  });
  if (!res.ok) throw new Error(`Notion request failed: ${res.status}`);
  const data = await res.json();
  return (data.results || []).map((page: { id: string; properties: Record<string, unknown> }) => {
    const row: Record<string, unknown> = { _notion_id: page.id };
    for (const [key, prop] of Object.entries(page.properties)) {
      const pv = prop as Record<string, unknown>;
      const type = pv.type as string;
      switch (type) {
        case 'title': case 'rich_text':
          row[key] = (pv[type] as Array<{ plain_text: string }>)?.map(t => t.plain_text).join('') || ''; break;
        case 'number': row[key] = pv.number; break;
        case 'select': row[key] = (pv.select as { name: string })?.name || ''; break;
        case 'multi_select': row[key] = (pv.multi_select as Array<{ name: string }>)?.map(s => s.name).join(', ') || ''; break;
        case 'date': row[key] = (pv.date as { start: string })?.start || ''; break;
        case 'checkbox': row[key] = pv.checkbox; break;
        case 'url': row[key] = pv.url; break;
        case 'email': row[key] = pv.email; break;
        default: row[key] = JSON.stringify(pv[type]);
      }
    }
    return row;
  });
}

async function fetchConnectorData(type: string, config: Record<string, string>): Promise<Record<string, unknown>[]> {
  switch (type) {
    case 'google_sheets': return fetchGoogleSheets(config);
    case 'csv_url': return fetchCSVUrl(config);
    case 'json_api': return fetchJsonApi(config);
    case 'airtable': return fetchAirtable(config);
    case 'notion': return fetchNotion(config);
    default: throw new Error(`Unsupported connector type: ${type}`);
  }
}

function calculateNextRun(scheduleType: string): Date {
  const now = new Date();
  switch (scheduleType) {
    case 'hourly': return new Date(now.getTime() + 3600000);
    case 'daily': { const d = new Date(now); d.setDate(d.getDate() + 1); d.setHours(0, 0, 0, 0); return d; }
    case 'weekly': { const d = new Date(now); d.setDate(d.getDate() + 7); d.setHours(0, 0, 0, 0); return d; }
    default: return now;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  try {
    const { action, jobId } = await req.json();
    console.log(`scheduled-sync: action=${action}, jobId=${jobId}`);

    if (action === 'run_job' && jobId) {
      const { data: job, error: jobError } = await supabase
        .from('scheduled_jobs').select('*').eq('id', jobId).single();
      if (jobError || !job) throw new Error(`Job not found: ${jobId}`);

      const startTime = Date.now();

      const { data: historyEntry } = await supabase
        .from('job_history').insert({ job_id: jobId, status: 'running' }).select().single();

      try {
        const config = job.connector_config as Record<string, string>;
        const data = await fetchConnectorData(job.connector_type, config);
        const execTime = Date.now() - startTime;
        const nextRun = calculateNextRun(job.schedule_type);

        await supabase.from('scheduled_jobs').update({
          last_run_at: new Date().toISOString(), next_run_at: nextRun.toISOString(),
          last_run_status: 'success', last_run_message: `Synced ${data.length} records`, records_synced: data.length,
        }).eq('id', jobId);

        if (historyEntry) {
          await supabase.from('job_history').update({
            status: 'success', completed_at: new Date().toISOString(), records_synced: data.length, execution_time_ms: execTime,
          }).eq('id', historyEntry.id);
        }

        return new Response(JSON.stringify({
          success: true, data, count: data.length,
          columns: data.length > 0 ? Object.keys(data[0]) : [], executionTime: execTime,
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      } catch (syncError) {
        const execTime = Date.now() - startTime;
        const errMsg = syncError instanceof Error ? syncError.message : 'Unknown error';
        await supabase.from('scheduled_jobs').update({
          last_run_at: new Date().toISOString(), last_run_status: 'failed', last_run_message: errMsg,
        }).eq('id', jobId);
        if (historyEntry) {
          await supabase.from('job_history').update({
            status: 'failed', completed_at: new Date().toISOString(), error_message: errMsg, execution_time_ms: execTime,
          }).eq('id', historyEntry.id);
        }
        throw syncError;
      }
    }

    if (action === 'run_due_jobs') {
      const { data: dueJobs, error: jobsError } = await supabase
        .from('scheduled_jobs').select('*').eq('is_active', true).neq('schedule_type', 'manual')
        .lte('next_run_at', new Date().toISOString());
      if (jobsError) throw new Error(`Failed to fetch due jobs: ${jobsError.message}`);

      const results = [];
      for (const job of dueJobs || []) {
        try {
          const config = job.connector_config as Record<string, string>;
          const data = await fetchConnectorData(job.connector_type, config);
          const nextRun = calculateNextRun(job.schedule_type);
          await supabase.from('scheduled_jobs').update({
            last_run_at: new Date().toISOString(), next_run_at: nextRun.toISOString(),
            last_run_status: 'success', last_run_message: `Synced ${data.length} records`, records_synced: data.length,
          }).eq('id', job.id);
          await supabase.from('job_history').insert({ job_id: job.id, status: 'success', completed_at: new Date().toISOString(), records_synced: data.length });
          results.push({ jobId: job.id, success: true, records: data.length });
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : 'Unknown error';
          await supabase.from('scheduled_jobs').update({ last_run_at: new Date().toISOString(), last_run_status: 'failed', last_run_message: errMsg }).eq('id', job.id);
          await supabase.from('job_history').insert({ job_id: job.id, status: 'failed', completed_at: new Date().toISOString(), error_message: errMsg });
          results.push({ jobId: job.id, success: false, error: errMsg });
        }
      }
      return new Response(JSON.stringify({ success: true, jobsProcessed: results.length, results }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'get_history' && jobId) {
      const { data: history, error: historyError } = await supabase
        .from('job_history').select('*').eq('job_id', jobId).order('started_at', { ascending: false }).limit(20);
      if (historyError) throw new Error(`Failed to fetch history: ${historyError.message}`);
      return new Response(JSON.stringify({ success: true, history }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error('Invalid action');
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('scheduled-sync error:', msg);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
