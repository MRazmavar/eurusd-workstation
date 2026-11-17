const { getRealTimeRates, getHistoricalRates } = require('dukascopy-node');

function isForexMarketOpen() {
  const now = new Date();
  const day = now.getUTCDay(); // 0=Sun, 5=Fri, 6=Sat
  const hour = now.getUTCHours();
  if (day === 5 && hour >= 22) return false;
  if (day === 6) return false;
  if (day === 0 && hour < 22) return false;
  return true;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const t0 = Date.now();
  const isOpen = isForexMarketOpen();
  const spreadPips = 1.2;

  try {
    let rates = null;
    try {
      rates = await getRealTimeRates({
        instrument: 'eurusd',
        timeframe: 'm1',
        last: 2,
        format: 'json',
        priceType: 'bid',
      });
    } catch {}

    if (!rates || rates.length === 0) {
      const now = new Date();
      rates = await getHistoricalRates({
        instrument: 'eurusd',
        dates: { from: new Date(now.getTime() - 2 * 3600 * 1000), to: now },
        timeframe: 'm1',
        format: 'json',
        priceType: 'bid',
        useCache: false,
      });
    }

    if (!rates || rates.length === 0) {
      return res.status(503).json({ error: 'No quote available' });
    }

    const last = rates[rates.length - 1];
    const prev = rates.length > 1 ? rates[rates.length - 2] : last;
    const bid = parseFloat(Number(last.close).toFixed(5));
    const ask = parseFloat((bid + spreadPips * 0.0001).toFixed(5));
    const prevClose = parseFloat(Number(prev.close || bid).toFixed(5));
    const change = parseFloat((bid - prevClose).toFixed(5));
    const changePercent = prevClose ? parseFloat(((change / prevClose) * 100).toFixed(3)) : 0;

    res.setHeader('Cache-Control', 's-maxage=1, stale-while-revalidate=2');
    return res.status(200).json({
      symbol: 'EUR/USD',
      bid,
      ask,
      spread: spreadPips,
      change,
      changePercent,
      high: parseFloat(Number(last.high || bid).toFixed(5)),
      low: parseFloat(Number(last.low || bid).toFixed(5)),
      timestamp: Math.floor(Date.now() / 1000),
      status: isOpen ? 'LIVE' : 'HISTORICAL',
      provider: 'Dukascopy (Swiss Forex Bank)',
      market_status: isOpen ? 'OPEN' : 'CLOSED_WEEKEND',
      latency_ms: Date.now() - t0,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Quote fetch error' });
  }
};
