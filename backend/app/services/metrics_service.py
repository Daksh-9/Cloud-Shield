"""
Metrics service for live monitoring data.
"""
from typing import Dict, Any
from datetime import datetime, timedelta

from app.services.log_service import get_log_count
from app.services.alert_service import get_alert_count
from app.database import get_database


async def get_live_metrics() -> Dict[str, Any]:
    """Get current system metrics for live monitoring."""
    db = get_database()
    
    # Get counts by severity
    log_counts = {
        "total": await get_log_count(),
        "info": await get_log_count(severity="info"),
        "warning": await get_log_count(severity="warning"),
        "error": await get_log_count(severity="error"),
        "critical": await get_log_count(severity="critical"),
    }
    
    alert_counts = {
        "total": await get_alert_count(),
        "open": await get_alert_count(status="open"),
        "investigating": await get_alert_count(status="investigating"),
        "resolved": await get_alert_count(status="resolved"),
        "by_severity": {
            "low": await get_alert_count(severity="low"),
            "medium": await get_alert_count(severity="medium"),
            "high": await get_alert_count(severity="high"),
            "critical": await get_alert_count(severity="critical"),
        }
    }
    
    # Get recent activity (last hour)
    one_hour_ago = datetime.utcnow() - timedelta(hours=1)
    
    recent_logs_count = await db.logs.count_documents({
        "timestamp": {"$gte": one_hour_ago}
    })
    
    recent_alerts_count = await db.alerts.count_documents({
        "created_at": {"$gte": one_hour_ago}
    })
    
    # Get logs by source (last 24 hours)
    one_day_ago = datetime.utcnow() - timedelta(days=1)
    pipeline = [
        {"$match": {"timestamp": {"$gte": one_day_ago}}},
        {"$group": {"_id": "$source", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10}
    ]
    
    logs_by_source = []
    async for doc in db.logs.aggregate(pipeline):
        logs_by_source.append({
            "source": doc["_id"],
            "count": doc["count"]
        })
    
    return {
        "timestamp": datetime.utcnow().isoformat(),
        "logs": {
            "counts": log_counts,
            "recent_hour": recent_logs_count,
            "by_source": logs_by_source
        },
        "alerts": {
            "counts": alert_counts,
            "recent_hour": recent_alerts_count
        }
    }


async def get_recent_logs(limit: int = 10) -> list:
    """Get most recent logs for live feed."""
    from app.services.log_service import get_logs
    
    logs = await get_logs(limit=limit)
    return logs


async def get_recent_alerts(limit: int = 10) -> list:
    """Get most recent alerts for live feed."""
    from app.services.alert_service import get_alerts
    
    alerts = await get_alerts(limit=limit)
    return alerts

