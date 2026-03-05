from __future__ import annotations
import pandas as pd


def build_features(df: pd.DataFrame, fast_window: int = 20, slow_window: int = 50) -> pd.DataFrame:
    out = df.copy()
    out["ret_1d"] = out["close"].pct_change()
    out["fast_sma"] = out["close"].rolling(fast_window).mean()
    out["slow_sma"] = out["close"].rolling(slow_window).mean()
    out["vol_20"] = out["ret_1d"].rolling(20).std() * (252 ** 0.5)
    out["mom_20"] = out["close"].pct_change(20)
    return out


def latest_signal_row(feat: pd.DataFrame) -> pd.Series:
    return feat.dropna().iloc[-1]


def classify_signal(row: pd.Series) -> tuple[str, float, str]:
    fast = row["fast_sma"]
    slow = row["slow_sma"]
    mom = row["mom_20"]
    vol = row["vol_20"]

    # Simple confidence heuristic
    trend_strength = abs((fast - slow) / slow)
    confidence = min(0.95, max(0.05, trend_strength * 10 + max(0, mom) * 2))

    if fast > slow and mom > 0:
        action = "ENTER_LONG"
        regime = "TREND_UP"
    elif fast < slow and mom < 0:
        action = "EXIT_OR_AVOID"
        regime = "TREND_DOWN"
    else:
        action = "HOLD_WAIT"
        regime = "MIXED"

    # Penalize very high volatility
    if vol > 0.45:
        confidence *= 0.7

    return action, round(float(confidence), 2), regime
