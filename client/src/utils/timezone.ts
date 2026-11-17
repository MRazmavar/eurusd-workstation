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

export interface TimeFormatOption {
  id: string;
  label: string;
  description: string;
  example: string;
}

export const TIME_FORMAT_OPTIONS: TimeFormatOption[] = [
  { id: 'adaptive', label: 'Adaptive (Smart)', description: 'Smart trading ticks (May 22 / 15:30)', example: '15:30 / May 22' },
  { id: 'datetime_iso', label: 'YYYY-MM-DD HH:mm', description: 'ISO date & 24h time', example: '2026-05-22 15:30' },
  { id: 'datetime_iso_sec', label: 'YYYY-MM-DD HH:mm:ss', description: 'ISO date with seconds', example: '2026-05-22 15:30:45' },
  { id: 'datetime_eu', label: 'DD/MM/YYYY HH:mm', description: 'European day/month/year & time', example: '22/05/2026 15:30' },
  { id: 'datetime_eu_sec', label: 'DD/MM/YYYY HH:mm:ss', description: 'European with seconds', example: '22/05/2026 15:30:45' },
  { id: 'datetime_us', label: 'MM/DD/YYYY HH:mm', description: 'US month/day/year & time', example: '05/22/2026 15:30' },
  { id: 'datetime_us_sec', label: 'MM/DD/YYYY HH:mm:ss', description: 'US with seconds', example: '05/22/2026 15:30:45' },
  { id: 'datetime_short', label: 'DD MMM HH:mm', description: 'Day month & 24h time', example: '22 May 15:30' },
  { id: 'datetime_short_sec', label: 'DD MMM HH:mm:ss', description: 'Day month with seconds', example: '22 May 15:30:45' },
  { id: 'datetime_full', label: 'DD MMM YYYY HH:mm', description: 'Full date & 24h time', example: '22 May 2026 15:30' },
  { id: 'datetime_full_sec', label: 'DD MMM YYYY HH:mm:ss', description: 'Full date with seconds', example: '22 May 2026 15:30:45' },
  { id: 'time_24h', label: 'HH:mm (24-Hour)', description: '24-hour time only', example: '15:30' },
  { id: 'time_24h_sec', label: 'HH:mm:ss (24-Hour with Seconds)', description: '24-hour time with seconds', example: '15:30:45' },
  { id: 'time_12h', label: 'hh:mm a (12-Hour AM/PM)', description: '12-hour AM/PM time', example: '03:30 PM' },
  { id: 'time_12h_sec', label: 'hh:mm:ss a (12-Hour with Seconds)', description: '12-hour AM/PM with seconds', example: '03:30:45 PM' },
];

/**
 * Formats a Unix timestamp (seconds) into the specified timezone and format.
 */
export const formatTimeInTimezone = (
  timestampSec: number,
  timeZone: string,
  includeDate: boolean = false,
  formatId: string = 'adaptive',
  showSeconds: boolean = false
): string => {
  try {
    const d = new Date(timestampSec * 1000);
    const hasSec = showSeconds || formatId.endsWith('_sec') || formatId === 'time_24h_sec' || formatId === 'time_12h_sec';

    if (formatId === 'datetime_iso' || formatId === 'datetime_iso_sec') {
      const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: hasSec ? '2-digit' : undefined,
        hour12: false,
      }).formatToParts(d);
      const y = parts.find(p => p.type === 'year')?.value;
      const m = parts.find(p => p.type === 'month')?.value;
      const day = parts.find(p => p.type === 'day')?.value;
      const hr = parts.find(p => p.type === 'hour')?.value;
      const min = parts.find(p => p.type === 'minute')?.value;
      const sec = parts.find(p => p.type === 'second')?.value;
      return hasSec && sec ? `${y}-${m}-${day} ${hr}:${min}:${sec}` : `${y}-${m}-${day} ${hr}:${min}`;
    }

    if (formatId === 'datetime_eu' || formatId === 'datetime_eu_sec') {
      const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: hasSec ? '2-digit' : undefined,
        hour12: false,
      }).formatToParts(d);
      const y = parts.find(p => p.type === 'year')?.value;
      const m = parts.find(p => p.type === 'month')?.value;
      const day = parts.find(p => p.type === 'day')?.value;
      const hr = parts.find(p => p.type === 'hour')?.value;
      const min = parts.find(p => p.type === 'minute')?.value;
      const sec = parts.find(p => p.type === 'second')?.value;
      return hasSec && sec ? `${day}/${m}/${y} ${hr}:${min}:${sec}` : `${day}/${m}/${y} ${hr}:${min}`;
    }

    if (formatId === 'datetime_us' || formatId === 'datetime_us_sec') {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: hasSec ? '2-digit' : undefined,
        hour12: false,
      }).formatToParts(d);
      const y = parts.find(p => p.type === 'year')?.value;
      const m = parts.find(p => p.type === 'month')?.value;
      const day = parts.find(p => p.type === 'day')?.value;
      const hr = parts.find(p => p.type === 'hour')?.value;
      const min = parts.find(p => p.type === 'minute')?.value;
      const sec = parts.find(p => p.type === 'second')?.value;
      return hasSec && sec ? `${m}/${day}/${y} ${hr}:${min}:${sec}` : `${m}/${day}/${y} ${hr}:${min}`;
    }

    if (formatId === 'datetime_short' || formatId === 'datetime_short_sec') {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone,
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: hasSec ? '2-digit' : undefined,
        hour12: false,
      }).formatToParts(d);
      const m = parts.find(p => p.type === 'month')?.value;
      const day = parts.find(p => p.type === 'day')?.value;
      const hr = parts.find(p => p.type === 'hour')?.value;
      const min = parts.find(p => p.type === 'minute')?.value;
      const sec = parts.find(p => p.type === 'second')?.value;
      return hasSec && sec ? `${day} ${m} ${hr}:${min}:${sec}` : `${day} ${m} ${hr}:${min}`;
    }

    if (formatId === 'datetime_full' || formatId === 'datetime_full_sec') {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone,
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: hasSec ? '2-digit' : undefined,
        hour12: false,
      }).formatToParts(d);
      const y = parts.find(p => p.type === 'year')?.value;
      const m = parts.find(p => p.type === 'month')?.value;
      const day = parts.find(p => p.type === 'day')?.value;
      const hr = parts.find(p => p.type === 'hour')?.value;
      const min = parts.find(p => p.type === 'minute')?.value;
      const sec = parts.find(p => p.type === 'second')?.value;
      return hasSec && sec ? `${day} ${m} ${y} ${hr}:${min}:${sec}` : `${day} ${m} ${y} ${hr}:${min}`;
    }

    if (formatId === 'time_24h' || formatId === 'time_24h_sec') {
      return new Intl.DateTimeFormat('en-US', {
        timeZone,
        hour: '2-digit',
        minute: '2-digit',
        second: hasSec ? '2-digit' : undefined,
        hour12: false,
      }).format(d);
    }

    if (formatId === 'time_12h' || formatId === 'time_12h_sec') {
      return new Intl.DateTimeFormat('en-US', {
        timeZone,
        hour: '2-digit',
        minute: '2-digit',
        second: hasSec ? '2-digit' : undefined,
        hour12: true,
      }).format(d);
    }

    // Default / Adaptive
    if (includeDate) {
      return new Intl.DateTimeFormat('en-US', {
        timeZone,
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: hasSec ? '2-digit' : undefined,
        hour12: false,
      }).format(d);
    }
    return new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      second: hasSec ? '2-digit' : undefined,
      hour12: false,
    }).format(d);
  } catch {
    const d = new Date(timestampSec * 1000);
    return d.toUTCString();
  }
};

/**
 * Formats a tick mark for Lightweight Charts time axis according to TickMarkType and User Preference.
 * TickMarkType:
 * 0: Year, 1: Month, 2: DayOfMonth, 3: Time, 4: TimeWithSeconds
 */
export const formatTickMarkInTimezone = (
  timestampSec: number,
  tickMarkType: number,
  timeZone: string,
  formatId: string = 'adaptive',
  showSeconds: boolean = false
): string => {
  try {
    const d = new Date(timestampSec * 1000);
    const hasSec = showSeconds || formatId.endsWith('_sec') || formatId === 'time_24h_sec' || formatId === 'time_12h_sec';

    // When the user has selected an explicit format like ISO, European, or US:
    if (formatId.startsWith('datetime_iso')) {
      if (tickMarkType === 0) {
        return new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric' }).format(d);
      }
      if (tickMarkType === 1) {
        const parts = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit' }).formatToParts(d);
        const y = parts.find(p => p.type === 'year')?.value;
        const m = parts.find(p => p.type === 'month')?.value;
        return `${y}-${m}`;
      }
      if (tickMarkType === 2) {
        // Day with Year
        const parts = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(d);
        const y = parts.find(p => p.type === 'year')?.value;
        const m = parts.find(p => p.type === 'month')?.value;
        const day = parts.find(p => p.type === 'day')?.value;
        return `${y}-${m}-${day}`;
      }
      // Time tick (3 or 4) with Full Date & Time
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: hasSec ? '2-digit' : undefined,
        hour12: false,
      }).formatToParts(d);
      const y = parts.find(p => p.type === 'year')?.value;
      const m = parts.find(p => p.type === 'month')?.value;
      const day = parts.find(p => p.type === 'day')?.value;
      const hr = parts.find(p => p.type === 'hour')?.value;
      const min = parts.find(p => p.type === 'minute')?.value;
      const sec = parts.find(p => p.type === 'second')?.value;
      return hasSec && sec ? `${y}-${m}-${day} ${hr}:${min}:${sec}` : `${y}-${m}-${day} ${hr}:${min}`;
    }

    if (formatId.startsWith('datetime_eu')) {
      if (tickMarkType === 0) {
        return new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric' }).format(d);
      }
      if (tickMarkType === 1) {
        return new Intl.DateTimeFormat('en-US', { timeZone, month: 'short', year: 'numeric' }).format(d);
      }
      if (tickMarkType === 2) {
        const parts = new Intl.DateTimeFormat('en-GB', { timeZone, year: 'numeric', day: '2-digit', month: '2-digit' }).formatToParts(d);
        const y = parts.find(p => p.type === 'year')?.value;
        const day = parts.find(p => p.type === 'day')?.value;
        const m = parts.find(p => p.type === 'month')?.value;
        return `${day}/${m}/${y}`;
      }
      const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone,
        year: 'numeric',
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: hasSec ? '2-digit' : undefined,
        hour12: false,
      }).formatToParts(d);
      const y = parts.find(p => p.type === 'year')?.value;
      const day = parts.find(p => p.type === 'day')?.value;
      const m = parts.find(p => p.type === 'month')?.value;
      const hr = parts.find(p => p.type === 'hour')?.value;
      const min = parts.find(p => p.type === 'minute')?.value;
      const sec = parts.find(p => p.type === 'second')?.value;
      return hasSec && sec ? `${day}/${m}/${y} ${hr}:${min}:${sec}` : `${day}/${m}/${y} ${hr}:${min}`;
    }

    if (formatId.startsWith('datetime_us')) {
      if (tickMarkType === 0) {
        return new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric' }).format(d);
      }
      if (tickMarkType === 1) {
        return new Intl.DateTimeFormat('en-US', { timeZone, month: 'short', year: 'numeric' }).format(d);
      }
      if (tickMarkType === 2) {
        const parts = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(d);
        const y = parts.find(p => p.type === 'year')?.value;
        const m = parts.find(p => p.type === 'month')?.value;
        const day = parts.find(p => p.type === 'day')?.value;
        return `${m}/${day}/${y}`;
      }
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: hasSec ? '2-digit' : undefined,
        hour12: false,
      }).formatToParts(d);
      const y = parts.find(p => p.type === 'year')?.value;
      const m = parts.find(p => p.type === 'month')?.value;
      const day = parts.find(p => p.type === 'day')?.value;
      const hr = parts.find(p => p.type === 'hour')?.value;
      const min = parts.find(p => p.type === 'minute')?.value;
      const sec = parts.find(p => p.type === 'second')?.value;
      return hasSec && sec ? `${m}/${day}/${y} ${hr}:${min}:${sec}` : `${m}/${day}/${y} ${hr}:${min}`;
    }

    if (formatId.startsWith('datetime_full')) {
      if (tickMarkType === 0) {
        return new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric' }).format(d);
      }
      if (tickMarkType === 1) {
        return new Intl.DateTimeFormat('en-US', { timeZone, month: 'short', year: 'numeric' }).format(d);
      }
      if (tickMarkType === 2) {
        const parts = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', day: 'numeric', month: 'short' }).formatToParts(d);
        const y = parts.find(p => p.type === 'year')?.value;
        const day = parts.find(p => p.type === 'day')?.value;
        const m = parts.find(p => p.type === 'month')?.value;
        return `${day} ${m} ${y}`;
      }
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone,
        year: 'numeric',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        second: hasSec ? '2-digit' : undefined,
        hour12: false,
      }).formatToParts(d);
      const y = parts.find(p => p.type === 'year')?.value;
      const day = parts.find(p => p.type === 'day')?.value;
      const m = parts.find(p => p.type === 'month')?.value;
      const hr = parts.find(p => p.type === 'hour')?.value;
      const min = parts.find(p => p.type === 'minute')?.value;
      const sec = parts.find(p => p.type === 'second')?.value;
      return hasSec && sec ? `${day} ${m} ${y} ${hr}:${min}:${sec}` : `${day} ${m} ${y} ${hr}:${min}`;
    }

    if (formatId.startsWith('datetime_short')) {
      if (tickMarkType === 0) {
        return new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric' }).format(d);
      }
      if (tickMarkType === 1) {
        return new Intl.DateTimeFormat('en-US', { timeZone, month: 'short', year: 'numeric' }).format(d);
      }
      if (tickMarkType === 2) {
        return new Intl.DateTimeFormat('en-US', { timeZone, day: 'numeric', month: 'short' }).format(d);
      }
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone,
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        second: hasSec ? '2-digit' : undefined,
        hour12: false,
      }).formatToParts(d);
      const day = parts.find(p => p.type === 'day')?.value;
      const m = parts.find(p => p.type === 'month')?.value;
      const hr = parts.find(p => p.type === 'hour')?.value;
      const min = parts.find(p => p.type === 'minute')?.value;
      const sec = parts.find(p => p.type === 'second')?.value;
      return hasSec && sec ? `${day} ${m} ${hr}:${min}:${sec}` : `${day} ${m} ${hr}:${min}`;
    }

    if (formatId.startsWith('time_12h')) {
      if (tickMarkType === 0) return new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric' }).format(d);
      if (tickMarkType === 1) return new Intl.DateTimeFormat('en-US', { timeZone, month: 'short' }).format(d);
      if (tickMarkType === 2) return new Intl.DateTimeFormat('en-US', { timeZone, day: 'numeric', month: 'short' }).format(d);
      return new Intl.DateTimeFormat('en-US', {
        timeZone,
        hour: '2-digit',
        minute: '2-digit',
        second: hasSec ? '2-digit' : undefined,
        hour12: true,
      }).format(d);
    }

    if (formatId.startsWith('time_24h')) {
      if (tickMarkType === 0) return new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric' }).format(d);
      if (tickMarkType === 1) return new Intl.DateTimeFormat('en-US', { timeZone, month: 'short' }).format(d);
      if (tickMarkType === 2) {
        // Show Day & Time so time is never hidden on day boundary
        const day = new Intl.DateTimeFormat('en-US', { timeZone, day: 'numeric', month: 'short' }).format(d);
        const timeStr = new Intl.DateTimeFormat('en-US', { timeZone, hour: '2-digit', minute: '2-digit', second: hasSec ? '2-digit' : undefined, hour12: false }).format(d);
        return `${day} ${timeStr}`;
      }
      return new Intl.DateTimeFormat('en-US', {
        timeZone,
        hour: '2-digit',
        minute: '2-digit',
        second: hasSec ? '2-digit' : undefined,
        hour12: false,
      }).format(d);
    }

    // Default: Adaptive
    if (tickMarkType === 0) {
      return new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric' }).format(d);
    }
    if (tickMarkType === 1) {
      return new Intl.DateTimeFormat('en-US', { timeZone, month: 'short' }).format(d);
    }
    if (tickMarkType === 2) {
      // Day boundary on intraday trading chart: show Day, Month and Time so user can always see candle time
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone,
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        second: hasSec ? '2-digit' : undefined,
        hour12: false,
      }).formatToParts(d);
      const day = parts.find(p => p.type === 'day')?.value;
      const m = parts.find(p => p.type === 'month')?.value;
      const hr = parts.find(p => p.type === 'hour')?.value;
      const min = parts.find(p => p.type === 'minute')?.value;
      const sec = parts.find(p => p.type === 'second')?.value;
      return hasSec && sec ? `${day} ${m} ${hr}:${min}:${sec}` : `${day} ${m} ${hr}:${min}`;
    }
    if (tickMarkType === 4 || hasSec) {
      return new Intl.DateTimeFormat('en-US', {
        timeZone,
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
    return '';
  }
};

/**
 * Formats a crosshair / candle badge timestamp according to timeframe and target timezone.
 */
export const formatBadgeTimeInTimezone = (
  timeSec: number,
  tf: string,
  timeZone: string = 'UTC',
  formatId: string = 'adaptive',
  showSeconds: boolean = false
): string => {
  try {
    if (formatId && formatId !== 'adaptive') {
      return formatTimeInTimezone(timeSec, timeZone, true, formatId, showSeconds);
    }
    const d = new Date(timeSec * 1000);
    const hasSec = showSeconds || ['1s', '5s', '15s', '30s'].includes(tf);
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
      second: hasSec ? '2-digit' : undefined,
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
