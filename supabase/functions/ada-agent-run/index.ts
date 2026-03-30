import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface StepLog {
  job_id: string;
  step: string;
  status: string;
  message?: string;
  duration_ms?: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  async function logStep(log: StepLog) {
    await supabase.from("agent_run_logs").insert(log);
  }

  async function failJob(jobId: string, error: string, step: string) {
    await logStep({ job_id: jobId, step, status: "failed", message: error });
    await supabase.from("agent_jobs").update({
      last_status: "failed",
      last_error: error,
      retry_count: 1, // prevent auto-retry
    }).eq("id", jobId);
  }

  try {
    const body = await req.json();
    const action = body.action || "run_due";
    const singleJobId = body.jobId;

    // Step 2: Fetch due jobs
    let jobs: any[] = [];

    if (action === "run_single" && singleJobId) {
      const { data } = await supabase.from("agent_jobs").select("*").eq("id", singleJobId).single();
      if (data) jobs = [data];
    } else {
      const { data } = await supabase.from("agent_jobs")
        .select("*")
        .eq("is_active", true)
        .lte("next_run_at", new Date().toISOString());
      jobs = data || [];
    }

    if (jobs.length === 0) {
      return new Response(JSON.stringify({ message: "No due jobs", processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: any[] = [];

    for (const job of jobs) {
      const jobStart = Date.now();
      let stepStart: number;

      try {
        // === Step 3: FETCH DATA ===
        stepStart = Date.now();
        await logStep({ job_id: job.id, step: "fetch_data", status: "running" });

        const config = job.dataset_config || {};
        let rawData: Record<string, unknown>[] = [];
        let datasetName = config.dataset_name || "unknown";

        if (job.dataset_source === "storage" && config.dataset_id) {
          const { data: ds } = await supabase.from("datasets")
            .select("raw_data, cleaned_data, name, columns")
            .eq("id", config.dataset_id)
            .single();

          if (!ds || (!ds.raw_data && !ds.cleaned_data)) {
            await failJob(job.id, "Dataset not found or empty", "fetch_data");
            continue;
          }
          rawData = (ds.cleaned_data || ds.raw_data) as Record<string, unknown>[];
          datasetName = ds.name || datasetName;
        } else if (config.dataset_name) {
          // Fetch by name for the user
          const { data: ds } = await supabase.from("datasets")
            .select("raw_data, cleaned_data, name")
            .eq("user_id", job.user_id)
            .eq("name", config.dataset_name)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

          if (!ds) {
            await failJob(job.id, "Dataset not found by name", "fetch_data");
            continue;
          }
          rawData = (ds.cleaned_data || ds.raw_data) as Record<string, unknown>[];
          datasetName = ds.name;
        } else {
          await failJob(job.id, "No dataset configured", "fetch_data");
          continue;
        }

        if (!rawData || rawData.length === 0) {
          await failJob(job.id, "Dataset has 0 rows", "fetch_data");
          continue;
        }

        await logStep({ job_id: job.id, step: "fetch_data", status: "success", duration_ms: Date.now() - stepStart, message: `Loaded ${rawData.length} rows` });

        // === Step 4: PREPROCESS ===
        stepStart = Date.now();
        await logStep({ job_id: job.id, step: "preprocess", status: "running" });

        const sampled = rawData.length > 500 ? rawData.slice(0, 500) : rawData;
        const columns = Object.keys(sampled[0] || {});
        const columnTypes: Record<string, string> = {};
        for (const col of columns) {
          const vals = sampled.slice(0, 20).map(r => r[col]);
          const numCount = vals.filter(v => !isNaN(Number(v)) && v !== null && v !== "").length;
          columnTypes[col] = numCount > 14 ? "numeric" : "categorical";
        }

        const dataSizeKB = Math.ceil(JSON.stringify(sampled).length / 1024);
        const tokenBudget = Math.min(dataSizeKB * 100, 30000);

        await logStep({ job_id: job.id, step: "preprocess", status: "success", duration_ms: Date.now() - stepStart, message: `Sampled ${sampled.length} rows, ${columns.length} cols, ~${dataSizeKB}KB` });

        // === Step 5: CHECK CREDITS ===
        const creditCost = Math.max(2, Math.ceil((dataSizeKB / 10) * 5));

        const { data: creditData } = await supabase.from("user_credits")
          .select("balance")
          .eq("user_id", job.user_id)
          .single();

        if (!creditData || creditData.balance < creditCost) {
          await supabase.from("agent_jobs").update({ is_active: false, last_status: "paused", last_error: "Insufficient credits" }).eq("id", job.id);
          await logStep({ job_id: job.id, step: "deduct_credits", status: "failed", message: `Need ${creditCost} credits, have ${creditData?.balance || 0}` });
          continue;
        }

        // === Step 5: ANALYSE with AI ===
        stepStart = Date.now();
        await logStep({ job_id: job.id, step: "analyse", status: "running" });

        if (!lovableApiKey) {
          await failJob(job.id, "LOVABLE_API_KEY not configured", "analyse");
          continue;
        }

        const analysisConfig = job.analysis_config || {};
        const analyseTypes = Object.keys(analysisConfig).filter(k => analysisConfig[k]).join(", ") || "insights, anomalies, forecasts";

        const numericCols = columns.filter(c => columnTypes[c] === "numeric");
        const categoricalCols = columns.filter(c => columnTypes[c] === "categorical");

        const dataPreview = JSON.stringify(sampled.slice(0, 30));

        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${lovableApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-pro",
            messages: [
              {
                role: "system",
                content: `You are SpaceForge ADA — an autonomous data analysis agent. Analyze the provided dataset and return structured insights. The user wants: ${analyseTypes}. Dataset: "${datasetName}", ${sampled.length} rows, ${columns.length} columns. Numeric: [${numericCols.join(",")}]. Categorical: [${categoricalCols.join(",")}]. All monetary values MUST be in INR.`,
              },
              {
                role: "user",
                content: `Analyze this data sample and provide a comprehensive autonomous report:\n\n${dataPreview}`,
              },
            ],
            tools: [
              {
                type: "function",
                function: {
                  name: "generate_agent_report",
                  description: "Generate a structured autonomous agent report with insights, anomalies, forecasts, and recommendations.",
                  parameters: {
                    type: "object",
                    properties: {
                      confidence_score: { type: "integer", description: "Overall confidence 0-100" },
                      key_findings: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            finding: { type: "string" },
                            severity: { type: "string", enum: ["low", "medium", "high", "critical"] },
                            metric: { type: "string" },
                            value: { type: "string" },
                          },
                          required: ["finding", "severity"],
                          additionalProperties: false,
                        },
                      },
                      anomalies_detected: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            column: { type: "string" },
                            description: { type: "string" },
                            severity: { type: "integer" },
                            affected_rows: { type: "integer" },
                          },
                          required: ["column", "description", "severity"],
                          additionalProperties: false,
                        },
                      },
                      forecast_summary: {
                        type: "object",
                        properties: {
                          trend: { type: "string", enum: ["rising", "falling", "stable", "volatile"] },
                          predicted_change_percent: { type: "number" },
                          key_driver: { type: "string" },
                          time_horizon: { type: "string" },
                        },
                        required: ["trend"],
                        additionalProperties: false,
                      },
                      recommendations: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            action: { type: "string" },
                            priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
                            expected_impact: { type: "string" },
                          },
                          required: ["action", "priority"],
                          additionalProperties: false,
                        },
                      },
                      executive_narrative: { type: "string", description: "2-3 paragraph executive summary in plain English" },
                    },
                    required: ["confidence_score", "key_findings", "anomalies_detected", "forecast_summary", "recommendations", "executive_narrative"],
                    additionalProperties: false,
                  },
                },
              },
            ],
            tool_choice: { type: "function", function: { name: "generate_agent_report" } },
          }),
        });

        if (!aiResponse.ok) {
          const errStatus = aiResponse.status;
          const errText = await aiResponse.text();
          const errMsg = errStatus === 429 ? "Rate limited by AI gateway" : errStatus === 402 ? "AI gateway payment required" : `AI error: ${errStatus}`;
          await failJob(job.id, errMsg, "analyse");
          console.error("AI error:", errStatus, errText);
          continue;
        }

        const aiResult = await aiResponse.json();
        let report: any = {};

        const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
        if (toolCall?.function?.arguments) {
          try {
            report = JSON.parse(toolCall.function.arguments);
          } catch {
            report = { confidence_score: 50, key_findings: [], anomalies_detected: [], forecast_summary: { trend: "stable" }, recommendations: [], executive_narrative: "Analysis completed but structured output parsing failed." };
          }
        } else {
          report = { confidence_score: 50, key_findings: [], anomalies_detected: [], forecast_summary: { trend: "stable" }, recommendations: [], executive_narrative: aiResult.choices?.[0]?.message?.content || "Analysis completed." };
        }

        const tokensUsed = aiResult.usage?.total_tokens || 0;
        const costInr = Math.round(tokensUsed * 0.0001 * 100) / 100;

        await logStep({ job_id: job.id, step: "analyse", status: "success", duration_ms: Date.now() - stepStart, message: `Tokens: ${tokensUsed}, Confidence: ${report.confidence_score}%` });

        // === Step 6: GENERATE REPORT ===
        stepStart = Date.now();
        await logStep({ job_id: job.id, step: "generate_report", status: "running" });

        const reportRow = {
          job_id: job.id,
          user_id: job.user_id,
          insights: report.key_findings || [],
          anomalies: report.anomalies_detected || [],
          forecasts: report.forecast_summary ? [report.forecast_summary] : [],
          visualisation_config: {
            suggested_charts: numericCols.slice(0, 3).map((col: string) => ({ type: "line", column: col })),
            kpi_columns: numericCols.slice(0, 4),
          },
          ai_narrative: report.executive_narrative || "",
          confidence_score: report.confidence_score || 0,
          tokens_used: tokensUsed,
          cost_inr: costInr,
        };

        await logStep({ job_id: job.id, step: "generate_report", status: "success", duration_ms: Date.now() - stepStart });

        // === Step 7: STORE ===
        stepStart = Date.now();
        await logStep({ job_id: job.id, step: "store", status: "running" });

        const { error: insertErr } = await supabase.from("agent_reports").insert(reportRow);
        if (insertErr) {
          await failJob(job.id, `Store failed: ${insertErr.message}`, "store");
          continue;
        }

        const nextRun = new Date(Date.now() + job.schedule_interval_hours * 3600000).toISOString();
        await supabase.from("agent_jobs").update({
          last_run_at: new Date().toISOString(),
          next_run_at: nextRun,
          last_status: "success",
          last_error: null,
          retry_count: 0,
        }).eq("id", job.id);

        await logStep({ job_id: job.id, step: "store", status: "success", duration_ms: Date.now() - stepStart });

        // === Step 8: DELIVER (Realtime is auto via table insert) ===
        await logStep({ job_id: job.id, step: "deliver", status: "success", message: "Realtime event emitted via agent_reports insert" });

        // === Step 9: DEDUCT CREDITS ===
        stepStart = Date.now();
        await logStep({ job_id: job.id, step: "deduct_credits", status: "running" });

        const newBalance = (creditData?.balance || 0) - creditCost;
        await supabase.from("user_credits").update({ balance: newBalance }).eq("user_id", job.user_id);
        await supabase.from("credit_transactions").insert({
          user_id: job.user_id,
          amount: -creditCost,
          action: "deduct",
          feature: "ada_agent_run",
        });

        await logStep({ job_id: job.id, step: "deduct_credits", status: "success", duration_ms: Date.now() - stepStart, message: `Deducted ${creditCost} credits` });

        results.push({ jobId: job.id, status: "success", credits: creditCost, tokens: tokensUsed, duration: Date.now() - jobStart });

      } catch (jobErr: any) {
        // === Step 10: ERROR HANDLING ===
        await failJob(job.id, jobErr.message || "Unknown pipeline error", "pipeline");
        results.push({ jobId: job.id, status: "failed", error: jobErr.message });
      }
    }

    return new Response(JSON.stringify({ processed: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("ADA agent run error:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
