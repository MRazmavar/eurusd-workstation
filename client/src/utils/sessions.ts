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
    startHourUtc: 0,
    startMinuteUtc: 0,
    endHourUtc: 8,
    endMinuteUtc: 0,
    color: '#8b5cf6', // purple
    borderColor: 'rgba(139, 92, 246, 0.45)',
    fillOpacity: 0.07,
    badgeYOffset: 8,
    badgeBg: '#1e1b4b',
    badgeBorder: '#8b5cf6',
    badgeText: '#c4b5fd',
  },
  {
    id: 'shield_area',
    name: 'Shield Area (Asia 1st Hour)',
    shortLabel: '🛡️ Shield Area',
    startHourUtc: 0,
    startMinuteUtc: 0,
    endHourUtc: 1,
    endMinuteUtc: 0,
    color: '#06b6d4', // cyan / shield cyan
    borderColor: '#06b6d4',
    fillOpacity: 0.22,
    badgeYOffset: 32, // positioned neatly below Asia badge
    badgeBg: '#083344',
    badgeBorder: '#06b6d4',
    badgeText: '#67e8f9',
  },
  {
    id: 'frankfurt_1h',
    name: 'Frankfurt Open (1h)',
    shortLabel: 'Frankfurt (1h)',
    startHourUtc: 7,
    startMinuteUtc: 0,
    endHourUtc: 8,
    endMinuteUtc: 0,
    color: '#f59e0b', // amber
    borderColor: '#f59e0b',
    fillOpacity: 0.16,
    badgeYOffset: 8,
    badgeBg: '#451a03',
    badgeBorder: '#f59e0b',
    badgeText: '#fde68a',
  },
  {
    id: 'london_1h',
    name: 'London Open (1h)',
    shortLabel: 'London (1h)',
    startHourUtc: 8,
    startMinuteUtc: 0,
    endHourUtc: 9,
    endMinuteUtc: 0,
    color: '#3b82f6', // blue
    borderColor: '#3b82f6',
    fillOpacity: 0.16,
    badgeYOffset: 8,
    badgeBg: '#172554',
    badgeBorder: '#3b82f6',
    badgeText: '#bfdbfe',
  },
  {
    id: 'ny_1h',
    name: 'New York Open (1st hour)',
    shortLabel: 'NY Open (1h)',
    startHourUtc: 13,
    startMinuteUtc: 0,
    endHourUtc: 14,
    endMinuteUtc: 0,
    color: '#089981', // green
    borderColor: '#089981',
    fillOpacity: 0.18,
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
  high: number;
  low: number;
  candleCount: number;
}

/**
 * Computes all active session blocks across visible candles.
 */
export const computeSessionBlocks = (candles: Candle[]): ComputedSessionBlock[] => {
  if (!candles || candles.length === 0) return [];

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
    for (const session of FOREX_SESSIONS) {
      const startTime = midnightUtc + session.startHourUtc * 3600 + session.startMinuteUtc * 60;
      const endTime = midnightUtc + session.endHourUtc * 3600 + session.endMinuteUtc * 60;

      // Filter candles belonging to this session
      const matchingCandles = dayCandles.filter(c => c.time >= startTime && c.time < endTime);
      if (matchingCandles.length > 0) {
        let maxHigh = -Infinity;
        let minLow = Infinity;
        for (const mc of matchingCandles) {
          if (mc.high > maxHigh) maxHigh = mc.high;
          if (mc.low < minLow) minLow = mc.low;
        }

        blocks.push({
          key: `${session.id}_${midnightUtc}`,
          session,
          startTime,
          endTime,
          high: maxHigh,
          low: minLow,
          candleCount: matchingCandles.length,
        });
      }
    }
  });

  return blocks;
};
