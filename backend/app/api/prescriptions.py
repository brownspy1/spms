import os
import json
import uuid
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Request
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.core.config import settings
from backend.app.models.models import Prescription, Customer, User, Medicine, Batch, Sale, SaleItem
from backend.app.schemas.schemas import PrescriptionResponse, SaleResponse
from backend.app.api.auth import get_current_user, RoleChecker
from backend.app.services.ocr_service import validate_uploaded_file, extract_prescription_data
from backend.app.services.audit_service import log_audit_event
from backend.app.core.interactions_data import find_interactions
from backend.app.api.pos import generate_invoice_number
from pydantic import BaseModel

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

@router.post("/preview-ocr")
async def preview_ocr_prescription(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Real-time prescription OCR preview:
    Triggers as soon as a file is selected, returning parsed medicines,
    patient name, prescriber, and OCR engine used (Gemini Vision or local clinical engine).
    """
    content = await file.read()
    validate_uploaded_file(file, content)
    ocr_result = await extract_prescription_data(
        content,
        file.filename or "prescription.jpg",
        mime_type=file.content_type or "image/jpeg",
        db=db
    )
    return ocr_result

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
    - Runs clinical OCR text and medicine detection (Gemini Vision if key provided).
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

    # Perform clinical OCR & parsing (with Gemini Vision support)
    ocr_result = await extract_prescription_data(
        content,
        file.filename or "prescription.jpg",
        mime_type=file.content_type or "image/jpeg",
        db=db
    )

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

class DispenseOrderRequest(BaseModel):
    customer_id: Optional[int] = None
    payment_method: str = "Cash"
    tax_percent: float = 5.0
    discount_amount: float = 0.0

@router.post("/{id}/dispense-and-create-order")
def dispense_and_create_order(
    id: int,
    order_data: DispenseOrderRequest = DispenseOrderRequest(),
    current_user: User = Depends(RoleChecker(["Admin", "Pharmacist"])),
    db: Session = Depends(get_db),
    request: Request = None
):
    """
    Dispense a prescription and auto-create a sale order:
    1. Parse extracted_medicines from the prescription
    2. Fuzzy-match each medicine to inventory (brand_name / generic_name)
    3. FEFO batch allocation for matched medicines
    4. Create Sale + SaleItems with prescription_id linkage
    5. Update prescription status to 'Dispensed'
    """
    rx = db.query(Prescription).filter(Prescription.id == id).first()
    if not rx:
        raise HTTPException(status_code=404, detail="Prescription not found")
    
    if rx.status == "Dispensed":
        raise HTTPException(status_code=400, detail="Prescription already dispensed")
    if rx.status == "Rejected":
        raise HTTPException(status_code=400, detail="Cannot dispense a rejected prescription")
    
    # Parse extracted medicines
    medicines_list = []
    if rx.extracted_medicines:
        try:
            medicines_list = json.loads(rx.extracted_medicines)
        except (json.JSONDecodeError, TypeError):
            medicines_list = []
    
    if not medicines_list:
        raise HTTPException(status_code=400, detail="No medicines extracted from prescription. Cannot auto-create order.")
    
    # Match extracted medicines to inventory
    matched_items = []
    unmatched_items = []
    
    for med_entry in medicines_list:
        med_name = med_entry.get("name", "") or med_entry.get("medicine", "") or ""
        med_name = med_name.strip()
        if not med_name:
            continue
        
        # Try exact then fuzzy match on brand_name or generic_name
        medicine = db.query(Medicine).filter(
            (Medicine.brand_name.ilike(f"%{med_name}%")) |
            (Medicine.generic_name.ilike(f"%{med_name}%"))
        ).first()
        
        if medicine:
            # Determine quantity (default 1 if not specified)
            qty = 1
            raw_qty = med_entry.get("quantity") or med_entry.get("qty") or med_entry.get("duration")
            if raw_qty:
                try:
                    qty = max(1, int(str(raw_qty).split()[0]))
                except (ValueError, IndexError):
                    qty = 1
            
            matched_items.append({"medicine": medicine, "quantity": qty, "name": med_name})
        else:
            unmatched_items.append(med_name)
    
    if not matched_items:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "NO_MEDICINES_MATCHED",
                "message": "None of the extracted medicines could be matched to inventory.",
                "unmatched": unmatched_items
            }
        )
    
    # FEFO Stock Allocation (same logic as POS checkout)
    allocated_sale_items = []
    subtotal = 0.0
    
    for item in matched_items:
        med = item["medicine"]
        needed_qty = item["quantity"]
        
        avail_batches = db.query(Batch).filter(
            Batch.medicine_id == med.id,
            Batch.current_quantity > 0
        ).order_by(Batch.expiry_date.asc()).all()
        
        total_avail = sum(b.current_quantity for b in avail_batches)
        if total_avail < needed_qty:
            # Reduce quantity to what's available, or skip if 0
            needed_qty = min(needed_qty, total_avail)
            if needed_qty == 0:
                unmatched_items.append(f"{item['name']} (out of stock)")
                continue
        
        remaining = needed_qty
        for b in avail_batches:
            if remaining <= 0:
                break
            deduct = min(b.current_quantity, remaining)
            b.current_quantity -= deduct
            line_subtotal = round(deduct * b.selling_price, 2)
            subtotal += line_subtotal
            allocated_sale_items.append({
                "medicine_id": med.id,
                "batch_id": b.id,
                "medicine_name": f"{med.brand_name} ({med.strength})",
                "batch_number": b.batch_number,
                "quantity": deduct,
                "unit_price": b.selling_price,
                "subtotal": line_subtotal
            })
            remaining -= deduct
    
    if not allocated_sale_items:
        raise HTTPException(status_code=400, detail="No stock available for any matched medicines.")
    
    # Calculate totals
    subtotal = round(subtotal, 2)
    tax_amount = round(subtotal * (order_data.tax_percent / 100.0), 2)
    discount = round(min(order_data.discount_amount, subtotal), 2)
    total_amount = round(subtotal + tax_amount - discount, 2)
    
    # Determine customer name
    customer_name = rx.customer_name or "Walk-in Customer"
    customer_id = order_data.customer_id or rx.customer_id
    
    invoice_no = generate_invoice_number(db)
    
    # Create Sale
    sale = Sale(
        invoice_number=invoice_no,
        customer_id=customer_id,
        customer_name=customer_name,
        user_id=current_user.id,
        subtotal=subtotal,
        tax_amount=tax_amount,
        discount_amount=discount,
        total_amount=total_amount,
        payment_method=order_data.payment_method,
        prescription_id=rx.id
    )
    db.add(sale)
    db.commit()
    db.refresh(sale)
    
    # Create Sale Items
    for it in allocated_sale_items:
        sale_item = SaleItem(
            sale_id=sale.id,
            medicine_id=it["medicine_id"],
            batch_id=it["batch_id"],
            medicine_name=it["medicine_name"],
            batch_number=it["batch_number"],
            quantity=it["quantity"],
            unit_price=it["unit_price"],
            subtotal=it["subtotal"]
        )
        db.add(sale_item)
    
    # Update prescription status
    old_status = rx.status
    rx.status = "Dispensed"
    db.commit()
    db.refresh(sale)
    
    # Audit logging
    log_audit_event(
        db=db,
        action="PRESCRIPTION_AUTO_DISPENSED",
        entity_type="Sale",
        entity_id=str(sale.id),
        user=current_user,
        after_values={
            "invoice": sale.invoice_number,
            "prescription_id": rx.id,
            "total": sale.total_amount,
            "matched_items": len(allocated_sale_items),
            "unmatched_items": unmatched_items
        },
        details=f"Auto-dispensed prescription #{rx.id} as sale {sale.invoice_number} by {current_user.username}",
        request=request
    )
    
    # Build response with enrichment
    sale_data = SaleResponse.model_validate(sale).model_dump()
    sale_data["customer_phone"] = sale.customer.phone if sale.customer else None
    sale_data["cashier_name"] = current_user.full_name
    sale_data["prescription_id"] = rx.id
    
    return {
        "sale": sale_data,
        "unmatched_medicines": unmatched_items,
        "message": f"Order created successfully. {len(allocated_sale_items)} items dispensed." + 
                   (f" {len(unmatched_items)} medicines could not be matched." if unmatched_items else "")
    }

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
