import os
import json
import re
from typing import List, Dict, Any, Optional
import httpx

from backend.app.core.config import settings, get_gemini_api_key
from backend.app.core.sanitization import sanitize_and_check_prompt_injection, mask_pii
from backend.app.core.interactions_data import find_interactions

DISCLAIMER = (
    "CLINICAL DECISION SUPPORT NOTICE: This AI information is designed to assist licensed pharmacists "
    "and medical staff. It is not an autonomous replacement for professional clinical judgment. Always verify "
    "dispensing decisions against patient medical charts and lab values."
)

# Comprehensive local clinical monographs for instant zero-latency CDS assistance
CLINICAL_MONOGRAPHS = {
    "warfarin": {
        "class": "Vitamin K Antagonist Anticoagulant",
        "dosing": "Individualized based on INR (typically 2-5mg daily initial, maintenance adjusted to INR).",
        "monitoring": "Target INR 2.0 - 3.0 for DVT/PE and non-valvular AF; 2.5 - 3.5 for mechanical mitral heart valves.",
        "contraindications": "Active bleeding, pregnancy (teratogenic), severe uncontrolled hypertension, recent neurosurgery.",
        "warnings": "FDA Black Box: Major hemorrhage risk. Severe interactions with NSAIDs, aspirin, fluconazole, and metronidazole."
    },
    "aspirin": {
        "class": "Antiplatelet / Irreversible COX-1 Inhibitor",
        "dosing": "Cardioprotection: 75mg - 100mg once daily. Acute coronary syndrome: 162mg - 325mg chewed.",
        "monitoring": "Monitor for occult GI blood loss, dyspepsia, and melena.",
        "contraindications": "Active peptic ulcer disease, bleeding diathesis, pediatric viral illnesses (Reye's syndrome risk).",
        "warnings": "Synergistic GI hemorrhage risk when combined with anticoagulants or NSAIDs."
    },
    "sildenafil": {
        "class": "Phosphodiesterase-5 (PDE-5) Inhibitor",
        "dosing": "Erectile dysfunction: 50mg PO ~1 hour prior to sexual activity (range 25-100mg, max once daily). Pulmonary HTN: 20mg TID.",
        "monitoring": "Blood pressure, orthostatic vitals, visual changes.",
        "contraindications": "Absolute contraindication: Concurrent nitrates (e.g. nitroglycerin, isosorbide). Severe hepatic impairment.",
        "warnings": "Life-threatening refractory systemic hypotension if co-administered with nitrates within 24 hours."
    },
    "nitroglycerin": {
        "class": "Nitrate Vasodilator",
        "dosing": "Sublingual: 0.3 - 0.6mg dissolved under tongue every 5 minutes (max 3 doses in 15 minutes).",
        "monitoring": "Blood pressure, pulse, relief of anginal chest pain.",
        "contraindications": "Concomitant PDE-5 inhibitors (sildenafil, tadalafil), severe anemia, increased intracranial pressure.",
        "warnings": "Instruct patient to sit down before administration to prevent syncope from orthostatic hypotension."
    },
    "metformin": {
        "class": "Biguanide Antidiabetic",
        "dosing": "Initial: 500mg once or twice daily with meals. Titrate up to 2000mg - 2550mg daily in divided doses.",
        "monitoring": "eGFR annually, HbA1c every 3-6 months, serum vitamin B12 periodically.",
        "contraindications": "eGFR < 30 mL/min/1.73m², acute or chronic metabolic acidosis, decompensated heart failure.",
        "warnings": "FDA Black Box: Metformin-associated lactic acidosis (MALA). Withhold 48 hours before and after iodinated radiocontrast procedures."
    },
    "lisinopril": {
        "class": "ACE Inhibitor (Antihypertensive)",
        "dosing": "Hypertension: 10mg once daily initial, titrate to 20-40mg daily. Heart failure: 2.5-5mg initial.",
        "monitoring": "Serum creatinine, eGFR, and potassium within 1-2 weeks of initiation and dose changes.",
        "contraindications": "History of ACEi-induced angioedema, pregnancy (teratogenic in 2nd/3rd trimesters), concurrent ARB or sacubitril.",
        "warnings": "High risk of severe hyperkalemia when combined with potassium-sparing diuretics (spironolactone) or potassium supplements."
    },
    "spironolactone": {
        "class": "Aldosterone Receptor Antagonist (Potassium-Sparing Diuretic)",
        "dosing": "Heart failure (HFrEF): 12.5mg - 25mg daily. Edema / Ascites: 25mg - 100mg daily.",
        "monitoring": "Serum potassium and creatinine at baseline, 1 week, 4 weeks, and periodically.",
        "contraindications": "Serum potassium > 5.0 mEq/L, eGFR < 30 mL/min, Addison's disease.",
        "warnings": "Fatal hyperkalemic cardiac arrest risk when combined with ACE inhibitors or potassium supplements without monitoring."
    },
    "amoxicillin": {
        "class": "Aminopenicillin Beta-Lactam Antibiotic",
        "dosing": "Adults: 500mg every 8 hours or 875mg every 12 hours. Pediatrics: 25-45mg/kg/day divided q12h.",
        "monitoring": "Bacterial resolution, hypersensitivity rash, diarrhea.",
        "contraindications": "Documented immediate hypersensitivity to penicillins.",
        "warnings": "Check for penicillin allergy before dispensing. Reduce renal clearance of methotrexate."
    },
    "ciprofloxacin": {
        "class": "Fluoroquinolone Antibiotic",
        "dosing": "Urinary tract / systemic infections: 250mg - 500mg every 12 hours.",
        "monitoring": "Renal function, ECG in patients at risk of QTc prolongation, tendon pain.",
        "contraindications": "History of fluoroquinolone-associated tendon rupture, concurrent tizanidine.",
        "warnings": "FDA Black Box: Tendinitis, tendon rupture, peripheral neuropathy, and CNS toxicities. Chelation by polyvalent antacids."
    },
    "paracetamol": {
        "class": "Central Analgesic & Antipyretic",
        "dosing": "Adults: 500mg - 1000mg every 4-6 hours PRN (Maximum 4000mg in 24 hours; limit to 2000mg/day in liver disease or chronic alcohol use).",
        "monitoring": "Pain relief, body temperature, total daily acetaminophen intake across all prescription/OTC products.",
        "contraindications": "Severe acute active liver failure or decompensated cirrhosis.",
        "warnings": "Acute overdose (>7.5g in adults) triggers severe hepatic necrosis mediated by NAPQI metabolite accumulation. Antidote: N-acetylcysteine."
    },
    "ibuprofen": {
        "class": "Non-Selective NSAID",
        "dosing": "Analgesia: 200mg - 400mg every 4-6 hours with food. Anti-inflammatory: 600mg - 800mg TID (Max 3200mg/day).",
        "monitoring": "Blood pressure, renal function, signs of GI ulceration or bleeding.",
        "contraindications": "Active peptic ulcer disease, severe heart failure (NYHA IV), CABG perioperative pain, severe renal impairment.",
        "warnings": "Black Box: Cardiovascular thrombotic events and gastrointestinal bleeding/perforation."
    },
    "omeprazole": {
        "class": "Proton Pump Inhibitor (PPI)",
        "dosing": "GERD / PUD: 20mg - 40mg once daily taken 30-60 minutes before breakfast.",
        "monitoring": "Symptom resolution, serum magnesium and vitamin B12 on long-term therapy (>1 year).",
        "contraindications": "Hypersensitivity to substituted benzimidazoles.",
        "warnings": "Inhibits CYP2C19: Decreases antiplatelet bioactivation of clopidogrel prodrug, increasing stent thrombosis risk."
    },
    "clopidogrel": {
        "class": "P2Y12 ADP Receptor Inhibitor Antiplatelet",
        "dosing": "Loading dose 300mg - 600mg, followed by 75mg once daily.",
        "monitoring": "Bleeding signs, CBC with differential (platelet counts).",
        "contraindications": "Active pathological bleeding (e.g., peptic ulcer or intracranial hemorrhage).",
        "warnings": "Prodrug bioactivated by CYP2C19. Poor metabolizers or concurrent omeprazole show reduced antiplatelet response."
    },
    "atorvastatin": {
        "class": "HMG-CoA Reductase Inhibitor (High-Intensity Statin)",
        "dosing": "10mg - 80mg once daily in the evening.",
        "monitoring": "Baseline lipid panel and hepatic enzymes (ALT/AST); evaluate unexplained muscle pain or weakness.",
        "contraindications": "Active liver disease, unexplained persistent elevations of serum transaminases, pregnancy.",
        "warnings": "Myopathy and rhabdomyolysis risk. Strong CYP3A4 inhibitors (clarithromycin, ketoconazole) significantly elevate statin plasma levels."
    },
    "tramadol": {
        "class": "Mu-Opioid Receptor Agonist & SNRI",
        "dosing": "50mg - 100mg every 4-6 hours PRN (Max 400mg/day; max 300mg/day in elderly >75 yrs).",
        "monitoring": "Pain score, respiratory rate, cognitive status, bowel movements.",
        "contraindications": "Significant respiratory depression, acute intoxication with alcohol/hypnotics, concurrent MAOIs within 14 days.",
        "warnings": "Lowers seizure threshold. High risk of Serotonin Syndrome when combined with SSRIs, SNRIs, or tricyclics."
    },
    "lithium": {
        "class": "Mood Stabilizer (Antimanic)",
        "dosing": "Acute mania: 900-1800mg daily in divided doses. Maintenance: 600-1200mg daily.",
        "monitoring": "Narrow therapeutic window (0.6 - 1.2 mEq/L). Monitor serum lithium levels, renal profile, and thyroid function (TSH).",
        "contraindications": "Severe renal disease, significant cardiovascular disease, sodium depletion, severe dehydration.",
        "warnings": "FDA Black Box: Lithium toxicity. NSAIDs, ACE inhibitors, and thiazide diuretics reduce renal clearance, precipitating toxicity."
    }
}


async def consult_ai_assistant(
    prompt: str,
    context_drugs: Optional[List[str]] = None,
    db: Any = None
) -> Dict[str, str]:
    """
    Evaluates clinical inquiries from pharmacists, applies prompt injection protection,
    checks structured drug interactions, queries Google Gemini if key is valid,
    and seamlessly falls back to the clinical pharmacology engine.
    """
    # Step 1: Sanitize and detect prompt injection
    is_safe, sanitized_prompt, rejection_reason = sanitize_and_check_prompt_injection(prompt)
    if not is_safe:
        return {
            "response": f"Security Alert: Your request was blocked by the clinical security filter. Reason: {rejection_reason}",
            "safety_disclaimer": DISCLAIMER
        }

    # Step 2: Extract mentioned drugs and check deterministic interactions
    lower_prompt = sanitized_prompt.lower()
    inferred_drugs = list(context_drugs or [])
    for med_key in CLINICAL_MONOGRAPHS.keys():
        if med_key in lower_prompt and med_key not in [d.lower() for d in inferred_drugs]:
            inferred_drugs.append(med_key)

    matched_interactions = []
    if inferred_drugs:
        matched_interactions = find_interactions(inferred_drugs)

    # Step 3: If valid Gemini API key is configured (AIzaSy...), call Google Gemini
    active_gemini_key = get_gemini_api_key(db)
    if active_gemini_key and len(active_gemini_key) > 15 and not active_gemini_key.startswith("AQ."):
        sys_prompt = (
            "You are an expert clinical pharmacy assistant for a Smart Pharmacy Management System (SPMS). "
            "Provide accurate, structured, and professional pharmacology guidance. "
            "Use clear Markdown formatting with bullet points and bold section headers. "
            "Address: Mechanism of Action, Contraindications, Recommended Dosage / Renal Adjustments, "
            "Adverse Reactions & Warning Signs, and Patient Administration Instructions."
        )
        
        context_str = ""
        if matched_interactions:
            context_str = "\n\nDetected Clinical Drug Interactions to consider:\n" + "\n".join(
                f"- {it['drug_a'].title()} + {it['drug_b'].title()} ({it['severity']}): {it['clinical_effect']}. Guidance: {it['management']}"
                for it in matched_interactions
            )
        
        full_query = f"{sys_prompt}{context_str}\n\nPharmacist Inquiry:\n{sanitized_prompt}"
        payload = {
            "contents": [
                {"role": "user", "parts": [{"text": full_query}]}
            ]
        }

        # Try gemini-2.0-flash, gemini-1.5-flash, gemini-1.5-pro
        models_to_try = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"]
        for model_name in models_to_try:
            try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={active_gemini_key}"
                async with httpx.AsyncClient(timeout=15.0) as client:
                    res = await client.post(url, json=payload)
                    if res.status_code == 200:
                        data = res.json()
                        parts = data.get("candidates", [{}])[0].get("content", {}).get("parts", [])
                        ai_text = "".join(p.get("text", "") for p in parts if "text" in p).strip()
                        if ai_text:
                            return {
                                "response": ai_text,
                                "safety_disclaimer": DISCLAIMER,
                                "model": f"Google {model_name}"
                            }
                    elif res.status_code in (401, 403):
                        print(f"Gemini API key rejected (HTTP {res.status_code}). Using SPMS Pharmacology Engine.")
                        break
                    else:
                        print(f"Gemini {model_name} HTTP {res.status_code}: {res.text[:120]}")
            except Exception as err:
                print(f"Gemini {model_name} attempt error: {type(err).__name__} {err}")
                continue

    # Step 4: High-accuracy structured pharmacological engine (CDS Fallback)
    advice_lines = []

    # Check for general greetings
    if any(greet in lower_prompt for greet in ["hello", "hi", "hey", "salam", "halo", "কেমন", "হ্যালো", "নমস্কার"]):
        return {
            "response": (
                "Hello! I am your **SPMS Clinical Pharmacist Assistant**.\n\n"
                "I can assist you with:\n"
                "- **Drug-Drug Interactions & Mechanisms** (e.g. Warfarin + Aspirin, Sildenafil + Nitroglycerin)\n"
                "- **Clinical Dosing Regimens & Renal Adjustments** (e.g. Metformin eGFR cutoffs, pediatric Amoxicillin)\n"
                "- **Black Box Warnings & Contraindications** (e.g. Fluoroquinolone tendon risk, Ciprofloxacin)\n"
                "- **Patient Medication Counseling & Safety Alerts** (English & বাংলা)\n\n"
                "Ask any pharmacology question or select medications from the screener to begin."
            ),
            "safety_disclaimer": DISCLAIMER,
            "model": "SPMS Clinical Decision Support Engine"
        }

    # Add detected drug interactions if any
    if matched_interactions:
        advice_lines.append("### Detected Drug Interactions (Audited Clinical Dataset):")
        for it in matched_interactions:
            advice_lines.append(
                f"- **{it['drug_a'].title()} + {it['drug_b'].title()}** ({it['severity']}):\n"
                f"  *Mechanism:* {it['mechanism']}\n"
                f"  *Clinical Effect:* {it['clinical_effect']}\n"
                f"  *Pharmacist Guidance:* {it['management']}"
            )
        advice_lines.append("\n")

    # Check if prompt matches any drug monograph
    matched_monographs = []
    for med_name, mono in CLINICAL_MONOGRAPHS.items():
        if med_name in lower_prompt:
            matched_monographs.append((med_name, mono))

    if matched_monographs:
        for med_name, mono in matched_monographs[:2]:
            advice_lines.append(
                f"### Clinical Pharmacology: {med_name.title()} ({mono['class']})\n"
                f"- **Dosage & Administration:** {mono['dosing']}\n"
                f"- **Key Monitoring Parameters:** {mono['monitoring']}\n"
                f"- **Contraindications:** {mono['contraindications']}\n"
                f"- **Critical Warnings:** {mono['warnings']}"
            )
    elif "warfarin" in lower_prompt or "bleeding" in lower_prompt:
        advice_lines.append(
            "**Anticoagulant & Antiplatelet Advisory:**\n"
            "- Co-administration of Vitamin K antagonists (Warfarin) with NSAIDs or antiplatelets elevates major hemorrhage risk.\n"
            "- Ensure INR is monitored every 2-4 weeks; target range is typically 2.0 - 3.0 (2.5 - 3.5 for mechanical valves).\n"
            "- Educate patient to monitor for epistaxis, hematuria, melena, or unexplained bruising."
        )
    elif "metformin" in lower_prompt or "diabetes" in lower_prompt:
        advice_lines.append(
            "**Antidiabetic (Metformin) Advisory:**\n"
            "- Administer with meals to minimize gastrointestinal adverse effects (nausea, diarrhea).\n"
            "- Monitor eGFR annually. Metformin is contraindicated if eGFR < 30 mL/min/1.73m².\n"
            "- Withhold 48 hours prior to procedures with iodinated radiocontrast agents."
        )
    elif "hypertension" in lower_prompt or "blood pressure" in lower_prompt:
        advice_lines.append(
            "**Antihypertensive Advisory:**\n"
            "- **ACE Inhibitors (Lisinopril):** Monitor for persistent dry cough, angioedema, and serum potassium (risk of hyperkalemia).\n"
            "- **Calcium Channel Blockers (Amlodipine):** Monitor for peripheral dependent edema.\n"
            "- **Potassium-Sparing Diuretics (Spironolactone):** Monitor electrolytes at 1 week, 4 weeks, and periodically."
        )
    else:
        advice_lines.append(
            f"**Clinical Pharmacist Assessment:**\n"
            f"Reviewing inquiry: *'{sanitized_prompt}'*.\n\n"
            "- **Dispensing Verification:** Confirm patient renal profile (eGFR/CrCl) and hepatic clearance.\n"
            "- **Allergy Check:** Review cross-reactivity for beta-lactams, sulfa, and NSAID hypersensitivity.\n"
            "- **Patient Counseling:** Instruct patient on administration timing (with meals vs. empty stomach) and adverse reaction warning signs."
        )

    # Bengali query response support
    if any(bengali_word in lower_prompt for bengali_word in ["বাংলা", "বুঝিয়ে", "ওষুধ", "ডোজ", "খাওয়া", "খাব"]):
        advice_lines.append(
            "\n**বাংলা পরামর্শ:**\n"
            "- যেকোনো ওষুধ গ্রহণের পূর্বে রোগীর পূর্ববর্তী কোনো ওষুধের অ্যালার্জি বা কিডনি/লিভারের সমস্যা আছে কিনা যাচাই করুন।\n"
            "- ডাক্তারের নির্দেশিত পূর্ণ কোর্স সম্পন্ন করুন এবং কোনো পার্শ্বপ্রতিক্রিয়া দেখা দিলে তাৎক্ষণিক রেজিস্টার্ড ফার্মাসিস্টের পরামর্শ নিন।"
        )

    return {
        "response": "\n\n".join(advice_lines),
        "safety_disclaimer": DISCLAIMER,
        "model": "SPMS Clinical Decision Support Engine"
    }
