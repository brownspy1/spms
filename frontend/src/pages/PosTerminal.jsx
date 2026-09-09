import React, { useState, useEffect } from 'react';
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  AlertOctagon,
  CheckCircle,
  Printer,
  X,
  CreditCard,
  DollarSign,
  Smartphone,
  ShieldAlert,
  User,
  Barcode,
} from 'lucide-react';
import { medicinesApi, posApi, customersApi, interactionsApi } from '../services/api';
import ReceiptModal from '../components/ReceiptModal';

export default function PosTerminal({ currentUser }) {
  const [medicines, setMedicines] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [cart, setCart] = useState([]);
  const [taxPercent, setTaxPercent] = useState(5.0);
  const [discountAmount, setDiscountAmount] = useState(0.0);
  const [paymentMethod, setPaymentMethod] = useState('Cash');

  // Interaction Warning & Pharmacist Override
  const [interactionReport, setInteractionReport] = useState(null);
  const [overrideReason, setOverrideReason] = useState('');
  const [showOverrideModal, setShowOverrideModal] = useState(false);

  // Completed Receipt Modal
  const [completedSale, setCompletedSale] = useState(null);
  const [loadingCheckout, setLoadingCheckout] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    loadCatalog();
    loadCustomers();
  }, []);

  // Screen for interactions whenever cart or customer changes
  useEffect(() => {
    checkCartInteractions();
  }, [cart, selectedCustomerId]);

  const loadCatalog = async () => {
    try {
      const data = await medicinesApi.list();
      setMedicines(data);
    } catch (err) {
      console.error('Failed to load medicines:', err);
    }
  };

  const loadCustomers = async () => {
    try {
      const data = await customersApi.list();
      setCustomers(data);
    } catch (err) {
      console.error('Failed to load customers:', err);
    }
  };

  const checkCartInteractions = async () => {
    if (cart.length < 1) {
      setInteractionReport(null);
      return;
    }

    const drugNames = cart.map((item) => item.generic_name);
    const selectedCustomer = customers.find((c) => c.id === parseInt(selectedCustomerId));
    const allergies = selectedCustomer ? selectedCustomer.allergies : '';

    try {
      const report = await interactionsApi.check(drugNames, allergies);
      setInteractionReport(report);
    } catch (err) {
      console.error('Interaction check failed:', err);
    }
  };

  const addToCart = (med) => {
    if (med.total_stock <= 0) return;

    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.medicine_id === med.id);
      if (existing) {
        if (existing.quantity >= med.total_stock) return prevCart;
        return prevCart.map((item) =>
          item.medicine_id === med.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [
        ...prevCart,
        {
          medicine_id: med.id,
          brand_name: med.brand_name,
          generic_name: med.generic_name,
          strength: med.strength,
          dosage_form: med.dosage_form,
          unit_price: med.unit_price,
          total_stock: med.total_stock,
          quantity: 1,
        },
      ];
    });
  };

  const updateQuantity = (medicineId, change) => {
    setCart((prevCart) =>
      prevCart
        .map((item) => {
          if (item.medicine_id === medicineId) {
            const newQty = item.quantity + change;
            if (newQty <= 0) return null;
            if (newQty > item.total_stock) return item;
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  const removeFromCart = (medicineId) => {
    setCart((prevCart) => prevCart.filter((item) => item.medicine_id !== medicineId));
  };

  const clearCart = () => {
    setCart([]);
    setDiscountAmount(0);
    setOverrideReason('');
    setErrorMsg(null);
  };

  // Calculations
  const subtotal = cart.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  const taxAmount = (subtotal * taxPercent) / 100;
  const totalAmount = Math.max(0, subtotal + taxAmount - discountAmount);

  const categories = ['All', ...new Set(medicines.map((m) => m.category))];

  const filteredMedicines = medicines.filter((m) => {
    const matchesSearch =
      m.brand_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.generic_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.barcode && m.barcode.includes(searchQuery));
    const matchesCategory = selectedCategory === 'All' || m.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleCheckout = async (e) => {
    if (e) e.preventDefault();
    setErrorMsg(null);

    // If critical interaction exists and no override supplied, show override prompt
    if (interactionReport?.has_critical_warning && !overrideReason.trim()) {
      setShowOverrideModal(true);
      return;
    }

    setLoadingCheckout(true);
    try {
      const selectedCustomer = customers.find((c) => c.id === parseInt(selectedCustomerId));
      const payload = {
        items: cart.map((c) => ({ medicine_id: c.medicine_id, quantity: c.quantity })),
        customer_id: selectedCustomer ? selectedCustomer.id : null,
        customer_name: selectedCustomer ? selectedCustomer.name : 'Walk-in Customer',
        payment_method: paymentMethod,
        discount_amount: parseFloat(discountAmount) || 0,
        tax_percent: parseFloat(taxPercent) || 0,
        interaction_override_reason: overrideReason.trim() || null,
      };

      const sale = await posApi.checkout(payload);
      setCompletedSale(sale);
      clearCart();
      loadCatalog(); // Refresh inventory counts
    } catch (err) {
      setErrorMsg(err.message || 'Checkout failed.');
    } finally {
      setLoadingCheckout(false);
      setShowOverrideModal(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[calc(100vh-6rem)] lg:h-[calc(100vh-6rem)]">
      {/* LEFT: Product Catalog & Search (7 Cols) */}
      <div className="lg:col-span-7 flex flex-col gap-4 max-h-[500px] lg:max-h-none overflow-hidden">
        {/* Search & Category Header */}
        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by brand name, generic name, or barcode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition-all ${
                  selectedCategory === cat
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Medicines Grid */}
        <div className="flex-1 overflow-y-auto pr-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {filteredMedicines.map((med) => {
              const isOutOfStock = med.total_stock <= 0;
              const isLowStock = med.total_stock <= med.reorder_level;

              return (
                <div
                  key={med.id}
                  onClick={() => !isOutOfStock && addToCart(med)}
                  className={`bg-slate-900 border rounded-2xl p-4 flex flex-col justify-between transition-all cursor-pointer select-none ${
                    isOutOfStock
                      ? 'opacity-50 border-slate-800 cursor-not-allowed'
                      : 'border-slate-800 hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-950/20'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-white text-sm leading-tight">{med.brand_name}</h3>
                      <span className="text-emerald-400 font-bold text-sm">${med.unit_price.toFixed(2)}</span>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">{med.generic_name}</div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      {med.dosage_form} • {med.strength}
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-800/80">
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded-md font-medium border ${
                        isOutOfStock
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          : isLowStock
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      }`}
                    >
                      {isOutOfStock ? 'Out of Stock' : `${med.total_stock} in stock`}
                    </span>

                    <button
                      disabled={isOutOfStock}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-emerald-600 text-slate-300 hover:text-white transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* RIGHT: Cart, Interaction Warnings & Checkout (5 Cols) */}
      <div className="lg:col-span-5 bg-slate-900 rounded-2xl border border-slate-800 flex flex-col min-h-[500px] lg:h-full overflow-hidden">
        {/* Customer Selector & Cart Header */}
        <div className="p-4 border-b border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-emerald-400" />
              <h2 className="font-bold text-white text-sm">Dispensary Cart ({cart.length})</h2>
            </div>
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="text-xs text-rose-400 hover:text-rose-300 transition-colors"
              >
                Clear Cart
              </button>
            )}
          </div>

          {/* Customer Profile Picker */}
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="">Walk-in Customer (No Profile)</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.allergies ? `[Allergies: ${c.allergies}]` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* CLINICAL DRUG INTERACTION ALERT BANNER */}
        {interactionReport?.has_critical_warning && (
          <div className="p-3 bg-rose-950/40 border-y border-rose-500/30 text-rose-200 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-rose-300">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
              <span>Safety Alert: Dangerous Drug Interaction</span>
            </div>
            {interactionReport.interactions.map((it, idx) => (
              <div key={idx} className="bg-rose-900/30 p-2 rounded-lg border border-rose-800/40">
                <div className="font-semibold text-white">
                  {it.drug_a.toUpperCase()} + {it.drug_b.toUpperCase()} ({it.severity})
                </div>
                <div className="text-[11px] text-rose-200/90 mt-0.5">{it.clinical_effect}</div>
                <div className="text-[10px] text-amber-300 mt-1">Management: {it.management}</div>
              </div>
            ))}
            {interactionReport.allergy_warnings.map((al, idx) => (
              <div key={idx} className="bg-amber-900/30 p-2 rounded-lg text-amber-300 text-[11px]">
                {al}
              </div>
            ))}
          </div>
        )}

        {/* Cart Item List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs space-y-2">
              <ShoppingCart className="w-8 h-8 stroke-1 text-slate-600" />
              <span>Cart is empty. Select medicines from the catalog to dispense.</span>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.medicine_id}
                className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="font-medium text-white text-xs truncate">{item.brand_name}</div>
                  <div className="text-[11px] text-slate-400">{item.strength} • ${item.unit_price.toFixed(2)}/ea</div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 bg-slate-900 rounded-lg p-0.5 border border-slate-800">
                    <button
                      onClick={() => updateQuantity(item.medicine_id, -1)}
                      className="p-1 text-slate-400 hover:text-white"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-xs font-semibold px-2 text-white">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.medicine_id, 1)}
                      className="p-1 text-slate-400 hover:text-white"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="w-16 text-right font-bold text-xs text-white">
                    ${(item.quantity * item.unit_price).toFixed(2)}
                  </div>

                  <button
                    onClick={() => removeFromCart(item.medicine_id)}
                    className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Bill Summary & Payment Trigger */}
        <div className="p-4 bg-slate-950/80 border-t border-slate-800 space-y-3">
          <div className="space-y-1.5 text-xs text-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-400">Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Tax ({taxPercent}%)</span>
              <span>${taxAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Discount ($)</span>
              <input
                type="number"
                min="0"
                step="0.5"
                value={discountAmount}
                onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                className="w-16 text-right bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 text-xs text-white"
              />
            </div>
            <div className="flex justify-between text-base font-bold text-white pt-2 border-t border-slate-800">
              <span>Total Amount</span>
              <span className="text-emerald-400">${totalAmount.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="grid grid-cols-3 gap-2 text-xs">
            {['Cash', 'Card', 'Mobile'].map((method) => (
              <button
                key={method}
                type="button"
                onClick={() => setPaymentMethod(method)}
                className={`py-2 rounded-xl font-medium border transition-all flex items-center justify-center gap-1.5 ${
                  paymentMethod === method
                    ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
                }`}
              >
                {method === 'Cash' && <DollarSign className="w-3.5 h-3.5" />}
                {method === 'Card' && <CreditCard className="w-3.5 h-3.5" />}
                {method === 'Mobile' && <Smartphone className="w-3.5 h-3.5" />}
                <span>{method}</span>
              </button>
            ))}
          </div>

          {errorMsg && (
            <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
              {errorMsg}
            </div>
          )}

          <button
            disabled={cart.length === 0 || loadingCheckout}
            onClick={handleCheckout}
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2"
          >
            {loadingCheckout ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                <span>Complete Dispensing (${totalAmount.toFixed(2)})</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* MODAL: Pharmacist Interaction Override Modal */}
      {showOverrideModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/40 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400 font-bold text-base">
              <AlertOctagon className="w-6 h-6 shrink-0" />
              <span>Clinical Interaction Override Required</span>
            </div>
            <p className="text-slate-300 text-xs leading-relaxed">
              A high-severity clinical drug contraindication was detected among the selected medications.
              Under hospital and pharmacy regulatory standards, an explicit clinical justification must be documented in the immutable audit log before checkout can proceed.
            </p>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">
                Pharmacist Justification / Prescriber Verification Note:
              </label>
              <textarea
                rows={3}
                required
                placeholder="e.g., Prescribing cardiologist contacted; confirmed low-dose combination with INR monitoring scheduled..."
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowOverrideModal(false)}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white bg-slate-800"
              >
                Cancel
              </button>
              <button
                disabled={!overrideReason.trim()}
                onClick={() => handleCheckout()}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 disabled:opacity-50"
              >
                Sign & Authorize Dispensing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Printable Thermal Receipt */}
      {completedSale && (
        <ReceiptModal
          sale={completedSale}
          onClose={() => setCompletedSale(null)}
          title="Transaction Successful"
        />
      )}
    </div>
  );
}
