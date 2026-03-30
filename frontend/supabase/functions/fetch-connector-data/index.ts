import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { S3Client, GetObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ConnectorRequest {
  type: 'google_sheets' | 'csv_url' | 'json_api' | 'airtable' | 'notion' | 'webhook' | 's3';
  config: Record<string, string>;
}

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
      // Try to parse numbers
      const numValue = parseFloat(value);
      row[header] = !isNaN(numValue) && value !== '' ? numValue : value;
    });
    
    data.push(row);
  }

  return data;
}

// Extract spreadsheet ID from Google Sheets URL
function extractSpreadsheetId(url: string): string | null {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

// Get data at JSON path (e.g., "data.items")
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
  
  if (!url) {
    throw new Error('Spreadsheet URL is required');
  }

  const spreadsheetId = extractSpreadsheetId(url);
  if (!spreadsheetId) {
    throw new Error('Invalid Google Sheets URL');
  }

  // Use Google Sheets public export URL (works for publicly shared sheets)
  const sheetName = sheet || 'Sheet1';
  const exportUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
  
  console.log(`Fetching Google Sheet: ${spreadsheetId}, sheet: ${sheetName}`);
  
  const response = await fetch(exportUrl);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch Google Sheet: ${response.status} - Make sure the sheet is publicly shared`);
  }

  const csvText = await response.text();
  console.log(`Received ${csvText.length} bytes of CSV data`);
  
  return parseCSV(csvText, true);
}

async function fetchCSVUrl(config: Record<string, string>): Promise<Record<string, unknown>[]> {
  const { url, hasHeaders } = config;
  
  if (!url) {
    throw new Error('CSV URL is required');
  }

  console.log(`Fetching CSV from: ${url}`);
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch CSV: ${response.status} ${response.statusText}`);
  }

  const csvText = await response.text();
  console.log(`Received ${csvText.length} bytes of CSV data`);
  
  return parseCSV(csvText, hasHeaders !== 'false');
}

async function fetchJsonApi(config: Record<string, string>): Promise<Record<string, unknown>[]> {
  const { url, method, apiKey, jsonPath } = config;
  
  if (!url) {
    throw new Error('API URL is required');
  }

  console.log(`Fetching JSON API: ${method || 'GET'} ${url}`);
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  const response = await fetch(url, {
    method: method || 'GET',
    headers,
  });
  
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  console.log(`Received JSON response`);
  
  // Extract data at path if specified
  let result = jsonPath ? getAtPath(data, jsonPath) : data;
  
  // Ensure result is an array
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
  
  if (!baseId || !tableId) {
    throw new Error('Airtable Base ID and Table ID are required');
  }
  
  if (!apiKey) {
    throw new Error('Airtable API key is required');
  }

  console.log(`Fetching Airtable: base=${baseId}, table=${tableId}`);
  
  const response = await fetch(`https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableId)}`, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Airtable error: ${errorText}`);
    throw new Error(`Airtable request failed: ${response.status}`);
  }

  const data = await response.json();
  console.log(`Received ${data.records?.length || 0} Airtable records`);
  
  // Flatten Airtable records (they have id, createdTime, and fields)
  return (data.records || []).map((record: { id: string; createdTime: string; fields: Record<string, unknown> }) => ({
    _airtable_id: record.id,
    _created_time: record.createdTime,
    ...record.fields,
  }));
}

async function fetchNotion(config: Record<string, string>): Promise<Record<string, unknown>[]> {
  const { databaseId, apiKey } = config;
  
  if (!databaseId) {
    throw new Error('Notion Database ID is required');
  }
  
  if (!apiKey) {
    throw new Error('Notion API key is required');
  }

  console.log(`Fetching Notion database: ${databaseId}`);
  
  const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Notion-Version': '2022-06-28',
    },
    body: JSON.stringify({}),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Notion error: ${errorText}`);
    throw new Error(`Notion request failed: ${response.status}`);
  }

  const data = await response.json();
  console.log(`Received ${data.results?.length || 0} Notion records`);
  
  // Flatten Notion records
  return (data.results || []).map((page: { id: string; properties: Record<string, unknown> }) => {
    const row: Record<string, unknown> = { _notion_id: page.id };
    
    // Extract property values
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

async function fetchWebhookData(config: Record<string, string>): Promise<Record<string, unknown>[]> {
  const { webhookId, limit, userId } = config;
  
  if (!webhookId) {
    throw new Error('Webhook ID is required');
  }

  console.log(`Fetching webhook data for: ${webhookId}`);

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  let query = supabase
    .from('webhook_data')
    .select('payload, received_at, source_ip')
    .eq('webhook_id', webhookId)
    .order('received_at', { ascending: false })
    .limit(parseInt(limit) || 100);

  // If userId is provided, filter by it for security
  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Webhook data fetch error:', error);
    throw new Error(`Failed to fetch webhook data: ${error.message}`);
  }

  console.log(`Fetched ${data?.length || 0} webhook records`);

  // Flatten payload and add metadata
  return (data || []).map(row => ({
    ...(typeof row.payload === 'object' ? row.payload : { data: row.payload }),
    _received_at: row.received_at,
    _source_ip: row.source_ip,
  }));
}

async function fetchS3Data(config: Record<string, string>): Promise<Record<string, unknown>[]> {
  const { bucket, region, accessKey, secretKey, prefix, fileKey } = config;
  
  if (!bucket) {
    throw new Error('S3 bucket name is required');
  }
  
  if (!region) {
    throw new Error('AWS region is required');
  }
  
  if (!accessKey || !secretKey) {
    throw new Error('AWS credentials (accessKey and secretKey) are required');
  }

  console.log(`Connecting to S3: bucket=${bucket}, region=${region}`);

  // Create S3 client
  const s3 = new S3Client({
    region,
    credentials: {
      accessKeyId: accessKey,
      secretAccessKey: secretKey,
    },
  });

  // If specific file requested
  if (fileKey) {
    console.log(`Fetching specific file: ${fileKey}`);
    return await fetchS3File(s3, bucket, fileKey);
  }

  // List files in prefix and fetch latest CSV/JSON
  console.log(`Listing files with prefix: ${prefix || '(root)'}`);
  
  const listCommand = new ListObjectsV2Command({
    Bucket: bucket,
    Prefix: prefix || '',
    MaxKeys: 100,
  });

  const listResult = await s3.send(listCommand);
  
  const files = (listResult.Contents || [])
    .filter(f => f.Key && (f.Key.endsWith('.csv') || f.Key.endsWith('.json')))
    .sort((a, b) => (b.LastModified?.getTime() || 0) - (a.LastModified?.getTime() || 0));

  console.log(`Found ${files.length} CSV/JSON files`);

  if (files.length === 0) {
    throw new Error('No CSV or JSON files found in bucket/prefix');
  }

  // Fetch the most recent file
  const latestFile = files[0];
  console.log(`Fetching latest file: ${latestFile.Key}`);
  
  return await fetchS3File(s3, bucket, latestFile.Key!);
}

async function fetchS3File(s3: S3Client, bucket: string, key: string): Promise<Record<string, unknown>[]> {
  const getCommand = new GetObjectCommand({ Bucket: bucket, Key: key });
  
  try {
    const response = await s3.send(getCommand);
    
    // Convert stream to string
    const chunks: Uint8Array[] = [];
    const reader = response.Body?.transformToWebStream().getReader();
    
    if (!reader) {
      throw new Error('Failed to read S3 object');
    }

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }

    const body = new TextDecoder().decode(
      chunks.reduce((acc, chunk) => {
        const tmp = new Uint8Array(acc.length + chunk.length);
        tmp.set(acc);
        tmp.set(chunk, acc.length);
        return tmp;
      }, new Uint8Array())
    );

    if (!body) {
      throw new Error('Empty file');
    }

    console.log(`Received ${body.length} bytes from S3`);

    // Parse based on file extension
    if (key.endsWith('.json')) {
      const parsed = JSON.parse(body);
      return Array.isArray(parsed) ? parsed : [parsed];
    } else if (key.endsWith('.csv')) {
      return parseCSV(body, true);
    } else {
      throw new Error(`Unsupported file type: ${key}`);
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'NoSuchKey') {
      throw new Error(`File not found: ${key}`);
    }
    throw error;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, config }: ConnectorRequest = await req.json();
    
    console.log(`Processing connector request: type=${type}`);
    
    let data: Record<string, unknown>[];
    
    switch (type) {
      case 'google_sheets':
        data = await fetchGoogleSheets(config);
        break;
      case 'csv_url':
        data = await fetchCSVUrl(config);
        break;
      case 'json_api':
        data = await fetchJsonApi(config);
        break;
      case 'airtable':
        data = await fetchAirtable(config);
        break;
      case 'notion':
        data = await fetchNotion(config);
        break;
      case 'webhook':
        data = await fetchWebhookData(config);
        break;
      case 's3':
        data = await fetchS3Data(config);
        break;
      default:
        throw new Error(`Unsupported connector type: ${type}`);
    }

    console.log(`Successfully fetched ${data.length} records`);

    return new Response(JSON.stringify({ 
      success: true, 
      data,
      count: data.length,
      columns: data.length > 0 ? Object.keys(data[0]) : []
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Error in fetch-connector-data function:', errorMessage);
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
