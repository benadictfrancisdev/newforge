"""
Forecasting Service
─────────────────────────────────────────────────────
Supports linear, EMA, and seasonal decomposition methods.
Auto-detects the best method based on data characteristics.
Works on any numeric column — not just time series.
"""

import logging
from typing import Any, Dict, List, Optional

import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, mean_squared_error

logger = logging.getLogger(__name__)


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


def _safe_float(v) -> float:
    if v is None:
        return 0.0
    f = float(v)
    return 0.0 if (np.isnan(f) or np.isinf(f)) else f


def forecast_single_column(
    data: List[Dict[str, Any]],
    target_column: str,
    date_column: Optional[str] = None,
    periods: int = 10,
    method: str = "auto",
) -> Dict[str, Any]:
    """
    Forecast a single numeric column forward by `periods` steps.
    Supports: linear, ema, seasonal, auto.
    """
    df = _to_df(data)

    if target_column not in df.columns:
        raise ValueError(f"Column '{target_column}' not found in data.")

    series = pd.to_numeric(df[target_column], errors="coerce").dropna()
    n = len(series)

    if n < 3:
        raise ValueError(f"Need at least 3 data points for forecasting. Got {n}.")

    # Auto-select method
    if method == "auto":
        method = _select_best_method(series)

    # ── Forecast ────────────────────────────────
    if method == "linear":
        forecast_vals, fitted_vals, conf_interval = _linear_forecast(series, periods)
    elif method == "ema":
        forecast_vals, fitted_vals, conf_interval = _ema_forecast(series, periods)
    elif method == "seasonal":
        forecast_vals, fitted_vals, conf_interval = _seasonal_forecast(series, periods)
    else:
        forecast_vals, fitted_vals, conf_interval = _linear_forecast(series, periods)
        method = "linear"

    # ── Accuracy Metrics ────────────────────────
    # Compare last 20% of historical data against fitted values
    split = max(int(n * 0.8), n - 5)
    actual_test = series.values[split:]
    pred_test = fitted_vals[split:split + len(actual_test)]

    accuracy_metrics = {}
    if len(actual_test) > 0 and len(pred_test) > 0:
        min_len = min(len(actual_test), len(pred_test))
        mae = _safe_float(mean_absolute_error(actual_test[:min_len], pred_test[:min_len]))
        mse = _safe_float(mean_squared_error(actual_test[:min_len], pred_test[:min_len]))
        rmse = _safe_float(np.sqrt(mse))
        mean_actual = _safe_float(np.mean(actual_test))
        mape = _safe_float((mae / mean_actual) * 100) if mean_actual != 0 else 0.0
        accuracy_metrics = {
            "mae": round(mae, 4),
            "mse": round(mse, 4),
            "rmse": round(rmse, 4),
            "mape_percent": round(mape, 2),
        }

    # ── Trend Detection ─────────────────────────
    first_half_mean = series.values[:n // 2].mean()
    second_half_mean = series.values[n // 2:].mean()
    trend_pct = ((second_half_mean - first_half_mean) / (abs(first_half_mean) + 1e-9)) * 100
    if trend_pct > 5:
        trend = "increasing"
    elif trend_pct < -5:
        trend = "decreasing"
    elif series.values.std() > series.values.mean() * 0.3:
        trend = "volatile"
    else:
        trend = "stable"

    # ── Build Output ────────────────────────────
    forecast_points = []
    for i, (val, ci) in enumerate(zip(forecast_vals, conf_interval)):
        forecast_points.append({
            "period": i + 1,
            "value": round(_safe_float(val), 4),
            "lower_bound": round(_safe_float(val - ci), 4),
            "upper_bound": round(_safe_float(val + ci), 4),
        })

    historical_fit = [
        {
            "period": -(n - i),
            "actual": round(_safe_float(series.values[i]), 4),
            "fitted": round(_safe_float(fitted_vals[i]), 4),
        }
        for i in range(min(n, len(fitted_vals)))
    ]

    return {
        "target_column": target_column,
        "method": method,
        "forecast": forecast_points,
        "historical_fit": historical_fit,
        "accuracy_metrics": accuracy_metrics,
        "trend": trend,
        "seasonality_detected": method == "seasonal",
    }


def forecast_multiple_columns(
    data: List[Dict[str, Any]],
    columns: List[str],
    periods: int = 10,
    method: str = "auto",
) -> Dict[str, Any]:
    """
    Forecast multiple numeric columns simultaneously.
    """
    df = _to_df(data)
    valid_cols = [c for c in columns if c in df.columns and pd.api.types.is_numeric_dtype(df[c])]

    if not valid_cols:
        raise ValueError("No valid numeric columns found for forecasting.")

    forecasts: Dict[str, Any] = {}
    for col in valid_cols:
        try:
            result = forecast_single_column(data, col, periods=periods, method=method)
            forecasts[col] = result
        except Exception as e:
            logger.warning(f"Forecast failed for column '{col}': {e}")

    return {"forecasts": forecasts}


# ─── Forecasting Methods ──────────────────────────────────────────────────────

def _linear_forecast(series: pd.Series, periods: int):
    """Simple linear regression extrapolation."""
    n = len(series)
    x = np.arange(n).reshape(-1, 1)
    y = series.values

    model = LinearRegression()
    model.fit(x, y)
    fitted = model.predict(x)

    future_x = np.arange(n, n + periods).reshape(-1, 1)
    forecast = model.predict(future_x)

    # Confidence interval based on residual std
    residuals = y - fitted
    std_err = residuals.std()
    ci = np.array([std_err * (1 + 0.1 * i) for i in range(periods)])

    return forecast, fitted, ci


def _ema_forecast(series: pd.Series, periods: int, alpha: float = 0.3):
    """Exponential moving average forecast."""
    n = len(series)
    ema = series.ewm(alpha=alpha, adjust=False).mean()
    last_ema = ema.iloc[-1]
    slope = (ema.iloc[-1] - ema.iloc[max(0, -5)]) / min(5, n)

    forecast = np.array([last_ema + slope * (i + 1) for i in range(periods)])
    fitted = ema.values

    # CI grows with forecast horizon
    std = float(series.std())
    ci = np.array([std * (0.5 + 0.1 * i) for i in range(periods)])

    return forecast, fitted, ci


def _seasonal_forecast(series: pd.Series, periods: int):
    """
    Seasonal decomposition + linear trend forecast.
    Falls back to linear if series is too short for seasonal analysis.
    """
    n = len(series)
    # Need at least 2 full seasons
    season_len = _detect_seasonality(series)

    if season_len is None or n < season_len * 2:
        return _linear_forecast(series, periods)

    try:
        from statsmodels.tsa.seasonal import seasonal_decompose
        decomp = seasonal_decompose(series, model="additive", period=season_len, extrapolate_trend="freq")

        trend = decomp.trend.fillna(method="ffill").fillna(method="bfill")
        seasonal = decomp.seasonal

        # Forecast trend linearly
        x = np.arange(n).reshape(-1, 1)
        lr = LinearRegression()
        lr.fit(x, trend.values)
        future_x = np.arange(n, n + periods).reshape(-1, 1)
        trend_forecast = lr.predict(future_x)

        # Repeat seasonal pattern
        seasonal_vals = seasonal.values
        seasonal_forecast = np.array([seasonal_vals[i % season_len] for i in range(periods)])
        forecast = trend_forecast + seasonal_forecast
        fitted = (trend + seasonal).values

        std = float(decomp.resid.dropna().std())
        ci = np.array([std * (0.6 + 0.05 * i) for i in range(periods)])

        return forecast, fitted, ci

    except Exception as e:
        logger.warning(f"Seasonal decomposition failed: {e}. Falling back to linear.")
        return _linear_forecast(series, periods)


def _detect_seasonality(series: pd.Series) -> Optional[int]:
    """Simple autocorrelation-based seasonality detection."""
    n = len(series)
    if n < 8:
        return None

    values = series.values
    best_lag = None
    best_corr = 0.2  # Minimum threshold

    for lag in [4, 7, 12, 24, 30, 52]:
        if lag >= n // 2:
            continue
        corr = float(np.corrcoef(values[lag:], values[:n - lag])[0, 1])
        if corr > best_corr:
            best_corr = corr
            best_lag = lag

    return best_lag


def _select_best_method(series: pd.Series) -> str:
    """Choose the best forecasting method for this series."""
    n = len(series)
    if n < 10:
        return "linear"
    
    seasonality = _detect_seasonality(series)
    if seasonality and n >= seasonality * 2:
        return "seasonal"
    
    # Check if series is trending or mean-reverting
    values = series.values
    x = np.arange(n)
    corr_with_time = float(np.corrcoef(x, values)[0, 1])
    
    if abs(corr_with_time) > 0.6:
        return "linear"
    else:
        return "ema"
