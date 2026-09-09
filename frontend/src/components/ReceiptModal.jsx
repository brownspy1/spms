import React from 'react';
import { CheckCircle, X, Printer, Phone, User, FileText } from 'lucide-react';

export default function ReceiptModal({ sale, onClose, title = "Transaction Successful" }) {
  if (!sale) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-base">
            <CheckCircle className="w-5 h-5" />
            <span>{title}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Receipt Preview Body (target of window.print) */}
        <div
          id="printable-receipt"
          className="bg-white text-slate-900 p-5 rounded-xl text-xs font-mono space-y-3 shadow-inner"
        >
          <div className="text-center border-b border-dashed border-slate-300 pb-2.5">
            <div className="font-bold text-sm text-slate-950 tracking-wider">SPMS PHARMACY CARE</div>
            <div className="text-[10px] text-slate-600">Smart Pharmacy Management System • License #RX-9941</div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {sale.created_at ? new Date(sale.created_at).toLocaleString() : new Date().toLocaleString()}
            </div>
          </div>

          <div className="space-y-1 text-[11px] border-b border-dashed border-slate-200 pb-2">
            <div className="flex justify-between">
              <span className="text-slate-600">Invoice No:</span>
              <span className="font-bold text-slate-900">{sale.invoice_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Payment Method:</span>
              <span className="font-semibold text-slate-800">{sale.payment_method || 'Cash'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Customer / Patient:</span>
              <span className="font-semibold text-slate-900">{sale.customer_name || 'Walk-in Customer'}</span>
            </div>
            {sale.customer_phone && (
              <div className="flex justify-between">
                <span className="text-slate-600">Contact:</span>
                <span className="text-slate-800 font-mono">{sale.customer_phone}</span>
              </div>
            )}
            {sale.cashier_name && (
              <div className="flex justify-between">
                <span className="text-slate-600">Dispensed By:</span>
                <span className="text-slate-800">{sale.cashier_name}</span>
              </div>
            )}
            {sale.prescription_id && (
              <div className="flex justify-between text-emerald-700 font-semibold">
                <span>Prescription Link:</span>
                <span>Rx #{sale.prescription_id}</span>
              </div>
            )}
          </div>

          {/* Line items */}
          <div className="border-b border-dashed border-slate-300 py-2 space-y-1.5">
            <div className="flex justify-between text-[10px] uppercase font-bold text-slate-600 pb-1">
              <span>Item Description</span>
              <span>Subtotal</span>
            </div>
            {sale.items && sale.items.length > 0 ? (
              sale.items.map((it, i) => (
                <div key={i} className="flex justify-between text-[11px] leading-tight">
                  <div className="max-w-[75%]">
                    <div className="font-semibold text-slate-900">{it.medicine_name}</div>
                    <div className="text-[9px] text-slate-500">
                      Batch: {it.batch_number} • Qty: {it.quantity} × ${Number(it.unit_price).toFixed(2)}
                    </div>
                  </div>
                  <div className="font-bold text-slate-900">${Number(it.subtotal).toFixed(2)}</div>
                </div>
              ))
            ) : (
              <div className="text-center text-slate-400 text-[10px] py-2">No items listed</div>
            )}
          </div>

          {/* Totals */}
          <div className="space-y-1 text-right text-[11px]">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span>${Number(sale.subtotal || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Tax:</span>
              <span>${Number(sale.tax_amount || 0).toFixed(2)}</span>
            </div>
            {Number(sale.discount_amount || 0) > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Discount:</span>
                <span>-${Number(sale.discount_amount).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-sm pt-1 border-t border-slate-900 text-slate-950">
              <span>TOTAL DUE:</span>
              <span>${Number(sale.total_amount || 0).toFixed(2)}</span>
            </div>
          </div>

          {sale.interaction_override_reason && (
            <div className="text-[9px] bg-amber-50 p-1.5 rounded border border-amber-200 text-amber-900 mt-2">
              <span className="font-bold">Clinical Override Note:</span> {sale.interaction_override_reason}
            </div>
          )}

          <div className="text-center text-[10px] text-slate-500 pt-2 border-t border-dashed border-slate-300">
            <div>Thank you for choosing SPMS Pharmacy Care!</div>
            <div className="text-[9px] text-slate-400 mt-0.5">Retain receipt for returns/warranty. Hotline: 1-800-SPMS-RX</div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={handlePrint}
            className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all active:scale-[0.98]"
          >
            <Printer className="w-4 h-4" />
            <span>Print Receipt</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
