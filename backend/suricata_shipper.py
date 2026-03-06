import os
import time
import json
import logging
import requests
from requests.exceptions import ConnectionError

# --- Configuration ---
# Update this path to exactly where Suricata generates its eve.json on your Windows machine
EVE_JSON_PATH = r"C:\Program Files\Suricata\log\eve.json" 

# The endpoint in your FastAPI backend that receives the logs (Updated to remove /api)
API_ENDPOINT = "http://localhost:8000/suricata/events"

# Set up basic logging so we can see what the shipper is doing
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S"
)

def follow_file(file_path):
    """
    Generator function that yields new lines in a file as they are written.
    It acts exactly like the Linux `tail -f` command.
    """
    # Wait until the file actually exists (in case Suricata hasn't created it yet)
    while not os.path.exists(file_path):
        logging.warning(f"File {file_path} not found. Waiting 5 seconds...")
        time.sleep(5)

    with open(file_path, "r", encoding="utf-8") as file:
        # Go to the very end of the file. We only want NEW logs, not historical ones.
        file.seek(0, os.SEEK_END)
        logging.info(f"Successfully connected to {file_path}. Waiting for new traffic...")

        while True:
            line = file.readline()
            if not line:
                # No new data, sleep for 0.1 seconds to prevent high CPU usage
                time.sleep(0.1)
                continue
            yield line

def start_shipper():
    """Reads lines from eve.json and POSTs them to the backend."""
    logging.info("Starting Cloud Shield Suricata Shipper...")
    logging.info(f"Target API: {API_ENDPOINT}")
    
    # Create a session object to reuse the TCP connection for speed
    session = requests.Session()
    
    for raw_line in follow_file(EVE_JSON_PATH):
        try:
            # 1. Parse the raw string into a Python dictionary
            eve_event = json.loads(raw_line.strip())
            
            # Optional: Filter out noisy event types here if you only want alerts and flows
            # if eve_event.get("event_type") not in ["alert", "flow", "dns"]:
            #     continue
                
            # 2. Send the JSON payload to your FastAPI backend
            response = session.post(API_ENDPOINT, json=eve_event)
            
            # 3. Handle the response
            if response.status_code in [200, 201]:
                event_type = eve_event.get("event_type", "unknown").upper()
                
                # If it's an alert, print it in red/warning for visibility
                if event_type == "ALERT":
                    alert_msg = eve_event.get('alert', {}).get('signature', 'Unknown Alert')
                    logging.warning(f"🚨 ALERT SHIPPED: {alert_msg}")
                else:
                    logging.info(f"Shipped event: {event_type}")
            else:
                logging.error(f"Backend rejected payload. Status Code: {response.status_code}")
                
        except json.JSONDecodeError:
            logging.error("Failed to parse line as JSON. Skipping.")
        except ConnectionError:
            logging.error("Cannot connect to FastAPI backend. Is it running? Retrying in 2s...")
            time.sleep(2)
        except Exception as e:
            logging.error(f"Unexpected error: {str(e)}")

if __name__ == "__main__":
    try:
        start_shipper()
    except KeyboardInterrupt:
        logging.info("Shipper stopped by user.")