"""
Pydantic schemas — exactly matching what the frontend expects.
Every response field is derived from test_result.md + backend_test.py contracts.
"""
from pydantic import BaseModel, Field
from typing import Any, Dict, List, Optional, Union


# ─────────────────────────────────────────────
# Shared input
# ─────────────────────────────────────────────

class DataPayload(BaseModel):
    data: List[Dict[str, Any]]


# ─────────────────────────────────────────────
# EDA
# ─────────────────────────────────────────────

class BasicInfo(BaseModel):
    total_rows: int
    total_columns: int
    memory_usage_mb: float
    duplicate_rows: int

class ColumnInfo(BaseModel):
    name: str
    dtype: str
    non_null_count: int
    null_count: int
    null_percentage: float
    unique_values: int
    sample_values: List[Any]

class NumericStat(BaseModel):
    column: str
    mean: float
    median: float
    std: float
    min: float
    max: float
    q25: float
    q75: float
    skewness: float
    kurtosis: float

class EDAResponse(BaseModel):
    basic_info: BasicInfo
    column_info: List[ColumnInfo]
    numeric_stats: List[NumericStat]
    categorical_stats: List[Dict[str, Any]] = []
    data_quality_score: float
    outlier_summary: Dict[str, Any] = {}
    missing_value_patterns: List[Dict[str, Any]] = []


# ─────────────────────────────────────────────
# Correlations
# ─────────────────────────────────────────────

class CorrelationEntry(BaseModel):
    column1: str
    column2: str
    correlation: float
    strength: str  # "strong", "moderate", "weak"
    direction: str  # "positive", "negative"

class CorrelationResponse(BaseModel):
    columns: List[str]
    matrix: Dict[str, Dict[str, float]]
    top_correlations: List[CorrelationEntry]
    heatmap_data: List[Dict[str, Any]] = []


# ─────────────────────────────────────────────
# ML — Prediction
# ─────────────────────────────────────────────

class PredictionRequest(BaseModel):
    data: List[Dict[str, Any]]
    target_column: str
    feature_columns: List[str]
    model_type: str = "auto"  # "auto", "regression", "classification"

class FeatureImportance(BaseModel):
    feature: str
    importance: float
    rank: int

class PredictionMetrics(BaseModel):
    # Regression
    r2_score: Optional[float] = None
    mse: Optional[float] = None
    mae: Optional[float] = None
    rmse: Optional[float] = None
    # Classification
    accuracy: Optional[float] = None
    precision: Optional[float] = None
    recall: Optional[float] = None
    f1_score: Optional[float] = None

class PredictionResponse(BaseModel):
    model_type: str
    target_column: str
    feature_columns: List[str]
    metrics: PredictionMetrics
    feature_importance: List[FeatureImportance]
    predictions_sample: List[Dict[str, Any]] = []
    model_summary: str = ""
    cross_val_score: Optional[float] = None


# ─────────────────────────────────────────────
# ML — Clustering
# ─────────────────────────────────────────────

class ClusteringRequest(BaseModel):
    data: List[Dict[str, Any]]
    feature_columns: List[str]
    algorithm: str = "kmeans"  # "kmeans", "dbscan"
    n_clusters: Optional[int] = None

class ClusterStat(BaseModel):
    cluster_id: int
    size: int
    percentage: float
    centroid: Dict[str, float]
    label: str

class ClusteringMetrics(BaseModel):
    silhouette_score: Optional[float] = None
    inertia: Optional[float] = None
    davies_bouldin: Optional[float] = None
    calinski_harabasz: Optional[float] = None

class ClusteringResponse(BaseModel):
    algorithm: str
    n_clusters: int
    metrics: ClusteringMetrics
    cluster_stats: List[ClusterStat]
    scatter_data: List[Dict[str, Any]]
    feature_columns: List[str]
    cluster_profiles: List[Dict[str, Any]] = []


# ─────────────────────────────────────────────
# ML — Anomaly Detection
# ─────────────────────────────────────────────

class AnomalyRequest(BaseModel):
    data: List[Dict[str, Any]]
    feature_columns: List[str]
    contamination: float = 0.1
    algorithm: str = "isolation_forest"

class AnomalyRecord(BaseModel):
    row_index: int
    anomaly_score: float
    severity: str  # "critical", "high", "medium", "low"
    affected_columns: List[str]
    values: Dict[str, Any]

class SeveritySummary(BaseModel):
    critical: int = 0
    high: int = 0
    medium: int = 0
    low: int = 0

class AnomalyResponse(BaseModel):
    total_records: int
    anomaly_count: int
    anomaly_rate: float
    severity_summary: SeveritySummary
    anomalies: List[AnomalyRecord]
    feature_importance: List[Dict[str, Any]] = []
    algorithm: str


# ─────────────────────────────────────────────
# AI Insights
# ─────────────────────────────────────────────

class InsightsRequest(BaseModel):
    data: List[Dict[str, Any]]
    columns: List[str]
    dataset_name: str = "Dataset"
    focus_areas: Optional[List[str]] = None

class InsightsContent(BaseModel):
    key_findings: List[str]
    recommendations: List[str]
    trends: List[str]
    data_quality_analysis: str
    executive_summary: str
    risk_factors: List[str] = []
    opportunities: List[str] = []

class InsightsResponse(BaseModel):
    dataset_name: str
    insights: InsightsContent
    generated_at: str
    model_used: str = "Data-Alchemy-AI-v1"
    confidence_score: float = 0.92


# ─────────────────────────────────────────────
# AI Query (NLP Engine)
# ─────────────────────────────────────────────

class QueryRequest(BaseModel):
    data: List[Dict[str, Any]]
    question: str
    columns: List[str]
    conversation_history: Optional[List[Dict[str, str]]] = None

class QueryResponse(BaseModel):
    answer: str
    data_references: List[str] = []
    suggested_follow_ups: List[str] = []
    confidence: float = 0.9


# ─────────────────────────────────────────────
# AI Explain
# ─────────────────────────────────────────────

class ExplainRequest(BaseModel):
    analysis_type: str  # "clustering", "prediction", "anomaly", "eda"
    analysis_result: Dict[str, Any]
    data_context: Optional[Dict[str, Any]] = None

class ExplainResponse(BaseModel):
    explanation: str
    key_points: List[str]
    technical_notes: str = ""


# ─────────────────────────────────────────────
# AI Recommendations
# ─────────────────────────────────────────────

class RecommendationsRequest(BaseModel):
    data: List[Dict[str, Any]]
    columns: List[str]
    goal: Optional[str] = None

class RecommendationsResponse(BaseModel):
    recommendations: List[Dict[str, Any]]
    priority_actions: List[str]
    next_analysis_steps: List[str]


# ─────────────────────────────────────────────
# Forecasting
# ─────────────────────────────────────────────

class ForecastRequest(BaseModel):
    data: List[Dict[str, Any]]
    target_column: str
    date_column: Optional[str] = None
    periods: int = 10
    method: str = "auto"  # "linear", "ema", "seasonal", "auto"

class ForecastPoint(BaseModel):
    period: int
    value: float
    lower_bound: float
    upper_bound: float

class ForecastResponse(BaseModel):
    target_column: str
    method: str
    forecast: List[ForecastPoint]
    historical_fit: List[Dict[str, Any]]
    accuracy_metrics: Dict[str, float]
    trend: str  # "increasing", "decreasing", "stable", "volatile"
    seasonality_detected: bool = False

class MultiForecastRequest(BaseModel):
    data: List[Dict[str, Any]]
    columns: List[str]
    periods: int = 10
    method: str = "auto"

class MultiForecastResponse(BaseModel):
    forecasts: Dict[str, ForecastResponse]
    correlation_forecast: Optional[Dict[str, Any]] = None


# ─────────────────────────────────────────────
# Health
# ─────────────────────────────────────────────

class ServiceStatus(BaseModel):
    analytics: str = "healthy"
    ml_engine: str = "healthy"
    ai_engine: str = "healthy"
    forecasting: str = "healthy"

class HealthResponse(BaseModel):
    status: str
    version: str = "2.0.0"
    services: ServiceStatus
    model: str = "Data-Alchemy-AI-v1 (Llama-3.1-70B)"
