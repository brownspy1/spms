"""
External Clinical API integration service.
Provides real-time public health data integrations:
1. openFDA Drug Label API (api.fda.gov) - Official FDA black-box & drug interaction warnings (100% Free, no auth required).
2. NIH NLM RxNav / RxNorm API (rxnav.nlm.nih.gov) - Automated brand-to-generic drug normalization and synonym matching.
3. Multi-drug cumulative clinical risk scoring engine (Bleeding, QTc, Hyperkalemia, Nephrotoxicity, Serotonin Syndrome).
"""

import time
import re
import httpx
from typing import Dict, Any, List, Optional, Tuple

# In-memory caches with timestamp TTL to optimize performance and prevent rate limiting
_OPENFDA_CACHE: Dict[str, Tuple[float, Any]] = {}
_RXNAV_CACHE: Dict[str, Tuple[float, str]] = {}
CACHE_TTL = 3600  # 1 hour cache

# Comprehensive offline brand-to-generic dictionary for instant zero-latency mapping
OFFLINE_BRAND_TO_GENERIC: Dict[str, str] = {
    # Anticoagulants & Antiplatelets
    "coumadin": "warfarin",
    "jantoven": "warfarin",
    "plavix": "clopidogrel",
    "eliquis": "apixaban",
    "xarelto": "rivaroxaban",
    "pradaxa": "dabigatran",
    "brilinta": "ticagrelor",
    "ecotrin": "aspirin",
    "bayer": "aspirin",
    "disprin": "aspirin",

    # NSAIDs & Analgesics
    "advil": "ibuprofen",
    "motrin": "ibuprofen",
    "nurofen": "ibuprofen",
    "aleve": "naproxen",
    "naprosyn": "naproxen",
    "tylenol": "paracetamol",
    "panadol": "paracetamol",
    "calpol": "paracetamol",
    "voltaren": "diclofenac",
    "cataflam": "diclofenac",
    "toradol": "ketorolac",
    "mobic": "meloxicam",
    "celebrex": "celecoxib",
    "ultram": "tramadol",

    # Cardiovascular & Renal
    "viagra": "sildenafil",
    "revatio": "sildenafil",
    "cialis": "tadalafil",
    "nitrostat": "nitroglycerin",
    "nitrodur": "nitroglycerin",
    "zestril": "lisinopril",
    "prinivil": "lisinopril",
    "aldactone": "spironolactone",
    "norvasc": "amlodipine",
    "cozaar": "losartan",
    "diovan": "valsartan",
    "lasix": "furosemide",
    "lanoxin": "digoxin",
    "cordarone": "amiodarone",
    "pacerone": "amiodarone",
    "lopressor": "metoprolol",
    "toprol": "metoprolol",
    "tenormin": "atenolol",
    "coreg": "carvedilol",
    "calan": "verapamil",
    "cardizem": "diltiazem",

    # Antibiotics & Antifungals
    "amoxil": "amoxicillin",
    "augmentin": "amoxicillin",
    "cipro": "ciprofloxacin",
    "levaquin": "levofloxacin",
    "biaxin": "clarithromycin",
    "zithromax": "azithromycin",
    "flagyl": "metronidazole",
    "diflucan": "fluconazole",
    "nizoral": "ketoconazole",
    "bactrim": "trimethoprim-sulfamethoxazole",
    "septra": "trimethoprim-sulfamethoxazole",
    "keflex": "cephalexin",
    "rocephin": "ceftriaxone",

    # Statins & Lipids
    "lipitor": "atorvastatin",
    "zocor": "simvastatin",
    "crestor": "rosuvastatin",
    "pravachol": "pravastatin",
    "lopid": "gemfibrozil",

    # Gastrointestinal & Metabolic
    "glucophage": "metformin",
    "januvia": "sitagliptin",
    "prilosec": "omeprazole",
    "nexium": "esomeprazole",
    "protonix": "pantoprazole",
    "pepcid": "famotidine",
    "zantac": "famotidine",

    # CNS & Psychotropic
    "prozac": "fluoxetine",
    "zoloft": "sertraline",
    "lexapro": "escitalopram",
    "celexa": "citalopram",
    "cymbalta": "duloxetine",
    "effexor": "venlafaxine",
    "eskalith": "lithium",
    "lithobid": "lithium",
    "xanax": "alprazolam",
    "valium": "diazepam",
    "ativan": "lorazepam",

    # Respiratory, Endocrine & Oncology
    "theo-24": "theophylline",
    "synthroid": "levothyroxine",
    "eltroxin": "levothyroxine",
    "trexall": "methotrexate",
    "prograf": "tacrolimus",
    "neoral": "cyclosporine"
}

# Cumulative clinical risk drug categories
DRUG_RISK_PROFILES: Dict[str, Dict[str, Any]] = {
    "bleeding": {
        "drugs": [
            "warfarin", "aspirin", "clopidogrel", "ibuprofen", "naproxen", "diclofenac",
            "ketorolac", "apixaban", "rivaroxaban", "dabigatran", "ticagrelor", "heparin",
            "enoxaparin", "celecoxib", "meloxicam", "indomethacin"
        ],
        "label": "Hemorrhage / Bleeding Risk",
        "description": "Risk of gastrointestinal hemorrhage, hematoma, or systemic bleeding."
    },
    "hyperkalemia": {
        "drugs": [
            "lisinopril", "ramipril", "enalapril", "captopril", "spironolactone",
            "eplerenone", "losartan", "valsartan", "candesartan", "potassium",
            "trimethoprim", "bactrim", "ibuprofen", "naproxen"
        ],
        "label": "Hyperkalemia Risk",
        "description": "Risk of elevated serum potassium causing severe cardiac dysrhythmias."
    },
    "qtc_prolongation": {
        "drugs": [
            "ciprofloxacin", "levofloxacin", "moxifloxacin", "clarithromycin", "erythromycin",
            "azithromycin", "amiodarone", "sotalol", "haloperidol", "ondansetron",
            "fluconazole", "methadone", "escitalopram", "citalopram"
        ],
        "label": "QTc Prolongation / Torsades",
        "description": "Risk of ventricular arrhythmias, Torsades de Pointes, and syncope."
    },
    "nephrotoxicity": {
        "drugs": [
            "gentamicin", "tobramycin", "amikacin", "vancomycin", "methotrexate",
            "ibuprofen", "naproxen", "diclofenac", "ketorolac", "cisplatin",
            "cyclosporine", "tacrolimus", "amphotericin b", "contrast media"
        ],
        "label": "Nephrotoxicity / Renal Burden",
        "description": "Risk of acute kidney injury, reduced glomerular filtration, or tubular damage."
    },
    "serotonin_syndrome": {
        "drugs": [
            "fluoxetine", "sertraline", "paroxetine", "citalopram", "escitalopram",
            "duloxetine", "venlafaxine", "tramadol", "linezolid", "selegiline",
            "rasagiline", "phenelzine", "dextromethorphan", "st johns wort"
        ],
        "label": "Serotonin Toxicity Risk",
        "description": "Excess serotonergic tone causing tremor, hyperthermia, clonus, and agitation."
    },
    "cns_depression": {
        "drugs": [
            "morphine", "codeine", "tramadol", "fentanyl", "oxycodone",
            "diazepam", "lorazepam", "alprazolam", "clonazepam", "zolpidem",
            "gabapentin", "pregabalin", "alcohol"
        ],
        "label": "CNS & Respiratory Depression",
        "description": "Synergistic sedation, respiratory suppression, hypoventilation, and coma risk."
    }
}


async def normalize_drug_name(raw_name: str) -> Dict[str, str]:
    """
    Normalizes a brand or trade drug name to its generic active ingredient.
    Uses zero-latency local dictionary first, then falls back to NIH RxNav API.
    Returns dict: {"input": raw_name, "generic": normalized_name, "is_brand": bool, "source": str}
    """
    clean = raw_name.strip()
    lower = clean.lower()

    # 1. Direct match in local dictionary
    if lower in OFFLINE_BRAND_TO_GENERIC:
        return {
            "input": clean,
            "generic": OFFLINE_BRAND_TO_GENERIC[lower],
            "is_brand": True,
            "source": "Clinical Brand Dictionary"
        }

    # Check for whole-word tokens in local dictionary (e.g. "Coumadin 5mg" -> "warfarin")
    input_tokens = set(re.findall(r'[a-zA-Z]+', lower))
    for brand, generic in OFFLINE_BRAND_TO_GENERIC.items():
        if brand in input_tokens:
            return {
                "input": clean,
                "generic": generic,
                "is_brand": True,
                "source": "Clinical Brand Dictionary"
            }

    # 2. Check RxNav Cache
    now = time.time()
    if lower in _RXNAV_CACHE:
        cache_time, cached_generic = _RXNAV_CACHE[lower]
        if now - cache_time < CACHE_TTL:
            return {
                "input": clean,
                "generic": cached_generic,
                "is_brand": cached_generic.lower() != lower,
                "source": "NIH RxNav (Cached)"
            }

    # 3. Query NIH RxNav API for approximate term normalization
    try:
        url = f"https://rxnav.nlm.nih.gov/REST/approximateTerm.json?term={clean}&maxEntries=1"
        async with httpx.AsyncClient(timeout=2.0) as client:
            res = await client.get(url)
            if res.status_code == 200:
                data = res.json()
                candidates = data.get("approximateGroup", {}).get("candidate", [])
                if candidates and candidates[0].get("name"):
                    found_name = candidates[0]["name"].split()[0].lower()
                    _RXNAV_CACHE[lower] = (now, found_name)
                    return {
                        "input": clean,
                        "generic": found_name,
                        "is_brand": found_name != lower,
                        "source": "NIH RxNav REST API"
                    }
    except Exception as e:
        # Fallback gracefully on network timeout or failure
        pass

    # Default: already generic or untranslated
    return {
        "input": clean,
        "generic": clean,
        "is_brand": False,
        "source": "Direct"
    }


async def fetch_openfda_interactions(drug_a: str, drug_b: str) -> Optional[Dict[str, Any]]:
    """
    Queries the official openFDA Drug Label API (api.fda.gov) for documented drug interaction warnings.
    100% free, public, no authentication key required.
    Returns structured openFDA findings or None.
    """
    clean_a = drug_a.strip().lower()
    clean_b = drug_b.strip().lower()
    cache_key = f"{clean_a}_{clean_b}"

    now = time.time()
    if cache_key in _OPENFDA_CACHE:
        cache_time, cached_val = _OPENFDA_CACHE[cache_key]
        if now - cache_time < CACHE_TTL:
            return cached_val

    try:
        # Search openFDA drug label endpoint for drug_a interacting with drug_b
        url = f'https://api.fda.gov/drug/label.json?search=openfda.generic_name:"{clean_a}"+AND+drug_interactions:"{clean_b}"&limit=1'
        async with httpx.AsyncClient(timeout=2.5) as client:
            res = await client.get(url)
            if res.status_code == 200:
                data = res.json()
                results = data.get("results", [])
                if results:
                    label = results[0]
                    brand_name = (label.get("openfda", {}).get("brand_name", []) or [clean_a.title()])[0]
                    interactions_text = (label.get("drug_interactions", []) or [""])[0]
                    boxed_warning = (label.get("boxed_warning", []) or [""])[0]

                    # Extract concise snippet highlighting the interaction
                    summary_snippet = ""
                    if interactions_text:
                        # Find paragraph mentioning drug_b
                        paragraphs = interactions_text.split("\n")
                        for p in paragraphs:
                            if clean_b in p.lower():
                                summary_snippet = p.strip()
                                break
                        if not summary_snippet and len(interactions_text) > 0:
                            summary_snippet = interactions_text[:400] + "..."

                    finding = {
                        "drug_a": clean_a,
                        "drug_b": clean_b,
                        "brand_name": brand_name,
                        "fda_section": "7 DRUG INTERACTIONS",
                        "fda_snippet": summary_snippet or "Documented in FDA Drug Product Labeling.",
                        "has_boxed_warning": bool(boxed_warning),
                        "source": "openFDA Official Drug Label API"
                    }
                    _OPENFDA_CACHE[cache_key] = (now, finding)
                    return finding
    except Exception as e:
        # Graceful fallback: return None on network or rate limit failure
        pass

    _OPENFDA_CACHE[cache_key] = (now, None)
    return None


def calculate_cumulative_risks(drugs: List[str], matched_interactions: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Analyzes all selected medications simultaneously for multi-drug cumulative toxicity profiles.
    Returns cumulative risk scores and clinical mitigation flags.
    """
    normalized = [d.strip().lower() for d in drugs if d and d.strip()]
    cumulative_report = {}

    for risk_key, profile in DRUG_RISK_PROFILES.items():
        matching_drugs = []
        for d in normalized:
            for risk_drug in profile["drugs"]:
                if risk_drug in d or d in risk_drug:
                    if d.title() not in matching_drugs:
                        matching_drugs.append(d.title())
                    break

        count = len(matching_drugs)
        if count >= 2:
            severity = "High" if count >= 3 else "Moderate"
            cumulative_report[risk_key] = {
                "label": profile["label"],
                "severity": severity,
                "drug_count": count,
                "contributing_drugs": matching_drugs,
                "description": profile["description"],
                "recommendation": f"Multiple ({count}) agents elevate {profile['label'].lower()}. Review combined pharmacodynamics."
            }

    return cumulative_report
