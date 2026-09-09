const API_BASE = '/api';

export const getAuthToken = () => localStorage.getItem('spms_token');
export const setAuthToken = (token) => localStorage.setItem('spms_token', token);
export const removeAuthToken = () => {
  localStorage.removeItem('spms_token');
  localStorage.removeItem('spms_user');
};
export const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem('spms_user'));
  } catch (e) {
    return null;
  }
};
export const setStoredUser = (user) => localStorage.setItem('spms_user', JSON.stringify(user));

export async function request(endpoint, options = {}) {
  const token = getAuthToken();
  const headers = {
    ...(options.headers || {}),
  };

  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // If not FormData, default content-type is json
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    // If unauthorized, clear token
    removeAuthToken();
    window.dispatchEvent(new CustomEvent('spms:unauthorized'));
  }

  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch (e) {
      errorData = { detail: response.statusText };
    }
    const err = new Error(errorData.detail?.message || errorData.detail || 'Request failed');
    err.status = response.status;
    err.data = errorData;
    throw err;
  }

  return response.json();
}

// Auth API
export const authApi = {
  login: (username, password, totp_code) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password, totp_code }),
    }),
  getMe: () => request('/auth/me'),
  setup2FA: () => request('/auth/2fa/setup', { method: 'POST' }),
  verify2FA: (code) => request('/auth/2fa/verify', { method: 'POST', body: JSON.stringify({ code }) }),
  disable2FA: () => request('/auth/2fa/disable', { method: 'POST' }),
  listUsers: () => request('/auth/users'),
  createUser: (userData) => request('/auth/users', { method: 'POST', body: JSON.stringify(userData) }),
  updateUser: (id, data) => request(`/auth/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteUser: (id) => request(`/auth/users/${id}`, { method: 'DELETE' }),
};

// Medicines & Inventory API
export const medicinesApi = {
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/medicines${query ? `?${query}` : ''}`);
  },
  get: (id) => request(`/medicines/${id}`),
  create: (data) => request('/medicines', { method: 'POST', body: JSON.stringify(data) }),
  delete: (id) => request(`/medicines/${id}`, { method: 'DELETE' }),
  addBatch: (medicineId, batchData) =>
    request(`/medicines/${medicineId}/batches`, { method: 'POST', body: JSON.stringify(batchData) }),
  adjustStock: (data) => request('/medicines/adjust-stock', { method: 'POST', body: JSON.stringify(data) }),
  getLowStockAlerts: () => request('/medicines/alerts/low-stock'),
  getExpiringAlerts: (days = 90) => request(`/medicines/alerts/expiring?days=${days}`),
};

// Point of Sale (POS) API
export const posApi = {
  checkout: (checkoutData) =>
    request('/pos/checkout', { method: 'POST', body: JSON.stringify(checkoutData) }),
  listSales: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/pos/sales${query ? `?${query}` : ''}`);
  },
  getSale: (id) => request(`/pos/sales/${id}`),
  getStaffSalesBreakdown: () => request('/pos/sales-staff-breakdown'),
};

// Prescriptions API
export const prescriptionsApi = {
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/prescriptions${query ? `?${query}` : ''}`);
  },
  upload: (formData) =>
    request('/prescriptions/upload', {
      method: 'POST',
      body: formData,
    }),
  previewOCR: (formData) =>
    request('/prescriptions/preview-ocr', {
      method: 'POST',
      body: formData,
    }),
  updateStatus: (id, newStatus) =>
    request(`/prescriptions/${id}/status?new_status=${newStatus}`, { method: 'PUT' }),
  dispenseAndCreateOrder: (id, data = {}) =>
    request(`/prescriptions/${id}/dispense-and-create-order`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  cleanupRetention: () => request('/prescriptions/retention/cleanup', { method: 'POST' }),
};

// Procurement & Purchase Orders API
export const procurementApi = {
  listPOs: (status) => request(`/purchase-orders${status ? `?status=${status}` : ''}`),
  createPO: (data) => request('/purchase-orders', { method: 'POST', body: JSON.stringify(data) }),
  approvePO: (id) => request(`/purchase-orders/${id}/approve`, { method: 'POST' }),
  receivePO: (id) => request(`/purchase-orders/${id}/receive`, { method: 'POST' }),
  listSuppliers: () => request('/purchase-orders/suppliers'),
  createSupplier: (data) =>
    request('/purchase-orders/suppliers', { method: 'POST', body: JSON.stringify(data) }),
};

// Clinical Interactions & AI API
export const interactionsApi = {
  check: (drugNames, patientAllergies) =>
    request('/interactions/check', {
      method: 'POST',
      body: JSON.stringify({ drug_names: drugNames, patient_allergies: patientAllergies }),
    }),
  consultAI: (prompt, contextDrugs = []) =>
    request('/interactions/consult-ai', {
      method: 'POST',
      body: JSON.stringify({ prompt, context_drugs: contextDrugs }),
    }),
};

// Audit Trail API
export const auditApi = {
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/audit${query ? `?${query}` : ''}`);
  },
  exportCsvUrl: () => `${API_BASE}/audit/export/csv`,
};

// Analytics API
export const analyticsApi = {
  getSummary: () => request('/analytics/summary'),
};

// Customers API
export const customersApi = {
  list: (search) => request(`/customers${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  create: (data) => request('/customers', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
};

// System Settings API
export const settingsApi = {
  getAI: () => request('/settings/ai'),
  updateAI: (geminiApiKey) =>
    request('/settings/ai', {
      method: 'POST',
      body: JSON.stringify({ gemini_api_key: geminiApiKey }),
    }),
  testAI: (apiKey = null) =>
    request('/settings/ai/test', {
      method: 'POST',
      body: JSON.stringify({ api_key: apiKey }),
    }),
};

