"""
Backend Unit and Integration Test Suite.
Tests Data Integrity Validator, Session Persistence, Trade Management, and Resampling.
"""
import sys
import os
import unittest
import time

sys.path.insert(0, os.path.dirname(__file__))

from models import Candle, Trade, DrawingObject, UserSettings, BacktestSession
from services.resampler import resample_candles
from services.dukascopy_provider import DukascopyProvider
from services.market_data_service import market_data_service
from services.data_validator import DataValidator
import database

class TestBackend(unittest.TestCase):
    def test_database_trades(self):
        trade = Trade(
            id="test_tr_001",
            symbol="EUR/USD",
            type="BUY",
            order_type="MARKET",
            entry_time=int(time.time()),
            entry_price=1.11500,
            sl=1.11200,
            tp=1.12100,
            lot_size=1.0,
            risk_usd=300.0,
            pnl=600.0,
            pnl_pips=60.0,
            commission=3.5,
            spread_cost=12.0,
            r_multiple=2.0,
            status="CLOSED",
            notes="Testing London breakout"
        )
        saved = database.save_trade(trade)
        self.assertEqual(saved.id, "test_tr_001")
        
        all_trades = database.get_all_trades()
        self.assertTrue(any(t.id == "test_tr_001" for t in all_trades))
        
        deleted = database.delete_trade("test_tr_001")
        self.assertTrue(deleted)

    def test_sessions_persistence(self):
        session = BacktestSession(
            session_id="sess_test_001",
            name="London Breakout Strategy Backtest",
            created_at=int(time.time()),
            updated_at=int(time.time()),
            timeframe="15m",
            trades=[],
            drawings=[]
        )
        saved = database.save_session(session)
        self.assertEqual(saved.session_id, "sess_test_001")

        sessions_list = database.list_sessions()
        self.assertTrue(any(s["id"] == "sess_test_001" for s in sessions_list))

        loaded = database.get_session("sess_test_001")
        self.assertIsNotNone(loaded)
        self.assertEqual(loaded.name, "London Breakout Strategy Backtest")

        database.delete_session("sess_test_001")

    def test_data_validator_integrity(self):
        # Valid series
        c1 = Candle(time=1000, open=1.1000, high=1.1050, low=1.0990, close=1.1020, volume=100)
        c2 = Candle(time=4600, open=1.1020, high=1.1080, low=1.1010, close=1.1060, volume=150)
        report = DataValidator.validate_candles([c1, c2], "1h")
        self.assertTrue(report.is_valid)
        self.assertEqual(report.invalid_ohlc_count, 0)

        # Series with invalid OHLC (High < Low)
        c_invalid = Candle(time=8200, open=1.1060, high=1.1000, low=1.1080, close=1.1050, volume=200)
        report_bad = DataValidator.validate_candles([c1, c2, c_invalid], "1h")
        self.assertFalse(report_bad.is_valid)
        self.assertGreater(report_bad.invalid_ohlc_count, 0)

    def test_resampler(self):
        c1 = Candle(time=0, open=1.1000, high=1.1050, low=1.0990, close=1.1020, volume=100)
        c2 = Candle(time=60, open=1.1020, high=1.1080, low=1.1010, close=1.1060, volume=150)
        c3 = Candle(time=120, open=1.1060, high=1.1070, low=1.1040, close=1.1050, volume=200)
        
        res = resample_candles([c1, c2, c3], "3m")
        self.assertEqual(len(res), 1)
        self.assertEqual(res[0].open, 1.1000)
        self.assertEqual(res[0].high, 1.1080)
        self.assertEqual(res[0].low, 1.0990)
        self.assertEqual(res[0].close, 1.1050)
        self.assertEqual(res[0].volume, 450.0)

    def test_dukascopy_provider(self):
        provider = DukascopyProvider()
        quote = provider.get_latest_quote()
        self.assertEqual(quote.symbol, "EUR/USD")
        self.assertIn("Dukascopy", quote.provider)
        self.assertGreater(quote.bid, 1.0)
        self.assertGreater(quote.ask, quote.bid)
        print(f"\n[Dukascopy Provider Live Quote]: Bid={quote.bid} Ask={quote.ask} Spread={quote.spread} Provider={quote.provider}")

    def test_market_data_validation_endpoint(self):
        report = market_data_service.validate_data("1h", "5d")
        self.assertEqual(report.symbol, "EUR/USD")
        self.assertGreater(report.total_candles, 50)
        print(f"\n[Data Validation Report]: Total={report.total_candles} Valid={report.is_valid} InvalidOHLC={report.invalid_ohlc_count} WeekendGaps={report.weekend_gaps_identified}")

if __name__ == "__main__":
    unittest.main()
