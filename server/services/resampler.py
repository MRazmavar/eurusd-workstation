"""
Candle resampling engine for converting high-frequency base candles to higher timeframes.
Supports arbitrary custom timeframes (e.g. 20m, 20, 2h, 45s, 3d, 1w).
"""
import re
from typing import List, Dict
from models import Candle

TIMEFRAME_SECONDS: Dict[str, int] = {
    "1s": 1,
    "5s": 5,
    "15s": 15,
    "30s": 30,
    "1m": 60,
    "3m": 180,
    "5m": 300,
    "15m": 900,
    "20m": 1200,
    "30m": 1800,
    "45m": 2700,
    "1h": 3600,
    "2h": 7200,
    "3h": 10800,
    "4h": 14400,
    "6h": 21600,
    "8h": 28800,
    "12h": 43200,
    "1d": 86400,
    "1D": 86400,
    "2d": 172800,
    "3d": 259200,
    "1w": 604800,
    "1W": 604800,
    "1mo": 2592000,
    "1M": 2592000,
}

def parse_timeframe_seconds(tf: str) -> int:
    """
    Parses any timeframe string into total seconds.
    - Pure integer digits (e.g. '20', '5', '120'): defaults to minutes (TradingView standard).
    - Seconds: '15s', '45s' -> 15, 45
    - Minutes: '20m', '3m', '5m', '45m' -> 1200, 180, 300, 2700
    - Hours: '1h', '2h', '3h', '4h' -> 3600, 7200, 10800, 14400
    - Days: '1d', '1D', '3d' -> 86400, 86400, 259200
    - Weeks: '1w', '1W', '2w' -> 604800, 604800, 1209600
    - Months: '1mo', '1M', '3mo' -> 2592000, 2592000, 7776000
    """
    if not tf:
        return 3600
    tf_str = tf.strip()

    # Static dictionary fast path
    if tf_str in TIMEFRAME_SECONDS:
        return TIMEFRAME_SECONDS[tf_str]

    # Pure numeric digits -> default to minutes (e.g., '20' -> 20 minutes)
    if tf_str.isdigit():
        val = int(tf_str)
        return max(1, val) * 60

    # Match number + unit suffix
    match = re.match(r"^(\d+)\s*([a-zA-Z]+)$", tf_str)
    if match:
        val = int(match.group(1))
        unit = match.group(2).lower()
        if unit in ["s", "sec", "secs", "second", "seconds"]:
            return max(1, val)
        elif unit in ["m", "min", "mins", "minute", "minutes"]:
            return max(1, val) * 60
        elif unit in ["h", "hr", "hrs", "hour", "hours"]:
            return max(1, val) * 3600
        elif unit in ["d", "day", "days"]:
            return max(1, val) * 86400
        elif unit in ["w", "wk", "wks", "week", "weeks"]:
            return max(1, val) * 604800
        elif unit in ["mo", "month", "months"] or match.group(2) == "M":
            return max(1, val) * 2592000

    return 3600

def resample_candles(candles: List[Candle], target_timeframe: str) -> List[Candle]:
    """
    Resamples a sorted list of candles to the specified target timeframe.
    """
    target_sec = parse_timeframe_seconds(target_timeframe)
    if not target_sec or not candles:
        return candles

    # Group into time buckets
    buckets: Dict[int, List[Candle]] = {}
    for c in candles:
        bucket_time = (c.time // target_sec) * target_sec
        if bucket_time not in buckets:
            buckets[bucket_time] = []
        buckets[bucket_time].append(c)

    resampled: List[Candle] = []
    for bucket_time in sorted(buckets.keys()):
        group = buckets[bucket_time]
        if not group:
            continue
        
        open_val = group[0].open
        close_val = group[-1].close
        high_val = max(c.high for c in group)
        low_val = min(c.low for c in group)
        vol_val = sum((c.volume or 0.0) for c in group)

        resampled.append(Candle(
            time=bucket_time,
            open=round(open_val, 5),
            high=round(high_val, 5),
            low=round(low_val, 5),
            close=round(close_val, 5),
            volume=round(vol_val, 2)
        ))

    return resampled
