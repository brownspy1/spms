import os
import json
import uuid
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Request
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.core.config import settings
from backend.app.models.models import Prescription, Customer, User
from backend.app.schemas.schemas import PrescriptionResponse
from backend.app.api.auth import get_current_user, RoleChecker
from backend.app.services.ocr_service import validate_uploaded_file, extract_prescription_data
from backend.app.services.audit_service import log_audit_event

router = APIRouter(prefix="/prescriptions", tags=["Prescriptions"])

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.get("", response_model=List[PrescriptionResponse])
def list_prescriptions(
    status: Optional[str] = None,
    include_archived: bool = False,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List prescription records with filtering by status and compliance retention status."""
    query = db.query(Prescription)
    if not include_archived:
        query = query.filter(Prescription.is_archived == False)
    if status:
        query = query.filter(Prescription.status == status)
    return query.order_by(Prescription.created_at.desc()).all()

@router.post("/upload", response_model=PrescriptionResponse)
async def upload_prescription(
    file: UploadFile = File(...),
    customer_name: Optional[str] = Form(None),
    doctor_name: Optional[str] = Form(None),
    notes: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    request: Request = None
):
    """
    Secure prescription upload:
    - Validates file extension, MIME type, and magic bytes.
    - Limits size to 5MB.
    - Runs clinical OCR text and medicine detection.
    - Applies 90-day retention deadline.
    - Logs audit trail.
    """
    content = await file.read()
    validate_uploaded_file(file, content)

    # Save to local uploads with cryptographically safe filename
    file_ext = os.path.splitext(file.filename or "")[1].lower()
    unique_filename = f"rx_{uuid.uuid4().hex}{file_ext}"
    saved_path = os.path.join(UPLOAD_DIR, unique_filename)
    with open(saved_path, "wb") as f:
        f.write(content)

    # Perform clinical OCR & parsing
    ocr_result = extract_prescription_data(content, file.filename)

    retention_date = datetime.now(timezone.utc) + timedelta(days=settings.PRESCRIPTION_RETENTION_DAYS)

    rx = Prescription(
        customer_name=customer_name or ocr_result["customer_name"],
        doctor_name=doctor_name or ocr_result["doctor_name"],
        image_url=f"/uploads/{unique_filename}",
        extracted_text=ocr_result["extracted_text"],
        extracted_medicines=ocr_result["extracted_medicines"],
        notes=notes or ocr_result["notes"],
        status="Pending",
        retention_deadline=retention_date,
        is_archived=False
    )
    db.add(rx)
    db.commit()
    db.refresh(rx)

    log_audit_event(
        db=db,
        action="PRESCRIPTION_UPLOADED",
        entity_type="Prescription",
        entity_id=str(rx.id),
        user=current_user,
        after_values={
            "filename": unique_filename,
            "patient": rx.customer_name,
            "retention_deadline": str(rx.retention_deadline)
        },
        details=f"Prescription uploaded by {current_user.username}",
        request=request
    )

    return rx

@router.put("/{id}/status")
def update_prescription_status(
    id: int,
    new_status: str,
    current_user: User = Depends(RoleChecker(["Admin", "Pharmacist"])),
    db: Session = Depends(get_db),
    request: Request = None
):
    """Update prescription status (Pending, Approved, Dispensed, Rejected)."""
    rx = db.query(Prescription).filter(Prescription.id == id).first()
    if not rx:
        raise HTTPException(status_code=404, detail="Prescription not found")

    valid_statuses = ["Pending", "Approved", "Dispensed", "Rejected"]
    if new_status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of {valid_statuses}")

    old_status = rx.status
    rx.status = new_status
    db.commit()

    log_audit_event(
        db=db,
        action="PRESCRIPTION_STATUS_UPDATED",
        entity_type="Prescription",
        entity_id=str(rx.id),
        user=current_user,
        before_values={"status": old_status},
        after_values={"status": new_status},
        details=f"Prescription #{rx.id} status changed from {old_status} to {new_status} by {current_user.username}",
        request=request
    )

    return {"status": "success", "id": rx.id, "new_status": new_status}

@router.post("/retention/cleanup")
def run_retention_cleanup(
    current_admin: User = Depends(RoleChecker(["Admin"])),
    db: Session = Depends(get_db),
    request: Request = None
):
    """
    Enforces compliance retention policy (e.g. 90 days).
    Archives/purges prescription images and records past the retention deadline.
    """
    now = datetime.now(timezone.utc)
    expired_records = db.query(Prescription).filter(
        Prescription.retention_deadline <= now,
        Prescription.is_archived == False
    ).all()

    archived_count = 0
    for rx in expired_records:
        rx.is_archived = True
        # Optionally remove raw image file to minimize sensitive health data storage
        if rx.image_url:
            filename = os.path.basename(rx.image_url)
            file_path = os.path.join(UPLOAD_DIR, filename)
            if os.path.exists(file_path):
                try:
                    os.remove(file_path)
                except OSError as err:
                    print(f"Warning: unable to delete expired prescription file {file_path}: {err}")
        archived_count += 1

    db.commit()

    log_audit_event(
        db=db,
        action="RETENTION_POLICY_CLEANUP",
        entity_type="Prescription",
        user=current_admin,
        after_values={"archived_count": archived_count},
        details=f"Retention purge executed: archived {archived_count} expired prescription records",
        request=request
    )

    return {
        "status": "success",
        "archived_count": archived_count,
        "message": f"Successfully processed retention policy. {archived_count} expired records archived/cleaned."
    }
