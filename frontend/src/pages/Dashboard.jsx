import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Clock,
  Package,
  ShoppingCart,
  FileUp,
  Activity,
  CheckCircle2,
} from 'lucide-react';
import { analyticsApi, medicinesApi } from '../services/api';

export default function Dashboard({ setActiveTab, userRole }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await analyticsApi.getSummary();
      setSummary(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-300">
        Error loading dashboard metrics: {error}
      </div>
    );
  }

  const maxRevenue = summary?.sales_trend?.reduce((max, d) => Math.max(max, d.revenue), 1) || 1;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-900/90 to-emerald-950/40 p-6 rounded-2xl border border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Pharmacy Operations & Clinical Overview</h1>
          <p className="text-slate-400 text-sm mt-1">
            Real-time dispensing metrics, inventory valuation, and patient safety monitoring.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('pos')}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-lg shadow-emerald-600/20"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Open POS Terminal</span>
          </button>
          <button
            onClick={() => setActiveTab('interactions')}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition-all border border-slate-700"
          >
            <Activity className="w-4 h-4 text-emerald-400" />
            <span>Interaction Check</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Sales */}
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Today's Revenue</span>
            <div className="text-2xl font-bold text-white mt-1">${summary?.today_revenue?.toFixed(2) || '0.00'}</div>
            <div className="text-xs text-emerald-400 flex items-center gap-1 mt-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{summary?.today_transactions || 0} completed orders</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* Total Stock Valuation */}
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Inventory Value (Retail)</span>
            <div className="text-2xl font-bold text-white mt-1">
              ${summary?.inventory_retail_valuation?.toLocaleString() || '0.00'}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Cost basis: ${summary?.inventory_cost_valuation?.toLocaleString() || '0.00'}
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Package className="w-6 h-6" />
          </div>
        </div>

        {/* Low Stock Alert */}
        <div
          onClick={() => setActiveTab('inventory')}
          className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex items-center justify-between cursor-pointer hover:border-amber-500/50 transition-colors"
        >
          <div>
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Low Stock Threshold</span>
            <div className="text-2xl font-bold text-amber-400 mt-1">{summary?.low_stock_count || 0}</div>
            <div className="text-xs text-amber-300/80 mt-1">Medicines below reorder level</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        {/* Expiring Batches */}
        <div
          onClick={() => setActiveTab('inventory')}
          className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex items-center justify-between cursor-pointer hover:border-rose-500/50 transition-colors"
        >
          <div>
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Expiring Batches (90d)</span>
            <div className="text-2xl font-bold text-rose-400 mt-1">{summary?.expiring_batches_count || 0}</div>
            <div className="text-xs text-rose-300/80 mt-1">FEFO priority dispatch needed</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <Clock className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Charts & Overview Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 7-Day Revenue Trend */}
        <div className="lg:col-span-2 bg-slate-900 p-6 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-bold text-white">7-Day Revenue Trajectory</h2>
              <p className="text-xs text-slate-400">Daily sales performance and transaction frequency</p>
            </div>
            <span className="text-xs px-2.5 py-1 bg-slate-800 text-slate-300 rounded-lg border border-slate-700">
              Last 7 Days
            </span>
          </div>

          <div className="h-56 flex items-end justify-between gap-3 pt-4 px-2">
            {summary?.sales_trend?.map((item, idx) => {
              const heightPct = Math.max(12, Math.round((item.revenue / maxRevenue) * 100));
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 group">
                  <div className="text-[11px] font-semibold text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    ${item.revenue}
                  </div>
                  <div className="w-full bg-slate-800 rounded-t-lg relative flex items-end overflow-hidden h-40">
                    <div
                      style={{ height: `${heightPct}%` }}
                      className="w-full bg-gradient-to-t from-emerald-600 to-teal-400 rounded-t-lg transition-all duration-500 group-hover:from-emerald-500 group-hover:to-teal-300"
                    ></div>
                  </div>
                  <span className="text-xs font-medium text-slate-400">{item.date}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Selling Medicines */}
        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-white mb-1">Top Selling Medicines</h2>
            <p className="text-xs text-slate-400 mb-4">Highest volume dispensed medications</p>

            <div className="space-y-3">
              {summary?.top_sellers && summary.top_sellers.length > 0 ? (
                summary.top_sellers.map((med, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800"
                  >
                    <div>
                      <div className="text-sm font-semibold text-white">{med.name}</div>
                      <div className="text-xs text-slate-400">{med.quantity} units dispensed</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-emerald-400">${med.revenue}</div>
                      <span className="text-[10px] text-slate-400">#{idx + 1} Rank</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-400 text-sm">No sales records yet today.</div>
              )}
            </div>
          </div>

          <button
            onClick={() => setActiveTab('pos')}
            className="w-full mt-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors border border-slate-700 flex items-center justify-center gap-2"
          >
            <span>Proceed to Checkout</span>
            <ShoppingCart className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
