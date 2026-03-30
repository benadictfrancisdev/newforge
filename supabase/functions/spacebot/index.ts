import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODELS = ["google/gemini-2.5-flash", "google/gemini-2.5-flash-8b"];

const ok  = (body: unknown) => new Response(JSON.stringify(body), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
const err = (msg: string, status = 200) => new Response(JSON.stringify({ error: msg }), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const SYSTEM_PROMPT = `You are SpaceBot, the AI assistant for SpaceForge — an autonomous data analytics platform.

Your capabilities:
- Answer data analysis questions in plain language
- Provide insights, trends, anomalies, and recommendations
- Suggest SQL queries, chart types, and dashboard layouts
- Help users understand their datasets and KPIs
- Recommend automated workflows and alert configurations
- Explain statistical concepts simply
- Generate action plans based on data insights

Behavior rules:
- Be concise and direct. Lead with the answer, then explain.
- When referencing data, use specific numbers, column names, and percentages.
- If the user shares dataset context, reference it in your answers.
- Suggest follow-up questions the user should ask.
- When you identify an issue, also propose a solution or automated action.
- Format responses with clear structure: use line breaks, numbered lists, and bullet points.
- Do NOT use markdown bold (**), headers (#), or code backticks in your responses. Use plain text only.
- If you don't have enough context, ask clarifying questions.
- Always end complex answers with 1-2 suggested follow-up questions.

You have personality: helpful, sharp, slightly enthusiastic about data. You're like a senior data analyst who loves their job.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();

    // Health check
    if (body.message === "__health__") return ok({ status: "ok" });

    const { messages, dataContext } = body;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return err("AI service not configured", 200);

    let systemContent = SYSTEM_PROMPT;
    if (dataContext) {
      systemContent += `\n\nCurrent Dataset:\n- Name: ${dataContext.datasetName ?? "Unknown"}\n- Columns: ${(dataContext.columns ?? []).slice(0, 30).join(", ")}\n- Rows: ${dataContext.rowCount ?? "?"}\n- Sample: ${JSON.stringify(dataContext.sampleRow ?? {})}`;
    }

    const allMessages = [
      { role: "system", content: systemContent },
      ...(messages ?? []).slice(-20),
    ];

    // Try each model with retry on 429
    for (const model of MODELS) {
      for (let attempt = 0; attempt < 2; attempt++) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 50000);

        let response: Response;
        try {
          response = await fetch(AI_GATEWAY, {
            method: "POST",
            headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({ model, max_tokens: 1024, messages: allMessages, stream: true }),
            signal: controller.signal,
          });
        } catch (_e) {
          clearTimeout(timeout);
          console.error(`SpaceBot timeout/abort on ${model} attempt ${attempt}`);
          break; // try next model
        }
        clearTimeout(timeout);

        if (response.ok) {
          console.log(`SpaceBot: ok with ${model}`);
          return new Response(response.body, {
            headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
          });
        }

        const status = response.status;
        const body2 = await response.text().catch(() => "");
        console.error(`SpaceBot: ${model} attempt ${attempt} → ${status}`, body2.slice(0, 200));

        if (status === 402) return err("AI credits exhausted. Please top up in Settings.");
        if (status === 401) return err("AI gateway authentication error. Please contact support.");
        if (status === 429) {
          await new Promise(r => setTimeout(r, (attempt + 1) * 2000));
          continue;
        }
        break; // non-retryable, try next model
      }
    }

    return err("SpaceBot is temporarily unavailable. Please try again in a moment.");
  } catch (e) {
    console.error("spacebot error:", e);
    return err(e instanceof Error ? e.message : "Unexpected error");
  }
});
