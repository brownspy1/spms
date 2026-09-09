# Smart Pharmacy Management System (SPMS)

[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](LICENSE)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688.svg)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18.2+-61DAFB.svg)](https://reactjs.org)
[![Security: Audited](https://img.shields.io/badge/Security-OWASP%20Compliant-green.svg)](docs)

A production-grade, enterprise **Smart Pharmacy Management System (SPMS)** engineered with real-time Point of Sale (POS), FEFO batch inventory tracking, clinical drug-drug interaction detection, AI prescription assistant with OCR, multi-tenant RBAC (Admin, Pharmacist, Staff), and tamper-proof append-only audit logging.

---

## 🌟 Key Features

### 1. 🛡️ Enterprise Security & Access Control
- **Bcrypt / Argon2 Cryptography**: No plaintext or reversible passwords.
- **JWT Session Tokens**: Short-lived access tokens with automatic refresh handling.
- **Role-Based Access Control (RBAC)**: Strictly enforced server-side on every API route:
  - **Admin**: Full oversight, user management, audit logs, supplier/PO approval, retention purges.
  - **Pharmacist**: Medicine catalog, batch management, clinical overrides, dispensing, PO creation.
  - **Staff**: POS sales, customer registration, catalog search.
- **Account Lockout Protection**: Exponential backoff locks accounts for 15 minutes after 5 failed login attempts.
- **Two-Factor Authentication (TOTP 2FA)**: Time-based one-time password verification compatible with Google Authenticator, Authy, and 1Password.

### 2. ⚡ Point of Sale (POS) & Automated FEFO Allocation
- Fast medicine catalog search by brand name, generic name, category, or barcode.
- **FEFO (First Expired, First Out)** auto-allocation guarantees earliest expiring batches are dispensed first.
- **Real-Time Drug Interaction Alerts**: As items are added to the cart, the clinical engine automatically cross-references all medicines against known contraindications.
- **Pharmacist Override Workflow**: Requires signed clinical justification before high-severity contraindicated combinations can be dispensed.
- **Thermal Invoice Printing**: Standard 80mm receipt generation with barcode, breakdown, tax, and clinical notices.

### 3. 🔬 Auditable Clinical Drug-Drug Interaction Engine
- Curated pharmacological interaction knowledge base covering contraindications, major, moderate, and minor interactions (e.g. Warfarin + Aspirin, Sildenafil + Nitroglycerin, Lisinopril + Spironolactone).
- Deterministic clinical engine executes before LLM summarization to prevent hallucinations.
- Integrated **AI Pharmacist Assistant** with strict prompt injection filters and automated PII masking.

### 4. 📋 Prescriptions & OCR Processing
- Secure file upload with MIME type, size limit (< 5MB), and magic byte integrity validation.
- Automated OCR heuristic text and medicine detection.
- **90-Day Retention Compliance**: Automated countdown and admin compliance purge to archive records past statutory limits.

### 5. 📦 Procurement & Inventory
- Supplier directory and purchase order workflow (Draft -> Pending Approval -> Admin Approved -> Received).
- Receiving POs automatically instantiates new batches and increments available stock.
- Low-stock threshold and expiry horizon alerts (< 30 days, < 90 days, expired).
- Audited stock adjustments with mandatory operational reason logging (Damage, Recount, Disposal, Return).

### 6. 📜 Immutable Append-Only Audit Trail
- Regulatory-grade write-once audit log capturing:
  - Timestamp (UTC), User ID, Actor Username, Role
  - Operation action (`STOCK_ADJUSTMENT`, `MEDICINE_DELETED`, `POS_SALE_WITH_INTERACTION_OVERRIDE`, `PO_APPROVED`, etc.)
  - Pre-mutation state (`before_values`) and post-mutation state (`after_values`) in JSON
  - Client IP Address and contextual details
- Regulatory CSV Export for external audit compliance.

---

## 🔑 Default Demo Accounts

For immediate evaluation, the database is pre-seeded with three demo profiles:

| Role | Username | Password | Permissions |
|---|---|---|---|
| **Admin** | `admin` | `AdminPass123!` | System configuration, audit trail, PO approval, user provisioning |
| **Pharmacist** | `pharmacist` | `PharmaPass123!` | Clinical overrides, stock adjustments, prescription approvals, PO creation |
| **Staff** | `staff` | `StaffPass123!` | POS transactions, catalog lookups, patient intake |

---

## 🚀 Local Development Setup

### 1. Prerequisites
- Python 3.10+
- Node.js 18+ and npm

### 2. Backend Setup
```bash
# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r backend/requirements.txt

# Seed database with initial catalog, batches, and demo users
python3 backend/seed_data.py

# Launch FastAPI development server
uvicorn backend.app.main:app --reload --port 8000
```
Interactive Swagger docs will be accessible at: `http://localhost:8000/docs`

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Access the modern UI at: `http://localhost:5173`

---

## 🧪 Running Automated Tests

Run the full pytest suite covering authentication, account lockout, RBAC, drug interaction collision detection, POS FEFO allocation, and audit trails:

```bash
source venv/bin/activate
PYTHONPATH=. pytest backend/tests/test_spms.py -v
```

---

## 🚂 Railway Deployment (Railway CLI)

This project includes a multi-stage `Dockerfile`, `railway.json`, and `Procfile` configured for Railway.

```bash
# 1. Login to Railway
railway login

# 2. Initialize project
railway init

# 3. Deploy application
railway up
```

Railway will automatically build the React assets, launch FastAPI on `$PORT`, and perform health checks at `/health`.

---

## 📄 License
MIT License. Built for clinical pharmacy workflows.
