import { fetchYahooDaily, generateSignal, sizePosition, sendTelegram } from './engine.js';

const args = process.argv.slice(2);
const send = args.includes('--send');
const symbolsArg = args.find((a) => a.startsWith('--symbols='));
const symbols = symbolsArg ? symbolsArg.split('=')[1].split(',') : ['AAPL', 'MSFT', 'NVDA', 'SPY', 'QQQ'];
const capitalArg = args.find((a) => a.startsWith('--capital='));
const capital = capitalArg ? Number(capitalArg.split('=')[1]) : 100000;
const riskArg = args.find((a) => a.startsWith('--risk='));
const riskPerTrade = riskArg ? Number(riskArg.split('=')[1]) : 0.01;

const chunks = [];
for (const symbol of symbols) {
  try {
    const rows = await fetchYahooDaily(symbol);
    const sig = generateSignal(rows);
    const sized = sizePosition(capital, riskPerTrade, sig.entry, sig.stop);
    chunks.push(
`📈 ${symbol}
Action: ${sig.action}
Regime: ${sig.regime}
Confidence: ${sig.confidence}
Entry: ${sig.entry.toFixed(2)}
Stop: ${sig.stop.toFixed(2)}
Take: ${sig.take.toFixed(2)}
Qty: ${sized.qty}
Notional: $${sized.notional.toFixed(2)}`
    );
  } catch (e) {
    chunks.push(`⚠️ ${symbol}: ${e.message}`);
  }
}

const report = chunks.join('\n\n-------------------------\n\n');
console.log(report);

if (send) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    throw new Error('Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID to use --send');
  }
  await sendTelegram(token, chatId, report.slice(0, 4000));
  console.log('\n✅ Sent to Telegram channel/chat');
}
