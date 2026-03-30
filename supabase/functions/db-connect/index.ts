import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Client as PostgresClient } from "https://deno.land/x/postgres@v0.17.0/mod.ts";
import { Client as MySQLClient } from "https://deno.land/x/mysql@v2.12.1/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface ConnectionRequest {
  action: 'test' | 'save' | 'list-tables' | 'get-schema' | 'query' | 'nl-query' | 'delete';
  connectionId?: string;
  userId?: string; // Firebase UID passed from frontend
  connection?: {
    name: string;
    db_type: 'postgresql' | 'mysql' | 'sqlite' | 'mongodb';
    host: string;
    port: number;
    database_name: string;
    username: string;
    password: string;
    ssl_enabled?: boolean;
  };
  tableName?: string;
  sql?: string;
  naturalLanguageQuery?: string;
  tableContext?: string[];
}

interface DatabaseConnection {
  id: string;
  host: string;
  port: number;
  database_name: string;
  username: string;
  encrypted_password: string;
  ssl_enabled: boolean;
  db_type: string;
}

function encryptPassword(password: string, key: string): string {
  const keyBytes = new TextEncoder().encode(key);
  const pwBytes = new TextEncoder().encode(password);
  const encrypted = new Uint8Array(pwBytes.length);
  for (let i = 0; i < pwBytes.length; i++) {
    encrypted[i] = pwBytes[i] ^ keyBytes[i % keyBytes.length];
  }
  return btoa(String.fromCharCode(...encrypted));
}

function decryptPassword(encrypted: string, key: string): string {
  const keyBytes = new TextEncoder().encode(key);
  const encBytes = new Uint8Array(atob(encrypted).split('').map(c => c.charCodeAt(0)));
  const decrypted = new Uint8Array(encBytes.length);
  for (let i = 0; i < encBytes.length; i++) {
    decrypted[i] = encBytes[i] ^ keyBytes[i % keyBytes.length];
  }
  return new TextDecoder().decode(decrypted);
}

function validateSqlQuery(sql: string): { valid: boolean; reason?: string } {
  const normalizedSql = sql.trim().toUpperCase();
  if (!normalizedSql.startsWith('SELECT') && !normalizedSql.startsWith('SHOW') &&
      !normalizedSql.startsWith('DESCRIBE') && !normalizedSql.startsWith('PRAGMA')) {
    return { valid: false, reason: 'Only SELECT queries are allowed for security reasons' };
  }
  const dangerousKeywords = [
    'DROP', 'DELETE', 'TRUNCATE', 'UPDATE', 'INSERT', 'ALTER', 'CREATE',
    'GRANT', 'REVOKE', 'EXEC', 'EXECUTE', 'INTO OUTFILE', 'LOAD_FILE'
  ];
  for (const keyword of dangerousKeywords) {
    if (normalizedSql.includes(keyword)) {
      return { valid: false, reason: `Dangerous keyword detected: ${keyword}` };
    }
  }
  if (!normalizedSql.includes('LIMIT') && normalizedSql.startsWith('SELECT')) {
    return { valid: true, reason: 'Query will be limited to 1000 rows' };
  }
  return { valid: true };
}

async function executePostgresQuery(
  connection: DatabaseConnection,
  sql: string,
  encryptionKey: string
): Promise<{ results: Record<string, unknown>[]; rowCount: number }> {
  const password = decryptPassword(connection.encrypted_password, encryptionKey);
  const client = new PostgresClient({
    hostname: connection.host,
    port: connection.port,
    database: connection.database_name,
    user: connection.username,
    password: password,
    tls: connection.ssl_enabled ? { enabled: true, enforce: false } : { enabled: false },
  });
  try {
    await client.connect();
    console.log('[DB-Connect] PostgreSQL connected successfully');
    const result = await client.queryObject<Record<string, unknown>>(sql);
    return { results: result.rows, rowCount: result.rowCount || 0 };
  } finally {
    await client.end();
  }
}

async function executeMySQLQuery(
  connection: DatabaseConnection,
  sql: string,
  encryptionKey: string
): Promise<{ results: Record<string, unknown>[]; rowCount: number }> {
  const password = decryptPassword(connection.encrypted_password, encryptionKey);
  const client = await new MySQLClient().connect({
    hostname: connection.host,
    port: connection.port,
    db: connection.database_name,
    username: connection.username,
    password: password,
  });
  try {
    console.log('[DB-Connect] MySQL connected successfully');
    const rows = await client.query(sql);
    const results = Array.isArray(rows) ? rows as Record<string, unknown>[] : [];
    return { results, rowCount: results.length };
  } finally {
    await client.close();
  }
}

async function executeSQLiteQuery(
  connection: DatabaseConnection,
  sql: string,
  encryptionKey: string
): Promise<{ results: Record<string, unknown>[]; rowCount: number }> {
  // SQLite via Turso/LibSQL HTTP API
  // host should be the Turso database URL (e.g., https://mydb-myorg.turso.io)
  // password is the auth token
  const authToken = decryptPassword(connection.encrypted_password, encryptionKey);
  let baseUrl = connection.host;
  if (!baseUrl.startsWith('http')) {
    baseUrl = `https://${baseUrl}`;
  }

  console.log('[DB-Connect] SQLite/Turso executing query via HTTP API');
  const response = await fetch(`${baseUrl}/v2/pipeline`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requests: [
        { type: 'execute', stmt: { sql } },
        { type: 'close' }
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`SQLite/Turso query failed: ${response.status} - ${errText}`);
  }

  const data = await response.json();
  const executeResult = data.results?.[0];
  if (executeResult?.type === 'error') {
    throw new Error(`SQLite query error: ${executeResult.error?.message || 'Unknown error'}`);
  }

  const resultResponse = executeResult?.response?.result;
  if (!resultResponse) {
    return { results: [], rowCount: 0 };
  }

  const cols = resultResponse.cols?.map((c: { name: string }) => c.name) || [];
  const rows = resultResponse.rows || [];
  const results: Record<string, unknown>[] = rows.map((row: { type: string; value: unknown }[]) => {
    const obj: Record<string, unknown> = {};
    row.forEach((cell: { type: string; value: unknown }, idx: number) => {
      obj[cols[idx]] = cell.value;
    });
    return obj;
  });

  return { results, rowCount: results.length };
}

async function executeMongoDBQuery(
  connection: DatabaseConnection,
  queryStr: string,
  encryptionKey: string
): Promise<{ results: Record<string, unknown>[]; rowCount: number }> {
  // MongoDB via Atlas Data API
  // host = Atlas Data API endpoint or cluster URL
  // password = API key or connection string password
  const apiKey = decryptPassword(connection.encrypted_password, encryptionKey);

  // Parse the query string - expect JSON format like:
  // {"collection": "users", "filter": {"age": {"$gt": 25}}, "limit": 100}
  let parsedQuery: { collection: string; filter?: Record<string, unknown>; limit?: number; projection?: Record<string, unknown>; sort?: Record<string, unknown> };
  try {
    parsedQuery = JSON.parse(queryStr);
  } catch {
    // Try to extract collection name from SQL-like syntax
    const match = queryStr.match(/(?:FROM|from)\s+(\w+)/);
    if (match) {
      parsedQuery = { collection: match[1], filter: {}, limit: 100 };
    } else {
      throw new Error('MongoDB queries should be JSON format: {"collection": "name", "filter": {}, "limit": 100}');
    }
  }

  if (!parsedQuery.collection) {
    throw new Error('MongoDB query must specify a collection name');
  }

  let baseUrl = connection.host;
  if (!baseUrl.startsWith('http')) {
    baseUrl = `https://${baseUrl}`;
  }

  // Use MongoDB Atlas Data API
  const dataApiUrl = baseUrl.includes('data.mongodb-api.com')
    ? baseUrl
    : `https://data.mongodb-api.com/app/data-${connection.database_name}/endpoint/data/v1`;

  console.log('[DB-Connect] MongoDB executing query via Data API');
  const response = await fetch(`${dataApiUrl}/action/find`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify({
      dataSource: connection.database_name,
      database: connection.database_name,
      collection: parsedQuery.collection,
      filter: parsedQuery.filter || {},
      projection: parsedQuery.projection || {},
      sort: parsedQuery.sort || {},
      limit: Math.min(parsedQuery.limit || 100, 1000),
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`MongoDB query failed: ${response.status} - ${errText}`);
  }

  const data = await response.json();
  const documents = data.documents || [];
  return { results: documents, rowCount: documents.length };
}

function validateMongoQuery(queryStr: string): { valid: boolean; reason?: string } {
  try {
    const parsed = JSON.parse(queryStr);
    if (!parsed.collection) {
      return { valid: false, reason: 'MongoDB query must include a "collection" field' };
    }
    // Check for dangerous operations
    const strQuery = JSON.stringify(parsed);
    if (strQuery.includes('$where') || strQuery.includes('$function')) {
      return { valid: false, reason: 'Dangerous MongoDB operator detected' };
    }
    return { valid: true };
  } catch {
    // Allow SQL-like queries that will be converted
    const normalized = queryStr.trim().toUpperCase();
    if (normalized.startsWith('SELECT') || normalized.startsWith('SHOW') || normalized.startsWith('DESCRIBE')) {
      return { valid: true, reason: 'SQL-style query will be converted to MongoDB format' };
    }
    return { valid: false, reason: 'MongoDB query must be valid JSON: {"collection": "name", "filter": {}}' };
  }
}

async function executeQuery(
  connection: DatabaseConnection,
  sql: string,
  encryptionKey: string
): Promise<{ results: Record<string, unknown>[]; rowCount: number }> {
  switch (connection.db_type) {
    case 'postgresql':
      return await executePostgresQuery(connection, sql, encryptionKey);
    case 'mysql':
      return await executeMySQLQuery(connection, sql, encryptionKey);
    case 'sqlite':
      return await executeSQLiteQuery(connection, sql, encryptionKey);
    case 'mongodb':
      return await executeMongoDBQuery(connection, sql, encryptionKey);
    default:
      throw new Error(`Unsupported database type: ${connection.db_type}`);
  }
}

async function naturalLanguageToSQL(
  query: string,
  tableContext: string[],
  dbType: string
): Promise<{ sql: string; explanation: string }> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) throw new Error('AI service not configured');

  const isMongoDb = dbType === 'mongodb';
  const systemPrompt = isMongoDb
    ? `You are a MongoDB expert. Convert natural language queries to MongoDB Data API JSON format.
RULES:
1. ONLY generate read queries (find operations)
2. Never use delete, update, insert, or any modifying operations
3. Always include a limit (max 1000)
Available collections: ${tableContext.join(', ')}
Respond ONLY with valid JSON:
{"sql": "{\"collection\": \"collectionName\", \"filter\": {}, \"limit\": 100}", "explanation": "Brief explanation"}`
    : `You are a SQL expert. Convert natural language queries to safe, read-only SQL.
RULES:
1. ONLY generate SELECT statements
2. Never use DELETE, UPDATE, INSERT, DROP, or any modifying statements
3. Always include LIMIT clause (max 1000 rows)
4. Target ${dbType} dialect specifically
Available tables: ${tableContext.join(', ')}
Respond ONLY with valid JSON:
{"sql": "SELECT ... FROM ... LIMIT 100", "explanation": "Brief explanation"}`;

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: query }
      ],
      temperature: 0.3,
    }),
  });

  if (!response.ok) throw new Error('Failed to generate SQL');

  const result = await response.json();
  const content = result.choices?.[0]?.message?.content || '';
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
  } catch { /* fallback */ }
  return { sql: '', explanation: 'Failed to generate SQL' };
}

async function testConnection(connection: ConnectionRequest['connection']): Promise<{ success: boolean; message: string; tables?: string[] }> {
  if (!connection) return { success: false, message: 'Connection details required' };
  const { host, port, database_name, username, password, db_type, ssl_enabled } = connection;
  if (!host || !database_name) return { success: false, message: 'Missing required connection parameters (host and database name)' };
  if (db_type !== 'sqlite' && db_type !== 'mongodb' && !username) return { success: false, message: 'Username is required' };
  if (db_type !== 'sqlite' && (port < 1 || port > 65535)) return { success: false, message: 'Invalid port number' };

  if (db_type === 'postgresql') {
    const client = new PostgresClient({
      hostname: host, port, database: database_name, user: username, password,
      tls: ssl_enabled ? { enabled: true, enforce: false } : { enabled: false },
    });
    try {
      await client.connect();
      const result = await client.queryObject<{ table_name: string }>(
        `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`
      );
      await client.end();
      const tables = result.rows.map(r => r.table_name);
      return { success: true, message: `Connected to PostgreSQL. Found ${tables.length} tables.`, tables };
    } catch (error) {
      console.error('[DB-Connect] PostgreSQL connection error:', error);
      return { success: false, message: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }

  if (db_type === 'mysql') {
    try {
      const client = await new MySQLClient().connect({
        hostname: host, port, db: database_name, username, password,
      });
      const rows = await client.query(`SHOW TABLES`);
      await client.close();
      const tables = Array.isArray(rows)
        ? rows.map((r: Record<string, unknown>) => Object.values(r)[0] as string)
        : [];
      return { success: true, message: `Connected to MySQL. Found ${tables.length} tables.`, tables };
    } catch (error) {
      console.error('[DB-Connect] MySQL connection error:', error);
      return { success: false, message: `MySQL connection failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }

  if (db_type === 'sqlite') {
    try {
      let baseUrl = host;
      if (!baseUrl.startsWith('http')) baseUrl = `https://${baseUrl}`;
      const response = await fetch(`${baseUrl}/v2/pipeline`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${password}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            { type: 'execute', stmt: { sql: "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name" } },
            { type: 'close' }
          ],
        }),
      });
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errText}`);
      }
      const data = await response.json();
      const result = data.results?.[0]?.response?.result;
      const tables = result?.rows?.map((row: { type: string; value: unknown }[]) => row[0]?.value as string) || [];
      return { success: true, message: `Connected to SQLite/Turso. Found ${tables.length} tables.`, tables };
    } catch (error) {
      console.error('[DB-Connect] SQLite/Turso connection error:', error);
      return { success: false, message: `SQLite/Turso connection failed: ${error instanceof Error ? error.message : 'Unknown error'}. Use your Turso database URL as host and auth token as password.` };
    }
  }

  if (db_type === 'mongodb') {
    try {
      let baseUrl = host;
      if (!baseUrl.startsWith('http')) baseUrl = `https://${baseUrl}`;
      const dataApiUrl = baseUrl.includes('data.mongodb-api.com')
        ? baseUrl
        : `https://data.mongodb-api.com/app/data-${database_name}/endpoint/data/v1`;
      const response = await fetch(`${dataApiUrl}/action/find`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': password,
        },
        body: JSON.stringify({
          dataSource: database_name,
          database: database_name,
          collection: '_test_connection',
          filter: {},
          limit: 1,
        }),
      });
      if (response.ok || response.status === 400) {
        return { success: true, message: `Connected to MongoDB Atlas. Use JSON queries: {"collection": "name", "filter": {}}`, tables: [] };
      }
      const errText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errText}`);
    } catch (error) {
      console.error('[DB-Connect] MongoDB connection error:', error);
      return { success: false, message: `MongoDB connection failed: ${error instanceof Error ? error.message : 'Unknown error'}. Use Atlas Data API endpoint as host and API key as password.` };
    }
  }

  const supportedTypes = ['postgresql', 'mysql', 'sqlite', 'mongodb'];
  if (!supportedTypes.includes(db_type)) return { success: false, message: `Unsupported database type: ${db_type}` };
  return { success: true, message: `Connection parameters validated for ${db_type}. Ready to save.`, tables: [] };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: ConnectionRequest = await req.json();
    const { action, userId } = body;

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User ID required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[DB-Connect] Action: ${action} by user: ${userId}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const encryptionKey = supabaseServiceKey.substring(0, 32);

    switch (action) {
      case 'test': {
        const result = await testConnection(body.connection);
        return new Response(JSON.stringify(result), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      case 'save': {
        if (!body.connection) {
          return new Response(JSON.stringify({ error: 'Connection details required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        const { name, db_type, host, port, database_name, username, password, ssl_enabled } = body.connection;
        const encrypted_password = encryptPassword(password, encryptionKey);
        const { data, error } = await supabase
          .from('database_connections')
          .insert({ user_id: userId, name, db_type, host, port, database_name, username, encrypted_password, ssl_enabled: ssl_enabled ?? true, connection_status: 'active' })
          .select()
          .single();
        if (error) {
          console.error('[DB-Connect] Save error:', error);
          return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        return new Response(JSON.stringify({ success: true, connection: { ...data, encrypted_password: undefined } }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      case 'delete': {
        if (!body.connectionId) {
          return new Response(JSON.stringify({ error: 'Connection ID required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        const { error } = await supabase.from('database_connections').delete().eq('id', body.connectionId).eq('user_id', userId);
        if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      case 'list-tables': {
        if (!body.connectionId) {
          return new Response(JSON.stringify({ error: 'Connection ID required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        const { data: connection, error: connError } = await supabase.from('database_connections').select('*').eq('id', body.connectionId).eq('user_id', userId).single();
        if (connError || !connection) return new Response(JSON.stringify({ error: 'Connection not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

        try {
          let tables: string[] = [];
          if (connection.db_type === 'postgresql') {
            const sql = `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`;
            const result = await executePostgresQuery(connection as DatabaseConnection, sql, encryptionKey);
            tables = result.results.map(row => row.table_name as string);
          } else if (connection.db_type === 'mysql') {
            const result = await executeMySQLQuery(connection as DatabaseConnection, 'SHOW TABLES', encryptionKey);
            tables = result.results.map((r: Record<string, unknown>) => Object.values(r)[0] as string);
          } else if (connection.db_type === 'sqlite') {
            const result = await executeSQLiteQuery(connection as DatabaseConnection, "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name", encryptionKey);
            tables = result.results.map(r => r.name as string);
          } else if (connection.db_type === 'mongodb') {
            return new Response(JSON.stringify({ success: true, tables: [], message: 'MongoDB uses collections. Query with: {"collection": "name", "filter": {}}' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          }
          return new Response(JSON.stringify({ success: true, tables }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        } catch (error) {
          return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to list tables' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
      }

      case 'get-schema': {
        if (!body.tableName || !body.connectionId) {
          return new Response(JSON.stringify({ error: 'Table name and connection ID required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        const { data: connection, error: connError } = await supabase.from('database_connections').select('*').eq('id', body.connectionId).eq('user_id', userId).single();
        if (connError || !connection) return new Response(JSON.stringify({ error: 'Connection not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

        try {
          const safeTableName = body.tableName.replace(/[^a-zA-Z0-9_]/g, '');
          let columns: { name: unknown; type: unknown; nullable?: boolean; default?: unknown }[] = [];

          if (connection.db_type === 'postgresql') {
            const sql = `SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_name = '${safeTableName}' AND table_schema = 'public' ORDER BY ordinal_position`;
            const result = await executePostgresQuery(connection as DatabaseConnection, sql, encryptionKey);
            columns = result.results.map(col => ({ name: col.column_name, type: col.data_type, nullable: col.is_nullable === 'YES', default: col.column_default }));
          } else if (connection.db_type === 'mysql') {
            const result = await executeMySQLQuery(connection as DatabaseConnection, `DESCRIBE \`${safeTableName}\``, encryptionKey);
            columns = result.results.map(col => ({ name: col.Field, type: col.Type, nullable: col.Null === 'YES', default: col.Default }));
          } else if (connection.db_type === 'sqlite') {
            const result = await executeSQLiteQuery(connection as DatabaseConnection, `PRAGMA table_info(${safeTableName})`, encryptionKey);
            columns = result.results.map(col => ({ name: col.name, type: col.type, nullable: col.notnull === 0, default: col.dflt_value }));
          } else if (connection.db_type === 'mongodb') {
            return new Response(JSON.stringify({
              success: true,
              schema: { tableName: body.tableName, columns: [], message: 'MongoDB collections have dynamic schemas. Run a query to discover fields.' }
            }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          }

          return new Response(JSON.stringify({
            success: true,
            schema: { tableName: body.tableName, columns }
          }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        } catch (error) {
          return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to get schema' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
      }

      case 'nl-query': {
        if (!body.naturalLanguageQuery) return new Response(JSON.stringify({ error: 'Natural language query required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        const { data: connection } = await supabase.from('database_connections').select('*').eq('id', body.connectionId).eq('user_id', userId).single();
        if (!connection) return new Response(JSON.stringify({ error: 'Connection not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

        const tableContext = body.tableContext || [];
        const { sql, explanation } = await naturalLanguageToSQL(body.naturalLanguageQuery, tableContext, connection.db_type);
        if (!sql) return new Response(JSON.stringify({ error: 'Failed to generate query' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

        if (connection.db_type === 'mongodb') {
          const mongoValidation = validateMongoQuery(sql);
          if (!mongoValidation.valid) return new Response(JSON.stringify({ error: mongoValidation.reason }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          return new Response(JSON.stringify({ success: true, sql, explanation, warning: mongoValidation.reason }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        const validation = validateSqlQuery(sql);
        if (!validation.valid) return new Response(JSON.stringify({ error: validation.reason }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        return new Response(JSON.stringify({ success: true, sql, explanation, warning: validation.reason }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      case 'query': {
        if (!body.sql || !body.connectionId) return new Response(JSON.stringify({ error: 'SQL query and connection ID required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        const { data: connection, error: connError } = await supabase.from('database_connections').select('*').eq('id', body.connectionId).eq('user_id', userId).single();
        if (connError || !connection) return new Response(JSON.stringify({ error: 'Connection not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

        let queryStr = body.sql;

        // Use appropriate validation based on db type
        if (connection.db_type === 'mongodb') {
          const mongoValidation = validateMongoQuery(queryStr);
          if (!mongoValidation.valid) return new Response(JSON.stringify({ error: mongoValidation.reason }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        } else {
          const validation = validateSqlQuery(queryStr);
          if (!validation.valid) return new Response(JSON.stringify({ error: validation.reason }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          // Auto-add LIMIT for SQL queries
          if (!queryStr.toUpperCase().includes('LIMIT') && queryStr.trim().toUpperCase().startsWith('SELECT')) {
            queryStr = queryStr.replace(/;?\s*$/, ' LIMIT 1000;');
          }
        }

        try {
          const result = await executeQuery(connection as DatabaseConnection, queryStr, encryptionKey);
          await supabase.from('database_connections').update({ last_connected_at: new Date().toISOString() }).eq('id', body.connectionId);
          return new Response(JSON.stringify({ success: true, sql: body.sql, results: result.results, rowCount: result.rowCount, columns: result.results.length > 0 ? Object.keys(result.results[0]) : [] }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        } catch (error) {
          return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Query execution failed', sql: body.sql }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
      }

      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
  } catch (error) {
    console.error('[DB-Connect] Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
