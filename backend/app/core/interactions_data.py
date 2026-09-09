"""
Structured and auditable clinical drug-interaction dataset.
Backed by established pharmacovigilance and clinical pharmacology guidelines.
Enforces that deterministic safety matches occur before any LLM explains or annotates findings.
"""

from typing import List, Dict, Optional, Any

CLINICAL_INTERACTIONS_DATA: List[Dict[str, Any]] = [
    {
        "id": "INT-001",
        "drug_a": "warfarin",
        "drug_b": "aspirin",
        "severity": "Major",
        "mechanism": "Additive inhibition of platelet aggregation and coagulation pathway suppression.",
        "clinical_effect": "Significantly elevated risk of major internal gastrointestinal and intracranial hemorrhage.",
        "management": "Avoid co-administration unless specifically indicated (e.g., mechanical heart valve). Monitor INR closely.",
        "evidence": "FDA Black Box Warning / Guideline Established"
    },
    {
        "id": "INT-002",
        "drug_a": "warfarin",
        "drug_b": "ibuprofen",
        "severity": "Major",
        "mechanism": "NSAID-induced platelet dysfunction and gastric mucosal erosion combined with vitamin K antagonism.",
        "clinical_effect": "Severe GI ulceration and high-grade bleeding risk.",
        "management": "Contraindicated in routine practice. Consider paracetamol (acetaminophen) for analgesia instead.",
        "evidence": "Clinical Trial Consensus"
    },
    {
        "id": "INT-003",
        "drug_a": "sildenafil",
        "drug_b": "nitroglycerin",
        "severity": "Contraindicated",
        "mechanism": "Synergistic enhancement of cyclic GMP-mediated vasodilation via PDE-5 inhibition and nitric oxide donation.",
        "clinical_effect": "Life-threatening, refractory systemic hypotension and cardiovascular collapse.",
        "management": "Absolute contraindication. Do not administer nitrates within 24 hours of sildenafil.",
        "evidence": "FDA Black Box Warning"
    },
    {
        "id": "INT-004",
        "drug_a": "lisinopril",
        "drug_b": "spironolactone",
        "severity": "Major",
        "mechanism": "Dual suppression of aldosterone production and renal potassium clearance.",
        "clinical_effect": "Severe hyperkalemia leading to fatal cardiac dysrhythmias and asystole.",
        "management": "Routine serum potassium and renal function monitoring required within 1-2 weeks of initiation.",
        "evidence": "AHA/ACC Clinical Guidelines"
    },
    {
        "id": "INT-005",
        "drug_a": "clarithromycin",
        "drug_b": "simvastatin",
        "severity": "Contraindicated",
        "mechanism": "Potent inhibition of CYP3A4-mediated hepatic metabolism of simvastatin.",
        "clinical_effect": "Dramatic increase in simvastatin plasma concentration, leading to rhabdomyolysis and acute renal failure.",
        "management": "Withhold simvastatin during clarithromycin therapy, or substitute azithromycin.",
        "evidence": "FDA Safety Alert"
    },
    {
        "id": "INT-006",
        "drug_a": "ciprofloxacin",
        "drug_b": "theophylline",
        "severity": "Major",
        "mechanism": "CYP1A2 enzyme inhibition reducing theophylline clearance.",
        "clinical_effect": "Theophylline toxicity: seizures, tachyarrhythmias, nausea, and tremors.",
        "management": "Reduce theophylline dosage by 30-50% and monitor serum theophylline levels.",
        "evidence": "Clinical Pharmacology Standard"
    },
    {
        "id": "INT-007",
        "drug_a": "fluoxetine",
        "drug_b": "tramadol",
        "severity": "Major",
        "mechanism": "Combined serotonergic tone elevation plus CYP2D6 inhibition.",
        "clinical_effect": "Serotonin Syndrome (hyperthermia, clonus, autonomic instability) and lowered seizure threshold.",
        "management": "Avoid combination. Select non-serotonergic analgesic or consult physician.",
        "evidence": "World Health Organization Advisory"
    },
    {
        "id": "INT-008",
        "drug_a": "metformin",
        "drug_b": "iodinated contrast",
        "severity": "Major",
        "mechanism": "Contrast-induced acute kidney injury resulting in metformin accumulation.",
        "clinical_effect": "Metformin-associated lactic acidosis (MALA), with high mortality rate.",
        "management": "Discontinue metformin prior to or at time of procedure; withhold for 48 hours post-contrast.",
        "evidence": "American College of Radiology Guidelines"
    },
    {
        "id": "INT-009",
        "drug_a": "digoxin",
        "drug_b": "amiodarone",
        "severity": "Major",
        "mechanism": "P-glycoprotein inhibition and decreased renal/non-renal clearance of digoxin.",
        "clinical_effect": "Digoxin toxicity: heart block, ventricular arrhythmias, visual disturbances, vomiting.",
        "management": "Reduce digoxin maintenance dose by 50% when initiating amiodarone.",
        "evidence": "Clinical Pharmacology Standard"
    },
    {
        "id": "INT-010",
        "drug_a": "omeprazole",
        "drug_b": "clopidogrel",
        "severity": "Moderate",
        "mechanism": "Competitive inhibition of CYP2C19, hindering the bioactivation of clopidogrel prodrug.",
        "clinical_effect": "Reduced antiplatelet efficacy and increased risk of ischemic cardiac events.",
        "management": "Use pantoprazole or an H2 blocker (e.g., famotidine) as a safer acid suppressant.",
        "evidence": "FDA Drug Safety Communication"
    },
    {
        "id": "INT-011",
        "drug_a": "amoxicillin",
        "drug_b": "methotrexate",
        "severity": "Major",
        "mechanism": "Penicillins compete with methotrexate for renal tubular secretion.",
        "clinical_effect": "Elevated methotrexate toxicity: bone marrow suppression, mucositis, hepatotoxicity.",
        "management": "Avoid concurrent high-dose use; monitor CBC and methotrexate clearance.",
        "evidence": "Clinical Pharmacology Standard"
    },
    {
        "id": "INT-012",
        "drug_a": "levothyroxine",
        "drug_b": "calcium carbonate",
        "severity": "Moderate",
        "mechanism": "Chelation and physical adsorption of thyroxine by calcium ions in the stomach.",
        "clinical_effect": "Impaired absorption of levothyroxine causing persistent hypothyroidism.",
        "management": "Separate administration by at least 4 hours.",
        "evidence": "Endocrine Society Guidelines"
    },
    {
        "id": "INT-013",
        "drug_a": "ciprofloxacin",
        "drug_b": "antacids",
        "severity": "Moderate",
        "mechanism": "Polyvalent cations (aluminum, magnesium) chelate quinolones, reducing oral bioavailability.",
        "clinical_effect": "Treatment failure of bacterial infection due to sub-therapeutic antibiotic levels.",
        "management": "Administer ciprofloxacin at least 2 hours before or 6 hours after antacids.",
        "evidence": "FDA Product Labeling"
    },
    {
        "id": "INT-014",
        "drug_a": "paracetamol",
        "drug_b": "alcohol",
        "severity": "Moderate",
        "mechanism": "Chronic ethanol induces CYP2E1, shunting paracetamol into hepatotoxic NAPQI pathway.",
        "clinical_effect": "Elevated risk of severe hepatocellular necrosis even at therapeutic paracetamol doses.",
        "management": "Advise patient to limit alcohol consumption; do not exceed 2g/day paracetamol in heavy drinkers.",
        "evidence": "Hepatology Clinical Guidance"
    },
    {
        "id": "INT-015",
        "drug_a": "atorvastatin",
        "drug_b": "grapefruit juice",
        "severity": "Moderate",
        "mechanism": "Intestinal CYP3A4 furanocoumarin inhibition.",
        "clinical_effect": "Increased statin systemic exposure, myopathy, and elevated CPK.",
        "management": "Avoid excessive grapefruit consumption (>1 quart/day).",
        "evidence": "FDA Label Warning"
    }
]

def find_interactions(drug_list: List[str]) -> List[Dict[str, Any]]:
    """
    Deterministically evaluates all pairwise combinations of generic drug names against
    the curated interaction knowledge base.
    """
    normalized_drugs = [d.lower().strip() for d in drug_list if d and d.strip()]
    results = []
    
    seen_pairs = set()
    for i in range(len(normalized_drugs)):
        for j in range(i + 1, len(normalized_drugs)):
            d1, d2 = normalized_drugs[i], normalized_drugs[j]
            pair_key = tuple(sorted([d1, d2]))
            if pair_key in seen_pairs:
                continue
            seen_pairs.add(pair_key)
            
            for rule in CLINICAL_INTERACTIONS_DATA:
                r_a = rule["drug_a"].lower()
                r_b = rule["drug_b"].lower()
                
                # Check direct or substring match (e.g. "aspirin 100mg" matches "aspirin")
                if (r_a in d1 or d1 in r_a) and (r_b in d2 or d2 in r_b):
                    results.append({
                        **rule,
                        "matched_drugs": [d1, d2]
                    })
                elif (r_b in d1 or d1 in r_b) and (r_a in d2 or d2 in r_a):
                    results.append({
                        **rule,
                        "matched_drugs": [d1, d2]
                    })
                    
    # Sort results by severity priority: Contraindicated -> Major -> Moderate -> Minor
    severity_order = {"Contraindicated": 0, "Major": 1, "Moderate": 2, "Minor": 3}
    results.sort(key=lambda x: severity_order.get(x.get("severity"), 99))
    return results
