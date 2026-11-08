"""
Market Data Service - Provider Abstraction Layer for EUR/USD.
Manages data fetching, database caching, validation, timeframe conversion, and streaming.
"""
import asyncio
import time
from typing import List, Dict, Optional, Set, Tuple
from fastapi import WebSocket
from models import Candle, Quote, UserSettings, DataValidationReport
from services.dukascopy_provider import DukascopyProvider
from services.resampler import resample_candles, parse_timeframe_seconds, TIMEFRAME_SECONDS
from services.data_validator import DataValidator
import database

class MarketDataService:
    def __init__(self):
        self.dukascopy_provider = DukascopyProvider()
        self.active_connections: Set[WebSocket] = set()
        self.candle_cache: Dict[str, List[Candle]] = {}  # memory cache
        self.settings: UserSettings = database.get_settings()

    def update_settings(self, new_settings: UserSettings):
        self.settings = new_settings

    def get_latest_quote(self) -> Quote:
        """Retrieves real-time or latest available interbank quote from Dukascopy Swiss Bank."""
        quote = self.dukascopy_provider.get_latest_quote(spread_pips=self.settings.spread_pips)
        return quote

    def get_candles(
        self,
        timeframe: str = "1h",
        range_str: Optional[str] = None,
        start_time: Optional[int] = None,
        end_time: Optional[int] = None,
        limit: Optional[int] = None
    ) -> List[Candle]:
        """
        Retrieves real historical candles for EUR/USD.
        Checks database cache, fetches from provider if needed, cleans, validates, and persists.
        """
        cache_key = f"{timeframe}_{range_str or 'default'}_{start_time or 0}_{end_time or 0}"
        if cache_key in self.candle_cache:
            return self.candle_cache[cache_key]

        # Determine base timeframe for resampling
        tf_sec = parse_timeframe_seconds(timeframe)
        base_timeframe = timeframe
        need_resample = False

        # Check SQLite persistent cache first if querying a bounded historical range
        if start_time and end_time:
            cached = database.get_cached_candles("EUR/USD", timeframe, start_time, end_time, limit)
            if cached and len(cached) > 50:
                # Cache must actually cover the requested span up to near end_time (allowing for weekend gap)
                tolerance = max(86400 * 3, tf_sec * 5)
                if cached[-1].time >= (end_time - tolerance):
                    self.candle_cache[cache_key] = cached
                    return cached

        if timeframe in ["1s", "5s", "15s", "30s"]:
            base_timeframe = "1m"
            need_resample = False
        elif timeframe in ["1m", "5m", "15m", "30m", "1h", "1D", "1d", "1W", "1w", "1M", "1mo"]:
            base_timeframe = timeframe
            need_resample = False
        elif tf_sec < 60:
            base_timeframe = "1m"
            need_resample = True
        elif tf_sec < 300:
            base_timeframe = "1m"
            need_resample = True
        elif tf_sec < 900:
            base_timeframe = "5m" if (tf_sec % 300 == 0) else "1m"
            need_resample = True
        elif tf_sec < 3600:
            base_timeframe = "5m" if (tf_sec % 300 == 0) else "1m"
            need_resample = True
        elif tf_sec < 86400:
            base_timeframe = "1h"
            need_resample = True
        else:
            base_timeframe = "1D"
            need_resample = True

        raw_candles = self.dukascopy_provider.fetch_historical_candles(
            base_timeframe, range_str=range_str, start_time=start_time, end_time=end_time
        )

        if need_resample and raw_candles:
            processed = resample_candles(raw_candles, timeframe)
        else:
            processed = raw_candles

        # Clean and validate
        processed = DataValidator.clean_and_repair_candles(processed)

        # Cache in SQLite database for offline/instant access
        try:
            database.save_candles_to_cache("EUR/USD", timeframe, processed)
        except Exception:
            pass

        # Cache in memory
        self.candle_cache[cache_key] = processed
        return processed

    def validate_data(self, timeframe: str = "1h", range_str: Optional[str] = None) -> DataValidationReport:
        """
        Audits current historical market data for data integrity, gaps, and invalid OHLC.
        """
        candles = self.get_candles(timeframe, range_str)
        report = DataValidator.validate_candles(candles, timeframe)
        return report

    # WebSocket Real-Time Broadcasting
    async def connect_client(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)
        # Immediately send current quote
        quote = self.get_latest_quote()
        await websocket.send_json({"type": "quote", "data": quote.model_dump()})

    def disconnect_client(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast_tick(self):
        """Broadcasts latest quote to all active client websockets."""
        if not self.active_connections:
            return
        quote = self.get_latest_quote()
        payload = {"type": "quote", "data": quote.model_dump()}
        
        dead_connections = set()
        for ws in self.active_connections:
            try:
                await ws.send_json(payload)
            except Exception:
                dead_connections.add(ws)

        for dead_ws in dead_connections:
            self.disconnect_client(dead_ws)

market_data_service = MarketDataService()
