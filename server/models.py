"""
Data models for EUR/USD Forex Charting & Backtesting Platform.
"""
from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field

class Candle(BaseModel):
    time: int = Field(..., description="Unix timestamp in seconds")
    open: float
    high: float
    low: float
    close: float
    volume: Optional[float] = 0.0

class Tick(BaseModel):
    time: float = Field(..., description="Unix timestamp with sub-second precision")
    bid: float
    ask: float
    spread: float
    volume: Optional[float] = 1.0

class Quote(BaseModel):
    symbol: str = "EUR/USD"
    bid: float
    ask: float
    spread: float = Field(..., description="Spread in pips (1 pip = 0.0001)")
    change: float
    changePercent: float
    high: float
    low: float
    timestamp: int
    status: Literal["LIVE", "DELAYED", "HISTORICAL"] = "LIVE"
    provider: str = "Yahoo Finance (Interbank)"
    market_status: Literal["OPEN", "CLOSED_WEEKEND"] = "OPEN"
    latency_ms: Optional[int] = 45

class Trade(BaseModel):
    id: str
    symbol: str = "EUR/USD"
    type: Literal["BUY", "SELL"]
    order_type: Literal["MARKET", "BUY_LIMIT", "SELL_LIMIT", "BUY_STOP", "SELL_STOP"] = "MARKET"
    entry_time: int
    entry_price: float
    limit_price: Optional[float] = None
    stop_price: Optional[float] = None
    exit_time: Optional[int] = None
    exit_price: Optional[float] = None
    sl: Optional[float] = None
    tp: Optional[float] = None
    lot_size: float = 1.0
    risk_usd: Optional[float] = None
    pnl: Optional[float] = None
    pnl_pips: Optional[float] = None
    commission: Optional[float] = None
    spread_cost: Optional[float] = None
    slippage_cost: Optional[float] = None
    r_multiple: Optional[float] = None
    status: Literal["PENDING", "OPEN", "CLOSED", "CANCELLED"] = "OPEN"
    notes: Optional[str] = ""
    exit_reason: Optional[Literal["TP", "SL", "MANUAL", "CANCELLED"]] = None

class DrawingObject(BaseModel):
    id: str
    type: str  # 'trendline', 'horizontal_line', 'rectangle', 'fibonacci_retrace', 'long_position', etc.
    timeframe: str = "1h"
    points: List[Dict[str, Any]]  # [{"time": int, "price": float}]
    properties: Dict[str, Any] = Field(default_factory=dict)
    locked: bool = False
    hidden: bool = False
    created_at: int
    updated_at: int

class UserSettings(BaseModel):
    initial_balance: float = 10000.0
    account_currency: str = "USD"
    default_risk_percent: float = 1.0
    default_lot_size: float = 1.0
    spread_pips: float = 1.2
    commission_per_lot: float = 3.50
    slippage_pips: float = 0.2
    active_provider: str = "yahoo"
    twelvedata_api_key: Optional[str] = ""
    finnhub_api_key: Optional[str] = ""
    timezone: str = "UTC"
    theme: str = "dark"
    conservative_execution: bool = True  # If true, assume SL was hit first when both SL & TP touched in same candle

class TradingSessionInfo(BaseModel):
    name: str
    start_utc: str
    end_utc: str
    is_active: bool
    color: str
    high: Optional[float] = None
    low: Optional[float] = None

class DataValidationReport(BaseModel):
    symbol: str = "EUR/USD"
    timeframe: str
    total_candles: int
    start_time: Optional[int] = None
    end_time: Optional[int] = None
    is_valid: bool
    missing_timestamps_count: int
    duplicate_timestamps_count: int
    invalid_ohlc_count: int
    gap_count: int
    weekend_gaps_identified: int
    errors: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)

class BacktestSession(BaseModel):
    session_id: str
    name: str
    created_at: int
    updated_at: int
    timeframe: str = "1h"
    replay_timestamp: Optional[int] = None
    trades: List[Trade] = Field(default_factory=list)
    drawings: List[DrawingObject] = Field(default_factory=list)
    settings: Optional[UserSettings] = None
