from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
import httpx

from backend.app.database import get_db
from backend.app.models.models import SystemSetting, User
from backend.app.api.auth import get_current_user, RoleChecker
from backend.app.core.config import settings, get_gemini_api_key
from backend.app.services.audit_service import log_audit_event

router = APIRouter(prefix="/settings", tags=["System Configuration"])

class AISettingUpdate(BaseModel):
    gemini_api_key: str

class TestKeyRequest(BaseModel):
    api_key: Optional[str] = None

@router.get("/ai")
def get_ai_settings(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve status of configured Clinical AI (Gemini) integration."""
    active_key = get_gemini_api_key(db)
    is_configured = bool(active_key and len(active_key) > 5)
    
    masked_key = ""
    if is_configured:
        if len(active_key) > 10:
            masked_key = f"{active_key[:6]}...{active_key[-4:]}"
        else:
            masked_key = "********"

    return {
        "provider": "Google Gemini (2.5 Flash / 2.0 Flash / 1.5 Flash)",
        "is_configured": is_configured,
        "masked_key": masked_key,
        "features_enabled": [
            "AI Clinical Assistant Pharmacist Chat (Google Gemini 2.5 Flash)",
            "Multimodal Prescription OCR & Handwriting Recognition",
            "Pharmacological Mechanism Explanations"
        ]
    }

@router.post("/ai")
def update_ai_settings(
    req: AISettingUpdate,
    current_user: User = Depends(RoleChecker(["Admin", "Pharmacist"])),
    db: Session = Depends(get_db),
    request: Request = None
):
    """Save or update Gemini API key in system configuration."""
    clean_key = req.gemini_api_key.strip()
    
    setting = db.query(SystemSetting).filter(SystemSetting.key == "GEMINI_API_KEY").first()
    if not setting:
        setting = SystemSetting(
            key="GEMINI_API_KEY",
            value=clean_key,
            description="Google Gemini Clinical LLM and Vision API Key"
        )
        db.add(setting)
    else:
        setting.value = clean_key

    db.commit()

    masked = f"{clean_key[:6]}...{clean_key[-4:]}" if len(clean_key) > 10 else "SET"
    log_audit_event(
        db=db,
        action="GEMINI_KEY_UPDATED",
        entity_type="SystemSetting",
        entity_id="GEMINI_API_KEY",
        user=current_user,
        after_values={"masked_key": masked},
        details=f"Gemini API key updated by {current_user.username}",
        request=request
    )

    return {"status": "success", "message": "Gemini API key updated successfully."}

@router.post("/ai/test")
async def test_gemini_connection(
    req: TestKeyRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Test connectivity and model availability with Google Gemini API."""
    key_to_test = req.api_key.strip() if req.api_key else get_gemini_api_key(db)
    
    if not key_to_test:
        raise HTTPException(status_code=400, detail="No Gemini API key provided or configured to test.")

    test_url = f"https://generativelanguage.googleapis.com/v1beta/models?key={key_to_test}"
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            res = await client.get(test_url)
            if res.status_code == 200:
                data = res.json()
                models_count = len(data.get("models", []))
                return {
                    "valid": True,
                    "message": f"Successfully connected to Google Gemini! ({models_count} models accessible, including gemini-2.5-flash, gemini-2.0-flash, and gemini-1.5-flash)."
                }
            else:
                err_detail = res.text
                try:
                    err_json = res.json()
                    err_detail = err_json.get("error", {}).get("message", res.text)
                except Exception:
                    pass
                return {
                    "valid": False,
                    "message": f"Gemini API returned error ({res.status_code}): {err_detail}"
                }
    except Exception as e:
        return {
            "valid": False,
            "message": f"Network error testing Gemini API: {str(e)}"
        }
