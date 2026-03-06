"""
Cloud Shield - Main FastAPI Application
Entry point for the backend API server.
"""
import sys
import asyncio

# --- WINDOWS ASYNCIO BUG FIX (MUST BE AT THE VERY TOP) ---
# Forces the Uvicorn worker process to use the correct Windows event loop 
# that supports background subprocesses.
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database.connection import connect_to_mongo, close_mongo_connection

# IMPORT THE NEW SUBPROCESS FUNCTIONS
from app.services.suricata_service import start_suricata_subprocess, stop_suricata_subprocess
from app.utils.ml_model_loader import initialize_models

from app.routers import auth, logs, alerts, monitoring, suricata, suricata_rules, ml, user

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


@app.on_event("startup")
async def startup_event():
    """Initialize database connections and processes on startup."""
    await connect_to_mongo()
    # Initialize ML models
    initialize_models()
    
    # START SURICATA SUBPROCESS
    await start_suricata_subprocess()


@app.on_event("shutdown")
async def shutdown_event():
    """Close connections and clean up processes on shutdown."""
    # STOP SURICATA SUBPROCESS FIRST
    await stop_suricata_subprocess()
    
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