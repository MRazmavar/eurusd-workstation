"""
Data Integrity and Validation Engine for Historical EUR/USD Market Data.
Validates OHLC consistency, chronological ordering, gaps, weekend closures, and duplicates.
"""
from typing import List, Dict, Any, Tuple
import datetime
from models import Candle, DataValidationReport
from services.resampler import TIMEFRAME_SECONDS

class DataValidator:
    @staticmethod
    def is_weekend_gap(t_start: int, t_end: int) -> bool:
        """
        Determines if a gap between two timestamps corresponds to normal Forex weekend closure.
        Forex interbank market closes Friday 22:00 UTC and reopens Sunday 22:00 UTC (~48 hours).
        """
        dt_start = datetime.datetime.fromtimestamp(t_start, tz=datetime.timezone.utc)
        dt_end = datetime.datetime.fromtimestamp(t_end, tz=datetime.timezone.utc)
        
        # Starts on Friday afternoon/evening (weekday 4) and resumes Sunday evening/Monday (weekday 6 or 0)
        gap_hours = (t_end - t_start) / 3600.0
        if 40.0 <= gap_hours <= 54.0:
            if dt_start.weekday() == 4 and (dt_end.weekday() in (6, 0)):
                return True
        return False

    @classmethod
    def validate_candles(cls, candles: List[Candle], timeframe: str) -> DataValidationReport:
        expected_interval_sec = TIMEFRAME_SECONDS.get(timeframe, 3600)
        total = len(candles)
        
        if total == 0:
            return DataValidationReport(
                timeframe=timeframe,
                total_candles=0,
                is_valid=False,
                missing_timestamps_count=0,
                duplicate_timestamps_count=0,
                invalid_ohlc_count=0,
                gap_count=0,
                weekend_gaps_identified=0,
                errors=["Dataset is empty. No historical candles provided."]
            )

        errors: List[str] = []
        warnings: List[str] = []
        seen_timestamps = set()
        duplicates_count = 0
        invalid_ohlc_count = 0
        gap_count = 0
        weekend_gaps_count = 0
        missing_count = 0

        prev_time: Optional[int] = None

        for idx, c in enumerate(candles):
            # 1. Check for duplicates and timestamp ordering
            if c.time in seen_timestamps:
                duplicates_count += 1
                errors.append(f"Duplicate candle timestamp {c.time} at index {idx}")
            seen_timestamps.add(c.time)

            if prev_time is not None:
                if c.time < prev_time:
                    errors.append(f"Non-chronological order: candle {c.time} appears after {prev_time} at index {idx}")
                elif c.time == prev_time:
                    pass # already recorded in duplicates
                else:
                    gap_sec = c.time - prev_time
                    # If gap is larger than 1.5 * interval
                    if gap_sec > (expected_interval_sec * 1.5):
                        if cls.is_weekend_gap(prev_time, c.time):
                            weekend_gaps_count += 1
                        else:
                            gap_count += 1
                            missing_bars = int(gap_sec // expected_interval_sec) - 1
                            missing_count += missing_bars
                            if missing_bars > 0:
                                warnings.append(
                                    f"Gap of {gap_sec}s (~{missing_bars} missing bars) between "
                                    f"{datetime.datetime.fromtimestamp(prev_time, tz=datetime.timezone.utc).isoformat()} and "
                                    f"{datetime.datetime.fromtimestamp(c.time, tz=datetime.timezone.utc).isoformat()}"
                                )

            # 2. Check OHLC validity
            # High must be >= Low, Open, and Close
            # Low must be <= High, Open, and Close
            if c.high < c.low:
                invalid_ohlc_count += 1
                errors.append(f"Invalid OHLC: High ({c.high}) < Low ({c.low}) at timestamp {c.time}")
            if c.open > c.high or c.open < c.low:
                invalid_ohlc_count += 1
                errors.append(f"Invalid OHLC: Open ({c.open}) outside [Low {c.low}, High {c.high}] at timestamp {c.time}")
            if c.close > c.high or c.close < c.low:
                invalid_ohlc_count += 1
                errors.append(f"Invalid OHLC: Close ({c.close}) outside [Low {c.low}, High {c.high}] at timestamp {c.time}")

            # 3. Check for non-positive or corrupted prices
            if c.open <= 0 or c.high <= 0 or c.low <= 0 or c.close <= 0:
                invalid_ohlc_count += 1
                errors.append(f"Invalid non-positive price at timestamp {c.time}")

            # 4. Check for extreme unrealistic EUR/USD anomalies (EUR/USD historically ranges between 0.80 and 1.60)
            if not (0.70 <= c.low <= 1.80 and 0.70 <= c.high <= 1.80):
                warnings.append(f"Suspicious EUR/USD price range at timestamp {c.time}: [{c.low}, {c.high}]")

            prev_time = c.time

        is_valid = (duplicates_count == 0 and invalid_ohlc_count == 0 and len(errors) == 0)

        return DataValidationReport(
            symbol="EUR/USD",
            timeframe=timeframe,
            total_candles=total,
            start_time=candles[0].time if candles else None,
            end_time=candles[-1].time if candles else None,
            is_valid=is_valid,
            missing_timestamps_count=missing_count,
            duplicate_timestamps_count=duplicates_count,
            invalid_ohlc_count=invalid_ohlc_count,
            gap_count=gap_count,
            weekend_gaps_identified=weekend_gaps_count,
            errors=errors[:50], # capped to prevent payload explosion
            warnings=warnings[:50]
        )

    @classmethod
    def clean_and_repair_candles(cls, candles: List[Candle]) -> List[Candle]:
        """
        Deduplicates, sorts chronologically, and cleans any corrupted candles.
        """
        if not candles:
            return []

        # Deduplicate keeping earliest occurrence
        by_time: Dict[int, Candle] = {}
        for c in candles:
            if c.time not in by_time:
                # Sanitize high/low
                h = max(c.high, c.open, c.close)
                l = min(c.low, c.open, c.close)
                by_time[c.time] = Candle(
                    time=c.time,
                    open=round(c.open, 5),
                    high=round(h, 5),
                    low=round(l, 5),
                    close=round(c.close, 5),
                    volume=c.volume or 0.0
                )

        cleaned = [by_time[t] for t in sorted(by_time.keys())]
        return cleaned
