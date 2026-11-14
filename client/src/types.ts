/**
 * Type definitions for EUR/USD Forex Charting & Backtesting Platform.
 */

export interface Candle {
  time: number; // Unix seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export type ChartType = 'candlestick' | 'hollow' | 'bar' | 'line' | 'area' | 'baseline';

export type Timeframe =
  | '1s' | '5s' | '15s' | '30s'
  | '1m' | '3m' | '5m' | '15m' | '20m' | '30m' | '45m'
  | '1h' | '2h' | '3h' | '4h'
  | '1D' | '1W' | '1M'
  | (string & {});

export interface Quote {
  symbol: string;
  bid: number;
  ask: number;
  spread: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  timestamp: number;
  status: 'LIVE' | 'DELAYED' | 'HISTORICAL';
  provider: string;
  market_status: 'OPEN' | 'CLOSED_WEEKEND';
  latency_ms?: number;
}

export type MagnetMode = 'off' | 'weak' | 'strong';

export type DrawingToolType =
  // Cursor
  | 'crosshair' | 'arrow' | 'eraser'
  // Trend line tools
  | 'trendline' | 'horizontal_line' | 'vertical_line' | 'ray' | 'extended_line' | 'horizontal_ray' | 'trend_angle'
  // Channels
  | 'parallel_channel' | 'regression_trend' | 'flat_top_bottom' | 'disjoint_channel'
  // Fibonacci
  | 'fib_retracement' | 'fib_extension' | 'fib_channel' | 'fib_fan' | 'fib_timezones'
  // Geometric
  | 'rectangle' | 'rotated_rectangle' | 'circle' | 'ellipse' | 'triangle' | 'polyline' | 'path' | 'arrow'
  // Annotation
  | 'text' | 'note' | 'price_label' | 'arrow_marker' | 'callout'
  // Trading analysis
  | 'long_position' | 'short_position' | 'price_range' | 'date_range' | 'date_price_range' | 'measure';

export interface Point {
  time: number;
  price: number;
}

export interface FibLevel {
  level: number;
  color: string;
  visible: boolean;
}

export interface DrawingProperties {
  color?: string;
  fillColor?: string;
  fillOpacity?: number;
  strokeWidth?: number;
  lineStyle?: 'solid' | 'dashed' | 'dotted';
  text?: string;
  fontSize?: number;
  // For Long/Short position
  entryPrice?: number;
  slPrice?: number;
  tpPrice?: number;
  riskReward?: number;
  lotSize?: number;
  // For Fibonacci tools
  fibLevels?: FibLevel[];
  extendLinesLeft?: boolean;
  extendLinesRight?: boolean;
  showPrices?: boolean;
  showLevels?: boolean;
  fillBackground?: boolean;
}

export interface DrawingObject {
  id: string;
  type: DrawingToolType;
  timeframe: string;
  points: Point[];
  properties: DrawingProperties;
  locked: boolean;
  hidden: boolean;
  created_at: number;
  updated_at: number;
}

export interface IndicatorConfig {
  id: string;
  type:
    | 'SMA' | 'EMA' | 'VWAP' | 'BB' | 'RSI' | 'MACD'
    | 'STOCH' | 'ATR' | 'ADX' | 'CCI' | 'WILLIAMS_R'
    | 'ICHIMOKU' | 'PSAR' | 'SUPERTREND' | 'VOLUME'
    | 'SESSIONS';
  name: string;
  visible: boolean;
  color: string;
  secondaryColor?: string;
  lineWidth?: number;
  params: Record<string, number | string>;
  isOverlay: boolean; // Overlay on main chart or separate panel
}

export interface Trade {
  id: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  order_type?: 'MARKET' | 'BUY_LIMIT' | 'SELL_LIMIT' | 'BUY_STOP' | 'SELL_STOP';
  entry_time: number;
  entry_price: number;
  limit_price?: number | null;
  stop_price?: number | null;
  exit_time?: number | null;
  exit_price?: number | null;
  sl?: number | null;
  tp?: number | null;
  lot_size: number;
  risk_usd?: number | null;
  pnl?: number | null;
  pnl_pips?: number | null;
  commission?: number | null;
  spread_cost?: number | null;
  slippage_cost?: number | null;
  r_multiple?: number | null;
  status: 'PENDING' | 'OPEN' | 'CLOSED' | 'CANCELLED';
  notes?: string;
  exit_reason?: 'TP' | 'SL' | 'MANUAL' | 'CANCELLED' | null;
}

export interface UserSettings {
  initial_balance: number;
  account_currency: string;
  default_risk_percent: number;
  default_lot_size: number;
  spread_pips: number;
  commission_per_lot: number;
  slippage_pips: number;
  active_provider: string;
  twelvedata_api_key?: string;
  finnhub_api_key?: string;
  timezone: string;
  theme: string;
  conservative_execution?: boolean;
}

export type ReplayMode = 'candle' | 'intrabar' | 'tick';

export interface ReplayState {
  active: boolean;
  isPlaying: boolean;
  currentIndex: number;
  intrabarPhase: number; // 0=Open, 1=High/Low, 2=Low/High, 3=Close
  mode: ReplayMode;
  speed: number; // 0.5, 1, 2, 5, 10, 20
  startTime: number | null;
  totalCandles: number;
}

export interface ForexSession {
  id: string;
  name: string;
  start_utc: string;
  end_utc: string;
  is_active: boolean;
  color: string;
  enabled: boolean;
}

export interface DraggableTradeSetup {
  active: boolean;
  type: 'BUY' | 'SELL';
  order_type?: 'MARKET' | 'BUY_LIMIT' | 'SELL_LIMIT' | 'BUY_STOP' | 'SELL_STOP';
  entryPrice: number;
  slPrice: number;
  tpPrice: number;
  startTime?: number;
  endTime?: number;
  lotSize: number;
  riskUsd: number;
  rewardUsd: number;
  riskReward: number;
  sizingMode?: 'risk_percent' | 'lot_size';
  riskPercent?: number;
  notes?: string;
}

export interface BacktestSession {
  session_id: string;
  name: string;
  created_at: number;
  updated_at: number;
  timeframe: string;
  replay_timestamp?: number | null;
  trades: Trade[];
  drawings: DrawingObject[];
  settings?: UserSettings;
}

export interface DataValidationReport {
  symbol: string;
  timeframe: string;
  total_candles: number;
  start_time?: number | null;
  end_time?: number | null;
  is_valid: boolean;
  missing_timestamps_count: number;
  duplicate_timestamps_count: number;
  invalid_ohlc_count: number;
  gap_count: number;
  weekend_gaps_identified: number;
  errors: string[];
  warnings: string[];
}

export type NewsImpact = 'HIGH' | 'MEDIUM' | 'LOW';

export interface EconomicNewsEvent {
  id: string;
  time: number;          // Unix timestamp in seconds
  currency: 'USD' | 'EUR';
  title: string;         // e.g. "Non-Farm Employment Change", "CPI m/m"
  impact: NewsImpact;    // 'HIGH' (Red) | 'MEDIUM' (Yellow/Orange)
  actual?: string;       // e.g. "254K"
  forecast?: string;     // e.g. "175K"
  previous?: string;     // e.g. "159K"
  sentiment?: 'BULLISH' | 'BEARISH' | 'NEUTRAL'; // Relative to EUR/USD
  description?: string;
}
