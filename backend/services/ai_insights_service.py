"""
AI Insights Service
─────────────────────────────────────────────────────
Wraps core/ai_engine.py and provides high-level async
functions consumed by FastAPI route handlers.

This is the single layer that calls your LLM — making it
trivial to swap models or providers in the future.
"""

import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from core.ai_engine import ai_engine
from services.data_analysis_service import build_stats_summary

logger = logging.getLogger(__name__)


async def generate_dataset_insights(
    data: List[Dict[str, Any]],
    columns: List[str],
    dataset_name: str = "Dataset",
    focus_areas: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """
    Generate comprehensive AI-powered insights for an uploaded dataset.
    Called by: POST /api/ai/insights
    """
    stats_summary = build_stats_summary(data)

    insights_content = await ai_engine.generate_insights(
        dataset_name=dataset_name,
        columns=columns,
        stats_summary=stats_summary,
        total_rows=len(data),
        focus_areas=focus_areas,
    )

    return {
        "dataset_name": dataset_name,
        "insights": insights_content,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "model_used": ai_engine.VERSION,
        "confidence_score": 0.92,
    }


async def answer_data_query(
    data: List[Dict[str, Any]],
    question: str,
    columns: List[str],
    conversation_history: Optional[List[Dict[str, str]]] = None,
    dataset_name: str = "Dataset",
) -> Dict[str, Any]:
    """
    Answer a natural language question about the data.
    Called by: POST /api/ai/query
    """
    import pandas as pd

    # Build sample data string (first 5 rows as JSON)
    sample = data[:5]
    sample_str = json.dumps(sample, default=str)[:800]  # Cap at 800 chars

    stats_summary = build_stats_summary(data, max_len=800)

    result = await ai_engine.answer_query(
        question=question,
        columns=columns,
        sample_data=sample_str,
        stats_summary=stats_summary,
        dataset_name=dataset_name,
        history=conversation_history,
    )

    return {
        "answer": result["answer"],
        "data_references": result.get("data_references", []),
        "suggested_follow_ups": result.get("suggested_follow_ups", []),
        "confidence": result.get("confidence", 0.9),
    }


async def explain_ml_result(
    analysis_type: str,
    analysis_result: Dict[str, Any],
    data_context: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Explain a clustering/prediction/anomaly/eda result in plain English.
    Called by: POST /api/ai/explain
    """
    result = await ai_engine.explain_analysis(
        analysis_type=analysis_type,
        result=analysis_result,
        context=data_context,
    )

    return {
        "explanation": result["explanation"],
        "key_points": result.get("key_points", []),
        "technical_notes": result.get("technical_notes", ""),
    }


async def get_analysis_recommendations(
    data: List[Dict[str, Any]],
    columns: List[str],
    goal: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Suggest what analyses to run next based on data characteristics.
    Called by: POST /api/ai/recommendations
    """
    import pandas as pd

    df = pd.DataFrame(data)
    for col in df.columns:
        df[col] = pd.to_numeric(df[col], errors="ignore")

    dtypes = {col: str(df[col].dtype) for col in df.columns}
    stats = build_stats_summary(data, max_len=600)

    result = await ai_engine.generate_recommendations(
        columns=columns,
        dtypes=dtypes,
        stats=stats,
        goal=goal,
    )

    return result


async def get_viz_suggestions(
    data: List[Dict[str, Any]],
    columns: List[str],
) -> Dict[str, Any]:
    """
    Suggest the best visualizations for this dataset.
    Called by: POST /api/ai/visualizations
    """
    import pandas as pd
    from models.prompts import DATA_ALCHEMY_SYSTEM, VIZ_SUGGESTIONS_PROMPT

    df = pd.DataFrame(data)
    for col in df.columns:
        df[col] = pd.to_numeric(df[col], errors="ignore")

    numeric_cols = df.select_dtypes(include=["number"]).columns.tolist()
    categorical_cols = df.select_dtypes(exclude=["number"]).columns.tolist()
    dtypes = {col: str(df[col].dtype) for col in df.columns}

    prompt = VIZ_SUGGESTIONS_PROMPT.format(
        columns=", ".join(columns),
        dtypes=json.dumps(dtypes),
        numeric_cols=numeric_cols,
        categorical_cols=categorical_cols,
        total_rows=len(data),
    )

    raw = await ai_engine.complete(
        DATA_ALCHEMY_SYSTEM,
        prompt,
        temperature=0.4,
        max_tokens=1200,
        expect_json=True,
    )

    return ai_engine._parse_json_response(raw, {
        "suggestions": [],
        "dashboard_layout": "Grid layout with KPI cards on top and charts below",
        "key_metrics_to_highlight": columns[:3],
    })
