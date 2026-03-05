# Investment Insight Engine (MVP)

This is a local-first MVP that:
- Pulls daily market prices from Yahoo Finance public chart endpoint
- Generates trend signals (SMA crossover + momentum)
- Applies basic risk sizing
- Produces actionable entry/exit insights
- Optionally sends insights to a dedicated Telegram channel

## Quick start

```bash
cd invest-intel
npm start
```

## Configure dedicated Telegram channel (optional)

Set env vars:

- `TELEGRAM_BOT_TOKEN` = Bot token
- `TELEGRAM_CHAT_ID` = Channel ID (example: `-1001234567890`) or user/chat id

Then run:

```bash
$env:TELEGRAM_BOT_TOKEN="..."
$env:TELEGRAM_CHAT_ID="-1001234567890"
node src/main.js --send
```

## Example

```bash
node src/main.js --symbols=AAPL,MSFT,NVDA,SPY,QQQ --capital=100000 --risk=0.01 --send
```

## Notes

- This is decision support, not financial advice.
- Use paper trading first.
- Add your broker integration only after stable backtest + paper phase.
