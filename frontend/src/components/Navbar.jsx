import React from 'react';
import { Pill, ShieldCheck, UserCheck, LogOut, Bell, User } from 'lucide-react';
import { removeAuthToken } from '../services/api';

export default function Navbar({ currentUser, onUserChange, lowStockCount = 0, expiringCount = 0 }) {
  const handleRoleSwitch = async (roleName) => {
    // Quick demo switcher for instant pair evaluation
    const creds = {
      admin: { u: 'admin', p: 'AdminPass123!' },
      pharmacist: { u: 'pharmacist', p: 'PharmaPass123!' },
      staff: { u: 'staff', p: 'StaffPass123!' },
    }[roleName.toLowerCase()];

    if (creds) {
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: creds.u, password: creds.p }),
        });
        if (res.ok) {
          const data = await res.json();
          localStorage.setItem('spms_token', data.access_token);
          localStorage.setItem('spms_user', JSON.stringify(data.user));
          onUserChange(data.user);
        }
      } catch (err) {
        console.error('Failed to switch user:', err);
      }
    }
  };

  const handleLogout = () => {
    removeAuthToken();
    onUserChange(null);
  };

  const roleColors = {
    Admin: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    Pharmacist: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    Staff: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  };

  return (
    <header className="h-16 bg-slate-900/90 border-b border-slate-800 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-40">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-white font-bold">
          <Pill className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg tracking-tight text-white">SPMS</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
              v1.0 Clinical
            </span>
          </div>
          <p className="text-[11px] text-slate-400">Smart Pharmacy Management System</p>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-4">
        {/* Quick Role Switcher for seamless testing */}
        <div className="hidden lg:flex items-center gap-1 bg-slate-950/80 p-1 rounded-lg border border-slate-800 text-xs">
          <span className="text-slate-400 px-2 font-medium">Demo Switch:</span>
          {['Admin', 'Pharmacist', 'Staff'].map((r) => (
            <button
              key={r}
              onClick={() => handleRoleSwitch(r)}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                currentUser?.role === r
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        {/* Alerts Pill */}
        {(lowStockCount > 0 || expiringCount > 0) && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-medium">
            <Bell className="w-4 h-4 animate-pulse text-amber-400" />
            <span>
              {lowStockCount + expiringCount} Alert{lowStockCount + expiringCount > 1 ? 's' : ''}
            </span>
          </div>
        )}

        {/* User Badge */}
        {currentUser && (
          <div className="flex items-center gap-3 pl-2 border-l border-slate-800">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-semibold text-white leading-tight">{currentUser.full_name || currentUser.username}</div>
              <span className={`text-[10px] px-2 py-0.5 rounded-md border font-semibold uppercase tracking-wider ${roleColors[currentUser.role] || 'bg-slate-800 text-slate-300'}`}>
                {currentUser.role}
              </span>
            </div>
            <button
              onClick={handleLogout}
              title="Logout"
              className="p-2 rounded-lg bg-slate-800 hover:bg-rose-500/20 hover:text-rose-300 text-slate-400 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
