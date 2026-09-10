import os
import re
import io
import json
import base64
import difflib
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, List, Optional
from fastapi import UploadFile, HTTPException
import httpx
from PIL import Image

try:
    import pytesseract
    PYTESSERACT_AVAILABLE = True
except ImportError:
    PYTESSERACT_AVAILABLE = False

from backend.app.core.config import settings, get_gemini_api_key

# Allowed image mime types and extensions
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".pdf"}
ALLOWED_MIMES = {"image/jpeg", "image/png", "image/webp", "application/pdf"}
MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB

COMMON_MEDICINE_PATTERNS = [
    "Amoxicillin", "Augmentin", "Paracetamol", "Acetaminophen", "Ciprofloxacin", "Azithromycin",
    "Metformin", "Glipizide", "Lisinopril", "Amlodipine", "Losartan", "Atorvastatin",
    "Simvastatin", "Rosuvastatin", "Omeprazole", "Pantoprazole", "Esomeprazole",
    "Ibuprofen", "Naproxen", "Aspirin", "Warfarin", "Clopidogrel", "Cetirizine",
    "Fexofenadine", "Montelukast", "Salbutamol", "Doxycycline", "Metronidazole",
    "Levofloxacin", "Prednisolone", "Dexamethasone", "Insulin", "Ranitidine"
]

def validate_uploaded_file(file: UploadFile, content: bytes) -> bool:
    """
    Validates file size, extension, and magic bytes to prevent malicious file uploads.
    """
    if len(content) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(status_code=400, detail="File size exceeds maximum allowable limit of 5MB.")
    
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Unsupported file extension '{ext}'. Allowed: {ALLOWED_EXTENSIONS}")
    
    # Verify Magic Bytes signatures
    if ext in [".jpg", ".jpeg"] and not content.startswith(b"\xff\xd8\xff"):
        raise HTTPException(status_code=400, detail="Corrupted or invalid JPEG image header.")
    elif ext == ".png" and not content.startswith(b"\x89PNG\r\n\x1a\n"):
        raise HTTPException(status_code=400, detail="Corrupted or invalid PNG image header.")
    elif ext == ".webp" and not (content[:4] == b"RIFF" and content[8:12] == b"WEBP"):
        raise HTTPException(status_code=400, detail="Corrupted or invalid WebP image header.")
    elif ext == ".pdf" and not content.startswith(b"%PDF-"):
        raise HTTPException(status_code=400, detail="Corrupted or invalid PDF header.")
        
    return True

def parse_text_heuristically(raw_text: str, filename: str) -> Dict[str, Any]:
    """
    Extracts doctor, patient, and medicines from raw OCR text using regex and medical terminology.
    Used by Tesseract local engine or when LLM JSON needs fallback.
    """
    lines = [line.strip() for line in raw_text.splitlines() if line.strip()]
    
    doctor_name = ""
    customer_name = ""
    medicines = []
    
    # 1. Detect Doctor Name
    for line in lines:
        doc_match = re.search(r"(?:Dr\.?|Doctor|Prof\.?|Physician)\s*([A-Za-z\.\s]{3,35})", line, re.IGNORECASE)
        if doc_match and not doctor_name:
            clean_doc = doc_match.group(0).strip()
            doctor_name = re.sub(r"[,:;]+$", "", clean_doc)
            break
            
    # 2. Detect Patient Name
    for line in lines:
        pat_match = re.search(r"(?:Patient|Pt\.?|Name|For|Rx\s+For)[:\s]+([A-Za-z\s]{2,30})", line, re.IGNORECASE)
        if pat_match and not customer_name:
            clean_pat = pat_match.group(1).strip()
            if not any(k in clean_pat.lower() for k in ["address", "date", "age", "sex", "male", "female"]):
                customer_name = clean_pat
                break

    # 3. Detect Medicines (exact and fuzzy matching)
    found_med_names = set()
    for line in lines:
        strength_match = re.search(r"(\d+\s*(?:mg|g|ml|mcg|iu))", line, re.IGNORECASE)
        strength = strength_match.group(1) if strength_match else ""
        dosage_match = re.search(
            r"(?:1|2|3)?\s*(?:tab|tablet|cap|capsule|pill|drop|tsp|tbsp)?\s*(?:tid|bid|qid|qhs|daily|once daily|twice daily|three times daily|every \d+ hours|prn)[^\n\r,]*",
            line,
            re.IGNORECASE
        )
        dosage = dosage_match.group(0).strip() if dosage_match else "As directed"
        duration_match = re.search(r"(?:x\s*)?(\d+\s*(?:days|weeks|months|d|w))", line, re.IGNORECASE)
        duration = duration_match.group(1) if duration_match else ""

        # Check exact keywords first
        for med_keyword in COMMON_MEDICINE_PATTERNS:
            pattern = re.compile(rf"\b{med_keyword}\b", re.IGNORECASE)
            if pattern.search(line):
                if med_keyword.lower() not in found_med_names:
                    found_med_names.add(med_keyword.lower())
                    medicines.append({
                        "name": med_keyword,
                        "strength": strength,
                        "dosage": dosage,
                        "duration": duration
                    })

        # Check fuzzy token match for noisy OCR characters (e.g. Amaxicilin -> Amoxicillin)
        words = re.findall(r"[A-Za-z]{4,}", line)
        for w in words:
            matches = difflib.get_close_matches(w.lower(), [p.lower() for p in COMMON_MEDICINE_PATTERNS], n=1, cutoff=0.72)
            if matches:
                canonical = next(p for p in COMMON_MEDICINE_PATTERNS if p.lower() == matches[0])
                if canonical.lower() not in found_med_names:
                    found_med_names.add(canonical.lower())
                    medicines.append({
                        "name": canonical,
                        "strength": strength,
                        "dosage": dosage,
                        "duration": duration
                    })

    # Also scan for generic strength lines if medicines empty (e.g. "Cefixime 200mg")
    if not medicines:
        for line in lines:
            line_med_match = re.search(r"^([A-Z][a-z]{3,20})\s+(\d+\s*(?:mg|g|ml|mcg))(?:\s+(.*))?$", line)
            if line_med_match:
                name = line_med_match.group(1)
                strength = line_med_match.group(2)
                dosage = line_med_match.group(3) or "As directed"
                medicines.append({
                    "name": name,
                    "strength": strength,
                    "dosage": dosage,
                    "duration": ""
                })

    return {
        "doctor_name": doctor_name,
        "customer_name": customer_name,
        "medicines": medicines
    }

async def extract_prescription_data(file_content: bytes, filename: str, mime_type: str = "image/jpeg", db: Any = None) -> Dict[str, Any]:
    """
    Performs real-time OCR and prescription intelligence:
    1. If Google Gemini API key is configured, calls Google Gemini Vision REST API (with correct inlineData camelCase).
    2. Otherwise or as failover, uses local Tesseract OCR directly on the image to read real prescription text.
    """
    gemini_key = get_gemini_api_key(db)
    
    # 1. Try Google Gemini Multimodal Vision API if key is available
    if gemini_key and mime_type.startswith("image/"):
        b64_image = base64.b64encode(file_content).decode("utf-8")
        
        prompt = (
            "You are an expert clinical prescription transcription OCR system for SPMS Pharmacy. "
            "Carefully examine this prescription image (transcribe doctor handwriting, clinic letterhead, and Rx lines). "
            "Return a JSON object with this EXACT structure:\n"
            "{\n"
            "  \"doctor_name\": \"Dr. Full Name or Clinic Name\",\n"
            "  \"customer_name\": \"Patient Full Name\",\n"
            "  \"raw_text\": \"Full verbatim transcribed text from prescription\",\n"
            "  \"medicines\": [\n"
            "    {\"name\": \"Medicine Name\", \"strength\": \"e.g. 500mg\", \"dosage\": \"e.g. 1 tab bid\", \"duration\": \"e.g. 7 days\"}\n"
            "  ],\n"
            "  \"clinical_notes\": \"Any special observations, instructions, or refills\"\n"
            "}\n"
            "Respond ONLY with the JSON object. Do not include markdown code fence formatting."
        )

        # Google Gemini REST API requires inlineData (camelCase) and mimeType (camelCase)
        payload = {
            "contents": [
                {
                    "parts": [
                        {
                            "inlineData": {
                                "mimeType": mime_type,
                                "data": b64_image
                            }
                        },
                        {"text": prompt}
                    ]
                }
            ]
        }

        # Try gemini-2.0-flash first, then gemini-1.5-flash, then gemini-1.5-pro
        vision_models = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"]
        for model_name in vision_models:
            try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={gemini_key}"
                req_payload = dict(payload)

                async with httpx.AsyncClient(timeout=15.0) as client:
                    res = await client.post(url, json=req_payload)
                    if res.status_code == 200:
                        resp_json = res.json()
                        parts = resp_json.get("candidates", [{}])[0].get("content", {}).get("parts", [])
                        raw_content = "".join(p.get("text", "") for p in parts if "text" in p).strip()
                        
                        match = re.search(r"\{.*\}", raw_content, re.DOTALL)
                        cleaned = match.group(0) if match else raw_content.strip()
                        data = json.loads(cleaned)
                        
                        return {
                            "doctor_name": data.get("doctor_name", "").strip(),
                            "customer_name": data.get("customer_name", "").strip(),
                            "extracted_text": data.get("raw_text") or raw_content,
                            "extracted_medicines": json.dumps(data.get("medicines", [])),
                            "notes": data.get("clinical_notes") or f"Transcribed by Google {model_name} from {filename}.",
                            "retention_deadline": datetime.now(timezone.utc) + timedelta(days=settings.PRESCRIPTION_RETENTION_DAYS),
                            "ocr_engine": f"Google {model_name} Vision"
                        }
                    elif res.status_code in (401, 403):
                        print(f"Gemini API key rejected with status {res.status_code}. Please configure a valid key in Settings.")
                        break
                    else:
                        print(f"Gemini {model_name} returned status {res.status_code}: {res.text[:120]}")
            except Exception as e:
                print(f"Error calling {model_name}: {e}")

    # 2. Local Tesseract OCR Engine on the actual image
    if PYTESSERACT_AVAILABLE and mime_type.startswith("image/"):
        try:
            image = Image.open(io.BytesIO(file_content))
            if image.mode not in ("RGB", "L"):
                image = image.convert("RGB")
            
            raw_ocr_text = pytesseract.image_to_string(image).strip()
            if raw_ocr_text:
                parsed = parse_text_heuristically(raw_ocr_text, filename)
                return {
                    "doctor_name": parsed["doctor_name"],
                    "customer_name": parsed["customer_name"],
                    "extracted_text": raw_ocr_text,
                    "extracted_medicines": json.dumps(parsed["medicines"]),
                    "notes": f"Optical character recognition extracted {len(parsed['medicines'])} medicine(s) via Tesseract OCR.",
                    "retention_deadline": datetime.now(timezone.utc) + timedelta(days=settings.PRESCRIPTION_RETENTION_DAYS),
                    "ocr_engine": "Local Tesseract OCR Engine"
                }
        except Exception as ocr_err:
            print(f"Tesseract OCR execution error: {ocr_err}")

    # 3. Fallback when image contains no readable text or is PDF
    return {
        "doctor_name": "",
        "customer_name": "",
        "extracted_text": "No legible text could be automatically extracted from the uploaded file. Please ensure good lighting and contrast, or enter prescription details manually.",
        "extracted_medicines": "[]",
        "notes": f"Scanned file: {filename}. Please verify details manually.",
        "retention_deadline": datetime.now(timezone.utc) + timedelta(days=settings.PRESCRIPTION_RETENTION_DAYS),
        "ocr_engine": "Manual Verification Required"
    }
