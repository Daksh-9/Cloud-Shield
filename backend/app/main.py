"""
Cloud Shield - Main FastAPI Application
Entry point for the backend API server.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import connect_to_mongo, close_mongo_connection
from app.routers import auth, logs, alerts, monitoring, suricata, ml
from app.utils.ml_model_loader import initialize_models

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
    """Initialize database connections on startup."""
    await connect_to_mongo()
    # Initialize ML models
    initialize_models()


@app.on_event("shutdown")
async def shutdown_event():
    """Close database connections on shutdown."""
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
app.include_router(ml.router)

