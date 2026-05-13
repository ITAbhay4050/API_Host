// dealerStockApi.ts
import axios from "axios";
import API_BASE from "../config/api";

// ==================== AXIOS CLIENT ====================

const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    "Content-Type": "application/json",
  },
});

// ==================== TOKEN ====================

const getToken = () => {
  try {
    const stored = localStorage.getItem("user");
    if (!stored) return "";

    const user = JSON.parse(stored);
    return user?.token || "";
  } catch (err) {
    localStorage.removeItem("user");
    return "";
  }
};

// ==================== INTERCEPTORS ====================

apiClient.interceptors.request.use((config) => {
  const token = getToken();

  if (token) {
    config.headers.Authorization = `Token ${token}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

// ==================== ERROR HANDLER ====================

const handleApiError = (error: unknown): never => {
  if (axios.isAxiosError(error)) {
    const msg =
      error.response?.data?.detail ||
      error.response?.data?.message ||
      error.message ||
      "Something went wrong";

    throw new Error(msg);
  }
  throw new Error("Unknown error");
};

// ==================== API FUNCTIONS ====================

export const fetchAvailableStock = async (search = "") => {
  try {
    const res = await apiClient.get("/dealer-stock/available/", {
      params: search ? { search } : {},
    });
    return res.data;
  } catch (err) {
    return handleApiError(err);
  }
};

export const saveSelectedStock = async (stockItems: any[]) => {
  try {
    const res = await apiClient.post("/dealer-stock/save-selection/", {
      stock_items: stockItems,
    });
    return res.data;
  } catch (err) {
    return handleApiError(err);
  }
};

export const removeStockSelection = async (batchNumber: string) => {
  try {
    const res = await apiClient.post("/dealer-stock/remove-selection/", {
      batch_number: batchNumber,
    });
    return res.data;
  } catch (err) {
    return handleApiError(err);
  }
};

export const fetchMyStock = async (search = "") => {
  try {
    const res = await apiClient.get("/dealer-stock/my-stock/", {
      params: search ? { search } : {},
    });
    return res.data;
  } catch (err) {
    return handleApiError(err);
  }
};

export const fetchDealerSelectionStatus = async () => {
  try {
    const res = await apiClient.get("/dealer-stock/selection-status/");
    return res.data;
  } catch (err) {
    return handleApiError(err);
  }
};

export const fetchCompanyStock = async (
  dealerId: number | null = null,
  search = ""
) => {
  try {
    const res = await apiClient.get("/dealer-stock/company-view/", {
      params: {
        ...(dealerId ? { dealer_id: dealerId } : {}),
        ...(search ? { search } : {}),
      },
    });
    return res.data;
  } catch (err) {
    return handleApiError(err);
  }
};

export const addStockByCompany = async (
  dealerId: number,
  batchNumber: string
) => {
  try {
    const res = await apiClient.post("/dealer-stock/company-add/", {
      dealer_id: dealerId,
      batch_number: batchNumber,
    });
    return res.data;
  } catch (err) {
    return handleApiError(err);
  }
};

export const fetchStockAudit = async (stockId: number) => {
  try {
    const res = await apiClient.get(`/dealer-stock/audit/${stockId}/`);
    return res.data;
  } catch (err) {
    return handleApiError(err);
  }
};

export const sellStock = async (batchNumber: string) => {
  try {
    const res = await apiClient.post("/dealer-stock/sell/", {
      batch_number: batchNumber,
    });
    return res.data;
  } catch (err) {
    return handleApiError(err);
  }
};

export const returnStock = async (batchNumber: string, reason: string) => {
  try {
    const res = await apiClient.post("/dealer-stock/return/", {
      batch_number: batchNumber,
      reason,
    });
    return res.data;
  } catch (err) {
    return handleApiError(err);
  }
};

export const fetchSoldStock = async (search = "") => {
  try {
    const res = await apiClient.get("/dealer-stock/sold/", {
      params: search ? { search } : {},
    });
    return res.data;
  } catch (err) {
    return handleApiError(err);
  }
};

export default apiClient;