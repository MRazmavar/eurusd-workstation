/**
 * Forex Trading Sessions & Killzones Configuration.
 * 
 * Configured specifically for:
 * 1. Full Asia Session (00:00 - 08:00 UTC)
 * 2. 🛡️ Shield Area (1st hour of Asia session: 00:00 - 01:00 UTC)
 * 3. Frankfurt Open 1h (07:00 - 08:00 UTC)
 * 4. London Open 1h (08:00 - 09:00 UTC)
 * 5. New York Open 1h (13:00 - 14:00 UTC)
 */

import { Candle } from '../types';

export interface SessionConfig {
  id: string;
  name: string;
  shortLabel: string;
  code: string;
  startHourUtc: number;
  startMinuteUtc: number;
  endHourUtc: number;
  endMinuteUtc: number;
  color: string;
  borderColor: string;
  fillOpacity: number;
  badgeYOffset: number; // Staggered y-position so overlapping badges don't collide
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
}

export const FOREX_SESSIONS: SessionConfig[] = [
  {
    id: 'asia_full',
    name: 'Full Asia Session',
    shortLabel: 'Asia Session',
    code: 'A',
    startHourUtc: 0,
    startMinuteUtc: 0,
    endHourUtc: 8,
    endMinuteUtc: 0,
    color: '#8b5cf6', // purple
    borderColor: 'rgba(139, 92, 246, 0.35)',
    fillOpacity: 0.04,
    badgeYOffset: 8,
    badgeBg: '#1e1b4b',
    badgeBorder: '#8b5cf6',
    badgeText: '#c4b5fd',
  },
  {
    id: 'shield_area',
    name: 'Shield Area (Asia 1st Hour)',
    shortLabel: 'Shield Area',
    code: 'S',
    startHourUtc: 0,
    startMinuteUtc: 0,
    endHourUtc: 1,
    endMinuteUtc: 0,
    color: '#06b6d4', // cyan / shield cyan
    borderColor: 'rgba(6, 182, 212, 0.45)',
    fillOpacity: 0.08,
    badgeYOffset: 32, // positioned neatly below Asia badge
    badgeBg: '#083344',
    badgeBorder: '#06b6d4',
    badgeText: '#67e8f9',
  },
  {
    id: 'frankfurt_1h',
    name: 'Frankfurt Open (1h)',
    shortLabel: 'Frankfurt (1h)',
    code: 'F',
    startHourUtc: 7,
    startMinuteUtc: 0,
    endHourUtc: 8,
    endMinuteUtc: 0,
    color: '#f59e0b', // amber
    borderColor: 'rgba(245, 158, 11, 0.45)',
    fillOpacity: 0.06,
    badgeYOffset: 8,
    badgeBg: '#451a03',
    badgeBorder: '#f59e0b',
    badgeText: '#fde68a',
  },
  {
    id: 'london_1h',
    name: 'London Open (1h)',
    shortLabel: 'London (1h)',
    code: 'L',
    startHourUtc: 8,
    startMinuteUtc: 0,
    endHourUtc: 9,
    endMinuteUtc: 0,
    color: '#3b82f6', // blue
    borderColor: 'rgba(59, 130, 246, 0.45)',
    fillOpacity: 0.06,
    badgeYOffset: 8,
    badgeBg: '#172554',
    badgeBorder: '#3b82f6',
    badgeText: '#bfdbfe',
  },
  {
    id: 'ny_1h',
    name: 'New York Open (1st hour)',
    shortLabel: 'NY Open (1h)',
    code: 'NY',
    startHourUtc: 13,
    startMinuteUtc: 0,
    endHourUtc: 14,
    endMinuteUtc: 0,
    color: '#089981', // green
    borderColor: 'rgba(8, 153, 129, 0.45)',
    fillOpacity: 0.07,
    badgeYOffset: 8,
    badgeBg: '#022c22',
    badgeBorder: '#089981',
    badgeText: '#a7f3d0',
  },
];

export interface ComputedSessionBlock {
  key: string;
  session: SessionConfig;
  startTime: number;
  endTime: number;
  firstCandleTime: number;
  lastCandleTime: number;
  lastCandleCloseTime: number;
  high: number;
  low: number;
  pips: number;
  candleCount: number;
  status: 'ACTIVE' | 'CLOSED' | 'UPCOMING';
  openPrice: number;
  closePrice: number;
}

export interface SessionStatusSummary {
  session: SessionConfig;
  startTime: number;
  endTime: number;
  status: 'ACTIVE' | 'CLOSED' | 'UPCOMING';
  high?: number;
  low?: number;
  pips?: number;
  candleCount: number;
}

/**
 * Computes all session blocks across visible candles with real-time status and price boundaries.
 * Boundaries are strictly derived from actual OHLC candle data without look-ahead bias.
 */
export const computeSessionBlocks = (
  candles: Candle[],
  currentReplayTime?: number | null
): ComputedSessionBlock[] => {
  if (!candles || candles.length < 2) return [];

  // Determine actual candle step/interval
  // If the candles being passed are higher timeframe (e.g. >= 2h / 7200s),
  // Forex sessions (1h killzones, Asia session) are fundamentally invalid for multi-hour bars!
  const sampleCount = Math.min(candles.length - 1, 10);
  const avgStep = (candles[candles.length - 1].time - candles[candles.length - 1 - sampleCount].time) / sampleCount;
  if (avgStep >= 7200) {
    return [];
  }

  // Determine current active reference timestamp (latest revealed candle or current replay timestamp)
  const lastCandle = candles[candles.length - 1];
  const refTime = currentReplayTime ?? (lastCandle ? lastCandle.time : Math.floor(Date.now() / 1000));

  // Group candle timestamps by distinct UTC day
  const daysMap = new Map<number, Candle[]>();
  for (const c of candles) {
    const d = new Date(c.time * 1000);
    const midnightUtc = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / 1000;
    let dayList = daysMap.get(midnightUtc);
    if (!dayList) {
      dayList = [];
      daysMap.set(midnightUtc, dayList);
    }
    dayList.push(c);
  }

  const blocks: ComputedSessionBlock[] = [];

  daysMap.forEach((dayCandles, midnightUtc) => {
    // Sort candles chronologically within the day
    dayCandles.sort((a, b) => a.time - b.time);

    for (const session of FOREX_SESSIONS) {
      const startTime = midnightUtc + session.startHourUtc * 3600 + session.startMinuteUtc * 60;
      const endTime = midnightUtc + session.endHourUtc * 3600 + session.endMinuteUtc * 60;

      // Determine real-time status relative to current timestamp
      let status: 'ACTIVE' | 'CLOSED' | 'UPCOMING' = 'UPCOMING';
      if (refTime >= endTime) {
        status = 'CLOSED';
      } else if (refTime >= startTime && refTime < endTime) {
        status = 'ACTIVE';
      }

      // Filter candles belonging strictly to this session
      const matchingCandles = dayCandles.filter(c => c.time >= startTime && c.time < endTime);

      if (matchingCandles.length > 0) {
        let maxHigh = -Infinity;
        let minLow = Infinity;
        for (const mc of matchingCandles) {
          if (mc.high > maxHigh) maxHigh = mc.high;
          if (mc.low < minLow) minLow = mc.low;
        }

        const firstCandle = matchingCandles[0];
        const lastMatchingCandle = matchingCandles[matchingCandles.length - 1];

        // Determine candle interval dynamically from consecutive candles
        let candleStep = 60;
        if (matchingCandles.length > 1) {
          candleStep = matchingCandles[1].time - matchingCandles[0].time;
        } else if (dayCandles.length > 1) {
          candleStep = dayCandles[1].time - dayCandles[0].time;
        }

        // Closing time of final candle in this session
        const lastCandleCloseTime = Math.min(endTime, lastMatchingCandle.time + candleStep);
        const pips = Number(((maxHigh - minLow) * 10000).toFixed(1));

        blocks.push({
          key: `${session.id}_${midnightUtc}`,
          session,
          startTime,
          endTime,
          firstCandleTime: firstCandle.time,
          lastCandleTime: lastMatchingCandle.time,
          lastCandleCloseTime,
          high: maxHigh,
          low: minLow,
          pips,
          candleCount: matchingCandles.length,
          status,
          openPrice: firstCandle.open,
          closePrice: lastMatchingCandle.close,
        });
      } else if (status === 'ACTIVE' && dayCandles.length > 0) {
        // If the session is active right now but candle hasn't closed yet, use current live candle
        const curCandle = dayCandles[dayCandles.length - 1];
        if (curCandle && curCandle.time >= startTime) {
          const pips = Number(((curCandle.high - curCandle.low) * 10000).toFixed(1));
          blocks.push({
            key: `${session.id}_${midnightUtc}`,
            session,
            startTime,
            endTime,
            firstCandleTime: curCandle.time,
            lastCandleTime: curCandle.time,
            lastCandleCloseTime: curCandle.time + 60,
            high: curCandle.high,
            low: curCandle.low,
            pips,
            candleCount: 1,
            status: 'ACTIVE',
            openPrice: curCandle.open,
            closePrice: curCandle.close,
          });
        }
      }
    }
  });

  return blocks;
};

/**
 * Returns the session statuses and ranges for today's active day,
 * synchronized with either live market or backtesting replay timestamp.
 */
export const getSessionStatusesForTime = (
  refTimestamp: number,
  candles: Candle[] = []
): SessionStatusSummary[] => {
  const d = new Date(refTimestamp * 1000);
  const midnightUtc = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / 1000;

  // Filter candles belonging to today
  const todayCandles = candles.filter(c => {
    const cd = new Date(c.time * 1000);
    const cMidnight = Date.UTC(cd.getUTCFullYear(), cd.getUTCMonth(), cd.getUTCDate()) / 1000;
    return cMidnight === midnightUtc;
  });

  return FOREX_SESSIONS.map((session) => {
    const startTime = midnightUtc + session.startHourUtc * 3600 + session.startMinuteUtc * 60;
    const endTime = midnightUtc + session.endHourUtc * 3600 + session.endMinuteUtc * 60;

    let status: 'ACTIVE' | 'CLOSED' | 'UPCOMING' = 'UPCOMING';
    if (refTimestamp >= endTime) {
      status = 'CLOSED';
    } else if (refTimestamp >= startTime && refTimestamp < endTime) {
      status = 'ACTIVE';
    }

    const matching = todayCandles.filter(c => c.time >= startTime && c.time < endTime && c.time <= refTimestamp);
    if (matching.length > 0) {
      let maxHigh = -Infinity;
      let minLow = Infinity;
      for (const mc of matching) {
        if (mc.high > maxHigh) maxHigh = mc.high;
        if (mc.low < minLow) minLow = mc.low;
      }
      return {
        session,
        startTime,
        endTime,
        status,
        high: maxHigh,
        low: minLow,
        pips: Number(((maxHigh - minLow) * 10000).toFixed(1)),
        candleCount: matching.length,
      };
    }

    return {
      session,
      startTime,
      endTime,
      status,
      candleCount: 0,
    };
  });
};
