import uuid
from datetime import datetime, date, timezone
from datetime import time as dt_time
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from sqlalchemy import or_

from backend.app.database import get_db
from backend.app.models.models import Sale, SaleItem, Medicine, Batch, User, Customer
from backend.app.schemas.schemas import CheckoutRequest, SaleResponse
from backend.app.api.auth import get_current_user
from backend.app.core.interactions_data import find_interactions
from backend.app.services.audit_service import log_audit_event

router = APIRouter(prefix="/pos", tags=["Point of Sale"])

def generate_invoice_number(db: Session) -> str:
    """Generates unique sequential invoice number: INV-YYYYMMDD-XXXX."""
    prefix = f"INV-{datetime.now(timezone.utc).strftime('%Y%m%d')}"
    count = db.query(Sale).filter(Sale.invoice_number.like(f"{prefix}%")).count()
    return f"{prefix}-{(count + 1):04d}"

@router.post("/checkout", response_model=SaleResponse)
def checkout(
    checkout_in: CheckoutRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    request: Request = None
):
    """
    Process POS sale:
    1. Cross-checks all cart items against clinical drug interaction engine.
    2. Requires pharmacist override reason if critical interaction detected.
    3. Allocates stock using FEFO (First Expired, First Out).
    4. Records sale, items, deductions, and audit trail.
    """
    if not checkout_in.items:
        raise HTTPException(status_code=400, detail="Cart is empty.")

    # 1. Gather all medicine generic names for clinical interaction check
    med_ids = [item.medicine_id for item in checkout_in.items]
    medicines = db.query(Medicine).filter(Medicine.id.in_(med_ids)).all()
    med_map = {m.id: m for m in medicines}

    if len(med_map) != len(set(med_ids)):
        raise HTTPException(status_code=404, detail="One or more medicines not found in catalog.")

    generic_names = [m.generic_name for m in medicines]
    detected_interactions = find_interactions(generic_names)

    # Check for Contraindicated or Major severity
    critical_interactions = [it for it in detected_interactions if it["severity"] in ["Contraindicated", "Major"]]
    if critical_interactions:
        if current_user.role not in ["Admin", "Pharmacist"]:
            raise HTTPException(
                status_code=403,
                detail="Dispensary Staff are not authorized to override critical clinical drug interactions. A licensed Pharmacist or Admin must review and authorize this transaction."
            )
        if not checkout_in.interaction_override_reason:
            first_crit = critical_interactions[0]
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "CRITICAL_DRUG_INTERACTION",
                    "message": f"Critical drug interaction detected between {first_crit['drug_a'].title()} and {first_crit['drug_b'].title()} ({first_crit['severity']}). An override reason from a licensed pharmacist is required to proceed.",
                    "interactions": critical_interactions
                }
            )

    # 2. FEFO Stock Allocation & Deduction
    allocated_sale_items = []
    subtotal = 0.0

    for item in checkout_in.items:
        med = med_map[item.medicine_id]
        needed_qty = item.quantity

        if needed_qty <= 0:
            raise HTTPException(status_code=400, detail=f"Invalid quantity for {med.brand_name}")

        # If batch_id specified, use it; otherwise auto-allocate FEFO
        if item.batch_id:
            batch = db.query(Batch).filter(Batch.id == item.batch_id, Batch.medicine_id == med.id).first()
            if not batch or batch.current_quantity < needed_qty:
                raise HTTPException(
                    status_code=400,
                    detail=f"Insufficient quantity in batch for {med.brand_name} (Requested: {needed_qty}, Available: {batch.current_quantity if batch else 0})"
                )
            batches_to_use = [(batch, needed_qty)]
        else:
            # FEFO: Order batches by earliest expiry date where current_quantity > 0
            avail_batches = db.query(Batch).filter(
                Batch.medicine_id == med.id,
                Batch.current_quantity > 0
            ).order_by(Batch.expiry_date.asc()).all()

            total_avail = sum(b.current_quantity for b in avail_batches)
            if total_avail < needed_qty:
                raise HTTPException(
                    status_code=400,
                    detail=f"Insufficient total inventory for {med.brand_name}. Requested: {needed_qty}, Available: {total_avail}"
                )

            batches_to_use = []
            remaining = needed_qty
            for b in avail_batches:
                if remaining <= 0:
                    break
                deduct = min(b.current_quantity, remaining)
                batches_to_use.append((b, deduct))
                remaining -= deduct

        for b, deduct_qty in batches_to_use:
            b.current_quantity -= deduct_qty
            line_subtotal = round(deduct_qty * b.selling_price, 2)
            subtotal += line_subtotal
            allocated_sale_items.append({
                "medicine_id": med.id,
                "batch_id": b.id,
                "medicine_name": f"{med.brand_name} ({med.strength})",
                "batch_number": b.batch_number,
                "quantity": deduct_qty,
                "unit_price": b.selling_price,
                "subtotal": line_subtotal
            })

    # 3. Calculate tax and discount
    subtotal = round(subtotal, 2)
    tax_amount = round(subtotal * (checkout_in.tax_percent / 100.0), 2)
    discount = round(min(checkout_in.discount_amount, subtotal), 2)
    total_amount = round(subtotal + tax_amount - discount, 2)

    invoice_no = generate_invoice_number(db)

    # 4. Create Sale Record
    sale = Sale(
        invoice_number=invoice_no,
        customer_id=checkout_in.customer_id,
        customer_name=checkout_in.customer_name or "Walk-in Customer",
        user_id=current_user.id,
        subtotal=subtotal,
        tax_amount=tax_amount,
        discount_amount=discount,
        total_amount=total_amount,
        payment_method=checkout_in.payment_method,
        interaction_override_reason=checkout_in.interaction_override_reason
    )
    db.add(sale)
    db.commit()
    db.refresh(sale)

    # 5. Create Sale Items
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

    db.commit()
    db.refresh(sale)

    # 6. Audit Logging
    audit_action = "POS_SALE_COMPLETED"
    if checkout_in.interaction_override_reason:
        audit_action = "POS_SALE_WITH_INTERACTION_OVERRIDE"

    log_audit_event(
        db=db,
        action=audit_action,
        entity_type="Sale",
        entity_id=str(sale.id),
        user=current_user,
        after_values={
            "invoice": sale.invoice_number,
            "total": sale.total_amount,
            "items_count": len(sale.items),
            "override": checkout_in.interaction_override_reason
        },
        details=f"Sale {sale.invoice_number} processed by {current_user.username}",
        request=request
    )

    return sale

@router.get("/sales")
def list_sales(
    search: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    payment_method: Optional[str] = None,
    user_id: Optional[int] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, le=200),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List sales with search, date range filtering, staff filtering, and pagination."""
    query = db.query(Sale)
    
    if search:
        search_term = f"%{search}%"
        query = query.outerjoin(Customer, Sale.customer_id == Customer.id).filter(
            or_(
                Sale.customer_name.ilike(search_term),
                Sale.invoice_number.ilike(search_term),
                Customer.phone.ilike(search_term)
            )
        )
    
    if date_from:
        query = query.filter(Sale.created_at >= datetime.combine(date_from, datetime.min.time()).replace(tzinfo=timezone.utc))
    if date_to:
        query = query.filter(Sale.created_at <= datetime.combine(date_to, dt_time(23, 59, 59)).replace(tzinfo=timezone.utc))
    
    if payment_method:
        query = query.filter(Sale.payment_method == payment_method)
        
    if user_id:
        query = query.filter(Sale.user_id == user_id)
    
    total = query.count()
    sales = query.order_by(Sale.created_at.desc()).offset(skip).limit(limit).all()
    
    # Enrich with customer_phone, cashier_name, cashier_role, cashier_username
    results = []
    for s in sales:
        data = SaleResponse.model_validate(s).model_dump()
        data["customer_phone"] = s.customer.phone if s.customer else None
        data["cashier_name"] = s.user.full_name if s.user else None
        data["cashier_role"] = s.user.role if s.user else None
        data["cashier_username"] = s.user.username if s.user else None
        data["prescription_id"] = s.prescription_id
        results.append(data)
    
    return {"sales": results, "total": total}

@router.get("/sales-staff-breakdown")
def get_staff_sales_breakdown(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Detailed audit breakdown of sales grouped by staff member:
    Allows Admin and Pharmacists to see which staff/pharmacist sold which medicines,
    to which customers, and for what total amounts.
    """
    sales = db.query(Sale).order_by(Sale.created_at.desc()).all()
    
    staff_map = {}
    for s in sales:
        u = s.user
        uid = s.user_id
        if uid not in staff_map:
            staff_map[uid] = {
                "user_id": uid,
                "full_name": u.full_name if u else f"Staff #{uid}",
                "username": u.username if u else "unknown",
                "role": u.role if u else "Staff",
                "total_sales_count": 0,
                "total_revenue": 0.0,
                "medicines_sold": {},
                "customers_served": {},
                "recent_sales": []
            }
        
        entry = staff_map[uid]
        entry["total_sales_count"] += 1
        entry["total_revenue"] = round(entry["total_revenue"] + s.total_amount, 2)
        
        # Track customer details
        cust_key = s.customer_name or "Walk-in Customer"
        cust_phone = s.customer.phone if s.customer else None
        if cust_key not in entry["customers_served"]:
            entry["customers_served"][cust_key] = {
                "name": cust_key,
                "phone": cust_phone,
                "orders_count": 0,
                "total_spent": 0.0
            }
        entry["customers_served"][cust_key]["orders_count"] += 1
        entry["customers_served"][cust_key]["total_spent"] = round(
            entry["customers_served"][cust_key]["total_spent"] + s.total_amount, 2
        )
        
        # Track specific medicines sold by this staff member
        for it in s.items:
            med_name = it.medicine_name
            if med_name not in entry["medicines_sold"]:
                entry["medicines_sold"][med_name] = {
                    "medicine_name": med_name,
                    "total_quantity": 0,
                    "total_revenue": 0.0
                }
            entry["medicines_sold"][med_name]["total_quantity"] += it.quantity
            entry["medicines_sold"][med_name]["total_revenue"] = round(
                entry["medicines_sold"][med_name]["total_revenue"] + it.subtotal, 2
            )
            
        if len(entry["recent_sales"]) < 8:
            entry["recent_sales"].append({
                "id": s.id,
                "invoice_number": s.invoice_number,
                "customer_name": s.customer_name,
                "customer_phone": cust_phone,
                "total_amount": s.total_amount,
                "payment_method": s.payment_method,
                "created_at": s.created_at,
                "items_count": len(s.items)
            })
            
    # Format and sort by total revenue
    results = []
    for staff in staff_map.values():
        staff["medicines_sold"] = sorted(
            list(staff["medicines_sold"].values()),
            key=lambda x: x["total_revenue"],
            reverse=True
        )
        staff["customers_served"] = sorted(
            list(staff["customers_served"].values()),
            key=lambda x: x["total_spent"],
            reverse=True
        )
        results.append(staff)
        
    results.sort(key=lambda x: x["total_revenue"], reverse=True)
    return results

@router.get("/sales/{id}")
def get_sale_receipt(id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Retrieve sale by ID for thermal invoice printing and receipt generation."""
    sale = db.query(Sale).filter(Sale.id == id).first()
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")
    data = SaleResponse.model_validate(sale).model_dump()
    data["customer_phone"] = sale.customer.phone if sale.customer else None
    data["cashier_name"] = sale.user.full_name if sale.user else None
    data["cashier_role"] = sale.user.role if sale.user else None
    data["cashier_username"] = sale.user.username if sale.user else None
    data["prescription_id"] = sale.prescription_id
    return data
