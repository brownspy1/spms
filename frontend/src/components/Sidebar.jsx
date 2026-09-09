import React from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  Boxes,
  FileText,
  Activity,
  Truck,
  Users,
  ShieldAlert,
  Lock,
} from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, userRole }) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['Admin', 'Pharmacist', 'Staff'] },
    { id: 'pos', label: 'Point of Sale (POS)', icon: ShoppingCart, roles: ['Admin', 'Pharmacist', 'Staff'] },
    { id: 'inventory', label: 'Inventory & Batches', icon: Boxes, roles: ['Admin', 'Pharmacist', 'Staff'] },
    { id: 'prescriptions', label: 'Prescriptions & OCR', icon: FileText, roles: ['Admin', 'Pharmacist'] },
    { id: 'interactions', label: 'Drug Interaction & AI', icon: Activity, roles: ['Admin', 'Pharmacist', 'Staff'] },
    { id: 'procurement', label: 'Purchase Orders', icon: Truck, roles: ['Admin', 'Pharmacist'] },
    { id: 'customers', label: 'Patients & Customers', icon: Users, roles: ['Admin', 'Pharmacist', 'Staff'] },
    { id: 'audit', label: 'Audit Trail (Immutable)', icon: ShieldAlert, roles: ['Admin'] },
    { id: 'security', label: 'Security & 2FA', icon: Lock, roles: ['Admin', 'Pharmacist', 'Staff'] },
  ];

  const allowedItems = navItems.filter((item) => item.roles.includes(userRole));

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between p-4 shrink-0 min-h-[calc(100vh-4rem)]">
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
              onClick={() => setActiveTab(item.id)}
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
      <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 text-xs text-slate-400 space-y-1.5">
        <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          <span>Security Guard Active</span>
        </div>
        <p className="text-[11px] leading-relaxed text-slate-400">
          Append-only audit enabled. 90-day prescription retention policy active.
        </p>
      </div>
    </aside>
  );
}
