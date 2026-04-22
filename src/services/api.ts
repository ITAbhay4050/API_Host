import axios from 'axios';
import { 
  Ticket, 
  TicketCategory, 
  TicketStatus, 
  CreateTicketPayload, 
  User,
  MachineDetailsResponse
} from '@/types';


const API_BASE = '/api/purchase';
const API_BASE_URL = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000/api";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptors (unchanged)
apiClient.interceptors.request.use(
  (config) => {
    const stored = localStorage.getItem('user');
    let token = '';

    if (stored) {
      try {
        const user = JSON.parse(stored);
        token = user?.token || '';
      } catch (error) {
        console.error("Error parsing user data:", error);
        localStorage.removeItem('user');
      }
    }

    if (token && config.headers) {
      config.headers['Authorization'] = `Token ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest?._retry) {
      originalRequest._retry = true;
      localStorage.removeItem('user');
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

const handleApiError = (error: unknown): never => {
  if (axios.isAxiosError(error)) {
    if (error.response) {
      console.log("API ERROR:", error.response.data);
      const message =
        error.response.data?.detail ||
        error.response.data?.message ||
        error.response.data?.error ||
        error.response.statusText ||
        'Something went wrong';
      throw new Error(message);
    } 
    else if (error.request) {
      throw new Error('No response from server');
    } 
    else {
      throw new Error(error.message);
    }
  }
  throw new Error('Unknown error');
};

const extractData = (response: any) => {
  return response.data?.results || response.data;
};

const normalizeAssignedTo = (assigned: any) => {
  if (!assigned) return null;
  return {
    content_type: "employee",
    object_id: Number(assigned.object_id)
  };
};

export const getTicketCategories = async (): Promise<TicketCategory[]> => {
  try {
    const response = await apiClient.get('/ticket-categories/');
    return extractData(response);
  } catch (error) {
    return handleApiError(error);
  }
};

export const getTickets = async (): Promise<Ticket[]> => {
  try {
    const response = await apiClient.get('/tickets/');
    return extractData(response);
  } catch (error) {
    return handleApiError(error);
  }
};

export const getMachineDetails = async (params: { batch?: string; vin?: string }): Promise<MachineDetailsResponse> => {
  try {
    const query = new URLSearchParams();
    if (params.batch) query.append('batch', params.batch);
    if (params.vin) query.append('vin', params.vin);
    const response = await apiClient.get(`/machine-details/?${query.toString()}`);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const createTicket = async (ticketData: CreateTicketPayload): Promise<Ticket> => {
  try {
    if (ticketData.created_by) {
      ticketData.created_by = {
        content_type: ticketData.created_by.content_type,
        object_id: Number(ticketData.created_by.object_id)
      };
    }
    ticketData.assigned_to = normalizeAssignedTo(ticketData.assigned_to);
    delete (ticketData as any).machine_installation;
    ticketData.category = Number(ticketData.category);

    const response = await apiClient.post('/tickets/', ticketData);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const updateTicket = async (
  id: number | string,
  ticketData: Partial<CreateTicketPayload> & {
    status?: TicketStatus;
    resolution_notes?: string;
    feedback_notes?: string;
    rating?: number;
  }
): Promise<Ticket> => {
  try {
    if (ticketData.assigned_to) {
      ticketData.assigned_to = normalizeAssignedTo(ticketData.assigned_to);
    }
    delete (ticketData as any).machine_installation;
    const response = await apiClient.patch(`/tickets/${id}/`, ticketData);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const deleteTicket = async (id: number | string): Promise<void> => {
  try {
    await apiClient.delete(`/tickets/${id}/`);
  } catch (error) {
    return handleApiError(error);
  }
};

export const getUsers = async (): Promise<User[]> => {
  try {
    const response = await apiClient.get('/users/');
    return extractData(response);
  } catch (error) {
    return handleApiError(error);
  }
};

// ========== Purchase Order Types ==========
export { apiClient };

export interface ItemMaster {
  itemname: string;
  itemcode: string;
  productcode: string;
}

export interface PurchaseOrder {
  id: number;
  dealer: number;
  dealer_name: string;
  item_name: string;
  item_code: string;
  product_code: string;
  order_quantity: number;
  pending_quantity: number;
  remarks: string;
  created_by_name: string;
  created_at: string;
  status: 'pending' | 'partially_completed' | 'completed';
}
export const fetchDealers = async (): Promise<{ id: number; name: string }[]> => {
  const response = await apiClient.get('/dealers/');
  // Your API may return data wrapped in 'results'
  return response.data.results || response.data;
};

export interface Confirmation {
  id: number;
  confirmed_quantity: number;
  confirmed_by_name: string;
  confirmed_at: string;
  pending_after: number;
}

// ========== Purchase Order API Calls ==========
export const itemSearch = async (query: string): Promise<ItemMaster[]> => {
  const res = await apiClient.get('/purchase/items/search/', { params: { q: query } });
  return res.data;
};

export const createOrder = async (data: {
  dealer_id?: number;          // required for company/system admin
  item_name: string;
  item_code: string;
  product_code: string;
  order_quantity: number;
  remarks: string;
}): Promise<PurchaseOrder> => {
  const res = await apiClient.post('/purchase/orders/', data);
  return res.data;
};

export const fetchOrders = async (): Promise<PurchaseOrder[]> => {
  const res = await apiClient.get('/purchase/orders/');
  return res.data;
};

export const confirmOrder = async (orderId: number, confirmedQuantity: number): Promise<any> => {
  const res = await apiClient.post(`/purchase/orders/${orderId}/confirm/`, { confirmed_quantity: confirmedQuantity });
  return res.data;
};

export const fetchConfirmations = async (orderId: number): Promise<Confirmation[]> => {
  const res = await apiClient.get(`/purchase/orders/${orderId}/confirmations/`);
  return res.data;
};