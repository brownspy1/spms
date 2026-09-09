import React, { useState } from 'react';
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
} from 'lucide-react';
import { interactionsApi, settingsApi } from '../services/api';
import FormattedAIResponse from '../components/FormattedAIResponse';

const COMMON_DRUGS = [
  'Warfarin',
  'Aspirin',
  'Ibuprofen',
  'Sildenafil',
  'Nitroglycerin',
  'Metformin',
  'Lisinopril',
  'Spironolactone',
  'Clarithromycin',
  'Simvastatin',
  'Ciprofloxacin',
  'Theophylline',
  'Paracetamol',
  'Omeprazole',
  'Clopidogrel',
  'Amoxicillin',
  'Methotrexate',
];

export default function InteractionsChecker() {
  const [selectedDrugs, setSelectedDrugs] = useState(['Warfarin', 'Aspirin']);
  const [customDrugInput, setCustomDrugInput] = useState('');
  const [patientAllergies, setPatientAllergies] = useState('');
  const [report, setReport] = useState(null);
  const [checking, setChecking] = useState(false);

  // AI Assistant Chat state
  const [aiPrompt, setAiPrompt] = useState('');
  const [chatHistory, setChatHistory] = useState([
    {
      role: 'assistant',
      text: 'Hello! I am your SPMS Clinical Pharmacist Assistant. You can ask me regarding dosing regimens, contraindications, mechanism of action, or adverse reaction management. All interactions are cross-referenced with our audited clinical safety database.',
    },
  ]);
  const [consultingAI, setConsultingAI] = useState(false);
  const [aiConfig, setAiConfig] = useState(null);

  React.useEffect(() => {
    settingsApi.getAI()
      .then((data) => setAiConfig(data))
      .catch((err) => console.log('Could not load AI config:', err));
  }, []);

  const addDrug = (drug) => {
    const trimmed = drug.trim();
    if (trimmed && !selectedDrugs.includes(trimmed)) {
      setSelectedDrugs([...selectedDrugs, trimmed]);
      setCustomDrugInput('');
    }
  };

  const removeDrug = (drug) => {
    setSelectedDrugs(selectedDrugs.filter((d) => d !== drug));
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

  const handleAskAI = async (e) => {
    e.preventDefault();
    if (!aiPrompt.trim() || consultingAI) return;

    const userMessage = aiPrompt.trim();
    setChatHistory((prev) => [...prev, { role: 'user', text: userMessage }]);
    setAiPrompt('');
    setConsultingAI(true);

    try {
      const data = await interactionsApi.consultAI(userMessage, selectedDrugs);
      setChatHistory((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: data.response,
          disclaimer: data.safety_disclaimer,
        },
      ]);
    } catch (err) {
      setChatHistory((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: `Error processing inquiry: ${err.message}`,
        },
      ]);
    } finally {
      setConsultingAI(false);
    }
  };

  const severityStyles = {
    Contraindicated: 'bg-rose-500/20 text-rose-300 border-rose-500/50',
    Major: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    Moderate: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    Minor: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* LEFT: Structured Interaction Screener (7 Cols) */}
      <div className="lg:col-span-7 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Clinical Drug-Drug Interaction Screener</h1>
          <p className="text-slate-400 text-sm mt-1">
            Backed by a structured, auditable clinical pharmacology dataset to eliminate unverified LLM hallucinations.
          </p>
        </div>

        {/* Drug Selection Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-lg shadow-black/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>Screen Medications</span>
            </span>
            <span className="text-xs text-slate-400">{selectedDrugs.length} selected</span>
          </div>

          {/* Selected Drugs Chips */}
          <div className="flex flex-wrap gap-2 min-h-[3rem] p-3 rounded-xl bg-slate-950 border border-slate-800 items-center">
            {selectedDrugs.length === 0 ? (
              <span className="text-xs text-slate-500">No drugs added. Select from below or type custom name.</span>
            ) : (
              selectedDrugs.map((drug) => (
                <span
                  key={drug}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 text-xs font-semibold"
                >
                  <span>{drug}</span>
                  <button onClick={() => removeDrug(drug)} className="hover:text-white">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))
            )}
          </div>

          {/* Quick Common Drugs Suggestions */}
          <div className="space-y-1.5">
            <span className="text-[11px] text-slate-400 font-medium">Quick Add Suggestions:</span>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_DRUGS.map((drug) => (
                <button
                  key={drug}
                  onClick={() => addDrug(drug)}
                  disabled={selectedDrugs.includes(drug)}
                  className="text-[11px] px-2.5 py-1 rounded-md bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 disabled:opacity-40 transition-colors"
                >
                  + {drug}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Input & Patient Allergies */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Custom drug name..."
                value={customDrugInput}
                onChange={(e) => setCustomDrugInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addDrug(customDrugInput)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
              <button
                onClick={() => addDrug(customDrugInput)}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold shrink-0"
              >
                Add
              </button>
            </div>

            <input
              type="text"
              placeholder="Patient allergies (e.g. Penicillin, NSAIDs)..."
              value={patientAllergies}
              onChange={(e) => setPatientAllergies(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <button
            disabled={selectedDrugs.length < 1 || checking}
            onClick={handleScreenInteractions}
            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2"
          >
            {checking ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
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
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                {report.has_critical_warning ? (
                  <ShieldAlert className="w-5 h-5 text-rose-400" />
                ) : (
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                )}
                <h3 className="font-bold text-white text-sm">Clinical Safety Report</h3>
              </div>
              <span
                className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase border ${
                  report.has_critical_warning
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                }`}
              >
                {report.has_critical_warning ? 'Critical Warning' : 'Passed Safety Check'}
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-950 p-3 rounded-xl border border-slate-800">
              {report.clinical_summary}
            </p>

            {/* Allergy Alerts */}
            {report.allergy_warnings?.length > 0 && (
              <div className="space-y-1.5">
                {report.allergy_warnings.map((al, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300 flex items-center gap-2"
                  >
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>{al}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Detailed Interactions */}
            <div className="space-y-3">
              {report.interactions.map((it) => (
                <div
                  key={it.id}
                  className={`p-4 rounded-xl border space-y-2 ${severityStyles[it.severity] || 'bg-slate-950 border-slate-800'}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-white">
                      {it.drug_a.toUpperCase()} + {it.drug_b.toUpperCase()}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md font-bold uppercase border">
                      {it.severity}
                    </span>
                  </div>

                  <div className="text-xs space-y-1">
                    <div>
                      <strong className="text-slate-300">Mechanism:</strong> {it.mechanism}
                    </div>
                    <div>
                      <strong className="text-slate-300">Clinical Manifestation:</strong> {it.clinical_effect}
                    </div>
                    <div className="text-emerald-300 bg-slate-950/60 p-2 rounded-lg mt-1 border border-slate-800">
                      <strong>Pharmacist Guidance:</strong> {it.management}
                    </div>
                    <div className="text-[10px] text-slate-400 pt-1">Evidence standard: {it.evidence}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* RIGHT: AI Clinical Pharmacist Assistant (5 Cols) */}
      <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col h-[calc(100vh-6rem)] overflow-hidden shadow-lg shadow-black/20">
        {/* Chat Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-white text-xs leading-tight">AI Clinical Assistant</h2>
              <div className="text-[10px] flex items-center gap-1.5 mt-0.5">
                <span className={`w-1.5 h-1.5 rounded-full ${aiConfig?.is_configured ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
                <span className={aiConfig?.is_configured ? 'text-emerald-400 font-medium' : 'text-slate-400'}>
                  {aiConfig?.is_configured ? 'Gemini 2.5 Flash Connected (Free Tier)' : 'SPMS Pharmacology Engine'}
                </span>
              </div>
            </div>
          </div>
          <span className="text-[10px] text-slate-400 px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
            Clinical Decision Support
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
              <span>Analyzing pharmacology knowledge base...</span>
            </div>
          )}
        </div>

        {/* Prompt Input */}
        <form onSubmit={handleAskAI} className="p-3 bg-slate-950 border-t border-slate-800">
          <div className="relative flex items-center">
            <input
              type="text"
              placeholder="Ask clinical question (e.g., Warfarin dosage with Metformin)..."
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              className="w-full pl-3 pr-10 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
            <button
              type="submit"
              disabled={!aiPrompt.trim() || consultingAI}
              className="absolute right-1.5 p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
