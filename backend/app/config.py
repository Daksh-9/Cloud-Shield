import os
from pathlib import Path
from typing import List
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from dotenv import load_dotenv

# --- 1. Load .env explicitly (Fixes Login Flickering) ---
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

class Settings(BaseSettings):
    # --- Application ---
    APP_NAME: str = "Cloud Shield"
    DEBUG: bool = True
    ENVIRONMENT: str = "development"
    
    # --- Server (Fixes 'no attribute HOST' error) ---
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

    # --- Database (Matches your .env) ---
    MONGO_URI: str = os.getenv("MONGO_URI", "mongodb://localhost:27017")
    DB_NAME: str = os.getenv("DB_NAME", "CloudShield")
    
    # --- Security (Critical for Auth) ---
    SECRET_KEY: str = os.getenv("SECRET_KEY", "fallback_secret_key_for_dev_only")
    ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    model_config = SettingsConfigDict(
        env_file=str(env_path),
        case_sensitive=True,
        extra="ignore"
    )

settings = Settings()

# Debugging
print(f"DEBUG: Config loaded successfully.")
print(f"DEBUG: HOST={settings.HOST}, PORT={settings.PORT}")
print(f"DEBUG: SECRET_KEY starts with: {settings.SECRET_KEY[:5]}...")