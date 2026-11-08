"""
FastAPI Server for EUR/USD Professional Charting & Backtesting Platform.
"""
import asyncio
from contextlib import asynccontextmanager
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from models import (
    Candle, Quote, Trade, DrawingObject, UserSettings,
    TradingSessionInfo, DataValidationReport, BacktestSession,
    EconomicNewsEvent
)
from services.market_data_service import market_data_service
from services.session_manager import get_current_sessions
from services.economic_calendar import get_economic_events
import database

# Background worker for real-time market data streaming
async def market_streaming_worker():
    while True:
        try:
            await market_data_service.broadcast_tick()
        except Exception as e:
            print(f"[Streaming Worker Error]: {e}")
        await asyncio.sleep(2.0)

@asynccontextmanager
async def lifespan(app: FastAPI):
    streaming_task = asyncio.create_task(market_streaming_worker())
    yield
    streaming_task.cancel()
    try:
        await streaming_task
    except asyncio.CancelledError:
        pass

app = FastAPI(
    title="EUR/USD Workstation API",
    description="Professional EUR/USD Forex Charting & Backtesting Backend",
    version="2.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------- HEALTH & MARKET STATUS -----------------

@app.get("/api/health")
def health_check():
    quote = market_data_service.get_latest_quote()
    return {
        "status": "online",
        "symbol": "EUR/USD",
        "feed_status": quote.status,
        "market_status": quote.market_status,
        "provider": quote.provider,
        "active_ws_clients": len(market_data_service.active_connections)
    }

@app.get("/api/market/quote", response_model=Quote)
def get_quote():
    return market_data_service.get_latest_quote()

@app.get("/api/market/candles", response_model=List[Candle])
def get_candles(
    timeframe: str = Query("1h", description="Candle timeframe e.g. 1m, 5m, 15m, 1h, 1d"),
    range: Optional[str] = Query(None, description="Time range e.g. 1d, 5d, 1mo, 1y, 5y, max"),
    start_time: Optional[int] = Query(None, description="Optional start unix timestamp for incremental pagination"),
    end_time: Optional[int] = Query(None, description="Optional end unix timestamp for incremental pagination"),
    limit: Optional[int] = Query(None, description="Optional maximum candle limit")
):
    try:
        candles = market_data_service.get_candles(
            timeframe=timeframe,
            range_str=range,
            start_time=start_time,
            end_time=end_time,
            limit=limit
        )
        return candles
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch market candles: {str(e)}")

@app.get("/api/market/validate", response_model=DataValidationReport)
def validate_market_data(
    timeframe: str = Query("1h", description="Candle timeframe to audit"),
    range: Optional[str] = Query(None, description="Time range to audit")
):
    try:
        report = market_data_service.validate_data(timeframe=timeframe, range_str=range)
        return report
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to validate market data: {str(e)}")

@app.get("/api/market/sessions", response_model=List[TradingSessionInfo])
def get_sessions():
    return get_current_sessions()

@app.get("/api/market/news", response_model=List[EconomicNewsEvent])
def get_news(
    start_time: int = Query(..., description="Start epoch timestamp in seconds"),
    end_time: int = Query(..., description="End epoch timestamp in seconds"),
    min_impact: Optional[str] = Query(None, description="Optional minimum impact filter e.g. HIGH, MEDIUM")
):
    try:
        return get_economic_events(start_time=start_time, end_time=end_time, min_impact=min_impact)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch economic events: {str(e)}")

# ----------------- TRADES (BACKTESTING) -----------------

@app.get("/api/trades", response_model=List[Trade])
def list_trades():
    return database.get_all_trades()

@app.post("/api/trades", response_model=Trade)
def create_or_update_trade(trade: Trade):
    return database.save_trade(trade)

@app.delete("/api/trades/{trade_id}")
def remove_trade(trade_id: str):
    success = database.delete_trade(trade_id)
    if not success:
        raise HTTPException(status_code=404, detail="Trade not found")
    return {"success": True, "id": trade_id}

# ----------------- DRAWINGS -----------------

@app.get("/api/drawings", response_model=List[DrawingObject])
def list_drawings():
    return database.get_all_drawings()

@app.post("/api/drawings", response_model=DrawingObject)
def create_or_update_drawing(drawing: DrawingObject):
    return database.save_drawing(drawing)

@app.delete("/api/drawings/{drawing_id}")
def remove_drawing(drawing_id: str):
    success = database.delete_drawing(drawing_id)
    if not success:
        raise HTTPException(status_code=404, detail="Drawing not found")
    return {"success": True, "id": drawing_id}

@app.delete("/api/drawings")
def remove_all_drawings():
    database.clear_all_drawings()
    return {"success": True}

# ----------------- SESSIONS MANAGEMENT -----------------

@app.get("/api/sessions", response_model=List[Dict[str, Any]])
def list_sessions():
    return database.list_sessions()

@app.get("/api/sessions/{session_id}", response_model=BacktestSession)
def fetch_session(session_id: str):
    session = database.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session

@app.post("/api/sessions", response_model=BacktestSession)
def create_or_update_session(session: BacktestSession):
    return database.save_session(session)

@app.delete("/api/sessions/{session_id}")
def remove_session(session_id: str):
    success = database.delete_session(session_id)
    if not success:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"success": True, "id": session_id}

# ----------------- SETTINGS -----------------

@app.get("/api/settings", response_model=UserSettings)
def fetch_settings():
    return database.get_settings()

@app.post("/api/settings", response_model=UserSettings)
def update_settings(settings: UserSettings):
    saved = database.save_settings(settings)
    market_data_service.update_settings(saved)
    return saved

# ----------------- WEBSOCKET FEED -----------------

@app.websocket("/ws/market")
async def websocket_market(websocket: WebSocket):
    await market_data_service.connect_client(websocket)
    try:
        while True:
            msg = await websocket.receive_text()
            if msg == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        market_data_service.disconnect_client(websocket)
    except Exception:
        market_data_service.disconnect_client(websocket)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8008, reload=True)
