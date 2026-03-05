from __future__ import annotations
from datetime import datetime


def format_insight(symbol: str, action: str, confidence: float, regime: str, entry: float, stop: float, take: float, qty: int, notional: float) -> str:
    ts = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
    return (
        f"📈 Insight {ts}\n"
        f"Symbol: {symbol}\n"
        f"Action: {action}\n"
        f"Regime: {regime}\n"
        f"Confidence: {confidence:.2f}\n"
        f"Entry: {entry:.2f}\n"
        f"Stop: {stop:.2f}\n"
        f"Take Profit: {take:.2f}\n"
        f"Suggested Qty: {qty}\n"
        f"Notional: ${notional:,.2f}\n"
    )
