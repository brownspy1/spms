import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Download,
  Search,
  Filter,
  Eye,
  X,
  Lock,
  FileCheck,
} from 'lucide-react';
import { auditApi } from '../services/api';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);

  useEffect(() => {
    loadLogs();
  }, [actionFilter, userFilter]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const params = {};
      if (actionFilter) params.action = actionFilter;
      if (userFilter) params.username = userFilter;
      const data = await auditApi.list(params);
      setLogs(data);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCsv = () => {
    const token = localStorage.getItem('spms_token');
    window.open(`${auditApi.exportCsvUrl()}?token=${token}`, '_blank');
  };

  const actionColors = {
    STOCK_ADJUSTMENT: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    MEDICINE_DELETED: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    POS_SALE_WITH_INTERACTION_OVERRIDE: 'bg-rose-500/20 text-rose-200 border-rose-500/40',
    ACCOUNT_LOCKED: 'bg-rose-600/20 text-rose-200 border-rose-600/50',
    PO_APPROVED: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
    PO_RECEIVED: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    USER_CREATED: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    LOGIN_FAILED: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
    LOGIN_SUCCESS: 'bg-slate-800 text-slate-300 border-slate-700',
  };

  return (
    <div className="space-y-6">
      {/* Header & Immutability Guarantee */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Append-Only Audit Trail</h1>
            <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
              <Lock className="w-3 h-3" />
              <span>IMMUTABLE</span>
            </span>
          </div>
          <p className="text-slate-400 text-sm mt-1">
            Tamper-proof compliance log capturing security events, stock adjustments, role changes, and clinical overrides.
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-xl text-xs font-semibold transition-all border border-slate-700 shadow-md"
        >
          <Download className="w-4 h-4 text-emerald-400" />
          <span>Export Regulatory CSV</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filter by actor username..."
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="p-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
        >
          <option value="">All Security & Clinical Actions</option>
          <option value="STOCK_ADJUSTMENT">Stock Adjustment</option>
          <option value="POS_SALE_WITH_INTERACTION_OVERRIDE">Clinical Interaction Override</option>
          <option value="MEDICINE_DELETED">Medicine Deleted</option>
          <option value="PO_APPROVED">Purchase Order Approved</option>
          <option value="PO_RECEIVED">Purchase Order Received</option>
          <option value="USER_CREATED">User Created</option>
          <option value="ACCOUNT_LOCKED">Account Locked</option>
          <option value="LOGIN_FAILED">Login Failed</option>
        </select>
      </div>

      {/* Audit Log Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg shadow-black/20">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/70 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-4">Timestamp (UTC)</th>
                <th className="p-4">Actor</th>
                <th className="p-4">Action</th>
                <th className="p-4">Target Entity</th>
                <th className="p-4">Client IP</th>
                <th className="p-4">Audit Details</th>
                <th className="p-4 text-right">State Diff</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500 font-sans">
                    No matching audit records found.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-850/40 transition-colors">
                    <td className="p-4 text-slate-400 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="p-4">
                      <span className="font-semibold text-white">{log.username}</span>
                      <span className="text-[10px] text-slate-500 block">({log.user_role})</span>
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                          actionColors[log.action] || 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="p-4 text-slate-300">
                      {log.entity_type} {log.entity_id ? `#${log.entity_id}` : ''}
                    </td>
                    <td className="p-4 text-slate-400">{log.ip_address || '127.0.0.1'}</td>
                    <td className="p-4 font-sans text-slate-300 max-w-xs truncate">{log.details || '—'}</td>
                    <td className="p-4 text-right font-sans">
                      {(log.before_values || log.after_values) && (
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 text-[11px] font-medium"
                        >
                          View Diff
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: JSON State Diff Inspector */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-emerald-400" />
                <h2 className="text-base font-bold text-white">
                  Audit Snapshot #{selectedLog.id} ({selectedLog.action})
                </h2>
              </div>
              <button onClick={() => setSelectedLog(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {selectedLog.before_values && (
                <div>
                  <span className="font-bold text-rose-400 block mb-1 uppercase tracking-wider text-[10px]">
                    Before State (Pre-Mutation):
                  </span>
                  <pre className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-rose-300 font-mono text-[11px] overflow-x-auto">
                    {JSON.stringify(JSON.parse(selectedLog.before_values), null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.after_values && (
                <div>
                  <span className="font-bold text-emerald-400 block mb-1 uppercase tracking-wider text-[10px]">
                    After State (Committed Mutation):
                  </span>
                  <pre className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-emerald-300 font-mono text-[11px] overflow-x-auto">
                    {JSON.stringify(JSON.parse(selectedLog.after_values), null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
              >
                Close Snapshot
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
