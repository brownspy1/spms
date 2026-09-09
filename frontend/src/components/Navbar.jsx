import React, { useState, useRef, useEffect } from 'react';
import {
  Pill,
  LogOut,
  Bell,
  AlertTriangle,
  Clock,
  Package,
  ArrowRight,
  RefreshCw,
  X,
  CheckCircle2,
  Menu,
} from 'lucide-react';
import { removeAuthToken } from '../services/api';

export default function Navbar({
  currentUser,
  onUserChange,
  alertsData = { lowStock: [], expiring: [] },
  onNavigateTab,
  onRefreshAlerts,
  onToggleMobileMenu,
}) {
  const [isOpenAlerts, setIsOpenAlerts] = useState(false);
  const [activeAlertTab, setActiveAlertTab] = useState('all'); // 'all', 'low_stock', 'expiring'
  const dropdownRef = useRef(null);

  const lowStock = alertsData?.lowStock || [];
  const expiring = alertsData?.expiring || [];
  const totalAlerts = lowStock.length + expiring.length;

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpenAlerts(false);
      }
    }
    if (isOpenAlerts) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpenAlerts]);

  const handleRoleSwitch = async (roleName) => {
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

  const handleAlertItemClick = () => {
    setIsOpenAlerts(false);
    if (onNavigateTab) {
      onNavigateTab('inventory');
    }
  };

  const roleColors = {
    Admin: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    Pharmacist: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    Staff: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  };

  return (
    <header className="h-16 bg-slate-900/90 border-b border-slate-800 backdrop-blur-md px-3 sm:px-6 flex items-center justify-between sticky top-0 z-40">
      {/* Brand & Mobile Hamburger */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Mobile Hamburger Toggle Button */}
        <button
          onClick={onToggleMobileMenu}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 md:hidden transition-colors shrink-0"
          aria-label="Toggle Navigation Menu"
          title="Open Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-white font-bold shrink-0">
          <Pill className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
        <div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="font-bold text-base sm:text-lg tracking-tight text-white">SPMS</span>
            <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium whitespace-nowrap">
              v1.0 Clinical
            </span>
          </div>
          <p className="hidden sm:block text-[11px] text-slate-400">Smart Pharmacy Management System</p>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Quick Role Switcher for instant evaluation */}
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

        {/* Interactive Alerts Popover Button */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsOpenAlerts(!isOpenAlerts)}
            className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
              totalAlerts > 0
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 hover:bg-amber-500/25 shadow-sm shadow-amber-500/10'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
            title="Click to inspect real-time alerts"
          >
            <Bell className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${totalAlerts > 0 ? 'animate-pulse text-amber-400' : 'text-slate-400'}`} />
            <span>
              {totalAlerts} Alert{totalAlerts !== 1 ? 's' : ''}
            </span>
          </button>

          {/* Floating Dropdown Modal */}
          {isOpenAlerts && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 max-w-[calc(100vw-1.5rem)] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl shadow-black/60 z-50 overflow-hidden flex flex-col max-h-[85vh]">
              {/* Header */}
              <div className="p-4 bg-slate-950/70 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-xs">Inventory & Safety Alerts</h3>
                    <p className="text-[10px] text-slate-400">
                      {totalAlerts} active item{totalAlerts !== 1 ? 's' : ''} requiring pharmacist attention
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {onRefreshAlerts && (
                    <button
                      onClick={onRefreshAlerts}
                      title="Refresh alerts"
                      className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => setIsOpenAlerts(false)}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-slate-800 bg-slate-950/40 p-1 gap-1 text-[11px]">
                <button
                  onClick={() => setActiveAlertTab('all')}
                  className={`flex-1 py-1.5 rounded-lg font-medium transition-all ${
                    activeAlertTab === 'all'
                      ? 'bg-slate-800 text-white font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  All ({totalAlerts})
                </button>
                <button
                  onClick={() => setActiveAlertTab('low_stock')}
                  className={`flex-1 py-1.5 rounded-lg font-medium transition-all ${
                    activeAlertTab === 'low_stock'
                      ? 'bg-rose-500/20 text-rose-300 font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Low Stock ({lowStock.length})
                </button>
                <button
                  onClick={() => setActiveAlertTab('expiring')}
                  className={`flex-1 py-1.5 rounded-lg font-medium transition-all ${
                    activeAlertTab === 'expiring'
                      ? 'bg-amber-500/20 text-amber-300 font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Expiring ({expiring.length})
                </button>
              </div>

              {/* Scrollable Alerts List */}
              <div className="overflow-y-auto p-3 space-y-2 flex-1 max-h-96 text-xs divide-y divide-slate-800/50">
                {totalAlerts === 0 ? (
                  <div className="py-8 text-center space-y-2">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                    <p className="font-semibold text-white">All Stock Levels Healthy</p>
                    <p className="text-[11px] text-slate-400">No low stock items or expiring batches found.</p>
                  </div>
                ) : (
                  <>
                    {/* Low Stock Items */}
                    {(activeAlertTab === 'all' || activeAlertTab === 'low_stock') &&
                      lowStock.map((item) => (
                        <div
                          key={`low-${item.id}`}
                          onClick={handleAlertItemClick}
                          className="pt-2 pb-1 hover:bg-slate-850/60 p-2 rounded-xl transition-all cursor-pointer group"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-white group-hover:text-emerald-400 transition-colors">
                              {item.brand_name}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                                item.current_stock === 0
                                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              }`}
                            >
                              {item.current_stock === 0 ? 'OUT OF STOCK' : `QTY: ${item.current_stock}`}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {item.generic_name} • Min Reorder Level: {item.reorder_level}
                          </div>
                          <div className="flex items-center justify-between mt-1 text-[10px] text-slate-500">
                            <span>Category: {item.category}</span>
                            <span className="text-emerald-400 flex items-center gap-1 group-hover:underline">
                              Restock now <ArrowRight className="w-2.5 h-2.5" />
                            </span>
                          </div>
                        </div>
                      ))}

                    {/* Expiring Batches */}
                    {(activeAlertTab === 'all' || activeAlertTab === 'expiring') &&
                      expiring.map((b) => (
                        <div
                          key={`exp-${b.batch_id}`}
                          onClick={handleAlertItemClick}
                          className="pt-2 pb-1 hover:bg-slate-850/60 p-2 rounded-xl transition-all cursor-pointer group"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-white group-hover:text-amber-400 transition-colors">
                              {b.brand_name}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                                b.days_remaining <= 0
                                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                  : b.days_remaining <= 30
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                  : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                              }`}
                            >
                              {b.days_remaining <= 0 ? 'EXPIRED' : `${b.days_remaining}d remaining`}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            Batch: <span className="font-mono text-slate-300">{b.batch_number}</span> • Expiry: {b.expiry_date}
                          </div>
                          <div className="flex items-center justify-between mt-1 text-[10px] text-slate-500">
                            <span>Available: {b.current_quantity} units</span>
                            <span className="text-amber-400 flex items-center gap-1 group-hover:underline">
                              View batch <ArrowRight className="w-2.5 h-2.5" />
                            </span>
                          </div>
                        </div>
                      ))}
                  </>
                )}
              </div>

              {/* Footer */}
              <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
                <span className="text-[10px] text-slate-400">FEFO priority applied on all batches</span>
                <button
                  onClick={handleAlertItemClick}
                  className="flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:text-emerald-300"
                >
                  <span>Open Full Inventory</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
        </div>

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

