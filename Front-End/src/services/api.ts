// src/services/api.ts

import axios, { AxiosResponse } from "axios";
import API_BASE from "@/config/api";

import {
  Ticket,
  TicketCategory,
  TicketStatus,
  CreateTicketPayload,
  User,
  MachineDetailsResponse,
} from "@/types";

// ================================
// AXIOS CLIENT
// ================================

export const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// ================================
// TOKEN HELPER
// ================================

const getToken = (): string => {
  try {
    const stored = localStorage.getItem("user");
    if (!stored) return "";

    const user = JSON.parse(stored);
    return user?.token || "";
  } catch (error) {
    console.error("Error parsing user:", error);
    localStorage.removeItem("user");
    return "";
  }
};

// ================================
// REQUEST INTERCEPTOR
// ================================

apiClient.interceptors.request.use(
  (config) => {
    const token = getToken();

    if (token && config.headers) {
      config.headers.Authorization = `Token ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ================================
// RESPONSE INTERCEPTOR
// ================================

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest?._retry) {
      originalRequest._retry = true;

      localStorage.removeItem("user");

      window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);

// ================================
// ERROR HANDLER
// ================================

const handleApiError = (error: unknown): never => {
  if (axios.isAxiosError(error)) {
    if (error.response) {
      const message =
        error.response.data?.detail ||
        error.response.data?.message ||
        error.response.data?.error ||
        error.response.statusText ||
        "Something went wrong";

      throw new Error(message);
    }

    if (error.request) {
      throw new Error("Cannot connect to server. Please check backend.");
    }

    throw new Error(error.message);
  }

  throw new Error("Unknown error occurred");
};

// ================================
// HELPERS
// ================================

const extractData = <T>(response: AxiosResponse): T => {
  return response.data?.results || response.data;
};

const normalizeAssignedTo = (assigned: any) => {
  if (!assigned) return null;

  return {
    content_type: "employee",
    object_id: Number(assigned.object_id),
  };
};

// ================================
// TICKETS
// ================================

export const getTicketCategories = async (): Promise<TicketCategory[]> => {
  try {
    const res = await apiClient.get("/ticket-categories/");
    return extractData<TicketCategory[]>(res);
  } catch (err) {
    return handleApiError(err);
  }
};

export const getTickets = async (): Promise<Ticket[]> => {
  try {
    const res = await apiClient.get("/tickets/");
    return extractData<Ticket[]>(res);
  } catch (err) {
    return handleApiError(err);
  }
};

export const getMachineDetails = async (params: {
  batch?: string;
  vin?: string;
}): Promise<MachineDetailsResponse> => {
  try {
    const query = new URLSearchParams();

    if (params.batch) query.append("batch", params.batch);
    if (params.vin) query.append("vin", params.vin);

    const res = await apiClient.get(`/machine-details/?${query.toString()}`);
    return res.data;
  } catch (err) {
    return handleApiError(err);
  }
};

export const createTicket = async (
  ticketData: CreateTicketPayload
): Promise<Ticket> => {
  try {
    if (ticketData.created_by) {
      ticketData.created_by = {
        content_type: ticketData.created_by.content_type,
        object_id: Number(ticketData.created_by.object_id),
      };
    }

    ticketData.assigned_to = normalizeAssignedTo(ticketData.assigned_to);

    const res = await apiClient.post("/tickets/", ticketData);
    return res.data;
  } catch (err) {
    return handleApiError(err);
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

    const res = await apiClient.patch(`/tickets/${id}/`, ticketData);
    return res.data;
  } catch (err) {
    return handleApiError(err);
  }
};

export const deleteTicket = async (id: number | string): Promise<void> => {
  try {
    await apiClient.delete(`/tickets/${id}/`);
  } catch (err) {
    return handleApiError(err);
  }
};

export const getUsers = async (): Promise<User[]> => {
  try {
    const res = await apiClient.get("/users/");
    return extractData<User[]>(res);
  } catch (err) {
    return handleApiError(err);
  }
};

// ================================
// PURCHASE APIs
// ================================

export const fetchDealers = async (): Promise<
  { id: number; name: string }[]
> => {
  try {
    const res = await apiClient.get("/dealers/");
    return res.data.results || res.data;
  } catch (err) {
    return handleApiError(err);
  }
};

export const itemSearch = async (query: string) => {
  try {
    const res = await apiClient.get("/purchase/items/search/", {
      params: { q: query },
    });

    return res.data;
  } catch (err) {
    return handleApiError(err);
  }
};

export const createOrder = async (data: any) => {
  try {
    const res = await apiClient.post("/purchase/orders/", data);
    return res.data;
  } catch (err) {
    return handleApiError(err);
  }
};

export const fetchOrders = async () => {
  try {
    const res = await apiClient.get("/purchase/orders/");
    return res.data;
  } catch (err) {
    return handleApiError(err);
  }
};

export const confirmOrder = async (
  orderId: number,
  confirmedQuantity: number
) => {
  try {
    const res = await apiClient.post(
      `/purchase/orders/${orderId}/confirm/`,
      {
        confirmed_quantity: confirmedQuantity,
      }
    );

    return res.data;
  } catch (err) {
    return handleApiError(err);
  }
};

export const fetchConfirmations = async (orderId: number) => {
  try {
    const res = await apiClient.get(
      `/purchase/orders/${orderId}/confirmations/`
    );

    return res.data;
  } catch (err) {
    return handleApiError(err);
  }
};