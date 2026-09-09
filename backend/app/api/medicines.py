from datetime import datetime, date, timedelta, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.app.database import get_db
from backend.app.models.models import Medicine, Batch, StockAdjustment, User
from backend.app.schemas.schemas import (
    MedicineResponse, MedicineCreate, BatchResponse, BatchCreate, StockAdjustmentCreate
)
from backend.app.api.auth import get_current_user, RoleChecker
from backend.app.services.audit_service import log_audit_event

router = APIRouter(prefix="/medicines", tags=["Medicines & Inventory"])

@router.get("", response_model=List[MedicineResponse])
def list_medicines(
    search: Optional[str] = None,
    category: Optional[str] = None,
    requires_prescription: Optional[bool] = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve catalog of medicines with batch aggregates and live stock."""
    query = db.query(Medicine)

    if search:
        s = f"%{search}%"
        query = query.filter(
            (Medicine.brand_name.ilike(s)) |
            (Medicine.generic_name.ilike(s)) |
            (Medicine.barcode.ilike(s)) |
            (Medicine.manufacturer.ilike(s))
        )
    if category:
        query = query.filter(Medicine.category == category)
    if requires_prescription is not None:
        query = query.filter(Medicine.requires_prescription == requires_prescription)

    medicines = query.order_by(Medicine.brand_name.asc()).all()
    results = []
    for m in medicines:
        total_stock = sum(b.current_quantity for b in m.batches if b.current_quantity > 0)
        res = MedicineResponse.model_validate(m)
        res.total_stock = total_stock
        results.append(res)
    return results

@router.get("/alerts/low-stock")
def get_low_stock_alerts(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Returns all medicines where current total stock is at or below reorder level."""
    medicines = db.query(Medicine).all()
    low_stock = []
    for m in medicines:
        total_stock = sum(b.current_quantity for b in m.batches if b.current_quantity > 0)
        if total_stock <= m.reorder_level:
            low_stock.append({
                "id": m.id,
                "brand_name": m.brand_name,
                "generic_name": m.generic_name,
                "category": m.category,
                "current_stock": total_stock,
                "reorder_level": m.reorder_level,
                "unit_price": m.unit_price,
                "urgency": "CRITICAL" if total_stock == 0 else "WARNING"
            })
    return low_stock

@router.get("/alerts/expiring")
def get_expiring_batches(
    days: int = Query(90, description="Horizon in days to check for expiration"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Returns batches that are expired or will expire within specified days."""
    today = date.today()
    threshold = today + timedelta(days=days)

    batches = db.query(Batch).join(Medicine).filter(
        Batch.current_quantity > 0,
        Batch.expiry_date <= threshold
    ).order_by(Batch.expiry_date.asc()).all()

    alerts = []
    for b in batches:
        days_remaining = (b.expiry_date - today).days
        status = "EXPIRED" if days_remaining <= 0 else ("CRITICAL" if days_remaining <= 30 else "UPCOMING")
        alerts.append({
            "batch_id": b.id,
            "medicine_id": b.medicine_id,
            "brand_name": b.medicine.brand_name,
            "generic_name": b.medicine.generic_name,
            "batch_number": b.batch_number,
            "expiry_date": b.expiry_date.isoformat(),
            "days_remaining": days_remaining,
            "current_quantity": b.current_quantity,
            "status": status
        })
    return alerts

@router.get("/{id}", response_model=MedicineResponse)
def get_medicine_detail(id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get single medicine with its batches sorted FEFO (earliest expiry first)."""
    med = db.query(Medicine).filter(Medicine.id == id).first()
    if not med:
        raise HTTPException(status_code=404, detail="Medicine not found")
    
    total_stock = sum(b.current_quantity for b in med.batches if b.current_quantity > 0)
    # Sort batches by expiry date for FEFO
    sorted_batches = sorted(med.batches, key=lambda b: b.expiry_date)
    
    res = MedicineResponse.model_validate(med)
    res.total_stock = total_stock
    res.batches = [BatchResponse.model_validate(b) for b in sorted_batches]
    return res

@router.post("", response_model=MedicineResponse)
def create_medicine(
    med_in: MedicineCreate,
    current_user: User = Depends(RoleChecker(["Admin", "Pharmacist"])),
    db: Session = Depends(get_db),
    request: Request = None
):
    """Create a new medicine entry with optional initial batch."""
    med = Medicine(
        brand_name=med_in.brand_name,
        generic_name=med_in.generic_name,
        category=med_in.category,
        dosage_form=med_in.dosage_form,
        strength=med_in.strength,
        manufacturer=med_in.manufacturer,
        barcode=med_in.barcode,
        requires_prescription=med_in.requires_prescription,
        unit_price=med_in.unit_price,
        reorder_level=med_in.reorder_level
    )
    db.add(med)
    db.commit()
    db.refresh(med)

    if med_in.initial_batch_number and med_in.initial_expiry_date and med_in.initial_quantity:
        batch = Batch(
            medicine_id=med.id,
            batch_number=med_in.initial_batch_number,
            manufacture_date=date.today(),
            expiry_date=med_in.initial_expiry_date,
            initial_quantity=med_in.initial_quantity,
            current_quantity=med_in.initial_quantity,
            purchase_cost=med_in.initial_cost or (med_in.unit_price * 0.7),
            selling_price=med_in.unit_price
        )
        db.add(batch)
        db.commit()

    log_audit_event(
        db=db,
        action="MEDICINE_CREATED",
        entity_type="Medicine",
        entity_id=str(med.id),
        user=current_user,
        after_values={"brand_name": med.brand_name, "generic_name": med.generic_name, "price": med.unit_price},
        details=f"Created medicine {med.brand_name} ({med.generic_name})",
        request=request
    )

    db.refresh(med)
    res = MedicineResponse.model_validate(med)
    res.total_stock = sum(b.current_quantity for b in med.batches)
    return res

@router.post("/{id}/batches", response_model=BatchResponse)
def add_batch(
    id: int,
    batch_in: BatchBase,
    current_user: User = Depends(RoleChecker(["Admin", "Pharmacist"])),
    db: Session = Depends(get_db),
    request: Request = None
):
    """Add a new inventory batch for an existing medicine."""
    med = db.query(Medicine).filter(Medicine.id == id).first()
    if not med:
        raise HTTPException(status_code=404, detail="Medicine not found")

    batch = Batch(
        medicine_id=id,
        batch_number=batch_in.batch_number,
        manufacture_date=batch_in.manufacture_date,
        expiry_date=batch_in.expiry_date,
        initial_quantity=batch_in.initial_quantity,
        current_quantity=batch_in.current_quantity,
        purchase_cost=batch_in.purchase_cost,
        selling_price=batch_in.selling_price
    )
    db.add(batch)
    db.commit()
    db.refresh(batch)

    log_audit_event(
        db=db,
        action="BATCH_ADDED",
        entity_type="Batch",
        entity_id=str(batch.id),
        user=current_user,
        after_values={
            "batch_number": batch.batch_number,
            "quantity": batch.current_quantity,
            "expiry_date": str(batch.expiry_date)
        },
        details=f"Added batch {batch.batch_number} for {med.brand_name}",
        request=request
    )
    return batch

@router.post("/adjust-stock")
def adjust_stock(
    adj_in: StockAdjustmentCreate,
    current_user: User = Depends(RoleChecker(["Admin", "Pharmacist"])),
    db: Session = Depends(get_db),
    request: Request = None
):
    """
    Adjust batch quantity with mandatory audit logging and reason.
    Handles damage, recount, disposal, or returns.
    """
    batch = db.query(Batch).filter(Batch.id == adj_in.batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    old_qty = batch.current_quantity
    new_qty = old_qty + adj_in.quantity_change
    if new_qty < 0:
        raise HTTPException(status_code=400, detail="Stock adjustment would result in negative quantity.")

    batch.current_quantity = new_qty
    adj = StockAdjustment(
        batch_id=batch.id,
        medicine_id=batch.medicine_id,
        user_id=current_user.id,
        adjustment_type=adj_in.adjustment_type,
        quantity_change=adj_in.quantity_change,
        reason=adj_in.reason
    )
    db.add(adj)
    db.commit()

    log_audit_event(
        db=db,
        action="STOCK_ADJUSTMENT",
        entity_type="Batch",
        entity_id=str(batch.id),
        user=current_user,
        before_values={"quantity": old_qty},
        after_values={"quantity": new_qty, "change": adj_in.quantity_change, "type": adj_in.adjustment_type},
        details=f"Stock adjusted for batch {batch.batch_number}: {adj_in.reason}",
        request=request
    )

    return {
        "status": "success",
        "batch_id": batch.id,
        "old_quantity": old_qty,
        "new_quantity": new_qty,
        "reason": adj_in.reason
    }

@router.delete("/{id}")
def delete_medicine(
    id: int,
    current_admin: User = Depends(RoleChecker(["Admin"])),
    db: Session = Depends(get_db),
    request: Request = None
):
    """Admin only: deletes a medicine catalog entry and logs snapshot in audit trail."""
    med = db.query(Medicine).filter(Medicine.id == id).first()
    if not med:
        raise HTTPException(status_code=404, detail="Medicine not found")

    snapshot = {
        "id": med.id,
        "brand_name": med.brand_name,
        "generic_name": med.generic_name,
        "category": med.category,
        "unit_price": med.unit_price,
        "total_batches": len(med.batches)
    }

    db.delete(med)
    db.commit()

    log_audit_event(
        db=db,
        action="MEDICINE_DELETED",
        entity_type="Medicine",
        entity_id=str(id),
        user=current_admin,
        before_values=snapshot,
        details=f"Admin {current_admin.username} deleted medicine {snapshot['brand_name']}",
        request=request
    )
    return {"status": "success", "message": f"Medicine {snapshot['brand_name']} deleted."}
