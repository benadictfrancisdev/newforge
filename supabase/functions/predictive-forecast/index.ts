import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

const CREDIT_COST = 4; // Medium complexity (Pro-based)

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // --- Auth ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    // --- Parse body ---
    const body = await req.json();
    const { data, columns, datasetName, targetColumn, horizon, method } = body;

    // Validate inputs
    if (!Array.isArray(data) || data.length === 0) {
      return new Response(JSON.stringify({
        error: "Dataset is empty. Please upload data with at least 1 row.",
        confidence_score: 0,
      }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!columns || columns.length < 2) {
      return new Response(JSON.stringify({
        error: "Dataset must have at least 2 columns (a time/index column and a numeric target).",
        confidence_score: 0,
      }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // --- Credit check ---
    const { data: creditRow } = await supabase
      .from("user_credits")
      .select("balance")
      .eq("user_id", userId)
      .maybeSingle();

    const currentBalance = creditRow?.balance ?? 0;
    if (currentBalance < CREDIT_COST) {
      return new Response(JSON.stringify({
        error: `Insufficient credits. This feature requires ${CREDIT_COST} credits. Your balance: ${currentBalance}.`,
        confidence_score: 0,
        credits_required: CREDIT_COST,
        credits_available: currentBalance,
      }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // --- Build Gemini prompt ---
    const sampleData = data.slice(0, 150);
    const numericCols = columns.filter((col: string) => {
      const vals = sampleData.map((r: Record<string, unknown>) => Number(r[col])).filter((v: number) => !isNaN(v));
      return vals.length > sampleData.length * 0.5;
    });

    const target = targetColumn || numericCols[0] || columns[0];

    const systemPrompt = `You are an expert time-series forecasting engine integrated into SpaceForge.
You perform statistical decomposition, trend analysis, seasonality detection, and predictive modeling.

CRITICAL RULES:
- All monetary values must be in INR (Indian Rupees, symbol: ₹)
- Every insight MUST include a confidence_score (0-100)
- Do NOT use markdown formatting — no asterisks, headers, backticks, or LaTeX
- Return ONLY valid JSON, no text before or after

Think step-by-step:
1. Identify the data domain (sales, finance, operations, etc.)
2. Detect time-series structure (date columns, sequential patterns)
3. Calculate trend direction and magnitude
4. Check for seasonality (daily, weekly, monthly, quarterly)
5. Identify anomalies that could skew forecasts
6. Generate predicted values with confidence intervals
7. Provide actionable recommendations

You MUST respond with this exact JSON structure:
{
  "confidence_score": <0-100>,
  "summary": "<one paragraph plain-text executive summary of the forecast>",
  "trend": {
    "direction": "up" | "down" | "stable",
    "magnitude_percent": <number>,
    "description": "<plain-text explanation>"
  },
  "seasonality": {
    "detected": true | false,
    "period": "<e.g., weekly, monthly, quarterly>",
    "description": "<plain-text explanation>"
  },
  "forecasts": [
    {
      "period": "<label, e.g., 'Next Month', 'Q2 2026'>",
      "predicted_value": <number>,
      "lower_bound": <number>,
      "upper_bound": <number>,
      "confidence_score": <0-100>
    }
  ],
  "anomalies": [
    {
      "description": "<plain-text>",
      "severity": "high" | "medium" | "low",
      "affected_rows": "<description>",
      "confidence_score": <0-100>
    }
  ],
  "patterns": [
    {
      "type": "trend" | "seasonality" | "correlation" | "cycle",
      "title": "<plain-text>",
      "description": "<plain-text>",
      "affected_columns": ["col1"],
      "confidence_score": <0-100>
    }
  ],
  "decomposition": {
    "trend_component": "<description>",
    "seasonal_component": "<description>",
    "residual_component": "<description>"
  },
  "recommendations": [
    {
      "action": "<what to do>",
      "rationale": "<why>",
      "expected_impact": "<in INR or percentage>",
      "priority": "high" | "medium" | "low",
      "confidence_score": <0-100>
    }
  ],
  "narrative": "<2-3 paragraph plain-text explanation suitable for an executive briefing>"
}`;

    const userPrompt = `Analyze and forecast the following dataset:

Dataset: "${datasetName}"
Target column for forecasting: "${target}"
Forecast horizon: ${horizon || "next 3 periods"}
Method preference: ${method || "auto-detect best approach"}
Total rows: ${data.length}
Columns: ${columns.join(", ")}
Numeric columns: ${numericCols.join(", ")}

Sample data (first ${sampleData.length} rows):
${JSON.stringify(sampleData, null, 2)}

Generate a comprehensive forecast with trend analysis, seasonality detection, anomaly flagging, decomposition, and actionable recommendations. Be specific with numbers and INR values where applicable.`;

    // --- Call Gemini ---
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const models = ["google/gemini-2.5-pro", "google/gemini-2.5-flash", "google/gemini-2.5-flash-lite"];
    let aiResponse: Response | null = null;
    let lastStatus = 0;
    let tokensUsed = 0;

    for (const model of models) {
      for (let attempt = 0; attempt < 3; attempt++) {
        aiResponse = await fetch(AI_GATEWAY, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
          }),
        });

        lastStatus = aiResponse.status;

        if (aiResponse.ok) break;

        if (lastStatus === 429) {
          const delay = Math.pow(2, attempt + 1) * 1000;
          await aiResponse.text();
          await new Promise(r => setTimeout(r, delay));
          continue;
        }

        if (lastStatus === 500 || lastStatus === 503) {
          await aiResponse.text();
          break; // try next model
        }

        break;
      }
      if (aiResponse?.ok) break;
    }

    if (!aiResponse || !aiResponse.ok) {
      if (lastStatus === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please wait and try again.", confidence_score: 0 }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (lastStatus === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits.", confidence_score: 0 }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "Forecast generation failed. Please try again.", confidence_score: 0 }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "";
    tokensUsed = aiData.usage?.total_tokens || 0;

    // Parse JSON from AI response
    let parsed: Record<string, unknown>;
    try {
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonStr = jsonMatch ? jsonMatch[1].trim() : content.trim();
      parsed = JSON.parse(jsonStr);
    } catch {
      parsed = { raw_response: content, confidence_score: 50 };
    }

    // Ensure confidence_score exists
    if (!parsed.confidence_score) parsed.confidence_score = 60;

    // --- Deduct credits ---
    const newBalance = currentBalance - CREDIT_COST;
    await supabase.from("user_credits").update({ balance: newBalance }).eq("user_id", userId);
    await supabase.from("credit_transactions").insert({
      user_id: userId,
      amount: -CREDIT_COST,
      action: "deduct",
      feature: "predictive_forecast",
    });

    // --- Save forecast to DB ---
    const costInr = (tokensUsed / 1000) * 0.15; // approximate cost
    try {
      await supabase.from("forecasts").insert({
        user_id: userId,
        dataset_name: datasetName,
        target_column: target,
        forecast_horizon: horizon || "next_3_periods",
        method: method || "auto",
        current_value: sampleData[sampleData.length - 1]?.[target] ?? null,
        predicted_values: (parsed as any).forecasts || [],
        confidence_intervals: ((parsed as any).forecasts || []).map((f: any) => ({ lower: f.lower_bound, upper: f.upper_bound })),
        confidence_score: parsed.confidence_score as number,
        trend: (parsed as any).trend?.direction || "stable",
        change_percent: (parsed as any).trend?.magnitude_percent || 0,
        ai_narrative: (parsed as any).narrative || (parsed as any).summary || "",
        ai_recommendations: (parsed as any).recommendations || [],
        decomposition: (parsed as any).decomposition || {},
        anomalies_detected: (parsed as any).anomalies || [],
        patterns: (parsed as any).patterns || [],
        tokens_used: tokensUsed,
        cost_inr: costInr,
      });
    } catch (dbErr) {
      console.error("Failed to save forecast:", dbErr);
      // Non-critical — continue returning result
    }

    // --- Return result ---
    return new Response(JSON.stringify({
      success: true,
      ...parsed,
      credits_used: CREDIT_COST,
      credits_remaining: newBalance,
      tokens_used: tokensUsed,
      cost_inr: costInr,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("predictive-forecast error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error", confidence_score: 0 }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
