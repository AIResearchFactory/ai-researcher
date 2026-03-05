from __future__ import annotations


def position_size(capital: float, risk_per_trade: float, entry: float, stop: float) -> tuple[float, int]:
    risk_budget = capital * risk_per_trade
    per_share_risk = max(0.01, abs(entry - stop))
    qty = int(risk_budget // per_share_risk)
    notional = qty * entry
    return round(notional, 2), qty


def stop_takeprofit(entry: float, atr_proxy: float = 0.02) -> tuple[float, float]:
    # ATR proxy as percentage for MVP
    stop = entry * (1 - 2 * atr_proxy)
    take = entry * (1 + 3 * atr_proxy)
    return round(stop, 2), round(take, 2)
