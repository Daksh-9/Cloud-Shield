import time
import random
import requests
from datetime import datetime, timezone

# Target your existing Suricata ingestion endpoint
API_URL = "http://localhost:8000/suricata/events"

# Map IPs to specific traffic tiers to create a beautiful heatmap
TIERED_IPS = {
    # HIGH TRAFFIC (Will turn RED on the map)
    "8.8.8.8": "high",           # United States
    "114.114.114.114": "high",   # China
    
    # MEDIUM TRAFFIC (Will turn ORANGE on the map)
    "82.165.8.211": "medium",    # Germany
    "210.212.239.122": "medium", # India
    
    # LOW TRAFFIC (Will turn BLUE on the map)
    "1.1.1.1": "low",            # Australia
    "177.43.255.255": "low",     # Brazil
    "192.168.1.50": "low",       # Local Network
    "10.0.0.15": "low"           # Local Network
}

PROTOCOLS = ["TCP", "UDP", "ICMP", "HTTP", "DNS"]
PORTS = [80, 443, 22, 53, 3389, 8080]

# Mock Suricata Rule Signatures
MOCK_ALERTS = [
    {
        "signature": "ET SCAN Nmap UDP Sweep",
        "signature_id": 2008583,
        "category": "Attempted Information Leak",
        "severity": 2
    },
    {
        "signature": "GPL EXPLOIT CodeRed v2 root.exe access",
        "signature_id": 2100528,
        "category": "Attempted Administrator Privilege Gain",
        "severity": 1
    },
    {
        "signature": "ET MALWARE Suspicious User-Agent (1-8)",
        "signature_id": 2008974,
        "category": "A Network Trojan was detected",
        "severity": 1
    },
    {
        "signature": "ET DOS Possible NTP DDoS Inbound Frequent Un-Authed MON_GETLIST",
        "signature_id": 2017919,
        "category": "Attempted Denial of Service",
        "severity": 2
    }
]

def get_bytes_for_tier(tier):
    """Generates byte sizes based on the assigned traffic tier."""
    if tier == "high":
        return random.randint(10_000_000, 50_000_000)
    elif tier == "medium":
        return random.randint(1_000_000, 5_000_000)
    else:
        return random.randint(10_000, 500_000)

def get_current_iso_time():
    """Returns formatted ISO time compatible with backend string comparison."""
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

def generate_fake_flow():
    """Generates a standard flow payload."""
    src_ip = random.choice(list(TIERED_IPS.keys()))
    tier = TIERED_IPS[src_ip]
    
    return {
        "event_type": "flow",
        "timestamp": get_current_iso_time(),
        "proto": random.choice(PROTOCOLS),
        "src_ip": src_ip,
        "dest_ip": "192.168.1.100", 
        "dest_port": random.choice(PORTS),
        "flow": {
            "bytes_toserver": get_bytes_for_tier(tier), 
            "bytes_toclient": get_bytes_for_tier(tier)
        }
    }

def generate_fake_alert():
    """Generates an alert payload matching a Suricata rule trigger."""
    src_ip = random.choice(list(TIERED_IPS.keys()))
    alert_details = random.choice(MOCK_ALERTS)
    
    return {
        "event_type": "alert",
        "timestamp": get_current_iso_time(),
        "proto": random.choice(["TCP", "UDP"]),
        "src_ip": src_ip,
        "src_port": random.randint(1024, 65535),
        "dest_ip": "192.168.1.100",
        "dest_port": random.choice(PORTS),
        "alert": {
            "action": "allowed",
            "gid": 1,
            "signature_id": alert_details["signature_id"],
            "rev": 1,
            "signature": alert_details["signature"],
            "category": alert_details["category"],
            "severity": alert_details["severity"]
        }
    }

def main():
    print("🚀 Starting Cloud Shield Tiered Traffic & Alert Simulator...")
    print(f"📡 Sending mock Suricata events to {API_URL}")
    print("Press Ctrl+C to stop.\n")

    session = requests.Session()

    try:
        while True:
            # 20% chance to generate an ALERT instead of a standard FLOW
            is_alert = random.random() < 0.2 
            payload = generate_fake_alert() if is_alert else generate_fake_flow()

            try:
                response = session.post(API_URL, json=payload)
                if response.status_code in [200, 201]:
                    ip = payload['src_ip']
                    tier = TIERED_IPS[ip].upper()
                    
                    if is_alert:
                        sig = payload["alert"]["signature"]
                        sev = payload["alert"]["severity"]
                        print(f"🚨 [ALERT - Sev {sev}] {ip:<15} triggered: {sig}")
                    else:
                        total_bytes = payload["flow"]["bytes_toserver"] + payload["flow"]["bytes_toclient"]
                        mb_sent = total_bytes / (1024 * 1024)
                        proto = payload['proto']
                        print(f"✅ [{tier}] Sent flow: {ip:<15} via {proto:<5} ({mb_sent:.2f} MB)")
                else:
                    print(f"⚠️ API Error: {response.status_code} - {response.text}")
            except requests.exceptions.ConnectionError:
                print("❌ Connection failed! Is the FastAPI backend running on port 8000?")
            
            # Sleep between 1 to 3 seconds to simulate realistic traffic
            time.sleep(random.uniform(1.0, 3.0))

    except KeyboardInterrupt:
        print("\n🛑 Simulator stopped by user.")

if __name__ == "__main__":
    main()