import React, { useState, useEffect } from 'react';
import {
  FileText,
  UploadCloud,
  CheckCircle,
  XCircle,
  Clock,
  Trash2,
  ShieldCheck,
  Eye,
  X,
  AlertCircle,
} from 'lucide-react';
import { prescriptionsApi } from '../services/api';

export default function Prescriptions({ userRole }) {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedRx, setSelectedRx] = useState(null);

  // Upload modal
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [customerName, setCustomerName] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [notes, setNotes] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  useEffect(() => {
    loadPrescriptions();
  }, []);

  const loadPrescriptions = async () => {
    setLoading(true);
    try {
      const data = await prescriptionsApi.list();
      setPrescriptions(data);
    } catch (err) {
      console.error('Failed to load prescriptions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile) return;

    setUploading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      if (customerName) formData.append('customer_name', customerName);
      if (doctorName) formData.append('doctor_name', doctorName);
      if (notes) formData.append('notes', notes);

      await prescriptionsApi.upload(formData);
      setShowUploadModal(false);
      setUploadFile(null);
      setCustomerName('');
      setDoctorName('');
      setNotes('');
      loadPrescriptions();
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await prescriptionsApi.updateStatus(id, newStatus);
      loadPrescriptions();
      if (selectedRx?.id === id) {
        setSelectedRx({ ...selectedRx, status: newStatus });
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleRunCleanup = async () => {
    if (confirm('Execute 90-day retention compliance cleanup? Any records past their deadline will be archived and image files purged.')) {
      try {
        const res = await prescriptionsApi.cleanupRetention();
        alert(res.message);
        loadPrescriptions();
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const filteredRx = prescriptions.filter((rx) => {
    if (statusFilter === 'all') return true;
    return rx.status.toLowerCase() === statusFilter.toLowerCase();
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Prescription Records & Clinical OCR</h1>
          <p className="text-slate-400 text-sm mt-1">
            Automated drug detection, verification workflows, and 90-day compliance retention tracking.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {userRole === 'Admin' && (
            <button
              onClick={handleRunCleanup}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all border border-slate-700"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Run Retention Purge</span>
            </button>
          )}

          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-semibold transition-all shadow-lg shadow-emerald-600/20"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload Prescription</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        {['All', 'Pending', 'Approved', 'Dispensed', 'Rejected'].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status.toLowerCase())}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              statusFilter === status.toLowerCase()
                ? 'bg-slate-800 text-white border border-slate-700'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Prescription Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredRx.map((rx) => {
          const deadline = new Date(rx.retention_deadline);
          const diffDays = Math.ceil((deadline - new Date()) / (1000 * 60 * 60 * 24));

          let parsedMedicines = [];
          try {
            if (rx.extracted_medicines) {
              parsedMedicines = JSON.parse(rx.extracted_medicines);
            }
          } catch (e) {}

          const statusBadgeColors = {
            Pending: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
            Approved: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
            Dispensed: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
            Rejected: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
          };

          return (
            <div
              key={rx.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-4 hover:border-slate-700 transition-all shadow-lg shadow-black/20"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] text-slate-500 font-mono">RX #{rx.id}</span>
                    <h3 className="font-bold text-white text-sm mt-0.5">{rx.customer_name}</h3>
                    <div className="text-xs text-slate-400">{rx.doctor_name || 'Prescriber Unspecified'}</div>
                  </div>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-md font-semibold border ${
                      statusBadgeColors[rx.status] || 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {rx.status}
                  </span>
                </div>

                {/* Detected Medications */}
                <div className="mt-3 bg-slate-950/70 rounded-xl p-3 border border-slate-800 space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Detected Drugs (OCR)
                  </span>
                  {parsedMedicines.length > 0 ? (
                    parsedMedicines.map((med, idx) => (
                      <div key={idx} className="flex justify-between text-xs text-slate-200">
                        <span className="font-medium text-emerald-300">{med.name}</span>
                        <span className="text-slate-400">{med.strength || med.dosage}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-slate-500">No structured drugs detected</div>
                  )}
                </div>
              </div>

              {/* Retention Countdown & Actions */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>Retention: {diffDays}d left</span>
                </div>

                <div className="flex items-center gap-1.5">
                  {rx.status === 'Pending' && (
                    <button
                      onClick={() => handleStatusChange(rx.id, 'Approved')}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600 hover:text-white font-medium text-[11px] transition-colors"
                    >
                      Approve
                    </button>
                  )}
                  {rx.status === 'Approved' && (
                    <button
                      onClick={() => handleStatusChange(rx.id, 'Dispensed')}
                      className="px-2.5 py-1 rounded-lg bg-blue-600/20 text-blue-300 hover:bg-blue-600 hover:text-white font-medium text-[11px] transition-colors"
                    >
                      Dispense
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedRx(rx)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                    title="View Full OCR Transcript"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL: Upload Prescription */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white">Upload Patient Prescription</h2>
              <button onClick={() => setShowUploadModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {uploadError && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                {uploadError}
              </div>
            )}

            <form onSubmit={handleUpload} className="space-y-3 text-xs">
              <div className="border-2 border-dashed border-slate-700 hover:border-emerald-500/50 rounded-2xl p-6 text-center cursor-pointer bg-slate-950 transition-colors">
                <input
                  type="file"
                  required
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={(e) => setUploadFile(e.target.files[0])}
                  className="hidden"
                  id="rx-upload-input"
                />
                <label htmlFor="rx-upload-input" className="cursor-pointer block space-y-2">
                  <UploadCloud className="w-8 h-8 text-emerald-400 mx-auto" />
                  <div className="text-slate-300 font-semibold">
                    {uploadFile ? uploadFile.name : 'Select or drop prescription file'}
                  </div>
                  <div className="text-[11px] text-slate-500">JPG, PNG, WebP, or PDF (Max 5MB)</div>
                </label>
              </div>

              <div>
                <label className="text-slate-400 font-medium">Patient Name (Optional, auto-detected)</label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full mt-1 p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 font-medium">Doctor Name (Optional, auto-detected)</label>
                <input
                  type="text"
                  placeholder="e.g. Dr. Sarah Jenkins, MD"
                  value={doctorName}
                  onChange={(e) => setDoctorName(e.target.value)}
                  className="w-full mt-1 p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 font-medium">Pharmacist Dispensing Notes</label>
                <textarea
                  rows={2}
                  placeholder="Additional observations..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full mt-1 p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!uploadFile || uploading}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-semibold text-white disabled:opacity-50"
                >
                  {uploading ? 'Processing OCR...' : 'Upload & Analyze'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Full OCR Transcript & Image Inspection */}
      {selectedRx && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white">Prescription #{selectedRx.id} Details</h2>
              <button onClick={() => setSelectedRx(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Patient:</span>
                <span className="font-semibold text-white">{selectedRx.customer_name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Prescriber:</span>
                <span className="font-semibold text-white">{selectedRx.doctor_name || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Status:</span>
                <span className="font-semibold text-emerald-400">{selectedRx.status}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Retention Deadline:</span>
                <span className="text-slate-300">{new Date(selectedRx.retention_deadline).toLocaleDateString()}</span>
              </div>
            </div>

            <div>
              <span className="text-xs font-bold text-slate-400 block mb-1">Raw Extracted OCR Text:</span>
              <pre className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono text-emerald-400/90 whitespace-pre-wrap">
                {selectedRx.extracted_text || 'No raw text stored.'}
              </pre>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedRx(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
