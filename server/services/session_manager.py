"""
Forex Trading Sessions Manager.
Calculates active sessions, times in UTC/local, session high/low levels, and session boundaries.
"""
import datetime
from typing import List, Dict, Any, Optional
from models import TradingSessionInfo

SESSIONS_CONFIG = [
    {
        "id": "asian",
        "name": "Asian Session (Tokyo)",
        "start_utc": "00:00",
        "end_utc": "09:00",
        "color": "rgba(41, 98, 255, 0.08)",
        "borderColor": "rgba(41, 98, 255, 0.4)",
    },
    {
        "id": "london",
        "name": "London Session",
        "start_utc": "07:00",
        "end_utc": "16:00",
        "color": "rgba(255, 179, 0, 0.08)",
        "borderColor": "rgba(255, 179, 0, 0.4)",
    },
    {
        "id": "ny",
        "name": "New York Session",
        "start_utc": "12:00",
        "end_utc": "21:00",
        "color": "rgba(0, 230, 118, 0.08)",
        "borderColor": "rgba(0, 230, 118, 0.4)",
    },
    {
        "id": "london_ny_overlap",
        "name": "London / NY Overlap",
        "start_utc": "12:00",
        "end_utc": "16:00",
        "color": "rgba(233, 30, 99, 0.12)",
        "borderColor": "rgba(233, 30, 99, 0.5)",
    }
]

def get_current_sessions(high_low_map: Optional[Dict[str, Dict[str, float]]] = None) -> List[TradingSessionInfo]:
    now_utc = datetime.datetime.now(datetime.timezone.utc)
    current_time_str = now_utc.strftime("%H:%M")
    
    results = []
    for cfg in SESSIONS_CONFIG:
        start = cfg["start_utc"]
        end = cfg["end_utc"]
        is_active = False

        if start <= end:
            is_active = start <= current_time_str <= end
        else: # Over midnight
            is_active = current_time_str >= start or current_time_str <= end

        hl = (high_low_map or {}).get(cfg["id"], {})

        results.append(TradingSessionInfo(
            name=cfg["name"],
            start_utc=cfg["start_utc"],
            end_utc=cfg["end_utc"],
            is_active=is_active,
            color=cfg["color"],
            high=hl.get("high"),
            low=hl.get("low")
        ))
    return results
