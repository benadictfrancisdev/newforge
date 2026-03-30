"""
Data Analysis Service
─────────────────────────────────────────────────────
Performs EDA, correlations, outlier detection.
Pure Python/pandas — no external AI needed here.
"""

import json
import logging
from typing import Any, Dict, List, Optional

import numpy as np
import pandas as pd
from scipy import stats

logger = logging.getLogger(__name__)


def _df_from_data(data: List[Dict[str, Any]]) -> pd.DataFrame:
    df = pd.DataFrame(data)
    # Auto-coerce numeric-looking strings (pandas 2.x: errors="ignore" removed)
    for col in df.columns:
        try:
            converted = pd.to_numeric(df[col], errors="coerce")
            # Only apply if at least 50% of values converted successfully
            if converted.notna().sum() >= len(df) * 0.5:
                df[col] = converted
        except Exception:
            pass
    return df


def _safe_float(v) -> float:
    if v is None or (isinstance(v, float) and np.isnan(v)):
        return 0.0
    return float(v)


def perform_eda(data: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Full exploratory data analysis.
    Returns every field the frontend expects.
    """
    df = _df_from_data(data)
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    categorical_cols = df.select_dtypes(exclude=[np.number]).columns.tolist()
    
    # ── Basic Info ─────────────────────────────
    basic_info = {
        "total_rows": int(len(df)),
        "total_columns": int(len(df.columns)),
        "memory_usage_mb": round(df.memory_usage(deep=True).sum() / 1024 / 1024, 4),
        "duplicate_rows": int(df.duplicated().sum()),
    }
    
    # ── Column Info ────────────────────────────
    column_info = []
    for col in df.columns:
        null_count = int(df[col].isnull().sum())
        column_info.append({
            "name": col,
            "dtype": str(df[col].dtype),
            "non_null_count": int(len(df) - null_count),
            "null_count": null_count,
            "null_percentage": round(null_count / len(df) * 100, 2),
            "unique_values": int(df[col].nunique()),
            "sample_values": [
                v if not isinstance(v, (np.integer, np.floating)) else v.item()
                for v in df[col].dropna().head(5).tolist()
            ],
        })
    
    # ── Numeric Stats ──────────────────────────
    numeric_stats = []
    for col in numeric_cols:
        s = df[col].dropna()
        if len(s) == 0:
            continue
        skew = _safe_float(s.skew())
        kurt = _safe_float(s.kurtosis())
        numeric_stats.append({
            "column": col,
            "mean": round(_safe_float(s.mean()), 4),
            "median": round(_safe_float(s.median()), 4),
            "std": round(_safe_float(s.std()), 4),
            "min": round(_safe_float(s.min()), 4),
            "max": round(_safe_float(s.max()), 4),
            "q25": round(_safe_float(s.quantile(0.25)), 4),
            "q75": round(_safe_float(s.quantile(0.75)), 4),
            "skewness": round(skew, 4),
            "kurtosis": round(kurt, 4),
        })
    
    # ── Categorical Stats ──────────────────────
    categorical_stats = []
    for col in categorical_cols:
        vc = df[col].value_counts().head(10)
        categorical_stats.append({
            "column": col,
            "unique_count": int(df[col].nunique()),
            "top_values": [
                {"value": str(k), "count": int(v), "percentage": round(v / len(df) * 100, 2)}
                for k, v in vc.items()
            ],
            "mode": str(df[col].mode()[0]) if not df[col].mode().empty else None,
        })
    
    # ── Data Quality Score ─────────────────────
    completeness = 1 - (df.isnull().sum().sum() / (len(df) * len(df.columns)))
    no_duplicates = 1 - (df.duplicated().sum() / len(df))
    quality_score = round((completeness * 0.7 + no_duplicates * 0.3) * 100, 1)
    
    # ── Outlier Summary ────────────────────────
    outlier_summary = {}
    for col in numeric_cols:
        s = df[col].dropna()
        if len(s) > 3:
            z_scores = np.abs(stats.zscore(s))
            outlier_count = int((z_scores > 3).sum())
            iqr = float(s.quantile(0.75) - s.quantile(0.25))
            outlier_summary[col] = {
                "zscore_outliers": outlier_count,
                "iqr": round(iqr, 4),
            }
    
    return {
        "basic_info": basic_info,
        "column_info": column_info,
        "numeric_stats": numeric_stats,
        "categorical_stats": categorical_stats,
        "data_quality_score": quality_score,
        "outlier_summary": outlier_summary,
        "missing_value_patterns": _missing_patterns(df),
    }


def calculate_correlations(data: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Calculate Pearson correlation matrix with top correlations.
    """
    df = _df_from_data(data)
    numeric_df = df.select_dtypes(include=[np.number])
    
    if len(numeric_df.columns) < 2:
        return {
            "columns": list(numeric_df.columns),
            "matrix": {},
            "top_correlations": [],
            "heatmap_data": [],
        }
    
    corr_matrix = numeric_df.corr()
    
    # Build clean matrix dict
    matrix = {}
    for col in corr_matrix.columns:
        matrix[col] = {
            other: round(_safe_float(corr_matrix.loc[col, other]), 4)
            for other in corr_matrix.columns
        }
    
    # Top correlations (excluding self-correlations)
    top_corrs = []
    seen = set()
    for i, col1 in enumerate(corr_matrix.columns):
        for col2 in corr_matrix.columns[i+1:]:
            pair = tuple(sorted([col1, col2]))
            if pair in seen:
                continue
            seen.add(pair)
            val = _safe_float(corr_matrix.loc[col1, col2])
            if abs(val) > 0.05:  # Filter trivial correlations
                strength = "strong" if abs(val) >= 0.7 else "moderate" if abs(val) >= 0.4 else "weak"
                direction = "positive" if val >= 0 else "negative"
                top_corrs.append({
                    "column1": col1,
                    "column2": col2,
                    "correlation": round(val, 4),
                    "strength": strength,
                    "direction": direction,
                })
    
    top_corrs.sort(key=lambda x: abs(x["correlation"]), reverse=True)
    
    # Heatmap data for frontend charts
    heatmap_data = [
        {"x": col1, "y": col2, "value": round(_safe_float(corr_matrix.loc[col1, col2]), 4)}
        for col1 in corr_matrix.columns
        for col2 in corr_matrix.columns
    ]
    
    return {
        "columns": list(corr_matrix.columns),
        "matrix": matrix,
        "top_correlations": top_corrs[:20],
        "heatmap_data": heatmap_data,
    }


def build_stats_summary(data: List[Dict[str, Any]], max_len: int = 1500) -> str:
    """
    Build a compact stats summary string to pass to AI prompts.
    Keeps token usage low while maximizing information density.
    """
    df = _df_from_data(data)
    numeric_df = df.select_dtypes(include=[np.number])
    
    parts = []
    parts.append(f"Rows: {len(df)}, Columns: {len(df.columns)}")
    parts.append(f"Numeric columns: {list(numeric_df.columns)}")
    
    if not numeric_df.empty:
        desc = numeric_df.describe().round(2)
        parts.append("Stats:\n" + desc.to_string())
    
    cat_cols = df.select_dtypes(exclude=[np.number]).columns
    for col in cat_cols[:3]:  # Limit categorical to save tokens
        vc = df[col].value_counts().head(5)
        parts.append(f"{col} top values: {vc.to_dict()}")
    
    summary = "\n".join(parts)
    return summary[:max_len]


def _missing_patterns(df: pd.DataFrame) -> List[Dict[str, Any]]:
    """Detect missing value patterns."""
    patterns = []
    for col in df.columns:
        null_count = int(df[col].isnull().sum())
        if null_count > 0:
            patterns.append({
                "column": col,
                "missing_count": null_count,
                "missing_percentage": round(null_count / len(df) * 100, 2),
                "pattern": "random" if null_count < len(df) * 0.5 else "systematic",
            })
    return patterns
