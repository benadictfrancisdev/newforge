import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ConnectorRequest {
  type: string;
  config: Record<string, string>;
  testOnly?: boolean;
}

// ── CSV helpers ────────────────────────────────────────────────
function parseCSVRobust(text: string, hasHeaders = true): Record<string, unknown>[] {
  const parseRow = (line: string): string[] => {
    const fields: string[] = [];
    let cur = ""; let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') { if (inQ && line[i+1] === '"') { cur += '"'; i++; } else inQ = !inQ; }
      else if (c === "," && !inQ) { fields.push(cur.trim()); cur = ""; }
      else cur += c;
    }
    fields.push(cur.trim());
    return fields;
  };
  const rows: string[] = [];
  let cur = ""; let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') { inQ = !inQ; cur += c; }
    else if ((c === "\n" || c === "\r") && !inQ) {
      if (c === "\r" && text[i+1] === "\n") i++;
      if (cur.trim()) rows.push(cur); cur = "";
    } else cur += c;
  }
  if (cur.trim()) rows.push(cur);
  if (rows.length < (hasHeaders ? 2 : 1)) return [];
  const headers = hasHeaders ? parseRow(rows[0]) : rows[0].split(",").map((_,i)=>`col_${i+1}`);
  return rows.slice(hasHeaders ? 1 : 0).map(row => {
    const vals = parseRow(row);
    const obj: Record<string, unknown> = {};
    headers.forEach((h, i) => { const v = vals[i]??''; const n=Number(v); obj[h]=v!==''&&!isNaN(n)?n:v; });
    return obj;
  }).filter(r => Object.values(r).some(v => v !== ""));
}

function extractSheetId(url: string): string | null {
  const m = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return m ? m[1] : null;
}

function getAtPath(obj: unknown, path: string): unknown {
  if (!path) return obj;
  let cur: unknown = obj;
  for (const p of path.split(".")) {
    if (cur && typeof cur === "object" && p in cur) cur = (cur as Record<string,unknown>)[p];
    else return null;
  }
  return cur;
}

// ── Connectors ──────────────────────────────────────────────────

async function fetchGoogleSheets(cfg: Record<string, string>) {
  const id = extractSheetId(cfg.url);
  if (!id) throw new Error("Invalid Google Sheets URL");
  const url = `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(cfg.sheet||"Sheet1")}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Google Sheets error ${res.status} — make sure the sheet is publicly shared`);
  return parseCSVRobust(await res.text(), true);
}

async function fetchCSVUrl(cfg: Record<string, string>) {
  if (!cfg.url) throw new Error("CSV URL is required");
  const res = await fetch(cfg.url);
  if (!res.ok) throw new Error(`CSV fetch failed: ${res.status} ${res.statusText}`);
  return parseCSVRobust(await res.text(), cfg.hasHeaders !== "false");
}

async function fetchJsonApi(cfg: Record<string, string>) {
  if (!cfg.url) throw new Error("API URL is required");
  const headers: Record<string,string> = { "Content-Type": "application/json" };
  if (cfg.apiKey) headers["Authorization"] = `Bearer ${cfg.apiKey}`;
  const res = await fetch(cfg.url, { method: cfg.method || "GET", headers });
  if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`);
  const raw = await res.json();
  const data = cfg.jsonPath ? getAtPath(raw, cfg.jsonPath) : raw;
  if (Array.isArray(data)) return data as Record<string,unknown>[];
  if (typeof data === "object" && data !== null) return [data as Record<string,unknown>];
  throw new Error("API response is not an array or object");
}

async function fetchAirtable(cfg: Record<string, string>) {
  if (!cfg.baseId || !cfg.tableId) throw new Error("Airtable Base ID and Table ID are required");
  if (!cfg.apiKey) throw new Error("Airtable API key is required");
  const all: Record<string,unknown>[] = [];
  let offset: string | undefined;
  do {
    const url = `https://api.airtable.com/v0/${cfg.baseId}/${encodeURIComponent(cfg.tableId)}${offset?`?offset=${offset}`:""}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${cfg.apiKey}` } });
    if (!res.ok) throw new Error(`Airtable error: ${res.status}`);
    const data = await res.json();
    (data.records||[]).forEach((r:any)=>all.push({ _id:r.id, _created:r.createdTime, ...r.fields }));
    offset = data.offset;
  } while (offset && all.length < 5000);
  return all;
}

async function fetchNotion(cfg: Record<string, string>) {
  if (!cfg.databaseId || !cfg.apiKey) throw new Error("Notion Database ID and API key are required");
  const all: Record<string,unknown>[] = [];
  let cursor: string | undefined;
  do {
    const res = await fetch(`https://api.notion.com/v1/databases/${cfg.databaseId}/query`, {
      method: "POST",
      headers: { Authorization:`Bearer ${cfg.apiKey}`, "Content-Type":"application/json", "Notion-Version":"2022-06-28" },
      body: JSON.stringify(cursor ? { start_cursor: cursor } : {}),
    });
    if (!res.ok) throw new Error(`Notion error: ${res.status}`);
    const data = await res.json();
    (data.results||[]).forEach((p:any)=>{
      const row:Record<string,unknown> = { _notion_id: p.id };
      for (const [k,prop] of Object.entries(p.properties||{})) {
        const pv = prop as any; const type = pv.type;
        switch(type) {
          case "title": case "rich_text": row[k]=(pv[type]||[]).map((t:any)=>t.plain_text).join(""); break;
          case "number": row[k]=pv.number; break;
          case "select": row[k]=pv.select?.name||""; break;
          case "multi_select": row[k]=(pv.multi_select||[]).map((s:any)=>s.name).join(", "); break;
          case "date": row[k]=pv.date?.start||""; break;
          case "checkbox": row[k]=pv.checkbox; break;
          case "url": row[k]=pv.url; break;
          case "email": row[k]=pv.email; break;
          default: try { row[k]=JSON.stringify(pv[type]); } catch { row[k]=""; }
        }
      }
      all.push(row);
    });
    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor && all.length < 5000);
  return all;
}

async function fetchWebhook(cfg: Record<string, string>) {
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const limit = parseInt(cfg.limit) || 100;
  const { data, error } = await supabase.from("webhook_data").select("payload,received_at,source_ip")
    .eq("webhook_id", cfg.webhookId).order("received_at", { ascending: false }).limit(limit);
  if (error) throw new Error(`Webhook data error: ${error.message}`);
  return (data||[]).map(r=>({ ...(typeof r.payload==="object"?r.payload:{data:r.payload}), _received_at:r.received_at, _source_ip:r.source_ip }));
}

async function fetchS3(cfg: Record<string, string>) {
  const { bucket, region, prefix, accessKeyId, secretAccessKey, presignedUrl } = cfg;

  // Option 1: Pre-signed URL (works for private buckets without credentials)
  if (presignedUrl) {
    const res = await fetch(presignedUrl);
    if (!res.ok) throw new Error(`S3 pre-signed URL fetch failed: ${res.status} — the URL may have expired`);
    const ct = res.headers.get("content-type") || presignedUrl;
    if (ct.includes("json") || presignedUrl.split("?")[0].endsWith(".json")) {
      const data = await res.json();
      return Array.isArray(data) ? data : [data];
    }
    return parseCSVRobust(await res.text(), true);
  }

  if (!bucket) throw new Error("S3 bucket name is required. You can also paste a pre-signed URL directly.");
  const fileKey = prefix?.replace(/\/$/, "") || "";
  if (!fileKey.endsWith(".csv") && !fileKey.endsWith(".json")) {
    throw new Error("S3: Specify a .csv or .json file path. For private buckets, you can: 1) Provide AWS credentials (Access Key ID & Secret), 2) Paste a pre-signed URL, or 3) Use public bucket access.");
  }

  // Option 2: Authenticated access with AWS credentials (SigV4)
  if (accessKeyId && secretAccessKey) {
    const s3Region = region || "us-east-1";
    const host = `${bucket}.s3.${s3Region}.amazonaws.com`;
    const now = new Date();
    const dateStamp = now.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    const shortDate = dateStamp.substring(0, 8);

    // Create AWS Signature V4
    const encoder = new TextEncoder();
    async function hmacSha256(key: ArrayBuffer | Uint8Array, data: string): Promise<ArrayBuffer> {
      const keyBuf = key instanceof Uint8Array ? key.buffer.slice(key.byteOffset, key.byteOffset + key.byteLength) : key;
      const cryptoKey = await crypto.subtle.importKey("raw", keyBuf as ArrayBuffer, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
      return crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(data));
    }
    async function sha256Hex(data: string): Promise<string> {
      const hash = await crypto.subtle.digest("SHA-256", encoder.encode(data));
      return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
    }

    const payloadHash = await sha256Hex("");
    const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${dateStamp}\n`;
    const signedHeaders = "host;x-amz-content-sha256;x-amz-date";
    const canonicalRequest = `GET\n/${fileKey}\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
    const credentialScope = `${shortDate}/${s3Region}/s3/aws4_request`;
    const stringToSign = `AWS4-HMAC-SHA256\n${dateStamp}\n${credentialScope}\n${await sha256Hex(canonicalRequest)}`;

    let signingKey = await hmacSha256(encoder.encode(`AWS4${secretAccessKey}`), shortDate);
    signingKey = await hmacSha256(signingKey, s3Region);
    signingKey = await hmacSha256(signingKey, "s3");
    signingKey = await hmacSha256(signingKey, "aws4_request");
    const signature = Array.from(new Uint8Array(await hmacSha256(signingKey, stringToSign))).map(b => b.toString(16).padStart(2, "0")).join("");

    const authHeader = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
    const res = await fetch(`https://${host}/${fileKey}`, {
      headers: {
        "Host": host,
        "x-amz-date": dateStamp,
        "x-amz-content-sha256": payloadHash,
        "Authorization": authHeader,
      },
    });
    if (!res.ok) throw new Error(`S3 authenticated access failed: ${res.status} — check your credentials and bucket/key path`);
    if (fileKey.endsWith(".json")) {
      const data = await res.json();
      return Array.isArray(data) ? data : [data];
    }
    return parseCSVRobust(await res.text(), true);
  }

  // Option 3: Public bucket access (no auth)
  const baseUrl = `https://${bucket}.s3.${region||"us-east-1"}.amazonaws.com`;
  const res = await fetch(`${baseUrl}/${fileKey}`);
  if (!res.ok) throw new Error(`S3 access failed: ${res.status} — bucket may be private. Provide AWS credentials or a pre-signed URL.`);
  if (fileKey.endsWith(".json")) {
    const data = await res.json();
    return Array.isArray(data) ? data : [data];
  }
  return parseCSVRobust(await res.text(), true);
}

async function fetchZohoBooks(cfg: Record<string, string>) {
  if (!cfg.orgId) throw new Error("Zoho Organization ID is required");
  if (!cfg.token) throw new Error("Zoho API token is required");
  const module = cfg.module || "invoices";
  const zohoModule = {
    invoices: "invoices", expenses: "expenses", contacts: "contacts",
    bills: "bills", payments: "customerpayments", journal: "journals", pnl: "reports/profitandloss",
  }[module] || "invoices";
  const url = zohoModule.startsWith("reports")
    ? `https://books.zoho.in/api/v3/${zohoModule}?organization_id=${cfg.orgId}`
    : `https://books.zoho.in/api/v3/${zohoModule}?organization_id=${cfg.orgId}&per_page=200`;
  const res = await fetch(url, { headers: { Authorization: `Zoho-oauthtoken ${cfg.token}`, "Content-Type": "application/json" } });
  if (!res.ok) throw new Error(`Zoho Books error: ${res.status} — verify your org ID and token`);
  const data = await res.json();
  const key = zohoModule.split("/").pop()!;
  const list = data[key] || data[module] || [];
  if (!Array.isArray(list)) throw new Error("Zoho Books: unexpected response format");
  return list as Record<string,unknown>[];
}

async function fetchTallyPrime(cfg: Record<string, string>) {
  // Tally Prime: supports both local Tally API and exported file URLs
  const { url, companyName, reportType } = cfg;
  if (!url) throw new Error(
    "Tally Prime data URL is required.\n\n" +
    "How to connect:\n" +
    "1. Local Tally API: If Tally is running locally, use http://localhost:9000 as the URL\n" +
    "2. Export URL: Export a report from Tally (File > Export > CSV/XML), upload it, and paste the URL here\n" +
    "3. Tally Cloud: Use your Tally cloud export URL"
  );

  // If URL points to local Tally API server
  if (url.includes("localhost") || url.includes("127.0.0.1")) {
    const xmlRequest = `<ENVELOPE><HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER><BODY><EXPORTDATA><REQUESTDESC><REPORTNAME>${reportType || "List of Ledgers"}</REPORTNAME>${companyName ? `<STATICVARIABLES><SVCURRENTCOMPANY>${companyName}</SVCURRENTCOMPANY></STATICVARIABLES>` : ""}</REQUESTDESC></EXPORTDATA></BODY></ENVELOPE>`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "text/xml" },
        body: xmlRequest,
      });
      if (!res.ok) throw new Error(`Tally API error: ${res.status}`);
      const text = await res.text();
      // Try to parse XML response into records
      const rows: Record<string, unknown>[] = [];
      const matches = text.matchAll(/<LEDGER[^>]*NAME="([^"]+)"[^>]*>([\s\S]*?)<\/LEDGER>/gi);
      for (const m of matches) {
        const row: Record<string, unknown> = { name: m[1] };
        const fields = m[2].matchAll(/<([A-Z_]+)>([^<]*)<\/\1>/gi);
        for (const f of fields) row[f[1].toLowerCase()] = f[2];
        rows.push(row);
      }
      if (rows.length > 0) return rows;
      // Fallback: return raw text as single record
      return [{ raw_response: text, source: "tally_prime" }];
    } catch (error) {
      throw new Error(`Tally Prime connection failed: ${error instanceof Error ? error.message : "Unknown error"}. Make sure Tally is running with API enabled (port 9000).`);
    }
  }

  // Otherwise treat as exported file URL
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Tally export fetch failed: ${res.status}`);
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("json")) {
    const d = await res.json(); return Array.isArray(d) ? d : [d];
  }
  return parseCSVRobust(await res.text(), true);
}

async function fetchBusy(cfg: Record<string, string>) {
  if (!cfg.url) throw new Error(
    "Busy Accounting data URL is required.\n\n" +
    "How to connect:\n" +
    "1. Open Busy Accounting software\n" +
    "2. Go to Administration > Export Data\n" +
    "3. Choose your report (e.g., Ledger, Trial Balance, P&L)\n" +
    "4. Export as CSV or Excel\n" +
    "5. Upload the exported file to a cloud storage and paste the URL here\n" +
    "\nAlternatively, use Busy's HTTP API if enabled (consult Busy documentation)"
  );
  const res = await fetch(cfg.url);
  if (!res.ok) throw new Error(`Busy export fetch failed: ${res.status}`);
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("json")) {
    const d = await res.json(); return Array.isArray(d) ? d : [d];
  }
  return parseCSVRobust(await res.text(), true);
}

async function fetchVyapar(cfg: Record<string, string>) {
  if (!cfg.url) throw new Error(
    "Vyapar data URL is required.\n\n" +
    "How to connect:\n" +
    "1. Open Vyapar app\n" +
    "2. Go to Reports or the section you want to export\n" +
    "3. Tap Share/Export > Export as Excel/CSV\n" +
    "4. Upload the exported file to Google Drive, Dropbox, or any cloud storage\n" +
    "5. Get the shareable link and paste it here\n" +
    "\nSupported formats: CSV, Excel, JSON"
  );
  const res = await fetch(cfg.url);
  if (!res.ok) throw new Error(`Vyapar fetch failed: ${res.status}`);
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("json")) {
    const d = await res.json(); return Array.isArray(d) ? d : [d];
  }
  return parseCSVRobust(await res.text(), true);
}

// ── Main handler ────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { type, config, testOnly = false }: ConnectorRequest = await req.json();
    console.log(`Connector: type=${type} testOnly=${testOnly}`);

    let data: Record<string, unknown>[];
    switch (type) {
      case "google_sheets": data = await fetchGoogleSheets(config); break;
      case "csv_url":       data = await fetchCSVUrl(config); break;
      case "json_api":      data = await fetchJsonApi(config); break;
      case "airtable":      data = await fetchAirtable(config); break;
      case "notion":        data = await fetchNotion(config); break;
      case "webhook":       data = await fetchWebhook(config); break;
      case "s3":            data = await fetchS3(config); break;
      case "zoho_books":    data = await fetchZohoBooks(config); break;
      case "tally":         data = await fetchTallyPrime(config); break;
      case "tally_prime":   data = await fetchTallyPrime(config); break;
      case "busy":          data = await fetchBusy(config); break;
      case "vyapar":        data = await fetchVyapar(config); break;
      default: throw new Error(`Unsupported connector type: ${type}`);
    }

    console.log(`Fetched ${data.length} records`);
    const columns = data.length > 0 ? Object.keys(data[0]) : [];

    return new Response(JSON.stringify({
      success: true,
      // testOnly: return only first row to validate without transferring all data
      data: testOnly ? data.slice(0, 1) : data,
      count: data.length,
      columns,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("fetch-connector-data error:", msg);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
