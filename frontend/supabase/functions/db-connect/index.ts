import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Client as PostgresClient } from "https://deno.land/x/postgres@v0.17.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ConnectionRequest {
  action: 'test' | 'save' | 'list-tables' | 'get-schema' | 'query' | 'nl-query' | 'delete';
  connectionId?: string;
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

// Simple encryption using base64 + XOR (for demo - in production use proper encryption)
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

// Validate SQL query for safety (read-only operations)
function validateSqlQuery(sql: string): { valid: boolean; reason?: string } {
  const normalizedSql = sql.trim().toUpperCase();
  
  // Only allow SELECT statements
  if (!normalizedSql.startsWith('SELECT')) {
    return { valid: false, reason: 'Only SELECT queries are allowed for security reasons' };
  }
  
  // Disallow dangerous keywords
  const dangerousKeywords = [
    'DROP', 'DELETE', 'TRUNCATE', 'UPDATE', 'INSERT', 'ALTER', 'CREATE',
    'GRANT', 'REVOKE', 'EXEC', 'EXECUTE', 'INTO OUTFILE', 'LOAD_FILE'
  ];
  
  for (const keyword of dangerousKeywords) {
    if (normalizedSql.includes(keyword)) {
      return { valid: false, reason: `Dangerous keyword detected: ${keyword}` };
    }
  }
  
  // Limit result size
  if (!normalizedSql.includes('LIMIT')) {
    return { valid: true, reason: 'Query will be limited to 1000 rows' };
  }
  
  return { valid: true };
}

// Execute PostgreSQL query
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
    
    return {
      results: result.rows,
      rowCount: result.rowCount || 0
    };
  } finally {
    await client.end();
  }
}

// Execute query based on database type
async function executeQuery(
  connection: DatabaseConnection,
  sql: string,
  encryptionKey: string
): Promise<{ results: Record<string, unknown>[]; rowCount: number }> {
  switch (connection.db_type) {
    case 'postgresql':
      return await executePostgresQuery(connection, sql, encryptionKey);
    case 'mysql':
      // MySQL support would require npm:mysql2/promise which has compatibility issues in Deno
      // Return demo data with clear messaging
      console.log('[DB-Connect] MySQL query execution - returning demo data');
      return {
        results: [
          { info: 'MySQL real query execution requires additional driver setup' },
          { suggestion: 'Use PostgreSQL for full query support' }
        ],
        rowCount: 2
      };
    default:
      throw new Error(`Query execution not supported for ${connection.db_type}`);
  }
}

// Generate SQL from natural language using AI
async function naturalLanguageToSQL(
  query: string,
  tableContext: string[],
  dbType: string
): Promise<{ sql: string; explanation: string }> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) {
    throw new Error('AI service not configured');
  }

  const systemPrompt = `You are a SQL expert. Convert natural language queries to safe, read-only SQL.

RULES:
1. ONLY generate SELECT statements
2. Never use DELETE, UPDATE, INSERT, DROP, or any modifying statements
3. Always include LIMIT clause (max 1000 rows)
4. Use proper escaping and parameterization hints
5. Target ${dbType} dialect specifically

Available tables: ${tableContext.join(', ')}

Respond ONLY with valid JSON:
{
  "sql": "SELECT ... FROM ... LIMIT 100",
  "explanation": "Brief explanation of what this query does"
}`;

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

  if (!response.ok) {
    throw new Error('Failed to generate SQL');
  }

  const result = await response.json();
  const content = result.choices?.[0]?.message?.content || '';
  
  // Parse JSON response
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch {
    // Fallback
  }
  
  return { sql: '', explanation: 'Failed to generate SQL' };
}

// Test database connection with actual connection attempt
async function testConnection(connection: ConnectionRequest['connection']): Promise<{ success: boolean; message: string; tables?: string[] }> {
  if (!connection) {
    return { success: false, message: 'Connection details required' };
  }
  
  const { host, port, database_name, username, password, db_type, ssl_enabled } = connection;
  
  // Validate required fields
  if (!host || !port || !database_name || !username) {
    return { success: false, message: 'Missing required connection parameters' };
  }
  
  // Validate port range
  if (port < 1 || port > 65535) {
    return { success: false, message: 'Invalid port number' };
  }
  
  // Validate host format (basic check)
  if (host.includes(' ') || host.length > 255) {
    return { success: false, message: 'Invalid host format' };
  }
  
  // For PostgreSQL, attempt real connection
  if (db_type === 'postgresql') {
    const client = new PostgresClient({
      hostname: host,
      port: port,
      database: database_name,
      user: username,
      password: password,
      tls: ssl_enabled ? { enabled: true, enforce: false } : { enabled: false },
    });
    
    try {
      await client.connect();
      
      // Get list of tables
      const result = await client.queryObject<{ table_name: string }>(
        `SELECT table_name FROM information_schema.tables 
         WHERE table_schema = 'public' 
         ORDER BY table_name`
      );
      
      await client.end();
      
      const tables = result.rows.map(r => r.table_name);
      
      return { 
        success: true, 
        message: `Connected to PostgreSQL. Found ${tables.length} tables.`,
        tables
      };
    } catch (error) {
      console.error('[DB-Connect] PostgreSQL connection error:', error);
      return { 
        success: false, 
        message: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
  
  // For other databases, validate parameters only
  const supportedTypes = ['postgresql', 'mysql', 'sqlite', 'mongodb'];
  if (!supportedTypes.includes(db_type)) {
    return { success: false, message: `Unsupported database type: ${db_type}` };
  }
  
  return { 
    success: true, 
    message: `Connection parameters validated for ${db_type}. Ready to save.`,
    tables: []
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify user
    const token = authHeader.replace('Bearer ', '');
    const { data: claims, error: authError } = await supabase.auth.getUser(token);
    if (authError || !claims.user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const userId = claims.user.id;
    const body: ConnectionRequest = await req.json();
    const { action } = body;

    console.log(`[DB-Connect] Action: ${action} by user: ${userId}`);

    // Encryption key (in production, use a proper secret management system)
    const encryptionKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.substring(0, 32) || 'default-key-32-chars-long!!!!!';

    switch (action) {
      case 'test': {
        const result = await testConnection(body.connection);
        return new Response(
          JSON.stringify(result),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'save': {
        if (!body.connection) {
          return new Response(
            JSON.stringify({ error: 'Connection details required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { name, db_type, host, port, database_name, username, password, ssl_enabled } = body.connection;
        
        // Encrypt password
        const encrypted_password = encryptPassword(password, encryptionKey);

        const { data, error } = await supabase
          .from('database_connections')
          .insert({
            user_id: userId,
            name,
            db_type,
            host,
            port,
            database_name,
            username,
            encrypted_password,
            ssl_enabled: ssl_enabled ?? true,
            connection_status: 'active'
          })
          .select()
          .single();

        if (error) {
          console.error('[DB-Connect] Save error:', error);
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, connection: { ...data, encrypted_password: undefined } }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'delete': {
        if (!body.connectionId) {
          return new Response(
            JSON.stringify({ error: 'Connection ID required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { error } = await supabase
          .from('database_connections')
          .delete()
          .eq('id', body.connectionId)
          .eq('user_id', userId);

        if (error) {
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'list-tables': {
        if (!body.connectionId) {
          return new Response(
            JSON.stringify({ error: 'Connection ID required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get connection details
        const { data: connection, error: connError } = await supabase
          .from('database_connections')
          .select('*')
          .eq('id', body.connectionId)
          .eq('user_id', userId)
          .single();

        if (connError || !connection) {
          return new Response(
            JSON.stringify({ error: 'Connection not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Execute table listing query for PostgreSQL
        if (connection.db_type === 'postgresql') {
          try {
            const sql = `SELECT table_name FROM information_schema.tables 
                         WHERE table_schema = 'public' ORDER BY table_name`;
            const result = await executePostgresQuery(connection as DatabaseConnection, sql, encryptionKey);
            const tables = result.results.map(row => row.table_name as string);
            
            return new Response(
              JSON.stringify({ success: true, tables }),
              { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          } catch (error) {
            console.error('[DB-Connect] List tables error:', error);
            return new Response(
              JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to list tables' }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }

        // Fallback for other database types
        return new Response(
          JSON.stringify({ 
            success: true, 
            tables: ['customers', 'orders', 'products', 'categories'],
            message: 'Demo tables (real table listing requires PostgreSQL)'
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get-schema': {
        if (!body.tableName || !body.connectionId) {
          return new Response(
            JSON.stringify({ error: 'Table name and connection ID required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get connection details
        const { data: connection, error: connError } = await supabase
          .from('database_connections')
          .select('*')
          .eq('id', body.connectionId)
          .eq('user_id', userId)
          .single();

        if (connError || !connection) {
          return new Response(
            JSON.stringify({ error: 'Connection not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Execute schema query for PostgreSQL
        if (connection.db_type === 'postgresql') {
          try {
            // Sanitize table name to prevent SQL injection
            const safeTableName = body.tableName.replace(/[^a-zA-Z0-9_]/g, '');
            
            const sql = `SELECT column_name, data_type, is_nullable, column_default
                         FROM information_schema.columns 
                         WHERE table_name = '${safeTableName}' 
                         AND table_schema = 'public'
                         ORDER BY ordinal_position`;
            
            const result = await executePostgresQuery(connection as DatabaseConnection, sql, encryptionKey);
            
            return new Response(
              JSON.stringify({ 
                success: true,
                schema: {
                  tableName: body.tableName,
                  columns: result.results.map(col => ({
                    name: col.column_name,
                    type: col.data_type,
                    nullable: col.is_nullable === 'YES',
                    default: col.column_default
                  }))
                }
              }),
              { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          } catch (error) {
            console.error('[DB-Connect] Get schema error:', error);
            return new Response(
              JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to get schema' }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }

        // Mock schema response for other databases
        return new Response(
          JSON.stringify({ 
            success: true,
            schema: {
              tableName: body.tableName,
              columns: [
                { name: 'id', type: 'integer', nullable: false, primaryKey: true },
                { name: 'name', type: 'varchar(255)', nullable: false },
                { name: 'created_at', type: 'timestamp', nullable: false }
              ]
            }
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'nl-query': {
        if (!body.naturalLanguageQuery) {
          return new Response(
            JSON.stringify({ error: 'Natural language query required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get connection details
        const { data: connection } = await supabase
          .from('database_connections')
          .select('*')
          .eq('id', body.connectionId)
          .eq('user_id', userId)
          .single();

        if (!connection) {
          return new Response(
            JSON.stringify({ error: 'Connection not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Generate SQL from natural language
        const tableContext = body.tableContext || ['customers', 'orders', 'products'];
        const { sql, explanation } = await naturalLanguageToSQL(
          body.naturalLanguageQuery,
          tableContext,
          connection.db_type
        );

        if (!sql) {
          return new Response(
            JSON.stringify({ error: 'Failed to generate SQL' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Validate generated SQL
        const validation = validateSqlQuery(sql);
        if (!validation.valid) {
          return new Response(
            JSON.stringify({ error: validation.reason }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ 
            success: true,
            sql,
            explanation,
            warning: validation.reason
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'query': {
        if (!body.sql || !body.connectionId) {
          return new Response(
            JSON.stringify({ error: 'SQL query and connection ID required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Validate SQL
        const validation = validateSqlQuery(body.sql);
        if (!validation.valid) {
          return new Response(
            JSON.stringify({ error: validation.reason }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get connection details
        const { data: connection, error: connError } = await supabase
          .from('database_connections')
          .select('*')
          .eq('id', body.connectionId)
          .eq('user_id', userId)
          .single();

        if (connError || !connection) {
          return new Response(
            JSON.stringify({ error: 'Connection not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Add LIMIT if not present
        let sql = body.sql;
        if (!sql.toUpperCase().includes('LIMIT')) {
          sql = sql.replace(/;?\s*$/, ' LIMIT 1000;');
        }

        try {
          // Execute query
          const result = await executeQuery(connection as DatabaseConnection, sql, encryptionKey);

          // Update last_connected_at
          await supabase
            .from('database_connections')
            .update({ last_connected_at: new Date().toISOString() })
            .eq('id', body.connectionId);

          return new Response(
            JSON.stringify({ 
              success: true,
              sql: body.sql,
              results: result.results,
              rowCount: result.rowCount,
              columns: result.results.length > 0 ? Object.keys(result.results[0]) : []
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } catch (error) {
          console.error('[DB-Connect] Query error:', error);
          return new Response(
            JSON.stringify({ 
              error: error instanceof Error ? error.message : 'Query execution failed',
              sql: body.sql
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

  } catch (error) {
    console.error('[DB-Connect] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
