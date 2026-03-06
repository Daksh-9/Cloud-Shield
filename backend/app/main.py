"""
Cloud Shield - Main FastAPI Application
Entry point for the backend API server.
"""
import sys
import asyncio
import logging

# --- WINDOWS ASYNCIO BUG FIX (MUST BE AT THE VERY TOP) ---
# Forces the Uvicorn worker process to use the correct Windows event loop 
# that supports background subprocesses.
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database.connection import connect_to_mongo, close_mongo_connection

# IMPORT THE NEW SUBPROCESS FUNCTIONS
from app.services.suricata_service import start_suricata_subprocess, stop_suricata_subprocess
from app.services.realtime import connection_manager
from app.services.backup_service import run_backup_job
from app.utils.ml_model_loader import initialize_models

from app.routers import auth, logs, alerts, monitoring, suricata, suricata_rules, ml, user

logger = logging.getLogger(__name__)
backup_task: asyncio.Task | None = None


app = FastAPI(
    title="Cloud Shield API",
    description="Cybersecurity monitoring and intrusion detection system",
    version="1.0.0"
)

# CORS middleware for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


async def _start_backup_loop(interval_hours: int = 24) -> None:
    """
    Background loop that runs the backup job at a fixed interval.
    """
    logger.info("Starting backup loop (every %d hour(s)).", interval_hours)
    seconds = max(1, interval_hours * 3600)
    while True:
        try:
            await run_backup_job()
        except Exception as exc:
            logger.error("Backup loop iteration failed: %s", exc)
        await asyncio.sleep(seconds)


@app.on_event("startup")
async def startup_event():
    """Initialize database connections and processes on startup."""
    global backup_task
    await connect_to_mongo()
    # Initialize ML models
    initialize_models()
    
    # START SURICATA SUBPROCESS
    await start_suricata_subprocess()

    # Start periodic backup loop
    backup_task = asyncio.create_task(_start_backup_loop())


@app.on_event("shutdown")
async def shutdown_event():
    """Close connections and clean up processes on shutdown."""
    global backup_task

    # STOP SURICATA SUBPROCESS FIRST
    await stop_suricata_subprocess()

    # Stop backup loop
    if backup_task is not None:
        backup_task.cancel()
        try:
            await backup_task
        except asyncio.CancelledError:
            logger.info("Backup loop cancelled on shutdown.")
        backup_task = None
    
    await close_mongo_connection()


@app.get("/")
async def root():
    """Health check endpoint."""
    return {
        "status": "ok",
        "message": "Cloud Shield API is running",
        "version": "1.0.0"
    }


@app.get("/health")
async def health_check():
    """Detailed health check endpoint."""
    return {
        "status": "healthy",
        "service": "Cloud Shield API"
    }


# Include routers
app.include_router(auth.router)
app.include_router(logs.router)
app.include_router(alerts.router)
app.include_router(monitoring.router)
app.include_router(suricata.router)
app.include_router(suricata_rules.router)
app.include_router(ml.router)
app.include_router(user.router)


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for real-time log and alert updates.
    """
    await connection_manager.connect(websocket)
    try:
        # Keep the connection open; clients may send pings or small messages,
        # which we simply receive and ignore.
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        connection_manager.disconnect(websocket)
