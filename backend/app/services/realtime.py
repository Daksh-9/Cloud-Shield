"""
Real-time websocket connection manager and broadcast helpers.
"""
from typing import List, Dict, Any

from fastapi import WebSocket


class ConnectionManager:
    def __init__(self) -> None:
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket) -> None:
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: Dict[str, Any]) -> None:
        """
        Broadcast a JSON-serializable message to all connected clients.
        """
        disconnected: List[WebSocket] = []

        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                disconnected.append(connection)

        for ws in disconnected:
            self.disconnect(ws)


connection_manager = ConnectionManager()


async def broadcast_event(event: Dict[str, Any]) -> None:
    """
    Helper used by services to broadcast structured events.
    """
    await connection_manager.broadcast(event)

