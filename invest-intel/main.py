from __future__ import annotations
import argparse
import requests

from app.config import Settings
from app.data import fetch_yahoo_daily
from app.signals import build_features, latest_signal_row, classify_signal
from app.risk import stop_takeprofit, position_size
from app.report import format_insight


def send_telegram(token: str, chat_id: str, text: str) -> None:
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    r = requests.post(url, json={"chat_id": chat_id, "text": text}, timeout=20)
    r.raise_for_status()


def run(symbols: list[str], settings: Settings, send: bool = False):
    insights = []
    for symbol in symbols:
        try:
            df = fetch_yahoo_daily(symbol)
            feat = build_features(df, settings.fast_window, settings.slow_window)
            row = latest_signal_row(feat)
            action, confidence, regime = classify_signal(row)
            entry = float(row["close"])
            stop, take = stop_takeprofit(entry, atr_proxy=max(0.01, min(0.05, float(row["vol_20"]) / 10)))
            notional, qty = position_size(settings.capital, settings.risk_per_trade, entry, stop)
            msg = format_insight(symbol, action, confidence, regime, entry, stop, take, qty, notional)
            insights.append(msg)
        except Exception as e:
            insights.append(f"⚠️ {symbol}: failed to generate insight ({e})")

    payload = "\n" + ("\n" + "-"*32 + "\n").join(insights)
    print(payload)

    if send:
        if not settings.telegram_token or not settings.telegram_chat_id:
            raise RuntimeError("Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID")
        send_telegram(settings.telegram_token, settings.telegram_chat_id, payload[:4000])


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--symbols", nargs="+", default=["AAPL", "MSFT", "NVDA", "SPY", "QQQ"])
    p.add_argument("--capital", type=float, default=100000)
    p.add_argument("--risk-per-trade", type=float, default=0.01)
    p.add_argument("--send", action="store_true")
    args = p.parse_args()

    s = Settings(capital=args.capital, risk_per_trade=args.risk_per_trade)
    run(args.symbols, s, send=args.send)
