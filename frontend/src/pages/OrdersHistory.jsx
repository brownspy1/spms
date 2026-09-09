import React, { useState, useEffect, useMemo } from 'react';
import {
  ClipboardList,
  Search,
  Calendar,
  Filter,
  DollarSign,
  TrendingUp,
  Receipt,
  User,
  Phone,
  CreditCard,
  FileText,
  Clock,
  ChevronDown,
  ChevronUp,
  RotateCw,
  Printer,
  Eye,
  CheckCircle2,
  AlertCircle,
  Users,
  Pill,
  Shield,
  X,
  Sparkles,
  ShoppingBag
} from 'lucide-react';
import { posApi, authApi } from '../services/api';
import ReceiptModal from '../components/ReceiptModal';

export default function OrdersHistory({ currentUser }) {
  const [sales, setSales] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [selectedStaffId, setSelectedStaffId] = useState('');

  // Staff list for filter dropdown
  const [staffList, setStaffList] = useState([]);

  // Selected sale for receipt reprint modal
  const [selectedSaleForReceipt, setSelectedSaleForReceipt] = useState(null);

  // Expandable row IDs
  const [expandedSaleIds, setExpandedSaleIds] = useState(new Set());

  // Staff sales breakdown modal
  const [showBreakdownModal, setShowBreakdownModal] = useState(false);
  const [breakdownData, setBreakdownData] = useState([]);
  const [breakdownLoading, setBreakdownLoading] = useState(false);
  const [activeStaffTab, setActiveStaffTab] = useState(null);

  const fetchSales = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const params = {};
      if (searchTerm.trim()) params.search = searchTerm.trim();
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      if (paymentMethod) params.payment_method = paymentMethod;
      if (selectedStaffId) params.user_id = selectedStaffId;
      params.limit = 100;

      const res = await posApi.listSales(params);
      if (res && res.sales) {
        setSales(res.sales);
        setTotalCount(res.total || res.sales.length);
      } else if (Array.isArray(res)) {
        setSales(res);
        setTotalCount(res.length);
      } else {
        setSales([]);
        setTotalCount(0);
      }
    } catch (err) {
      console.error('Failed to load orders history:', err);
      setErrorMsg(err.message || 'Failed to load sales history');
    } finally {
      setLoading(false);
    }
  };

  const loadStaffList = async () => {
    try {
      // If admin, we can load users list directly; otherwise load staff breakdown
      if (currentUser?.role === 'Admin') {
        const users = await authApi.listUsers();
        setStaffList(users);
      } else {
        const breakdown = await posApi.getStaffSalesBreakdown();
        setStaffList(breakdown.map((s) => ({
          id: s.user_id,
          full_name: s.full_name,
          username: s.username,
          role: s.role
        })));
      }
    } catch (err) {
      console.warn('Could not load staff list:', err);
    }
  };

  const handleOpenBreakdown = async () => {
    setShowBreakdownModal(true);
    setBreakdownLoading(true);
    try {
      const data = await posApi.getStaffSalesBreakdown();
      setBreakdownData(data || []);
      if (data && data.length > 0 && !activeStaffTab) {
        setActiveStaffTab(data[0].user_id);
      }
    } catch (err) {
      console.error('Failed to load staff breakdown:', err);
    } finally {
      setBreakdownLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
    loadStaffList();
  }, [paymentMethod, selectedStaffId]);

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    fetchSales();
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setDateFrom('');
    setDateTo('');
    setPaymentMethod('');
    setSelectedStaffId('');
    setTimeout(fetchSales, 0);
  };

  const toggleExpand = (id) => {
    setExpandedSaleIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Aggregated stats from current results
  const stats = useMemo(() => {
    const totalRev = sales.reduce((acc, s) => acc + (Number(s.total_amount) || 0), 0);
    const avgOrder = sales.length ? totalRev / sales.length : 0;
    const rxOrders = sales.filter((s) => s.prescription_id).length;
    return {
      totalRevenue: totalRev,
      ordersCount: totalCount || sales.length,
      averageOrder: avgOrder,
      prescriptionOrders: rxOrders,
    };
  }, [sales, totalCount]);

  const selectedStaffMemberData = useMemo(() => {
    if (!activeStaffTab || !breakdownData.length) return null;
    return breakdownData.find((s) => s.user_id === activeStaffTab) || breakdownData[0];
  }, [activeStaffTab, breakdownData]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 md:p-6 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-600/30">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">
              Orders & Sales History
            </h1>
            <p className="text-xs md:text-sm text-slate-400">
              Audit log of sold medications, customer records, dispenser tracking, and reprintable receipts.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Staff Sales Breakdown Button (Admin / Pharmacist) */}
          {(currentUser?.role === 'Admin' || currentUser?.role === 'Pharmacist') && (
            <button
              onClick={handleOpenBreakdown}
              className="px-3.5 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white text-xs font-semibold flex items-center gap-2 transition-colors border border-emerald-500/30 shadow-sm"
              title="View which staff member sold which medicines, customers, and revenue"
            >
              <Users className="w-4 h-4" />
              <span>Staff Sales & Medicine Audit</span>
            </button>
          )}

          <button
            onClick={fetchSales}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-2 transition-colors border border-slate-700 disabled:opacity-50"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Sales Volume</span>
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-white mt-2">
            ${stats.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-emerald-400/80 font-medium">Completed transactions</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Orders</span>
            <span className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
              <Receipt className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-white mt-2">
            {stats.ordersCount}
          </div>
          <span className="text-[11px] text-blue-400/80 font-medium">Invoices generated</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Avg Order Value</span>
            <span className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-white mt-2">
            ${stats.averageOrder.toFixed(2)}
          </div>
          <span className="text-[11px] text-purple-400/80 font-medium">Per checkout receipt</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Rx-Linked Orders</span>
            <span className="p-2 rounded-xl bg-teal-500/10 text-teal-400">
              <FileText className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-teal-300 mt-2">
            {stats.prescriptionOrders}
          </div>
          <span className="text-[11px] text-teal-400/80 font-medium">Auto-dispensed from OCR</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-3">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
          {/* Search Input */}
          <div className="lg:col-span-3 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search customer, phone, invoice..."
              className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Staff / Dispenser Filter */}
          <div className="lg:col-span-3 relative">
            <User className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3.5" />
            <select
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(e.target.value)}
              className="w-full pl-8 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-emerald-500 appearance-none"
            >
              <option value="">All Staff & Pharmacists</option>
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name || s.username} ({s.role})
                </option>
              ))}
            </select>
          </div>

          {/* Date From */}
          <div className="lg:col-span-2 relative">
            <Calendar className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3.5" />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full pl-8 pr-2 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
              title="From Date"
            />
          </div>

          {/* Date To */}
          <div className="lg:col-span-2 relative">
            <Calendar className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3.5" />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full pl-8 pr-2 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
              title="To Date"
            />
          </div>

          {/* Payment Method Filter */}
          <div className="lg:col-span-2 relative">
            <CreditCard className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3.5" />
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full pl-8 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-emerald-500 appearance-none"
            >
              <option value="">All Payments</option>
              <option value="Cash">Cash</option>
              <option value="Card">Card</option>
              <option value="Mobile">Mobile (bKash/Nagad)</option>
            </select>
          </div>
        </form>

        {/* Active Filter Indicators & Reset */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
            {selectedStaffId && (
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] flex items-center gap-1">
                <User className="w-3 h-3" />
                Staff Filter: {staffList.find((s) => s.id === parseInt(selectedStaffId))?.full_name || `#${selectedStaffId}`}
                <button onClick={() => setSelectedStaffId('')} className="hover:text-white ml-0.5">×</button>
              </span>
            )}
            {paymentMethod && (
              <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[11px] flex items-center gap-1">
                Payment: {paymentMethod}
                <button onClick={() => setPaymentMethod('')} className="hover:text-white ml-0.5">×</button>
              </span>
            )}
            {(dateFrom || dateTo) && (
              <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[11px] flex items-center gap-1">
                Dates: {dateFrom || 'Start'} to {dateTo || 'Today'}
                <button onClick={() => { setDateFrom(''); setDateTo(''); }} className="hover:text-white ml-0.5">×</button>
              </span>
            )}
          </div>

          {(searchTerm || dateFrom || dateTo || paymentMethod || selectedStaffId) && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs text-slate-400 hover:text-white underline transition-colors"
            >
              Clear All Filters
            </button>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {errorMsg && (
        <div className="bg-rose-950/40 border border-rose-800/80 rounded-2xl p-4 flex items-center gap-3 text-rose-300 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Sales History Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
            <span>Sales Orders Record</span>
            <span className="px-2 py-0.5 rounded-full text-[11px] bg-slate-800 text-emerald-400 font-mono">
              {sales.length} items
            </span>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center space-y-3">
            <RotateCw className="w-8 h-8 text-emerald-400 animate-spin mx-auto" />
            <p className="text-xs text-slate-400">Loading order records...</p>
          </div>
        ) : sales.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <Receipt className="w-12 h-12 text-slate-600 mx-auto" />
            <p className="text-sm font-medium text-slate-400">No completed orders found</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Completed transactions from the POS terminal or auto-dispensed prescriptions will be listed here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Invoice</th>
                  <th className="py-3 px-4">Customer / Patient</th>
                  <th className="py-3 px-4">Sold By (Staff)</th>
                  <th className="py-3 px-4">Medicines Summary</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Payment</th>
                  <th className="py-3 px-4 text-right">Total Amount</th>
                  <th className="py-3 px-4 text-center">Receipt & Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {sales.map((sale) => {
                  const isExpanded = expandedSaleIds.has(sale.id);
                  return (
                    <React.Fragment key={sale.id}>
                      <tr className="hover:bg-slate-800/40 transition-colors group">
                        {/* Invoice & Rx Tag */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-emerald-400">{sale.invoice_number}</span>
                            {sale.prescription_id && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-teal-500/20 text-teal-300 font-semibold border border-teal-500/30 flex items-center gap-1">
                                <FileText className="w-2.5 h-2.5" />
                                Rx #{sale.prescription_id}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Customer & Phone */}
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-slate-500" />
                            <span>{sale.customer_name || 'Walk-in Customer'}</span>
                          </div>
                          {sale.customer_phone ? (
                            <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                              <Phone className="w-3 h-3 text-emerald-500/70" />
                              <span>{sale.customer_phone}</span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-500 italic">No phone record</span>
                          )}
                        </td>

                        {/* Sold By (Staff / Pharmacist) */}
                        <td className="py-3 px-4">
                          <div>
                            <div className="font-semibold text-slate-200">{sale.cashier_name || 'SPMS Staff'}</div>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-medium inline-block mt-0.5 ${
                                sale.cashier_role === 'Admin'
                                  ? 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
                                  : sale.cashier_role === 'Pharmacist'
                                  ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-blue-500/10 text-blue-300 border border-blue-500/30'
                              }`}
                            >
                              {sale.cashier_role || 'Staff'}
                            </span>
                          </div>
                        </td>

                        {/* Medicines Quick Preview */}
                        <td className="py-3 px-4 max-w-xs">
                          <div className="text-slate-300 font-medium truncate">
                            {sale.items?.map((it) => `${it.medicine_name} (×${it.quantity})`).join(', ') || 'N/A'}
                          </div>
                          <span className="text-[10px] text-slate-500">{sale.items?.length || 0} items sold</span>
                        </td>

                        {/* Date */}
                        <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-500" />
                            <span>{new Date(sale.created_at).toLocaleDateString()}</span>
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {new Date(sale.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>

                        {/* Payment Method */}
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[11px] font-medium inline-block ${
                              sale.payment_method === 'Cash'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : sale.payment_method === 'Card'
                                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                            }`}
                          >
                            {sale.payment_method || 'Cash'}
                          </span>
                        </td>

                        {/* Total Amount */}
                        <td className="py-3 px-4 text-right">
                          <div className="font-bold text-sm text-emerald-400">
                            ${Number(sale.total_amount).toFixed(2)}
                          </div>
                          {Number(sale.discount_amount) > 0 && (
                            <div className="text-[10px] text-slate-500">
                              -${Number(sale.discount_amount).toFixed(2)} disc
                            </div>
                          )}
                        </td>

                        {/* Action buttons */}
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setSelectedSaleForReceipt(sale)}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600 hover:text-white font-medium text-xs flex items-center gap-1 transition-colors"
                              title="Reprint Thermal Receipt"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Receipt</span>
                            </button>
                            <button
                              onClick={() => toggleExpand(sale.id)}
                              className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                              title={isExpanded ? 'Collapse Items' : 'View Sold Items'}
                            >
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expandable Order Detail Rows */}
                      {isExpanded && (
                        <tr className="bg-slate-950/80 border-b border-slate-800/80">
                          <td colSpan={8} className="p-4">
                            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 space-y-3">
                              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                                <span className="font-semibold text-xs text-slate-300 flex items-center gap-1.5">
                                  <ClipboardList className="w-3.5 h-3.5 text-emerald-400" />
                                  <span>Dispensed Items for Invoice {sale.invoice_number} (Dispenser: {sale.cashier_name})</span>
                                </span>
                                {sale.interaction_override_reason && (
                                  <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded">
                                    Override: {sale.interaction_override_reason}
                                  </span>
                                )}
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                {sale.items && sale.items.length > 0 ? (
                                  sale.items.map((item, idx) => (
                                    <div
                                      key={idx}
                                      className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/70 text-xs flex justify-between items-center"
                                    >
                                      <div>
                                        <div className="font-semibold text-slate-200">{item.medicine_name}</div>
                                        <div className="text-[10px] text-slate-500">
                                          Batch #{item.batch_number} • Qty: {item.quantity}
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <div className="font-semibold text-emerald-400">
                                          ${Number(item.subtotal).toFixed(2)}
                                        </div>
                                        <div className="text-[9px] text-slate-500">
                                          @${Number(item.unit_price).toFixed(2)}/ea
                                        </div>
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <div className="text-xs text-slate-500 col-span-3">No item breakdown found</div>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/60">
                                <div>
                                  Subtotal: <span className="text-slate-200">${Number(sale.subtotal).toFixed(2)}</span>
                                  {' • '}
                                  Tax: <span className="text-slate-200">${Number(sale.tax_amount).toFixed(2)}</span>
                                  {Number(sale.discount_amount) > 0 && (
                                    <>
                                      {' • '}
                                      Discount: <span className="text-emerald-400">-${Number(sale.discount_amount).toFixed(2)}</span>
                                    </>
                                  )}
                                </div>
                                <div className="font-bold text-white text-xs">
                                  Grand Total: ${Number(sale.total_amount).toFixed(2)}
                                </div>
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
        )}
      </div>

      {/* Thermal Receipt Reprint Modal */}
      {selectedSaleForReceipt && (
        <ReceiptModal
          sale={selectedSaleForReceipt}
          onClose={() => setSelectedSaleForReceipt(null)}
          title="Sales Invoice & Receipt"
        />
      )}

      {/* MODAL: Staff Sales & Medicine Breakdown */}
      {showBreakdownModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full p-6 space-y-5 shadow-2xl max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Staff Sales & Medicine Audit</h2>
                  <p className="text-xs text-slate-400">
                    Which staff/pharmacist sold which medicines, to which customers, and total revenues
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowBreakdownModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {breakdownLoading ? (
              <div className="py-16 text-center space-y-2">
                <RotateCw className="w-8 h-8 text-emerald-400 animate-spin mx-auto" />
                <p className="text-xs text-slate-400">Calculating staff sales breakdown...</p>
              </div>
            ) : breakdownData.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                No staff sales records found in system.
              </div>
            ) : (
              <div className="space-y-4">
                {/* Staff Member Selector Pills */}
                <div className="flex flex-wrap gap-2">
                  {breakdownData.map((staff) => {
                    const isSelected = activeStaffTab === staff.user_id;
                    return (
                      <button
                        key={staff.user_id}
                        onClick={() => setActiveStaffTab(staff.user_id)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
                          isSelected
                            ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                            : 'bg-slate-950 text-slate-300 hover:bg-slate-800 border border-slate-800'
                        }`}
                      >
                        <User className="w-3.5 h-3.5" />
                        <span>{staff.full_name}</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {staff.role}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Selected Staff Member Details */}
                {selectedStaffMemberData && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    {/* KPI overview for this staff */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                        <span className="text-[11px] text-slate-400 block">Total Revenue Generated</span>
                        <div className="text-lg font-bold text-emerald-400 mt-1">
                          ${selectedStaffMemberData.total_revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                      <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                        <span className="text-[11px] text-slate-400 block">Completed Sales Count</span>
                        <div className="text-lg font-bold text-white mt-1">
                          {selectedStaffMemberData.total_sales_count} Transactions
                        </div>
                      </div>
                      <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                        <span className="text-[11px] text-slate-400 block">Unique Medicines Sold</span>
                        <div className="text-lg font-bold text-teal-300 mt-1">
                          {selectedStaffMemberData.medicines_sold.length} Drug Types
                        </div>
                      </div>
                    </div>

                    {/* Which medicines were sold by this staff */}
                    <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2">
                      <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                        <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                          <Pill className="w-4 h-4 text-emerald-400" />
                          <span>Medicines Sold by {selectedStaffMemberData.full_name}</span>
                        </h3>
                        <span className="text-[11px] text-slate-500 font-mono">
                          {selectedStaffMemberData.medicines_sold.length} Medicines
                        </span>
                      </div>

                      <div className="max-h-56 overflow-y-auto divide-y divide-slate-800/60">
                        {selectedStaffMemberData.medicines_sold.map((med, idx) => (
                          <div key={idx} className="py-2 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[10px] text-slate-400 font-mono">
                                {idx + 1}
                              </span>
                              <div>
                                <div className="font-semibold text-slate-200">{med.medicine_name}</div>
                                <div className="text-[10px] text-slate-500">Total Quantity Sold: {med.total_quantity} units</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-emerald-400">${med.total_revenue.toFixed(2)}</div>
                              <div className="text-[10px] text-slate-500">Revenue</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Which customers were served by this staff */}
                    <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2">
                      <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                        <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                          <User className="w-4 h-4 text-blue-400" />
                          <span>Customers Served by {selectedStaffMemberData.full_name}</span>
                        </h3>
                        <span className="text-[11px] text-slate-500 font-mono">
                          {selectedStaffMemberData.customers_served.length} Patients
                        </span>
                      </div>

                      <div className="max-h-48 overflow-y-auto divide-y divide-slate-800/60">
                        {selectedStaffMemberData.customers_served.map((cust, idx) => (
                          <div key={idx} className="py-2 flex items-center justify-between text-xs">
                            <div>
                              <div className="font-semibold text-slate-200">{cust.name}</div>
                              {cust.phone ? (
                                <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                                  <Phone className="w-2.5 h-2.5 text-emerald-400" />
                                  <span>{cust.phone}</span>
                                </div>
                              ) : (
                                <div className="text-[10px] text-slate-500 italic">No phone</div>
                              )}
                            </div>
                            <div className="text-right">
                              <div className="font-semibold text-slate-200">${cust.total_spent.toFixed(2)}</div>
                              <div className="text-[10px] text-slate-500">{cust.orders_count} transactions</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Filter Table Button */}
                    <div className="flex justify-end pt-2">
                      <button
                        onClick={() => {
                          setSelectedStaffId(selectedStaffMemberData.user_id.toString());
                          setShowBreakdownModal(false);
                        }}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/20"
                      >
                        <Filter className="w-3.5 h-3.5" />
                        <span>Filter Main Table for {selectedStaffMemberData.full_name}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
