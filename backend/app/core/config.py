import os
from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    PROJECT_NAME: str = "Smart Pharmacy Management System (SPMS)"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    
    # Security & JWT
    SECRET_KEY: str = os.getenv("SECRET_KEY", "spms-super-secret-key-pharmacy-prod-2026-secure-jwt-token-key-999")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 8  # 8 hours
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # Account Lockout & Security Policies
    MAX_FAILED_LOGIN_ATTEMPTS: int = 5
    LOCKOUT_DURATION_MINUTES: int = 15
    
    # Prescription Retention Policy (in days)
    PRESCRIPTION_RETENTION_DAYS: int = 90
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./spms.db")
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:8000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:8000",
        "*"
    ]
    
    # AI Assistant
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")

    class Config:
        case_sensitive = True

settings = Settings()

DEFAULT_GEMINI_API_KEY = ""

def get_gemini_api_key(db=None) -> str:
    """Returns dynamic Gemini API key from DB, environment variable, or configured system settings."""
    if db:
        try:
            from backend.app.models.models import SystemSetting
            setting = db.query(SystemSetting).filter(SystemSetting.key == "GEMINI_API_KEY").first()
            if setting and setting.value and setting.value.strip():
                val = setting.value.strip()
                if not val.startswith("AQ."):
                    return val
        except Exception:
            pass
    val = (settings.GEMINI_API_KEY or "").strip()
    if val and not val.startswith("AQ."):
        return val
    return ""

