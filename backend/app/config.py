import os
from pathlib import Path
from typing import List
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from dotenv import load_dotenv

# --- 1. Load .env explicitly ---
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

class Settings(BaseSettings):
    # --- Application ---
    APP_NAME: str = "Cloud Shield"
    DEBUG: bool = True
    ENVIRONMENT: str = "production"  # Changed for Real World
    
    # --- Server ---
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # --- CORS ---
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:5173"]
    
    @field_validator('CORS_ORIGINS', mode='before')
    @classmethod
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(',')]
        return v

    # --- Database ---
    MONGO_URI: str = os.getenv("MONGO_URI", "mongodb://localhost:27017")
    DB_NAME: str = os.getenv("DB_NAME", "CloudShield")
    
    # --- Backups ---
    BACKUP_DIR: str = os.getenv("BACKUP_DIR", str(Path(__file__).resolve().parent.parent / "backups"))
    
    # --- Security ---
    SECRET_KEY: str = os.getenv("SECRET_KEY", "change_this_secret_in_production")
    ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # --- Suricata (Windows Native & Subprocess Configuration) ---
    SURICATA_RULES_PATH: str = os.getenv(
        "SURICATA_RULES_PATH", 
        r"C:\Program Files\Suricata\rules\local.rules"
    )
    
    # --- NEW: Subprocess Variables ---
    SURICATA_EXEC_PATH: str = os.getenv("SURICATA_EXEC_PATH", r"C:\Program Files\Suricata\suricata.exe")
    SURICATA_CONFIG_PATH: str = os.getenv("SURICATA_CONFIG_PATH", r"C:\Program Files\Suricata\suricata.yaml")
    SURICATA_INTERFACE: str = os.getenv("SURICATA_INTERFACE", "Ethernet") # Change this to your active adapter (e.g., Wi-Fi)
    
    model_config = SettingsConfigDict(
        env_file=str(env_path),
        case_sensitive=True,
        extra="ignore"
    )

settings = Settings()