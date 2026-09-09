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

def test_gemini_api_settings_and_update():
    # Login as Admin
    admin_login = client.post("/api/auth/login", json={"username": "admin_test", "password": "TestPass123!"})
    admin_token = admin_login.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # 1. Get AI settings
    get_resp = client.get("/api/settings/ai", headers=admin_headers)
    assert get_resp.status_code == 200
    assert "is_configured" in get_resp.json()

    # 2. Update AI settings as Admin
    update_resp = client.post("/api/settings/ai", json={"gemini_api_key": "AIzaSyMockTestKey12345"}, headers=admin_headers)
    assert update_resp.status_code == 200
    assert update_resp.json()["status"] == "success"

    # 3. Verify updated masked key
    get_resp_after = client.get("/api/settings/ai", headers=admin_headers)
    assert get_resp_after.status_code == 200
    assert get_resp_after.json()["is_configured"] is True
    assert "AIzaSy" in get_resp_after.json()["masked_key"]

    # 4. RBAC check: Staff role cannot update Gemini settings
    staff_login = client.post("/api/auth/login", json={"username": "staff_test", "password": "TestPass123!"})
    staff_token = staff_login.json()["access_token"]
    staff_headers = {"Authorization": f"Bearer {staff_token}"}
    staff_update = client.post("/api/settings/ai", json={"gemini_api_key": "HackerKey"}, headers=staff_headers)
    assert staff_update.status_code == 403

def test_prescription_preview_ocr():
    login = client.post("/api/auth/login", json={"username": "admin_test", "password": "TestPass123!"})
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Valid JPEG with magic bytes \xff\xd8\xff
    fake_jpeg = b"\xff\xd8\xff" + b"MockPrescriptionContent" * 10
    files = {"file": ("test_rx.jpg", fake_jpeg, "image/jpeg")}
    
    resp = client.post("/api/prescriptions/preview-ocr", files=files, headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "doctor_name" in data
    assert "customer_name" in data
    assert "extracted_medicines" in data
    assert "ocr_engine" in data

def test_user_management_crud():
    login = client.post("/api/auth/login", json={"username": "admin_test", "password": "TestPass123!"})
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create a new Staff member
    new_user_payload = {
        "username": "new_staff_member",
        "full_name": "Sarah Connor",
        "email": "sarah@spms.local",
        "role": "Staff",
        "password": "StaffPassword123!"
    }
    create_resp = client.post("/api/auth/users", json=new_user_payload, headers=headers)
    assert create_resp.status_code == 200
    user_id = create_resp.json()["id"]
    assert create_resp.json()["username"] == "new_staff_member"

    # 2. Update staff member role and status
    update_resp = client.put(f"/api/auth/users/{user_id}", json={"role": "Pharmacist", "is_active": False}, headers=headers)
    assert update_resp.status_code == 200
    assert update_resp.json()["role"] == "Pharmacist"
    assert update_resp.json()["is_active"] is False

    # 3. Reset lockout
    unlock_resp = client.put(f"/api/auth/users/{user_id}", json={"reset_lockout": True}, headers=headers)
    assert unlock_resp.status_code == 200

    # 4. Delete user
    del_resp = client.delete(f"/api/auth/users/{user_id}", headers=headers)
    assert del_resp.status_code == 200
    assert del_resp.json()["status"] == "success"

def test_prescription_ocr_with_real_image():
    from PIL import Image, ImageDraw
    import io
    
    login = client.post("/api/auth/login", json={"username": "admin_test", "password": "TestPass123!"})
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Draw an actual prescription image
    img = Image.new('RGB', (700, 350), color='white')
    draw = ImageDraw.Draw(img)
    draw.text((30, 30), "Dr. Sarah Jenkins, MD\nPatient: John Doe\nRx: Amoxicillin 500mg\nTake 1 capsule every 8 hours x 7 days", fill='black')
    
    buf = io.BytesIO()
    img.save(buf, format='JPEG')
    img_bytes = buf.getvalue()

    files = {"file": ("real_rx.jpg", img_bytes, "image/jpeg")}
    resp = client.post("/api/prescriptions/preview-ocr", files=files, headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "ocr_engine" in data
    assert "extracted_text" in data
    assert "Amoxicillin" in data["extracted_text"]

def test_consult_ai_assistant_gemini():
    login = client.post("/api/auth/login", json={"username": "admin_test", "password": "TestPass123!"})
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "prompt": "What are the contraindications for Metformin?",
        "context_drugs": ["Metformin"]
    }
    resp = client.post("/api/interactions/consult-ai", json=payload, headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "response" in data
    assert "safety_disclaimer" in data
    assert len(data["response"]) > 10

def test_list_sales_and_orders_history():
    login = client.post("/api/auth/login", json={"username": "admin_test", "password": "TestPass123!"})
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Create batch for med2 so it has stock
    db = TestingSessionLocal()
    from backend.app.models.models import Batch, Medicine
    med2 = db.query(Medicine).filter(Medicine.brand_name == "Bayer Aspirin").first()
    med2_id = med2.id
    b = Batch(
        medicine_id=med2_id,
        batch_number="ASP-TEST",
        manufacture_date=date.today() - timedelta(days=20),
        expiry_date=date.today() + timedelta(days=200),
        initial_quantity=50,
        current_quantity=50,
        purchase_cost=0.20,
        selling_price=0.50
    )
    db.add(b)
    db.commit()
    db.close()

    checkout_payload = {
        "items": [{"medicine_id": med2_id, "quantity": 3}],
        "customer_name": "Rahim Uddin",
        "payment_method": "Cash",
        "discount_amount": 0,
        "tax_percent": 5.0
    }
    resp = client.post("/api/pos/checkout", json=checkout_payload, headers=headers)
    assert resp.status_code == 200
    sale_data = resp.json()
    invoice_no = sale_data["invoice_number"]

    # Query sales list with search
    list_resp = client.get("/api/pos/sales?search=Rahim", headers=headers)
    assert list_resp.status_code == 200
    res = list_resp.json()
    assert "sales" in res
    assert res["total"] >= 1
    found = any(s["invoice_number"] == invoice_no for s in res["sales"])
    assert found

    # Query individual sale receipt
    sale_id = sale_data["id"]
    receipt_resp = client.get(f"/api/pos/sales/{sale_id}", headers=headers)
    assert receipt_resp.status_code == 200
    rec_data = receipt_resp.json()
    assert rec_data["invoice_number"] == invoice_no
    assert rec_data["customer_name"] == "Rahim Uddin"

def test_prescription_dispense_and_auto_create_order():
    import json
    from datetime import datetime, timezone, timedelta
    from backend.app.models.models import Prescription

    db = TestingSessionLocal()
    # Create an approved prescription with extracted medicines matching Coumadin (seeded with stock)
    rx = Prescription(
        customer_name="Karim Ullah",
        doctor_name="Dr. Jenkins",
        status="Approved",
        extracted_text="Rx: Coumadin 5mg take 2 tablets",
        extracted_medicines=json.dumps([{"name": "Coumadin", "quantity": 2}]),
        retention_deadline=datetime.now(timezone.utc) + timedelta(days=90),
        is_archived=False
    )
    db.add(rx)
    db.commit()
    db.refresh(rx)
    rx_id = rx.id
    db.close()

    login = client.post("/api/auth/login", json={"username": "admin_test", "password": "TestPass123!"})
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Dispense and auto create order
    dispense_payload = {
        "payment_method": "Mobile",
        "tax_percent": 5.0,
        "discount_amount": 0.0
    }
    resp = client.post(f"/api/prescriptions/{rx_id}/dispense-and-create-order", json=dispense_payload, headers=headers)
    assert resp.status_code == 200
    res = resp.json()
    assert "sale" in res
    assert res["sale"]["customer_name"] == "Karim Ullah"
    assert res["sale"]["payment_method"] == "Mobile"
    assert res["sale"]["prescription_id"] == rx_id
    assert len(res["sale"]["items"]) >= 1

    # Verify prescription status is now Dispensed
    rx_check = client.get("/api/prescriptions", headers=headers)
    assert rx_check.status_code == 200
    dispensed_rx = [r for r in rx_check.json() if r["id"] == rx_id][0]
    assert dispensed_rx["status"] == "Dispensed"

def test_staff_sales_breakdown_audit():
    login = client.post("/api/auth/login", json={"username": "admin_test", "password": "TestPass123!"})
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    resp = client.get("/api/pos/sales-staff-breakdown", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    if len(data) > 0:
        first = data[0]
        assert "user_id" in first
        assert "medicines_sold" in first
        assert "customers_served" in first
        assert "total_revenue" in first

def test_staff_blocked_from_clinical_interaction_override():
    login = client.post("/api/auth/login", json={"username": "staff_test", "password": "TestPass123!"})
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Warfarin (id 1) and Aspirin (id 2) trigger a critical/major interaction
    checkout_payload = {
        "items": [
            {"medicine_id": 1, "quantity": 1},
            {"medicine_id": 2, "quantity": 1}
        ],
        "customer_name": "Test Patient",
        "interaction_override_reason": "Staff attempt"
    }
    resp = client.post("/api/pos/checkout", json=checkout_payload, headers=headers)
    assert resp.status_code == 403
    assert "Dispensary Staff are not authorized" in resp.json()["detail"]


def test_enhanced_brand_normalization_and_contraindication():
    login = client.post("/api/auth/login", json={"username": "admin_test", "password": "TestPass123!"})
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "drug_names": ["Viagra", "Nitrostat"]
    }
    resp = client.post("/api/interactions/check", json=payload, headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["has_critical_warning"] is True
    assert data["highest_severity"] == "Contraindicated"
    assert data["total_interactions"] >= 1
    # Check that brand names were normalized
    generics = [item["generic"] for item in data["normalized_drugs"]]
    assert "sildenafil" in generics
    assert "nitroglycerin" in generics


def test_expanded_interactions_lithium_ibuprofen():
    login = client.post("/api/auth/login", json={"username": "admin_test", "password": "TestPass123!"})
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "drug_names": ["Lithium", "Ibuprofen"]
    }
    resp = client.post("/api/interactions/check", json=payload, headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["has_critical_warning"] is True
    assert data["highest_severity"] == "Major"
    assert any("renal" in it["mechanism"].lower() or "prostaglandin" in it["mechanism"].lower() for it in data["interactions"])


def test_enhanced_allergy_cross_reactivity():
    login = client.post("/api/auth/login", json={"username": "admin_test", "password": "TestPass123!"})
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Penicillin allergy with Amoxicillin
    payload_pen = {
        "drug_names": ["Amoxicillin"],
        "patient_allergies": "Penicillin"
    }
    resp_pen = client.post("/api/interactions/check", json=payload_pen, headers=headers)
    assert resp_pen.status_code == 200
    data_pen = resp_pen.json()
    assert len(data_pen["allergy_warnings"]) >= 1
    assert "Penicillin" in data_pen["allergy_warnings"][0] or "Beta-Lactam" in data_pen["allergy_warnings"][0]

    # NSAID allergy with Aspirin & Ibuprofen
    payload_nsaid = {
        "drug_names": ["Aspirin", "Ibuprofen"],
        "patient_allergies": "Severe NSAID allergy"
    }
    resp_nsaid = client.post("/api/interactions/check", json=payload_nsaid, headers=headers)
    assert resp_nsaid.status_code == 200
    data_nsaid = resp_nsaid.json()
    assert len(data_nsaid["allergy_warnings"]) >= 1


def test_cumulative_clinical_toxicity_scoring():
    login = client.post("/api/auth/login", json={"username": "admin_test", "password": "TestPass123!"})
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "drug_names": ["Warfarin", "Aspirin", "Clopidogrel"]
    }
    resp = client.post("/api/interactions/check", json=payload, headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "cumulative_risks" in data
    assert "bleeding" in data["cumulative_risks"]
    bleeding_risk = data["cumulative_risks"]["bleeding"]
    assert bleeding_risk["drug_count"] == 3
    assert bleeding_risk["severity"] == "High"



