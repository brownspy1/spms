import os
import sys
from datetime import datetime, date, timedelta, timezone

# Ensure project root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from backend.app.database import SessionLocal, Base, engine
from backend.app.core.security import get_password_hash
from backend.app.models.models import (
    User, Customer, Medicine, Batch, Supplier, PurchaseOrder,
    PurchaseOrderItem, Prescription, AuditLog
)

def seed_database():
    print("Creating all database tables...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Check if already seeded
        if db.query(User).count() > 0:
            print("Database already contains records. Skipping initial seeding.")
            return

        print("Seeding demo users...")
        users = [
            User(
                username="admin",
                email="admin@spms.local",
                full_name="Dr. Eleanor Vance (Chief Pharmacist)",
                role="Admin",
                hashed_password=get_password_hash("AdminPass123!"),
                is_active=True,
                is_2fa_enabled=False
            ),
            User(
                username="pharmacist",
                email="pharmacist@spms.local",
                full_name="Marcus Aurel, PharmD",
                role="Pharmacist",
                hashed_password=get_password_hash("PharmaPass123!"),
                is_active=True,
                is_2fa_enabled=False
            ),
            User(
                username="staff",
                email="staff@spms.local",
                full_name="Sarah Miller (Dispensary Staff)",
                role="Staff",
                hashed_password=get_password_hash("StaffPass123!"),
                is_active=True,
                is_2fa_enabled=False
            )
        ]
        db.add_all(users)
        db.commit()

        print("Seeding suppliers...")
        suppliers = [
            Supplier(
                name="Global Pharma Corp",
                contact_person="David Miller",
                phone="+1-800-555-0199",
                email="orders@globalpharma.example.com",
                address="100 Distribution Way, New Jersey, USA"
            ),
            Supplier(
                name="Apex Lifesciences Ltd",
                contact_person="Anita Roy",
                phone="+1-800-555-0244",
                email="supply@apexlifesciences.example.com",
                address="45 BioPark Boulevard, Boston, MA"
            ),
            Supplier(
                name="MediCure Distribution",
                contact_person="Carlos Gomez",
                phone="+1-800-555-0377",
                email="logistics@medicure.example.com",
                address="750 River Road, Chicago, IL"
            )
        ]
        db.add_all(suppliers)
        db.commit()

        print("Seeding customers...")
        customers = [
            Customer(
                name="John Doe",
                phone="+1-555-0101",
                email="john.doe@example.com",
                allergies="Penicillin",
                chronic_conditions="Hypertension, Dyslipidemia"
            ),
            Customer(
                name="Alice Johnson",
                phone="+1-555-0102",
                email="alice.j@example.com",
                allergies="NSAIDs, Aspirin",
                chronic_conditions="Rheumatoid Arthritis"
            ),
            Customer(
                name="Robert Davis",
                phone="+1-555-0103",
                email="robert.davis@example.com",
                allergies="None reported",
                chronic_conditions="Type 2 Diabetes"
            )
        ]
        db.add_all(customers)
        db.commit()

        print("Seeding medicines and inventory batches...")
        today = date.today()
        medicines_data = [
            {
                "brand_name": "Lipitor",
                "generic_name": "Atorvastatin",
                "category": "Cardiovascular",
                "dosage_form": "Tablet",
                "strength": "20mg",
                "manufacturer": "Pfizer",
                "barcode": "8901001",
                "requires_prescription": True,
                "unit_price": 1.25,
                "reorder_level": 25,
                "batches": [
                    {"batch_number": "LIP-2401", "mfg": today - timedelta(days=120), "exp": today + timedelta(days=400), "qty": 150, "cost": 0.75},
                    {"batch_number": "LIP-2402", "mfg": today - timedelta(days=60), "exp": today + timedelta(days=550), "qty": 200, "cost": 0.78}
                ]
            },
            {
                "brand_name": "Coumadin",
                "generic_name": "Warfarin",
                "category": "Anticoagulants",
                "dosage_form": "Tablet",
                "strength": "5mg",
                "manufacturer": "Bristol-Myers Squibb",
                "barcode": "8901002",
                "requires_prescription": True,
                "unit_price": 0.85,
                "reorder_level": 20,
                "batches": [
                    {"batch_number": "WAR-2309", "mfg": today - timedelta(days=200), "exp": today + timedelta(days=60), "qty": 80, "cost": 0.45},
                    {"batch_number": "WAR-2401", "mfg": today - timedelta(days=90), "exp": today + timedelta(days=320), "qty": 120, "cost": 0.48}
                ]
            },
            {
                "brand_name": "Bayer Aspirin",
                "generic_name": "Aspirin",
                "category": "Analgesics / Antiplatelet",
                "dosage_form": "Tablet",
                "strength": "81mg",
                "manufacturer": "Bayer",
                "barcode": "8901003",
                "requires_prescription": False,
                "unit_price": 0.35,
                "reorder_level": 50,
                "batches": [
                    {"batch_number": "ASP-2405", "mfg": today - timedelta(days=60), "exp": today + timedelta(days=700), "qty": 300, "cost": 0.15}
                ]
            },
            {
                "brand_name": "Advil",
                "generic_name": "Ibuprofen",
                "category": "NSAIDs",
                "dosage_form": "Tablet",
                "strength": "400mg",
                "manufacturer": "Haleon",
                "barcode": "8901004",
                "requires_prescription": False,
                "unit_price": 0.40,
                "reorder_level": 40,
                "batches": [
                    {"batch_number": "IBU-2403", "mfg": today - timedelta(days=90), "exp": today + timedelta(days=500), "qty": 250, "cost": 0.20}
                ]
            },
            {
                "brand_name": "Glucophage",
                "generic_name": "Metformin",
                "category": "Antidiabetic",
                "dosage_form": "Tablet",
                "strength": "500mg",
                "manufacturer": "Merck",
                "barcode": "8901005",
                "requires_prescription": True,
                "unit_price": 0.50,
                "reorder_level": 30,
                "batches": [
                    {"batch_number": "MET-2402", "mfg": today - timedelta(days=100), "exp": today + timedelta(days=450), "qty": 180, "cost": 0.25}
                ]
            },
            {
                "brand_name": "Zestril",
                "generic_name": "Lisinopril",
                "category": "Antihypertensive",
                "dosage_form": "Tablet",
                "strength": "10mg",
                "manufacturer": "AstraZeneca",
                "barcode": "8901006",
                "requires_prescription": True,
                "unit_price": 0.75,
                "reorder_level": 25,
                "batches": [
                    # Expiring soon test case: 25 days left!
                    {"batch_number": "LIS-2308", "mfg": today - timedelta(days=340), "exp": today + timedelta(days=25), "qty": 15, "cost": 0.40},
                    {"batch_number": "LIS-2401", "mfg": today - timedelta(days=50), "exp": today + timedelta(days=600), "qty": 140, "cost": 0.42}
                ]
            },
            {
                "brand_name": "Aldactone",
                "generic_name": "Spironolactone",
                "category": "Diuretics / Antihypertensive",
                "dosage_form": "Tablet",
                "strength": "25mg",
                "manufacturer": "Pfizer",
                "barcode": "8901007",
                "requires_prescription": True,
                "unit_price": 0.90,
                "reorder_level": 20,
                "batches": [
                    {"batch_number": "SPI-2401", "mfg": today - timedelta(days=80), "exp": today + timedelta(days=500), "qty": 90, "cost": 0.50}
                ]
            },
            {
                "brand_name": "Viagra",
                "generic_name": "Sildenafil",
                "category": "Urological / PDE5 Inhibitor",
                "dosage_form": "Tablet",
                "strength": "50mg",
                "manufacturer": "Pfizer",
                "barcode": "8901008",
                "requires_prescription": True,
                "unit_price": 4.50,
                "reorder_level": 15,
                "batches": [
                    {"batch_number": "SIL-2402", "mfg": today - timedelta(days=40), "exp": today + timedelta(days=650), "qty": 60, "cost": 2.20}
                ]
            },
            {
                "brand_name": "Nitrostat",
                "generic_name": "Nitroglycerin",
                "category": "Cardiovascular / Vasodilator",
                "dosage_form": "Sublingual Tablet",
                "strength": "0.4mg",
                "manufacturer": "Pfizer",
                "barcode": "8901009",
                "requires_prescription": True,
                "unit_price": 1.10,
                "reorder_level": 20,
                "batches": [
                    {"batch_number": "NIT-2401", "mfg": today - timedelta(days=70), "exp": today + timedelta(days=360), "qty": 50, "cost": 0.60}
                ]
            },
            {
                "brand_name": "Augmentin",
                "generic_name": "Amoxicillin",
                "category": "Antibiotics",
                "dosage_form": "Tablet",
                "strength": "625mg",
                "manufacturer": "GSK",
                "barcode": "8901010",
                "requires_prescription": True,
                "unit_price": 1.40,
                "reorder_level": 30,
                "batches": [
                    # Low stock test case: only 8 left in stock!
                    {"batch_number": "AUG-2404", "mfg": today - timedelta(days=30), "exp": today + timedelta(days=400), "qty": 8, "cost": 0.85}
                ]
            },
            {
                "brand_name": "Cipro",
                "generic_name": "Ciprofloxacin",
                "category": "Antibiotics",
                "dosage_form": "Tablet",
                "strength": "500mg",
                "manufacturer": "Bayer",
                "barcode": "8901011",
                "requires_prescription": True,
                "unit_price": 1.20,
                "reorder_level": 20,
                "batches": [
                    {"batch_number": "CIP-2402", "mfg": today - timedelta(days=80), "exp": today + timedelta(days=480), "qty": 75, "cost": 0.65}
                ]
            },
            {
                "brand_name": "Tylenol",
                "generic_name": "Paracetamol",
                "category": "Analgesics / Antipyretic",
                "dosage_form": "Tablet",
                "strength": "500mg",
                "manufacturer": "Kenvue / J&J",
                "barcode": "8901012",
                "requires_prescription": False,
                "unit_price": 0.25,
                "reorder_level": 60,
                "batches": [
                    {"batch_number": "PAR-2406", "mfg": today - timedelta(days=45), "exp": today + timedelta(days=730), "qty": 400, "cost": 0.10}
                ]
            },
            {
                "brand_name": "Prilosec",
                "generic_name": "Omeprazole",
                "category": "Gastrointestinal",
                "dosage_form": "Capsule",
                "strength": "20mg",
                "manufacturer": "Procter & Gamble",
                "barcode": "8901013",
                "requires_prescription": False,
                "unit_price": 0.95,
                "reorder_level": 25,
                "batches": [
                    {"batch_number": "OME-2401", "mfg": today - timedelta(days=100), "exp": today + timedelta(days=520), "qty": 110, "cost": 0.50}
                ]
            },
            {
                "brand_name": "Plavix",
                "generic_name": "Clopidogrel",
                "category": "Cardiovascular / Antiplatelet",
                "dosage_form": "Tablet",
                "strength": "75mg",
                "manufacturer": "Sanofi",
                "barcode": "8901014",
                "requires_prescription": True,
                "unit_price": 1.80,
                "reorder_level": 20,
                "batches": [
                    {"batch_number": "CLO-2403", "mfg": today - timedelta(days=50), "exp": today + timedelta(days=600), "qty": 90, "cost": 1.05}
                ]
            }
        ]

        for m_data in medicines_data:
            batches_list = m_data.pop("batches")
            med = Medicine(**m_data)
            db.add(med)
            db.commit()
            db.refresh(med)

            for b_data in batches_list:
                batch = Batch(
                    medicine_id=med.id,
                    batch_number=b_data["batch_number"],
                    manufacture_date=b_data["mfg"],
                    expiry_date=b_data["exp"],
                    initial_quantity=b_data["qty"],
                    current_quantity=b_data["qty"],
                    purchase_cost=b_data["cost"],
                    selling_price=med.unit_price
                )
                db.add(batch)
            db.commit()

        print("Seeding sample prescriptions...")
        rx1 = Prescription(
            customer_name="John Doe",
            doctor_name="Dr. Sarah Jenkins, MD (Cardiology)",
            image_url="/uploads/sample_rx_cardio.jpg",
            extracted_text="Rx Cardiology Clinic\nDr. Sarah Jenkins, MD\nPatient: John Doe\n1. Atorvastatin 20mg - 1 tab qhs #30\n2. Aspirin 81mg - 1 tab po daily #30",
            extracted_medicines='[{"name": "Atorvastatin", "strength": "20mg"}, {"name": "Aspirin", "strength": "81mg"}]',
            notes="Routine secondary prevention post-PCI.",
            status="Approved",
            retention_deadline=datetime.now(timezone.utc) + timedelta(days=90),
            is_archived=False
        )
        rx2 = Prescription(
            customer_name="Jane Smith",
            doctor_name="Dr. Robert Vance, MD",
            image_url="/uploads/sample_rx_antibiotic.jpg",
            extracted_text="Vance Family Health Clinic\nDr. Robert Vance, MD\nPatient: Jane Smith\n1. Amoxicillin 500mg PO TID x 7d #21",
            extracted_medicines='[{"name": "Amoxicillin", "strength": "500mg"}]',
            notes="Acute maxillary sinusitis.",
            status="Pending",
            retention_deadline=datetime.now(timezone.utc) + timedelta(days=90),
            is_archived=False
        )
        db.add_all([rx1, rx2])
        db.commit()

        print("Seeding initial audit logs...")
        init_audit = AuditLog(
            timestamp=datetime.now(timezone.utc),
            username="admin",
            user_role="Admin",
            action="SYSTEM_INITIALIZED",
            entity_type="System",
            entity_id="1",
            details="System initialized with catalog and seed inventory",
            ip_address="127.0.0.1"
        )
        db.add(init_audit)
        db.commit()

        print("Database successfully populated with rich initial seed data!")

    except Exception as e:
        print(f"Error during seeding: {e}")
        db.rollback()
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
