import React from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  ClipboardList,
  Boxes,
  FileText,
  Activity,
  Truck,
  Users,
  ShieldAlert,
  Lock,
  UserPlus,
  X,
  Pill,
} from 'lucide-react';

export default function Sidebar({
  activeTab,
  setActiveTab,
  userRole,
  isOpenMobile = false,
  onCloseMobile,
}) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['Admin', 'Pharmacist', 'Staff'] },
    { id: 'pos', label: 'Point of Sale (POS)', icon: ShoppingCart, roles: ['Admin', 'Pharmacist', 'Staff'] },
    { id: 'orders', label: 'Orders & Sales History', icon: ClipboardList, roles: ['Admin', 'Pharmacist', 'Staff'] },
    { id: 'inventory', label: 'Inventory & Batches', icon: Boxes, roles: ['Admin', 'Pharmacist', 'Staff'] },
    { id: 'prescriptions', label: 'Prescriptions & OCR', icon: FileText, roles: ['Admin', 'Pharmacist'] },
    { id: 'interactions', label: 'Drug Interaction & AI', icon: Activity, roles: ['Admin', 'Pharmacist', 'Staff'] },
    { id: 'procurement', label: 'Purchase Orders', icon: Truck, roles: ['Admin', 'Pharmacist'] },
    { id: 'customers', label: 'Patients & Customers', icon: Users, roles: ['Admin', 'Pharmacist', 'Staff'] },
    { id: 'staff', label: 'Staff & Users', icon: UserPlus, roles: ['Admin'] },
    { id: 'audit', label: 'Audit Trail (Immutable)', icon: ShieldAlert, roles: ['Admin'] },
    { id: 'security', label: 'Security & 2FA', icon: Lock, roles: ['Admin', 'Pharmacist', 'Staff'] },
  ];

  const allowedItems = navItems.filter((item) => item.roles.includes(userRole));

  const handleItemClick = (id) => {
    setActiveTab(id);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const NavContent = () => (
    <>
      <nav className="space-y-1">
        <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Operations
        </div>
        {allowedItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleItemClick(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all text-left ${
                isActive
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Compliance / Security Footer info */}
      <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 text-xs text-slate-400 space-y-1.5 mt-6">
        <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          <span>Security Guard Active</span>
        </div>
        <p className="text-[11px] leading-relaxed text-slate-400">
          Append-only audit enabled. 90-day prescription retention policy active.
        </p>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Sidebar (hidden on mobile, visible on md and up) */}
      <aside className="hidden md:flex w-64 bg-slate-900 border-r border-slate-800 flex-col justify-between p-4 shrink-0 min-h-[calc(100vh-4rem)]">
        <NavContent />
      </aside>

      {/* Mobile Off-Canvas Drawer (visible on mobile when toggled) */}
      <div
        className={`fixed inset-0 z-50 md:hidden transition-all duration-300 ${
          isOpenMobile ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Dark Backdrop */}
        <div
          className="absolute inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
          onClick={onCloseMobile}
        />

        {/* Slide-over Drawer Panel */}
        <aside
          className={`relative w-72 max-w-[85vw] h-full bg-slate-900 border-r border-slate-800 flex flex-col justify-between p-4 shadow-2xl transition-transform duration-300 ease-out ${
            isOpenMobile ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div>
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-4 mb-2 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-md shadow-emerald-600/20">
                  <Pill className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-sm text-white leading-none block">SPMS Navigation</span>
                  <span className="text-[10px] text-emerald-400">Clinical Pharmacy</span>
                </div>
              </div>
              <button
                onClick={onCloseMobile}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                aria-label="Close Menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="space-y-1 overflow-y-auto max-h-[calc(100vh-14rem)] pr-1">
              <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Operations
              </div>
              {allowedItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleItemClick(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all text-left ${
                      isActive
                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 font-semibold'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 text-xs text-slate-400 space-y-1 mt-4">
            <div className="flex items-center gap-1.5 text-emerald-400 font-medium text-[11px]">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span>Security Guard Active</span>
            </div>
            <p className="text-[10px] text-slate-400 leading-tight">
              Append-only audit enabled. 90-day retention policy active.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
