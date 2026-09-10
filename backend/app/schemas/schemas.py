from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Dict, Any
from datetime import datetime, date

# --- Auth Schemas ---
class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: Dict[str, Any]

class TokenPayload(BaseModel):
    sub: Optional[str] = None
    role: Optional[str] = None
    type: Optional[str] = None

class LoginRequest(BaseModel):
    username: str
    password: str
    totp_code: Optional[str] = None

class UserBase(BaseModel):
    email: str
    username: str
    full_name: str
    role: str = "Staff"  # Admin, Pharmacist, Staff
    is_active: bool = True

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    is_2fa_enabled: bool
    created_at: datetime

    class Config:
        from_attributes = True

class Setup2FAResponse(BaseModel):
    secret: str
    otpauth_url: str

class Verify2FARequest(BaseModel):
    code: str

# --- Customer Schemas ---
class CustomerBase(BaseModel):
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    allergies: Optional[str] = None
    chronic_conditions: Optional[str] = None

class CustomerCreate(CustomerBase):
    pass

class CustomerResponse(CustomerBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

# --- Batch & Medicine Schemas ---
class BatchBase(BaseModel):
    batch_number: str
    manufacture_date: date
    expiry_date: date
    initial_quantity: int
    current_quantity: int
    purchase_cost: float
    selling_price: float

class BatchCreate(BatchBase):
    medicine_id: int

class BatchResponse(BatchBase):
    id: int
    medicine_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class MedicineBase(BaseModel):
    brand_name: str
    generic_name: str
    category: str
    dosage_form: str
    strength: str
    manufacturer: str
    barcode: Optional[str] = None
    requires_prescription: bool = False
    unit_price: float
    reorder_level: int = 20

class MedicineCreate(MedicineBase):
    initial_batch_number: Optional[str] = None
    initial_expiry_date: Optional[date] = None
    initial_quantity: Optional[int] = None
    initial_cost: Optional[float] = None

    @field_validator("initial_expiry_date", mode="before")
    @classmethod
    def empty_str_to_none_date(cls, v):
        if v == "" or (isinstance(v, str) and not v.strip()):
            return None
        return v

    @field_validator("initial_batch_number", mode="before")
    @classmethod
    def empty_str_to_none_str(cls, v):
        if isinstance(v, str) and not v.strip():
            return None
        return v

    @field_validator("initial_quantity", "initial_cost", mode="before")
    @classmethod
    def empty_str_to_none_num(cls, v):
        if v == "" or (isinstance(v, str) and not v.strip()):
            return None
        return v

class MedicineResponse(MedicineBase):
    id: int
    created_at: datetime
    updated_at: datetime
    total_stock: Optional[int] = 0
    batches: Optional[List[BatchResponse]] = []

    class Config:
        from_attributes = True

class StockAdjustmentCreate(BaseModel):
    batch_id: int
    adjustment_type: str = Field(..., description="Damage, Disposal, Recount, Return")
    quantity_change: int = Field(..., description="Positive or negative integer")
    reason: str = Field(..., min_length=5, description="Mandatory audit trail reason")

# --- POS & Sale Schemas ---
class CartItemInput(BaseModel):
    medicine_id: int
    quantity: int
    batch_id: Optional[int] = None  # If omitted, FEFO auto-allocates

class CheckoutRequest(BaseModel):
    items: List[CartItemInput]
    customer_id: Optional[int] = None
    customer_name: Optional[str] = "Walk-in Customer"
    payment_method: str = "Cash"
    discount_amount: float = 0.0
    tax_percent: float = 5.0
    interaction_override_reason: Optional[str] = None

class SaleItemResponse(BaseModel):
    id: int
    medicine_id: int
    batch_id: int
    medicine_name: str
    batch_number: str
    quantity: int
    unit_price: float
    subtotal: float

    class Config:
        from_attributes = True

class SaleResponse(BaseModel):
    id: int
    invoice_number: str
    customer_name: str
    user_id: int
    subtotal: float
    tax_amount: float
    discount_amount: float
    total_amount: float
    payment_method: str
    interaction_override_reason: Optional[str] = None
    customer_phone: Optional[str] = None
    cashier_name: Optional[str] = None  
    cashier_role: Optional[str] = None
    cashier_username: Optional[str] = None
    prescription_id: Optional[int] = None
    created_at: datetime
    items: List[SaleItemResponse]

    class Config:
        from_attributes = True

# --- Prescriptions ---
class PrescriptionResponse(BaseModel):
    id: int
    customer_id: Optional[int] = None
    customer_name: str
    doctor_name: Optional[str] = None
    image_url: Optional[str] = None
    extracted_text: Optional[str] = None
    extracted_medicines: Optional[str] = None
    notes: Optional[str] = None
    status: str
    retention_deadline: datetime
    is_archived: bool
    created_at: datetime

    class Config:
        from_attributes = True

# --- Supplier & Purchase Order Schemas ---
class SupplierBase(BaseModel):
    name: str
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None

class SupplierCreate(SupplierBase):
    pass

class SupplierResponse(SupplierBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class POItemCreate(BaseModel):
    medicine_id: int
    quantity: int
    unit_cost: float

class PurchaseOrderCreate(BaseModel):
    supplier_id: int
    notes: Optional[str] = None
    items: List[POItemCreate]

# --- Drug Interaction Schemas ---
class InteractionCheckRequest(BaseModel):
    drug_names: List[str]
    patient_allergies: Optional[str] = None

class InteractionResultItem(BaseModel):
    id: str
    drug_a: str
    drug_b: str
    severity: str
    mechanism: str
    clinical_effect: str
    management: str
    evidence: str
    matched_drugs: List[str]
    risk_category: Optional[str] = None
    source: Optional[str] = "Audited Clinical Guidelines"

class InteractionCheckResponse(BaseModel):
    has_critical_warning: bool
    total_interactions: int
    highest_severity: Optional[str] = None
    interactions: List[InteractionResultItem]
    allergy_warnings: List[str] = []
    clinical_summary: str
    cumulative_risks: Optional[Dict[str, Any]] = None
    openfda_findings: Optional[List[Dict[str, Any]]] = None
    normalized_drugs: Optional[List[Dict[str, Any]]] = None
    ai_clinical_notes: Optional[str] = None

class AIConsultRequest(BaseModel):
    prompt: str
    context_drugs: Optional[List[str]] = []

class AIConsultResponse(BaseModel):
    response: str
    safety_disclaimer: str
    model: Optional[str] = None

# --- Audit Log Schemas ---
class AuditLogResponse(BaseModel):
    id: int
    timestamp: datetime
    user_id: Optional[int] = None
    username: str
    user_role: str
    action: str
    entity_type: str
    entity_id: Optional[str] = None
    before_values: Optional[str] = None
    after_values: Optional[str] = None
    ip_address: Optional[str] = None
    details: Optional[str] = None

    class Config:
        from_attributes = True
