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

def get_bytes_for_tier(tier):
    """Generates byte sizes based on the assigned traffic tier."""
    if tier == "high":
        # 10 MB to 50 MB
        return random.randint(10_000_000, 50_000_000)
    elif tier == "medium":
        # 1 MB to 5 MB
        return random.randint(1_000_000, 5_000_000)
    else:
        # 10 KB to 500 KB
        return random.randint(10_000, 500_000)

def generate_fake_flow():
    """Generates a payload exactly matching what Suricata produces."""
    # Pick a random IP from our tiered list
    src_ip = random.choice(list(TIERED_IPS.keys()))
    tier = TIERED_IPS[src_ip]
    
    return {
        "event_type": "flow",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "proto": random.choice(PROTOCOLS),
        "src_ip": src_ip,
        "dest_ip": "192.168.1.100", 
        "flow": {
            "bytes_toserver": get_bytes_for_tier(tier), 
            "bytes_toclient": get_bytes_for_tier(tier)
        }
    }

def main():
    print("🚀 Starting Cloud Shield Tiered Traffic Simulator...")
    print(f"📡 Sending mock Suricata flow events to {API_URL}")
    print("Press Ctrl+C to stop.\n")

    session = requests.Session()

    try:
        while True:
            payload = generate_fake_flow()
            try:
                response = session.post(API_URL, json=payload)
                if response.status_code in [200, 201]:
                    total_bytes = payload["flow"]["bytes_toserver"] + payload["flow"]["bytes_toclient"]
                    mb_sent = total_bytes / (1024 * 1024)
                    ip = payload['src_ip']
                    proto = payload['proto']
                    tier = TIERED_IPS[ip].upper()
                    
                    # Add color to the console output for fun!
                    print(f"✅ [{tier}] Sent flow: {ip:<15} via {proto:<5} ({mb_sent:.2f} MB)")
                else:
                    print(f"⚠️ API Error: {response.status_code} - {response.text}")
            except requests.exceptions.ConnectionError:
                print("❌ Connection failed! Is the FastAPI backend running on port 8000?")
            
            # Sleep between 1 to 3 seconds to simulate realistic, pulsating traffic
            time.sleep(random.uniform(1.0, 3.0))

    except KeyboardInterrupt:
        print("\n🛑 Simulator stopped by user.")

if __name__ == "__main__":
    main()