import time
import random
import requests
from datetime import datetime, timezone

# --- API Configuration ---
BASE_URL = "http://localhost:8000"
AUTH_URL = f"{BASE_URL}/auth/login"
SURICATA_URL = f"{BASE_URL}/suricata/events"
LOGS_URL = f"{BASE_URL}/logs"
ML_URL = f"{BASE_URL}/ml/inference"

# Change these to match a valid user in your local database
ADMIN_USERNAME = "admin@cloudshield.com"
ADMIN_PASSWORD = "AdminSecure123!"

# --- Data Configuration ---
TIERED_IPS = {
    "8.8.8.8": "high",           # United States
    "114.114.114.114": "high",   # China
    "82.165.8.211": "medium",    # Germany
    "210.212.239.122": "medium", # India
    "1.1.1.1": "low",            # Australia
    "177.43.255.255": "low",     # Brazil
    "192.168.1.50": "low",       # Local Network
    "10.0.0.15": "low"           # Local Network
}

PROTOCOLS = ["TCP", "UDP", "ICMP", "HTTP", "DNS"]
PORTS = [80, 443, 22, 53, 3389, 8080]

MOCK_ALERTS = [
    {"signature": "ET SCAN Nmap UDP Sweep", "signature_id": 2008583, "category": "Attempted Information Leak", "severity": 2},
    {"signature": "GPL EXPLOIT CodeRed v2 root.exe access", "signature_id": 2100528, "category": "Attempted Administrator Privilege Gain", "severity": 1},
    {"signature": "ET MALWARE Suspicious User-Agent (1-8)", "signature_id": 2008974, "category": "A Network Trojan was detected", "severity": 1},
    {"signature": "ET DOS Possible NTP DDoS Inbound Frequent Un-Authed MON_GETLIST", "signature_id": 2017919, "category": "Attempted Denial of Service", "severity": 2}
]

# --- Helper Functions ---

def authenticate(session):
    """Obtains a JWT token for endpoints that require auth."""
    print(f"🔐 Authenticating as {ADMIN_USERNAME}...")
    try:
        response = session.post(AUTH_URL, json={"email": ADMIN_USERNAME, "password": ADMIN_PASSWORD})
        if response.status_code == 200:
            token = response.json().get("access_token")
            session.headers.update({"Authorization": f"Bearer {token}"})
            print("✅ Authentication successful!\n")
            return True
        else:
            print(f"⚠️ Auth failed ({response.status_code}): {response.text}")
            print("   Make sure ADMIN_USERNAME and ADMIN_PASSWORD in this script match your DB.")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ Connection failed! Is the FastAPI backend running on port 8000?")
        return False

def get_bytes_for_tier(tier):
    if tier == "high": return random.randint(10_000_000, 50_000_000)
    elif tier == "medium": return random.randint(1_000_000, 5_000_000)
    else: return random.randint(10_000, 500_000)

def get_current_iso_time():
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

# --- Event Generators ---

def generate_fake_flow():
    """Generates a standard flow payload for Suricata & Live Traffic."""
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
    """Generates an alert payload for Suricata."""
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

def generate_fake_log():
    """Generates a standard system/application log for the Logs page."""
    severities = ["info", "warning", "error", "critical"]
    sources = ["firewall", "auth_service", "database", "suricata_engine", "web_server"]
    
    log_type = random.choice(["system", "traffic", "auth"])
    sev = random.choices(severities, weights=[50, 25, 15, 10])[0]
    
    messages = {
        "info": f"Routine check completed for {log_type}.",
        "warning": f"High latency detected in {log_type} module.",
        "error": f"Failed to connect to upstream service in {log_type}.",
        "critical": f"Service crash imminent in {log_type}. Immediate action required."
    }

    return {
        "source": random.choice(sources),
        "log_type": log_type,
        "severity": sev,
        "message": messages[sev],
        "metadata": {"cpu_usage_spike": random.randint(70, 100)} if sev in ["error", "critical"] else {"status": "ok"},
        "timestamp": get_current_iso_time()
    }

def generate_ml_inference(is_suspicious: bool):
    """Generates PCA component data to hit the ML Engine endpoint for the DDoS model."""
    data = {}
    if is_suspicious:
        # Simulate a DDoS Attack (PCA values skewed to one extreme)
        for i in range(1, 36):
            data[f"PC{i}"] = random.uniform(2.5, 6.0)
    else:
        # Simulate Normal (Benign) Traffic (PCA values close to zero)
        for i in range(1, 36):
            data[f"PC{i}"] = random.uniform(-1.0, 1.0)
        
    return {
        "data": data,
        "model_name": "ddos_pipeline", # Ensure this matches your uploaded model name
        "auto_create_alert": is_suspicious # Auto-alert only if it's DDoS
    }

# --- Main Execution Loop ---

def main():
    print("🚀 Starting Cloud Shield Comprehensive Traffic Simulator...")
    print("Press Ctrl+C to stop.\n")

    session = requests.Session()
    if not authenticate(session):
        return

    # Deterministic pattern: 2 Benign (False), 1 Suspicious (True)
    ml_pattern = [False, False, True]
    ml_counter = 0

    try:
        while True:
            # Randomly decide which system feature to trigger
            event_type = random.choices(
                ["suricata_flow", "suricata_alert", "system_log", "ml_inference"], 
                weights=[35, 15, 20, 30] # 30% chance to run an ML scan
            )[0]

            try:
                if event_type == "suricata_flow":
                    payload = generate_fake_flow()
                    r = session.post(SURICATA_URL, json=payload)
                    if r.status_code in [200, 201]:
                        ip = payload['src_ip']
                        print(f"🌊 [LIVE TRAFFIC] Sent flow from {ip:<15} ({r.status_code})")

                elif event_type == "suricata_alert":
                    payload = generate_fake_alert()
                    r = session.post(SURICATA_URL, json=payload)
                    if r.status_code in [200, 201]:
                        sig = payload["alert"]["signature"]
                        print(f"🚨 [SURICATA ALERT] Triggered: {sig} ({r.status_code})")

                elif event_type == "system_log":
                    payload = generate_fake_log()
                    r = session.post(LOGS_URL, json=payload)
                    if r.status_code in [200, 201]:
                        sev = payload["severity"].upper()
                        print(f"📝 [SYSTEM LOG] Logged {sev} event from {payload['source']} ({r.status_code})")

                elif event_type == "ml_inference":
                    # Pull from the deterministic pattern instead of using random
                    is_suspicious = ml_pattern[ml_counter % len(ml_pattern)]
                    ml_counter += 1
                    
                    payload = generate_ml_inference(is_suspicious)
                    r = session.post(ML_URL, json=payload)
                    
                    if r.status_code in [200, 201]:
                        res = r.json()
                        pred = res.get("prediction", "Unknown")
                        conf = res.get("confidence", 0) * 100
                        det_type = res.get("detection_type", "unknown")
                        
                        if det_type == "benign":
                            print(f"🧠 [ML ENGINE] Analyzed: {pred} ({conf:.1f}% confidence)")
                        else:
                            print(f"🛑 [ML ENGINE THREAT] Detected: {pred} ({conf:.1f}% confidence)")
                    else:
                        print(f"⚠️ [ML ENGINE] Failed: {r.status_code} - {r.text}")

            except requests.exceptions.ConnectionError:
                print("❌ Connection failed! Make sure the FastAPI backend is running.")
                time.sleep(5)
            
            # Sleep between 1.5 to 3.5 seconds to simulate realistic traffic flow
            time.sleep(random.uniform(1.5, 3.5))

    except KeyboardInterrupt:
        print("\n🛑 Simulator stopped by user.")

if __name__ == "__main__":
    main()