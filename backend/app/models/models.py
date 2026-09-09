from datetime import datetime, timezone
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, Date, ForeignKey, Text, JSON
)
from sqlalchemy.orm import relationship
from backend.app.database import Base

def utc_now():
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), default="Staff", nullable=False)  # Admin, Pharmacist, Staff
    is_active = Column(Boolean, default=True)
    is_2fa_enabled = Column(Boolean, default=False)
    totp_secret = Column(String(64), nullable=True)
    failed_login_attempts = Column(Integer, default=0)
    locked_until = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utc_now)

    sales = relationship("Sale", back_populates="user")
    stock_adjustments = relationship("StockAdjustment", back_populates="user")

class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    phone = Column(String(50), nullable=True, index=True)
    email = Column(String(255), nullable=True)
    allergies = Column(Text, nullable=True)  # e.g., "Penicillin, NSAIDs"
    chronic_conditions = Column(Text, nullable=True)  # e.g., "Hypertension, Type 2 Diabetes"
    created_at = Column(DateTime, default=utc_now)

    prescriptions = relationship("Prescription", back_populates="customer")
    sales = relationship("Sale", back_populates="customer")

class Medicine(Base):
    __tablename__ = "medicines"

    id = Column(Integer, primary_key=True, index=True)
    brand_name = Column(String(255), nullable=False, index=True)
    generic_name = Column(String(255), nullable=False, index=True)
    category = Column(String(100), nullable=False, index=True)
    dosage_form = Column(String(100), nullable=False)  # Tablet, Capsule, Syrup, etc.
    strength = Column(String(100), nullable=False)     # 500mg, 10mg, etc.
    manufacturer = Column(String(255), nullable=False)
    barcode = Column(String(100), unique=True, nullable=True, index=True)
    requires_prescription = Column(Boolean, default=False)
    unit_price = Column(Float, nullable=False)
    reorder_level = Column(Integer, default=20)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    batches = relationship("Batch", back_populates="medicine", cascade="all, delete-orphan")
    stock_adjustments = relationship("StockAdjustment", back_populates="medicine")

class Batch(Base):
    __tablename__ = "batches"

    id = Column(Integer, primary_key=True, index=True)
    medicine_id = Column(Integer, ForeignKey("medicines.id", ondelete="CASCADE"), nullable=False)
    batch_number = Column(String(100), nullable=False, index=True)
    manufacture_date = Column(Date, nullable=False)
    expiry_date = Column(Date, nullable=False, index=True)
    initial_quantity = Column(Integer, nullable=False)
    current_quantity = Column(Integer, nullable=False)
    purchase_cost = Column(Float, nullable=False)
    selling_price = Column(Float, nullable=False)
    created_at = Column(DateTime, default=utc_now)

    medicine = relationship("Medicine", back_populates="batches")
    adjustments = relationship("StockAdjustment", back_populates="batch")
    sale_items = relationship("SaleItem", back_populates="batch")

class StockAdjustment(Base):
    __tablename__ = "stock_adjustments"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("batches.id"), nullable=False)
    medicine_id = Column(Integer, ForeignKey("medicines.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    adjustment_type = Column(String(50), nullable=False)  # Damage, Disposal, Recount, Expiry Purge
    quantity_change = Column(Integer, nullable=False)     # e.g., -5 or +10
    reason = Column(Text, nullable=False)                 # Strict audit requirement
    created_at = Column(DateTime, default=utc_now)

    batch = relationship("Batch", back_populates="adjustments")
    medicine = relationship("Medicine", back_populates="stock_adjustments")
    user = relationship("User", back_populates="stock_adjustments")

class Prescription(Base):
    __tablename__ = "prescriptions"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=True)
    customer_name = Column(String(255), nullable=False)
    doctor_name = Column(String(255), nullable=True)
    image_url = Column(String(500), nullable=True)
    extracted_text = Column(Text, nullable=True)
    extracted_medicines = Column(Text, nullable=True)  # JSON-encoded array of detected medicines
    notes = Column(Text, nullable=True)
    status = Column(String(50), default="Pending")     # Pending, Approved, Dispensed, Rejected
    retention_deadline = Column(DateTime, nullable=False) # 90 days retention compliance
    is_archived = Column(Boolean, default=False)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    customer = relationship("Customer", back_populates="prescriptions")

class Sale(Base):
    __tablename__ = "sales"

    id = Column(Integer, primary_key=True, index=True)
    invoice_number = Column(String(100), unique=True, index=True, nullable=False)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=True)
    customer_name = Column(String(255), default="Walk-in Customer")
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    subtotal = Column(Float, nullable=False)
    tax_amount = Column(Float, default=0.0)
    discount_amount = Column(Float, default=0.0)
    total_amount = Column(Float, nullable=False)
    payment_method = Column(String(50), default="Cash")  # Cash, Card, Mobile
    interaction_override_reason = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now)

    user = relationship("User", back_populates="sales")
    customer = relationship("Customer", back_populates="sales")
    items = relationship("SaleItem", back_populates="sale", cascade="all, delete-orphan")

class SaleItem(Base):
    __tablename__ = "sale_items"

    id = Column(Integer, primary_key=True, index=True)
    sale_id = Column(Integer, ForeignKey("sales.id", ondelete="CASCADE"), nullable=False)
    medicine_id = Column(Integer, ForeignKey("medicines.id"), nullable=False)
    batch_id = Column(Integer, ForeignKey("batches.id"), nullable=False)
    medicine_name = Column(String(255), nullable=False)
    batch_number = Column(String(100), nullable=False)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Float, nullable=False)
    subtotal = Column(Float, nullable=False)

    sale = relationship("Sale", back_populates="items")
    batch = relationship("Batch", back_populates="sale_items")

class Supplier(Base):
    __tablename__ = "suppliers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, unique=True)
    contact_person = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    email = Column(String(255), nullable=True)
    address = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now)

    purchase_orders = relationship("PurchaseOrder", back_populates="supplier")

class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"

    id = Column(Integer, primary_key=True, index=True)
    po_number = Column(String(100), unique=True, index=True, nullable=False)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=False)
    created_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    approved_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    status = Column(String(50), default="Draft")  # Draft, Pending Approval, Approved, Received, Cancelled
    total_cost = Column(Float, default=0.0)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now)
    approved_at = Column(DateTime, nullable=True)
    received_at = Column(DateTime, nullable=True)

    supplier = relationship("Supplier", back_populates="purchase_orders")
    items = relationship("PurchaseOrderItem", back_populates="purchase_order", cascade="all, delete-orphan")

class PurchaseOrderItem(Base):
    __tablename__ = "purchase_order_items"

    id = Column(Integer, primary_key=True, index=True)
    purchase_order_id = Column(Integer, ForeignKey("purchase_orders.id", ondelete="CASCADE"), nullable=False)
    medicine_id = Column(Integer, ForeignKey("medicines.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    unit_cost = Column(Float, nullable=False)
    subtotal = Column(Float, nullable=False)

    purchase_order = relationship("PurchaseOrder", back_populates="items")

class AuditLog(Base):
    """
    Append-only immutable audit log table.
    Enforces security compliance for stock adjustments, batch modifications,
    critical alert overrides, and purchase order approvals.
    """
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=utc_now, nullable=False, index=True)
    user_id = Column(Integer, nullable=True, index=True)
    username = Column(String(100), nullable=False)
    user_role = Column(String(50), nullable=False)
    action = Column(String(100), nullable=False, index=True)
    entity_type = Column(String(100), nullable=False, index=True)
    entity_id = Column(String(100), nullable=True)
    before_values = Column(Text, nullable=True)  # JSON-encoded snapshot
    after_values = Column(Text, nullable=True)   # JSON-encoded snapshot
    ip_address = Column(String(100), nullable=True)
    details = Column(Text, nullable=True)

class SystemSetting(Base):
    """
    Dynamic application configuration storage (e.g. GEMINI_API_KEY, retention days).
    Allows administrators to configure AI keys directly in the dashboard UI.
    """
    __tablename__ = "system_settings"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(100), unique=True, index=True, nullable=False)
    value = Column(Text, nullable=False)
    description = Column(String(255), nullable=True)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)
