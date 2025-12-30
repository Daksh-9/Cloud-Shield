"""
Live monitoring endpoints for real-time data.
"""
from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from typing import List
import asyncio
import json

from app.middleware.auth import get_current_user
from app.services.metrics_service import get_live_metrics, get_recent_logs, get_recent_alerts
from app.utils.jwt import verify_token

router = APIRouter(prefix="/monitoring", tags=["monitoring"])

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        """Broadcast message to all connected clients."""
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                disconnected.append(connection)
        
        # Remove disconnected clients
        for conn in disconnected:
            self.active_connections.remove(conn)

manager = ConnectionManager()


@router.get("/metrics")
async def get_metrics(current_user: dict = Depends(get_current_user)):
    """Get current system metrics."""
    metrics = await get_live_metrics()
    return metrics


@router.get("/recent-logs")
async def get_recent_logs_endpoint(
    limit: int = 10,
    current_user: dict = Depends(get_current_user)
):
    """Get recent logs for live feed."""
    logs = await get_recent_logs(limit=limit)
    return {"logs": logs}


@router.get("/recent-alerts")
async def get_recent_alerts_endpoint(
    limit: int = 10,
    current_user: dict = Depends(get_current_user)
):
    """Get recent alerts for live feed."""
    alerts = await get_recent_alerts(limit=limit)
    return {"alerts": alerts}


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str = None):
    """
    WebSocket endpoint for real-time monitoring updates.
    Requires authentication token as query parameter.
    """
    # Verify token
    if not token:
        await websocket.close(code=1008, reason="Authentication required")
        return
    
    payload = verify_token(token)
    if not payload:
        await websocket.close(code=1008, reason="Invalid token")
        return
    
    await manager.connect(websocket)
    
    try:
        # Send initial metrics
        metrics = await get_live_metrics()
        await websocket.send_json({
            "type": "metrics",
            "data": metrics
        })
        
        # Keep connection alive and send periodic updates
        while True:
            await asyncio.sleep(5)  # Update every 5 seconds
            
            metrics = await get_live_metrics()
            await websocket.send_json({
                "type": "metrics",
                "data": metrics
            })
            
            # Also send recent logs and alerts
            recent_logs = await get_recent_logs(limit=5)
            recent_alerts = await get_recent_alerts(limit=5)
            
            await websocket.send_json({
                "type": "recent_activity",
                "data": {
                    "logs": recent_logs,
                    "alerts": recent_alerts
                }
            })
            
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(websocket)


async def broadcast_new_log(log_data: dict):
    """Broadcast new log to all connected WebSocket clients."""
    await manager.broadcast({
        "type": "new_log",
        "data": log_data
    })


async def broadcast_new_alert(alert_data: dict):
    """Broadcast new alert to all connected WebSocket clients."""
    await manager.broadcast({
        "type": "new_alert",
        "data": alert_data
    })

