---
title: EUR USD Workstation
emoji: 📊
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 7860
pinned: false
---

# Professional EUR/USD Forex Charting & Backtesting Platform

A high-performance, browser-based Forex charting workstation and manual backtesting suite dedicated exclusively to **EUR/USD**, built to replicate the TradingView desktop experience.

![Workstation Preview](file:///C:/Users/moham/.gemini/antigravity/brain/7a304e26-ed66-4949-8d2a-5874b8c819e9/workstation_preview.png)

---

## Key Capabilities

1. **Dedicated EUR/USD Focus**:
   - 5-decimal high-precision price feeds (`1.11424`).
   - Pip calculation (1 pip = `0.0001`, $10/pip per standard lot).
   - Realistic bid/ask spread modeling (default 1.2 pips), commission ($3.50/lot round-turn), and simulated slippage.
   - Interbank market status awareness (detects Friday 22:00 UTC interbank weekend closure).

2. **Authentic Market Data (Zero Fake Candles)**:
   - Zero-config real historical OHLCV data from Yahoo Finance interbank feed.
   - Real-time WebSocket streaming (`/ws/market`) pushing live quotes and latency metrics.
   - Dynamic timeframe resampling (1s, 5s, 15s, 30s, 1m, 3m, 5m, 15m, 30m, 45m, 1h, 2h, 4h, 1D, 1W, 1M).
   - Pluggable provider architecture with support for Twelve Data and Finnhub WebSocket feeds via Settings.

3. **TradingView-Grade Charting Engine**:
   - Powered by TradingView Lightweight Charts v5.
   - Chart styles: Candlestick, Hollow Candles, Bars (OHLC), Line, Area, Baseline.
   - Crosshairs, mouse-wheel zoom, pan, auto-scale, reset, fit all data, and responsive layout.

4. **Complete TradingView Drawing Suite**:
   - Cursor tools: Crosshair, Arrow, Eraser.
   - Trend lines: Trend Line, Horizontal Line with price tag, Vertical Line, Ray, Extended Line, Trend Angle.
   - Channels: Parallel Channel with shaded area, Regression Trend, Flat Top/Bottom.
   - Fibonacci: Retracement (0.236, 0.382, 0.5, 0.618, 0.786, 1.0, 1.618) with color bands, Extension, Fan, Time Zones.
   - Geometric shapes: Rectangle, Circle/Ellipse, Triangle, Polyline.
   - Annotations: Text, Note, Price Label, Arrow Marker, Callout.
   - Trading tools: Long Position and Short Position with target/stop zones and dynamic Risk/Reward badges, Measure tool, Price Range.
   - Interactive Object Tree panel for reordering, locking, hiding, and deleting objects.
   - Drawings persist across timeframe switches and browser sessions.

5. **Historical Bar Replay (Zero Look-Ahead Bias)**:
   - Select any historical candle to begin replaying market price action.
   - Future candles remain strictly masked from the chart.
   - Replay controls: Play/Pause (Spacebar), Step Next (`ArrowRight`), Step Back (`ArrowLeft`), Step Multiple (+5 candles), Speed selector (0.5x, 1x, 2x, 5x, 10x, 20x), Restart, and Exit.

6. **Interactive Simulated Trade Execution**:
   - Place manual BUY/LONG and SELL/SHORT market orders.
   - Configure lot size, Stop Loss (pips/price), Take Profit (pips/price), and trade setup rationale notes.
   - Automatic SL/TP triggers evaluated against each replayed candle's high/low.
   - Draggable SL/TP levels directly on the chart.
   - Position tracking with real-time unrealized PnL.

7. **Quantitative Backtesting Analytics**:
   - Performance metrics: Net Profit ($ and pips), Win Rate %, Profit Factor, Max Drawdown %/$, Average R:R, Expectancy per trade, Average Winning/Losing trade, Longs vs Shorts breakdown, Average Holding Time.
   - Interactive SVG Equity and Balance Curves.
   - Filterable Trade History log with CSV export capability.

8. **Forex Trading Sessions**:
   - Overlays for Asian (Tokyo), London, New York, and London/NY overlap sessions with active time indicators.

---

## Architecture

- **Backend**: Python 3, FastAPI, Uvicorn, SQLite (`workstation.db`), WebSocket streaming, Yahoo Finance real-data provider with multi-timeframe resampler.
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, TradingView Lightweight Charts v5, Lucide React.

---

## Running the Platform

### 1. Start the Backend Server
```bash
cd server
python -m uvicorn main:app --host 127.0.0.1 --port 8008 --reload
```

### 2. Start the Frontend Development Client
```bash
cd client
npm run dev
```

Open your browser at **http://127.0.0.1:5173** to access the workstation.
