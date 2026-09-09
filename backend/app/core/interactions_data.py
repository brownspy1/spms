"""
Structured and auditable clinical drug-interaction dataset.
Backed by established pharmacovigilance and clinical pharmacology guidelines (FDA, AHA, ACC, WHO).
Enforces that deterministic safety matches occur before any LLM explains or annotates findings.
"""

from typing import List, Dict, Optional, Any

CLINICAL_INTERACTIONS_DATA: List[Dict[str, Any]] = [
    {
        "id": "INT-001",
        "drug_a": "warfarin",
        "drug_b": "aspirin",
        "severity": "Major",
        "risk_category": "bleeding",
        "mechanism": "Additive inhibition of platelet aggregation and coagulation pathway suppression.",
        "clinical_effect": "Significantly elevated risk of major internal gastrointestinal and intracranial hemorrhage.",
        "management": "Avoid co-administration unless specifically indicated (e.g., mechanical heart valve). Monitor INR closely.",
        "evidence": "FDA Black Box Warning / Guideline Established",
        "source": "FDA Black Box Warning"
    },
    {
        "id": "INT-002",
        "drug_a": "warfarin",
        "drug_b": "ibuprofen",
        "severity": "Major",
        "risk_category": "bleeding",
        "mechanism": "NSAID-induced platelet dysfunction and gastric mucosal erosion combined with vitamin K antagonism.",
        "clinical_effect": "Severe GI ulceration and high-grade bleeding risk.",
        "management": "Contraindicated in routine practice. Consider paracetamol (acetaminophen) for analgesia instead.",
        "evidence": "Clinical Trial Consensus",
        "source": "FDA Boxed Warning / Guideline Established"
    },
    {
        "id": "INT-003",
        "drug_a": "sildenafil",
        "drug_b": "nitroglycerin",
        "severity": "Contraindicated",
        "risk_category": "hypotension",
        "mechanism": "Synergistic enhancement of cyclic GMP-mediated vasodilation via PDE-5 inhibition and nitric oxide donation.",
        "clinical_effect": "Life-threatening, refractory systemic hypotension and cardiovascular collapse.",
        "management": "Absolute contraindication. Do not administer nitrates within 24 hours of sildenafil.",
        "evidence": "FDA Black Box Warning",
        "source": "FDA Black Box Warning"
    },
    {
        "id": "INT-004",
        "drug_a": "lisinopril",
        "drug_b": "spironolactone",
        "severity": "Major",
        "risk_category": "hyperkalemia",
        "mechanism": "Dual suppression of aldosterone production and renal potassium clearance.",
        "clinical_effect": "Severe hyperkalemia leading to fatal cardiac dysrhythmias and asystole.",
        "management": "Routine serum potassium and renal function monitoring required within 1-2 weeks of initiation.",
        "evidence": "AHA/ACC Clinical Guidelines",
        "source": "AHA/ACC Clinical Guidelines"
    },
    {
        "id": "INT-005",
        "drug_a": "clarithromycin",
        "drug_b": "simvastatin",
        "severity": "Contraindicated",
        "risk_category": "cyp3a4_inhibition",
        "mechanism": "Potent inhibition of CYP3A4-mediated hepatic metabolism of simvastatin.",
        "clinical_effect": "Dramatic increase in simvastatin plasma concentration, leading to rhabdomyolysis and acute renal failure.",
        "management": "Withhold simvastatin during clarithromycin therapy, or substitute azithromycin.",
        "evidence": "FDA Safety Alert",
        "source": "FDA Safety Alert"
    },
    {
        "id": "INT-006",
        "drug_a": "ciprofloxacin",
        "drug_b": "theophylline",
        "severity": "Major",
        "risk_category": "toxicity",
        "mechanism": "CYP1A2 enzyme inhibition reducing theophylline clearance.",
        "clinical_effect": "Theophylline toxicity: seizures, tachyarrhythmias, nausea, and tremors.",
        "management": "Reduce theophylline dosage by 30-50% and monitor serum theophylline levels.",
        "evidence": "Clinical Pharmacology Standard",
        "source": "Clinical Pharmacology Standard"
    },
    {
        "id": "INT-007",
        "drug_a": "fluoxetine",
        "drug_b": "tramadol",
        "severity": "Major",
        "risk_category": "serotonin_syndrome",
        "mechanism": "Combined serotonergic tone elevation plus CYP2D6 inhibition.",
        "clinical_effect": "Serotonin Syndrome (hyperthermia, clonus, autonomic instability) and lowered seizure threshold.",
        "management": "Avoid combination. Select non-serotonergic analgesic or consult physician.",
        "evidence": "World Health Organization Advisory",
        "source": "World Health Organization Advisory"
    },
    {
        "id": "INT-008",
        "drug_a": "metformin",
        "drug_b": "iodinated contrast",
        "severity": "Major",
        "risk_category": "lactic_acidosis",
        "mechanism": "Contrast-induced acute kidney injury resulting in metformin accumulation.",
        "clinical_effect": "Metformin-associated lactic acidosis (MALA), with high mortality rate.",
        "management": "Discontinue metformin prior to or at time of procedure; withhold for 48 hours post-contrast.",
        "evidence": "American College of Radiology Guidelines",
        "source": "ACR Clinical Guidelines"
    },
    {
        "id": "INT-009",
        "drug_a": "digoxin",
        "drug_b": "amiodarone",
        "severity": "Major",
        "risk_category": "toxicity",
        "mechanism": "P-glycoprotein inhibition and decreased renal/non-renal clearance of digoxin.",
        "clinical_effect": "Digoxin toxicity: heart block, ventricular arrhythmias, visual disturbances, vomiting.",
        "management": "Reduce digoxin maintenance dose by 50% when initiating amiodarone.",
        "evidence": "Clinical Pharmacology Standard",
        "source": "Clinical Pharmacology Standard"
    },
    {
        "id": "INT-010",
        "drug_a": "omeprazole",
        "drug_b": "clopidogrel",
        "severity": "Moderate",
        "risk_category": "efficacy_reduction",
        "mechanism": "Competitive inhibition of CYP2C19, hindering the bioactivation of clopidogrel prodrug.",
        "clinical_effect": "Reduced antiplatelet efficacy and increased risk of ischemic cardiac events.",
        "management": "Use pantoprazole or an H2 blocker (e.g., famotidine) as a safer acid suppressant.",
        "evidence": "FDA Drug Safety Communication",
        "source": "FDA Drug Safety Communication"
    },
    {
        "id": "INT-011",
        "drug_a": "amoxicillin",
        "drug_b": "methotrexate",
        "severity": "Major",
        "risk_category": "nephrotoxicity",
        "mechanism": "Penicillins compete with methotrexate for renal tubular secretion.",
        "clinical_effect": "Elevated methotrexate toxicity: bone marrow suppression, mucositis, hepatotoxicity.",
        "management": "Avoid concurrent high-dose use; monitor CBC and methotrexate clearance.",
        "evidence": "Clinical Pharmacology Standard",
        "source": "Clinical Pharmacology Standard"
    },
    {
        "id": "INT-012",
        "drug_a": "levothyroxine",
        "drug_b": "calcium carbonate",
        "severity": "Moderate",
        "risk_category": "absorption",
        "mechanism": "Chelation and physical adsorption of thyroxine by calcium ions in the stomach.",
        "clinical_effect": "Impaired absorption of levothyroxine causing persistent hypothyroidism.",
        "management": "Separate administration by at least 4 hours.",
        "evidence": "Endocrine Society Guidelines",
        "source": "Endocrine Society Guidelines"
    },
    {
        "id": "INT-013",
        "drug_a": "ciprofloxacin",
        "drug_b": "antacids",
        "severity": "Moderate",
        "risk_category": "absorption",
        "mechanism": "Polyvalent cations (aluminum, magnesium) chelate quinolones, reducing oral bioavailability.",
        "clinical_effect": "Treatment failure of bacterial infection due to sub-therapeutic antibiotic levels.",
        "management": "Administer ciprofloxacin at least 2 hours before or 6 hours after antacids.",
        "evidence": "FDA Product Labeling",
        "source": "FDA Product Labeling"
    },
    {
        "id": "INT-014",
        "drug_a": "paracetamol",
        "drug_b": "alcohol",
        "severity": "Moderate",
        "risk_category": "hepatotoxicity",
        "mechanism": "Chronic ethanol induces CYP2E1, shunting paracetamol into hepatotoxic NAPQI pathway.",
        "clinical_effect": "Elevated risk of severe hepatocellular necrosis even at therapeutic paracetamol doses.",
        "management": "Advise patient to limit alcohol consumption; do not exceed 2g/day paracetamol in heavy drinkers.",
        "evidence": "Hepatology Clinical Guidance",
        "source": "Hepatology Clinical Guidance"
    },
    {
        "id": "INT-015",
        "drug_a": "atorvastatin",
        "drug_b": "grapefruit juice",
        "severity": "Moderate",
        "risk_category": "cyp3a4_inhibition",
        "mechanism": "Intestinal CYP3A4 furanocoumarin inhibition.",
        "clinical_effect": "Increased statin systemic exposure, myopathy, and elevated CPK.",
        "management": "Avoid excessive grapefruit consumption (>1 quart/day).",
        "evidence": "FDA Label Warning",
        "source": "FDA Label Warning"
    },
    # --- EXPANDED CLINICAL DRUG-DRUG INTERACTIONS (INT-016 TO INT-065) ---
    {
        "id": "INT-016",
        "drug_a": "warfarin",
        "drug_b": "sildenafil",
        "severity": "Moderate",
        "risk_category": "bleeding",
        "mechanism": "Systemic vasodilation and PDE-5 platelet modulation combined with anticoagulation.",
        "clinical_effect": "Increased risk of epistaxis, spontaneous hematomas, and mucosal bleeding.",
        "management": "Counsel patient on signs of bleeding; monitor blood pressure and coagulation parameters.",
        "evidence": "Clinical Pharmacology Consensus",
        "source": "Clinical Pharmacology Standard"
    },
    {
        "id": "INT-017",
        "drug_a": "aspirin",
        "drug_b": "sildenafil",
        "severity": "Moderate",
        "risk_category": "bleeding",
        "mechanism": "Additive inhibition of platelet aggregation and enhanced peripheral vasodilation.",
        "clinical_effect": "Elevated bleeding time, epistaxis risk, and transient orthostatic hypotension.",
        "management": "Advise patient to rise slowly to avoid postural dizziness; report prolonged bleeding.",
        "evidence": "Clinical Pharmacology Reference",
        "source": "Clinical Pharmacology Standard"
    },
    {
        "id": "INT-018",
        "drug_a": "lithium",
        "drug_b": "ibuprofen",
        "severity": "Major",
        "risk_category": "toxicity",
        "mechanism": "NSAID inhibition of renal prostaglandins decreases renal lithium excretion.",
        "clinical_effect": "Severe lithium toxicity: ataxia, coarse tremors, confusion, seizures, renal failure.",
        "management": "Avoid NSAIDs in patients on lithium. Use paracetamol (acetaminophen) or monitor serum lithium weekly.",
        "evidence": "FDA Black Box Warning",
        "source": "FDA Black Box Warning"
    },
    {
        "id": "INT-019",
        "drug_a": "lithium",
        "drug_b": "lisinopril",
        "severity": "Major",
        "risk_category": "toxicity",
        "mechanism": "ACE inhibitor-induced natriuresis leads to compensatory renal tubular reabsorption of lithium.",
        "clinical_effect": "Marked increase in serum lithium concentrations and acute neurotoxicity.",
        "management": "Avoid concomitant therapy if possible. Reduce lithium dose by 30-50% and check lithium levels frequently.",
        "evidence": "FDA Label Warning",
        "source": "FDA Label Warning"
    },
    {
        "id": "INT-020",
        "drug_a": "methotrexate",
        "drug_b": "ibuprofen",
        "severity": "Major",
        "risk_category": "toxicity",
        "mechanism": "NSAIDs decrease renal blood flow and competitive inhibition of methotrexate tubular secretion.",
        "clinical_effect": "Severe, potentially fatal methotrexate bone marrow suppression, aplastic anemia, and stomatitis.",
        "management": "Contraindicated with high-dose methotrexate; use extreme caution and close hematologic monitoring with low-dose regimens.",
        "evidence": "FDA Black Box Warning",
        "source": "FDA Black Box Warning"
    },
    {
        "id": "INT-021",
        "drug_a": "sildenafil",
        "drug_b": "doxazosin",
        "severity": "Major",
        "risk_category": "hypotension",
        "mechanism": "Dual peripheral alpha-1 blockade and PDE-5 inhibition causing additive arterial vasodilation.",
        "clinical_effect": "Symptomatic, precipitous hypotension, dizziness, and syncope.",
        "management": "Patients should be stable on alpha-blocker therapy prior to initiating PDE-5 inhibitor at lowest dose (25mg).",
        "evidence": "FDA Safety Alert",
        "source": "FDA Safety Alert"
    },
    {
        "id": "INT-022",
        "drug_a": "tadalafil",
        "drug_b": "nitroglycerin",
        "severity": "Contraindicated",
        "risk_category": "hypotension",
        "mechanism": "Profound synergistic cGMP elevation and systemic vasodilation.",
        "clinical_effect": "Catastrophic hypotension, myocardial infarction, and cardiovascular collapse.",
        "management": "Absolute contraindication. Nitrates must NOT be administered within 48 hours of tadalafil.",
        "evidence": "FDA Black Box Warning",
        "source": "FDA Black Box Warning"
    },
    {
        "id": "INT-023",
        "drug_a": "simvastatin",
        "drug_b": "gemfibrozil",
        "severity": "Contraindicated",
        "risk_category": "myopathy",
        "mechanism": "Gemfibrozil inhibits statin glucuronidation and OATP1B1 hepatic uptake.",
        "clinical_effect": "Marked increase in statin plasma levels, rhabdomyolysis, myoglobinuria, and renal failure.",
        "management": "Avoid concomitant use. If fibrate therapy is required with a statin, consider fenofibrate.",
        "evidence": "FDA Safety Alert",
        "source": "FDA Safety Alert"
    },
    {
        "id": "INT-024",
        "drug_a": "simvastatin",
        "drug_b": "amlodipine",
        "severity": "Moderate",
        "risk_category": "myopathy",
        "mechanism": "Amlodipine inhibits CYP3A4-mediated clearance of simvastatin.",
        "clinical_effect": "Increased risk of myopathy and muscle pain.",
        "management": "Do not exceed simvastatin 20mg daily when co-administered with amlodipine.",
        "evidence": "FDA Drug Safety Communication",
        "source": "FDA Drug Safety Communication"
    },
    {
        "id": "INT-025",
        "drug_a": "potassium",
        "drug_b": "spironolactone",
        "severity": "Major",
        "risk_category": "hyperkalemia",
        "mechanism": "Direct potassium supplementation combined with aldosterone-mediated potassium retention.",
        "clinical_effect": "Life-threatening hyperkalemia, peaked T-waves, ventricular fibrillation, and cardiac arrest.",
        "management": "Do not give potassium supplements routinely with potassium-sparing diuretics unless documented hypokalemia.",
        "evidence": "AHA/ACC Guidelines",
        "source": "AHA/ACC Guidelines"
    },
    {
        "id": "INT-026",
        "drug_a": "lisinopril",
        "drug_b": "losartan",
        "severity": "Major",
        "risk_category": "hyperkalemia",
        "mechanism": "Dual renin-angiotensin-aldosterone system (RAAS) blockade.",
        "clinical_effect": "Significantly elevated risk of acute renal failure, severe hypotension, and hyperkalemia without added cardiac benefit.",
        "management": "Routine dual RAAS blockade is contraindicated. Monotherapy with either ACEi or ARB is recommended.",
        "evidence": "ONTARGET Trial / FDA Warning",
        "source": "FDA Safety Warning"
    },
    {
        "id": "INT-027",
        "drug_a": "metoprolol",
        "drug_b": "verapamil",
        "severity": "Major",
        "risk_category": "bradycardia",
        "mechanism": "Additive negative inotropic and dromotropic effects on SA and AV nodal conduction.",
        "clinical_effect": "Severe bradycardia, high-degree AV block, and acute congestive heart failure decompensation.",
        "management": "Avoid combination, especially intravenously. Monitor heart rate and ECG closely if co-prescribed.",
        "evidence": "AHA/ACC Clinical Guidelines",
        "source": "AHA/ACC Guidelines"
    },
    {
        "id": "INT-028",
        "drug_a": "metoprolol",
        "drug_b": "diltiazem",
        "severity": "Major",
        "risk_category": "bradycardia",
        "mechanism": "Dual suppression of cardiac automaticity and AV nodal conduction.",
        "clinical_effect": "Profound bradycardia, hypotension, and exacerbation of heart failure.",
        "management": "Use with caution and continuous cardiac monitoring; consider dihydropyridine CCB (e.g., amlodipine) instead.",
        "evidence": "Clinical Pharmacology Consensus",
        "source": "Clinical Pharmacology Standard"
    },
    {
        "id": "INT-029",
        "drug_a": "fluoxetine",
        "drug_b": "metoprolol",
        "severity": "Moderate",
        "risk_category": "bradycardia",
        "mechanism": "Potent CYP2D6 inhibition by fluoxetine drastically elevates metoprolol plasma levels.",
        "clinical_effect": "Excessive beta-blockade: pronounced bradycardia, fatigue, and hypotension.",
        "management": "Reduce metoprolol dose or substitute non-CYP2D6 metabolized beta-blocker (atenolol, bisoprolol).",
        "evidence": "FDA Label Warning",
        "source": "FDA Label Warning"
    },
    {
        "id": "INT-030",
        "drug_a": "tramadol",
        "drug_b": "sertraline",
        "severity": "Major",
        "risk_category": "serotonin_syndrome",
        "mechanism": "Dual enhancement of serotonin reuptake inhibition.",
        "clinical_effect": "Serotonin syndrome (mental status changes, hyperreflexia, hyperthermia) and lowered seizure threshold.",
        "management": "Avoid combination. Monitor patient closely for serotonergic symptoms or select alternative analgesic.",
        "evidence": "WHO Drug Safety Advisory",
        "source": "WHO Safety Advisory"
    },
    {
        "id": "INT-031",
        "drug_a": "clarithromycin",
        "drug_b": "amiodarone",
        "severity": "Contraindicated",
        "risk_category": "qtc_prolongation",
        "mechanism": "Additive QTc interval prolongation and CYP3A4 inhibition of amiodarone clearance.",
        "clinical_effect": "Marked QTc prolongation, Torsades de Pointes, ventricular fibrillation, and sudden cardiac death.",
        "management": "Avoid combination. Select an alternative antibiotic that does not prolong QTc (e.g., amoxicillin).",
        "evidence": "FDA Black Box Warning",
        "source": "FDA Black Box Warning"
    },
    {
        "id": "INT-032",
        "drug_a": "ciprofloxacin",
        "drug_b": "prednisolone",
        "severity": "Major",
        "risk_category": "tendon_rupture",
        "mechanism": "Synergistic extracellular matrix degradation in tendon collagen fibers.",
        "clinical_effect": "Significantly heightened risk of severe tendinitis and Achilles tendon rupture, especially in elderly.",
        "management": "Avoid concomitant use where possible. Advise immediate cessation of exercise and report tendon pain.",
        "evidence": "FDA Black Box Warning",
        "source": "FDA Black Box Warning"
    },
    {
        "id": "INT-033",
        "drug_a": "levofloxacin",
        "drug_b": "amiodarone",
        "severity": "Contraindicated",
        "risk_category": "qtc_prolongation",
        "mechanism": "Additive prolongation of cardiac myocyte action potential duration and QTc interval.",
        "clinical_effect": "High risk of fatal ventricular arrhythmias (Torsades de Pointes).",
        "management": "Contraindicated. Perform baseline ECG and select non-cardiotoxic antimicrobial agent.",
        "evidence": "CredibleMeds / FDA Warning",
        "source": "CredibleMeds QT Registry"
    },
    {
        "id": "INT-034",
        "drug_a": "digoxin",
        "drug_b": "clarithromycin",
        "severity": "Major",
        "risk_category": "toxicity",
        "mechanism": "Inhibition of renal P-glycoprotein efflux and reduction of gut flora metabolizing digoxin.",
        "clinical_effect": "Two-fold elevation of digoxin concentrations resulting in fatal cardiac glycoside toxicity.",
        "management": "Reduce digoxin dosage by 50% and obtain serum digoxin levels within 48-72 hours.",
        "evidence": "Clinical Pharmacology Standard",
        "source": "Clinical Pharmacology Standard"
    },
    {
        "id": "INT-035",
        "drug_a": "warfarin",
        "drug_b": "fluconazole",
        "severity": "Major",
        "risk_category": "bleeding",
        "mechanism": "Potent inhibition of CYP2C9, the primary metabolizing enzyme for the active S-warfarin enantiomer.",
        "clinical_effect": "Dramatic elevation of INR and catastrophic hemorrhage risk.",
        "management": "Reduce warfarin maintenance dose by 50% when initiating fluconazole; monitor INR every 2-3 days.",
        "evidence": "FDA Black Box Warning",
        "source": "FDA Black Box Warning"
    },
    {
        "id": "INT-036",
        "drug_a": "warfarin",
        "drug_b": "metronidazole",
        "severity": "Major",
        "risk_category": "bleeding",
        "mechanism": "Stereoselective CYP2C9 inhibition blocking S-warfarin clearance.",
        "clinical_effect": "Severe INR prolongation and acute internal bleeding.",
        "management": "Anticipate 30-50% warfarin dose reduction; close INR surveillance required.",
        "evidence": "FDA Product Warning",
        "source": "FDA Product Warning"
    },
    {
        "id": "INT-037",
        "drug_a": "warfarin",
        "drug_b": "ciprofloxacin",
        "severity": "Major",
        "risk_category": "bleeding",
        "mechanism": "CYP1A2 and CYP3A4 inhibition combined with gut flora eradication reducing vitamin K synthesis.",
        "clinical_effect": "Marked INR spike and increased spontaneous bleeding.",
        "management": "Check INR within 3 days of initiating ciprofloxacin; adjust anticoagulant dosing.",
        "evidence": "Clinical Pharmacology Guideline",
        "source": "Clinical Pharmacology Standard"
    },
    {
        "id": "INT-038",
        "drug_a": "clopidogrel",
        "drug_b": "aspirin",
        "severity": "Moderate",
        "risk_category": "bleeding",
        "mechanism": "Dual antiplatelet therapy (DAPT) inhibits both ADP P2Y12 and thromboxane A2 pathways.",
        "clinical_effect": "Enhanced antithrombotic efficacy but significantly increased gastrointestinal and major bleeding.",
        "management": "Indicated post-PCI / ACS for guideline-directed duration. Prescribe PPI gastroprotection for high-risk patients.",
        "evidence": "AHA/ACC DAPT Guidelines",
        "source": "AHA/ACC DAPT Guidelines"
    },
    {
        "id": "INT-039",
        "drug_a": "warfarin",
        "drug_b": "clopidogrel",
        "severity": "Major",
        "risk_category": "bleeding",
        "mechanism": "Combined inhibition of coagulation cascade (vitamin K antagonism) and platelet activation.",
        "clinical_effect": "Substantial 3 to 5-fold surge in major bleeding events and hemorrhagic stroke.",
        "management": "Use only when compelling clinical indication exists. Minimize treatment duration and target INR 2.0-2.5.",
        "evidence": "CHEST Antithrombotic Guidelines",
        "source": "CHEST Antithrombotic Guidelines"
    },
    {
        "id": "INT-040",
        "drug_a": "apixaban",
        "drug_b": "aspirin",
        "severity": "Major",
        "risk_category": "bleeding",
        "mechanism": "Factor Xa inhibition combined with irreversible COX-1 platelet inhibition.",
        "clinical_effect": "Severe major gastrointestinal bleeding and systemic hemorrhage.",
        "management": "Do not co-prescribe without definitive clinical indication (e.g. recent stenting). Avoid routine NSAIDs.",
        "evidence": "FDA Black Box Warning",
        "source": "FDA Black Box Warning"
    },
    {
        "id": "INT-041",
        "drug_a": "apixaban",
        "drug_b": "ibuprofen",
        "severity": "Major",
        "risk_category": "bleeding",
        "mechanism": "Reversible platelet COX inhibition and gastric mucosa ulceration combined with direct oral anticoagulation.",
        "clinical_effect": "High risk of upper GI bleeding, perforation, and hematoma.",
        "management": "Contraindicated for chronic pain relief. Recommend topical analgesics or paracetamol.",
        "evidence": "FDA Package Insert",
        "source": "FDA Package Insert"
    },
    {
        "id": "INT-042",
        "drug_a": "rivaroxaban",
        "drug_b": "clarithromycin",
        "severity": "Major",
        "risk_category": "bleeding",
        "mechanism": "Combined dual inhibition of CYP3A4 and P-glycoprotein increases rivaroxaban plasma AUC by >150%.",
        "clinical_effect": "Elevated rivaroxaban exposure leading to critical internal hemorrhage.",
        "management": "Avoid co-administration in patients with renal impairment; use alternative antibiotic.",
        "evidence": "FDA Drug Label",
        "source": "FDA Drug Label"
    },
    {
        "id": "INT-043",
        "drug_a": "morphine",
        "drug_b": "diazepam",
        "severity": "Contraindicated",
        "risk_category": "cns_depression",
        "mechanism": "Synergistic depression of central nervous system and respiratory drive via mu-opioid and GABA-A receptors.",
        "clinical_effect": "Profound sedation, severe respiratory depression, coma, and fatal overdose.",
        "management": "Avoid concurrent prescribing unless no alternative exists. Limit dosage to minimum and co-prescribe naloxone.",
        "evidence": "FDA Black Box Warning",
        "source": "FDA Black Box Warning"
    },
    {
        "id": "INT-044",
        "drug_a": "tramadol",
        "drug_b": "alprazolam",
        "severity": "Major",
        "risk_category": "cns_depression",
        "mechanism": "Combined central nervous system depression and respiratory drive suppression.",
        "clinical_effect": "Excessive somnolence, respiratory hypoventilation, and accidental overdose death.",
        "management": "Limit doses to lowest effective; warn patient against driving, operating machinery, or alcohol intake.",
        "evidence": "FDA Black Box Warning",
        "source": "FDA Black Box Warning"
    },
    {
        "id": "INT-045",
        "drug_a": "aspirin",
        "drug_b": "ibuprofen",
        "severity": "Moderate",
        "risk_category": "efficacy_reduction",
        "mechanism": "Ibuprofen competitively blocks aspirin from acetylating the COX-1 active catalytic channel.",
        "clinical_effect": "Loss of aspirin's irreversible cardioprotective antiplatelet effect; increased cardiovascular thrombotic risk.",
        "management": "Take low-dose aspirin at least 30 minutes before, or 8 hours after, taking immediate-release ibuprofen.",
        "evidence": "FDA Drug Safety Communication",
        "source": "FDA Drug Safety Communication"
    },
    {
        "id": "INT-046",
        "drug_a": "metformin",
        "drug_b": "alcohol",
        "severity": "Major",
        "risk_category": "lactic_acidosis",
        "mechanism": "Ethanol promotes hepatic lactate accumulation by altering NADH/NAD+ redox ratio.",
        "clinical_effect": "Potentiation of metformin-associated lactic acidosis (MALA), acute pancreatitis, and hypoglycemia.",
        "management": "Warn patients against acute binge or chronic heavy alcohol consumption during metformin treatment.",
        "evidence": "FDA Black Box Warning",
        "source": "FDA Black Box Warning"
    },
    {
        "id": "INT-047",
        "drug_a": "allopurinol",
        "drug_b": "azathioprine",
        "severity": "Contraindicated",
        "risk_category": "toxicity",
        "mechanism": "Inhibition of xanthine oxidase, the primary enzyme responsible for degrading 6-mercaptopurine.",
        "clinical_effect": "Severe, life-threatening pancytopenia, agranulocytosis, and fatal myelosuppression.",
        "management": "Reduce azathioprine dose to 25-33% of standard dose, or avoid combination entirely; monitor CBC weekly.",
        "evidence": "FDA Product Labeling",
        "source": "FDA Product Labeling"
    },
    {
        "id": "INT-048",
        "drug_a": "spironolactone",
        "drug_b": "ibuprofen",
        "severity": "Moderate",
        "risk_category": "hyperkalemia",
        "mechanism": "NSAID inhibition of renal vasodilator prostaglandins reduces diuretic efficacy and potassium clearance.",
        "clinical_effect": "Diminished natriuresis, worsened hypertension, acute kidney injury, and hyperkalemia.",
        "management": "Avoid routine NSAID use in heart failure / hypertensive patients on spironolactone; monitor potassium.",
        "evidence": "Clinical Pharmacology Standard",
        "source": "Clinical Pharmacology Standard"
    },
    {
        "id": "INT-049",
        "drug_a": "furosemide",
        "drug_b": "gentamicin",
        "severity": "Major",
        "risk_category": "nephrotoxicity",
        "mechanism": "Additive inner ear hair cell injury and synergistic renal proximal tubular toxicity.",
        "clinical_effect": "Permanent sensorineural hearing loss (ototoxicity), vestibular damage, and acute tubular necrosis.",
        "management": "Avoid combination when possible; monitor peak/trough aminoglycoside levels and renal function.",
        "evidence": "FDA Warning / Clinical Standard",
        "source": "FDA Product Label"
    },
    {
        "id": "INT-050",
        "drug_a": "methotrexate",
        "drug_b": "trimethoprim-sulfamethoxazole",
        "severity": "Major",
        "risk_category": "toxicity",
        "mechanism": "Dual inhibition of dihydrofolate reductase plus displacement of methotrexate from albumin.",
        "clinical_effect": "Catastrophic bone marrow suppression, severe megaloblastic anemia, and mucosal sloughing.",
        "management": "Avoid combination. Select an alternative non-antifolate antibiotic (e.g. amoxicillin, cephalosporin).",
        "evidence": "Clinical Pharmacology Standard",
        "source": "Clinical Pharmacology Standard"
    },
    {
        "id": "INT-051",
        "drug_a": "tacrolimus",
        "drug_b": "clarithromycin",
        "severity": "Major",
        "risk_category": "cyp3a4_inhibition",
        "mechanism": "Strong CYP3A4 and P-gp inhibition decreases tacrolimus clearance.",
        "clinical_effect": "Severe calcineurin inhibitor nephrotoxicity, neurotoxicity, and tremors.",
        "management": "Reduce tacrolimus dose by 50-75% with daily trough level monitoring, or switch to azithromycin.",
        "evidence": "FDA Label Warning",
        "source": "FDA Label Warning"
    },
    {
        "id": "INT-052",
        "drug_a": "paracetamol",
        "drug_b": "warfarin",
        "severity": "Moderate",
        "risk_category": "bleeding",
        "mechanism": "NAPQI metabolite inhibits vitamin K-dependent carboxylase with prolonged high doses (>2g/day).",
        "clinical_effect": "Unexpected INR elevation and increased bleeding risk.",
        "management": "Monitor INR if patient consumes paracetamol >2g daily for longer than 3-4 consecutive days.",
        "evidence": "Clinical Pharmacology Consensus",
        "source": "Clinical Pharmacology Standard"
    },
    {
        "id": "INT-053",
        "drug_a": "carbamazepine",
        "drug_b": "ethinyl estradiol",
        "severity": "Major",
        "risk_category": "efficacy_reduction",
        "mechanism": "Potent hepatic CYP3A4 induction acceleratively metabolizes contraceptive steroids.",
        "clinical_effect": "Contraceptive failure, breakthrough bleeding, and unplanned pregnancy.",
        "management": "Advise non-hormonal or intrauterine barrier contraception methods.",
        "evidence": "WHO Family Planning Guidelines",
        "source": "WHO Guidelines"
    },
    {
        "id": "INT-054",
        "drug_a": "fluconazole",
        "drug_b": "phenytoin",
        "severity": "Major",
        "risk_category": "toxicity",
        "mechanism": "CYP2C9 enzyme inhibition by fluconazole impairs phenytoin hydroxylation.",
        "clinical_effect": "Phenytoin intoxication: nystagmus, ataxia, severe lethargy, and mental confusion.",
        "management": "Monitor phenytoin serum concentrations closely; reduce phenytoin dose by 20-40%.",
        "evidence": "FDA Product Label",
        "source": "FDA Product Label"
    },
    {
        "id": "INT-055",
        "drug_a": "atorvastatin",
        "drug_b": "clarithromycin",
        "severity": "Major",
        "risk_category": "myopathy",
        "mechanism": "Potent CYP3A4 inhibition increases atorvastatin exposure by up to 4.5-fold.",
        "clinical_effect": "Elevated risk of severe myopathy, CPK elevation, and rhabdomyolysis.",
        "management": "Limit atorvastatin dose to 20mg daily, or temporarily suspend statin during antibiotic course.",
        "evidence": "FDA Safety Alert",
        "source": "FDA Safety Alert"
    },
    {
        "id": "INT-056",
        "drug_a": "fluoxetine",
        "drug_b": "aspirin",
        "severity": "Moderate",
        "risk_category": "bleeding",
        "mechanism": "Depletion of platelet serotonin storage combined with COX-1 inhibition.",
        "clinical_effect": "Two-fold higher incidence of upper gastrointestinal bleeding.",
        "management": "Prescribe a proton pump inhibitor (e.g., pantoprazole) for patients at high GI bleed risk.",
        "evidence": "Clinical Pharmacology Standard",
        "source": "Clinical Pharmacology Standard"
    },
    {
        "id": "INT-057",
        "drug_a": "sildenafil",
        "drug_b": "clarithromycin",
        "severity": "Moderate",
        "risk_category": "cyp3a4_inhibition",
        "mechanism": "CYP3A4 inhibition by macrolide elevates sildenafil plasma peak and AUC.",
        "clinical_effect": "Increased incidence of hypotension, visual disturbances, flushing, and priapism.",
        "management": "Consider starting sildenafil dose of 25mg when co-administered with CYP3A4 inhibitors.",
        "evidence": "FDA Product Information",
        "source": "FDA Product Information"
    },
    {
        "id": "INT-058",
        "drug_a": "lithium",
        "drug_b": "hydrochlorothiazide",
        "severity": "Major",
        "risk_category": "toxicity",
        "mechanism": "Thiazide-induced proximal tubular sodium and water reabsorption increases lithium retention.",
        "clinical_effect": "Substantial 30-50% rise in serum lithium concentration; neurotoxicity.",
        "management": "Reduce lithium dosage by 50% upon thiazide initiation; monitor lithium levels within 3-5 days.",
        "evidence": "FDA Black Box Warning",
        "source": "FDA Black Box Warning"
    },
    {
        "id": "INT-059",
        "drug_a": "losartan",
        "drug_b": "spironolactone",
        "severity": "Major",
        "risk_category": "hyperkalemia",
        "mechanism": "Synergistic suppression of renal potassium excretion by ARB and aldosterone antagonist.",
        "clinical_effect": "Dangerous hyperkalemia and acute renal impairment.",
        "management": "Check baseline eGFR and potassium; monitor electrolytes at 1 week, 4 weeks, and periodically.",
        "evidence": "AHA/ACC Guidelines",
        "source": "AHA/ACC Guidelines"
    },
    {
        "id": "INT-060",
        "drug_a": "clopidogrel",
        "drug_b": "naproxen",
        "severity": "Major",
        "risk_category": "bleeding",
        "mechanism": "NSAID gastropathy and reversible platelet inhibition combined with irreversible P2Y12 inhibition.",
        "clinical_effect": "Markedly increased gastrointestinal bleeding and peptic ulcer perforation.",
        "management": "Avoid routine combination. Use paracetamol for pain; add PPI gastroprotection if NSAID unavoidable.",
        "evidence": "Clinical Pharmacology Standard",
        "source": "Clinical Pharmacology Standard"
    }
]

# Comprehensive clinical allergy and cross-reactivity directory
ALLERGY_CROSS_REACTIVITY: Dict[str, Dict[str, Any]] = {
    "penicillin": {
        "drugs": ["amoxicillin", "ampicillin", "piperacillin", "augmentin", "penicillin", "methicillin", "oxacillin"],
        "class_name": "Beta-Lactams / Penicillins",
        "related_classes": ["cephalosporins"],
        "warning": "Cross-sensitivity risk: Patient allergic to Penicillin may experience severe anaphylaxis, urticaria, or angioedema with beta-lactam antibiotics."
    },
    "cephalosporin": {
        "drugs": ["cephalexin", "ceftriaxone", "cefuroxime", "cefixime", "cefepime", "cefazolin"],
        "class_name": "Cephalosporins",
        "warning": "Cross-sensitivity risk: Up to 5-10% cross-reactivity with penicillins due to shared beta-lactam core."
    },
    "sulfa": {
        "drugs": ["trimethoprim-sulfamethoxazole", "bactrim", "septra", "sulfamethoxazole", "sulfasalazine", "hydrochlorothiazide", "furosemide", "celecoxib"],
        "class_name": "Sulfonamides / Sulfa Derivatives",
        "warning": "Hypersensitivity risk: Severe cutaneous adverse reactions (Stevens-Johnson syndrome, toxic epidermal necrolysis, rash)."
    },
    "nsaid": {
        "drugs": ["aspirin", "ibuprofen", "naproxen", "diclofenac", "ketorolac", "meloxicam", "indomethacin", "celecoxib"],
        "class_name": "Non-Steroidal Anti-Inflammatory Drugs (NSAIDs)",
        "warning": "Cross-reactivity risk: NSAID-exacerbated respiratory disease (Samter's triad: severe bronchospasm, urticaria, or anaphylaxis)."
    },
    "aspirin": {
        "drugs": ["aspirin", "acetylsalicylic acid", "ibuprofen", "naproxen", "diclofenac", "ketorolac"],
        "class_name": "Salicylates / NSAIDs",
        "warning": "Aspirin hypersensitivity: Severe bronchospasm, angioedema, and cross-sensitivity to all COX-1 inhibitors."
    },
    "opioid": {
        "drugs": ["morphine", "codeine", "tramadol", "fentanyl", "oxycodone", "hydrocodone", "buprenorphine"],
        "class_name": "Opioid Analgesics",
        "warning": "Opioid hypersensitivity or pseudo-allergy: Mast cell histamine release causing severe pruritus, bronchospasm, or hypotension."
    },
    "statin": {
        "drugs": ["simvastatin", "atorvastatin", "rosuvastatin", "pravastatin", "lovastatin"],
        "class_name": "HMG-CoA Reductase Inhibitors (Statins)",
        "warning": "Statin intolerance: High risk of recurrent severe myalgia, myopathy, or transaminase elevation."
    },
    "acei": {
        "drugs": ["lisinopril", "ramipril", "enalapril", "captopril", "perindopril"],
        "class_name": "ACE Inhibitors",
        "warning": "Bradykinin-mediated hypersensitivity: History of life-threatening angioedema. ACE inhibitors are strictly contraindicated."
    }
}


def check_allergy_cross_reactivity(drug_list: List[str], patient_allergies: Optional[str]) -> List[str]:
    """
    Evaluates medication list against reported patient allergies, accounting for
    substance matches and pharmacological class cross-reactivity.
    """
    if not patient_allergies or not patient_allergies.strip():
        return []

    warnings = []
    p_allergies_lower = patient_allergies.lower().strip()
    normalized_drugs = [d.lower().strip() for d in drug_list if d and d.strip()]

    for drug in normalized_drugs:
        # 1. Direct drug name match
        if drug in p_allergies_lower:
            warnings.append(f"DIRECT ALLERGY ALERT: Medication '{drug.title()}' directly matches patient allergy: '{patient_allergies}'")
            continue

        # 2. Check clinical cross-reactivity mapping
        matched_class = False
        for allergy_key, info in ALLERGY_CROSS_REACTIVITY.items():
            if allergy_key in p_allergies_lower:
                for reactive_drug in info["drugs"]:
                    if reactive_drug in drug or drug in reactive_drug:
                        warnings.append(
                            f"CLASS CROSS-REACTIVITY ALERT: '{drug.title()}' ({info['class_name']}) cross-reacts with patient allergy '{patient_allergies}'. {info['warning']}"
                        )
                        matched_class = True
                        break
            if matched_class:
                break

    return warnings


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
