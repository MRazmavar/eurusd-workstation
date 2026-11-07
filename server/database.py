"""
SQLite Database initialization and storage management for EUR/USD Workstation.
Supports Trades, Drawings, Settings, Historical Candle Caching, and Named Backtesting Sessions.
"""
import sqlite3
import json
import os
from typing import List, Optional, Dict, Any
from models import Trade, DrawingObject, UserSettings, Candle, BacktestSession

DB_PATH = os.path.join(os.path.dirname(__file__), "workstation.db")

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()
    
    # Trades table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS trades (
        id TEXT PRIMARY KEY,
        symbol TEXT NOT NULL,
        type TEXT NOT NULL,
        order_type TEXT NOT NULL DEFAULT 'MARKET',
        entry_time INTEGER NOT NULL,
        entry_price REAL NOT NULL,
        limit_price REAL,
        stop_price REAL,
        exit_time INTEGER,
        exit_price REAL,
        sl REAL,
        tp REAL,
        lot_size REAL NOT NULL,
        risk_usd REAL,
        pnl REAL,
        pnl_pips REAL,
        commission REAL,
        spread_cost REAL,
        slippage_cost REAL,
        r_multiple REAL,
        status TEXT NOT NULL,
        notes TEXT,
        exit_reason TEXT
    )
    """)

    # Check and migrate columns in trades table if needed
    cursor.execute("PRAGMA table_info(trades)")
    existing_cols = {row["name"] for row in cursor.fetchall()}
    new_cols = [
        ("order_type", "TEXT NOT NULL DEFAULT 'MARKET'"),
        ("limit_price", "REAL"),
        ("stop_price", "REAL"),
        ("commission", "REAL"),
        ("spread_cost", "REAL"),
        ("slippage_cost", "REAL"),
    ]
    for col_name, col_def in new_cols:
        if col_name not in existing_cols:
            cursor.execute(f"ALTER TABLE trades ADD COLUMN {col_name} {col_def}")

    # Drawings table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS drawings (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        timeframe TEXT NOT NULL,
        points_json TEXT NOT NULL,
        properties_json TEXT NOT NULL,
        locked INTEGER NOT NULL DEFAULT 0,
        hidden INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
    )
    """)

    # Settings table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value_json TEXT NOT NULL
    )
    """)

    # Historical candle cache table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS candle_cache (
        symbol TEXT NOT NULL,
        timeframe TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        open REAL NOT NULL,
        high REAL NOT NULL,
        low REAL NOT NULL,
        close REAL NOT NULL,
        volume REAL NOT NULL,
        PRIMARY KEY (symbol, timeframe, timestamp)
    )
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_candle_cache ON candle_cache (symbol, timeframe, timestamp)")

    # Backtesting Sessions table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        data_json TEXT NOT NULL
    )
    """)

    conn.commit()
    conn.close()

# ---------------- Trades Operations ----------------
def save_trade(trade: Trade) -> Trade:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT OR REPLACE INTO trades (
        id, symbol, type, order_type, entry_time, entry_price, limit_price, stop_price,
        exit_time, exit_price, sl, tp, lot_size, risk_usd, pnl, pnl_pips,
        commission, spread_cost, slippage_cost, r_multiple, status, notes, exit_reason
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        trade.id, trade.symbol, trade.type, trade.order_type, trade.entry_time, trade.entry_price,
        trade.limit_price, trade.stop_price, trade.exit_time, trade.exit_price, trade.sl, trade.tp,
        trade.lot_size, trade.risk_usd, trade.pnl, trade.pnl_pips, trade.commission,
        trade.spread_cost, trade.slippage_cost, trade.r_multiple, trade.status,
        trade.notes, trade.exit_reason
    ))
    conn.commit()
    conn.close()
    return trade

def get_all_trades() -> List[Trade]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM trades ORDER BY entry_time DESC")
    rows = cursor.fetchall()
    trades = []
    for r in rows:
        trades.append(Trade(
            id=r["id"],
            symbol=r["symbol"],
            type=r["type"],
            order_type=r["order_type"] if "order_type" in r.keys() else "MARKET",
            entry_time=r["entry_time"],
            entry_price=r["entry_price"],
            limit_price=r["limit_price"] if "limit_price" in r.keys() else None,
            stop_price=r["stop_price"] if "stop_price" in r.keys() else None,
            exit_time=r["exit_time"],
            exit_price=r["exit_price"],
            sl=r["sl"],
            tp=r["tp"],
            lot_size=r["lot_size"],
            risk_usd=r["risk_usd"],
            pnl=r["pnl"],
            pnl_pips=r["pnl_pips"],
            commission=r["commission"] if "commission" in r.keys() else None,
            spread_cost=r["spread_cost"] if "spread_cost" in r.keys() else None,
            slippage_cost=r["slippage_cost"] if "slippage_cost" in r.keys() else None,
            r_multiple=r["r_multiple"],
            status=r["status"],
            notes=r["notes"] or "",
            exit_reason=r["exit_reason"]
        ))
    conn.close()
    return trades

def delete_trade(trade_id: str) -> bool:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM trades WHERE id = ?", (trade_id,))
    deleted = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return deleted

# ---------------- Drawings Operations ----------------
def save_drawing(drawing: DrawingObject) -> DrawingObject:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT OR REPLACE INTO drawings (
        id, type, timeframe, points_json, properties_json, locked, hidden, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        drawing.id, drawing.type, drawing.timeframe,
        json.dumps(drawing.points),
        json.dumps(drawing.properties),
        1 if drawing.locked else 0,
        1 if drawing.hidden else 0,
        drawing.created_at, drawing.updated_at
    ))
    conn.commit()
    conn.close()
    return drawing

def get_all_drawings() -> List[DrawingObject]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM drawings ORDER BY created_at ASC")
    rows = cursor.fetchall()
    drawings = []
    for r in rows:
        drawings.append(DrawingObject(
            id=r["id"],
            type=r["type"],
            timeframe=r["timeframe"],
            points=json.loads(r["points_json"]),
            properties=json.loads(r["properties_json"]),
            locked=bool(r["locked"]),
            hidden=bool(r["hidden"]),
            created_at=r["created_at"],
            updated_at=r["updated_at"]
        ))
    conn.close()
    return drawings

def delete_drawing(drawing_id: str) -> bool:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM drawings WHERE id = ?", (drawing_id,))
    deleted = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return deleted

def clear_all_drawings() -> bool:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM drawings")
    conn.commit()
    conn.close()
    return True

# ---------------- Settings Operations ----------------
def save_settings(settings: UserSettings) -> UserSettings:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT OR REPLACE INTO settings (key, value_json) VALUES ('user_settings', ?)
    """, (settings.model_dump_json(),))
    conn.commit()
    conn.close()
    return settings

def get_settings() -> UserSettings:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT value_json FROM settings WHERE key = 'user_settings'")
    row = cursor.fetchone()
    conn.close()
    if row:
        return UserSettings.model_validate_json(row["value_json"])
    default_settings = UserSettings()
    save_settings(default_settings)
    return default_settings

# ---------------- Candle Cache Operations ----------------
def get_cached_candles(symbol: str, timeframe: str, start_time: Optional[int] = None, end_time: Optional[int] = None, limit: Optional[int] = None) -> List[Candle]:
    conn = get_connection()
    cursor = conn.cursor()
    query = "SELECT timestamp, open, high, low, close, volume FROM candle_cache WHERE symbol = ? AND timeframe = ?"
    params: List[Any] = [symbol, timeframe]
    
    if start_time:
        query += " AND timestamp >= ?"
        params.append(start_time)
    if end_time:
        query += " AND timestamp <= ?"
        params.append(end_time)
        
    query += " ORDER BY timestamp ASC"
    if limit:
        query += f" LIMIT {int(limit)}"
        
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    
    return [
        Candle(time=r["timestamp"], open=r["open"], high=r["high"], low=r["low"], close=r["close"], volume=r["volume"])
        for r in rows
    ]

def save_candles_to_cache(symbol: str, timeframe: str, candles: List[Candle]):
    if not candles:
        return
    conn = get_connection()
    cursor = conn.cursor()
    cursor.executemany("""
    INSERT OR IGNORE INTO candle_cache (symbol, timeframe, timestamp, open, high, low, close, volume)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, [
        (symbol, timeframe, c.time, c.open, c.high, c.low, c.close, c.volume or 0.0)
        for c in candles
    ])
    conn.commit()
    conn.close()

# ---------------- Session Persistence Operations ----------------
def save_session(session: BacktestSession) -> BacktestSession:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT OR REPLACE INTO sessions (id, name, created_at, updated_at, data_json)
    VALUES (?, ?, ?, ?, ?)
    """, (
        session.session_id,
        session.name,
        session.created_at,
        session.updated_at,
        session.model_dump_json()
    ))
    conn.commit()
    conn.close()
    return session

def get_session(session_id: str) -> Optional[BacktestSession]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT data_json FROM sessions WHERE id = ?", (session_id,))
    row = cursor.fetchone()
    conn.close()
    if row:
        return BacktestSession.model_validate_json(row["data_json"])
    return None

def list_sessions() -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, created_at, updated_at FROM sessions ORDER BY updated_at DESC")
    rows = cursor.fetchall()
    conn.close()
    return [{"id": r["id"], "name": r["name"], "created_at": r["created_at"], "updated_at": r["updated_at"]} for r in rows]

def delete_session(session_id: str) -> bool:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM sessions WHERE id = ?", (session_id,))
    deleted = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return deleted

# Initialize tables when module is loaded
init_db()
