import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User, UserRole } from "@/types";

export type AuthUser = User & {
  token: string;
  dealerId?: string;
  companyId?: string;
  gstNumber?: string;
  company_name?: string;
};

interface AuthContextType {
  user: AuthUser | null;
  setUser: (u: AuthUser | null) => void;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  registerDealer: (u: Partial<User>) => Promise<{ success: boolean; error?: string }>;
  registerCompany: (u: Partial<User>) => Promise<{ success: boolean; error?: string }>;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Use environment variable with fallback – ensure you have .env file
const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000/api";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse stored user", e);
        localStorage.removeItem("user");
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/login/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        let errorMsg = "Invalid credentials";
        try {
          const errData = await res.json();
          errorMsg = errData.error || errData.detail || errData.message || errorMsg;
        } catch (e) {
          // ignore
        }
        throw new Error(errorMsg);
      }

      const data = await res.json();

      const loggedInUser: AuthUser = {
        id: String(data.employee_id ?? data.dealer_id ?? data.company_id),
        name: data.name,
        email,
        role: data.role as UserRole,
        token: data.token,
        companyId: data.company_id ? String(data.company_id) : undefined,
        dealerId: data.dealer_id ? String(data.dealer_id) : undefined,
        gstNumber: data.gst_no || undefined,
        company_name: data.company_name,
      };

      localStorage.setItem("user", JSON.stringify(loggedInUser));
      setUser(loggedInUser);
      return { success: true };
    } catch (err: any) {
      console.error("Login failed:", err);
      let errorMessage = "Network error – cannot reach the server.";
      if (err.message === "Failed to fetch") {
        errorMessage = `Cannot connect to backend at ${API_BASE}. Please ensure the server is running and CORS is configured.`;
      } else if (err.message) {
        errorMessage = err.message;
      }
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("user");
    setUser(null);
  };

  const registerDealer = async (newUser: Partial<User>): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/dealers/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newUser, isDirect: true }),
      });
      if (!res.ok) {
        let errorMsg = "Registration failed";
        try {
          const errData = await res.json();
          errorMsg = errData.error || errData.detail || errorMsg;
        } catch (e) {}
        throw new Error(errorMsg);
      }
      return { success: true };
    } catch (err: any) {
      console.error("Dealer registration failed:", err);
      return { success: false, error: err.message || "Registration failed" };
    } finally {
      setIsLoading(false);
    }
  };

  const registerCompany = async (newUser: Partial<User>): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/register/company/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser),
      });
      if (!res.ok) {
        let errorMsg = "Registration failed";
        try {
          const errData = await res.json();
          errorMsg = errData.error || errData.detail || errorMsg;
        } catch (e) {}
        throw new Error(errorMsg);
      }
      return { success: true };
    } catch (err: any) {
      console.error("Company registration failed:", err);
      return { success: false, error: err.message || "Registration failed" };
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        login,
        logout,
        registerDealer,
        registerCompany,
        isAuthenticated: !!user,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
};