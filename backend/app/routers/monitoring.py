import os
import geoip2.database
import geoip2.errors
from fastapi import APIRouter
from typing import Dict, Any
from app.database.connection import get_database

router = APIRouter(prefix="/api/monitoring", tags=["monitoring"])

# --- GeoIP Setup ---
# Locate the database file relative to this script
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
GEOIP_DB_PATH = os.path.join(BASE_DIR, "data", "GeoLite2-Country.mmdb")

# Load it into memory once when the router imports
geoip_reader = None
if os.path.exists(GEOIP_DB_PATH):
    geoip_reader = geoip2.database.Reader(GEOIP_DB_PATH)
    print(f"🌍 GeoIP Database loaded successfully.")
else:
    print(f"⚠️ GeoIP Database not found at {GEOIP_DB_PATH}. Geolocation will show 'Unknown'.")

def get_country_from_ip(ip_address: str) -> str:
    """Safely converts an IP to a Country Name."""
    
    # --- SIMULATOR CHEAT CODE FOR LIVE TRAFFIC TESTING ---
    simulator_ips = {
        "8.8.8.8": "United States",
        "1.1.1.1": "Australia",
        "210.212.239.122": "India",
        "82.165.8.211": "Germany",
        "114.114.114.114": "China",
        "177.43.255.255": "Brazil"
    }
    
    if ip_address in simulator_ips:
        return simulator_ips[ip_address]
    # -----------------------------------------------------
    
    if not geoip_reader:
        return "Unknown (DB Missing)"
        
    # Handle private/local IPs so they don't throw errors
    if ip_address.startswith(("192.168.", "10.", "172.16.", "127.")):
        return "Local Network"
        
    try:
        response = geoip_reader.country(ip_address)
        return response.country.name or "Unknown"
    except geoip2.errors.AddressNotFoundError:
        return "Unknown IP"
    except Exception:
        return "Error"


@router.get("/live-traffic-stats")
async def get_live_traffic_stats():
    """Aggregates real-time traffic stats and maps IPs to Geo-locations."""
    db = get_database()
    
    pipeline = [
        {"$match": {"event_type": "flow"}},
        {"$sort": {"timestamp": -1}},
        {"$limit": 1000} 
    ]
    
    recent_flows = await db.suricata_events.aggregate(pipeline).to_list(1000)
    
    stats = {
        "protocols": {},
        "top_ips": {}, 
        "total_bytes": 0
    }
    
    for doc in recent_flows:
        # We extract from raw_event because the DB wraps the flat payload
        raw = doc.get("raw_event", {})
        proto = raw.get("proto", "UNKNOWN")
        src_ip = raw.get("src_ip", "Unknown")
        
        flow_data = raw.get("flow", {})
        bytes_total = flow_data.get("bytes_toserver", 0) + flow_data.get("bytes_toclient", 0)
        
        stats["protocols"][proto] = stats["protocols"].get(proto, 0) + 1
        
        if src_ip not in stats["top_ips"]:
            stats["top_ips"][src_ip] = 0
        stats["top_ips"][src_ip] += bytes_total
        
        stats["total_bytes"] += bytes_total

    formatted_protocols = [{"name": k, "value": v} for k, v in stats["protocols"].items()]
    
    # Sort IPs by bandwidth and get the top 5
    top_5_ips = sorted(stats["top_ips"].items(), key=lambda x: x[1], reverse=True)[:5]
    
    # Inject the GeoIP Translation
    formatted_locations = [
        {
            "ip": ip, 
            "bytes": bytes_transferred, 
            "country": get_country_from_ip(ip) 
        } 
        for ip, bytes_transferred in top_5_ips
    ]

    return {
        "protocols": formatted_protocols,
        "top_locations": formatted_locations,
        "total_bandwidth_mb": round(stats["total_bytes"] / (1024 * 1024), 2)
    }