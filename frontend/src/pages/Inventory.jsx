import React, { useState, useEffect } from 'react';
import {
  Boxes,
  Plus,
  Search,
  AlertTriangle,
  Clock,
  Trash2,
  Edit,
  Sliders,
  X,
  ChevronDown,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { medicinesApi } from '../services/api';

export default function Inventory({ userRole }) {
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all'); // all, low_stock, expiring
  const [expandedMedId, setExpandedMedId] = useState(null);

  // Modals
  const [showAddMedModal, setShowAddMedModal] = useState(false);
  const [showAddBatchModal, setShowAddBatchModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [targetMedicine, setTargetMedicine] = useState(null);
  const [targetBatch, setTargetBatch] = useState(null);

  // Forms
  const [newMedForm, setNewMedForm] = useState({
    brand_name: '',
    generic_name: '',
    category: 'Cardiovascular',
    dosage_form: 'Tablet',
    strength: '500mg',
    manufacturer: '',
    barcode: '',
    requires_prescription: false,
    unit_price: 1.0,
    reorder_level: 20,
    initial_batch_number: '',
    initial_expiry_date: '',
    initial_quantity: 50,
  });

  const [newBatchForm, setNewBatchForm] = useState({
    batch_number: '',
    manufacture_date: new Date().toISOString().split('T')[0],
    expiry_date: '',
    initial_quantity: 100,
    current_quantity: 100,
    purchase_cost: 0.5,
    selling_price: 1.0,
  });

  const [adjustForm, setAdjustForm] = useState({
    adjustment_type: 'Damage',
    quantity_change: -1,
    reason: '',
  });

  const [actionError, setActionError] = useState(null);

  useEffect(() => {
    loadMedicines();
  }, []);

  const loadMedicines = async () => {
    setLoading(true);
    try {
      const data = await medicinesApi.list();
      setMedicines(data);
    } catch (err) {
      console.error('Failed to load medicines:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMedicine = async (e) => {
    e.preventDefault();
    setActionError(null);
    try {
      await medicinesApi.create({
        ...newMedForm,
        unit_price: parseFloat(newMedForm.unit_price),
        reorder_level: parseInt(newMedForm.reorder_level),
        initial_quantity: newMedForm.initial_quantity ? parseInt(newMedForm.initial_quantity) : null,
      });
      setShowAddMedModal(false);
      loadMedicines();
    } catch (err) {
      setActionError(err.message);
    }
  };

  const handleAddBatch = async (e) => {
    e.preventDefault();
    setActionError(null);
    try {
      await medicinesApi.addBatch(targetMedicine.id, {
        ...newBatchForm,
        initial_quantity: parseInt(newBatchForm.initial_quantity),
        current_quantity: parseInt(newBatchForm.initial_quantity),
        purchase_cost: parseFloat(newBatchForm.purchase_cost),
        selling_price: parseFloat(newBatchForm.selling_price),
      });
      setShowAddBatchModal(false);
      loadMedicines();
    } catch (err) {
      setActionError(err.message);
    }
  };

  const handleAdjustStock = async (e) => {
    e.preventDefault();
    setActionError(null);
    try {
      await medicinesApi.adjustStock({
        batch_id: targetBatch.id,
        adjustment_type: adjustForm.adjustment_type,
        quantity_change: parseInt(adjustForm.quantity_change),
        reason: adjustForm.reason,
      });
      setShowAdjustModal(false);
      loadMedicines();
    } catch (err) {
      setActionError(err.message);
    }
  };

  const handleDeleteMedicine = async (id, name) => {
    if (confirm(`Are you sure you want to delete ${name}? This will be logged in the immutable audit trail.`)) {
      try {
        await medicinesApi.delete(id);
        loadMedicines();
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const filteredMedicines = medicines.filter((m) => {
    const matchesSearch =
      m.brand_name.toLowerCase().includes(search.toLowerCase()) ||
      m.generic_name.toLowerCase().includes(search.toLowerCase()) ||
      (m.barcode && m.barcode.includes(search));

    if (!matchesSearch) return false;

    if (filterType === 'low_stock') {
      return m.total_stock <= m.reorder_level;
    }
    if (filterType === 'expiring') {
      const today = new Date();
      const next90Days = new Date();
      next90Days.setDate(today.getDate() + 90);
      return m.batches?.some((b) => new Date(b.expiry_date) <= next90Days && b.current_quantity > 0);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Pharmaceutical Inventory & Batches</h1>
          <p className="text-slate-400 text-sm mt-1">
            FEFO (First Expired, First Out) batch tracking, stock adjustments, and compliance controls.
          </p>
        </div>

        {(userRole === 'Admin' || userRole === 'Pharmacist') && (
          <button
            onClick={() => setShowAddMedModal(true)}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-lg shadow-emerald-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>Add Medicine</span>
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filter medicines by name, generic, barcode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterType === 'all'
                ? 'bg-slate-800 text-white border border-slate-700'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All Items ({medicines.length})
          </button>
          <button
            onClick={() => setFilterType('low_stock')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterType === 'low_stock'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'text-slate-400 hover:text-amber-300'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Low Stock</span>
          </button>
          <button
            onClick={() => setFilterType('expiring')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterType === 'expiring'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                : 'text-slate-400 hover:text-rose-300'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Expiring (90d)</span>
          </button>
        </div>
      </div>

      {/* Catalog Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/70 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-4 w-8"></th>
                <th className="p-4">Brand / Generic Name</th>
                <th className="p-4">Category</th>
                <th className="p-4">Dosage / Form</th>
                <th className="p-4">Unit Price</th>
                <th className="p-4">Total Stock</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredMedicines.map((med) => {
                const isExpanded = expandedMedId === med.id;
                const isLowStock = med.total_stock <= med.reorder_level;
                const isOutOfStock = med.total_stock <= 0;

                return (
                  <React.Fragment key={med.id}>
                    <tr className="hover:bg-slate-850/40 transition-colors">
                      <td className="p-4 text-center">
                        <button
                          onClick={() => setExpandedMedId(isExpanded ? null : med.id)}
                          className="p-1 hover:text-white text-slate-400"
                        >
                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                      </td>
                      <td className="p-4">
                        <div className="font-semibold text-white text-sm">{med.brand_name}</div>
                        <div className="text-slate-400 text-xs">{med.generic_name}</div>
                      </td>
                      <td className="p-4">
                        <span className="px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 font-medium">
                          {med.category}
                        </span>
                      </td>
                      <td className="p-4">
                        {med.strength} ({med.dosage_form})
                      </td>
                      <td className="p-4 font-semibold text-white">${med.unit_price.toFixed(2)}</td>
                      <td className="p-4 font-bold text-sm">
                        <span
                          className={
                            isOutOfStock ? 'text-rose-400' : isLowStock ? 'text-amber-400' : 'text-emerald-400'
                          }
                        >
                          {med.total_stock}
                        </span>
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            isOutOfStock
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                              : isLowStock
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          }`}
                        >
                          {isOutOfStock ? 'Out of Stock' : isLowStock ? 'Low Stock' : 'Optimal'}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {(userRole === 'Admin' || userRole === 'Pharmacist') && (
                            <button
                              onClick={() => {
                                setTargetMedicine(med);
                                setNewBatchForm({
                                  ...newBatchForm,
                                  selling_price: med.unit_price,
                                });
                                setShowAddBatchModal(true);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-[11px]"
                            >
                              + Batch
                            </button>
                          )}
                          {userRole === 'Admin' && (
                            <button
                              onClick={() => handleDeleteMedicine(med.id, med.brand_name)}
                              className="p-1 text-slate-500 hover:text-rose-400"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Expanded Batches (FEFO View) */}
                    {isExpanded && (
                      <tr className="bg-slate-950/80">
                        <td colSpan={8} className="p-4">
                          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <h4 className="font-bold text-white text-xs flex items-center gap-2">
                                <Boxes className="w-4 h-4 text-emerald-400" />
                                <span>Active Batches for {med.brand_name} (FEFO Ordered)</span>
                              </h4>
                              <span className="text-[11px] text-slate-400">
                                Earliest expiry is auto-deducted first at checkout.
                              </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {med.batches?.map((b) => {
                                const expDate = new Date(b.expiry_date);
                                const diffDays = Math.ceil((expDate - new Date()) / (1000 * 60 * 60 * 24));
                                const isExpired = diffDays <= 0;
                                const isExpiringSoon = diffDays <= 60 && !isExpired;

                                return (
                                  <div
                                    key={b.id}
                                    className={`p-3 rounded-xl border flex flex-col justify-between ${
                                      isExpired
                                        ? 'bg-rose-950/20 border-rose-500/40'
                                        : isExpiringSoon
                                        ? 'bg-amber-950/20 border-amber-500/40'
                                        : 'bg-slate-950 border-slate-800'
                                    }`}
                                  >
                                    <div>
                                      <div className="flex items-center justify-between text-xs font-semibold text-white">
                                        <span>Batch: {b.batch_number}</span>
                                        <span className="text-emerald-400 font-bold">{b.current_quantity} units</span>
                                      </div>
                                      <div className="text-[11px] text-slate-400 mt-1">
                                        Exp: {b.expiry_date} ({isExpired ? 'EXPIRED' : `${diffDays} days left`})
                                      </div>
                                      <div className="text-[10px] text-slate-500">
                                        Cost: ${b.purchase_cost.toFixed(2)} | Sell: ${b.selling_price.toFixed(2)}
                                      </div>
                                    </div>

                                    {(userRole === 'Admin' || userRole === 'Pharmacist') && (
                                      <div className="mt-3 pt-2 border-t border-slate-800/80 flex justify-end">
                                        <button
                                          onClick={() => {
                                            setTargetMedicine(med);
                                            setTargetBatch(b);
                                            setShowAdjustModal(true);
                                          }}
                                          className="flex items-center gap-1 text-[11px] text-slate-300 hover:text-white bg-slate-800 px-2 py-1 rounded"
                                        >
                                          <Sliders className="w-3 h-3" />
                                          <span>Adjust Stock</span>
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Add New Medicine */}
      {showAddMedModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white">Add Medicine to Catalog</h2>
              <button onClick={() => setShowAddMedModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {actionError && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                {actionError}
              </div>
            )}

            <form onSubmit={handleCreateMedicine} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 font-medium">Brand Name</label>
                  <input
                    required
                    type="text"
                    value={newMedForm.brand_name}
                    onChange={(e) => setNewMedForm({ ...newMedForm, brand_name: e.target.value })}
                    className="w-full mt-1 p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-medium">Generic Name</label>
                  <input
                    required
                    type="text"
                    value={newMedForm.generic_name}
                    onChange={(e) => setNewMedForm({ ...newMedForm, generic_name: e.target.value })}
                    className="w-full mt-1 p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 font-medium">Category</label>
                  <input
                    required
                    type="text"
                    value={newMedForm.category}
                    onChange={(e) => setNewMedForm({ ...newMedForm, category: e.target.value })}
                    className="w-full mt-1 p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-medium">Strength / Dosage</label>
                  <input
                    required
                    type="text"
                    value={newMedForm.strength}
                    onChange={(e) => setNewMedForm({ ...newMedForm, strength: e.target.value })}
                    className="w-full mt-1 p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-400 font-medium">Form</label>
                  <select
                    value={newMedForm.dosage_form}
                    onChange={(e) => setNewMedForm({ ...newMedForm, dosage_form: e.target.value })}
                    className="w-full mt-1 p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white"
                  >
                    <option value="Tablet">Tablet</option>
                    <option value="Capsule">Capsule</option>
                    <option value="Syrup">Syrup</option>
                    <option value="Injection">Injection</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 font-medium">Price ($)</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    value={newMedForm.unit_price}
                    onChange={(e) => setNewMedForm({ ...newMedForm, unit_price: e.target.value })}
                    className="w-full mt-1 p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-medium">Reorder Min</label>
                  <input
                    required
                    type="number"
                    value={newMedForm.reorder_level}
                    onChange={(e) => setNewMedForm({ ...newMedForm, reorder_level: e.target.value })}
                    className="w-full mt-1 p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 font-medium">Manufacturer</label>
                <input
                  required
                  type="text"
                  value={newMedForm.manufacturer}
                  onChange={(e) => setNewMedForm({ ...newMedForm, manufacturer: e.target.value })}
                  className="w-full mt-1 p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddMedModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-semibold text-white"
                >
                  Save Medicine
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Stock Adjustment (Strict Audit Trail) */}
      {showAdjustModal && targetBatch && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/40 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
              <ShieldAlert className="w-5 h-5" />
              <span>Mandatory Audited Stock Adjustment</span>
            </div>

            <p className="text-slate-400 text-xs leading-relaxed">
              Modifying inventory for <span className="text-white font-semibold">{targetMedicine?.brand_name}</span> (Batch{' '}
              <span className="text-white font-semibold">{targetBatch.batch_number}</span>). Current stock: {targetBatch.current_quantity}.
            </p>

            {actionError && (
              <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                {actionError}
              </div>
            )}

            <form onSubmit={handleAdjustStock} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 font-medium">Adjustment Reason Type</label>
                <select
                  value={adjustForm.adjustment_type}
                  onChange={(e) => setAdjustForm({ ...adjustForm, adjustment_type: e.target.value })}
                  className="w-full mt-1 p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white"
                >
                  <option value="Damage">Damage / Broken Packaging</option>
                  <option value="Disposal">Disposal / Contamination</option>
                  <option value="Expiry Purge">Expired Stock Removal</option>
                  <option value="Recount">Physical Inventory Recount</option>
                  <option value="Return">Customer Return</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 font-medium">Quantity Adjustment (+ or -)</label>
                <input
                  required
                  type="number"
                  value={adjustForm.quantity_change}
                  onChange={(e) => setAdjustForm({ ...adjustForm, quantity_change: e.target.value })}
                  className="w-full mt-1 p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 font-medium">
                  Detailed Justification (Recorded in Append-Only Audit Trail)
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Mandatory clinical/operational explanation..."
                  value={adjustForm.reason}
                  onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                  className="w-full mt-1 p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!adjustForm.reason.trim()}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 font-semibold text-white disabled:opacity-50"
                >
                  Commit Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Add Batch Modal */}
      {showAddBatchModal && targetMedicine && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white">Add Batch for {targetMedicine.brand_name}</h2>
              <button onClick={() => setShowAddBatchModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddBatch} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 font-medium">Batch Number</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. BTH-2026-99"
                  value={newBatchForm.batch_number}
                  onChange={(e) => setNewBatchForm({ ...newBatchForm, batch_number: e.target.value })}
                  className="w-full mt-1 p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 font-medium">Quantity</label>
                  <input
                    required
                    type="number"
                    min="1"
                    value={newBatchForm.initial_quantity}
                    onChange={(e) => setNewBatchForm({ ...newBatchForm, initial_quantity: e.target.value })}
                    className="w-full mt-1 p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-medium">Expiry Date</label>
                  <input
                    required
                    type="date"
                    value={newBatchForm.expiry_date}
                    onChange={(e) => setNewBatchForm({ ...newBatchForm, expiry_date: e.target.value })}
                    className="w-full mt-1 p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 font-medium">Purchase Cost ($)</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    value={newBatchForm.purchase_cost}
                    onChange={(e) => setNewBatchForm({ ...newBatchForm, purchase_cost: e.target.value })}
                    className="w-full mt-1 p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-medium">Selling Price ($)</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    value={newBatchForm.selling_price}
                    onChange={(e) => setNewBatchForm({ ...newBatchForm, selling_price: e.target.value })}
                    className="w-full mt-1 p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddBatchModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-semibold text-white"
                >
                  Save Batch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
