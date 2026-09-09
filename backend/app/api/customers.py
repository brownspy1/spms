from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models.models import Customer, User
from backend.app.schemas.schemas import CustomerResponse, CustomerCreate
from backend.app.api.auth import get_current_user
from backend.app.services.audit_service import log_audit_event

router = APIRouter(prefix="/customers", tags=["Customers & Patients"])

@router.get("", response_model=List[CustomerResponse])
def list_customers(
    search: Optional[str] = None,
    limit: int = Query(50, le=100),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List customer records with search by name or phone."""
    query = db.query(Customer)
    if search:
        s = f"%{search}%"
        query = query.filter((Customer.name.ilike(s)) | (Customer.phone.ilike(s)))
    return query.order_by(Customer.name.asc()).limit(limit).all()

@router.post("", response_model=CustomerResponse)
def create_customer(
    cust_in: CustomerCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    request: Request = None
):
    """Register a new customer profile with allergy and medical conditions."""
    cust = Customer(
        name=cust_in.name,
        phone=cust_in.phone,
        email=cust_in.email,
        allergies=cust_in.allergies,
        chronic_conditions=cust_in.chronic_conditions
    )
    db.add(cust)
    db.commit()
    db.refresh(cust)

    log_audit_event(
        db=db,
        action="CUSTOMER_CREATED",
        entity_type="Customer",
        entity_id=str(cust.id),
        user=current_user,
        after_values={"name": cust.name, "phone": cust.phone, "allergies": cust.allergies},
        details=f"Customer {cust.name} registered by {current_user.username}",
        request=request
    )
    return cust

@router.get("/{id}", response_model=CustomerResponse)
def get_customer(id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Retrieve customer by ID."""
    cust = db.query(Customer).filter(Customer.id == id).first()
    if not cust:
        raise HTTPException(status_code=404, detail="Customer not found")
    return cust

@router.put("/{id}", response_model=CustomerResponse)
def update_customer(
    id: int,
    cust_in: CustomerCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    request: Request = None
):
    """Update customer details, allergies, and contact info."""
    cust = db.query(Customer).filter(Customer.id == id).first()
    if not cust:
        raise HTTPException(status_code=404, detail="Customer not found")

    before = {"name": cust.name, "phone": cust.phone, "allergies": cust.allergies}
    cust.name = cust_in.name
    cust.phone = cust_in.phone
    cust.email = cust_in.email
    cust.allergies = cust_in.allergies
    cust.chronic_conditions = cust_in.chronic_conditions
    db.commit()
    db.refresh(cust)

    log_audit_event(
        db=db,
        action="CUSTOMER_UPDATED",
        entity_type="Customer",
        entity_id=str(cust.id),
        user=current_user,
        before_values=before,
        after_values={"name": cust.name, "phone": cust.phone, "allergies": cust.allergies},
        details=f"Customer #{cust.id} updated by {current_user.username}",
        request=request
    )
    return cust
