import asyncio
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models.models import User
from backend.app.schemas.schemas import (
    InteractionCheckRequest, InteractionCheckResponse, AIConsultRequest, AIConsultResponse
)
from backend.app.api.auth import get_current_user
from backend.app.core.interactions_data import find_interactions, check_allergy_cross_reactivity
from backend.app.services.external_clinical_api import (
    normalize_drug_name, fetch_openfda_interactions, calculate_cumulative_risks
)
from backend.app.services.ai_service import consult_ai_assistant
from backend.app.core.config import get_gemini_api_key

router = APIRouter(prefix="/interactions", tags=["Drug Interactions & Clinical AI"])


@router.post("/check", response_model=InteractionCheckResponse)
async def check_drug_interactions(
    req: InteractionCheckRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Enhanced clinical drug-drug interaction checker.
    Combines:
    1. Zero-latency deterministic auditable clinical dataset (60+ critical interaction rules).
    2. Real-time NIH RxNav brand-to-generic drug normalization.
    3. Multi-drug cumulative clinical risk scoring (Bleeding, QTc, Hyperkalemia, Nephrotoxicity, Serotonin).
    4. Comprehensive allergy & cross-reactivity screening (Penicillins, Sulfa, NSAIDs, Opioids, Statins, ACEi).
    5. Real-time openFDA Drug Safety & Boxed Warning API lookup.
    6. Clinical Decision Support (CDS) AI synthesis.
    """
    if not req.drug_names or len(req.drug_names) < 1:
        return {
            "has_critical_warning": False,
            "total_interactions": 0,
            "highest_severity": None,
            "interactions": [],
            "allergy_warnings": [],
            "clinical_summary": "No medications provided for screening.",
            "cumulative_risks": {},
            "openfda_findings": [],
            "normalized_drugs": [],
            "ai_clinical_notes": None
        }

    # 1. Brand name & trade name normalization (via offline dictionary + NIH RxNav)
    norm_tasks = [normalize_drug_name(d) for d in req.drug_names if d and d.strip()]
    normalized_drugs = await asyncio.gather(*norm_tasks)
    
    # Generic names used for pharmacological cross-referencing
    generic_drug_names = [item["generic"] for item in normalized_drugs]

    # 2. Deterministic clinical interaction check against 60+ curated clinical rules
    interactions = find_interactions(generic_drug_names)

    # 3. Comprehensive allergy & pharmacological cross-reactivity screening
    all_drug_tokens = generic_drug_names + [item["input"] for item in normalized_drugs]
    allergy_warnings = check_allergy_cross_reactivity(all_drug_tokens, req.patient_allergies)

    # 4. Multi-drug cumulative clinical toxicity assessment
    cumulative_risks = calculate_cumulative_risks(generic_drug_names, interactions)

    # 5. Real-time openFDA Drug Label & Boxed Warning lookup for identified drug pairs
    openfda_findings = []
    if interactions:
        # Check openFDA for up to 3 top interaction pairs
        fda_tasks = []
        for it in interactions[:3]:
            fda_tasks.append(fetch_openfda_interactions(it["drug_a"], it["drug_b"]))
        fetched_fda = await asyncio.gather(*fda_tasks, return_exceptions=True)
        for res in fetched_fda:
            if isinstance(res, dict) and res:
                openfda_findings.append(res)

    # Determine critical flags
    has_critical = (
        any(it.get("severity") in ["Contraindicated", "Major"] for it in interactions)
        or len(allergy_warnings) > 0
        or any(cr.get("severity") == "High" for cr in cumulative_risks.values())
    )
    highest_sev = interactions[0]["severity"] if interactions else None

    # 6. Generate clinical summary statement
    if not interactions and not allergy_warnings and not cumulative_risks:
        summary = "Passed Safety Check: No documented clinical contraindications, major drug interactions, or allergy cross-reactivities detected among the evaluated medications."
    else:
        crit_count = sum(1 for it in interactions if it.get("severity") in ["Contraindicated", "Major"])
        cum_risk_count = len(cumulative_risks)
        summary_parts = [
            f"Detected {len(interactions)} clinical interaction(s) ({crit_count} high severity)",
            f"{len(allergy_warnings)} allergy warning(s)",
        ]
        if cum_risk_count > 0:
            risk_names = ", ".join(cr["label"] for cr in cumulative_risks.values())
            summary_parts.append(f"{cum_risk_count} cumulative toxicity alert(s) [{risk_names}]")

        summary = f"Clinical Alert: {', '.join(summary_parts)}. Backed by auditable clinical guidelines and openFDA safety database. Review management recommendations prior to dispensing."

    # 7. AI Clinical Notes (if Gemini is configured and multiple drugs evaluated)
    ai_clinical_notes = None
    if len(generic_drug_names) >= 2:
        try:
            gemini_key = get_gemini_api_key(db)
            if gemini_key:
                prompt_for_ai = (
                    f"Provide a brief 2-sentence clinical pharmacist note regarding co-administration of: "
                    f"{', '.join(generic_drug_names)}. Focus on key monitoring parameters or dose adjustments."
                )
                ai_res = await consult_ai_assistant(prompt_for_ai, generic_drug_names, db=db)
                if ai_res and ai_res.get("response") and not ai_res.get("response").startswith("Security Alert"):
                    ai_clinical_notes = ai_res["response"]
        except Exception:
            ai_clinical_notes = None

    return {
        "has_critical_warning": has_critical,
        "total_interactions": len(interactions),
        "highest_severity": highest_sev,
        "interactions": interactions,
        "allergy_warnings": allergy_warnings,
        "clinical_summary": summary,
        "cumulative_risks": cumulative_risks,
        "openfda_findings": openfda_findings,
        "normalized_drugs": normalized_drugs,
        "ai_clinical_notes": ai_clinical_notes
    }


@router.post("/consult-ai", response_model=AIConsultResponse)
async def consult_clinical_ai(
    req: AIConsultRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Clinical decision support AI assistant.
    Features prompt injection filtering, PII masking, and evidence-based pharmacology advice.
    """
    result = await consult_ai_assistant(req.prompt, req.context_drugs, db=db)
    return result
