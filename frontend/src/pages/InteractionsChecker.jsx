import React, { useState, useEffect } from 'react';
import {
  Activity,
  ShieldAlert,
  AlertTriangle,
  CheckCircle,
  Send,
  Sparkles,
  Bot,
  User,
  Plus,
  X,
  BookOpen,
  Printer,
  Copy,
  Check,
  Globe,
  Database,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Layers,
  HeartPulse,
} from 'lucide-react';
import { interactionsApi, settingsApi } from '../services/api';
import FormattedAIResponse from '../components/FormattedAIResponse';

const DRUG_CATEGORIES = [
  {
    name: 'Anticoagulants & Antiplatelets',
    drugs: ['Warfarin', 'Aspirin', 'Clopidogrel', 'Apixaban', 'Rivaroxaban', 'Dabigatran'],
  },
  {
    name: 'Cardiovascular & Vasodilators',
    drugs: ['Sildenafil', 'Nitroglycerin', 'Lisinopril', 'Spironolactone', 'Amlodipine', 'Metoprolol', 'Digoxin'],
  },
  {
    name: 'Antibiotics & Antifungals',
    drugs: ['Ciprofloxacin', 'Clarithromycin', 'Amoxicillin', 'Fluconazole', 'Metronidazole', 'Levofloxacin'],
  },
  {
    name: 'Analgesics & NSAIDs',
    drugs: ['Ibuprofen', 'Naproxen', 'Tramadol', 'Paracetamol', 'Diclofenac', 'Morphine'],
  },
  {
    name: 'Metabolic & Others',
    drugs: ['Metformin', 'Simvastatin', 'Atorvastatin', 'Omeprazole', 'Methotrexate', 'Lithium', 'Theophylline'],
  },
];

const COMMON_ALLERGIES = [
  'Penicillin',
  'NSAIDs',
  'Sulfa Drugs',
  'Opioids',
  'Statins',
  'Aspirin',
];

const QUICK_PROMPTS = [
  'Bleeding risk counseling for patient',
  'Renal dosage adjustments needed?',
  'Recommend safer alternative drugs',
  'বাংলায় বিস্তারিত বুঝিয়ে বলুন (Explain in Bengali)',
];

export default function InteractionsChecker() {
  const [selectedDrugs, setSelectedDrugs] = useState(['Warfarin', 'Aspirin', 'Sildenafil']);
  const [customDrugInput, setCustomDrugInput] = useState('');
  const [patientAllergies, setPatientAllergies] = useState('');
  const [report, setReport] = useState(null);
  const [checking, setChecking] = useState(false);
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [showFdaDetails, setShowFdaDetails] = useState(true);

  // AI Assistant Chat state
  const [aiPrompt, setAiPrompt] = useState('');
  const [chatHistory, setChatHistory] = useState([
    {
      role: 'assistant',
      text: 'Hello! I am your SPMS Clinical Pharmacist Assistant. You can ask me regarding dosing regimens, contraindications, mechanism of action, or adverse reaction management. All interactions are cross-referenced with our 60+ audited clinical rules, live openFDA drug safety database, and NIH RxNav normalization.',
    },
  ]);
  const [consultingAI, setConsultingAI] = useState(false);
  const [aiConfig, setAiConfig] = useState(null);

  useEffect(() => {
    settingsApi.getAI()
      .then((data) => setAiConfig(data))
      .catch((err) => console.log('Could not load AI config:', err));
  }, []);

  const addDrug = (drug) => {
    const trimmed = drug.trim();
    if (trimmed && !selectedDrugs.some((d) => d.toLowerCase() === trimmed.toLowerCase())) {
      setSelectedDrugs([...selectedDrugs, trimmed]);
      setCustomDrugInput('');
    }
  };

  const removeDrug = (drug) => {
    setSelectedDrugs(selectedDrugs.filter((d) => d !== drug));
  };

  const clearAllDrugs = () => {
    setSelectedDrugs([]);
    setReport(null);
  };

  const addAllergyTag = (allergy) => {
    if (!patientAllergies.toLowerCase().includes(allergy.toLowerCase())) {
      setPatientAllergies(patientAllergies ? `${patientAllergies}, ${allergy}` : allergy);
    }
  };

  const handleScreenInteractions = async () => {
    if (selectedDrugs.length === 0) return;
    setChecking(true);
    try {
      const data = await interactionsApi.check(selectedDrugs, patientAllergies);
      setReport(data);
    } catch (err) {
      console.error('Check failed:', err);
    } finally {
      setChecking(false);
    }
  };

  const executeAskAI = async (messageText) => {
    if (!messageText.trim() || consultingAI) return;
    setChatHistory((prev) => [...prev, { role: 'user', text: messageText }]);
    setAiPrompt('');
    setConsultingAI(true);

    try {
      const data = await interactionsApi.consultAI(messageText, selectedDrugs);
      setChatHistory((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: data.response,
          disclaimer: data.safety_disclaimer,
          model: data.model,
        },
      ]);
    } catch (err) {
      setChatHistory((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: `Error processing clinical inquiry: ${err.message}`,
        },
      ]);
    } finally {
      setConsultingAI(false);
    }
  };

  const handleAskAI = (e) => {
    e.preventDefault();
    executeAskAI(aiPrompt);
  };

  const consultSpecificPair = (drugA, drugB) => {
    const query = `What are the detailed clinical management steps, monitoring protocols, and safer alternatives for the interaction between ${drugA} and ${drugB}?`;
    executeAskAI(query);
  };

  const copySummaryToClipboard = () => {
    if (!report) return;
    const text = `SPMS CLINICAL DRUG SAFETY REPORT\nMedications: ${selectedDrugs.join(', ')}\nStatus: ${report.has_critical_warning ? 'CRITICAL WARNING' : 'PASSED'}\n\nSummary:\n${report.clinical_summary}\n\nInteractions Detected: ${report.total_interactions}\n${report.interactions.map(it => `- ${it.drug_a.toUpperCase()} + ${it.drug_b.toUpperCase()} (${it.severity}): ${it.clinical_effect} [Guidance: ${it.management}]`).join('\n')}`;
    navigator.clipboard.writeText(text);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2500);
  };

  const handlePrintReport = () => {
    window.print();
  };

  const severityStyles = {
    Contraindicated: 'bg-rose-500/20 text-rose-300 border-rose-500/60 shadow-rose-500/10',
    Major: 'bg-rose-500/15 text-rose-300 border-rose-500/40 shadow-rose-500/5',
    Moderate: 'bg-amber-500/15 text-amber-300 border-amber-500/40 shadow-amber-500/5',
    Minor: 'bg-blue-500/15 text-blue-300 border-blue-500/40 shadow-blue-500/5',
  };

  const severityBadge = {
    Contraindicated: 'bg-rose-600 text-white border-rose-400 animate-pulse',
    Major: 'bg-rose-500/30 text-rose-200 border-rose-400/50',
    Moderate: 'bg-amber-500/30 text-amber-200 border-amber-400/50',
    Minor: 'bg-blue-500/30 text-blue-200 border-blue-400/50',
  };

  // Find if a drug was normalized from a brand
  const getNormalizedDisplay = (drugName) => {
    if (!report?.normalized_drugs) return drugName;
    const item = report.normalized_drugs.find(
      (n) => n.input.toLowerCase() === drugName.toLowerCase()
    );
    if (item && item.is_brand) {
      return `${item.generic.toUpperCase()} (${item.input})`;
    }
    return drugName;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-8">
      {/* LEFT: Structured Interaction Screener (7 Cols) */}
      <div className="lg:col-span-7 space-y-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Clinical Drug-Drug Interaction Screener</h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              v2.0 Audited
            </span>
          </div>
          <p className="text-slate-400 text-xs mt-1 leading-relaxed">
            Backed by 60+ audited clinical pharmacology guidelines, live openFDA Drug Safety API, and NIH RxNav normalization to eliminate unverified LLM hallucinations.
          </p>

          {/* Integration Badges */}
          <div className="flex flex-wrap gap-2 mt-2.5">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[10px] text-slate-300 font-medium">
              <Database className="w-3 h-3 text-emerald-400" />
              Audited Knowledge Base (60+ Rules)
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[10px] text-slate-300 font-medium">
              <Globe className="w-3 h-3 text-sky-400" />
              openFDA Live Drug Safety API
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[10px] text-slate-300 font-medium">
              <BookOpen className="w-3 h-3 text-amber-400" />
              NIH RxNav Normalization
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[10px] text-slate-300 font-medium">
              <Sparkles className="w-3 h-3 text-purple-400" />
              Clinical CDS AI Reasoning
            </span>
          </div>
        </div>

        {/* Drug Selection Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-lg shadow-black/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>Screen Medications</span>
            </span>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400">{selectedDrugs.length} selected</span>
              {selectedDrugs.length > 0 && (
                <button
                  onClick={clearAllDrugs}
                  className="text-[11px] text-slate-500 hover:text-rose-400 transition-colors"
                >
                  Clear all
                </button>
              )}
            </div>
          </div>

          {/* Selected Drugs Chips */}
          <div className="flex flex-wrap gap-2 min-h-[3.25rem] p-3 rounded-xl bg-slate-950 border border-slate-800 items-center">
            {selectedDrugs.length === 0 ? (
              <span className="text-xs text-slate-500">No drugs added. Select from below or type custom generic / brand name.</span>
            ) : (
              selectedDrugs.map((drug) => (
                <span
                  key={drug}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 text-xs font-semibold shadow-sm"
                >
                  <span>{getNormalizedDisplay(drug)}</span>
                  <button
                    onClick={() => removeDrug(drug)}
                    className="hover:text-rose-300 hover:bg-rose-500/20 rounded p-0.5 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))
            )}
          </div>

          {/* Categorized Quick Add Suggestions */}
          <div className="space-y-2 pt-1">
            <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
              Quick Add Categorized Suggestions:
            </span>
            <div className="space-y-2">
              {DRUG_CATEGORIES.map((cat) => (
                <div key={cat.name} className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] text-slate-500 font-medium w-full sm:w-40 shrink-0">
                    {cat.name}:
                  </span>
                  <div className="flex flex-wrap gap-1.5 flex-1">
                    {cat.drugs.map((drug) => {
                      const isSelected = selectedDrugs.some(
                        (d) => d.toLowerCase() === drug.toLowerCase()
                      );
                      return (
                        <button
                          key={drug}
                          onClick={() => addDrug(drug)}
                          disabled={isSelected}
                          className="text-[10px] px-2 py-1 rounded-md bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 disabled:opacity-30 disabled:hover:bg-slate-950 transition-colors font-medium"
                        >
                          + {drug}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Custom Input & Patient Allergies */}
          <div className="space-y-2 pt-2 border-t border-slate-800/80">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Custom drug / brand name (e.g. Coumadin, Viagra)..."
                  value={customDrugInput}
                  onChange={(e) => setCustomDrugInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addDrug(customDrugInput)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
                <button
                  onClick={() => addDrug(customDrugInput)}
                  disabled={!customDrugInput.trim()}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white rounded-xl text-xs font-semibold shrink-0 transition-colors"
                >
                  Add
                </button>
              </div>

              <input
                type="text"
                placeholder="Patient allergies (e.g. Penicillin, NSAIDs, Sulfa)..."
                value={patientAllergies}
                onChange={(e) => setPatientAllergies(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Quick Allergy Presets */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] text-slate-500">Quick Allergy Presets:</span>
              {COMMON_ALLERGIES.map((al) => (
                <button
                  key={al}
                  onClick={() => addAllergyTag(al)}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-slate-950 text-slate-400 hover:text-amber-300 border border-slate-800 hover:border-amber-500/40 transition-colors"
                >
                  + {al}
                </button>
              ))}
            </div>
          </div>

          <button
            disabled={selectedDrugs.length < 1 || checking}
            onClick={handleScreenInteractions}
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer"
          >
            {checking ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Auditing Clinical Pharmacology & openFDA Live API...</span>
              </div>
            ) : (
              <>
                <ShieldAlert className="w-4 h-4" />
                <span>Evaluate Clinical Safety ({selectedDrugs.length} Drugs)</span>
              </>
            )}
          </button>
        </div>

        {/* Results Card */}
        {report && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-lg shadow-black/20">
            {/* Header & Status */}
            <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-800 gap-2">
              <div className="flex items-center gap-2.5">
                {report.has_critical_warning ? (
                  <div className="w-7 h-7 rounded-lg bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                ) : (
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-white text-sm">Clinical Safety Report</h3>
                  <div className="text-[10px] text-slate-400">
                    {report.total_interactions} interaction(s) identified • {selectedDrugs.length} medications evaluated
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={copySummaryToClipboard}
                  className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors"
                  title="Copy clinical report to clipboard"
                >
                  {copiedSummary ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedSummary ? 'Copied' : 'Copy'}</span>
                </button>

                <button
                  onClick={handlePrintReport}
                  className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors"
                  title="Print safety report"
                >
                  <Printer className="w-3 h-3" />
                  <span>Print</span>
                </button>

                <span
                  className={`text-[10px] px-3 py-1 rounded-full font-bold uppercase border ${
                    report.has_critical_warning
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 animate-pulse'
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                  }`}
                >
                  {report.has_critical_warning ? 'Critical Warning' : 'Passed Safety Check'}
                </span>
              </div>
            </div>

            {/* Clinical Summary */}
            <div className="text-xs text-slate-200 leading-relaxed bg-slate-950 p-3.5 rounded-xl border border-slate-800">
              <strong className="text-emerald-400 font-semibold block mb-1">Clinical Assessment:</strong>
              {report.clinical_summary}
            </div>

            {/* Multi-Drug Cumulative Toxicity Indicators */}
            {report.cumulative_risks && Object.keys(report.cumulative_risks).length > 0 && (
              <div className="space-y-2 pt-1">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
                  <HeartPulse className="w-4 h-4 text-amber-400" />
                  <span>Multi-Drug Cumulative Toxicity Profile</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {Object.entries(report.cumulative_risks).map(([key, cr]) => (
                    <div
                      key={key}
                      className={`p-3 rounded-xl border space-y-1.5 ${
                        cr.severity === 'High'
                          ? 'bg-rose-500/10 border-rose-500/30 text-rose-200'
                          : 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs">{cr.label}</span>
                        <span
                          className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase border ${
                            cr.severity === 'High'
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          }`}
                        >
                          {cr.severity} Risk ({cr.drug_count} Drugs)
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-normal">{cr.description}</p>
                      <div className="text-[10px] text-slate-400">
                        <strong>Contributing:</strong> {cr.contributing_drugs.join(', ')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Allergy & Cross-Reactivity Alerts */}
            {report.allergy_warnings?.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Patient Allergy & Cross-Reactivity Alerts</span>
                </span>
                {report.allergy_warnings.map((al, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-start gap-2 leading-relaxed"
                  >
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <span>{al}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Detailed Interactions List */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-white uppercase tracking-wider block">
                Pairwise Clinical Interactions ({report.interactions.length})
              </span>
              {report.interactions.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 text-center">
                  No documented direct contraindications between the evaluated medication pairs.
                </div>
              ) : (
                report.interactions.map((it) => (
                  <div
                    key={it.id}
                    className={`p-4 rounded-xl border space-y-2.5 transition-all shadow-sm ${
                      severityStyles[it.severity] || 'bg-slate-950 border-slate-800 text-slate-200'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white">
                          {it.drug_a.toUpperCase()} + {it.drug_b.toUpperCase()}
                        </span>
                        {it.source && (
                          <span className="text-[9px] px-2 py-0.5 rounded bg-slate-950/80 text-slate-300 border border-slate-700/80 font-medium">
                            {it.source}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] px-2.5 py-0.5 rounded-md font-bold uppercase border ${
                            severityBadge[it.severity] || 'bg-slate-800 text-white'
                          }`}
                        >
                          {it.severity}
                        </span>
                        <button
                          onClick={() => consultSpecificPair(it.drug_a, it.drug_b)}
                          className="text-[10px] px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-colors flex items-center gap-1 shadow-sm"
                          title="Ask AI Assistant about clinical management of this interaction"
                        >
                          <Bot className="w-3 h-3" />
                          <span>Ask AI</span>
                        </button>
                      </div>
                    </div>

                    <div className="text-xs space-y-1.5 text-slate-200 leading-relaxed">
                      <div>
                        <strong className="text-slate-300 font-semibold">Mechanism:</strong> {it.mechanism}
                      </div>
                      <div>
                        <strong className="text-slate-300 font-semibold">Clinical Manifestation:</strong> {it.clinical_effect}
                      </div>
                      <div className="text-emerald-300 bg-slate-950/70 p-2.5 rounded-lg mt-1 border border-slate-800/80">
                        <strong className="font-bold text-emerald-400">Pharmacist Guidance:</strong> {it.management}
                      </div>
                      <div className="text-[10px] text-slate-400 pt-0.5 flex items-center justify-between">
                        <span>Evidence standard: {it.evidence}</span>
                        {it.risk_category && (
                          <span className="capitalize text-slate-400">Category: {it.risk_category.replace('_', ' ')}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* openFDA Live Findings Section */}
            {report.openfda_findings?.length > 0 && (
              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <button
                  onClick={() => setShowFdaDetails(!showFdaDetails)}
                  className="w-full flex items-center justify-between text-xs font-bold text-sky-400 hover:text-sky-300 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5" />
                    <span>openFDA Official Product Label Safety Findings ({report.openfda_findings.length})</span>
                  </div>
                  {showFdaDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                {showFdaDetails && (
                  <div className="space-y-2 pt-2 border-t border-slate-800/60">
                    {report.openfda_findings.map((finding, idx) => (
                      <div key={idx} className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-white">
                            FDA Label for {finding.brand_name || finding.drug_a.toUpperCase()}
                          </span>
                          {finding.has_boxed_warning && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold uppercase">
                              Boxed Warning
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-300 italic line-clamp-3">
                          "{finding.fda_snippet}"
                        </p>
                        <div className="text-[9px] text-slate-500">
                          Source: openFDA (api.fda.gov) • Section: {finding.fda_section}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* AI Clinical Notes (if available) */}
            {report.ai_clinical_notes && (
              <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-xl text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-purple-300">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Clinical Decision Support AI Note:</span>
                </div>
                <p className="text-slate-200 leading-relaxed">{report.ai_clinical_notes}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* RIGHT: AI Clinical Pharmacist Assistant (5 Cols) */}
      <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col h-[560px] lg:h-[calc(100vh-6rem)] overflow-hidden shadow-lg shadow-black/20">
        {/* Chat Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-white text-xs leading-tight">AI Clinical Assistant</h2>
              <div className="text-[10px] flex items-center gap-1.5 mt-0.5">
                <span className={`w-1.5 h-1.5 rounded-full ${aiConfig?.is_configured ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
                <span className={aiConfig?.is_configured ? 'text-emerald-400 font-medium' : 'text-slate-400'}>
                  {aiConfig?.is_configured ? 'Gemini 2.5 Flash Connected' : 'SPMS Audited Clinical Engine'}
                </span>
              </div>
            </div>
          </div>
          <span className="text-[10px] text-slate-400 px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
            Decision Support
          </span>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs">
          {chatHistory.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-6 h-6 rounded-lg bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-3.5 h-3.5" />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-2xl p-3.5 space-y-1.5 ${
                  msg.role === 'user'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-950 border border-slate-800 text-slate-200'
                }`}
              >
                {msg.role === 'assistant' ? (
                  <FormattedAIResponse text={msg.text} />
                ) : (
                  <div className="whitespace-pre-wrap leading-relaxed">{msg.text}</div>
                )}
                {msg.model && (
                  <div className="text-[9px] text-emerald-400/80 pt-1 font-medium">
                    Engine: {msg.model}
                  </div>
                )}
                {msg.disclaimer && (
                  <div className="text-[9px] text-slate-500 pt-1.5 border-t border-slate-800/80 leading-normal">
                    {msg.disclaimer}
                  </div>
                )}
              </div>

              {msg.role === 'user' && (
                <div className="w-6 h-6 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          ))}

          {consultingAI && (
            <div className="flex gap-2.5 items-center text-slate-400 text-xs">
              <Bot className="w-4 h-4 text-emerald-400 animate-spin" />
              <span>Cross-referencing pharmacology knowledge base...</span>
            </div>
          )}
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-3 py-2 bg-slate-950/80 border-t border-slate-800/80 flex flex-wrap gap-1.5">
          {QUICK_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => executeAskAI(prompt)}
              className="text-[10px] px-2 py-1 rounded-md bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 transition-colors"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Prompt Input */}
        <form onSubmit={handleAskAI} className="p-3 bg-slate-950 border-t border-slate-800">
          <div className="relative flex items-center">
            <input
              type="text"
              placeholder="Ask clinical question (e.g. Warfarin dosing with Sildenafil)..."
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              className="w-full pl-3 pr-10 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
            <button
              type="submit"
              disabled={!aiPrompt.trim() || consultingAI}
              className="absolute right-1.5 p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white transition-colors cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
