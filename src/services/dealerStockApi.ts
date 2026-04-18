// dealerStockApi.ts
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use(
  (config) => {
    const stored = localStorage.getItem('user');
    let token = '';
    if (stored) {
      try {
        const user = JSON.parse(stored);
        token = user?.token || '';
      } catch (error) {
        console.error('Error parsing user data:', error);
        localStorage.removeItem('user');
      }
    }
    if (token && config.headers) {
      config.headers.Authorization = `Token ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !error.config?._retry) {
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

const handleApiError = (error: unknown): never => {
  if (axios.isAxiosError(error)) {
    const message =
      error.response?.data?.detail ||
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      'Something went wrong';
    throw new Error(message);
  }
  throw new Error('Unknown error');
};

// ========== Dealer Endpoints ==========
export const fetchAvailableStock = async (search = '') => {
  try {
    const params = search ? { search } : {};
    const response = await apiClient.get('/dealer-stock/available/', { params });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const saveSelectedStock = async (stockItems: any[]) => {
  try {
    const response = await apiClient.post('/dealer-stock/save-selection/', { stock_items: stockItems });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const removeStockSelection = async (batchNumber: string) => {
  try {
    const response = await apiClient.post('/dealer-stock/remove-selection/', { batch_number: batchNumber });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const fetchMyStock = async (search = '') => {
  try {
    const params = search ? { search } : {};
    const response = await apiClient.get('/dealer-stock/my-stock/', { params });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

// NEW: fetch dealer selection status (one‑time flag)
export const fetchDealerSelectionStatus = async () => {
  try {
    const response = await apiClient.get('/dealer-stock/selection-status/');
    return response.data; // expected: { hasSelected: boolean }
  } catch (error) {
    return handleApiError(error);
  }
};

// ========== Company/Admin Endpoints ==========
export const fetchCompanyStock = async (dealerId: number | null = null, search = '') => {
  try {
    const params: any = {};
    if (dealerId) params.dealer_id = dealerId;
    if (search) params.search = search;
    const response = await apiClient.get('/dealer-stock/company-view/', { params });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const addStockByCompany = async (dealerId: number, batchNumber: string) => {
  try {
    const response = await apiClient.post('/dealer-stock/company-add/', { dealer_id: dealerId, batch_number: batchNumber });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

// ========== Audit ==========
export const fetchStockAudit = async (stockId: number) => {
  try {
    const response = await apiClient.get(`/dealer-stock/audit/${stockId}/`);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

// ========== Sell & Return ==========
export const sellStock = async (batchNumber: string) => {
  try {
    const response = await apiClient.post('/dealer-stock/sell/', { batch_number: batchNumber });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const returnStock = async (batchNumber: string, reason: string) => {
  try {
    const response = await apiClient.post('/dealer-stock/return/', { batch_number: batchNumber, reason });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const fetchSoldStock = async (search = '') => {
  try {
    const params = search ? { search } : {};
    const response = await apiClient.get('/dealer-stock/sold/', { params });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};