from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models.models import User
from backend.app.schemas.schemas import (
    InteractionCheckRequest, InteractionCheckResponse, AIConsultRequest, AIConsultResponse
)
from backend.app.api.auth import get_current_user
from backend.app.core.interactions_data import find_interactions
from backend.app.services.ai_service import consult_ai_assistant

router = APIRouter(prefix="/interactions", tags=["Drug Interactions & Clinical AI"])

@router.post("/check", response_model=InteractionCheckResponse)
def check_drug_interactions(
    req: InteractionCheckRequest,
    user: User = Depends(get_current_user)
):
    """
    Deterministic clinical drug-drug interaction checker backed by auditable dataset.
    Evaluates risk across all drug pairs and flags contraindications, major risks,
    and cross-reactive patient allergies.
    """
    if not req.drug_names or len(req.drug_names) < 1:
        return {
            "has_critical_warning": False,
            "total_interactions": 0,
            "highest_severity": None,
            "interactions": [],
            "allergy_warnings": [],
            "clinical_summary": "No medications provided for screening."
        }

    # 1. Deterministic interaction check
    interactions = find_interactions(req.drug_names)
    
    # 2. Allergy screening
    allergy_warnings = []
    if req.patient_allergies:
        patient_allergies_lower = req.patient_allergies.lower()
        for drug in req.drug_names:
            d_lower = drug.lower()
            if (d_lower in patient_allergies_lower) or ("penicillin" in patient_allergies_lower and "amox" in d_lower) or ("nsaid" in patient_allergies_lower and any(n in d_lower for n in ["ibuprofen", "aspirin", "naproxen"])):
                allergy_warnings.append(f"ALLERGY ALERT: Prescribed medication '{drug}' matches patient reported allergy: '{req.patient_allergies}'")

    has_critical = any(it["severity"] in ["Contraindicated", "Major"] for it in interactions) or len(allergy_warnings) > 0
    highest_sev = interactions[0]["severity"] if interactions else None

    # Summary generator
    if not interactions and not allergy_warnings:
        summary = "No documented clinical contraindications or major drug interactions detected among the evaluated medications."
    else:
        crit_count = sum(1 for it in interactions if it["severity"] in ["Contraindicated", "Major"])
        summary = f"Detected {len(interactions)} clinical interaction(s) ({crit_count} high severity) and {len(allergy_warnings)} allergy warning(s). Review management recommendations prior to dispensing."

    return {
        "has_critical_warning": has_critical,
        "total_interactions": len(interactions),
        "highest_severity": highest_sev,
        "interactions": interactions,
        "allergy_warnings": allergy_warnings,
        "clinical_summary": summary
    }

@router.post("/consult-ai", response_model=AIConsultResponse)
async def consult_clinical_ai(
    req: AIConsultRequest,
    user: User = Depends(get_current_user)
):
    """
    Clinical decision support AI assistant.
    Features prompt injection filtering, PII masking, and evidence-based pharmacology advice.
    """
    result = await consult_ai_assistant(req.prompt, req.context_drugs)
    return result
