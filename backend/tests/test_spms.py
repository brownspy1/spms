import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.app.main import app
from backend.app.database import Base, get_db
from backend.app.core.security import get_password_hash
from backend.app.models.models import User, Medicine, Batch
from datetime import date, timedelta

from sqlalchemy.pool import StaticPool

# In-memory test database with StaticPool so all connections share the same memory DB
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    
    # Create test users
    admin = User(
        username="admin_test",
        email="admin_test@test.local",
        full_name="Admin User",
        role="Admin",
        hashed_password=get_password_hash("TestPass123!"),
        is_active=True
    )
    staff = User(
        username="staff_test",
        email="staff_test@test.local",
        full_name="Staff User",
        role="Staff",
        hashed_password=get_password_hash("TestPass123!"),
        is_active=True
    )
    db.add_all([admin, staff])

    # Create test medicines and batches
    med1 = Medicine(
        brand_name="Coumadin",
        generic_name="Warfarin",
        category="Anticoagulants",
        dosage_form="Tablet",
        strength="5mg",
        manufacturer="BMS",
        requires_prescription=True,
        unit_price=1.00,
        reorder_level=10
    )
    med2 = Medicine(
        brand_name="Bayer Aspirin",
        generic_name="Aspirin",
        category="Analgesics",
        dosage_form="Tablet",
        strength="81mg",
        manufacturer="Bayer",
        requires_prescription=False,
        unit_price=0.50,
        reorder_level=10
    )
    db.add_all([med1, med2])
    db.commit()

    # Batches for med1 (Warfarin) with different expiries to test FEFO
    b1 = Batch(
        medicine_id=med1.id,
        batch_number="B1-EARLY",
        manufacture_date=date.today() - timedelta(days=100),
        expiry_date=date.today() + timedelta(days=50), # Expiring earlier
        initial_quantity=20,
        current_quantity=20,
        purchase_cost=0.40,
        selling_price=1.00
    )
    b2 = Batch(
        medicine_id=med1.id,
        batch_number="B2-LATER",
        manufacture_date=date.today() - timedelta(days=50),
        expiry_date=date.today() + timedelta(days=300), # Expiring later
        initial_quantity=50,
        current_quantity=50,
        purchase_cost=0.40,
        selling_price=1.00
    )
    db.add_all([b1, b2])
    db.commit()

    yield
    Base.metadata.drop_all(bind=engine)

def test_login_success():
    response = client.post("/api/auth/login", json={"username": "admin_test", "password": "TestPass123!"})
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["role"] == "Admin"

def test_account_lockout_after_failed_attempts():
    for _ in range(5):
        resp = client.post("/api/auth/login", json={"username": "admin_test", "password": "WrongPassword!"})
        assert resp.status_code == 401

    # 6th attempt should be blocked by account lockout (403 Forbidden)
    locked_resp = client.post("/api/auth/login", json={"username": "admin_test", "password": "TestPass123!"})
    assert locked_resp.status_code == 403
    assert "temporarily locked" in locked_resp.json()["detail"]

def test_rbac_admin_endpoint_denied_for_staff():
    # Login as Staff
    staff_login = client.post("/api/auth/login", json={"username": "staff_test", "password": "TestPass123!"})
    token = staff_login.json()["access_token"]

    # Try to access Admin-only audit logs
    headers = {"Authorization": f"Bearer {token}"}
    audit_resp = client.get("/api/audit", headers=headers)
    assert audit_resp.status_code == 403

def test_clinical_drug_interaction_checker():
    # Login
    login = client.post("/api/auth/login", json={"username": "admin_test", "password": "TestPass123!"})
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Test checking Warfarin + Aspirin (Known Major interaction)
    payload = {
        "drug_names": ["Warfarin", "Aspirin"],
        "patient_allergies": "None"
    }
    resp = client.post("/api/interactions/check", json=payload, headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["has_critical_warning"] is True
    assert data["highest_severity"] == "Major"
    assert len(data["interactions"]) >= 1
    assert "bleeding" in data["interactions"][0]["clinical_effect"].lower() or "hemorrhage" in data["interactions"][0]["clinical_effect"].lower()

def test_pos_fefo_stock_allocation():
    # Login
    login = client.post("/api/auth/login", json={"username": "admin_test", "password": "TestPass123!"})
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Get Warfarin medicine ID
    db = TestingSessionLocal()
    warfarin = db.query(Medicine).filter(Medicine.generic_name == "Warfarin").first()

    # Checkout 10 tablets without specifying batch. FEFO must allocate from B1-EARLY
    checkout_payload = {
        "items": [{"medicine_id": warfarin.id, "quantity": 10}],
        "customer_name": "Test Patient",
        "payment_method": "Cash",
        "discount_amount": 0.0,
        "tax_percent": 0.0
    }
    resp = client.post("/api/pos/checkout", json=checkout_payload, headers=headers)
    assert resp.status_code == 200
    sale_data = resp.json()
    assert sale_data["total_amount"] == 10.00
    assert sale_data["items"][0]["batch_number"] == "B1-EARLY"
    assert sale_data["items"][0]["quantity"] == 10

    # Verify B1-EARLY quantity dropped from 20 to 10
    b1 = db.query(Batch).filter(Batch.batch_number == "B1-EARLY").first()
    assert b1.current_quantity == 10

def test_health_and_spa():
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "healthy"

    # Test SPA fallback
    spa_resp = client.get("/")
    assert spa_resp.status_code == 200
    assert "SPMS" in spa_resp.text or "html" in spa_resp.text

def test_audit_trail_recorded():
    # Login as Admin
    login = client.post("/api/auth/login", json={"username": "admin_test", "password": "TestPass123!"})
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    audit_resp = client.get("/api/audit", headers=headers)
    assert audit_resp.status_code == 200
    logs = audit_resp.json()
    assert len(logs) > 0
    # Audit log should contain LOGIN_SUCCESS
    actions = [l["action"] for l in logs]
    assert "LOGIN_SUCCESS" in actions
