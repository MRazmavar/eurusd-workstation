"""
Candle resampling engine for converting high-frequency base candles to higher timeframes.
"""
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
    "30m": 1800,
    "45m": 2700,
    "1h": 3600,
    "2h": 7200,
    "4h": 14400,
    "1d": 86400,
    "1D": 86400,
    "1w": 604800,
    "1W": 604800,
    "1mo": 2592000,
    "1M": 2592000,
}

def resample_candles(candles: List[Candle], target_timeframe: str) -> List[Candle]:
    """
    Resamples a sorted list of candles to the specified target timeframe.
    """
    target_sec = TIMEFRAME_SECONDS.get(target_timeframe)
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
