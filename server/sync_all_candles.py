import sys
import os
import time

sys.path.insert(0, os.path.dirname(__file__))

from services.dukascopy_provider import DukascopyProvider
import database

provider = DukascopyProvider()
timeframes = ['1m', '5m', '15m', '30m', '1h', '4h', '1D']

print("Starting Dukascopy sync...")
for tf in timeframes:
    t0 = time.time()
    candles = provider.fetch_historical_candles(tf)
    elapsed = time.time() - t0
    if candles:
        database.save_candles_to_cache('EUR/USD', tf, candles)
        first_str = time.strftime('%Y-%m-%d %H:%M', time.gmtime(candles[0].time))
        last_str = time.strftime('%Y-%m-%d %H:%M', time.gmtime(candles[-1].time))
        print(f"[{tf}] Synced {len(candles)} candles ({elapsed:.1f}s): {first_str} -> {last_str}")
    else:
        print(f"[{tf}] Failed or 0 candles returned ({elapsed:.1f}s)")

print("Dukascopy sync complete!")
