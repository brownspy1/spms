import React, { useState } from 'react';
import { Pill, Lock, User, KeyRound, ShieldAlert, ArrowRight } from 'lucide-react';
import { authApi, setAuthToken, setStoredUser } from '../services/api';

export default function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('AdminPass123!');
  const [totpCode, setTotpCode] = useState('');
  const [show2FAField, setShow2FAField] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      const data = await authApi.login(username, password, totpCode || undefined);
      setAuthToken(data.access_token);
      setStoredUser(data.user);
      onLoginSuccess(data.user);
    } catch (err) {
      if (err.message === '2FA_REQUIRED' || err.data?.detail === '2FA_REQUIRED') {
        setShow2FAField(true);
        setErrorMsg('Two-Factor Authentication is enabled on this account. Please enter your 6-digit TOTP code.');
      } else {
        setErrorMsg(err.message || 'Login failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (u, p) => {
    setUsername(u);
    setPassword(p);
    setShow2FAField(false);
    setTotpCode('');
    setErrorMsg(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Subtle Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-6 shadow-2xl relative z-10">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-white mx-auto">
            <Pill className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">SPMS Portal</h1>
          <p className="text-xs text-slate-400">
            Smart Pharmacy Management System • Clinical Decision Support
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">{errorMsg}</div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="text-slate-300 font-medium block mb-1">Username or Email</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                required
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin or pharmacist or staff"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="text-slate-300 font-medium block mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                required
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {show2FAField && (
            <div className="pt-1">
              <label className="text-emerald-400 font-semibold block mb-1">2FA TOTP Code (6 Digits)</label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-emerald-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  maxLength={6}
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value)}
                  placeholder="123456"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-emerald-500/50 rounded-xl text-white font-mono tracking-wider focus:outline-none focus:border-emerald-400"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <span>Sign In to SPMS</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Demo Roles Quick Click */}
        <div className="pt-4 border-t border-slate-800 space-y-2">
          <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block text-center">
            Instant Demo Account Switcher
          </span>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <button
              onClick={() => handleQuickFill('admin', 'AdminPass123!')}
              className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-center transition-colors group"
            >
              <div className="font-bold text-rose-400 group-hover:text-rose-300">Admin</div>
              <div className="text-[10px] text-slate-500">Chief Officer</div>
            </button>
            <button
              onClick={() => handleQuickFill('pharmacist', 'PharmaPass123!')}
              className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-center transition-colors group"
            >
              <div className="font-bold text-emerald-400 group-hover:text-emerald-300">Pharmacist</div>
              <div className="text-[10px] text-slate-500">Clinical Rx</div>
            </button>
            <button
              onClick={() => handleQuickFill('staff', 'StaffPass123!')}
              className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-center transition-colors group"
            >
              <div className="font-bold text-blue-400 group-hover:text-blue-300">Staff</div>
              <div className="text-[10px] text-slate-500">Dispensary</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
