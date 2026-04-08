import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import PrivateRoute from "@/components/PrivateRoute";
import { UserRole } from "@/types";

// Auth Pages
import Login from "./pages/Login";
import Register from "./pages/Register";
import DealerRegister from "./pages/Dealerregister";
import Unauthorized from "./pages/Unauthorized";

// Dashboard + Feature Pages
import Dashboard from "./pages/Dashboard";
import MachineInstallation from "./pages/MachineInstallation";
import Machines from "./pages/Machines";
import MachineDetails from "./pages/MachineDetails";
import Tasks from "./pages/Tasks";
import Tickets from "./pages/Tickets";
import Companies from "./pages/Companies";
import Dealers from "./pages/Dealers";
import Users from "./pages/Users";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import DealerStock from "./pages/DealerStock";
import Purchaseorder from "./pages/Purchaseorder";   // ✅ already imported

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/dealerregister" element={<DealerRegister />} />
              <Route path="/unauthorized" element={<Unauthorized />} />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />

              {/* Authenticated Routes – Any logged‑in user */}
              <Route element={<PrivateRoute />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/machines" element={<Machines />} />
                <Route path="/machines/:id" element={<MachineDetails />} />
                <Route path="/tasks" element={<Tasks />} />
                <Route path="/tickets" element={<Tickets />} />
                <Route path="/profile" element={<Profile />} />
              </Route>

              {/* Dealer Stock – Admins, Company, Dealers */}
              <Route
                element={
                  <PrivateRoute
                    allowedRoles={[
                      UserRole.APPLICATION_ADMIN,
                      UserRole.COMPANY_ADMIN,
                      UserRole.COMPANY_EMPLOYEE,
                      UserRole.DEALER_ADMIN,
                      UserRole.DEALER_EMPLOYEE,
                    ]}
                  />
                }
              >
                <Route path="/dealer-stock" element={<DealerStock />} />
                {/* ✅ NEW: Purchase Orders route */}
                <Route path="/purchaseorder" element={<Purchaseorder />} />
              </Route>

              {/* Admin‑Only Routes (App / Company / Dealer Admin) */}
              <Route
                element={
                  <PrivateRoute
                    allowedRoles={[
                      UserRole.APPLICATION_ADMIN,
                      UserRole.COMPANY_ADMIN,
                      UserRole.DEALER_ADMIN,
                    ]}
                  />
                }
              >
                <Route path="/users" element={<Users />} />
                <Route path="/companies" element={<Companies />} />
                <Route path="/dealers" element={<Dealers />} />
              </Route>

              {/* Machine Installation – Admins + Employees */}
              <Route
                element={
                  <PrivateRoute
                    allowedRoles={[
                      UserRole.APPLICATION_ADMIN,
                      UserRole.COMPANY_ADMIN,
                      UserRole.COMPANY_EMPLOYEE,
                      UserRole.DEALER_ADMIN,
                      UserRole.DEALER_EMPLOYEE,
                    ]}
                  />
                }
              >
                <Route path="/machine-installation" element={<MachineInstallation />} />
              </Route>

              {/* 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}