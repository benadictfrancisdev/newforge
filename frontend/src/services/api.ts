/**
 * Backend API Service for Data Analysis
 * Connects frontend to the enhanced ML and AI backend services
 */

const API_BASE_URL = import.meta.env.REACT_APP_BACKEND_URL || '';

interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

async function apiRequest<T>(
  endpoint: string,
  method: string = 'GET',
  body?: unknown
): Promise<APIResponse<T>> {
  try {
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.detail || `HTTP error ${response.status}`,
      };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error('API request error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

// ============== Analysis API ==============

export interface EDAResult {
  success: boolean;
  basic_info: {
    total_rows: number;
    total_columns: number;
    columns: string[];
    memory_usage: number;
    duplicate_rows: number;
  };
  column_info: Array<{
    name: string;
    type: string;
    missing_count: number;
    missing_pct: number;
    unique_count: number;
    unique_pct: number;
  }>;
  numeric_stats: Array<{
    column: string;
    mean: number;
    median: number;
    std: number;
    min: number;
    max: number;
    q1: number;
    q3: number;
    skewness: number;
    kurtosis: number;
  }>;
  categorical_stats: Array<{
    column: string;
    top_values: Array<{ value: string; count: number; pct: number }>;
  }>;
  numeric_columns: string[];
  categorical_columns: string[];
  data_quality_score: number;
}

export interface CorrelationResult {
  success: boolean;
  columns: string[];
  matrix: number[][];
  top_correlations: Array<{
    column1: string;
    column2: string;
    correlation: number;
    strength: string;
    direction: string;
  }>;
  strong_correlations: Array<{
    column1: string;
    column2: string;
    correlation: number;
  }>;
}

export interface OutlierResult {
  success: boolean;
  method: string;
  total_outliers: number;
  total_outlier_pct: number;
  outliers_by_column: Array<{
    column: string;
    outlier_count: number;
    outlier_pct: number;
    lower_bound: number;
    upper_bound: number;
    outlier_indices: number[];
    outlier_values: number[];
  }>;
  all_outlier_rows: number[];
}

export interface DistributionResult {
  success: boolean;
  column: string;
  statistics: {
    count: number;
    mean: number;
    median: number;
    mode: number | null;
    std: number;
    variance: number;
    min: number;
    max: number;
    range: number;
    skewness: number;
    kurtosis: number;
  };
  percentiles: {
    p5: number;
    p25: number;
    p50: number;
    p75: number;
    p95: number;
  };
  normality: {
    shapiro_p_value: number | null;
    is_normal: boolean | null;
    distribution_type: string;
  };
  histogram: Array<{ bin_start: number; bin_end: number; count: number }>;
}

export const analysisAPI = {
  performEDA: async (data: Record<string, unknown>[]): Promise<APIResponse<EDAResult>> => {
    return apiRequest<EDAResult>('/api/analyze/eda', 'POST', { data });
  },

  calculateCorrelations: async (
    data: Record<string, unknown>[],
    columns?: string[]
  ): Promise<APIResponse<CorrelationResult>> => {
    return apiRequest<CorrelationResult>('/api/analyze/correlations', 'POST', { data, columns });
  },

  detectOutliers: async (
    data: Record<string, unknown>[],
    columns?: string[],
    method: string = 'iqr'
  ): Promise<APIResponse<OutlierResult>> => {
    return apiRequest<OutlierResult>('/api/analyze/outliers', 'POST', { data, columns, method });
  },

  analyzeDistribution: async (
    data: Record<string, unknown>[],
    column: string
  ): Promise<APIResponse<DistributionResult>> => {
    return apiRequest<DistributionResult>('/api/analyze/distribution', 'POST', { data, column });
  },
};

// ============== ML API ==============

export interface PredictionResult {
  success: boolean;
  model_type: 'classification' | 'regression';
  target_column: string;
  feature_columns: string[];
  metrics: {
    accuracy?: number;
    precision?: number;
    recall?: number;
    f1_score?: number;
    cv_accuracy?: number;
    r2_score?: number;
    mse?: number;
    rmse?: number;
    mae?: number;
    cv_r2?: number;
    cv_std?: number;
  };
  feature_importance: Array<{ feature: string; importance: number }>;
  sample_predictions: Array<{ actual: unknown; predicted: unknown }>;
  classes?: string[];
  training_samples: number;
  test_samples: number;
}

export interface ClusteringResult {
  success: boolean;
  algorithm: string;
  n_clusters: number;
  feature_columns: string[];
  metrics: {
    silhouette_score: number;
    calinski_harabasz_score: number;
  };
  cluster_stats: Array<{
    cluster_id: number;
    size: number;
    percentage: number;
    centroid: Record<string, number>;
  }>;
  scatter_data: Array<{ x: number; y: number; cluster: number }>;
  x_axis: string;
  y_axis: string;
  labels: number[];
}

export interface AnomalyResult {
  success: boolean;
  total_records: number;
  anomaly_count: number;
  anomaly_rate: number;
  normal_count: number;
  feature_columns: string[];
  contamination: number;
  severity_summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  anomalies: Array<{
    index: number;
    anomaly_score: number;
    severity: 'critical' | 'high' | 'medium' | 'low';
    affected_columns: Array<{ column: string; value: number; z_score: number }>;
    row_data: Record<string, number>;
  }>;
  scores: number[];
}

export const mlAPI = {
  trainPredictionModel: async (
    data: Record<string, unknown>[],
    targetColumn: string,
    featureColumns?: string[],
    modelType: string = 'auto'
  ): Promise<APIResponse<PredictionResult>> => {
    return apiRequest<PredictionResult>('/api/ml/predict', 'POST', {
      data,
      target_column: targetColumn,
      feature_columns: featureColumns,
      model_type: modelType,
    });
  },

  performClustering: async (
    data: Record<string, unknown>[],
    featureColumns?: string[],
    nClusters?: number,
    algorithm: string = 'kmeans'
  ): Promise<APIResponse<ClusteringResult>> => {
    return apiRequest<ClusteringResult>('/api/ml/cluster', 'POST', {
      data,
      feature_columns: featureColumns,
      n_clusters: nClusters,
      algorithm,
    });
  },

  detectAnomalies: async (
    data: Record<string, unknown>[],
    featureColumns?: string[],
    contamination: number = 0.1
  ): Promise<APIResponse<AnomalyResult>> => {
    return apiRequest<AnomalyResult>('/api/ml/anomaly', 'POST', {
      data,
      feature_columns: featureColumns,
      contamination,
    });
  },
};

// ============== AI API ==============

export interface InsightsResult {
  success: boolean;
  dataset_name: string;
  insights: {
    key_findings?: string[];
    trends?: string[];
    anomalies?: string;
    recommendations?: string[];
    data_quality_issues?: string[];
    next_steps?: string[];
    raw_insights?: string;
  };
  summary: string;
}

export interface QueryResult {
  success: boolean;
  query: string;
  answer: string;
  suggested_charts: Array<{ type: string; suggested: boolean }>;
  confidence: number;
}

export interface ExplainResult {
  success: boolean;
  analysis_type: string;
  explanation: string;
}

export interface RecommendationsResult {
  success: boolean;
  recommendations: {
    immediate_actions?: string[];
    short_term?: string[];
    long_term?: string[];
    metrics_to_track?: string[];
    recommendations?: string;
  };
}

export const aiAPI = {
  generateInsights: async (
    data: Record<string, unknown>[],
    columns: string[],
    datasetName: string = 'Dataset',
    focusAreas?: string[]
  ): Promise<APIResponse<InsightsResult>> => {
    return apiRequest<InsightsResult>('/api/ai/insights', 'POST', {
      data,
      columns,
      dataset_name: datasetName,
      focus_areas: focusAreas,
    });
  },

  answerQuery: async (
    data: Record<string, unknown>[],
    columns: string[],
    query: string,
    conversationHistory?: Array<{ role: string; content: string }>
  ): Promise<APIResponse<QueryResult>> => {
    return apiRequest<QueryResult>('/api/ai/query', 'POST', {
      data,
      columns,
      query,
      conversation_history: conversationHistory,
    });
  },

  explainAnalysis: async (
    analysisType: string,
    analysisResults: Record<string, unknown>,
    dataContext: string = ''
  ): Promise<APIResponse<ExplainResult>> => {
    return apiRequest<ExplainResult>('/api/ai/explain', 'POST', {
      analysis_type: analysisType,
      analysis_results: analysisResults,
      data_context: dataContext,
    });
  },

  generateRecommendations: async (
    data: Record<string, unknown>[],
    columns: string[],
    analysisResults: Record<string, unknown>,
    businessContext: string = ''
  ): Promise<APIResponse<RecommendationsResult>> => {
    return apiRequest<RecommendationsResult>('/api/ai/recommendations', 'POST', {
      data,
      columns,
      analysis_results: analysisResults,
      business_context: businessContext,
    });
  },
};

// ============== Forecast API ==============

export interface ForecastResult {
  success: boolean;
  column: string;
  periods: number;
  model_info: {
    method: string;
    slope?: number;
    intercept?: number;
    r_squared?: number;
    seasonality_period?: number;
    alpha?: number;
    recent_trend?: number;
  };
  accuracy_metrics: {
    mape: number | null;
    rmse: number | null;
  };
  historical_data: Array<{ index: number; value: number; type: string }>;
  forecast_data: Array<{
    index: number;
    value: number;
    type: string;
    ci_lower: number;
    ci_upper: number;
  }>;
  summary: {
    current_value: number;
    forecasted_end_value: number;
    forecast_change_pct: number;
    trend_direction: string;
    seasonality_detected: boolean;
    seasonality_period: number | null;
  };
}

export interface MultiForecastResult {
  success: boolean;
  periods: number;
  forecasts: Array<{
    column: string;
    summary: ForecastResult['summary'];
    model_info: ForecastResult['model_info'];
    forecast_data: ForecastResult['forecast_data'];
  }>;
  columns_processed: number;
}

export const forecastAPI = {
  forecastSingle: async (
    data: Record<string, unknown>[],
    valueColumn: string,
    dateColumn?: string,
    periods: number = 10,
    method: string = 'auto'
  ): Promise<APIResponse<ForecastResult>> => {
    return apiRequest<ForecastResult>('/api/forecast/single', 'POST', {
      data,
      value_column: valueColumn,
      date_column: dateColumn,
      periods,
      method,
    });
  },

  forecastMultiple: async (
    data: Record<string, unknown>[],
    columns: string[],
    periods: number = 10
  ): Promise<APIResponse<MultiForecastResult>> => {
    return apiRequest<MultiForecastResult>('/api/forecast/multi', 'POST', {
      data,
      columns,
      periods,
    });
  },
};

// ============== Health Check ==============

export const healthAPI = {
  check: async (): Promise<APIResponse<{ status: string; services: Record<string, string> }>> => {
    return apiRequest('/api/health');
  },
};

// Default export
export default {
  analysis: analysisAPI,
  ml: mlAPI,
  ai: aiAPI,
  forecast: forecastAPI,
  health: healthAPI,
};
