from dataclasses import dataclass
import os

@dataclass
class Settings:
    capital: float = 100000.0
    risk_per_trade: float = 0.01
    fast_window: int = 20
    slow_window: int = 50

    telegram_token: str | None = os.getenv("TELEGRAM_BOT_TOKEN")
    telegram_chat_id: str | None = os.getenv("TELEGRAM_CHAT_ID")
