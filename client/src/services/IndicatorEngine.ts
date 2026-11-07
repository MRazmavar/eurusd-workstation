/**
 * Mathematical calculations for Technical Indicators.
 */
import { Candle } from '../types';

export interface IndicatorPoint {
  time: number;
  value?: number;
  // Multi-value indicators:
  upper?: number;
  lower?: number;
  middle?: number;
  macd?: number;
  signal?: number;
  hist?: number;
  k?: number;
  d?: number;
  tenkan?: number;
  kijun?: number;
  spanA?: number;
  spanB?: number;
}

export class IndicatorEngine {
  /** Simple Moving Average (SMA) */
  static calculateSMA(candles: Candle[], period: number): IndicatorPoint[] {
    const results: IndicatorPoint[] = [];
    let sum = 0;
    for (let i = 0; i < candles.length; i++) {
      sum += candles[i].close;
      if (i >= period) {
        sum -= candles[i - period].close;
      }
      if (i >= period - 1) {
        results.push({ time: candles[i].time, value: round(sum / period, 5) });
      }
    }
    return results;
  }

  /** Exponential Moving Average (EMA) */
  static calculateEMA(candles: Candle[], period: number): IndicatorPoint[] {
    const results: IndicatorPoint[] = [];
    if (candles.length < period) return results;

    const k = 2 / (period + 1);
    let ema = candles.slice(0, period).reduce((acc, c) => acc + c.close, 0) / period;
    results.push({ time: candles[period - 1].time, value: round(ema, 5) });

    for (let i = period; i < candles.length; i++) {
      ema = candles[i].close * k + ema * (1 - k);
      results.push({ time: candles[i].time, value: round(ema, 5) });
    }
    return results;
  }

  /** Volume Weighted Average Price (VWAP) */
  static calculateVWAP(candles: Candle[]): IndicatorPoint[] {
    const results: IndicatorPoint[] = [];
    let cumulativeTPV = 0;
    let cumulativeVol = 0;

    for (let i = 0; i < candles.length; i++) {
      const c = candles[i];
      const typicalPrice = (c.high + c.low + c.close) / 3;
      const vol = (c.volume && c.volume > 0) ? c.volume : 100;
      cumulativeTPV += typicalPrice * vol;
      cumulativeVol += vol;

      results.push({
        time: c.time,
        value: round(cumulativeTPV / cumulativeVol, 5),
      });
    }
    return results;
  }

  /** Bollinger Bands */
  static calculateBB(candles: Candle[], period: number = 20, mult: number = 2): IndicatorPoint[] {
    const results: IndicatorPoint[] = [];
    for (let i = period - 1; i < candles.length; i++) {
      const slice = candles.slice(i - period + 1, i + 1);
      const mean = slice.reduce((a, b) => a + b.close, 0) / period;
      const variance = slice.reduce((a, b) => a + Math.pow(b.close - mean, 2), 0) / period;
      const stdDev = Math.sqrt(variance);

      results.push({
        time: candles[i].time,
        middle: round(mean, 5),
        upper: round(mean + mult * stdDev, 5),
        lower: round(mean - mult * stdDev, 5),
        value: round(mean, 5),
      });
    }
    return results;
  }

  /** Relative Strength Index (RSI) */
  static calculateRSI(candles: Candle[], period: number = 14): IndicatorPoint[] {
    const results: IndicatorPoint[] = [];
    if (candles.length <= period) return results;

    let gains = 0;
    let losses = 0;

    for (let i = 1; i <= period; i++) {
      const diff = candles[i].close - candles[i - 1].close;
      if (diff >= 0) gains += diff;
      else losses += -diff;
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;
    let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    let rsi = avgLoss === 0 ? 100 : 100 - (100 / (1 + rs));

    results.push({ time: candles[period].time, value: round(rsi, 2) });

    for (let i = period + 1; i < candles.length; i++) {
      const diff = candles[i].close - candles[i - 1].close;
      const currentGain = diff > 0 ? diff : 0;
      const currentLoss = diff < 0 ? -diff : 0;

      avgGain = (avgGain * (period - 1) + currentGain) / period;
      avgLoss = (avgLoss * (period - 1) + currentLoss) / period;

      rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      rsi = avgLoss === 0 ? 100 : 100 - (100 / (1 + rs));

      results.push({ time: candles[i].time, value: round(rsi, 2) });
    }
    return results;
  }

  /** MACD */
  static calculateMACD(candles: Candle[], fast: number = 12, slow: number = 26, signal: number = 9): IndicatorPoint[] {
    const results: IndicatorPoint[] = [];
    if (candles.length < slow + signal) return results;

    const fastEma = this.calculateEMA(candles, fast);
    const slowEma = this.calculateEMA(candles, slow);

    const macdLineMap = new Map<number, number>();
    for (const s of slowEma) {
      const f = fastEma.find(x => x.time === s.time);
      if (f && f.value !== undefined && s.value !== undefined) {
        macdLineMap.set(s.time, f.value - s.value);
      }
    }

    const macdCandles: Candle[] = [];
    for (const [time, val] of macdLineMap.entries()) {
      macdCandles.push({ time, open: val, high: val, low: val, close: val });
    }
    const signalEma = this.calculateEMA(macdCandles, signal);

    for (const sig of signalEma) {
      const mVal = macdLineMap.get(sig.time);
      if (mVal !== undefined && sig.value !== undefined) {
        results.push({
          time: sig.time,
          macd: round(mVal, 6),
          signal: round(sig.value, 6),
          hist: round(mVal - sig.value, 6),
          value: round(mVal, 6),
        });
      }
    }
    return results;
  }

  /** Average True Range (ATR) */
  static calculateATR(candles: Candle[], period: number = 14): IndicatorPoint[] {
    const results: IndicatorPoint[] = [];
    if (candles.length <= period) return results;

    const trs: number[] = [candles[0].high - candles[0].low];
    for (let i = 1; i < candles.length; i++) {
      const h = candles[i].high;
      const l = candles[i].low;
      const pc = candles[i - 1].close;
      const tr = Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc));
      trs.push(tr);
    }

    let atr = trs.slice(0, period).reduce((a, b) => a + b, 0) / period;
    results.push({ time: candles[period - 1].time, value: round(atr, 5) });

    for (let i = period; i < candles.length; i++) {
      atr = (atr * (period - 1) + trs[i]) / period;
      results.push({ time: candles[i].time, value: round(atr, 5) });
    }
    return results;
  }

  /** Stochastic Oscillator (%K, %D) */
  static calculateStochastic(candles: Candle[], periodK: number = 14, periodD: number = 3): IndicatorPoint[] {
    const results: IndicatorPoint[] = [];
    if (candles.length < periodK + periodD) return results;

    const kValues: { time: number; k: number }[] = [];
    for (let i = periodK - 1; i < candles.length; i++) {
      const slice = candles.slice(i - periodK + 1, i + 1);
      const highestHigh = Math.max(...slice.map(c => c.high));
      const lowestLow = Math.min(...slice.map(c => c.low));
      const range = highestHigh - lowestLow;
      const currentK = range === 0 ? 50 : ((candles[i].close - lowestLow) / range) * 100;
      kValues.push({ time: candles[i].time, k: currentK });
    }

    for (let i = periodD - 1; i < kValues.length; i++) {
      const dSlice = kValues.slice(i - periodD + 1, i + 1);
      const avgD = dSlice.reduce((a, b) => a + b.k, 0) / periodD;
      results.push({
        time: kValues[i].time,
        k: round(kValues[i].k, 2),
        d: round(avgD, 2),
        value: round(kValues[i].k, 2),
      });
    }
    return results;
  }

  /** Supertrend Indicator */
  static calculateSupertrend(candles: Candle[], period: number = 10, multiplier: number = 3): IndicatorPoint[] {
    const results: IndicatorPoint[] = [];
    const atrList = this.calculateATR(candles, period);
    const atrMap = new Map(atrList.map(a => [a.time, a.value || 0]));

    let prevUpper = 0;
    let prevLower = 0;
    let prevClose = 0;
    let direction = 1; // 1 for bull, -1 for bear

    for (let i = period; i < candles.length; i++) {
      const c = candles[i];
      const atr = atrMap.get(c.time) || 0;
      const basicUpper = (c.high + c.low) / 2 + multiplier * atr;
      const basicLower = (c.high + c.low) / 2 - multiplier * atr;

      let upper = basicUpper;
      let lower = basicLower;

      if (i > period) {
        upper = basicUpper < prevUpper || prevClose > prevUpper ? basicUpper : prevUpper;
        lower = basicLower > prevLower || prevClose < prevLower ? basicLower : prevLower;
      }

      if (c.close > (direction === 1 ? upper : prevUpper)) {
        direction = 1;
      } else if (c.close < (direction === -1 ? lower : prevLower)) {
        direction = -1;
      }

      const stValue = direction === 1 ? lower : upper;
      results.push({ time: c.time, value: round(stValue, 5) });

      prevUpper = upper;
      prevLower = lower;
      prevClose = c.close;
    }
    return results;
  }
}

function round(val: number, decimals: number): number {
  return Number(val.toFixed(decimals));
}
