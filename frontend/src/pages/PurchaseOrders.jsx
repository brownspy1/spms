import React, { useState, useEffect } from 'react';
import {
  Truck,
  Plus,
  CheckCircle,
  PackageCheck,
  Building2,
  Clock,
  X,
} from 'lucide-react';
import { procurementApi, medicinesApi } from '../services/api';

export default function PurchaseOrders({ userRole }) {
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showNewPOModal, setShowNewPOModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);

  // Form State
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [poNotes, setPoNotes] = useState('');
  const [poItems, setPoItems] = useState([{ medicine_id: '', quantity: 100, unit_cost: 0.5 }]);

  const [supplierForm, setSupplierForm] = useState({
    name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [pos, sups, meds] = await Promise.all([
        procurementApi.listPOs(),
        procurementApi.listSuppliers(),
        medicinesApi.list(),
      ]);
      setPurchaseOrders(pos);
      setSuppliers(sups);
      setMedicines(meds);
      if (sups.length > 0 && !selectedSupplierId) {
        setSelectedSupplierId(sups[0].id);
      }
    } catch (err) {
      console.error('Failed to load PO data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItemRow = () => {
    setPoItems([...poItems, { medicine_id: medicines[0]?.id || '', quantity: 50, unit_cost: 0.5 }]);
  };

  const handleRemoveItemRow = (idx) => {
    setPoItems(poItems.filter((_, i) => i !== idx));
  };

  const handleItemChange = (idx, field, val) => {
    const updated = [...poItems];
    updated[idx][field] = val;
    setPoItems(updated);
  };

  const handleCreatePO = async (e) => {
    e.preventDefault();
    try {
      await procurementApi.createPO({
        supplier_id: parseInt(selectedSupplierId),
        notes: poNotes,
        items: poItems.map((it) => ({
          medicine_id: parseInt(it.medicine_id),
          quantity: parseInt(it.quantity),
          unit_cost: parseFloat(it.unit_cost),
        })),
      });
      setShowNewPOModal(false);
      setPoItems([{ medicine_id: '', quantity: 100, unit_cost: 0.5 }]);
      setPoNotes('');
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCreateSupplier = async (e) => {
    e.preventDefault();
    try {
      await procurementApi.createSupplier(supplierForm);
      setShowSupplierModal(false);
      setSupplierForm({ name: '', contact_person: '', phone: '', email: '', address: '' });
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleApprovePO = async (id) => {
    try {
      await procurementApi.approvePO(id);
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleReceivePO = async (id) => {
    try {
      const res = await procurementApi.receivePO(id);
      alert(`PO Received! Automatically generated ${res.batches_added.length} inventory batches.`);
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const statusColors = {
    'Pending Approval': 'bg-amber-500/10 text-amber-300 border-amber-500/30',
    Approved: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
    Received: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
    Cancelled: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Procurement & Purchase Orders</h1>
          <p className="text-slate-400 text-sm mt-1">
            Supplier directory, restock purchase orders, Admin approvals, and automated inventory intake.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {(userRole === 'Admin' || userRole === 'Pharmacist') && (
            <>
              <button
                onClick={() => setShowSupplierModal(true)}
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all border border-slate-700"
              >
                <Building2 className="w-4 h-4 text-emerald-400" />
                <span>Add Supplier</span>
              </button>
              <button
                onClick={() => setShowNewPOModal(true)}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-semibold transition-all shadow-lg shadow-emerald-600/20"
              >
                <Plus className="w-4 h-4" />
                <span>New Purchase Order</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* PO Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg shadow-black/20">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/70 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-4">PO Number</th>
                <th className="p-4">Supplier</th>
                <th className="p-4">Total Cost</th>
                <th className="p-4">Items Count</th>
                <th className="p-4">Status</th>
                <th className="p-4">Created Date</th>
                <th className="p-4 text-right">Workflow Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {purchaseOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    No purchase orders recorded yet.
                  </td>
                </tr>
              ) : (
                purchaseOrders.map((po) => (
                  <tr key={po.id} className="hover:bg-slate-850/40 transition-colors">
                    <td className="p-4 font-mono font-bold text-white">{po.po_number}</td>
                    <td className="p-4 font-medium text-slate-200">{po.supplier_name}</td>
                    <td className="p-4 font-bold text-emerald-400 text-sm">${po.total_cost.toFixed(2)}</td>
                    <td className="p-4">{po.items?.length || 0} Line Items</td>
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-md font-semibold border text-[10px] ${
                          statusColors[po.status] || 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {po.status}
                      </span>
                    </td>
                    <td className="p-4 text-slate-400">{new Date(po.created_at).toLocaleDateString()}</td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {po.status === 'Pending Approval' && userRole === 'Admin' && (
                          <button
                            onClick={() => handleApprovePO(po.id)}
                            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-[11px] shadow-sm"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Approve (Admin)</span>
                          </button>
                        )}
                        {po.status === 'Approved' && (userRole === 'Admin' || userRole === 'Pharmacist') && (
                          <button
                            onClick={() => handleReceivePO(po.id)}
                            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-[11px] shadow-sm"
                          >
                            <PackageCheck className="w-3.5 h-3.5" />
                            <span>Receive & Restock</span>
                          </button>
                        )}
                        {po.status === 'Received' && (
                          <span className="text-emerald-400 text-[11px] font-medium flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Stock Ingested</span>
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Create PO */}
      {showNewPOModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white">Create Purchase Order</h2>
              <button onClick={() => setShowNewPOModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePO} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-400 font-medium">Select Supplier</label>
                <select
                  value={selectedSupplierId}
                  onChange={(e) => setSelectedSupplierId(e.target.value)}
                  className="w-full mt-1 p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white"
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.contact_person})
                    </option>
                  ))}
                </select>
              </div>

              {/* Items Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">Line Items</span>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="text-emerald-400 hover:text-emerald-300 text-xs flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                {poItems.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-slate-950 p-2 rounded-xl border border-slate-800">
                    <div className="col-span-6">
                      <select
                        value={item.medicine_id}
                        onChange={(e) => handleItemChange(idx, 'medicine_id', e.target.value)}
                        className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-white"
                      >
                        <option value="">Select Medicine...</option>
                        {medicines.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.brand_name} ({m.strength})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-3">
                      <input
                        type="number"
                        min="1"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                        className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-white text-center"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Cost"
                        value={item.unit_cost}
                        onChange={(e) => handleItemChange(idx, 'unit_cost', e.target.value)}
                        className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-white text-right"
                      />
                    </div>
                    <div className="col-span-1 text-center">
                      {poItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItemRow(idx)}
                          className="text-rose-400 hover:text-rose-300"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <label className="text-slate-400 font-medium">Procurement Notes</label>
                <textarea
                  rows={2}
                  value={poNotes}
                  onChange={(e) => setPoNotes(e.target.value)}
                  placeholder="Special instructions, delivery timeline..."
                  className="w-full mt-1 p-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowNewPOModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-semibold text-white"
                >
                  Submit for Approval
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Add Supplier */}
      {showSupplierModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white">Register Supplier</h2>
              <button onClick={() => setShowSupplierModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSupplier} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 font-medium">Company Name</label>
                <input
                  required
                  type="text"
                  value={supplierForm.name}
                  onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                  className="w-full mt-1 p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white"
                />
              </div>
              <div>
                <label className="text-slate-400 font-medium">Contact Person</label>
                <input
                  type="text"
                  value={supplierForm.contact_person}
                  onChange={(e) => setSupplierForm({ ...supplierForm, contact_person: e.target.value })}
                  className="w-full mt-1 p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 font-medium">Phone</label>
                  <input
                    type="text"
                    value={supplierForm.phone}
                    onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                    className="w-full mt-1 p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-medium">Email</label>
                  <input
                    type="email"
                    value={supplierForm.email}
                    onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })}
                    className="w-full mt-1 p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white"
                  />
                </div>
              </div>
              <div>
                <label className="text-slate-400 font-medium">Address</label>
                <textarea
                  rows={2}
                  value={supplierForm.address}
                  onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })}
                  className="w-full mt-1 p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowSupplierModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-semibold text-white"
                >
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
