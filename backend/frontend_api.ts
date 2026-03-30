/**
 * Data Alchemy Studio — API Service Layer
 * ─────────────────────────────────────────────────────────────────────────────
 * Single source of truth for all backend API calls.
 * Replace VITE_API_URL in .env to switch between local dev and production.
 *
 * This file replaces the old Gemini/GPT integrations entirely.
 * Drop it in: src/services/api.ts
 */

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

// ─── Generic fetch wrapper ────────────────────────────────────────────────────

async function apiPost<TBody, TResponse>(
  endpoint: string,
  body: TBody,
  timeoutMs = 60_000
): Promise<TResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(error.detail || `API error ${res.status}`);
    }

    return res.json() as Promise<TResponse>;
  } finally {
    clearTimeout(timer);
  }
}

async function apiGet<TResponse>(endpoint: string): Promise<TResponse> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json() as Promise<TResponse>;
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DataRow {
  [key: string]: string | number | boolean | null;
}

// EDA
export interface EDAResult {
  basic_info: {
    total_rows: number;
    total_columns: number;
    memory_usage_mb: number;
    duplicate_rows: number;
  };
  column_info: Array<{
    name: string;
    dtype: string;
    non_null_count: number;
    null_count: number;
    null_percentage: number;
    unique_values: number;
    sample_values: unknown[];
  }>;
  numeric_stats: Array<{
    column: string;
    mean: number;
    median: number;
    std: number;
    min: number;
    max: number;
    q25: number;
    q75: number;
    skewness: number;
    kurtosis: number;
  }>;
  categorical_stats: unknown[];
  data_quality_score: number;
  outlier_summary: Record<string, unknown>;
  missing_value_patterns: unknown[];
}

// Correlations
export interface CorrelationResult {
  columns: string[];
  matrix: Record<string, Record<string, number>>;
  top_correlations: Array<{
    column1: string;
    column2: string;
    correlation: number;
    strength: "strong" | "moderate" | "weak";
    direction: "positive" | "negative";
  }>;
  heatmap_data: unknown[];
}

// ML Prediction
export interface PredictionResult {
  model_type: "regression" | "classification";
  target_column: string;
  feature_columns: string[];
  metrics: {
    r2_score?: number;
    mse?: number;
    mae?: number;
    rmse?: number;
    accuracy?: number;
    precision?: number;
    recall?: number;
    f1_score?: number;
  };
  feature_importance: Array<{ feature: string; importance: number; rank: number }>;
  predictions_sample: Array<{ index: number; actual: number; predicted: number; error: number }>;
  model_summary: string;
  cross_val_score?: number;
}

// Clustering
export interface ClusteringResult {
  algorithm: string;
  n_clusters: number;
  metrics: {
    silhouette_score?: number;
    inertia?: number;
    davies_bouldin?: number;
    calinski_harabasz?: number;
  };
  cluster_stats: Array<{
    cluster_id: number;
    size: number;
    percentage: number;
    centroid: Record<string, number>;
    label: string;
  }>;
  scatter_data: Array<{ x: number; y: number; cluster: number; index: number }>;
  feature_columns: string[];
  cluster_profiles: unknown[];
}

// Anomaly
export interface AnomalyResult {
  total_records: number;
  anomaly_count: number;
  anomaly_rate: number;
  severity_summary: { critical: number; high: number; medium: number; low: number };
  anomalies: Array<{
    row_index: number;
    anomaly_score: number;
    severity: "critical" | "high" | "medium" | "low";
    affected_columns: string[];
    values: Record<string, unknown>;
  }>;
  feature_importance: unknown[];
  algorithm: string;
}

// AI Insights
export interface InsightsResult {
  dataset_name: string;
  insights: {
    key_findings: string[];
    recommendations: string[];
    trends: string[];
    data_quality_analysis: string;
    executive_summary: string;
    risk_factors: string[];
    opportunities: string[];
  };
  generated_at: string;
  model_used: string;
  confidence_score: number;
}

// AI Query
export interface QueryResult {
  answer: string;
  data_references: string[];
  suggested_follow_ups: string[];
  confidence: number;
}

// Forecast
export interface ForecastResult {
  target_column: string;
  method: string;
  forecast: Array<{ period: number; value: number; lower_bound: number; upper_bound: number }>;
  historical_fit: Array<{ period: number; actual: number; fitted: number }>;
  accuracy_metrics: Record<string, number>;
  trend: "increasing" | "decreasing" | "stable" | "volatile";
  seasonality_detected: boolean;
}

// Health
export interface HealthResult {
  status: string;
  version: string;
  services: { analytics: string; ml_engine: string; ai_engine: string; forecasting: string };
  model: string;
}

// ─── API Functions ────────────────────────────────────────────────────────────

/** Check backend health */
export const checkHealth = () => apiGet<HealthResult>("/api/health");

// ── Analysis ─────────────────────────────────────────────────────────────────

/** Run full exploratory data analysis */
export const runEDA = (data: DataRow[]) =>
  apiPost<{ data: DataRow[] }, EDAResult>("/api/analyze/eda", { data });

/** Compute correlation matrix */
export const runCorrelations = (data: DataRow[]) =>
  apiPost<{ data: DataRow[] }, CorrelationResult>("/api/analyze/correlations", { data });

// ── ML ────────────────────────────────────────────────────────────────────────

/** Train a prediction model */
export const runPrediction = (
  data: DataRow[],
  target_column: string,
  feature_columns: string[],
  model_type: "auto" | "regression" | "classification" = "auto"
) =>
  apiPost<
    { data: DataRow[]; target_column: string; feature_columns: string[]; model_type: string },
    PredictionResult
  >("/api/ml/predict", { data, target_column, feature_columns, model_type });

/** Cluster data */
export const runClustering = (
  data: DataRow[],
  feature_columns: string[],
  algorithm: "kmeans" | "dbscan" = "kmeans",
  n_clusters?: number
) =>
  apiPost<
    { data: DataRow[]; feature_columns: string[]; algorithm: string; n_clusters?: number },
    ClusteringResult
  >("/api/ml/cluster", { data, feature_columns, algorithm, n_clusters });

/** Detect anomalies */
export const runAnomalyDetection = (
  data: DataRow[],
  feature_columns: string[],
  contamination = 0.1
) =>
  apiPost<
    { data: DataRow[]; feature_columns: string[]; contamination: number },
    AnomalyResult
  >("/api/ml/anomaly", { data, feature_columns, contamination });

// ── AI / LLM ──────────────────────────────────────────────────────────────────

/** Generate AI-powered dataset insights */
export const generateInsights = (
  data: DataRow[],
  columns: string[],
  dataset_name = "Dataset",
  focus_areas?: string[]
) =>
  apiPost<
    { data: DataRow[]; columns: string[]; dataset_name: string; focus_areas?: string[] },
    InsightsResult
  >("/api/ai/insights", { data, columns, dataset_name, focus_areas }, 90_000);

/** Natural language Q&A over data */
export const queryData = (
  data: DataRow[],
  question: string,
  columns: string[],
  conversation_history?: Array<{ role: string; content: string }>
) =>
  apiPost<
    {
      data: DataRow[];
      question: string;
      columns: string[];
      conversation_history?: Array<{ role: string; content: string }>;
    },
    QueryResult
  >("/api/ai/query", { data, question, columns, conversation_history }, 45_000);

/** Explain an ML analysis result */
export const explainAnalysis = (
  analysis_type: "clustering" | "prediction" | "anomaly" | "eda",
  analysis_result: Record<string, unknown>,
  data_context?: Record<string, unknown>
) =>
  apiPost<
    {
      analysis_type: string;
      analysis_result: Record<string, unknown>;
      data_context?: Record<string, unknown>;
    },
    { explanation: string; key_points: string[]; technical_notes: string }
  >("/api/ai/explain", { analysis_type, analysis_result, data_context }, 45_000);

/** Get analysis recommendations */
export const getRecommendations = (data: DataRow[], columns: string[], goal?: string) =>
  apiPost<
    { data: DataRow[]; columns: string[]; goal?: string },
    { recommendations: unknown[]; priority_actions: string[]; next_analysis_steps: string[] }
  >("/api/ai/recommendations", { data, columns, goal });

/** Get AI chart/visualization suggestions */
export const getVizSuggestions = (data: DataRow[]) =>
  apiPost<{ data: DataRow[] }, unknown>("/api/ai/visualizations", { data });

// ── Forecasting ───────────────────────────────────────────────────────────────

/** Forecast a single column */
export const forecastSingle = (
  data: DataRow[],
  target_column: string,
  periods = 10,
  method: "auto" | "linear" | "ema" | "seasonal" = "auto",
  date_column?: string
) =>
  apiPost<
    {
      data: DataRow[];
      target_column: string;
      periods: number;
      method: string;
      date_column?: string;
    },
    ForecastResult
  >("/api/forecast/single", { data, target_column, periods, method, date_column });

/** Forecast multiple columns */
export const forecastMulti = (
  data: DataRow[],
  columns: string[],
  periods = 10,
  method: "auto" | "linear" | "ema" | "seasonal" = "auto"
) =>
  apiPost<
    { data: DataRow[]; columns: string[]; periods: number; method: string },
    { forecasts: Record<string, ForecastResult> }
  >("/api/forecast/multi", { data, columns, periods, method });

// ─── Named export for legacy compatibility ─────────────────────────────────

export const analysisAPI = { runEDA, runCorrelations };
export const mlAPI = { runPrediction, runClustering, runAnomalyDetection };
export const aiAPI = {
  generateInsights,
  queryData,
  explainAnalysis,
  getRecommendations,
  getVizSuggestions,
};
export const forecastAPI = { forecastSingle, forecastMulti };
