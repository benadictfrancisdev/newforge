"""
Data Alchemy Studio — Custom AI Backend
────────────────────────────────────────────────────────────────
FastAPI application with 11 endpoints replacing Gemini/GPT.

All routes match the exact contracts expected by the frontend
(verified against backend_test.py and test_result.md).

Start: uvicorn main:app --reload --host 0.0.0.0 --port 8000
"""

import logging
import os
from datetime import datetime, timezone

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import ORJSONResponse

load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s — %(message)s",
)
logger = logging.getLogger("data_alchemy")

# ─── App ─────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="Data Alchemy AI Backend",
    description="Custom AI engine for Data Alchemy Studio — built on Llama 3.1 70B via Groq",
    version="2.0.0",
    default_response_class=ORJSONResponse,
)

# CORS — allow Vercel frontend + local dev
ALLOWED_ORIGINS = [
    "https://remix-of-data-alchemy-studio.vercel.app",
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost:8080",
    "*",  # Restrict this in production
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Import services ──────────────────────────────────────────────────────────

from core.ai_engine import ai_engine
from models.schemas import (
    AnomalyRequest,
    AnomalyResponse,
    ClusteringRequest,
    ClusteringResponse,
    CorrelationResponse,
    DataPayload,
    EDAResponse,
    ExplainRequest,
    ExplainResponse,
    ForecastRequest,
    ForecastResponse,
    HealthResponse,
    InsightsRequest,
    InsightsResponse,
    MultiForecastRequest,
    MultiForecastResponse,
    PredictionRequest,
    PredictionResponse,
    QueryRequest,
    QueryResponse,
    RecommendationsRequest,
    RecommendationsResponse,
    ServiceStatus,
)
from services import (
    ai_insights_service,
    data_analysis_service,
    forecasting_service,
    ml_models_service,
)


# ─── Health ───────────────────────────────────────────────────────────────────

@app.get("/api/health", response_model=HealthResponse, tags=["System"])
async def health_check():
    """System health check — verifies all service layers are operational."""
    return {
        "status": "healthy",
        "version": "2.0.0",
        "services": {
            "analytics": "healthy",
            "ml_engine": "healthy",
            "ai_engine": ai_engine.status,
            "forecasting": "healthy",
        },
        "model": f"Data-Alchemy-AI-v1 ({ai_engine.MODEL_PRIMARY} via Groq)",
    }


# ─── Analysis Endpoints ───────────────────────────────────────────────────────

@app.post("/api/analyze/eda", tags=["Analysis"])
async def run_eda(payload: DataPayload):
    """
    Exploratory Data Analysis.
    Returns: basic_info, column_info, numeric_stats, data_quality_score
    """
    try:
        result = data_analysis_service.perform_eda(payload.data)
        return result
    except Exception as e:
        logger.exception("EDA failed")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/analyze/correlations", tags=["Analysis"])
async def run_correlations(payload: DataPayload):
    """
    Pearson correlation matrix with top correlated pairs.
    Returns: columns, matrix, top_correlations, heatmap_data
    """
    try:
        result = data_analysis_service.calculate_correlations(payload.data)
        return result
    except Exception as e:
        logger.exception("Correlations failed")
        raise HTTPException(status_code=500, detail=str(e))


# ─── ML Endpoints ────────────────────────────────────────────────────────────

@app.post("/api/ml/predict", tags=["Machine Learning"])
async def ml_predict(payload: PredictionRequest):
    """
    Train Random Forest predictor (auto-detects regression vs classification).
    Returns: model_type, metrics, feature_importance, predictions_sample
    """
    try:
        result = ml_models_service.train_prediction_model(
            data=payload.data,
            target_column=payload.target_column,
            feature_columns=payload.feature_columns,
            model_type=payload.model_type,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.exception("ML prediction failed")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/ml/cluster", tags=["Machine Learning"])
async def ml_cluster(payload: ClusteringRequest):
    """
    K-means or DBSCAN clustering with silhouette scoring.
    Returns: n_clusters, metrics, cluster_stats, scatter_data
    """
    try:
        result = ml_models_service.perform_clustering(
            data=payload.data,
            feature_columns=payload.feature_columns,
            algorithm=payload.algorithm,
            n_clusters=payload.n_clusters,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.exception("Clustering failed")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/ml/anomaly", tags=["Machine Learning"])
async def ml_anomaly(payload: AnomalyRequest):
    """
    Isolation Forest anomaly detection with severity classification.
    Returns: anomaly_count, severity_summary, anomalies list
    """
    try:
        result = ml_models_service.detect_anomalies(
            data=payload.data,
            feature_columns=payload.feature_columns,
            contamination=payload.contamination,
            algorithm=payload.algorithm,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.exception("Anomaly detection failed")
        raise HTTPException(status_code=500, detail=str(e))


# ─── AI / LLM Endpoints ───────────────────────────────────────────────────────

@app.post("/api/ai/insights", tags=["AI"])
async def ai_insights(payload: InsightsRequest):
    """
    Generate AI-powered dataset insights using Llama 3.1 70B.
    Returns: insights (key_findings, recommendations, trends, executive_summary)
    """
    try:
        result = await ai_insights_service.generate_dataset_insights(
            data=payload.data,
            columns=payload.columns,
            dataset_name=payload.dataset_name,
            focus_areas=payload.focus_areas,
        )
        return result
    except Exception as e:
        logger.exception("AI insights failed")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/ai/query", tags=["AI"])
async def ai_query(payload: QueryRequest):
    """
    Natural language Q&A over the dataset (NLP Engine).
    Returns: answer, suggested_follow_ups, confidence
    """
    try:
        result = await ai_insights_service.answer_data_query(
            data=payload.data,
            question=payload.question,
            columns=payload.columns,
            conversation_history=payload.conversation_history,
        )
        return result
    except Exception as e:
        logger.exception("AI query failed")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/ai/explain", tags=["AI"])
async def ai_explain(payload: ExplainRequest):
    """
    Explain ML analysis results in plain English.
    Returns: explanation, key_points, technical_notes
    """
    try:
        result = await ai_insights_service.explain_ml_result(
            analysis_type=payload.analysis_type,
            analysis_result=payload.analysis_result,
            data_context=payload.data_context,
        )
        return result
    except Exception as e:
        logger.exception("AI explain failed")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/ai/recommendations", tags=["AI"])
async def ai_recommendations(payload: RecommendationsRequest):
    """
    Recommend what analyses to run based on data structure.
    Returns: recommendations, priority_actions, next_analysis_steps
    """
    try:
        result = await ai_insights_service.get_analysis_recommendations(
            data=payload.data,
            columns=payload.columns,
            goal=payload.goal,
        )
        return result
    except Exception as e:
        logger.exception("AI recommendations failed")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/ai/visualizations", tags=["AI"])
async def ai_visualizations(payload: DataPayload):
    """
    AI-powered chart/visualization suggestions.
    Returns: suggestions (chart_type, x_column, y_column, rationale)
    """
    try:
        import pandas as pd
        df = pd.DataFrame(payload.data)
        columns = list(df.columns)
        result = await ai_insights_service.get_viz_suggestions(
            data=payload.data,
            columns=columns,
        )
        return result
    except Exception as e:
        logger.exception("AI visualization suggestions failed")
        raise HTTPException(status_code=500, detail=str(e))


# ─── Forecasting Endpoints ────────────────────────────────────────────────────

@app.post("/api/forecast/single", tags=["Forecasting"])
async def forecast_single(payload: ForecastRequest):
    """
    Forecast a single numeric column forward N periods.
    Returns: forecast, historical_fit, accuracy_metrics, trend
    """
    try:
        result = forecasting_service.forecast_single_column(
            data=payload.data,
            target_column=payload.target_column,
            date_column=payload.date_column,
            periods=payload.periods,
            method=payload.method,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.exception("Forecasting failed")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/forecast/multi", tags=["Forecasting"])
async def forecast_multi(payload: MultiForecastRequest):
    """
    Forecast multiple numeric columns simultaneously.
    Returns: forecasts dict keyed by column name
    """
    try:
        result = forecasting_service.forecast_multiple_columns(
            data=payload.data,
            columns=payload.columns,
            periods=payload.periods,
            method=payload.method,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.exception("Multi-forecasting failed")
        raise HTTPException(status_code=500, detail=str(e))


# ─── Services package init ────────────────────────────────────────────────────

# Make services importable from "services.*"
import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent))
