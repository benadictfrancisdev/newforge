"""
ML Models Service
─────────────────────────────────────────────────────
Server-side ML using scikit-learn.
Prediction (Random Forest), Clustering (K-means/DBSCAN),
Anomaly Detection (Isolation Forest).

All numpy types are converted to native Python before returning
to avoid JSON serialization errors.
"""

import logging
from typing import Any, Dict, List, Optional

import numpy as np
import pandas as pd
from sklearn.cluster import DBSCAN, KMeans
from sklearn.ensemble import IsolationForest, RandomForestClassifier, RandomForestRegressor
from sklearn.metrics import (
    accuracy_score, f1_score, mean_absolute_error,
    mean_squared_error, precision_score, r2_score, recall_score,
    silhouette_score, davies_bouldin_score, calinski_harabasz_score,
)
from sklearn.model_selection import cross_val_score, train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler

logger = logging.getLogger(__name__)


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _to_df(data: List[Dict[str, Any]]) -> pd.DataFrame:
    df = pd.DataFrame(data)
    for col in df.columns:
        try:
            converted = pd.to_numeric(df[col], errors="coerce")
            if converted.notna().sum() >= len(df) * 0.5:
                df[col] = converted
        except Exception:
            pass
    return df


def _safe(v) -> Any:
    """Convert numpy scalar to native Python type."""
    if isinstance(v, (np.integer,)):
        return int(v)
    if isinstance(v, (np.floating,)):
        f = float(v)
        return None if np.isnan(f) or np.isinf(f) else round(f, 6)
    if isinstance(v, (np.ndarray,)):
        return v.tolist()
    return v


# ─── Prediction ──────────────────────────────────────────────────────────────

def train_prediction_model(
    data: List[Dict[str, Any]],
    target_column: str,
    feature_columns: List[str],
    model_type: str = "auto",
) -> Dict[str, Any]:
    """
    Train a Random Forest model (classifier or regressor).
    Auto-detects task type from target column cardinality.
    """
    df = _to_df(data)

    # Validate columns exist
    missing = [c for c in feature_columns + [target_column] if c not in df.columns]
    if missing:
        raise ValueError(f"Columns not found in data: {missing}")

    X = df[feature_columns].copy()
    y = df[target_column].copy()

    # Encode categorical features
    encoders: Dict[str, LabelEncoder] = {}
    for col in X.select_dtypes(exclude=[np.number]).columns:
        le = LabelEncoder()
        X[col] = le.fit_transform(X[col].astype(str))
        encoders[col] = le

    X = X.fillna(X.mean(numeric_only=True))

    # Auto-detect task type
    if model_type == "auto":
        unique_targets = y.nunique()
        is_numeric_target = pd.api.types.is_numeric_dtype(y)
        resolved_type = "regression" if (is_numeric_target and unique_targets > 10) else "classification"
    else:
        resolved_type = model_type

    # Encode target for classification
    target_encoder = None
    if resolved_type == "classification" and not pd.api.types.is_numeric_dtype(y):
        target_encoder = LabelEncoder()
        y = target_encoder.fit_transform(y.astype(str))

    y = pd.to_numeric(y, errors="coerce").fillna(0)

    X_arr = X.values
    y_arr = y.values

    X_train, X_test, y_train, y_test = train_test_split(X_arr, y_arr, test_size=0.2, random_state=42)

    # Train model
    if resolved_type == "regression":
        model = RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1)
        model.fit(X_train, y_train)
        y_pred = model.predict(X_test)

        r2 = _safe(r2_score(y_test, y_pred))
        mse = _safe(mean_squared_error(y_test, y_pred))
        mae = _safe(mean_absolute_error(y_test, y_pred))
        rmse = _safe(np.sqrt(float(mse)) if mse else None)

        metrics = {
            "r2_score": r2,
            "mse": mse,
            "mae": mae,
            "rmse": rmse,
        }

        cv_scores = cross_val_score(model, X_arr, y_arr, cv=min(5, len(X_arr)), scoring="r2")
        cross_val = _safe(cv_scores.mean())

    else:
        model = RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1)
        model.fit(X_train, y_train)
        y_pred = model.predict(X_test)

        avg = "weighted"
        acc = _safe(accuracy_score(y_test, y_pred))
        prec = _safe(precision_score(y_test, y_pred, average=avg, zero_division=0))
        rec = _safe(recall_score(y_test, y_pred, average=avg, zero_division=0))
        f1 = _safe(f1_score(y_test, y_pred, average=avg, zero_division=0))

        metrics = {
            "accuracy": acc,
            "precision": prec,
            "recall": rec,
            "f1_score": f1,
        }

        cv_scores = cross_val_score(model, X_arr, y_arr, cv=min(5, len(X_arr)), scoring="accuracy")
        cross_val = _safe(cv_scores.mean())

    # Feature importance
    importances = model.feature_importances_
    feature_importance = sorted(
        [
            {
                "feature": col,
                "importance": round(float(imp), 6),
                "rank": rank + 1,
            }
            for rank, (col, imp) in enumerate(
                sorted(zip(feature_columns, importances), key=lambda x: x[1], reverse=True)
            )
        ],
        key=lambda x: x["rank"],
    )

    # Sample predictions
    sample_preds = []
    for i in range(min(5, len(X_test))):
        pred_val = float(y_pred[i])
        actual_val = float(y_test[i])
        sample_preds.append({
            "index": i,
            "actual": round(actual_val, 4),
            "predicted": round(pred_val, 4),
            "error": round(abs(pred_val - actual_val), 4),
        })

    return {
        "model_type": resolved_type,
        "target_column": target_column,
        "feature_columns": feature_columns,
        "metrics": metrics,
        "feature_importance": feature_importance,
        "predictions_sample": sample_preds,
        "model_summary": f"Random Forest {resolved_type} with {100} estimators. Trained on {len(X_train)} samples, tested on {len(X_test)} samples.",
        "cross_val_score": cross_val,
    }


# ─── Clustering ──────────────────────────────────────────────────────────────

def perform_clustering(
    data: List[Dict[str, Any]],
    feature_columns: List[str],
    algorithm: str = "kmeans",
    n_clusters: Optional[int] = None,
) -> Dict[str, Any]:
    """
    K-means or DBSCAN clustering with full metrics and scatter data.
    """
    df = _to_df(data)

    X = df[feature_columns].select_dtypes(include=[np.number]).fillna(0)
    used_features = list(X.columns)

    if len(used_features) < 2:
        raise ValueError("Need at least 2 numeric feature columns for clustering.")

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X.values)

    labels: np.ndarray

    if algorithm.lower() == "dbscan":
        model = DBSCAN(eps=0.5, min_samples=max(2, len(X) // 10))
        labels = model.fit_predict(X_scaled)
        n_found = int(len(set(labels)) - (1 if -1 in labels else 0))
    else:
        # Auto-select k using elbow heuristic if not provided
        if n_clusters is None:
            n_clusters = _optimal_k(X_scaled, max_k=min(8, len(X) // 2))
        k = max(2, min(n_clusters, len(X) - 1))
        model = KMeans(n_clusters=k, random_state=42, n_init=10)
        labels = model.fit_predict(X_scaled)
        n_found = k

    # ── Metrics ────────────────────────────────
    unique_labels = set(labels)
    valid_labels = labels[labels >= 0] if -1 in unique_labels else labels

    sil_score = None
    dbi = None
    chi = None
    inertia = None

    if len(set(valid_labels)) > 1 and len(valid_labels) > 1:
        X_valid = X_scaled[labels >= 0] if -1 in unique_labels else X_scaled
        try:
            sil_score = round(float(silhouette_score(X_valid, valid_labels)), 4)
            dbi = round(float(davies_bouldin_score(X_valid, valid_labels)), 4)
            chi = round(float(calinski_harabasz_score(X_valid, valid_labels)), 4)
        except Exception:
            pass

    if algorithm.lower() == "kmeans" and hasattr(model, "inertia_"):
        inertia = round(float(model.inertia_), 4)

    # ── Cluster Stats ──────────────────────────
    df_result = df.copy()
    df_result["_cluster"] = labels
    cluster_stats = []

    for cluster_id in sorted(set(labels)):
        cluster_df = df_result[df_result["_cluster"] == cluster_id]
        size = int(len(cluster_df))
        pct = round(size / len(df) * 100, 2)

        centroid = {}
        for col in used_features:
            centroid[col] = round(float(cluster_df[col].mean()), 4)

        label = f"Cluster {cluster_id}" if cluster_id >= 0 else "Noise"
        cluster_stats.append({
            "cluster_id": int(cluster_id),
            "size": size,
            "percentage": pct,
            "centroid": centroid,
            "label": label,
        })

    # ── Scatter Data (2D projection using first 2 features) ────────────────
    scatter_data = []
    for i, row in enumerate(X.values):
        scatter_data.append({
            "x": round(float(row[0]), 4),
            "y": round(float(row[1]), 4),
            "cluster": int(labels[i]),
            "index": i,
        })

    # ── Cluster Profiles ───────────────────────
    cluster_profiles = []
    for cs in cluster_stats:
        cid = cs["cluster_id"]
        if cid < 0:
            continue
        profile = {"cluster_id": cid, "label": cs["label"], "characteristics": []}
        for col in used_features:
            overall_mean = float(df[col].mean())
            cluster_mean = cs["centroid"].get(col, overall_mean)
            delta = cluster_mean - overall_mean
            direction = "above" if delta > 0 else "below"
            profile["characteristics"].append({
                "feature": col,
                "cluster_mean": cluster_mean,
                "overall_mean": round(overall_mean, 4),
                "deviation": round(abs(delta), 4),
                "direction": direction,
            })
        cluster_profiles.append(profile)

    return {
        "algorithm": algorithm,
        "n_clusters": n_found,
        "metrics": {
            "silhouette_score": sil_score,
            "inertia": inertia,
            "davies_bouldin": dbi,
            "calinski_harabasz": chi,
        },
        "cluster_stats": cluster_stats,
        "scatter_data": scatter_data,
        "feature_columns": used_features,
        "cluster_profiles": cluster_profiles,
    }


# ─── Anomaly Detection ────────────────────────────────────────────────────────

def detect_anomalies(
    data: List[Dict[str, Any]],
    feature_columns: List[str],
    contamination: float = 0.1,
    algorithm: str = "isolation_forest",
) -> Dict[str, Any]:
    """
    Isolation Forest anomaly detection with severity classification.
    """
    df = _to_df(data)

    X = df[feature_columns].select_dtypes(include=[np.number]).fillna(0)
    used_features = list(X.columns)

    if len(used_features) == 0:
        raise ValueError("No numeric feature columns found for anomaly detection.")

    contamination = max(0.01, min(contamination, 0.5))

    model = IsolationForest(
        contamination=contamination,
        random_state=42,
        n_estimators=100,
        n_jobs=-1,
    )
    predictions = model.fit_predict(X.values)  # -1=anomaly, 1=normal
    scores = model.score_samples(X.values)     # more negative = more anomalous

    # Normalize scores to 0-1 (0=normal, 1=most anomalous)
    score_min, score_max = scores.min(), scores.max()
    norm_scores = 1 - ((scores - score_min) / (score_max - score_min + 1e-9))

    anomaly_indices = np.where(predictions == -1)[0]
    anomaly_count = int(len(anomaly_indices))
    total_records = int(len(df))
    anomaly_rate = round(anomaly_count / total_records * 100, 2)

    # Severity thresholds based on normalized score
    severity_summary = {"critical": 0, "high": 0, "medium": 0, "low": 0}
    anomalies = []

    for idx in anomaly_indices:
        score = float(norm_scores[idx])
        if score >= 0.85:
            sev = "critical"
        elif score >= 0.70:
            sev = "high"
        elif score >= 0.55:
            sev = "medium"
        else:
            sev = "low"

        severity_summary[sev] += 1

        # Find which features deviate most
        row = X.values[idx]
        col_means = X.values.mean(axis=0)
        col_stds = X.values.std(axis=0) + 1e-9
        z_scores = np.abs((row - col_means) / col_stds)
        affected = [used_features[i] for i in np.argsort(z_scores)[::-1][:3]]

        values = {col: _safe(df.iloc[idx][col]) for col in df.columns}

        anomalies.append({
            "row_index": int(idx),
            "anomaly_score": round(score, 4),
            "severity": sev,
            "affected_columns": affected,
            "values": values,
        })

    # Sort by severity then score
    sev_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    anomalies.sort(key=lambda x: (sev_order[x["severity"]], -x["anomaly_score"]))

    # Feature importance for anomaly detection (based on variance contribution)
    feature_importance = []
    for i, col in enumerate(used_features):
        col_data = X[col].values
        col_std = float(col_data.std())
        anomaly_vals = col_data[anomaly_indices] if len(anomaly_indices) > 0 else col_data
        normal_vals = col_data[predictions == 1]
        deviation = abs(float(anomaly_vals.mean()) - float(normal_vals.mean())) if len(anomaly_vals) > 0 and len(normal_vals) > 0 else 0
        feature_importance.append({
            "feature": col,
            "std": round(col_std, 4),
            "mean_deviation_anomalies": round(deviation, 4),
            "importance_rank": i + 1,
        })
    feature_importance.sort(key=lambda x: x["mean_deviation_anomalies"], reverse=True)

    return {
        "total_records": total_records,
        "anomaly_count": anomaly_count,
        "anomaly_rate": anomaly_rate,
        "severity_summary": severity_summary,
        "anomalies": anomalies,
        "feature_importance": feature_importance,
        "algorithm": algorithm,
    }


# ─── Internal Helpers ─────────────────────────────────────────────────────────

def _optimal_k(X: np.ndarray, max_k: int = 8) -> int:
    """Elbow method to find optimal K for K-means."""
    if len(X) < 4:
        return 2
    inertias = []
    k_range = range(2, min(max_k + 1, len(X)))
    for k in k_range:
        km = KMeans(n_clusters=k, random_state=42, n_init=5)
        km.fit(X)
        inertias.append(km.inertia_)

    if len(inertias) < 2:
        return 2

    # Find elbow using second derivative
    diffs = np.diff(inertias)
    if len(diffs) < 2:
        return 3
    second_diffs = np.diff(diffs)
    elbow_idx = int(np.argmax(second_diffs)) + 2
    return max(2, min(elbow_idx + 2, max_k))
