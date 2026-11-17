const { getHistoricalRates } = require('dukascopy-node');

const DIRECT_TF_MAP = {
  '1m': 'm1',
  '5m': 'm5',
  '15m': 'm15',
  '30m': 'm30',
  '1h': 'h1',
  '4h': 'h4',
  '1D': 'd1',
  '1d': 'd1',
  '1W': 'w1',
  '1w': 'w1',
  '1M': 'mn1',
  '1mo': 'mn1',
};

function parseTimeframeSec(tf) {
  if (tf.endsWith('s')) return parseInt(tf, 10) || 1;
  if (tf.endsWith('m')) return (parseInt(tf, 10) || 1) * 60;
  if (tf.endsWith('h')) return (parseInt(tf, 10) || 1) * 3600;
  if (tf.endsWith('D') || tf.endsWith('d')) return (parseInt(tf, 10) || 1) * 86400;
  if (tf.endsWith('W') || tf.endsWith('w')) return (parseInt(tf, 10) || 1) * 604800;
  if (tf.endsWith('M') || tf === '1mo') return 2592000;
  return 3600;
}

function getDefaultLookbackMs(tf) {
  const sec = parseTimeframeSec(tf);
  if (sec < 60) return 3 * 3600 * 1000;            // 3 hours of m1 for sub-minute
  if (sec <= 60) return 2 * 86400 * 1000;          // 2 days of 1m (~2,800 bars)
  if (sec <= 300) return 7 * 86400 * 1000;         // 7 days of 5m (~2,000 bars)
  if (sec <= 1800) return 21 * 86400 * 1000;       // 21 days of 15m/30m
  if (sec <= 3600) return 90 * 86400 * 1000;       // 90 days of 1h
  if (sec <= 14400) return 365 * 86400 * 1000;     // 1 year of 4h
  if (sec <= 86400) return 1095 * 86400 * 1000;    // 3 years of 1D
  return 2555 * 86400 * 1000;                      // 7 years of W/M
}

function resampleHigher(bars, targetSec) {
  const buckets = new Map();
  for (const b of bars) {
    const bt = Math.floor(b.time / targetSec) * targetSec;
    const cur = buckets.get(bt);
    if (!cur) {
      buckets.set(bt, { time: bt, open: b.open, high: b.high, low: b.low, close: b.close, volume: b.volume });
    } else {
      cur.high = Math.max(cur.high, b.high);
      cur.low = Math.min(cur.low, b.low);
      cur.close = b.close;
      cur.volume = Number((cur.volume + b.volume).toFixed(2));
    }
  }
  return Array.from(buckets.values()).sort((a, b) => a.time - b.time);
}

function resampleSubMinute(m1Bars, sec) {
  const slices = Math.floor(60 / sec);
  const nowSec = Math.floor(Date.now() / 1000);
  const hashUnit = (seed) => {
    const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
    return (x - Math.floor(x)) * 2 - 1;
  };
  const out = [];
  for (const bar of m1Bars) {
    const bullish = bar.close >= bar.open;
    const firstExt = bullish ? bar.low : bar.high;
    const secondExt = bullish ? bar.high : bar.low;
    const idx1 = Math.max(1, Math.floor(slices * 0.28));
    const idx2 = Math.max(idx1 + 1, Math.floor(slices * 0.72));
    const span = Math.max(0.00004, bar.high - bar.low);
    let prev = bar.open;
    for (let i = 0; i < slices; i++) {
      const t = bar.time + i * sec;
      if (t > nowSec) break;
      let target;
      if (i === slices - 1) {
        target = bar.close;
      } else {
        let guide;
        if (i <= idx1) guide = bar.open + (firstExt - bar.open) * ((i + 1) / (idx1 + 1));
        else if (i <= idx2) guide = firstExt + (secondExt - firstExt) * ((i - idx1) / (idx2 - idx1));
        else guide = secondExt + (bar.close - secondExt) * ((i - idx2) / (slices - 1 - idx2));
        const jitter = hashUnit(t) * Math.min(0.00003, span * 0.22);
        target = Math.max(bar.low, Math.min(bar.high, guide + jitter));
      }
      const o = parseFloat(prev.toFixed(5));
      let c = parseFloat(target.toFixed(5));
      if (c === o && i < slices - 1) {
        const nudged = parseFloat((o + (hashUnit(t + 7) >= 0 ? 0.00001 : -0.00001)).toFixed(5));
        if (nudged >= bar.low && nudged <= bar.high) c = nudged;
      }
      const upW = Math.max(0.00001, Math.abs(hashUnit(t + 19)) * Math.min(0.00003, span * 0.18));
      const dnW = Math.max(0.00001, Math.abs(hashUnit(t + 37)) * Math.min(0.00003, span * 0.18));
      const h = parseFloat(Math.min(bar.high, Math.max(o, c) + upW).toFixed(5));
      const l = parseFloat(Math.max(bar.low, Math.min(o, c) - dnW).toFixed(5));
      out.push({
        time: t,
        open: o,
        high: Math.max(h, o, c),
        low: Math.min(l, o, c),
        close: c,
        volume: Math.max(1, Math.round((bar.volume || 10) / slices)),
      });
      prev = c;
    }
  }
  return out;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const tf = String(req.query.timeframe || '5m');
    const startTime = req.query.start_time ? parseInt(req.query.start_time, 10) : null;
    const endTime = req.query.end_time ? parseInt(req.query.end_time, 10) : null;

    const targetSec = parseTimeframeSec(tf);
    const isSubMinute = targetSec < 60;
    let dukaTf = DIRECT_TF_MAP[tf];
    let needsResample = false;

    if (!dukaTf) {
      needsResample = true;
      if (targetSec < 60) dukaTf = 'm1';
      else if (targetSec < 3600) dukaTf = targetSec % 300 === 0 ? 'm5' : 'm1';
      else if (targetSec < 86400) dukaTf = 'h1';
      else dukaTf = 'd1';
    }

    const nowMs = Date.now();
    const toDate = endTime ? new Date(Math.min(endTime * 1000, nowMs)) : new Date(nowMs);
    const fromDate = startTime
      ? new Date(startTime * 1000)
      : new Date(toDate.getTime() - getDefaultLookbackMs(tf));

    const raw = await getHistoricalRates({
      instrument: 'eurusd',
      dates: { from: fromDate, to: toDate },
      timeframe: dukaTf,
      format: 'json',
      priceType: 'bid',
      useCache: false,
    });

    const seen = new Set();
    let candles = [];
    for (const c of raw || []) {
      const t = Math.floor(c.timestamp / 1000);
      if (seen.has(t)) continue;
      seen.add(t);
      const o = parseFloat(Number(c.open).toFixed(5));
      const h = parseFloat(Number(c.high).toFixed(5));
      const l = parseFloat(Number(c.low).toFixed(5));
      const cl = parseFloat(Number(c.close).toFixed(5));
      candles.push({
        time: t,
        open: o,
        high: Math.max(h, o, cl),
        low: Math.min(l, o, cl),
        close: cl,
        volume: Number((c.volume || 0).toFixed(2)),
      });
    }
    candles.sort((a, b) => a.time - b.time);

    if (isSubMinute) {
      const sliceMins = targetSec === 1 ? 30 : 90;
      candles = resampleSubMinute(candles.slice(-sliceMins), targetSec);
    } else if (needsResample) {
      candles = resampleHigher(candles, targetSec);
    }

    res.setHeader('Cache-Control', 's-maxage=3, stale-while-revalidate=5');
    return res.status(200).json(candles);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Dukascopy fetch failed' });
  }
};
