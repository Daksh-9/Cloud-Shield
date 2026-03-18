import os
from datetime import datetime, timedelta
import geoip2.database
import geoip2.errors
from fastapi import APIRouter, Query
from typing import Dict, Any, Optional
from app.database.connection import get_database

router = APIRouter(prefix="/api/monitoring", tags=["monitoring"])

# --- GeoIP Setup ---
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
GEOIP_DB_PATH = os.path.join(BASE_DIR, "data", "GeoLite2-Country.mmdb")

geoip_reader = None
if os.path.exists(GEOIP_DB_PATH):
    geoip_reader = geoip2.database.Reader(GEOIP_DB_PATH)
    print(f"🌍 GeoIP Database loaded successfully.")
else:
    print(f"⚠️ GeoIP Database not found at {GEOIP_DB_PATH}. Geolocation will show 'Unknown'.")

def get_country_from_ip(ip_address: str) -> str:
    """Safely converts an IP to a Country Name."""
    simulator_ips = {
        "8.8.8.8": "United States", "1.1.1.1": "Australia",
        "210.212.239.122": "India", "82.165.8.211": "Germany",
        "114.114.114.114": "China", "177.43.255.255": "Brazil"
    }
    
    if ip_address in simulator_ips:
        return simulator_ips[ip_address]
        
    if not geoip_reader:
        return "Unknown (DB Missing)"
        
    if ip_address.startswith(("192.168.", "10.", "172.16.", "127.")):
        return "Local Network"
        
    try:
        response = geoip_reader.country(ip_address)
        return response.country.name or "Unknown"
    except geoip2.errors.AddressNotFoundError:
        return "Unknown IP"
    except Exception:
        return "Error"


def generate_empty_heatmap():
    """Generates an empty 7x24 heatmap structure."""
    days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    return [{"day": day, "hours": [0]*24} for day in days]


@router.get("/live-traffic-stats")
async def get_live_traffic_stats(
    range: str = Query("1h"),
    start: Optional[str] = Query(None),
    end: Optional[str] = Query(None)
):
    """Aggregates real-time traffic stats based on the selected time window."""
    now = datetime.utcnow()
    end_time = now
    
    # 1. Determine Time Threshold based on frontend filter
    if range == "1h":
        threshold = now - timedelta(hours=1)
    elif range == "3h":
        threshold = now - timedelta(hours=3)
    elif range == "12h":
        threshold = now - timedelta(hours=12)
    elif range == "24h":
        threshold = now - timedelta(days=1)
    elif range == "1w":
        threshold = now - timedelta(weeks=1)
    elif range == "custom" and start and end:
        try:
            # Removing the 'Z' if present, to safely parse ISO strings from React
            threshold = datetime.fromisoformat(start.replace("Z", ""))
            end_time = datetime.fromisoformat(end.replace("Z", ""))
        except ValueError:
            threshold = now - timedelta(hours=1)
    else:
        threshold = now - timedelta(hours=1)
        
    # FIX: Use native datetime objects for the MongoDB query, not strings
    match_query = {
        "event_type": "flow",
        "timestamp": {"$gte": threshold}
    }
    
    if range == "custom" and start and end:
        match_query["timestamp"]["$lte"] = end_time

    db = get_database()
    
    # Fetch flows matching the time window
    pipeline = [
        {"$match": match_query},
        {"$sort": {"timestamp": -1}},
        {"$limit": 5000} 
    ]
    
    recent_flows = await db.suricata_events.aggregate(pipeline).to_list(5000)
    
    # 2. Aggregation Dictionaries
    stats = {
        "protocols": {},
        "top_ips": {}, 
        "top_ports": {},
        "total_bytes": 0,
        "inbound_bytes": 0,
        "outbound_bytes": 0,
        "heatmap": generate_empty_heatmap()
    }
    
    # Standard Port Map for visual labeling
    PORT_MAP = {80: "HTTP", 443: "HTTPS", 22: "SSH", 53: "DNS", 3389: "RDP", 8080: "HTTP-ALT"}
    
    for doc in recent_flows:
        # Check both top-level and raw_event for fields to ensure compatibility
        raw = doc.get("raw_event", doc)
        flow_data = raw.get("flow", doc.get("flow", {}))
        
        proto = raw.get("proto", doc.get("proto", "UNKNOWN"))
        src_ip = raw.get("src_ip", doc.get("src_ip", "Unknown"))
        dest_port = raw.get("dest_port", doc.get("dest_port", 0))
        
        # Bytes calculation
        bytes_toserver = flow_data.get("bytes_toserver", 0)
        bytes_toclient = flow_data.get("bytes_toclient", 0)
        bytes_total = bytes_toserver + bytes_toclient
        
        stats["total_bytes"] += bytes_total
        
        # Inbound vs Outbound logic (Assuming 192/10/172 is internal)
        is_internal_src = src_ip.startswith(("192.168.", "10.", "172.16.", "127."))
        if is_internal_src:
            stats["outbound_bytes"] += bytes_toserver
            stats["inbound_bytes"] += bytes_toclient
        else:
            stats["inbound_bytes"] += bytes_toserver
            stats["outbound_bytes"] += bytes_toclient

        # Top IPs
        stats["top_ips"][src_ip] = stats["top_ips"].get(src_ip, 0) + bytes_total
        
        # Protocols
        stats["protocols"][proto] = stats["protocols"].get(proto, 0) + 1
        
        # Top Ports
        port_label = f"{dest_port} ({PORT_MAP.get(dest_port, 'Other')})"
        stats["top_ports"][port_label] = stats["top_ports"].get(port_label, 0) + bytes_total

        # Heatmap Processing
        # FIX: Handle timestamp as a datetime object directly
        try:
            ts = doc.get("timestamp")
            if isinstance(ts, datetime):
                day_idx = ts.isoweekday() % 7 # Sunday = 0
                hour = ts.hour
                stats["heatmap"][day_idx]["hours"][hour] += 1 
            elif isinstance(ts, str):
                # Fallback just in case some records are strings
                ts_obj = datetime.fromisoformat(ts.replace("Z", "+00:00"))
                day_idx = ts_obj.isoweekday() % 7
                hour = ts_obj.hour
                stats["heatmap"][day_idx]["hours"][hour] += 1
        except Exception:
            pass

    # 3. Format Data for Frontend Recharts
    formatted_protocols = [{"name": k, "value": v} for k, v in stats["protocols"].items()]
    
    top_5_ips = sorted(stats["top_ips"].items(), key=lambda x: x[1], reverse=True)[:5]
    formatted_locations = [{"ip": ip, "bytes": b, "country": get_country_from_ip(ip)} for ip, b in top_5_ips]
    
    top_5_ports = sorted(stats["top_ports"].items(), key=lambda x: x[1], reverse=True)[:5]
    formatted_ports = [{"port": p, "bytes": b} for p, b in top_5_ports]

    # Flow Sankey Data Structure
    flow_nodes = [{"name": "Inbound"}, {"name": "Internal"}, {"name": "Outbound"}]
    flow_links = [
        {"source": 0, "target": 1, "value": max(1, stats["inbound_bytes"])},
        {"source": 1, "target": 2, "value": max(1, stats["outbound_bytes"])}
    ]

    return {
        "protocols": formatted_protocols,
        "top_locations": formatted_locations,
        "top_ports": formatted_ports,
        "flows": {"nodes": flow_nodes, "links": flow_links},
        "heatmap": stats["heatmap"],
        "total_bandwidth_mb": round(stats["total_bytes"] / (1024 * 1024), 2)
    }