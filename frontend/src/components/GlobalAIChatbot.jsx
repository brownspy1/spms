import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Bot,
  User,
  Send,
  X,
  Trash2,
  HelpCircle,
} from 'lucide-react';
import { interactionsApi, settingsApi } from '../services/api';
import FormattedAIResponse from './FormattedAIResponse';

const QUICK_SUGGESTIONS = [
  'Warfarin + Aspirin risk & bleeding management',
  'Metformin contraindications & eGFR cutoff',
  'Amoxicillin suspension pediatric dosage guidelines',
  'Omeprazole & Clopidogrel CYP2C19 interaction',
];

export default function GlobalAIChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [inputPrompt, setInputPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiConfig, setAiConfig] = useState(null);
  const [chatMessages, setChatMessages] = useState([
    {
      role: 'assistant',
      text: 'Hello! I am your SPMS Clinical AI Pharmacist powered by Google Gemini. Ask me any pharmacology inquiry, contraindication, dosing adjustment, or drug interaction question.',
    },
  ]);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    settingsApi.getAI()
      .then((data) => setAiConfig(data))
      .catch((err) => console.log('Could not load AI config:', err));
  }, []);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isOpen]);

  const handleSendMessage = async (textToSend) => {
    const query = (textToSend || inputPrompt).trim();
    if (!query || loading) return;

    setChatMessages((prev) => [...prev, { role: 'user', text: query }]);
    setInputPrompt('');
    setLoading(true);

    try {
      const data = await interactionsApi.consultAI(query);
      setChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: data.response,
          disclaimer: data.safety_disclaimer,
          model: data.model || 'Google Gemini 2.5 Flash',
        },
      ]);
    } catch (err) {
      setChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: `**Clinical AI Notice:** Could not connect to external service (${err.message || 'Error'}). SPMS local pharmacology safety engine is active.`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = () => {
    setChatMessages([
      {
        role: 'assistant',
        text: 'Chat history cleared. How can I assist you with clinical pharmacology or patient medication counseling today?',
      },
    ]);
  };

  return (
    <>
      {/* Floating Toggle Button (visible when closed) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 group flex items-center gap-2.5 px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-full bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 text-white shadow-xl shadow-emerald-950/50 hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200 border border-emerald-400/30"
          title="Open Clinical AI Pharmacist Assistant"
        >
          <div className="relative">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white animate-pulse" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-300 rounded-full ring-2 ring-slate-900 animate-ping" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full ring-2 ring-slate-900" />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-xs font-bold leading-none tracking-wide">Clinical AI</span>
            <span className="text-[10px] text-emerald-100/90 leading-tight">Gemini 2.5 Active</span>
          </div>
        </button>
      )}

      {/* Floating Chat Drawer Window (visible when open) */}
      {isOpen && (
        <div className="fixed inset-x-2 bottom-2 sm:inset-x-auto sm:bottom-6 sm:right-6 z-50 w-auto sm:w-[420px] h-[calc(100dvh-1rem)] sm:h-[580px] max-h-[92vh] sm:max-h-[85vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl shadow-black/80 flex flex-col overflow-hidden backdrop-blur-md animate-in fade-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="p-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-sm shadow-emerald-500/20">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-white text-xs leading-none">Clinical AI Assistant</h3>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30">
                    Gemini 2.5
                  </span>
                </div>
                <div className="text-[10px] flex items-center gap-1.5 mt-1 text-slate-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Free Tier Ready • Audited Knowledge</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleClearChat}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Clear Chat"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Minimize Chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick suggestions if chat is short */}
          {chatMessages.length <= 2 && (
            <div className="px-3 pt-2.5 pb-1 bg-slate-950/60 border-b border-slate-800/60">
              <div className="text-[10px] uppercase font-semibold tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
                <HelpCircle className="w-3 h-3 text-emerald-400" />
                <span>Quick Inquiries:</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_SUGGESTIONS.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(q)}
                    disabled={loading}
                    className="text-[10px] text-left px-2 py-1 rounded-lg bg-slate-800/80 hover:bg-emerald-600/30 text-slate-300 hover:text-emerald-200 border border-slate-700/60 hover:border-emerald-500/40 transition-all line-clamp-1"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs bg-slate-900/90">
            {chatMessages.map((msg, idx) => (
              <div
                key={idx}
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

            {loading && (
              <div className="flex gap-2.5 items-center text-slate-400 text-xs py-1">
                <Bot className="w-4 h-4 text-emerald-400 animate-spin" />
                <span className="text-[11px] text-emerald-400/90">
                  Gemini 2.5 Flash analyzing pharmacology data...
                </span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 bg-slate-950 border-t border-slate-800"
          >
            <div className="relative flex items-center">
              <input
                type="text"
                placeholder="Ask clinical pharmacology question..."
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                disabled={loading}
                className="w-full pl-3 pr-10 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
              <button
                type="submit"
                disabled={!inputPrompt.trim() || loading}
                className="absolute right-1.5 p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white transition-colors"
                title="Send inquiry"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[9px] text-slate-500 px-1">
              <span>Google Gemini Free Tier Integrated</span>
              <span>Clinical Decision Support</span>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
