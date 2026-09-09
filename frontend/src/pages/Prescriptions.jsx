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
  Sparkles,
  Pill,
  RefreshCw,
  CheckCircle2,
  Image as ImageIcon,
  ShoppingCart,
  CreditCard,
  Printer,
} from 'lucide-react';
import { prescriptionsApi, settingsApi } from '../services/api';
import ReceiptModal from '../components/ReceiptModal';

export default function Prescriptions({ userRole, onNavigateTab }) {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedRx, setSelectedRx] = useState(null);

  // Dispense & Auto-Order state
  const [dispenseRx, setDispenseRx] = useState(null);
  const [dispenseLoading, setDispenseLoading] = useState(false);
  const [dispensePaymentMethod, setDispensePaymentMethod] = useState('Cash');
  const [dispenseTaxPercent, setDispenseTaxPercent] = useState(5.0);
  const [dispenseDiscount, setDispenseDiscount] = useState(0.0);
  const [dispenseError, setDispenseError] = useState(null);
  const [completedSale, setCompletedSale] = useState(null);

  // Upload modal & Auto-OCR state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const [ocrScanning, setOcrScanning] = useState(false);
  const [ocrPreview, setOcrPreview] = useState(null);
  const [customerName, setCustomerName] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [notes, setNotes] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [aiConfig, setAiConfig] = useState(null);

  useEffect(() => {
    loadPrescriptions();
    settingsApi.getAI().then(setAiConfig).catch(() => {});
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

  const handleCloseModal = () => {
    setShowUploadModal(false);
    setUploadFile(null);
    setImagePreviewUrl(null);
    setOcrPreview(null);
    setOcrScanning(false);
    setCustomerName('');
    setDoctorName('');
    setNotes('');
    setUploadError(null);
  };

  const handleFileSelect = async (file) => {
    if (!file) return;
    setUploadFile(file);
    setUploadError(null);
    setOcrPreview(null);

    // Create thumbnail preview if image
    if (file.type && file.type.startsWith('image/')) {
      setImagePreviewUrl(URL.createObjectURL(file));
    } else {
      setImagePreviewUrl(null);
    }

    // Automatically trigger instant multimodal OCR extraction
    setOcrScanning(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await prescriptionsApi.previewOCR(formData);
      setOcrPreview(res);

      if (res.customer_name) {
        setCustomerName(res.customer_name);
      }
      if (res.doctor_name) {
        setDoctorName(res.doctor_name);
      }
      if (res.notes) {
        setNotes(res.notes);
      }
    } catch (err) {
      console.warn('Auto-OCR preview note:', err);
      setUploadError(`Auto-OCR Note: ${err.message}. You can still review or edit details manually.`);
    } finally {
      setOcrScanning(false);
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
      handleCloseModal();
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

  const handleDispenseAndCreateOrder = async () => {
    if (!dispenseRx) return;
    setDispenseLoading(true);
    setDispenseError(null);
    try {
      const res = await prescriptionsApi.dispenseAndCreateOrder(dispenseRx.id, {
        payment_method: dispensePaymentMethod,
        tax_percent: parseFloat(dispenseTaxPercent) || 0,
        discount_amount: parseFloat(dispenseDiscount) || 0,
      });
      setDispenseRx(null);
      if (res.sale) {
        setCompletedSale(res.sale);
      }
      loadPrescriptions();
      if (selectedRx?.id === dispenseRx.id) {
        setSelectedRx({ ...selectedRx, status: 'Dispensed' });
      }
    } catch (err) {
      console.error('Dispense order failed:', err);
      setDispenseError(err.message || 'Failed to dispense and create order');
    } finally {
      setDispenseLoading(false);
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
                      onClick={() => {
                        setDispenseRx(rx);
                        setDispenseError(null);
                        setDispensePaymentMethod('Cash');
                        setDispenseDiscount(0);
                        setDispenseTaxPercent(5);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] transition-colors flex items-center gap-1 shadow-sm"
                      title="Dispense and auto-create sale order with thermal receipt"
                    >
                      <ShoppingCart className="w-3 h-3" />
                      <span>Dispense & Order</span>
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

      {/* MODAL: Upload Prescription with Real-time Auto-OCR */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Upload Patient Prescription</h2>
                  <p className="text-[11px] text-slate-400">Multimodal AI automatically extracts handwriting, doctor, and medications</p>
                </div>
              </div>
              <button onClick={handleCloseModal} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {uploadError && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                {uploadError}
              </div>
            )}

            {aiConfig && !aiConfig.is_configured && (
              <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/30 text-xs flex items-center justify-between text-purple-200">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
                  <span>For AI handwriting recognition & automatic drug parsing, configure your Google Gemini Key.</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    handleCloseModal();
                    if (onNavigateTab) onNavigateTab('security');
                  }}
                  className="text-purple-300 hover:text-white font-semibold underline text-[11px] shrink-0"
                >
                  Configure Key →
                </button>
              </div>
            )}

            {aiConfig && aiConfig.is_configured && (
              <div className="px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-300 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Google Gemini Vision OCR Active (Ready to transcribe handwriting, doctor seals, & Rx lines)</span>
              </div>
            )}

            <form onSubmit={handleUpload} className="space-y-4 text-xs">
              {/* Drop / Select zone */}
              <div className="border-2 border-dashed border-slate-700 hover:border-emerald-500/50 rounded-2xl p-5 text-center cursor-pointer bg-slate-950 transition-colors">
                <input
                  type="file"
                  required={!uploadFile}
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={(e) => handleFileSelect(e.target.files[0])}
                  className="hidden"
                  id="rx-upload-input"
                />
                <label htmlFor="rx-upload-input" className="cursor-pointer block space-y-2">
                  {imagePreviewUrl ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="relative group max-w-xs mx-auto">
                        <img
                          src={imagePreviewUrl}
                          alt="Prescription Preview"
                          className="max-h-36 rounded-xl border border-slate-700 object-contain shadow-md mx-auto"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 rounded-xl flex items-center justify-center transition-opacity text-white text-[11px] font-semibold">
                          Click to change file
                        </div>
                      </div>
                      <div className="text-emerald-400 font-semibold flex items-center gap-1.5 text-xs">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{uploadFile?.name}</span>
                      </div>
                    </div>
                  ) : (
                    <>
                      <UploadCloud className="w-8 h-8 text-emerald-400 mx-auto" />
                      <div className="text-slate-300 font-semibold">
                        {uploadFile ? uploadFile.name : 'Choose or drop prescription image (auto-scanned instantly)'}
                      </div>
                      <div className="text-[11px] text-slate-500">JPG, PNG, WebP, or PDF (Max 5MB)</div>
                    </>
                  )}
                </label>
              </div>

              {/* Scanning in progress indicator */}
              {ocrScanning && (
                <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-200 flex items-center gap-3 animate-pulse">
                  <Sparkles className="w-5 h-5 text-purple-400 animate-spin shrink-0" />
                  <div>
                    <div className="font-semibold text-xs text-white">Multimodal Vision AI OCR Scanning...</div>
                    <div className="text-[11px] text-purple-300/80">Transcribing prescription handwriting, doctor details, and medications in real-time...</div>
                  </div>
                </div>
              )}

              {/* Auto-OCR Result Card */}
              {ocrPreview && !ocrScanning && (
                <div className="bg-slate-950 p-4 rounded-xl border border-emerald-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-emerald-400 text-xs flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      Prescription Scanned & Transcribed
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-semibold">
                      {ocrPreview.ocr_engine}
                    </span>
                  </div>

                  {/* Detected Medicines */}
                  {(() => {
                    let meds = [];
                    try {
                      meds = typeof ocrPreview.extracted_medicines === 'string'
                        ? JSON.parse(ocrPreview.extracted_medicines)
                        : ocrPreview.extracted_medicines;
                    } catch (e) {
                      meds = [];
                    }

                    return meds && meds.length > 0 ? (
                      <div className="space-y-1.5">
                        <span className="text-[11px] text-slate-400 font-medium">Auto-Detected Medicines ({meds.length}):</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {meds.map((m, idx) => (
                            <div key={idx} className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex items-start gap-2">
                              <Pill className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                              <div className="text-[11px] leading-tight">
                                <div className="font-bold text-white">{m.name} {m.strength && <span className="text-emerald-400 font-normal">({m.strength})</span>}</div>
                                <div className="text-slate-400 text-[10px] mt-0.5">{m.dosage || 'Standard dosage'}{m.duration ? ` • ${m.duration}` : ''}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null;
                  })()}

                  {ocrPreview.extracted_text && (
                    <details className="text-[11px] text-slate-400">
                      <summary className="cursor-pointer text-emerald-400/90 hover:underline select-none">
                        View transcribed clinical text
                      </summary>
                      <pre className="mt-1.5 p-2 rounded-lg bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-300 whitespace-pre-wrap max-h-24 overflow-y-auto">
                        {ocrPreview.extracted_text}
                      </pre>
                    </details>
                  )}
                </div>
              )}

              {/* Form Fields pre-populated by OCR */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 font-medium flex items-center justify-between">
                    <span>Patient Name</span>
                    {customerName && <span className="text-emerald-400 text-[10px]">Auto-filled</span>}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. John Doe"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full mt-1 p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white"
                  />
                </div>

                <div>
                  <label className="text-slate-400 font-medium flex items-center justify-between">
                    <span>Doctor Name</span>
                    {doctorName && <span className="text-emerald-400 text-[10px]">Auto-filled</span>}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Dr. Sarah Jenkins, MD"
                    value={doctorName}
                    onChange={(e) => setDoctorName(e.target.value)}
                    className="w-full mt-1 p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 font-medium">Pharmacist Dispensing Notes</label>
                <textarea
                  rows={2}
                  placeholder="Additional clinical observations..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full mt-1 p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!uploadFile || uploading || ocrScanning}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-semibold text-white disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-emerald-600/20"
                >
                  {uploading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving Prescription...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Confirm & Save Prescription</span>
                    </>
                  )}
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

      {/* MODAL: Dispense & Create Order Confirmation */}
      {dispenseRx && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <ShoppingCart className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Dispense & Generate Order</h2>
                  <p className="text-[11px] text-slate-400">Rx #{dispenseRx.id} • {dispenseRx.customer_name}</p>
                </div>
              </div>
              <button
                onClick={() => setDispenseRx(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {dispenseError && (
              <div className="bg-rose-950/40 border border-rose-800/80 rounded-xl p-3 flex items-center gap-2 text-rose-300 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{dispenseError}</span>
              </div>
            )}

            {/* Extracted medicines list preview */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">
                Prescription Extracted Medicines:
              </label>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 max-h-40 overflow-y-auto space-y-2">
                {(() => {
                  let medList = [];
                  try {
                    medList = JSON.parse(dispenseRx.extracted_medicines || '[]');
                  } catch (e) {
                    medList = [];
                  }
                  if (!medList.length) {
                    return <span className="text-xs text-slate-500 italic">No medicines extracted from this prescription</span>;
                  }
                  return medList.map((m, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs bg-slate-900/60 p-2 rounded-lg border border-slate-800/60">
                      <div className="flex items-center gap-2">
                        <Pill className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="font-medium text-slate-200">{m.name || m.medicine}</span>
                        {m.strength && <span className="text-[10px] text-slate-400">({m.strength})</span>}
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">
                        Qty: {m.quantity || m.qty || m.duration || '1'}
                      </span>
                    </div>
                  ));
                })()}
              </div>
              <p className="text-[10px] text-slate-400">
                System matches brand and generic names with stock catalog and deducts earliest expiring batches (FEFO).
              </p>
            </div>

            {/* Billing details: payment method, discount */}
            <div className="grid grid-cols-2 gap-3 text-xs pt-1">
              <div>
                <label className="block text-slate-400 font-medium mb-1">Payment Method</label>
                <select
                  value={dispensePaymentMethod}
                  onChange={(e) => setDispensePaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="Cash">Cash</option>
                  <option value="Card">Credit/Debit Card</option>
                  <option value="Mobile">Mobile Payment (bKash/Nagad)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Discount Amount ($)</label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={dispenseDiscount}
                  onChange={(e) => setDispenseDiscount(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => handleStatusChange(dispenseRx.id, 'Dispensed').then(() => setDispenseRx(null))}
                className="text-xs text-slate-400 hover:text-slate-200 underline"
                title="Mark as dispensed without creating a sale record"
              >
                Mark Dispensed only
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDispenseRx(null)}
                  disabled={dispenseLoading}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDispenseAndCreateOrder}
                  disabled={dispenseLoading}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                >
                  {dispenseLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Dispensing...</span>
                    </>
                  ) : (
                    <>
                      <Printer className="w-3.5 h-3.5" />
                      <span>Confirm & Print Receipt</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reusable Receipt Modal */}
      {completedSale && (
        <ReceiptModal
          sale={completedSale}
          onClose={() => setCompletedSale(null)}
          title="Prescription Dispensed & Billed"
        />
      )}
    </div>
  );
}
