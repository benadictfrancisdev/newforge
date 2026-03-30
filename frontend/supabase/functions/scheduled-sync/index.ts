import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Parse CSV string to array of objects
function parseCSV(csvText: string, hasHeaders: boolean = true): Record<string, unknown>[] {
  const lines = csvText.trim().split('\n');
  if (lines.length === 0) return [];

  const headers = hasHeaders 
    ? lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
    : lines[0].split(',').map((_, i) => `column_${i + 1}`);

  const dataStartIndex = hasHeaders ? 1 : 0;
  const data: Record<string, unknown>[] = [];

  for (let i = dataStartIndex; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    const row: Record<string, unknown> = {};
    
    headers.forEach((header, index) => {
      const value = values[index] || '';
      const numValue = parseFloat(value);
      row[header] = !isNaN(numValue) && value !== '' ? numValue : value;
    });
    
    data.push(row);
  }

  return data;
}

function extractSpreadsheetId(url: string): string | null {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

function getAtPath(obj: unknown, path: string): unknown {
  if (!path) return obj;
  const parts = path.split('.');
  let current: unknown = obj;
  
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return null;
    }
  }
  
  return current;
}

async function fetchGoogleSheets(config: Record<string, string>): Promise<Record<string, unknown>[]> {
  const { url, sheet } = config;
  
  if (!url) throw new Error('Spreadsheet URL is required');

  const spreadsheetId = extractSpreadsheetId(url);
  if (!spreadsheetId) throw new Error('Invalid Google Sheets URL');

  const sheetName = sheet || 'Sheet1';
  const exportUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
  
  const response = await fetch(exportUrl);
  if (!response.ok) throw new Error(`Failed to fetch Google Sheet: ${response.status}`);

  const csvText = await response.text();
  return parseCSV(csvText, true);
}

async function fetchCSVUrl(config: Record<string, string>): Promise<Record<string, unknown>[]> {
  const { url, hasHeaders } = config;
  if (!url) throw new Error('CSV URL is required');

  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch CSV: ${response.status}`);

  const csvText = await response.text();
  return parseCSV(csvText, hasHeaders !== 'false');
}

async function fetchJsonApi(config: Record<string, string>): Promise<Record<string, unknown>[]> {
  const { url, method, apiKey, jsonPath } = config;
  if (!url) throw new Error('API URL is required');

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

  const response = await fetch(url, { method: method || 'GET', headers });
  if (!response.ok) throw new Error(`API request failed: ${response.status}`);

  const data = await response.json();
  let result = jsonPath ? getAtPath(data, jsonPath) : data;
  
  if (!Array.isArray(result)) {
    if (typeof result === 'object' && result !== null) {
      result = [result];
    } else {
      throw new Error('API response is not an array or object');
    }
  }
  
  return result as Record<string, unknown>[];
}

async function fetchAirtable(config: Record<string, string>): Promise<Record<string, unknown>[]> {
  const { baseId, tableId, apiKey } = config;
  if (!baseId || !tableId) throw new Error('Airtable Base ID and Table ID are required');
  if (!apiKey) throw new Error('Airtable API key is required');

  const response = await fetch(`https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableId)}`, {
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
  });
  
  if (!response.ok) throw new Error(`Airtable request failed: ${response.status}`);

  const data = await response.json();
  return (data.records || []).map((record: { id: string; createdTime: string; fields: Record<string, unknown> }) => ({
    _airtable_id: record.id,
    _created_time: record.createdTime,
    ...record.fields,
  }));
}

async function fetchNotion(config: Record<string, string>): Promise<Record<string, unknown>[]> {
  const { databaseId, apiKey } = config;
  if (!databaseId) throw new Error('Notion Database ID is required');
  if (!apiKey) throw new Error('Notion API key is required');

  const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Notion-Version': '2022-06-28',
    },
    body: JSON.stringify({}),
  });
  
  if (!response.ok) throw new Error(`Notion request failed: ${response.status}`);

  const data = await response.json();
  return (data.results || []).map((page: { id: string; properties: Record<string, unknown> }) => {
    const row: Record<string, unknown> = { _notion_id: page.id };
    
    for (const [key, prop] of Object.entries(page.properties)) {
      const propValue = prop as Record<string, unknown>;
      const type = propValue.type as string;
      
      switch (type) {
        case 'title':
        case 'rich_text':
          const textArray = propValue[type] as Array<{ plain_text: string }>;
          row[key] = textArray?.map(t => t.plain_text).join('') || '';
          break;
        case 'number':
          row[key] = propValue.number;
          break;
        case 'select':
          row[key] = (propValue.select as { name: string })?.name || '';
          break;
        case 'multi_select':
          row[key] = (propValue.multi_select as Array<{ name: string }>)?.map(s => s.name).join(', ') || '';
          break;
        case 'date':
          row[key] = (propValue.date as { start: string })?.start || '';
          break;
        case 'checkbox':
          row[key] = propValue.checkbox;
          break;
        case 'url':
          row[key] = propValue.url;
          break;
        case 'email':
          row[key] = propValue.email;
          break;
        default:
          row[key] = JSON.stringify(propValue[type]);
      }
    }
    
    return row;
  });
}

async function fetchConnectorData(type: string, config: Record<string, string>): Promise<Record<string, unknown>[]> {
  switch (type) {
    case 'google_sheets':
      return await fetchGoogleSheets(config);
    case 'csv_url':
      return await fetchCSVUrl(config);
    case 'json_api':
      return await fetchJsonApi(config);
    case 'airtable':
      return await fetchAirtable(config);
    case 'notion':
      return await fetchNotion(config);
    default:
      throw new Error(`Unsupported connector type: ${type}`);
  }
}

function calculateNextRun(scheduleType: string, cronExpression?: string): Date {
  const now = new Date();
  
  switch (scheduleType) {
    case 'hourly':
      return new Date(now.getTime() + 60 * 60 * 1000);
    case 'daily':
      const nextDay = new Date(now);
      nextDay.setDate(nextDay.getDate() + 1);
      nextDay.setHours(0, 0, 0, 0);
      return nextDay;
    case 'weekly':
      const nextWeek = new Date(now);
      nextWeek.setDate(nextWeek.getDate() + 7);
      nextWeek.setHours(0, 0, 0, 0);
      return nextWeek;
    case 'custom':
      // For custom cron, default to 1 hour
      return new Date(now.getTime() + 60 * 60 * 1000);
    default:
      return now;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { action, jobId, userId } = await req.json();
    console.log(`Scheduled sync action: ${action}, jobId: ${jobId}`);

    if (action === 'run_job' && jobId) {
      // Run a specific job
      const { data: job, error: jobError } = await supabase
        .from('scheduled_jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (jobError || !job) {
        throw new Error(`Job not found: ${jobId}`);
      }

      const startTime = Date.now();

      // Create history entry
      const { data: historyEntry, error: historyError } = await supabase
        .from('job_history')
        .insert({
          job_id: jobId,
          status: 'running',
        })
        .select()
        .single();

      if (historyError) {
        console.error('Failed to create history entry:', historyError);
      }

      try {
        const config = job.connector_config as Record<string, string>;
        const data = await fetchConnectorData(job.connector_type, config);
        
        const executionTime = Date.now() - startTime;
        const nextRun = calculateNextRun(job.schedule_type, job.cron_expression);

        // Update job status
        await supabase
          .from('scheduled_jobs')
          .update({
            last_run_at: new Date().toISOString(),
            next_run_at: nextRun.toISOString(),
            last_run_status: 'success',
            last_run_message: `Successfully synced ${data.length} records`,
            records_synced: data.length,
          })
          .eq('id', jobId);

        // Update history entry
        if (historyEntry) {
          await supabase
            .from('job_history')
            .update({
              status: 'success',
              completed_at: new Date().toISOString(),
              records_synced: data.length,
              execution_time_ms: executionTime,
            })
            .eq('id', historyEntry.id);
        }

        return new Response(JSON.stringify({
          success: true,
          data,
          count: data.length,
          columns: data.length > 0 ? Object.keys(data[0]) : [],
          executionTime,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      } catch (syncError) {
        const executionTime = Date.now() - startTime;
        const errorMessage = syncError instanceof Error ? syncError.message : 'Unknown error';

        // Update job status with error
        await supabase
          .from('scheduled_jobs')
          .update({
            last_run_at: new Date().toISOString(),
            last_run_status: 'failed',
            last_run_message: errorMessage,
          })
          .eq('id', jobId);

        // Update history entry
        if (historyEntry) {
          await supabase
            .from('job_history')
            .update({
              status: 'failed',
              completed_at: new Date().toISOString(),
              error_message: errorMessage,
              execution_time_ms: executionTime,
            })
            .eq('id', historyEntry.id);
        }

        throw syncError;
      }
    }

    if (action === 'run_due_jobs') {
      // Run all jobs that are due
      const { data: dueJobs, error: jobsError } = await supabase
        .from('scheduled_jobs')
        .select('*')
        .eq('is_active', true)
        .neq('schedule_type', 'manual')
        .lte('next_run_at', new Date().toISOString());

      if (jobsError) {
        throw new Error(`Failed to fetch due jobs: ${jobsError.message}`);
      }

      console.log(`Found ${dueJobs?.length || 0} due jobs`);

      const results = [];
      for (const job of dueJobs || []) {
        try {
          const config = job.connector_config as Record<string, string>;
          const data = await fetchConnectorData(job.connector_type, config);
          const nextRun = calculateNextRun(job.schedule_type, job.cron_expression);

          await supabase
            .from('scheduled_jobs')
            .update({
              last_run_at: new Date().toISOString(),
              next_run_at: nextRun.toISOString(),
              last_run_status: 'success',
              last_run_message: `Successfully synced ${data.length} records`,
              records_synced: data.length,
            })
            .eq('id', job.id);

          await supabase
            .from('job_history')
            .insert({
              job_id: job.id,
              status: 'success',
              completed_at: new Date().toISOString(),
              records_synced: data.length,
            });

          results.push({ jobId: job.id, success: true, records: data.length });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          
          await supabase
            .from('scheduled_jobs')
            .update({
              last_run_at: new Date().toISOString(),
              last_run_status: 'failed',
              last_run_message: errorMessage,
            })
            .eq('id', job.id);

          await supabase
            .from('job_history')
            .insert({
              job_id: job.id,
              status: 'failed',
              completed_at: new Date().toISOString(),
              error_message: errorMessage,
            });

          results.push({ jobId: job.id, success: false, error: errorMessage });
        }
      }

      return new Response(JSON.stringify({
        success: true,
        jobsProcessed: results.length,
        results,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'get_history' && jobId) {
      const { data: history, error: historyError } = await supabase
        .from('job_history')
        .select('*')
        .eq('job_id', jobId)
        .order('started_at', { ascending: false })
        .limit(20);

      if (historyError) {
        throw new Error(`Failed to fetch history: ${historyError.message}`);
      }

      return new Response(JSON.stringify({
        success: true,
        history,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error('Invalid action');

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Error in scheduled-sync function:', errorMessage);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});