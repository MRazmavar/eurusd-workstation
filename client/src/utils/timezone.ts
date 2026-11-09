/**
 * Timezone Management & Formatting Utilities for Forex Trading Charts.
 */

export interface TimezoneOption {
  value: string;
  label: string;
  abbr: string;
  utcOffset: string;
}

export const TIMEZONE_OPTIONS: TimezoneOption[] = [
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)', abbr: 'UTC', utcOffset: 'UTC+0' },
  { value: 'America/New_York', label: 'New York (EST / EDT)', abbr: 'NY (UTC-4)', utcOffset: 'UTC-5/-4' },
  { value: 'Europe/London', label: 'London (GMT / BST)', abbr: 'LDN (UTC+1)', utcOffset: 'UTC+0/+1' },
  { value: 'Europe/Berlin', label: 'Frankfurt / Paris (CET / CEST)', abbr: 'FRA (UTC+2)', utcOffset: 'UTC+1/+2' },
  { value: 'Asia/Tehran', label: 'Tehran (IRST)', abbr: 'THR (UTC+3:30)', utcOffset: 'UTC+3:30' },
  { value: 'Asia/Dubai', label: 'Dubai (GST)', abbr: 'DXB (UTC+4)', utcOffset: 'UTC+4' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)', abbr: 'TYO (UTC+9)', utcOffset: 'UTC+9' },
  { value: 'Asia/Singapore', label: 'Singapore / Hong Kong (SGT)', abbr: 'SIN (UTC+8)', utcOffset: 'UTC+8' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST / AEDT)', abbr: 'SYD (UTC+10)', utcOffset: 'UTC+10/+11' },
  { value: 'America/Chicago', label: 'Chicago (CST / CDT)', abbr: 'CHI (UTC-5)', utcOffset: 'UTC-6/-5' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (PST / PDT)', abbr: 'LA (UTC-7)', utcOffset: 'UTC-8/-7' },
];

export const getTimezoneAbbr = (tz: string): string => {
  const found = TIMEZONE_OPTIONS.find(t => t.value === tz);
  return found ? found.abbr : tz;
};

/**
 * Calculates the duration of a timeframe string in seconds.
 */
export const getTimeframeSeconds = (tf: string): number => {
  if (tf.endsWith('s')) return parseInt(tf) || 30;
  if (tf.endsWith('m')) return (parseInt(tf) || 1) * 60;
  if (tf.endsWith('h')) return (parseInt(tf) || 1) * 3600;
  if (tf.endsWith('D') || tf.endsWith('d')) return (parseInt(tf) || 1) * 86400;
  if (tf.endsWith('W') || tf.endsWith('w')) return (parseInt(tf) || 1) * 604800;
  if (tf.endsWith('M') || tf.endsWith('mo')) return (parseInt(tf) || 1) * 2592000;
  return 3600;
};

/**
 * Formats a Unix timestamp (seconds) into the specified timezone.
 */
export const formatTimeInTimezone = (
  timestampSec: number,
  timeZone: string,
  includeDate: boolean = false
): string => {
  try {
    const d = new Date(timestampSec * 1000);
    if (includeDate) {
      return new Intl.DateTimeFormat('en-US', {
        timeZone,
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }).format(d);
    }
    return new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(d);
  } catch {
    const d = new Date(timestampSec * 1000);
    return d.toUTCString();
  }
};

/**
 * Formats a tick mark for Lightweight Charts time axis according to TickMarkType.
 * TickMarkType:
 * 0: Year, 1: Month, 2: DayOfMonth, 3: Time, 4: TimeWithSeconds
 */
export const formatTickMarkInTimezone = (
  timestampSec: number,
  tickMarkType: number,
  timeZone: string
): string => {
  try {
    const d = new Date(timestampSec * 1000);
    if (tickMarkType === 0) {
      // Year
      return new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric' }).format(d);
    }
    if (tickMarkType === 1) {
      // Month
      return new Intl.DateTimeFormat('en-US', { timeZone, month: 'short' }).format(d);
    }
    if (tickMarkType === 2) {
      // DayOfMonth
      return new Intl.DateTimeFormat('en-US', { timeZone, day: 'numeric', month: 'short' }).format(d);
    }
    if (tickMarkType === 4) {
      // Time with seconds
      return new Intl.DateTimeFormat('en-US', {
        timeZone,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }).format(d);
    }
    // Default: Time (HH:mm)
    return new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(d);
  } catch {
    return '';
  }
};

/**
 * Formats a crosshair / candle badge timestamp according to timeframe and target timezone.
 */
export const formatBadgeTimeInTimezone = (
  timeSec: number,
  tf: string,
  timeZone: string = 'UTC'
): string => {
  try {
    const d = new Date(timeSec * 1000);
    if (['1s', '5s', '15s', '30s'].includes(tf)) {
      return new Intl.DateTimeFormat('en-US', {
        timeZone,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }).format(d);
    }
    if (['1d', '1D', '1w', '1W', '1mo', '1M'].includes(tf)) {
      return new Intl.DateTimeFormat('en-US', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(d);
    }
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    return formatter.format(d).replace(',', '');
  } catch {
    const d = new Date(timeSec * 1000);
    return d.toUTCString();
  }
};

/**
 * Converts a UTC hour:minute into formatted string in target timezone.
 */
export const formatSessionTimeRange = (
  startHourUtc: number,
  startMinUtc: number,
  endHourUtc: number,
  endMinUtc: number,
  timeZone: string
): string => {
  try {
    // Arbitrary anchor date: 2026-01-15 (non-DST reference)
    const dStart = new Date(Date.UTC(2026, 0, 15, startHourUtc, startMinUtc, 0));
    const dEnd = new Date(Date.UTC(2026, 0, 15, endHourUtc, endMinUtc, 0));

    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    return `${fmt.format(dStart)} - ${fmt.format(dEnd)}`;
  } catch {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(startHourUtc)}:${pad(startMinUtc)} - ${pad(endHourUtc)}:${pad(endMinUtc)} UTC`;
  }
};
