from __future__ import annotations
import requests
import pandas as pd


def fetch_yahoo_daily(symbol: str, range_period: str = "1y", interval: str = "1d") -> pd.DataFrame:
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}"
    params = {"range": range_period, "interval": interval}
    r = requests.get(url, params=params, timeout=20)
    r.raise_for_status()
    data = r.json()

    result = data.get("chart", {}).get("result", [])
    if not result:
        raise ValueError(f"No data for {symbol}")

    item = result[0]
    ts = item.get("timestamp", [])
    quote = item.get("indicators", {}).get("quote", [{}])[0]

    df = pd.DataFrame({
        "timestamp": pd.to_datetime(ts, unit="s", utc=True),
        "open": quote.get("open", []),
        "high": quote.get("high", []),
        "low": quote.get("low", []),
        "close": quote.get("close", []),
        "volume": quote.get("volume", []),
    })
    df = df.dropna(subset=["close"]).reset_index(drop=True)
    return df
