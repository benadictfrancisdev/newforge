import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

// ─── Admin Emails — bypass all credit checks ───
const ADMIN_EMAILS = ["benadictfrancis.dev@gmail.com"];
function isAdmin(email?: string | null): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

// ─── 3-Tier Model Selection: Pro → Flash → Flash-Lite ───
// OPTIMIZED: Moved many actions down a tier to reduce cost 60-90%
// Pro  = only the most complex multi-step reasoning (kept minimal)
// Flash = standard analysis, moderate reasoning
// Lite  = everything else (fastest, cheapest — most actions live here now)

function getModel(action: string): string {
  // Tier 1: Pro — ONLY heavy multi-step reasoning that truly needs it
  const proActions = new Set([
    "generate-report", "executive_narrative",
    "scientist_paper", "scientist_experiment",
    "data_scientist_agent", "ceo_mode",
    "automl_forecast",
  ]);

  // Tier 2: Flash — moderate complexity analysis
  const flashActions = new Set([
    "prediction", "hypothesis_testing", "causal_analysis",
    "founder_simulate", "founder_investor",
    "scientist_arena", "decision_intelligence",
    "what_if_simulation", "auto_report_narrative",
    "forge_autopilot", "causal_discovery",
    "hyperparameter_tuning",
    "clustering", "anomaly",
    "forecast", "correlations",
    "stakeholder_report", "ai_dashboard",
    "explainability_audit",
  ]);

  // Tier 3: Flash-Lite — EVERYTHING ELSE (cheapest)
  // insights, query, eda, recommendations, explain, nlp-query, analyze,
  // chat, validate, clean, calendar_table, dashboard_explain, dashboard_score,
  // founder_health, founder_risk, founder_actions,
  // scientist_hypothesis, scientist_features,
  // intent_dashboard, kpi_dependency, time_intelligence,
  // smart_imputation, behavioral_segmentation, kpi_comparison,
  // generate-visualization-report, auto_experiment, proactive_anomaly_watch,
  // auto_profile, trend_intelligence_auto, segment_discovery,
  // root_cause_analysis, kpi_intelligence, nl_to_sql, auto_narrative

  if (proActions.has(action)) return "google/gemini-2.5-pro";
  if (flashActions.has(action)) return "google/gemini-2.5-flash";
  return "google/gemini-2.5-flash-lite";
}

// ─── Smart Data Sampling — send fewer rows for lighter models ───
function getSampleSize(action: string, totalRows: number): number {
  const model = getModel(action);
  if (model === "google/gemini-2.5-flash-lite") return Math.min(totalRows, 5);
  if (model === "google/gemini-2.5-flash") return Math.min(totalRows, 15);
  return Math.min(totalRows, 30); // Pro gets more context but still capped
}

// ─── Max columns to send (truncate wide datasets) ───
function getMaxColumns(action: string): number {
  const model = getModel(action);
  if (model === "google/gemini-2.5-flash-lite") return 15;
  if (model === "google/gemini-2.5-flash") return 30;
  return 50;
}

// ─── Cache key generation ───
async function generateCacheKey(action: string, userId: string, datasetName: string, extraKey: string): Promise<string> {
  const raw = `${userId}:${action}:${datasetName}:${extraKey}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(raw);
  const hash = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hash));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

// Actions that should be cached (deterministic outputs for same input)
const CACHEABLE_ACTIONS = new Set([
  "eda", "correlations", "validate", "clean", "insights",
  "auto_profile", "kpi_intelligence", "smart_imputation",
  "behavioral_segmentation", "time_intelligence",
]);

// Cache TTL by action type (hours)
function getCacheTTL(action: string): number {
  if (["eda", "validate", "clean"].includes(action)) return 48;
  if (["correlations", "auto_profile"].includes(action)) return 24;
  return 12; // default
}

// ─── Max output tokens per tier (cap wasted output) ───
function getMaxTokens(action: string): number {
  const model = getModel(action);
  if (model === "google/gemini-2.5-flash-lite") return 1024;
  if (model === "google/gemini-2.5-flash") return 2048;
  return 4096; // Pro
}

function buildPrompt(action: string, params: Record<string, unknown>): { system: string; user: string } | null {
  const { data, columns, query, datasetName, focusAreas, analysisType, analysisResults, dataContext, businessContext, conversationHistory, targetColumn, featureColumns, algorithm, method, privacyPayload, preComputedStats } = params;

  const privacyProcessed = !!privacyPayload;
  const privacyNote = privacyProcessed
    ? "\n\nIMPORTANT: This data has been pre-processed for privacy. PII columns have been tokenized (e.g., PERSON_1234, EMAIL_5678). Work with the statistical summary and anonymised samples provided. Do NOT attempt to infer or reconstruct original PII values.\n\nStatistical Summary:\n" + JSON.stringify((privacyPayload as Record<string, unknown>)?.dataSummary || {}, null, 2) + "\n"
    : "";

  // ─── Smart sampling: fewer rows/cols for cheaper models ───
  const totalRows = Array.isArray(data) ? data.length : 0;
  const sampleRows = getSampleSize(action, totalRows);
  const maxCols = getMaxColumns(action);
  const allColumns = columns as string[] || Object.keys((Array.isArray(data) ? data[0] : {}) || {});
  const truncatedCols = allColumns.slice(0, maxCols);
  const sampleData = Array.isArray(data) ? data.slice(0, sampleRows).map((row: Record<string, unknown>) => {
    if (truncatedCols.length < allColumns.length) {
      const trimmed: Record<string, unknown> = {};
      for (const c of truncatedCols) trimmed[c] = row[c];
      return trimmed;
    }
    return row;
  }) : [];

  const colNote = truncatedCols.length < allColumns.length
    ? ` (showing ${truncatedCols.length} of ${allColumns.length} columns)`
    : "";
  const dataSummary = sampleData.length > 0
    ? `Dataset "${datasetName || "Dataset"}" with ${totalRows} rows and ${allColumns.length} columns${colNote}: ${truncatedCols.join(", ")}.\n\nSample data (first ${sampleData.length} rows):\n${JSON.stringify(sampleData, null, 2)}${privacyNote}`
    : "No data provided." + privacyNote;

  // ─── Use pre-computed stats when available to reduce tokens ───
  const hasPreComputed = preComputedStats && typeof preComputedStats === "object";
  const preComputedSummary = hasPreComputed
    ? `\n\nPre-computed local statistics (use these instead of recalculating):\n${JSON.stringify(preComputedStats, null, 1)}`
    : "";

  // ─── Compressed chain-of-thought for Lite tier ───
  const promptModel = getModel(action);
  const chainOfThought = promptModel.includes("flash-lite")
    ? `Be concise. Reference column names and values. Respond with valid JSON only.`
    : `Think step-by-step before answering:
1. First, identify the domain of this data (financial, healthcare, sales, HR, IoT, etc.)
2. Consider statistical significance and sample size limitations
3. Reference specific column names, exact values, and row counts
4. Provide confidence levels where applicable
5. Note any caveats or data quality concerns that affect your analysis`;

  switch (action) {
    case "insights":
      return {
        system: `You are an expert data scientist. ${chainOfThought}

Analyze the provided dataset and return actionable insights. No markdown. Plain text only. Respond with JSON:
{
  "key_findings": ["finding1", "finding2", ...],
  "trends": ["trend1", "trend2", ...],
  "anomalies": "description of any anomalies found",
  "recommendations": ["rec1", "rec2", ...],
  "data_quality_issues": ["issue1", "issue2", ...],
  "next_steps": ["step1", "step2", ...]
}
Focus on: ${(focusAreas as string[])?.join(", ") || "general analysis"}. Be specific with numbers and column references.`,
        user: hasPreComputed ? `Dataset "${datasetName || "Dataset"}" with ${totalRows} rows.${preComputedSummary}` : dataSummary
      };

    case "query":
      return {
        system: `You are a data analysis assistant with expertise in statistics and data science. ${chainOfThought}

Answer questions about the provided dataset accurately. Include specific numbers, percentages, and references to columns. When relevant, mention statistical significance. Do NOT use any markdown formatting — no asterisks, no hashtags, no backticks, no LaTeX. Use plain text only. Respond with JSON:
{
  "answer": "your detailed answer with specific data references",
  "suggested_charts": [{"type": "bar|line|pie|scatter|area", "suggested": true}],
  "confidence": 0.0-1.0
}`,
        user: `${dataSummary}\n\n${conversationHistory ? "Conversation history:\n" + (conversationHistory as Array<{role: string; content: string}>).map(m => `${m.role}: ${m.content}`).join("\n") + "\n\n" : ""}User question: ${query}`
      };

    case "explain":
      return {
        system: `You are a data science educator who bridges technical analysis with business understanding. ${chainOfThought}

Explain analysis results clearly. Reference specific metrics, what they mean practically, and their business implications. Respond with JSON:
{
  "explanation": "clear explanation of the analysis results, what they mean in practical terms, and their business implications"
}`,
        user: `Analysis type: ${analysisType}\nResults: ${JSON.stringify(analysisResults)}\nContext: ${dataContext || "General data analysis"}`
      };

    case "recommendations":
      return {
        system: `You are a business strategy consultant with deep data expertise. ${chainOfThought}

Based on the data and analysis results, provide actionable recommendations backed by the data. Respond with JSON:
{
  "immediate_actions": ["action1", "action2", ...],
  "short_term": ["recommendation1", ...],
  "long_term": ["recommendation1", ...],
  "metrics_to_track": ["metric1", "metric2", ...]
}`,
        user: `${dataSummary}\n\nAnalysis results: ${JSON.stringify(analysisResults)}\nBusiness context: ${businessContext || "General business optimization"}`
      };

    case "eda":
      return {
        system: `You are a statistical data analyst. ${chainOfThought}

Respond with JSON:
{"basic_info":{"total_rows":number,"total_columns":number,"columns":["col1"],"duplicate_rows":number},"column_info":[{"name":"col","type":"numeric|categorical|date|text","missing_count":0,"missing_pct":0,"unique_count":0}],"numeric_stats":[{"column":"col","mean":0,"median":0,"std":0,"min":0,"max":0,"q1":0,"q3":0,"skewness":0}],"categorical_stats":[{"column":"col","top_values":[{"value":"x","count":0,"pct":0}]}],"numeric_columns":["col1"],"categorical_columns":["col2"],"data_quality_score":0}
Compute real statistics. Flag skewed distributions and outliers.`,
        user: hasPreComputed ? `Dataset "${datasetName || "Dataset"}" with ${totalRows} rows, ${allColumns.length} columns: ${truncatedCols.join(", ")}.${preComputedSummary}` : dataSummary
      };

    case "correlations":
      return {
        system: `You are a statistical analyst specializing in multivariate analysis. ${chainOfThought}

Analyze correlations between numeric columns. Consider both linear (Pearson) and non-linear relationships. Respond with JSON:
{
  "columns": ["col1", "col2", ...],
  "top_correlations": [{"column1": "a", "column2": "b", "correlation": 0.95, "strength": "strong|moderate|weak", "direction": "positive|negative"}],
  "summary": "brief summary of key correlations with potential causal hypotheses"
}
Compute approximate correlation values from the data. Note any potential confounding variables.`,
        user: dataSummary
      };

    case "forecast":
      return {
        system: `You are a time-series forecasting expert with statistical rigor. ${chainOfThought}

Analyze the data trends and provide forecasts with confidence intervals. Respond with JSON:
{
  "column": "the column analyzed",
  "current_value": number,
  "forecasted_values": [{"period": 1, "value": number, "ci_lower": number, "ci_upper": number}],
  "trend_direction": "increasing|decreasing|stable",
  "seasonality_detected": boolean,
  "summary": "brief forecast summary with methodology and confidence assessment",
  "forecast_change_pct": number
}`,
        user: `${dataSummary}\n\nForecast the column: ${query || (columns as string[])?.[0] || "first numeric column"} for the next 10 periods.`
      };

    case "prediction":
      return {
        system: `You are a senior Machine Learning Engineer with expertise in predictive modeling. ${chainOfThought}

Analyze the dataset and build a predictive model for the specified target column. Simulate rigorous ML training with proper validation. You MUST respond with JSON:
{
  "model_type": "classification" or "regression",
  "algorithm_used": "Random Forest|Gradient Boosting|Logistic Regression|Linear Regression|SVM",
  "algorithm_rationale": "why this algorithm was selected based on data characteristics (cardinality, linearity, sample size)",
  "target_column": "column name",
  "feature_columns": ["col1", "col2", ...],
  "preprocessing": {
    "missing_values_handled": number,
    "features_encoded": ["col1"],
    "features_scaled": ["col2"],
    "transformations_applied": ["description1"]
  },
  "training_config": {
    "train_test_split": "80/20",
    "cross_validation_folds": 5,
    "hyperparameters": {"n_estimators": 100, "max_depth": 10}
  },
  "metrics": {
    "accuracy": 0.0-1.0,
    "precision": 0.0-1.0,
    "recall": 0.0-1.0,
    "f1_score": 0.0-1.0,
    "cv_accuracy": 0.0-1.0,
    "cv_std": 0.0-0.1,
    "r2_score": 0.0-1.0,
    "rmse": number,
    "mae": number,
    "cv_r2": 0.0-1.0
  },
  "confusion_matrix": {
    "labels": ["class1", "class2"],
    "matrix": [[TP, FP], [FN, TN]]
  },
  "feature_importance": [{"feature": "col", "importance": 0.0-1.0, "direction": "positive|negative", "explanation": "why this feature matters for the prediction"}],
  "sample_predictions": [{"actual": value, "predicted": value, "correct": true}],
  "training_samples": number,
  "test_samples": number,
  "model_interpretation": "detailed paragraph explaining what the model learned, which features drive predictions, and business implications. Include confidence assessment.",
  "recommendations": ["actionable recommendation based on model findings"]
}
For classification: fill accuracy/precision/recall/f1/cv_accuracy/cv_std and confusion_matrix. Set r2_score/rmse/mae to null.
For regression: fill r2_score/rmse/mae/cv_r2. Set accuracy/precision/recall/f1 to null.
Be realistic with metrics based on the data complexity and sample size. Provide at least 5 feature importances and 10 sample predictions.`,
        user: `${dataSummary}\n\nTarget column to predict: ${targetColumn}\nFeature columns: ${(featureColumns as string[])?.join(", ") || "all other columns"}\nPreferred algorithm: ${algorithm || "auto-select best"}`
      };

    case "clustering":
      return {
        system: `You are an ML Engineer specializing in unsupervised learning and customer segmentation. ${chainOfThought}

Perform clustering analysis on the dataset. Consider the data distribution and scale when choosing parameters. You MUST respond with JSON:
{
  "n_clusters": number,
  "algorithm_used": "K-Means|DBSCAN|Hierarchical",
  "optimal_k_reasoning": "explanation referencing elbow method / silhouette analysis with specific metric values",
  "elbow_data": [{"k": 2, "inertia": number, "silhouette": number}, ...],
  "metrics": {
    "silhouette_score": 0.0-1.0,
    "calinski_harabasz_score": number,
    "davies_bouldin_score": number
  },
  "cluster_stats": [{"cluster_id": 0, "size": number, "percentage": number, "label": "business-friendly name", "description": "what characterizes this cluster with specific metric ranges", "key_features": {"feature": avg_value}, "profile": {"feature1": 0.0-1.0_normalized}}],
  "feature_columns_used": ["col1", "col2"],
  "scatter_data": [{"x": number, "y": number, "cluster": number}],
  "x_axis": "column_name",
  "y_axis": "column_name",
  "summary": "business-oriented summary of segments found with actionable implications",
  "recommendations": ["actionable recommendation per cluster segment"]
}
Generate realistic scatter_data points (at least 50) that represent the actual data distribution. Provide meaningful, descriptive business labels for each cluster.`,
        user: `${dataSummary}\n\nClustering request: ${query || "Find optimal clusters"}\nFeature columns: ${(featureColumns as string[])?.join(", ") || "all numeric columns"}`
      };

    case "anomaly":
      return {
        system: `You are an ML Engineer specializing in anomaly detection and root cause analysis. ${chainOfThought}

Detect anomalies using statistical and ML methods. Consider the data distribution and identify both point anomalies and contextual anomalies. You MUST respond with JSON:
{
  "method_used": "${method || "Isolation Forest"}",
  "method_rationale": "why this method is appropriate for the data characteristics",
  "total_records": number,
  "anomaly_count": number,
  "anomaly_rate": number,
  "severity_summary": {"critical": 0, "high": 0, "medium": 0, "low": 0},
  "score_distribution": [{"bin": "-1.0 to -0.8", "count": number}, ...],
  "anomalies": [{"index": number, "anomaly_score": 0.0-1.0, "severity": "critical|high|medium|low", "affected_columns": [{"column": "col", "value": number, "z_score": number, "expected_range": "min-max"}], "row_data": {"col": value}, "description": "specific explanation of why this is anomalous", "recommendation": "what to do about this anomaly"}],
  "root_cause_groups": [{"group_name": "descriptive name", "pattern": "what makes these anomalies similar", "count": number, "affected_columns": ["col1"], "business_impact": "potential impact on operations"}],
  "feature_columns_used": ["col1"],
  "summary": "overall analysis with statistical context and business implications",
  "recommendations": ["prioritized actionable steps to address anomalies"]
}
Identify realistic anomalies based on actual data patterns. Group anomalies by root cause. Provide at least 5 detailed anomalies with z-scores.`,
        user: `${dataSummary}\n\nDetection method: ${method || "Isolation Forest"}\nFeature columns: ${(featureColumns as string[])?.join(", ") || "all numeric columns"}`
      };

    case "hyperparameter_tuning": {
      const paramGrid = params.paramGrid as Record<string, string[]>;
      return {
        system: `You are a senior ML Engineer performing hyperparameter tuning via grid search with cross-validation. ${chainOfThought}

Given the dataset and parameter grid, simulate exhaustive grid search. You MUST respond with JSON:
{
  "algorithm": "${algorithm || "Random Forest"}",
  "target_column": "${targetColumn || "target"}",
  "model_type": "classification or regression",
  "best_params": {"param1": "value1", ...},
  "best_score": 0.0-1.0,
  "scoring_metric": "accuracy or r2_score",
  "improvement_over_default": 0.0-10.0,
  "total_combinations": number,
  "grid_results": [
    {"rank": 1, "params": {"param1": "val"}, "metrics": {"score": 0.95}, "training_time_ms": number},
    ... (generate one entry per combination, up to 30 results ranked by score descending)
  ],
  "convergence_analysis": "paragraph analyzing how parameters affect performance, which params matter most, and diminishing returns analysis",
  "recommendations": ["actionable recommendation 1", "recommendation 2", ...]
}
Use the actual data patterns to produce realistic, varied scores. Show clear performance differences between parameter configurations.`,
        user: `${dataSummary}\n\nAlgorithm: ${algorithm || "Random Forest"}\nTarget: ${targetColumn}\nFeatures: ${(featureColumns as string[])?.join(", ") || "all"}\nParameter Grid:\n${JSON.stringify(paramGrid, null, 2)}`
      };
    }

    case "chat":
      return {
        system: `You are a conversational data analyst with expertise in statistics and data science. ${chainOfThought}

Answer questions about the provided dataset in a helpful, concise way. Reference specific values, columns, and row counts. Do NOT use any markdown formatting — no asterisks, no hashtags for headers, no backticks, no LaTeX, no underscores for emphasis. Use plain text only with line breaks for structure. Respond with JSON:
{
  "response": "your detailed answer with specific data references",
  "suggestedVisualization": {"type": "bar|line|pie|scatter|area", "title": "chart title", "columns": ["col1", "col2"]} or null
}`,
        user: `${dataSummary}\n\n${conversationHistory ? "Conversation history:\n" + (conversationHistory as Array<{role: string; content: string}>).map(m => `${m.role}: ${m.content}`).join("\n") + "\n\n" : ""}User question: ${query || (params as Record<string, unknown>).question || ""}`
      };

    case "validate":
      return {
        system: `You are a data quality engineer. ${chainOfThought}

Validate the provided dataset for quality issues. Check for: missing values, type consistency, range violations, format issues, and logical inconsistencies. Respond with JSON:
{
  "isValid": boolean,
  "validationReport": {
    "errors": [{"column": "col", "issue": "description", "affectedRows": number}],
    "warnings": [{"column": "col", "issue": "description", "affectedRows": number}],
    "suggestions": ["suggestion1", "suggestion2"]
  },
  "columnStats": {"columnName": {"nullCount": 0, "uniqueCount": 0, "type": "string|number|date"}}
}`,
        user: dataSummary
      };

    case "clean":
      return {
        system: `You are a data cleaning specialist. ${chainOfThought}

Suggest cleaning operations for the dataset based on detected quality issues. Respond with JSON:
{
  "cleanedData": [],
  "changes": [{"column": "col", "operation": "fill_missing|remove_duplicates|fix_types|trim_whitespace", "description": "what was done", "rowsAffected": number}],
  "summary": "brief summary of all cleaning operations and their impact on data quality"
}
Do NOT return actual cleaned data rows — just return an empty array for cleanedData. Focus on the changes and summary.`,
        user: dataSummary
      };

    case "generate-report": {
      const ar = params.analysisResults as Record<string, unknown> | undefined;
      const analysisContext = ar
        ? `\n\n=== PRE-COMPUTED ANALYSIS RESULTS ===\n\nEDA Results:\n${JSON.stringify(ar?.eda || {}, null, 2)}\n\nInsights Results:\n${JSON.stringify(ar?.insights || {}, null, 2)}\n\nCorrelation Results:\n${JSON.stringify(ar?.correlations || {}, null, 2)}\n\nAnomaly Detection Results:\n${JSON.stringify(ar?.anomaly || {}, null, 2)}\n\nForecast Results:\n${JSON.stringify(ar?.forecast || {}, null, 2)}\n\n=== END ANALYSIS RESULTS ===`
        : "";
      const projectInfo = params.projectDetails ? `\nProject Details: ${params.projectDetails}` : "";
      const goalInfo = params.projectGoals ? `\nProject Goals: ${params.projectGoals}` : "";
      return {
        system: `You are a senior data scientist and data analyst creating a professional analytical report following industry-standard DS/DA report structure. ${chainOfThought}

You have been given pre-computed analysis results including EDA statistics, correlation analysis, AI-generated insights, anomaly detection results, and forecast data. USE THESE EXTENSIVELY to back every claim with specific numbers, column names, correlation coefficients, statistical measures, anomaly scores, and trend forecasts. Do NOT use any markdown formatting in text fields. Use plain text only.

Write detailed, analytically rigorous content targeting 2000-3000 words total. Every section should reference specific numbers from the pre-computed analysis.

Generate a comprehensive data science report. You MUST respond with JSON:
{
  "title": "Report Title",
  "executiveSummary": "3-4 paragraph executive summary with specific metrics, key findings, and strategic implications. Reference exact numbers from the EDA results. Include data quality grade and confidence score.",
  "situationAnalysis": "1-2 paragraph contextual analysis of the current data landscape, referencing data quality score, completeness, and domain-specific context.",
  "introduction": "introduction paragraph explaining the scope and purpose of this analysis",
  "objectives": ["objective1 with measurable target", "objective2", ...],
  "problemStatement": "clear problem statement backed by data patterns observed",
  "methodology": "detailed methodology referencing specific techniques: EDA profiling, Pearson/Spearman correlations, IQR/Z-score outlier detection, Isolation Forest anomaly detection, time-series decomposition, trend forecasting. Mention sample sizes and confidence levels.",
  "toolsAndTechnologies": ["tool1", "tool2", ...],
  "implementationSteps": ["step1", "step2", ...],
  "dataDictionary": [{"column": "column_name", "type": "numeric|categorical|date|text", "description": "what this column represents", "uniqueCount": number, "missingPct": number, "sampleValues": ["val1", "val2", "val3"], "statsSummary": "mean=X, median=Y, std=Z for numeric; top value=X (N%) for categorical"}],
  "descriptiveStatistics": [{"column": "col_name", "mean": number, "median": number, "std": number, "min": number, "max": number, "q1": number, "q3": number, "skewness": number, "kurtosis": number}],
  "dataQualityAssessment": {
    "overallScore": 0-100,
    "completeness": 0-100,
    "consistency": 0-100,
    "accuracy": 0-100,
    "missingValueSummary": [{"column": "col", "missingCount": number, "missingPct": number}],
    "duplicateRows": number,
    "duplicatePct": number,
    "dataTypeIssues": ["issue1", "issue2"],
    "qualityGrade": "A|B|C|D|F",
    "summary": "paragraph summarizing data quality findings"
  },
  "distributionAnalysis": [{"column": "col_name", "skewness": number, "skewnessInterpretation": "right-skewed|left-skewed|approximately normal", "kurtosis": number, "kurtosisInterpretation": "leptokurtic|platykurtic|mesokurtic", "normalityAssessment": "normal|approximately normal|non-normal", "outlierCount": number, "outlierPct": number}],
  "correlationMatrix": {
    "topCorrelations": [{"column1": "col_a", "column2": "col_b", "coefficient": 0.85, "strength": "strong|moderate|weak", "direction": "positive|negative", "interpretation": "what this means practically"}],
    "confoundingNotes": "notes about potential confounding variables or spurious correlations",
    "summary": "paragraph summarizing the correlation landscape"
  },
  "keyFindings": ["finding1 with specific numbers and column references", "finding2", ...],
  "patternAnalysis": {
    "trends": [{"name": "trend name", "description": "specific trend with numbers", "trajectory": "increasing|decreasing|stable", "magnitude": "X% change or specific value"}],
    "correlations": [{"variables": ["col1", "col2"], "strength": 0.85, "interpretation": "what this means practically"}],
    "anomalies": [{"description": "specific anomaly with values", "severity": "critical|high|medium|low"}],
    "segments": [{"name": "segment name", "characteristics": "defining features with numbers", "size": "N records or X%"}]
  },
  "outlierAnalysis": {
    "totalOutliers": number,
    "outlierRate": number,
    "severityBreakdown": {"critical": number, "high": number, "medium": number, "low": number},
    "affectedColumns": ["col1", "col2"],
    "rootCauseGroups": [{"groupName": "descriptive name", "pattern": "what makes these similar", "count": number, "businessImpact": "potential impact"}],
    "summary": "paragraph about outlier findings and their implications"
  },
  "trendAnalysis": {
    "trendDirection": "increasing|decreasing|stable|mixed",
    "trendColumn": "column analyzed",
    "seasonalityDetected": boolean,
    "seasonalityPeriod": "weekly|monthly|quarterly|yearly|none",
    "forecastSummary": "paragraph describing forecast with confidence intervals",
    "forecastedValues": [{"period": "label", "value": number, "ciLower": number, "ciUpper": number}],
    "changeRate": "X% per period"
  },
  "rootCauseAnalysis": [{"finding": "what was found", "causes": ["cause1 backed by correlation data", "cause2"], "contributingFactors": ["factor1"]}],
  "riskAssessment": [{"risk": "specific risk", "probability": "high|medium|low", "impact": "high|medium|low", "mitigation": "concrete mitigation step", "severity": 1-10}],
  "opportunities": [{"opportunity": "specific opportunity", "value": "estimated value or impact", "effort": "low|medium|high", "timeline": "short-term|medium-term|long-term"}],
  "recommendations": ["recommendation1 with expected outcome and timeline", "recommendation2", ...],
  "implementationRoadmap": {
    "phase1": {"name": "Phase 1 name", "actions": ["action1", "action2"], "milestones": ["milestone1"]},
    "phase2": {"name": "Phase 2 name", "actions": ["action1"], "milestones": ["milestone1"]},
    "phase3": {"name": "Phase 3 name", "actions": ["action1"], "milestones": ["milestone1"]}
  },
  "keyMetrics": [{"name": "Metric Name", "value": "specific value", "change": "+X% or -X%", "trend": "up|down|stable", "status": "good|warning|critical"}],
  "limitationsAndAssumptions": {
    "dataLimitations": ["limitation1", "limitation2"],
    "statisticalAssumptions": ["assumption1", "assumption2"],
    "confidenceCaveats": ["caveat1", "caveat2"],
    "sampleSizeNotes": "notes about sample size adequacy"
  },
  "appendix": {
    "rawStatistics": "summary of raw statistical tables",
    "methodologyNotes": "detailed methodology notes",
    "dataSourceNotes": "notes about data provenance and collection"
  },
  "conclusion": "concluding paragraph tying findings to business impact with forward-looking statements",
  "futureScope": ["future direction1", "future direction2", ...],
  "confidence": 0.0-1.0,
  "wordCount": estimated_word_count
}

CRITICAL: Every finding, risk, and recommendation MUST reference specific numbers from the pre-computed analysis. Do not make generic statements. Use anomaly detection results for outlier analysis and forecast results for trend analysis sections.`,
        user: `${dataSummary}${analysisContext}${projectInfo}${goalInfo}\n\nProject Status: ${params.projectStatus || "in-progress"}`
      };
    }

    case "generate-visualization-report":
      return {
        system: `You are a data visualization expert. ${chainOfThought}

Analyze the dataset and provided charts/analysis to generate an insightful visualization report. Respond with JSON:
{
  "summary": "overall summary of visualization insights",
  "insights": [{"title": "Insight Title", "description": "detailed insight from the visualizations", "chartType": "bar|line|pie|scatter", "importance": "high|medium|low"}],
  "recommendations": [{"title": "Rec Title", "description": "recommendation based on visual analysis"}],
  "narrativeSummary": "a narrative paragraph tying all insights together"
}`,
        user: `${dataSummary}\n\nAnalysis results: ${JSON.stringify(analysisResults || {})}\nVisualization context: ${dataContext || "Dashboard visualizations"}`
      };

    case "analyze":
      return {
        system: `You are a senior data analyst who delivers instant, plain-language findings. ${chainOfThought}

Analyze the dataset and return structured insights that can be shown immediately after upload with NO user prompts needed. Focus on the most impactful findings with specific numbers, percentages, and column references. Do NOT use any markdown formatting — no asterisks, no hashtags, no backticks, no LaTeX. Use plain text only. You MUST respond with JSON:
{
  "summary": "one-sentence overview of the dataset and its most important characteristic",
  "insights": [
    {"title": "short title", "description": "plain-text finding referencing specific numbers and columns", "importance": "high|medium|low"}
  ],
  "patterns": [{"name": "pattern name", "description": "plain-text description of the pattern with specifics"}],
  "recommendations": [{"action": "what to do", "reason": "why, backed by data"}]
}
Provide 3-6 insights ranked by importance. Every insight MUST reference at least one specific number or percentage from the data. Be concise and actionable.`,
        user: dataSummary
      };

    case "nlp-query":
      return {
        system: `You are a natural language data query engine with statistical expertise. ${chainOfThought}

Convert the user's natural language question into data analysis and return results with specific numbers. Respond with JSON:
{
  "interpretation": "how you interpreted the query and what analysis you performed",
  "answer": "detailed answer with specific numbers, percentages, and column references",
  "data": [{"label": "category", "value": number}],
  "chartType": "bar|line|pie|table",
  "summary": "one-line summary with the key finding"
}`,
        user: `${dataSummary}\n\nUser query: ${query || ""}`
      };

    case "hypothesis_testing": {
      const testType = params.testType as string;
      const groupColumn = params.groupColumn as string;
      const valueColumn = params.valueColumn as string;
      const hypothesisDescription = params.hypothesisDescription as string;
      return {
        system: `You are a senior statistician and data scientist specializing in hypothesis testing. ${chainOfThought}

You must select the most appropriate statistical test based on the data characteristics, execute it rigorously, and explain results in plain business English. Do NOT use markdown formatting. Use plain text only.

You MUST respond with JSON:
{
  "testSelected": "t-test|paired-t-test|welch-t-test|chi-square|mann-whitney-u|anova|kruskal-wallis|z-test",
  "testSelectionReason": "why this test was chosen based on data characteristics (normality, sample size, variance equality, data type)",
  "hypothesis": {
    "null": "H0 statement in plain English",
    "alternative": "H1 statement in plain English",
    "significance_level": 0.05
  },
  "assumptions": {
    "checked": ["assumption1: met/violated", "assumption2: met/violated"],
    "normality": {"assessment": "normal|approximately normal|non-normal", "method": "Shapiro-Wilk approximation", "details": "specific observation"},
    "equal_variance": {"assessment": "equal|unequal", "method": "Levene's test approximation", "details": "specific observation"},
    "sample_size_adequate": true
  },
  "results": {
    "test_statistic": number,
    "test_statistic_name": "t|chi2|U|F|z",
    "degrees_of_freedom": number,
    "p_value": number,
    "confidence_interval": {"lower": number, "upper": number, "level": 0.95},
    "effect_size": {"value": number, "name": "Cohen's d|Cramer's V|eta-squared|r", "interpretation": "small|medium|large"},
    "power": number
  },
  "groups": [
    {"name": "group label", "n": number, "mean": number, "std": number, "median": number}
  ],
  "decision": "reject|fail to reject",
  "interpretation": "2-3 paragraph plain-English interpretation explaining what this means for the business. Include effect size context, practical significance vs statistical significance, and confidence level. Reference specific numbers.",
  "visualization": {
    "type": "box|bar|histogram",
    "title": "chart title",
    "data": [{"label": "group", "values": [number]}]
  },
  "caveats": ["caveat1", "caveat2"],
  "recommendations": ["what to do based on these results"],
  "followUpTests": ["suggested additional tests to run"]
}
Be rigorous with statistics. Compute realistic test statistics and p-values based on the actual data patterns. Clearly distinguish between statistical significance and practical significance.`,
        user: `${dataSummary}\n\n${hypothesisDescription ? "Hypothesis to test: " + hypothesisDescription + "\n" : ""}${testType ? "Requested test type: " + testType + "\n" : "Auto-select the best test.\n"}${groupColumn ? "Group/category column: " + groupColumn + "\n" : ""}${valueColumn ? "Value/measurement column: " + valueColumn + "\n" : ""}Analyze the data and perform the appropriate hypothesis test.`
      };
    }

    case "stakeholder_report": {
      const ar = params.analysisResults as Record<string, unknown> | undefined;
      const audience = params.audience as string || "executive";
      const focusArea = params.focusArea as string;
      const analysisContext = ar
        ? `\n\n=== PRE-COMPUTED ANALYSIS RESULTS ===\n${JSON.stringify(ar, null, 2)}\n=== END ===`
        : "";
      return {
        system: `You are a senior business intelligence consultant who translates complex data science outputs into clear, compelling stakeholder reports. ${chainOfThought}

Your audience is: ${audience} (adjust language complexity accordingly).
Do NOT use any markdown formatting. Use plain text only.

You MUST respond with JSON:
{
  "reportTitle": "compelling report title",
  "executiveSummary": {
    "headline": "one-line key takeaway",
    "summary": "3-4 sentence executive summary with the most important findings and their business impact. Use specific numbers.",
    "keyMetric": {"name": "most important metric", "value": "specific value", "change": "+X% or -X%", "context": "why this matters"}
  },
  "keyFindings": [
    {
      "finding": "clear finding statement with numbers",
      "impact": "business impact in plain language",
      "confidence": "high|medium|low",
      "icon": "trending-up|trending-down|alert|check|info"
    }
  ],
  "performanceSnapshot": {
    "metrics": [
      {"name": "metric name", "current": "value", "previous": "value", "change": "+X%", "status": "good|warning|critical", "explanation": "one-sentence context"}
    ],
    "overallHealth": "strong|moderate|needs attention",
    "healthExplanation": "why this overall assessment"
  },
  "trendAnalysis": {
    "summary": "paragraph describing key trends in business terms",
    "trends": [
      {"name": "trend name", "direction": "improving|declining|stable", "magnitude": "specific change", "implication": "what this means for the business"}
    ]
  },
  "riskAndOpportunities": {
    "risks": [{"risk": "specific risk", "severity": "high|medium|low", "mitigation": "suggested action"}],
    "opportunities": [{"opportunity": "specific opportunity", "potentialValue": "estimated impact", "effort": "low|medium|high"}]
  },
  "actionItems": [
    {"priority": 1, "action": "specific actionable step", "owner": "suggested team/role", "timeline": "immediate|this week|this month|this quarter", "expectedOutcome": "what success looks like"}
  ],
  "appendixNotes": "brief technical notes for analysts who want to dig deeper",
  "generatedAt": "timestamp",
  "confidenceScore": 0.0-1.0,
  "dataQualityNote": "brief note on data quality and any limitations affecting conclusions"
}

CRITICAL: Every finding must reference specific numbers. Use plain business language - no jargon. Prioritize findings by business impact. Make action items specific and assignable.`,
        user: `${dataSummary}${analysisContext}\n\n${focusArea ? "Focus area: " + focusArea + "\n" : ""}Generate a stakeholder-ready report for ${audience} audience.`
      };
    }

    case "dashboard_explain": {
      const tileTitle = params.tileTitle as string || "Chart";
      const tileType = params.tileType as string || "chart";
      const tileData = params.tileData as any[] || [];
      const tileColumn = params.tileColumn as string || "";
      return {
        system: `You are a business analytics expert explaining dashboard visualizations to stakeholders. Provide structured insight. No markdown formatting. Use plain text only.

Respond with JSON:
{
  "insight": "2-3 sentence plain-English explanation",
  "trend": "What trend does this data show?",
  "drivers": "What are the key drivers behind this metric?",
  "confidence": "How statistically confident are we? (high/medium/low with reasoning)",
  "risk": "What risks or concerns does this metric surface?"
}`,
        user: `Chart title: "${tileTitle}"\nChart type: ${tileType}\nColumn: ${tileColumn}\nData points: ${JSON.stringify(tileData?.slice(0, 15))}\n\nExplain what this visualization reveals about the data.`
      };
    }

    case "ai_dashboard": {
      return {
        system: `You are an expert data visualization architect who creates professional, publication-quality dashboards. ${chainOfThought}

Analyze the dataset and generate a comprehensive dashboard with rich, professional chart specifications. Think like a Power BI / Tableau expert creating charts for stakeholders.

For each chart, decide the BEST visualization type and compute the data points. You MUST respond with JSON:
{
  "tiles": [
    {
      "type": "kpi|bar|line|area|pie|scatter|combo|heatmap|conditional_bar|multi_line|annotated_area|stock_chart",
      "title": "descriptive chart title",
      "size": "small|medium|large",
      "insight": "1-2 sentence AI insight about what this chart reveals",
      "config": { ... type-specific config },
      "data": [ ... chart data points ]
    }
  ],
  "dashboardTitle": "overall dashboard title",
  "dashboardInsight": "2-3 sentence summary of key findings across all charts"
}

TYPE-SPECIFIC CONFIGS:
For "kpi": { "value": number, "change": number (percent), "unit": "$|%|count|etc", "subtitle": "context" }
For "bar": data: [{"name": "label", "value": number}]
For "conditional_bar": config: { "positiveColor": "#22c55e", "negativeColor": "#ef4444" }, data: [{"name": "label", "value": number}]
For "line": data: [{"name": "x-label", "value": number}]
For "multi_line": config: { "series": [{"key": "close", "name": "Close Price", "color": "#3b82f6", "strokeWidth": 2}, {"key": "ma50", "name": "50-Day MA", "color": "#94a3b8", "strokeWidth": 1, "strokeDasharray": "5 5"}] }, data: [{"name": "x-label", "close": number, "ma50": number}]
For "annotated_area": config: { "fillColor": "#3b82f6", "annotations": [{"x": "x-label", "label": "IPO $38", "y": 38}] }, data: [{"name": "x-label", "value": number}]
For "heatmap": config: { "xLabels": ["Jan","Feb",...], "yLabels": ["2020","2021",...], "minColor": "#dc2626", "maxColor": "#22c55e", "midColor": "#fef08a" }, data: [{"x": "Jan", "y": "2020", "value": 0.5}]
For "stock_chart": data: [{"name": "label", "value": number, "ma50": number, "ma200": number, "volume": number}]
For "pie": data: [{"name": "label", "value": number}]
For "area": data: [{"name": "x-label", "value": number}]
For "scatter": data: [{"x": number, "y": number, "name": "label"}]
For "combo": config: { "barKey": "keyname", "lineKey": "keyname" }, data: [{"name": "label", "barKey": number, "lineKey": number}]

GUIDELINES:
- Generate 6-12 tiles depending on data complexity
- Start with 3-4 KPI tiles summarizing key metrics
- Use stock_chart when time-series data with enough points is detected
- ALL data must be computed from the provided dataset
- Each tile must have an AI insight`,
        user: dataSummary
      };
    }

    case "ai_edit_dashboard": {
      const instruction = params.instruction as string;
      const tilesConfig = params.tilesConfig as any[];
      return {
        system: `You are a dashboard editor AI. You receive the current dashboard tiles configuration and a user instruction describing changes. Apply the changes and return the modified tiles array.

Current tiles config:
${JSON.stringify(tilesConfig, null, 2)}

Rules:
- Preserve tile IDs when modifying existing tiles
- You can change type, title, size, color of existing tiles
- You can add new tiles (use id format "ai-edit-TYPE-TIMESTAMP")
- You can remove tiles by not including them
- For new tiles, compute data from the provided dataset
- Return ONLY the tiles array as JSON: { "tiles": [...] }
- Each tile needs: id, type, title, size, and optionally color, value, change, data, column, xAxis, yAxis`,
        user: `Dataset summary: ${dataSummary}\n\nUser instruction: "${instruction}"\n\nApply changes and return modified tiles.`
      };
    }

    case "realtime_insights": {
      const tileSummary = params.tiles as any[];
      return {
        system: `You are a real-time data scientist providing instant analytical insights about a dashboard. Analyze the dashboard tiles and underlying data to generate actionable insights.

You MUST respond with JSON:
{
  "insights": [
    {
      "type": "trend|anomaly|correlation|summary",
      "title": "short title",
      "description": "1-2 sentence insight with specific numbers",
      "severity": "high|medium|low"
    }
  ]
}

Generate 4-8 insights covering:
- Key trends visible in the data
- Anomalies or outliers worth investigating
- Correlations between metrics
- Summary observations a data scientist would highlight
Be specific with numbers. No markdown formatting.`,
        user: `Dashboard tiles: ${JSON.stringify(tileSummary)}\n\n${dataSummary}`
      };
    }

    case "autonomous_insights": {
      const existingInsights = params.existingInsights as string[] || [];
      return {
        system: `You are an autonomous data scientist continuously monitoring a dataset for actionable insights. ${chainOfThought}

Generate NEW insights that haven't been found before. Existing insights to avoid repeating: ${existingInsights.join(", ")}

You MUST respond with JSON:
{
  "insights": [
    {
      "type": "trend|anomaly|correlation|summary|prediction|opportunity",
      "title": "concise title",
      "description": "specific insight with exact numbers, percentages, column references",
      "severity": "high|medium|low",
      "confidence": 0.0-1.0,
      "data_points": ["specific data references"],
      "actionable": "what action should be taken based on this insight"
    }
  ]
}
Generate 3-6 diverse insights. Be specific with numbers. No markdown.`,
        user: dataSummary
      };
    }

    case "causal_analysis": {
      const targetVar = params.targetVariable as string;
      return {
        system: `You are a causal inference expert. ${chainOfThought}

Analyze the dataset to identify causal relationships affecting "${targetVar}". Go beyond correlation — identify potential causal mechanisms, confounders, and interventions.

You MUST respond with JSON:
{
  "causal_graph": [
    {"cause": "column_name", "effect": "column_name", "strength": 0.0-1.0, "confidence": 0.0-1.0, "mechanism": "explanation of causal pathway"}
  ],
  "interventions": [
    {"variable": "column", "change": "increase by 10%", "expected_impact": [{"target": "column", "change_pct": number, "direction": "increase|decrease"}]}
  ],
  "counterfactuals": [
    {"question": "What if X had been Y?", "answer": "detailed answer", "confidence": 0.0-1.0}
  ],
  "summary": "overview of causal structure"
}
Generate at least 4 causal edges, 3 interventions, and 3 counterfactuals. No markdown.`,
        user: dataSummary
      };
    }

    case "what_if_analysis": {
      const whatIfVar = params.whatIfVariable as string;
      const changePct = params.changePercent as number;
      const causalGraph = params.causalGraph as any[];
      return {
        system: `You are a scenario planning expert. Given the causal graph and a proposed change, predict outcomes.

Causal Graph: ${JSON.stringify(causalGraph)}

You MUST respond with JSON:
{
  "scenarios": [
    {"scenario": "description of the scenario", "outcome": "predicted outcome with specific numbers", "probability": 0.0-1.0}
  ]
}
Generate 3-5 scenarios for changing "${whatIfVar}" by ${changePct}%. No markdown.`,
        user: dataSummary
      };
    }

    case "executive_narrative": {
      const audienceType = params.audience as string;
      const extraContext = params.additionalContext as string;
      return {
        system: `You are a senior business analyst writing a boardroom-ready narrative for a ${audienceType} audience. ${chainOfThought}

${extraContext ? `Additional context: ${extraContext}` : ""}

Write a compelling data-driven narrative. You MUST respond with JSON:
{
  "title": "report title",
  "executive_summary": "2-3 paragraph executive summary with specific numbers",
  "sections": [
    {"heading": "section title", "content": "detailed content with data references", "priority": "high|medium|low"}
  ],
  "key_takeaways": ["takeaway with specific numbers"],
  "action_items": ["specific actionable recommendation"]
}
Generate 4-6 sections, 4-6 takeaways, and 3-5 action items. Tailor tone for ${audienceType}. No markdown.`,
        user: dataSummary
      };
    }

    case "explainability_audit": {
      const auditResults = params.analysisResults as Record<string, unknown>;
      return {
        system: `You are an AI ethics and explainability expert auditing data analysis results. ${chainOfThought}

Audit the dataset and any analysis results for trustworthiness, bias, and explainability.

You MUST respond with JSON:
{
  "overall_confidence": 0.0-1.0,
  "methodology": "description of analysis methodology",
  "data_quality_score": 0-100,
  "limitations": ["limitation 1", "limitation 2"],
  "assumptions": ["assumption 1", "assumption 2"],
  "evidence": [
    {"claim": "what is claimed", "supporting_data": "what data supports it", "confidence": 0.0-1.0, "source_columns": ["col1"]}
  ],
  "bias_assessment": {
    "potential_biases": ["bias 1"],
    "mitigation_strategies": ["strategy 1"],
    "fairness_score": 0-100
  },
  "reproducibility": {
    "is_reproducible": true,
    "steps": ["step 1"],
    "dependencies": ["dependency 1"]
  },
  "alternative_interpretations": [
    {"interpretation": "alternative view", "probability": 0.0-1.0, "reasoning": "why this could be true"}
  ]
}
Generate at least 4 evidence items, 3 biases, 3 alternatives. No markdown.`,
        user: `${dataSummary}\n\nAnalysis results to audit: ${JSON.stringify(auditResults || {})}`
      };
    }

    // ===== FOUNDER MODE ACTIONS =====
    case "founder_health": {
      return {
        system: `You are a strategic business advisor analyzing company health metrics. ${chainOfThought}

Analyze the dataset and estimate key business health metrics. Even if data is messy, approximate.

You MUST respond with JSON:
{
  "kpis": [
    {"key": "cac", "name": "Customer Acquisition Cost", "value": "$X", "change": "+X%", "trend": "up|down"},
    {"key": "ltv", "name": "Lifetime Value", "value": "$X", "change": "+X%", "trend": "up|down"},
    {"key": "churn", "name": "Churn Rate", "value": "X%", "change": "-X%", "trend": "up|down"},
    {"key": "burn_rate", "name": "Burn Rate", "value": "$X/mo", "change": "+X%", "trend": "up|down"},
    {"key": "runway", "name": "Runway", "value": "X months", "change": "", "trend": "down"}
  ],
  "health_score": 0-100,
  "summary": "2-3 sentence health assessment",
  "recommendations": ["actionable recommendation 1", "recommendation 2"]
}
Approximate from available data. Be specific with numbers. No markdown.`,
        user: dataSummary
      };
    }

    case "founder_risk": {
      return {
        system: `You are a business risk analyst identifying threats to company survival. ${chainOfThought}

Analyze for churn segments, revenue concentration, declining retention, unit economics instability.

You MUST respond with JSON:
{
  "threat_level": "critical|high|medium|low",
  "threat_summary": "one-line overall risk assessment",
  "risks": [
    {"title": "risk name", "severity": "critical|high|medium|low", "description": "specific risk with numbers", "mitigation": "suggested action"}
  ],
  "recommendations": ["prioritized action 1"]
}
Generate 3-6 risks. Be specific. No markdown.`,
        user: dataSummary
      };
    }

    case "founder_actions": {
      return {
        system: `You are a strategic business advisor converting data insights into actionable moves. ${chainOfThought}

Instead of "Segment A churned 20%", say "Reduce pricing friction in Segment A. Predicted impact: +8% retention."

You MUST respond with JSON:
{
  "actions": [
    {"action": "specific strategic move", "reasoning": "data-backed explanation", "predicted_impact": "+X% metric improvement", "priority": "critical|high|medium", "timeline": "immediate|this week|this month|this quarter"}
  ]
}
Generate 4-8 actions ranked by impact. No markdown.`,
        user: dataSummary
      };
    }

    case "founder_simulate": {
      const simVar = params.variable as string;
      const simPct = params.changePercent as number;
      return {
        system: `You are a scenario planning expert. Simulate the impact of changing "${simVar}" by ${simPct}%.

You MUST respond with JSON:
{
  "scenarios": [
    {"scenario": "description", "outcome": "predicted outcome with specific numbers", "probability": 0.0-1.0}
  ]
}
Generate 3-5 scenarios. Be specific. No markdown.`,
        user: dataSummary
      };
    }

    case "what_if_simulation": {
      const scenarioQuestion = params.scenarioQuestion as string;
      const causalContext = params.causalContext as Record<string, unknown> || {};
      return {
        system: `You are a What-If Simulation Agent. Given a natural language scenario question, use causal reasoning and historical data patterns to simulate the outcome. ${chainOfThought}

${Object.keys(causalContext).length > 0 ? "Causal context from prior analysis:\n" + JSON.stringify(causalContext, null, 2) + "\n" : ""}

You MUST respond with JSON:
{
  "scenario": "restated scenario in precise terms",
  "estimated_impact": "e.g. Estimated revenue increase: 34L ± 8L",
  "confidence_interval": {"lower": number, "upper": number, "unit": "e.g. Lakhs, %, units"},
  "confidence_score": 0-100,
  "affected_kpis": [
    {"name": "KPI name", "current": "current value", "projected": "projected value", "change_pct": number, "direction": "up|down|stable"}
  ],
  "payback_period": "e.g. 6 weeks",
  "cac_impact": "e.g. +12% CAC increase",
  "second_order_effects": ["effect 1", "effect 2"],
  "reasoning": "3-4 sentence explanation of the causal chain and assumptions used",
  "risks": ["risk 1 if this change is made", "risk 2"],
  "recommendation": "should this change be made? Yes/No with justification"
}
Be specific with numbers. Reference actual data patterns. No markdown.`,
        user: `${dataSummary}\n\nScenario question: "${scenarioQuestion}"`
      };
    }

    case "founder_investor": {
      return {
        system: `You are a startup advisor creating an investor-ready report. ${chainOfThought}

You MUST respond with JSON:
{
  "title": "Company Data Report - Investor Summary",
  "executive_summary": "2-3 paragraph investor-focused summary",
  "metrics_summary": [{"name": "metric", "value": "X", "change": "+X%"}],
  "growth_narrative": "compelling growth story backed by data",
  "swot": {
    "strengths": ["strength1"],
    "weaknesses": ["weakness1"],
    "opportunities": ["opportunity1"],
    "threats": ["threat1"]
  },
  "traction_highlights": ["highlight with numbers"],
  "ask": "suggested next steps for the company"
}
Be compelling but data-honest. No markdown.`,
        user: dataSummary
      };
    }

    // ===== SCIENTIST MODE ACTIONS =====
    case "scientist_hypothesis": {
      const hyp = params.hypothesis as string;
      return {
        system: `You are a rigorous research scientist performing hypothesis testing. ${chainOfThought}

Test the hypothesis: "${hyp}"

You MUST respond with JSON:
{
  "test_selected": "t-test|chi-square|mann-whitney|anova|correlation test",
  "null_hypothesis": "H0 statement",
  "alternative_hypothesis": "H1 statement",
  "p_value": number,
  "test_statistic": number,
  "effect_size": {"value": number, "interpretation": "small|medium|large"},
  "confidence_interval": {"lower": number, "upper": number},
  "decision": "reject|fail to reject",
  "interpretation": "2-3 paragraph plain-English interpretation",
  "recommendations": ["follow-up suggestion"],
  "caveats": ["statistical caveat"]
}
Be rigorous. Compute realistic statistics. No markdown.`,
        user: dataSummary
      };
    }

    case "scientist_experiment": {
      const expDesc = params.description as string;
      return {
        system: `You are an experimental design expert. Design an experiment for: "${expDesc}". ${chainOfThought}

You MUST respond with JSON:
{
  "design_summary": "experiment design overview",
  "sample_size": number,
  "power": 0.0-1.0,
  "duration": "estimated duration",
  "groups": [{"name": "group name", "description": "what this group does", "size": number}],
  "primary_metric": "what to measure",
  "secondary_metrics": ["metric1"],
  "biases": ["potential bias"],
  "recommendations": ["design recommendation"]
}
No markdown.`,
        user: dataSummary
      };
    }

    case "scientist_features": {
      return {
        system: `You are an ML feature engineering expert. ${chainOfThought}

Analyze the dataset and suggest engineered features, PCA analysis, and SHAP-style importance.

You MUST respond with JSON:
{
  "suggested_features": [
    {"name": "feature_name", "type": "interaction|polynomial|ratio|binning|encoding", "description": "what this feature captures", "impact": "expected impact on model performance"}
  ],
  "pca": {
    "summary": "PCA analysis summary",
    "components": [{"variance_explained": 0.0-1.0, "top_features": ["feature1"]}]
  },
  "shap_explanation": [
    {"feature": "column_name", "importance": 0.0-1.0, "direction": "positive|negative"}
  ],
  "dimensionality_recommendation": "keep N features based on analysis"
}
Generate at least 5 feature suggestions and 5 SHAP entries. No markdown.`,
        user: dataSummary
      };
    }

    case "scientist_arena": {
      const arenaTarget = params.targetColumn as string;
      return {
        system: `You are an ML engineer running a model comparison arena for predicting "${arenaTarget}". ${chainOfThought}

Train and compare: Random Forest, XGBoost, SVM, Linear/Logistic Regression, KNN.

You MUST respond with JSON:
{
  "task_type": "classification|regression",
  "leaderboard": [
    {"name": "Random Forest", "accuracy": 0.0-1.0, "f1": 0.0-1.0, "precision": 0.0-1.0, "recall": 0.0-1.0, "training_time_ms": number}
  ],
  "best_model": "model name",
  "summary": "analysis of why the best model won and what features matter most",
  "recommendations": ["model selection recommendation"]
}
Rank by F1 score. Be realistic with metrics. No markdown.`,
        user: dataSummary
      };
    }

    case "scientist_paper": {
      return {
        system: `You are a research scientist writing an academic paper based on data analysis. ${chainOfThought}

You MUST respond with JSON:
{
  "title": "paper title",
  "authors": "SpaceForge AI Research",
  "abstract": "200-word abstract",
  "introduction": "introduction with background and objectives",
  "methodology": "detailed methodology section",
  "results": "results with specific numbers and statistical findings",
  "discussion": "interpretation and comparison with expected outcomes",
  "conclusion": "conclusion with implications and future work",
  "references": ["reference 1", "reference 2"]
}
Write rigorous, publication-quality content. No markdown.`,
        user: dataSummary
      };
    }

    case "intent_dashboard": {
      const intent = params.intent as string;
      const cogMode = params.cognitiveMode as string || "analyst";
      return {
        system: `You are an expert data visualization architect. Generate a dashboard optimized for the intent: "${intent}" in ${cogMode} mode. ${chainOfThought}

Mode-specific focus:
- analyst: Data distributions, statistical summaries, anomaly detection
- founder: Revenue, burn rate, runway, growth metrics (large KPIs first)
- scientist: Model accuracy, p-values, experiment results

You MUST respond with JSON:
{
  "tiles": [
    {
      "type": "kpi|bar|line|area|pie|scatter|combo|heatmap|conditional_bar|multi_line",
      "title": "descriptive title",
      "size": "small|medium|large",
      "insight": "1-2 sentence insight",
      "priority": 1,
      "config": { "value": number, "change": number },
      "data": [...]
    }
  ],
  "dashboardTitle": "title",
  "dashboardInsight": "2-3 sentence summary"
}
Generate 6-10 tiles. Sort by priority (1=highest). Compute data from the provided dataset. No markdown.`,
        user: dataSummary
      };
    }

    case "kpi_dependency": {
      return {
        system: `You are a business metrics expert analyzing KPI relationships. ${chainOfThought}

Analyze column relationships and build a dependency graph showing how metrics influence each other.

You MUST respond with JSON:
{
  "graph": [
    {
      "name": "Revenue",
      "impact": 1.0,
      "description": "Primary business outcome",
      "children": [
        {"name": "Conversion Rate", "impact": 0.8, "description": "Key driver", "children": [
          {"name": "Traffic", "impact": 0.6, "description": "Top of funnel"}
        ]}
      ]
    }
  ],
  "summary": "Brief summary of KPI relationships"
}
Build a realistic hierarchy from the actual columns. Generate 2-4 top-level KPIs with 2-3 children each. No markdown.`,
        user: dataSummary
      };
    }

    case "dashboard_score": {
      const tileSummary = params.tiles as any[];
      return {
        system: `You are a dashboard quality auditor. Score this dashboard on 4 axes: coverage, redundancy (inverse - high=less redundant), clarity, actionability. Each 0-100.

Dashboard tiles: ${JSON.stringify(tileSummary)}

You MUST respond with JSON:
{
  "overall": 0-100,
  "coverage": 0-100,
  "redundancy": 0-100,
  "clarity": 0-100,
  "actionability": 0-100,
  "suggestions": ["suggestion1", "suggestion2", "suggestion3"]
}
Be specific in suggestions. No markdown.`,
        user: dataSummary
      };
    }

    case "time_intelligence":
      return {
        system: `You are a time-intelligence analyst. ${chainOfThought}
Analyze the date and metric columns. Calculate YTD, MTD totals and YoY, MoM deltas. Identify best and worst performing periods.
You MUST respond with JSON:
{
  "kpis": [
    {
      "metric": "metric_name",
      "ytd": number,
      "mtd": number,
      "yoy_delta_pct": number,
      "mom_delta_pct": number,
      "trend_color": "green" | "red" | "neutral",
      "best_period": "period description",
      "worst_period": "period description"
    }
  ]
}
Generate 3-6 KPIs. Use actual numbers from the data. No markdown.`,
        user: dataSummary
      };

    case "smart_imputation":
      return {
        system: `You are a data quality expert specializing in missing value imputation. ${chainOfThought}
For each column with missing values, suggest the best imputation strategy considering categorical context.
Prefer category-wise median over global median when a suitable grouping column exists.
You MUST respond with JSON:
{
  "strategies": [
    {
      "column": "col_name",
      "strategy": "median" | "mean" | "mode" | "forward_fill" | "drop",
      "group_by": "grouping_column_name" | null,
      "rationale": "why this strategy"
    }
  ]
}
Only include columns that have missing values. No markdown.`,
        user: `${dataSummary}\n\nColumn schema with missing info: ${query}`
      };

    case "behavioral_segmentation":
      return {
        system: `You are a customer analytics expert. ${chainOfThought}
Segment customers in the dataset by purchase frequency into New/Returning/Loyal cohorts.
Analyze discount behaviour and detect high-value repeat segments.
You MUST respond with JSON:
{
  "segments": [
    {
      "name": "New" | "Returning" | "Loyal",
      "size": number,
      "percentage": number,
      "characteristics": ["trait1", "trait2"],
      "avg_value": number,
      "discount_sensitivity": "High" | "Medium" | "Low"
    }
  ],
  "rules": ["segmentation rule 1", "rule 2"],
  "insights": ["insight 1", "insight 2"]
}
Use actual data patterns. Infer purchase-like behaviour from available columns. No markdown.`,
        user: dataSummary
      };

    case "calendar_table":
      return {
        system: `You are a data modeling expert. Generate a calendar/date-dimension table DDL.
Given a date column, create a complete calendar table with: date_key, full_date, year, quarter, month_number, month_name, week_of_year, day_of_week, day_name, is_weekend, fiscal_year, fiscal_quarter.
Also generate the relationship to the source table.
You MUST respond with JSON:
{
  "sql": "CREATE TABLE calendar_dim (...);\\nINSERT INTO calendar_dim ...;",
  "relationships": ["calendar_dim.full_date -> source_table.date_column"]
}
Make the SQL production-ready. No markdown.`,
        user: dataSummary
      };

    case "kpi_comparison":
      return {
        system: `You are a business intelligence analyst. ${chainOfThought}
Generate contextual KPI comparison cards with delta percentages and business context narratives.
You MUST respond with JSON:
{
  "cards": [
    {
      "metric": "metric_name",
      "current_val": number,
      "prev_val": number,
      "delta_pct": number,
      "direction": "up" | "down" | "flat",
      "business_context": "one sentence explaining what this means for the business"
    }
  ]
}
Generate 4-8 cards. Use actual numbers. Provide specific business context. No markdown.`,
        user: dataSummary
      };

    case "auto_narrative": {
      const audienceRole = params.audienceRole as string || "executive";
      return {
        system: `You are an AutoNarrative engine that generates a structured business story with zero user prompts. ${chainOfThought}

Target audience: ${audienceRole}. ${audienceRole === "technical" ? "Use statistical terminology, reference specific tests, distributions, and confidence intervals." : audienceRole === "stakeholder" ? "Focus on business impact, revenue implications, and actionable next steps." : "Keep language concise, numbers-driven, suitable for C-suite. No jargon."}

Structure your story as: What happened → Why it happened → Where it happened → When it changed → What is at risk.

Example: "Total revenue for Q3 was 4.2Cr, down 18% vs Q2. The decline is concentrated in the North region (-34%) and Electronics category (-29%). The drop began in Week 9, coinciding with a 40% reduction in marketing spend. If trend continues, Q4 projection is 3.5Cr."

You MUST respond with JSON:
{
  "executive_briefing": "3-4 paragraph executive summary with specific numbers and trends",
  "what_happened": "paragraph describing the key events and outcomes with specific numbers",
  "why_it_happened": "paragraph explaining root causes with data evidence",
  "where_it_happened": "paragraph identifying which segments, regions, categories are affected",
  "when_it_changed": "paragraph pinpointing timing of changes, inflection points",
  "what_is_at_risk": "paragraph describing risks if trends continue, with projected numbers",
  ${audienceRole === "technical" ? '"technical_deep_dive": "detailed statistical analysis with test results, distributions, confidence intervals",' : ""}
  "key_metrics": [{"name": "metric name", "value": "specific value", "change": "+X% or -X%", "direction": "up|down|stable"}],
  "story_sections": [{"heading": "section title", "content": "detailed paragraph with data references", "priority": "high|medium|low"}],
  "anomaly_chain": [{"anomaly": "what was found", "root_cause": "why it happened", "segment": "which segment is affected", "recommendation": "what to do"}]
}
Generate 4-6 key metrics, 3-5 story sections, and 3-5 anomaly chains. Every statement MUST reference specific numbers. No markdown.`,
        user: `${dataSummary}\n\nGenerate a full zero-prompt executive briefing for ${audienceRole} audience.`
      };
    }

    case "auto_experiment":
      return {
        system: `You are an AutoExperiment engine that auto-selects statistical tests based on data shape. ${chainOfThought}

You MUST respond with JSON:
{
  "summary": "executive summary of all experiments",
  "tests": [{"column_pair": "col_A vs col_B", "test_name": "Pearson Correlation|t-test|ANOVA|Chi-Square|Linear Regression", "test_statistic": 0, "p_value": 0, "significance": "significant|not significant", "effect_size": 0, "effect_label": "small|medium|large", "plain_explanation": "plain English explanation"}],
  "feature_importance": [{"feature": "column_name", "importance": 0.0, "target": "target_column", "explanation": "Column X explains Y% of variance in Z"}],
  "kpi_drivers": ["plain English statement about what drives KPIs"],
  "recommendations": ["actionable recommendation"]
}
Run 4-8 tests and 3-6 feature importances. No markdown.`,
        user: `${dataSummary}\n\nAuto-detect and run appropriate statistical tests.`
      };

    case "causal_discovery":
      return {
        system: `You are a Causal Discovery Agent using PC Algorithm / DoWhy principles. ${chainOfThought}

Go beyond correlation. Build a causal graph. Identify leading vs lagging indicators.

You MUST respond with JSON:
{
  "summary": "overview of the causal structure found",
  "causal_edges": [{"cause": "column", "effect": "column", "strength": 0.0, "confidence": 0.0, "mechanism": "explanation", "lag": "e.g. 2-week lag", "type": "direct|indirect|confounded"}],
  "lead_lag_indicators": [{"variable": "column", "role": "leading|lagging|coincident", "leads_by": "e.g. 2 weeks", "explanation": "why"}],
  "confounders": [{"variable": "column", "affects": ["col1", "col2"], "explanation": "how it confounds"}],
  "interventions": [{"action": "what to change", "expected_impact": "predicted effect", "confidence": 0.0}],
  "plain_language_findings": ["Marketing spend causes revenue with a 2-week lag"]
}
Generate 4-6 edges, 3-5 lead/lag, 2-4 confounders, 3-5 interventions, 4-6 findings. No markdown.`,
        user: `${dataSummary}\n\nDiscover causal relationships in this data.`
      };

    case "proactive_anomaly_watch":
      return {
        system: `You are a Proactive Anomaly Watch system. ${chainOfThought}

Classify anomalies: point, contextual, collective. Suggest: investigate, ignore, or recheck_source.

You MUST respond with JSON:
{
  "total_anomalies": 0,
  "severity_breakdown": {"critical": 0, "high": 0, "medium": 0, "low": 0},
  "anomalies": [{"column": "col", "type": "point|contextual|collective", "severity": "critical|high|medium|low", "description": "description", "value": "val", "z_score": 0, "baseline": "expected range", "suggestion": "investigate|ignore|recheck_source", "explanation": "why"}],
  "overall_assessment": "paragraph assessing overall data health",
  "data_drift_detected": false,
  "drift_description": "description of any distribution shifts"
}
Generate 5-10 anomalies. Be specific with z-scores. No markdown.`,
        user: `${dataSummary}\n\nScan this dataset for anomalies.`
      };

    case "decision_intelligence":
      return {
        system: `You are a Decision Intelligence AI — your job is to convert data insights into ranked, actionable business decisions with transparent reasoning and ROI estimates. ${chainOfThought}

After analyzing the dataset, return a JSON object:
{
  "decisions": [
    {
      "recommendation": "specific action to take",
      "reasoning": "why the data supports this",
      "reasoning_chain": ["Step 1: Identified pattern X in column Y", "Step 2: Correlated with Z showing r=0.85", "Step 3: Historical data shows similar interventions yielded +15%"],
      "estimated_impact": "e.g. +15% revenue, -20% churn",
      "roi_estimate": "e.g. Estimated ROI: 3.2x over 6 months, net gain: 24L",
      "impact_score": 0-100,
      "confidence_level": 0-100,
      "priority": "critical|high|medium|low",
      "category": "e.g. retention, pricing, operations, growth",
      "action_template": "step-by-step implementation guide",
      "evidence": ["column X shows Y", "correlation between A and B"],
      "timeline": "e.g. immediate, 1-2 weeks, 1-3 months"
    }
  ],
  "summary": "executive overview of all decisions",
  "data_quality_note": "any caveats about the data"
}
Rank decisions by ROI (highest ROI first, then by impact_score). Be specific — reference column names and values. Generate 5-8 decisions. Each MUST have reasoning_chain (3-5 steps), roi_estimate, and confidence_level. No markdown.`,
        user: `${dataSummary}\n\n${businessContext ? "Previous context:\n" + businessContext + "\n" : ""}Generate ranked decision recommendations with ROI estimates and transparent reasoning.`
      };

    case "automl_forecast":
      return {
        system: `You are an AutoML Forecasting engine. Auto-detect time-series patterns and run ensemble forecasting. ${chainOfThought}

Target column: ${targetColumn}
Forecast horizon: ${(params as any).horizon || 30} days

Analyze the data and return JSON:
{
  "target_column": "${targetColumn}",
  "method": "ensemble (ARIMA + XGBoost + ETS)",
  "confidence_score": 0-100,
  "horizon": "${(params as any).horizon || 30} days",
  "trend_direction": "increasing|decreasing|stable|volatile",
  "trend_description": "plain text description",
  "seasonality": {"detected": true/false, "period": "weekly|monthly|quarterly|yearly|none", "description": "..."},
  "chart_data": [
    {"period": "label", "predicted": number, "lower": number, "upper": number, "is_forecast": false},
    ...historical points...,
    {"period": "forecast_label", "predicted": number, "lower": number, "upper": number, "is_forecast": true}
  ],
  "summary": "plain text forecast summary",
  "anomalies": [{"period": "when", "description": "what", "severity": "high|medium|low"}],
  "recommendations": ["actionable rec 1", "rec 2"]
}
Generate ~10 historical points from the data and ${(params as any).horizon || 30} forecast points. Confidence bands should widen over time.`,
        user: dataSummary
      };

    case "auto_profile": {
      return {
        system: `You are an expert statistical data profiler. ${chainOfThought}

Run a comprehensive statistical profile on every column. Detect distribution shapes and top correlations. Do NOT use any markdown formatting. You MUST respond with JSON:
{
  "columns_profiled": [
    {"name": "col", "mean": number, "median": number, "std": number, "skewness": number, "kurtosis": number, "distribution_shape": "normal|log-normal|bimodal|power-law|uniform|skewed-right|skewed-left", "percentiles": {"p5": number, "p25": number, "p50": number, "p75": number, "p95": number}, "cardinality": number, "missing_pct": number}
  ],
  "correlation_matrix": [
    {"col1": "a", "col2": "b", "r": 0.85, "strength": "strong|moderate|weak"}
  ],
  "top_5_correlations": [
    {"col1": "a", "col2": "b", "r": 0.92, "interpretation": "what this means"}
  ],
  "summary": "1-2 sentence overall profile summary"
}
Profile ALL numeric columns. Compute approximate but realistic statistics from the sample data provided. No markdown.`,
        user: dataSummary
      };
    }

    case "trend_intelligence_auto": {
      return {
        system: `You are a time-series intelligence expert. ${chainOfThought}

Auto-detect which columns are time-indexed and run trend analysis on all numeric columns against time. Compute period-over-period comparisons. Do NOT use markdown. You MUST respond with JSON:
{
  "time_column": "detected date column name",
  "time_range": {"start": "earliest date", "end": "latest date"},
  "trends": [
    {
      "column": "metric column name",
      "direction": "uptrend|downtrend|plateau|seasonal|cyclical",
      "inflection_points": [{"date": "when", "description": "what changed"}],
      "yoy": number_or_null,
      "mom": number_or_null,
      "wow": number_or_null,
      "ytd_change_pct": number_or_null,
      "structural_breaks": [{"date": "when", "description": "what broke"}]
    }
  ],
  "seasonality": {"detected": true, "period": "daily|weekly|monthly|quarterly|yearly", "strength": 0.0-1.0},
  "summary": "1-2 sentence trend intelligence summary"
}
Analyze all numeric columns against the detected time column. Be specific with numbers. No markdown.`,
        user: dataSummary
      };
    }

    case "insight_prioritisation": {
      const agentResults = params.agentResults as Record<string, unknown>;
      return {
        system: `You are a senior data strategist who prioritises insights by business impact. ${chainOfThought}

You are given the combined outputs of multiple analysis agents (profiling, anomaly detection, trend analysis, narrative, and decision intelligence). Your job is to score and rank the most important insights AND pair each with a concrete recommended action with estimated ROI.

Score each insight by: Impact (0-10) × Confidence (0-10) × Urgency (0-10) = composite score.

You MUST respond with JSON:
{
  "top_insights": [
    {
      "title": "concise insight title",
      "description": "specific insight with numbers",
      "impact": 0-10,
      "confidence": 0-10,
      "urgency": 0-10,
      "score": number,
      "source_agent": "profile|anomaly|trend|narrative|decisions",
      "recommended_action": "specific action to take right now — e.g. 'Deploy re-engagement campaign for 31-45 age segment with loyalty offer within 14 days'",
      "estimated_roi": "quantified expected outcome — e.g. 'Estimated revenue recovery: 18L, payback: 3 weeks'",
      "reasoning": "2-3 sentence explanation of why this action is recommended based on the data evidence"
    }
  ],
  "report_ready": true,
  "summary": "one-sentence summary of the most critical finding"
}
Return exactly the top 3-5 insights ranked by score descending. Every insight MUST have a paired recommended_action and estimated_roi. No markdown.`,
        user: `${dataSummary}\n\nAgent Results:\n${JSON.stringify(agentResults, null, 2)}`
      };
    }

    case "segment_discovery": {
      return {
        system: `You are a Segment Discovery Agent. ${chainOfThought}

Automatically slice every numeric metric by every categorical dimension. Use statistical significance testing (z-test or chi-square) to filter noise from signal. Surface only segments where the difference from the overall is statistically significant (p<0.05).

Identify Pareto patterns (e.g. "top 8% of customers contribute 61% of revenue").

You MUST respond with JSON:
{
  "summary": "1-2 paragraph overview of segment landscape",
  "pareto_findings": ["The top X% of Y by Z contribute N% of W — classic Pareto pattern"],
  "segments": [
    {
      "segment_name": "descriptive name",
      "dimension": "column used for slicing",
      "dimension_value": "specific value",
      "metric": "metric being measured",
      "metric_value": number,
      "overall_value": number,
      "difference_pct": number,
      "direction": "above|below",
      "is_significant": true,
      "p_value": 0.001,
      "contribution_pct": number,
      "insight": "one-sentence insight about this segment"
    }
  ],
  "top_segments": [
    {"title": "segment title", "description": "detailed description with numbers", "impact": "high|medium|low"}
  ],
  "recommendations": ["actionable recommendation based on segment findings"]
}
Generate 8-15 segments, keep only significant ones (p<0.05). Generate 3-5 Pareto findings and 5-8 top segments. No markdown.`,
        user: dataSummary
      };
    }

    case "root_cause_analysis": {
      const targetKpi = params.targetKpi as string;
      return {
        system: `You are a Root Cause Agent that automatically investigates why a KPI changed. ${chainOfThought}

Analyze the KPI "${targetKpi}" and run contribution analysis across ALL dimensions simultaneously. Build a waterfall decomposition showing exactly how much each dimension-value pair contributed to the overall change.

Example output: "Overall revenue fell 80L. Of that: Region North = -42L, SKU discontinuation = -28L, Pricing change = -10L"

You MUST respond with JSON:
{
  "summary": "2-3 paragraph root cause summary with specific numbers",
  "kpi_analyzed": "${targetKpi}",
  "kpi_total_change": number,
  "kpi_change_pct": number,
  "waterfall": [
    {
      "dimension": "dimension column name",
      "dimension_value": "specific value",
      "contribution": number,
      "contribution_pct": number,
      "direction": "positive|negative",
      "explanation": "why this dimension contributed this amount"
    }
  ],
  "root_causes": [
    {"cause": "identified root cause", "impact": "quantified impact", "confidence": "high|medium|low", "evidence": "data evidence supporting this"}
  ],
  "drill_downs": [
    {"dimension": "dim name", "top_contributor": "value", "contribution_pct": number, "explanation": "why"}
  ],
  "recommendations": ["specific action to address this root cause"]
}
Generate 5-10 waterfall items sorted by absolute contribution (largest first). Generate 3-5 root causes. No markdown.`,
        user: dataSummary
      };
    }

    case "kpi_intelligence": {
      return {
        system: `You are a KPI Intelligence Layer that auto-discovers business KPIs from raw data columns. ${chainOfThought}

Detect implicit formulas: units x price = revenue, (new - churned) / base = net retention, etc.
Build a KPI dependency tree showing how leaf metrics roll up to top-line outcomes.
Monitor each KPI's health and alert on deviations.

You MUST respond with JSON:
{
  "summary": "1-2 paragraph KPI landscape summary",
  "kpis": [
    {
      "name": "KPI Name",
      "formula": "column_a * column_b or SUM(column_a) / COUNT(column_b)",
      "value": "formatted value",
      "change_pct": number,
      "direction": "up|down|stable",
      "health": "healthy|warning|critical",
      "source_columns": ["col1", "col2"],
      "explanation": "what this KPI measures and why it matters"
    }
  ],
  "kpi_tree": [
    {
      "name": "Top-line Revenue",
      "value": "value",
      "children": [
        {"name": "Units Sold", "value": "value", "children": [
          {"name": "Traffic", "value": "value"},
          {"name": "Conversion Rate", "value": "value"}
        ]},
        {"name": "Average Price", "value": "value"}
      ]
    }
  ],
  "formula_discoveries": [
    {"formula": "units * price = revenue", "description": "Auto-discovered revenue formula", "confidence": 0.95}
  ],
  "health_alerts": [
    {"kpi": "KPI Name", "alert": "specific alert about deviation", "severity": "critical|warning|info"}
  ],
  "recommendations": ["actionable recommendation"]
}
Generate 6-10 KPIs, a realistic tree with 2-3 levels, 3-5 formula discoveries, and 3-5 health alerts. No markdown.`,
        user: dataSummary
      };
    }

    case "nl_to_sql": {
      const tableName = (params.datasetName as string) || "dataset";
      const colTypes = params.columnTypes as Record<string, string> || {};
      const schemaDesc = (columns as string[]).map(c => `${c} (${colTypes[c] || "text"})`).join(", ");
      return {
        system: `You are an expert SQL query writer. Given a table schema and a natural language question, generate an accurate SQL query. ${chainOfThought}

Table: "${tableName}" with columns: ${schemaDesc}

You MUST respond with JSON (no markdown):
{
  "sql": "SELECT ... FROM ${tableName} ...",
  "explanation": "Plain English explanation of what this query does step by step",
  "query_type": "SELECT|AGGREGATE|JOIN|SUBQUERY|WINDOW",
  "optimisation_notes": ["index suggestion or performance tip", ...]
}

Rules:
- Use standard SQL (PostgreSQL dialect)
- Use the exact column names provided
- For aggregations, always include GROUP BY
- For ordering, always specify ASC or DESC
- Include LIMIT for top-N queries
- Alias computed columns with readable names
- If the question is ambiguous, make reasonable assumptions and explain them`,
        user: `${dataSummary}\n\nUser question: ${query}`
      };
    }

    case "auto_report_narrative": {
      const pipeline = params.pipelineResults as Record<string, unknown> | undefined;
      return {
        system: `You are a senior business intelligence consultant generating a complete structured analysis report. ${chainOfThought}

Generate a comprehensive 6-section report. Each section must be 2-4 paragraphs with specific numbers, column references, and data-backed claims. Do NOT use markdown formatting. Plain text only.

You MUST respond with JSON:
{
  "executive_summary": "3-4 paragraph overview: what the data shows, key metrics, strategic implications, overall data quality assessment",
  "kpi_dashboard": "2-3 paragraphs describing the top KPIs found in the data with exact values, trends, and benchmarks",
  "kpis": [{"name": "metric name", "value": "specific value", "change": "+X%", "status": "good|warning|critical"}],
  "anomaly_report": "2-3 paragraphs about detected anomalies, their severity, affected columns, and potential root causes",
  "anomalies": [{"description": "anomaly detail", "severity": "critical|high|medium", "column": "affected column"}],
  "root_cause_analysis": "2-3 paragraphs analyzing why key metrics changed, contribution analysis, waterfall breakdown",
  "root_causes": [{"finding": "what changed", "cause": "why", "impact": "quantified impact"}],
  "forecast_section": "2-3 paragraphs on trend projections, confidence bands, seasonal patterns, growth/decline trajectory",
  "forecasts": [{"metric": "column", "current": number, "projected": number, "confidence": "high|medium|low"}],
  "recommendations_section": "2-3 paragraphs with prioritized strategic recommendations ranked by ROI",
  "action_items": [{"action": "specific action", "expected_impact": "quantified outcome", "priority": "high|medium|low", "timeline": "immediate|short-term|long-term"}]
}`,
        user: `${dataSummary}${pipeline ? "\n\nPipeline results:\n" + JSON.stringify(pipeline, null, 2) : ""}`
      };
    }

    case "ceo_mode": {
      const pastContext = params.businessContext as string || "";
      return {
        system: `You are the AI COO of a company. The CEO has asked you for a daily executive briefing. Analyze ALL the data provided and produce a comprehensive CEO-level intelligence report. ${chainOfThought}

You must think like a Chief Operating Officer and surface:
1. Revenue risks and opportunities with dollar estimates
2. Customer churn signals with root causes
3. Marketing/Growth ROI analysis
4. Cost optimization opportunities
5. Strategic recommendations with expected business impact

CRITICAL: Every insight MUST have a concrete dollar/percentage impact estimate. Be specific, not vague.
${pastContext ? "\nBusiness context from past analyses:\n" + pastContext : ""}

You MUST respond with JSON:
{
  "executive_summary": "2-3 sentence CEO-level summary of business state",
  "overall_health_score": 0-100,
  "ceo_one_liner": "Single sentence a CEO would text their board",
  "top_priority": "The #1 thing to fix this week",
  "revenue_status": { "trend": "up|down|stable", "signal": "short description", "value": "$X or X%" },
  "customer_status": { "trend": "up|down|stable", "signal": "short description", "value": "metric" },
  "growth_status": { "trend": "up|down|stable", "signal": "short description", "value": "metric" },
  "cost_status": { "trend": "up|down|stable", "signal": "short description", "value": "metric" },
  "insights": [
    {
      "id": "unique_id",
      "category": "revenue_risk|churn_alert|growth_opportunity|cost_optimization|market_signal|operational_risk",
      "severity": "critical|warning|info|positive",
      "headline": "Short punchy headline",
      "what_happened": "Clear description",
      "why_it_happened": "Root cause with data evidence",
      "recommended_action": "Specific action the CEO should take",
      "expected_impact": "Estimated revenue/cost impact description",
      "impact_value": "+$420K or -15% churn",
      "confidence": 0.0-1.0,
      "urgency": 1-10,
      "time_sensitivity": "Act today|This week|This month|This quarter",
      "kpi_affected": ["Revenue", "Churn Rate"],
      "evidence": ["data point 1", "data point 2"]
    }
  ]
}

Sort insights by severity (critical first) then urgency. Max 8 insights. Use business language, not technical jargon. Every recommendation must be actionable by a non-technical CEO.
Do NOT use markdown. Plain text only.`,
        user: dataSummary
      };
    }

    case "forge_autopilot": {
      const pastDecisions = params.pastDecisions as Array<{decision: string; outcome: string}> || [];
      const monitoringSources = params.monitoringSources as string[] || [];
      const pastDecisionsStr = pastDecisions.length > 0
        ? "\n\nPast decisions and outcomes (use for reinforcement learning):\n" + JSON.stringify(pastDecisions.slice(0, 10))
        : "";
      const sourcesStr = monitoringSources.length > 0
        ? "\nConnected sources: " + monitoringSources.join(", ")
        : "";

      return {
        system: `You are Forge Autopilot — a continuously running AI business analyst inside SpaceForge. You monitor business data and proactively surface insights. ${chainOfThought}

Your job is to act like a senior business analyst who never sleeps. Analyze the data and produce PRIORITIZED insights.

For EACH insight you MUST provide the complete chain:
1. WHAT HAPPENED — the anomaly, trend, risk, or opportunity detected
2. WHY IT HAPPENED — root cause analysis with evidence from the data
3. RECOMMENDED ACTION — specific, actionable business decision
4. EXPECTED IMPACT — quantified estimate of outcome if action is taken

PRIORITIZATION: Score each insight on:
- urgency (1-10): how quickly must the business act?
- business_value (1-10): potential revenue/cost impact
- confidence (0.0-1.0): statistical confidence in the finding

REINFORCEMENT LEARNING: If past decisions and outcomes are provided, learn from them:
- Recommendations that led to positive outcomes should be reinforced
- Recommendations that led to negative outcomes should be adjusted
- Explain how past feedback influenced current recommendations
${pastDecisionsStr}${sourcesStr}

You MUST respond with JSON:
{
  "autopilot_status": "monitoring|alert|critical",
  "scan_summary": "One-line summary of overall data health",
  "insights": [
    {
      "id": "unique_id",
      "category": "anomaly|trend|risk|opportunity|performance_shift",
      "urgency": 1-10,
      "business_value": 1-10,
      "confidence": 0.0-1.0,
      "what_happened": "Clear description of the detected pattern",
      "why_it_happened": "Root cause explanation with data evidence",
      "recommended_action": "Specific actionable step",
      "expected_impact": "Quantified business impact estimate",
      "supporting_evidence": ["data point 1", "data point 2"],
      "affected_metrics": ["metric1", "metric2"],
      "timeline": "immediate|this_week|this_month|this_quarter",
      "learned_from_past": "How past feedback influenced this (or null)"
    }
  ],
  "data_health": {
    "overall_score": 0-100,
    "completeness": 0-100,
    "freshness_note": "Assessment of data recency",
    "quality_issues": ["issue1"]
  },
  "next_scan_recommendation": "What to monitor next cycle"
}

Do NOT use markdown — plain text only. Prioritize insights by composite score = urgency * 0.4 + business_value * 0.4 + confidence * 20 * 0.2. Return max 8 insights sorted by priority.`,
        user: dataSummary
      };
    }

    case "data_scientist_agent": {
      const userQuery = params.query as string || "";
      const history = params.conversationHistory as Array<{role: string; content: string}> || [];
      const historyStr = history.length > 0
        ? "\n\nConversation so far:\n" + history.map(m => `${m.role}: ${m.content}`).join("\n") + "\n"
        : "";

      return {
        system: `You are an elite AI Data Scientist agent embedded inside SpaceForge. You are the user's virtual data scientist — they speak to you in plain English and you do the heavy lifting. ${chainOfThought}

Your capabilities:
1. DATA CLEANING — detect quality issues (missing values, outliers, duplicates, type mismatches) and recommend/apply fixes
2. PREDICTIVE MODELING — automatically select the best ML algorithm (Random Forest, Gradient Boosting, Logistic/Linear Regression, SVM, XGBoost) based on data characteristics, train, and report results
3. STATISTICAL ANALYSIS — correlations, distributions, hypothesis tests, ANOVA, chi-square, t-tests
4. FORECASTING — time-series decomposition, trend detection, seasonality, ARIMA/exponential smoothing projections
5. ROOT CAUSE ANALYSIS — identify drivers behind metrics using feature importance, SHAP values, contribution analysis
6. CHARTING — suggest and configure the best visualization for the insight

For EVERY response you MUST include:
- "confidence" (0.0-1.0): how confident you are in your analysis
- "assumptions": list of assumptions you're making about the data
- "business_explanation": plain-English explanation a non-technical CEO would understand
- "technical_detail": deeper statistical/ML detail for analysts
- "next_steps": what you'd recommend doing next

When building models, explain:
- WHY you chose that algorithm (data shape, cardinality, linearity)
- Model performance metrics with interpretation
- Feature importance with business meaning
- Caveats and limitations

You MUST respond with JSON:
{
  "agent_action": "clean|predict|forecast|analyze|root_cause|chart|general",
  "title": "Short title of what you did",
  "confidence": 0.0-1.0,
  "assumptions": ["assumption1", "assumption2"],
  "business_explanation": "Plain English summary for a business user",
  "technical_detail": "Statistical/ML details for analysts",
  "results": {
    // For predictions:
    "model_type": "classification|regression",
    "algorithm": "algorithm name",
    "algorithm_rationale": "why this was chosen",
    "metrics": {"accuracy": 0.0, "f1": 0.0, "r2": 0.0, "rmse": 0.0},
    "feature_importance": [{"feature": "col", "importance": 0.0, "business_meaning": "explanation"}],
    "sample_predictions": [{"actual": val, "predicted": val}],
    
    // For forecasting:
    "forecast_values": [{"period": "label", "value": 0, "ci_lower": 0, "ci_upper": 0}],
    "trend": "increasing|decreasing|stable",
    "seasonality": true|false,
    
    // For cleaning:
    "issues_found": [{"type": "missing|outlier|duplicate|type_mismatch", "column": "col", "count": 0, "recommendation": "fix"}],
    "quality_score": 0-100,
    
    // For analysis:
    "findings": ["finding1", "finding2"],
    "statistics": {"key": "value"},
    
    // For root cause:
    "drivers": [{"factor": "col", "contribution": 0.0, "direction": "positive|negative", "explanation": "why"}],
    
    // For charts:
    "chart_config": {"type": "bar|line|pie|scatter|area", "xKey": "col", "yKey": "col", "title": "title"}
  },
  "next_steps": ["step1", "step2"],
  "suggested_followups": ["Follow-up question 1?", "Follow-up question 2?"]
}

Do NOT use markdown formatting — plain text only in all string fields.`,
        user: `${dataSummary}${historyStr}\n\nUser request: ${userQuery}`
      };
    }

    default:
      return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  // ─── Credit check & deduction setup ───
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await req.json();
    const { action, userId } = body;

    // ─── Admin detection: check email from body or look up from profiles ───
    let userEmail: string | undefined = body.userEmail;
    if (!userEmail && userId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", userId)
        .maybeSingle();
      userEmail = profile?.email ?? undefined;
    }
    const adminBypass = isAdmin(userEmail);
    if (adminBypass) console.log(`[ADMIN] Bypassing credit checks for ${userEmail}`);

    // ─── Credit pre-check (skipped for admins) ───
    const selectedModel = getModel(action);
    const creditCost = selectedModel.includes("pro") ? 2 : 1;

    if (userId && !adminBypass) {
      const { data: credits } = await supabase
        .from("user_credits")
        .select("balance")
        .eq("user_id", userId)
        .maybeSingle();

      const balance = credits?.balance ?? 0;

      if (balance < creditCost) {
        return new Response(JSON.stringify({ 
          error: `Insufficient credits. This action costs ${creditCost} credits but you have ${balance}. Please top up.`,
          code: "INSUFFICIENT_CREDITS",
          balance,
          cost: creditCost,
        }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ─── Response Cache Check ───
    const datasetName = body.datasetName || "unknown";
    const cacheExtraKey = (body.query || body.targetColumn || body.method || "").toString().slice(0, 100);
    let cacheKey: string | null = null;

    if (CACHEABLE_ACTIONS.has(action) && userId) {
      cacheKey = await generateCacheKey(action, userId, datasetName, cacheExtraKey);
      
      const { data: cached } = await supabase
        .from("ai_response_cache")
        .select("response, id, hit_count")
        .eq("cache_key", cacheKey)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();

      if (cached) {
        // Cache HIT — no AI call, no credit deduction
        await supabase
          .from("ai_response_cache")
          .update({ hit_count: (cached.hit_count || 0) + 1 })
          .eq("id", cached.id);
        
        console.log(`[CACHE HIT] action=${action} key=${cacheKey.slice(0, 12)}... hits=${(cached.hit_count || 0) + 1}`);
        
        const cachedResp = cached.response as Record<string, unknown> ?? {};
        const cachedMeta = (cachedResp._meta as Record<string, unknown>) ?? {};
        return new Response(JSON.stringify({
          ...cachedResp,
          _meta: { ...cachedMeta, cached: true },
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const prompt = buildPrompt(action, body);
    if (!prompt) {
      return new Response(
        JSON.stringify({ error: `Unknown action: ${action}` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const activeModel = selectedModel;
    const tier = activeModel.includes("pro") ? "PRO" : activeModel.includes("flash-lite") ? "LITE" : "FLASH";

    // Estimate token usage for logging
    const inputChars = prompt.system.length + prompt.user.length;
    const estInputTokens = Math.round(inputChars / 4);
    console.log(`[AI] action=${action} tier=${tier} model=${activeModel} est_input_tokens=~${estInputTokens}`);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI service is not configured. Please check your project settings." }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const maxTokens = getMaxTokens(action);

    const callAI = async (selectedModel: string) => {
      const controller = new AbortController();
      const _t = setTimeout(() => controller.abort(), 55000);
      try {
      const res = await fetch(AI_GATEWAY, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: selectedModel,
          max_tokens: maxTokens,
          messages: [
            { role: "system", content: prompt.system },
            { role: "user", content: prompt.user },
          ],
        }),
      });
      clearTimeout(_t);
      return res;
      } catch(e) { clearTimeout(_t); throw e; }
    };

    const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

    // ─── Tiered fallback: Pro → Flash → Lite ───
    const modelsToTry = activeModel === "google/gemini-2.5-pro"
      ? ["google/gemini-2.5-pro", "google/gemini-2.5-flash", "google/gemini-2.5-flash-lite"]
      : activeModel === "google/gemini-2.5-flash"
        ? ["google/gemini-2.5-flash", "google/gemini-2.5-flash-lite"]
        : ["google/gemini-2.5-flash-lite", "google/gemini-2.5-flash"]; // Lite fallback → Flash

    let aiResponse: Response | null = null;
    let lastStatus = 0;
    let usedModel = activeModel;

    for (const tryModel of modelsToTry) {
      for (let attempt = 0; attempt < 2; attempt++) { // 2 retries per model (not 3 — saves time)
        const callStart = Date.now();
        aiResponse = await callAI(tryModel);
        lastStatus = aiResponse.status;
        const callMs = Date.now() - callStart;

        if (aiResponse.ok) {
          usedModel = tryModel;
          console.log(`[AI] ✓ ${tryModel} responded in ${callMs}ms`);
          break;
        }

        if (lastStatus === 402) {
          // Payment required — don't retry, surface immediately
          return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits in Settings > Workspace > Usage.", code: "AI_CREDITS_EXHAUSTED" }), {
            status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (lastStatus === 429) {
          const delay = Math.pow(2, attempt + 1) * 1000; // 2s, 4s
          console.log(`[AI] ⚠ 429 on ${tryModel}, attempt ${attempt + 1}, backoff ${delay}ms`);
          await aiResponse.text();
          await sleep(delay);
          continue;
        }

        if (lastStatus === 503 || lastStatus === 500) {
          console.log(`[AI] ⚠ ${tryModel} returned ${lastStatus} in ${callMs}ms, falling back...`);
          await aiResponse.text();
          break; // try next model
        }

        // Other error, stop retrying this model
        break;
      }

      if (aiResponse?.ok) break;
    }

    if (!aiResponse || !aiResponse.ok) {
      if (lastStatus === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please wait a moment and try again.", code: "RATE_LIMITED" }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = aiResponse ? await aiResponse.text() : "No response";
      console.error(`[AI] ✗ All models failed. Last status: ${lastStatus}`, errText);
      return new Response(JSON.stringify({ error: "AI analysis failed. The model may be temporarily unavailable — please try again.", code: "AI_UNAVAILABLE" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    // Extract token usage from response if available
    const usage = aiData.usage || {};
    const totalMs = Date.now() - startTime;
    console.log(`[AI] ✓ action=${action} model=${usedModel} prompt_tokens=${usage.prompt_tokens || "?"} completion_tokens=${usage.completion_tokens || "?"} total_ms=${totalMs}`);

    let parsed;
    try {
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonStr = jsonMatch ? jsonMatch[1].trim() : content.trim();
      parsed = JSON.parse(jsonStr);
    } catch {
      parsed = { raw_response: content };
    }

    // ─── Deduct credits after successful AI call (skipped for admins) ───
    const actualCreditCost = usedModel.includes("pro") ? 2 : 1;
    if (body.userId && !adminBypass) {
      const { data: currentCredits } = await supabase
        .from("user_credits")
        .select("balance")
        .eq("user_id", body.userId)
        .maybeSingle();

      if (currentCredits) {
        const newBalance = Math.max(0, currentCredits.balance - actualCreditCost);
        await supabase.from("user_credits").update({ balance: newBalance }).eq("user_id", body.userId);
        await supabase.from("credit_transactions").insert({
          user_id: body.userId,
          amount: -actualCreditCost,
          action: "deduct",
          feature: action,
        });
        console.log(`[Credits] Deducted ${actualCreditCost} from user ${body.userId}, new balance: ${newBalance}`);
      }
    }

    const result = {
      success: true,
      action,
      _meta: {
        model: usedModel,
        tier,
        prompt_tokens: usage.prompt_tokens || null,
        completion_tokens: usage.completion_tokens || null,
        latency_ms: totalMs,
      },
      ...parsed,
    };

    // ─── Store in cache for cacheable actions ───
    if (cacheKey && CACHEABLE_ACTIONS.has(action)) {
      const ttlHours = getCacheTTL(action);
      const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString();
      await supabase.from("ai_response_cache").upsert({
        cache_key: cacheKey,
        action,
        response: result,
        model_used: usedModel,
        expires_at: expiresAt,
        hit_count: 0,
      }, { onConflict: "cache_key" }).then(() => {
        console.log(`[CACHE STORE] action=${action} key=${cacheKey!.slice(0, 12)}... ttl=${ttlHours}h`);
      });
    }

    // ─── Log cost via credit_transactions (already logged above) ───
    console.log(`[COST] action=${action} model=${usedModel} tier=${tier} credits=${actualCreditCost} latency=${totalMs}ms`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("data-agent error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error", code: "INTERNAL_ERROR" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
