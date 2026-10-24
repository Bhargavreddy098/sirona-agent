import asyncio
import json
from typing import Any, Dict, Set
from fastapi import WebSocket

class EventBroadcaster:
    def __init__(self):
        self._clients: Set[WebSocket] = set()

    def connect(self, ws: WebSocket) -> None:
        self._clients.add(ws)

    def disconnect(self, ws: WebSocket) -> None:
        self._clients.discard(ws)

    async def broadcast(self, event_type: str, payload: Dict[str, Any]) -> None:
        if not self._clients:
            return
        event_body = {"type": event_type, **payload}
        # JSON-RPC 2.0 notification frame
        frame = {
            "jsonrpc": "2.0",
            "method": "event",
            "params": event_body,
            "type": event_type,
            **payload
        }
        msg = json.dumps(frame)
        stale = set()
        for ws in self._clients:
            try:
                await ws.send_text(msg)
            except Exception:
                stale.add(ws)
        self._clients.difference_update(stale)

broadcaster = EventBroadcaster()
