from datetime import datetime, date, timezone, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models.models import PurchaseOrder, PurchaseOrderItem, Supplier, Medicine, Batch, User
from backend.app.schemas.schemas import (
    SupplierResponse, SupplierCreate, PurchaseOrderCreate
)
from backend.app.api.auth import get_current_user, RoleChecker
from backend.app.services.audit_service import log_audit_event

router = APIRouter(prefix="/purchase-orders", tags=["Purchase Orders & Procurement"])

@router.get("/suppliers", response_model=List[SupplierResponse])
def list_suppliers(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """List all registered medicine suppliers."""
    return db.query(Supplier).order_by(Supplier.name.asc()).all()

@router.post("/suppliers", response_model=SupplierResponse)
def create_supplier(
    sup_in: SupplierCreate,
    current_user: User = Depends(RoleChecker(["Admin", "Pharmacist"])),
    db: Session = Depends(get_db),
    request: Request = None
):
    """Add a new pharmaceutical supplier to the directory."""
    existing = db.query(Supplier).filter(Supplier.name == sup_in.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Supplier name already exists.")

    sup = Supplier(
        name=sup_in.name,
        contact_person=sup_in.contact_person,
        phone=sup_in.phone,
        email=sup_in.email,
        address=sup_in.address
    )
    db.add(sup)
    db.commit()
    db.refresh(sup)

    log_audit_event(
        db=db,
        action="SUPPLIER_CREATED",
        entity_type="Supplier",
        entity_id=str(sup.id),
        user=current_user,
        after_values={"name": sup.name, "contact": sup.contact_person},
        details=f"Supplier {sup.name} registered by {current_user.username}",
        request=request
    )
    return sup

@router.get("")
def list_purchase_orders(
    status: Optional[str] = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List purchase orders with item details."""
    query = db.query(PurchaseOrder)
    if status:
        query = query.filter(PurchaseOrder.status == status)
    pos = query.order_by(PurchaseOrder.created_at.desc()).all()

    results = []
    for po in pos:
        results.append({
            "id": po.id,
            "po_number": po.po_number,
            "supplier_id": po.supplier_id,
            "supplier_name": po.supplier.name if po.supplier else "Unknown",
            "status": po.status,
            "total_cost": po.total_cost,
            "notes": po.notes,
            "created_at": po.created_at.isoformat() if po.created_at else None,
            "approved_at": po.approved_at.isoformat() if po.approved_at else None,
            "received_at": po.received_at.isoformat() if po.received_at else None,
            "items": [
                {
                    "id": it.id,
                    "medicine_id": it.medicine_id,
                    "medicine_name": it.purchase_order.supplier.name if it.purchase_order else "",
                    "quantity": it.quantity,
                    "unit_cost": it.unit_cost,
                    "subtotal": it.subtotal
                }
                for it in po.items
            ]
        })
    return results

@router.post("")
def create_purchase_order(
    po_in: PurchaseOrderCreate,
    current_user: User = Depends(RoleChecker(["Admin", "Pharmacist"])),
    db: Session = Depends(get_db),
    request: Request = None
):
    """Create a new procurement purchase order in 'Pending Approval' state."""
    if not po_in.items:
        raise HTTPException(status_code=400, detail="Purchase order must have at least one line item.")

    supplier = db.query(Supplier).filter(Supplier.id == po_in.supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found.")

    po_count = db.query(PurchaseOrder).count()
    po_number = f"PO-{datetime.now(timezone.utc).strftime('%Y%m')}-{(po_count + 1):04d}"

    total_cost = sum(it.quantity * it.unit_cost for it in po_in.items)

    po = PurchaseOrder(
        po_number=po_number,
        supplier_id=supplier.id,
        created_by_user_id=current_user.id,
        status="Pending Approval",
        total_cost=round(total_cost, 2),
        notes=po_in.notes
    )
    db.add(po)
    db.commit()
    db.refresh(po)

    for it in po_in.items:
        po_item = PurchaseOrderItem(
            purchase_order_id=po.id,
            medicine_id=it.medicine_id,
            quantity=it.quantity,
            unit_cost=it.unit_cost,
            subtotal=round(it.quantity * it.unit_cost, 2)
        )
        db.add(po_item)

    db.commit()

    log_audit_event(
        db=db,
        action="PO_CREATED",
        entity_type="PurchaseOrder",
        entity_id=str(po.id),
        user=current_user,
        after_values={"po_number": po.po_number, "total_cost": po.total_cost, "supplier": supplier.name},
        details=f"PO {po.po_number} created by {current_user.username}",
        request=request
    )

    return {"status": "success", "po_id": po.id, "po_number": po.po_number, "total_cost": po.total_cost}

@router.post("/{id}/approve")
def approve_purchase_order(
    id: int,
    current_admin: User = Depends(RoleChecker(["Admin"])),
    db: Session = Depends(get_db),
    request: Request = None
):
    """Admin only: approve a pending procurement order."""
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == id).first()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found.")

    if po.status != "Pending Approval":
        raise HTTPException(status_code=400, detail=f"Cannot approve PO in '{po.status}' state.")

    po.status = "Approved"
    po.approved_by_user_id = current_admin.id
    po.approved_at = datetime.now(timezone.utc)
    db.commit()

    log_audit_event(
        db=db,
        action="PO_APPROVED",
        entity_type="PurchaseOrder",
        entity_id=str(po.id),
        user=current_admin,
        after_values={"status": "Approved", "approver": current_admin.username},
        details=f"Purchase order {po.po_number} approved by Admin {current_admin.username}",
        request=request
    )

    return {"status": "success", "po_number": po.po_number, "new_status": po.status}

@router.post("/{id}/receive")
def receive_purchase_order(
    id: int,
    current_user: User = Depends(RoleChecker(["Admin", "Pharmacist"])),
    db: Session = Depends(get_db),
    request: Request = None
):
    """
    Receive stock for approved purchase order.
    Automatically instantiates new inventory batches and increments available stock.
    """
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == id).first()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found.")

    if po.status != "Approved":
        raise HTTPException(status_code=400, detail=f"Cannot receive PO in '{po.status}' state. Must be Approved first.")

    today = date.today()
    default_expiry = today + timedelta(days=365 * 2)  # 2 years default expiry for new stock

    created_batches = []
    for item in po.items:
        med = db.query(Medicine).filter(Medicine.id == item.medicine_id).first()
        if not med:
            continue

        batch_no = f"BTH-{po.po_number.split('-')[-1]}-{med.id}"
        batch = Batch(
            medicine_id=med.id,
            batch_number=batch_no,
            manufacture_date=today,
            expiry_date=default_expiry,
            initial_quantity=item.quantity,
            current_quantity=item.quantity,
            purchase_cost=item.unit_cost,
            selling_price=med.unit_price
        )
        db.add(batch)
        created_batches.append({"medicine": med.brand_name, "batch": batch_no, "qty": item.quantity})

    po.status = "Received"
    po.received_at = datetime.now(timezone.utc)
    db.commit()

    log_audit_event(
        db=db,
        action="PO_RECEIVED",
        entity_type="PurchaseOrder",
        entity_id=str(po.id),
        user=current_user,
        after_values={"status": "Received", "batches_created": created_batches},
        details=f"Purchase order {po.po_number} received and inventory updated by {current_user.username}",
        request=request
    )

    return {
        "status": "success",
        "po_number": po.po_number,
        "new_status": "Received",
        "batches_added": created_batches
    }
