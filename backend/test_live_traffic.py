import time
import random
import requests
from datetime import datetime, timezone

# Target your existing Suricata ingestion endpoint (Updated to remove /api)
API_URL = "http://localhost:8000/suricata/events"

# A mix of local and global IPs to test the geographic map
FAKE_IPS = [
    "192.168.1.50", "10.0.0.15", # Local Network
    "8.8.8.8",                   # United States
    "1.1.1.1",                   # Australia
    "210.212.239.122",           # India
    "82.165.8.211",              # Germany
    "114.114.114.114",           # China
    "177.43.255.255"             # Brazil
]

PROTOCOLS = ["TCP", "UDP", "ICMP", "HTTP", "DNS"]

def generate_fake_flow():
    """Generates a payload exactly matching what Suricata produces."""
    return {
        "event_type": "flow",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "raw_event": {
            "proto": random.choice(PROTOCOLS),
            "src_ip": random.choice(FAKE_IPS),
            "dest_ip": "192.168.1.100", # Assume this is your protected server
            "flow": {
                # Random bandwidth between 500 Bytes and 5 Megabytes
                "bytes_toserver": random.randint(500, 5000000), 
                "bytes_toclient": random.randint(500, 5000000)
            }
        }
    }

def main():
    print("🚀 Starting Cloud Shield Live Traffic Simulator...")
    print(f"📡 Sending mock Suricata flow events to {API_URL}")
    print("Press Ctrl+C to stop.\n")

    session = requests.Session()

    try:
        while True:
            payload = generate_fake_flow()
            try:
                response = session.post(API_URL, json=payload)
                if response.status_code in [200, 201]:
                    total_bytes = payload["raw_event"]["flow"]["bytes_toserver"] + payload["raw_event"]["flow"]["bytes_toclient"]
                    mb_sent = total_bytes / (1024 * 1024)
                    ip = payload['raw_event']['src_ip']
                    proto = payload['raw_event']['proto']
                    
                    print(f"✅ Sent flow: {ip:<15} via {proto:<5} ({mb_sent:.2f} MB)")
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