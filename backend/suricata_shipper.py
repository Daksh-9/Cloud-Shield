import time
import json
import requests
import os
import tailer
import sys

# --- CONFIGURATION ---
# 1. Path to Suricata Logs
EVE_JSON_PATH = r"C:\Program Files\Suricata\log\eve.json"

# 2. Your API URL
BASE_URL = "http://localhost:8000"

# 3. EXISTING Admin Credentials
# (These must match the user currently saved in your MongoDB)
ADMIN_EMAIL = "admin@gmail.com"
ADMIN_PASSWORD = "Admin*123" 

# --- END CONFIGURATION ---

API_BATCH_URL = f"{BASE_URL}/suricata/events/batch"
LOGIN_URL = f"{BASE_URL}/auth/login"
BATCH_SIZE = 10
AUTH_TOKEN = None

def login():
    """Authenticates using the credentials provided above."""
    global AUTH_TOKEN
    print(f"[*] Authenticating as: {ADMIN_EMAIL}...")
    
    try:
        response = requests.post(LOGIN_URL, json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        if response.status_code == 200:
            data = response.json()
            AUTH_TOKEN = data.get("access_token")
            print("[+] Login successful. Token acquired.")
            return True
        elif response.status_code == 401:
            print(f"[!] Authentication Failed: Incorrect Email or Password.")
            print(f"    Please edit 'suricata_shipper.py' and update ADMIN_EMAIL/ADMIN_PASSWORD")
            print(f"    to match the user in your MongoDB.")
            return False
        else:
            print(f"[!] Login failed: {response.status_code} - {response.text}")
            return False
            
    except requests.exceptions.ConnectionError:
        print(f"[!] Could not connect to Backend at {BASE_URL}. Is it running?")
        return False
    except Exception as e:
        print(f"[!] Login error: {e}")
        return False

def process_logs():
    print(f"[*] Starting Log Shipper...")
    print(f"[*] Monitoring: {EVE_JSON_PATH}")
    
    # 1. Perform Initial Login
    if not login():
        print("[!] Exiting due to authentication failure.")
        return

    # 2. Check File Access
    if not os.path.exists(EVE_JSON_PATH):
        print(f"[!] Error: File not found at {EVE_JSON_PATH}")
        return

    batch = []
    
    try:
        # 3. Tail the file
        for line in tailer.follow(open(EVE_JSON_PATH, encoding='utf-8')):
            try:
                event = json.loads(line)
                batch.append(event)
                
                if len(batch) >= BATCH_SIZE:
                    send_batch(batch)
                    batch = []
                    
            except json.JSONDecodeError:
                continue
    except KeyboardInterrupt:
        print("\n[*] Stopping Log Shipper.")
    except Exception as e:
        print(f"[!] Critical Error: {e}")

def send_batch(events):
    global AUTH_TOKEN
    
    headers = {"Authorization": f"Bearer {AUTH_TOKEN}"}
    
    try:
        response = requests.post(API_BATCH_URL, json=events, headers=headers)
        
        if response.status_code == 201:
            print(f"[+] Synced {len(events)} events.")
            
        elif response.status_code == 401:
            print("[!] Token expired. Re-authenticating...")
            if login():
                # Retry with new token
                headers["Authorization"] = f"Bearer {AUTH_TOKEN}"
                requests.post(API_BATCH_URL, json=events, headers=headers)
        else:
            print(f"[!] API Error {response.status_code}: {response.text}")
            
    except Exception as e:
        print(f"[!] Error sending batch: {e}")

if __name__ == "__main__":
    process_logs()