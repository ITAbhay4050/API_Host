import { useState, useMemo, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/Layout/DashboardLayout";
import { useAuth } from "@/context/AuthContext";
import React from "react"; // Import React for React.Fragment

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Building2,
  UserCircle,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import {
  User,
  UserRole,
  Company,
  Dealer,
  UserStatus,
} from "@/types";
import { toast } from "@/components/ui/use-toast";

/* ------------------------------------------------------------------ */
/* ENV / HELPERS                                                      */
/* ------------------------------------------------------------------ */
const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000/api";
const makeAuthHeaders = (token?: string) =>
  token
    ? { Authorization: `Token ${token}`, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" };

const normaliseDealer = (d: any): Dealer => ({
  id: String(d.id),
  companyId: String(d.company),
  name: d.name,
  contactPerson: d.contact_person ?? d.name,
  contactEmail: d.email,
  contactPhone: d.phone,
  address: d.address,
  gstNumber: d.gst_number,
});

const normaliseEmployee = (e: any): User => ({
  id: String(e.id),
  name: e.name,
  email: e.email,
  phone: e.phone,
  username: e.email.split("@")[0],
  role: e.role as UserRole,
  department: e.department,
  status: e.is_active ? UserStatus.ACTIVE : UserStatus.INACTIVE,
  companyId: e.company ? String(e.company) : undefined,
  dealerId: e.dealer ? String(e.dealer) : undefined,
  createdAt: e.created_at,
});

const normaliseCompany = (c: any): Company => ({
  id: String(c.id),
  name: c.name,
  address: c.address,
  city: c.city,
  state: c.state,
  country: c.country,
  pinCode: c.pin_code,
  contactPerson: c.contact_person,
  contactEmail: c.contact_email,
  contactPhone: c.contact_phone,
  gstNumber: c.gst_number,
  panNumber: c.pan_number,
  status: c.is_active ? UserStatus.ACTIVE : UserStatus.INACTIVE,
  createdAt: c.created_at,
});

/* ------------------------------------------------------------------ */
/* ROLE HELPERS                                                       */
/* ------------------------------------------------------------------ */
export const roleOptions: { value: UserRole; label: string }[] = [
  { value: UserRole.APPLICATION_ADMIN, label: "System Admin" },
  { value: UserRole.COMPANY_ADMIN, label: "Company Admin" },
  { value: UserRole.COMPANY_EMPLOYEE, label: "Company Employee" },
  { value: UserRole.DEALER_ADMIN, label: "Dealer Admin" },
  { value: UserRole.DEALER_EMPLOYEE, label: "Dealer Employee" },
];

const getRoleName = (role: UserRole) =>
  roleOptions.find((r) => r.value === role)?.label ?? "User";

const getRoleBadgeColor = (role: UserRole) => {
  switch (role) {
    case UserRole.APPLICATION_ADMIN:
      return "bg-red-100 text-red-800";
    case UserRole.COMPANY_ADMIN:
      return "bg-blue-100 text-blue-800";
    case UserRole.COMPANY_EMPLOYEE:
      return "bg-green-100 text-green-800";
    case UserRole.DEALER_ADMIN:
      return "bg-purple-100 text-purple-800";
    case UserRole.DEALER_EMPLOYEE:
      return "bg-orange-100 text-orange-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

/* ------------------------------------------------------------------ */
/* Dealer Search Component                                            */
/* ------------------------------------------------------------------ */
const DealerSearch = ({
  dealers,
  onSelect,
  value,
}: {
  dealers: Dealer[];
  onSelect: (dealerId: string) => void;
  value?: string;
}) => {
  const [searchTerm, setSearchTerm] = useState(
    value ? dealers.find(d => d.id === value)?.name || "" : ""
  );
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  useEffect(() => {
    // Update searchTerm if value prop changes (e.g., when a user is edited, or form reset)
    setSearchTerm(value ? dealers.find(d => d.id === value)?.name || "" : "");
  }, [value, dealers]);

  const filteredDealers = useMemo(() => {
    if (searchTerm.length < 2) return [];

    const term = searchTerm.toLowerCase();
    return dealers.filter((dealer) => {
      return (
        dealer.name.toLowerCase().includes(term) ||
        (dealer.contactEmail && dealer.contactEmail.toLowerCase().includes(term)) ||
        (dealer.contactPhone && dealer.contactPhone.toLowerCase().includes(term)) ||
        (dealer.gstNumber && dealer.gstNumber.toLowerCase().includes(term))
      );
    });
  }, [searchTerm, dealers]);

  const handleSelect = (dealerId: string) => {
    onSelect(dealerId);
    setSearchTerm(dealers.find(d => d.id === dealerId)?.name || "");
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIndex(prev =>
        prev < filteredDealers.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIndex(prev => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === "Enter" && focusedIndex >= 0) {
      e.preventDefault();
      handleSelect(filteredDealers[focusedIndex].id);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div className="relative">
      <Input
        placeholder="Search dealers by name, email, phone or GST..."
        value={searchTerm}
        onChange={(e) => {
          setSearchTerm(e.target.value);
          setFocusedIndex(-1);
          if (e.target.value.length >= 2) {
            setIsOpen(true);
          } else {
            setIsOpen(false);
          }
        }}
        onFocus={() => searchTerm.length >= 2 && setIsOpen(true)}
        onBlur={() => setTimeout(() => setIsOpen(false), 200)}
        onKeyDown={handleKeyDown}
      />

      {isOpen && (
        <div className="absolute z-10 bg-white border border-gray-200 rounded-md shadow-lg mt-1 w-full max-h-60 overflow-y-auto">
          {filteredDealers.length > 0 ? (
            <ul>
              {filteredDealers.map((dealer, index) => (
                <li
                  key={dealer.id}
                  className={`px-4 py-2 cursor-pointer hover:bg-gray-100 ${
                    index === focusedIndex ? "bg-gray-100" : ""
                  }`}
                  onMouseDown={() => handleSelect(dealer.id)}
                  onMouseEnter={() => setFocusedIndex(index)}
                >
                  <div className="font-medium">{dealer.name}</div>
                  <div className="text-sm text-gray-500">
                    {dealer.contactEmail} | {dealer.contactPhone}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-4 py-2 text-gray-500">
              {searchTerm.length >= 2 ? "No dealers found" : "Type at least 2 characters to search"}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* UsersPage                                                          */
/* ------------------------------------------------------------------ */
const UsersPage = () => {
  const { user } = useAuth();
  const token = user?.token;

  /* ----------------------------- STATE ---------------------------- */
  const [users, setUsers] = useState<User[]>([]);
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]); // State for companies
  const [searchTerm, setSearchTerm] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // For Add User button
  const [isTableLoading, setIsTableLoading] = useState(false); // For overall table data

  type NewUserState = {
    name: string;
    email: string;
    phone: string;
    department?: string;
    password: string;
    confirmPassword: string;
    role: UserRole;
    companyId?: string;
    dealerId?: string;
  };

  const [newUser, setNewUser] = useState<NewUserState>({
    name: "",
    email: "",
    phone: "",
    department: "",
    password: "",
    confirmPassword: "",
    role:
      user?.role === UserRole.DEALER_ADMIN
        ? UserRole.DEALER_EMPLOYEE
        : UserRole.COMPANY_EMPLOYEE, // Default role based on current user
    companyId: user?.companyId ?? undefined, // Set only if available
    dealerId: user?.dealerId ?? undefined,
  });

  // Effect to set companyId for COMPANY_ADMIN when the dialog opens or user changes
  useEffect(() => {
    if (user?.role === UserRole.COMPANY_ADMIN && user.companyId) {
      setNewUser((prev) => ({
        ...prev,
        companyId: user.companyId,
        // If the company admin is setting a dealer-related role, and they already have a companyId
        // we might need to ensure the dealer selection is also within that company.
        // The DealerSearch component's filtering will handle this, but the initial state
        // should reflect the company admin's context.
      }));
    } else if (user?.role === UserRole.DEALER_ADMIN && user.dealerId) {
      // If dealer admin, pre-fill dealerId and infer companyId
      const associatedDealer = dealers.find(d => d.id === user.dealerId);
      setNewUser((prev) => ({
        ...prev,
        dealerId: user.dealerId,
        companyId: associatedDealer?.companyId,
      }));
    } else {
      // For Application Admin or other roles, reset company/dealer selection
      setNewUser((prev) => ({
        ...prev,
        companyId: undefined,
        dealerId: undefined,
      }));
    }
  }, [user, dealers, isAddDialogOpen]); // Added isAddDialogOpen to re-evaluate on dialog open

  /* ---------------------------- LOAD DATA ------------------------ */
  const loadCompanies = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/companies/`, {
        headers: makeAuthHeaders(token),
      });
      if (!res.ok) {
        throw new Error("Failed to fetch companies");
      }
      const json = await res.json();
      const fetchedCompanies = json.map(normaliseCompany);
      setCompanies(fetchedCompanies);
      return fetchedCompanies;
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load companies",
        variant: "destructive",
      });
      console.error("Error loading companies:", error);
      return [];
    }
  }, [token]);

  const loadDealers = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/dealers/`, {
        headers: makeAuthHeaders(token),
      });
      if (!res.ok) {
        throw new Error("Failed to fetch dealers");
      }
      const json = await res.json();
      const fetchedDealers = json.map(normaliseDealer);
      setDealers(fetchedDealers);
      return fetchedDealers; // Return the fetched dealers
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load dealers",
        variant: "destructive",
      });
      console.error("Error loading dealers:", error);
      return []; // Return empty array on error
    }
  }, [token]);

  const loadUsers = useCallback(async (currentDealers: Dealer[], currentCompanies: Company[]) => { // Accept dealers and companies as arguments
    setIsTableLoading(true); // Set table loading state
    try {
      const res = await fetch(`${API_BASE}/register/employee/`, {
        headers: makeAuthHeaders(token),
      });

      if (!res.ok) {
        throw new Error("Failed to fetch employees");
      }

      const json = await res.json();
      const allUsers = json.map(normaliseEmployee);

      let filtered: User[] = [];

      if (user?.role === UserRole.COMPANY_ADMIN && user.companyId) {
        // Get all dealer IDs belonging to the current user's company
        const dealerIdsOfCompany = currentDealers
          .filter((d) => d.companyId === user.companyId)
          .map((d) => d.id);

        filtered = allUsers.filter((u) => {
          return (
            // User belongs to the current company directly
            u.companyId === user.companyId ||
            // User is a dealer employee/admin and their dealer belongs to the current company
            (u.dealerId && dealerIdsOfCompany.includes(u.dealerId))
          );
        });
      } else if (user?.role === UserRole.DEALER_ADMIN && user.dealerId) {
        filtered = allUsers.filter(
          (u) => u.dealerId === user.dealerId
        );
      } else {
        filtered = allUsers; // System Admin or others see everything
      }

      setUsers(filtered);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load employees",
        variant: "destructive",
      });
      console.error("Error loading employees:", error);
    } finally {
      setIsTableLoading(false); // Reset table loading state
    }
  }, [token, user]);

  useEffect(() => {
    const fetchData = async () => {
      if (token) {
        const fetchedCompanies = await loadCompanies(); // Load companies first
        const fetchedDealers = await loadDealers(); // Then load dealers
        // Only proceed to load users if companies and dealers were successfully fetched or empty arrays were returned
        if (fetchedCompanies && fetchedDealers) {
          loadUsers(fetchedDealers, fetchedCompanies); // Pass both to loadUsers
        }
      }
    };
    fetchData();
  }, [token, loadCompanies, loadDealers, loadUsers]); // Ensure these dependencies are stable

  /* --------------------------- HELPERS --------------------------- */
  const dealerMap = useMemo(
    () => Object.fromEntries(dealers.map((d) => [d.id, d])),
    [dealers]
  );

  const companyMap = useMemo(
    () => Object.fromEntries(companies.map((c) => [c.id, c])),
    [companies]
  );

  const toggleExpansion = (id: string) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const canManageUsers =
    user?.role === UserRole.APPLICATION_ADMIN ||
    user?.role === UserRole.COMPANY_ADMIN ||
    user?.role === UserRole.DEALER_ADMIN;

  const companyDealers = useMemo(() => {
    // If user is company admin, only show dealers for their company
    if (user?.role === UserRole.COMPANY_ADMIN && user.companyId) {
      return dealers.filter((d) => d.companyId === user.companyId);
    }
    // If application admin, show all dealers
    return dealers;
  }, [dealers, user?.role, user?.companyId]);

  /* ------------------------- SEARCH ------------------------------ */
  const filteredUsers = useMemo(() => {
    if (!searchTerm.trim()) return users;

    const term = searchTerm.toLowerCase();
    const match = (s?: string) => s?.toLowerCase().includes(term);

    // First find all dealers that match the search criteria or belong to a company that matches
    const matchedDealerIds = new Set<string>();
    const matchedCompanyIds = new Set<string>();

    dealers.forEach(dealer => {
      if (
        match(dealer.name) ||
        match(dealer.contactPerson) ||
        match(dealer.contactEmail) ||
        match(dealer.contactPhone) ||
        match(dealer.gstNumber)
      ) {
        matchedDealerIds.add(dealer.id);
        if (dealer.companyId) matchedCompanyIds.add(dealer.companyId);
      }
    });

    companies.forEach(company => {
      if (
        match(company.name) ||
        match(company.contactPerson) ||
        match(company.contactEmail) ||
        match(company.contactPhone) ||
        match(company.gstNumber)
      ) {
        matchedCompanyIds.add(company.id);
      }
    });

    // Now filter users based on either:
    // 1. Direct user field match
    // 2. Belonging to a matched dealer
    // 3. Belonging to a matched company (for company-level users)
    return users.filter((u) => {
      const userDirectMatch = [u.name, u.email, u.username, u.department].some(match);

      const userDealerMatch = u.dealerId && matchedDealerIds.has(u.dealerId);

      const userCompanyMatch = u.companyId && matchedCompanyIds.has(u.companyId);

      // Special case: if a user is a dealer admin, and their dealer *itself* matched
      // or if user is a company admin, and their company *itself* matched.
      // This is generally covered by userDirectMatch, but explicit check can be helpful.
      const associatedEntityMatch =
        (u.role === UserRole.DEALER_ADMIN && u.dealerId && matchedDealerIds.has(u.dealerId)) ||
        (u.role === UserRole.COMPANY_ADMIN && u.companyId && matchedCompanyIds.has(u.companyId));


      return userDirectMatch || userDealerMatch || userCompanyMatch || associatedEntityMatch;
    });
  }, [users, dealers, companies, searchTerm]);


  const systemUsers = useMemo(
    () => filteredUsers.filter((u) => !u.companyId && !u.dealerId),
    [filteredUsers]
  );

  // This memo structures users by company and then by dealer for display
  const structuredUsers = useMemo(() => {
    const companiesData = new Map<string, { company: Company, users: User[], dealers: Map<string, { dealer: Dealer, users: User[] }> }>();

    // Initialize with all companies that have associated users or dealers that are in the filtered list
    // (This helps ensure companies are displayed even if only their dealers have matched users)
    // Also include companies that matched the search term directly
    [...filteredUsers, ...companies.filter(c => searchTerm.trim() && c.name.toLowerCase().includes(searchTerm.toLowerCase()))].forEach(item => {
      let companyId: string | undefined;
      if ('companyId' in item && item.companyId) { // For User and Dealer
        companyId = item.companyId;
      } else if ('id' in item && companies.some(c => c.id === item.id)) { // For Company itself
        companyId = item.id;
      }

      if (companyId && !companiesData.has(companyId)) {
        const company = companies.find(c => c.id === companyId);
        if (company) {
          companiesData.set(companyId, { company, users: [], dealers: new Map() });
        }
      }
    });

    // Populate dealers map within each company entry, ensuring all relevant dealers are present
    // especially if they matched the search, even if no users are directly under them yet.
    dealers.forEach(dealer => {
      if (dealer.companyId) {
        let companyEntry = companiesData.get(dealer.companyId);
        if (!companyEntry) {
          const company = companies.find(c => c.id === dealer.companyId);
          if (company) {
            companyEntry = { company, users: [], dealers: new Map() };
            companiesData.set(dealer.companyId, companyEntry);
          }
        }
        if (companyEntry && !companyEntry.dealers.has(dealer.id)) {
          companyEntry.dealers.set(dealer.id, { dealer, users: [] });
        }
      }
    });

    filteredUsers.forEach(user => {
      if (user.companyId) {
        const companyEntry = companiesData.get(user.companyId);
        if (companyEntry) {
          if (user.dealerId) {
            // Ensure the dealer entry exists before pushing the user
            if (!companyEntry.dealers.has(user.dealerId)) {
              const dealer = dealers.find(d => d.id === user.dealerId);
              if (dealer) {
                companyEntry.dealers.set(user.dealerId, { dealer, users: [] });
              }
            }
            companyEntry.dealers.get(user.dealerId)?.users.push(user);
          } else {
            companyEntry.users.push(user);
          }
        }
      }
    });

    return Array.from(companiesData.values())
      .sort((a, b) => a.company.name.localeCompare(b.company.name)); // Sort companies by name
  }, [filteredUsers, dealers, companies, searchTerm]);


  /* --------------------- CREATE / DELETE ------------------------- */
  const handleAddUser = async () => {
    if (
      !newUser.name ||
      !newUser.email ||
      !newUser.role ||
      !newUser.password ||
      !newUser.confirmPassword
    ) {
      toast({
        title: "Validation Error",
        description: "Please fill all required fields",
        variant: "destructive",
      });
      return;
    }

    if (newUser.password !== newUser.confirmPassword) {
      toast({
        title: "Validation Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    // Additional validation for company/dealer based on role
    if (
      (newUser.role === UserRole.COMPANY_ADMIN ||
        newUser.role === UserRole.COMPANY_EMPLOYEE) &&
      !newUser.companyId
    ) {
      toast({
        title: "Validation Error",
        description: "Company is required for this role",
        variant: "destructive",
      });
      return;
    }

    if (
      (newUser.role === UserRole.DEALER_ADMIN ||
        newUser.role === UserRole.DEALER_EMPLOYEE) &&
      !newUser.dealerId
    ) {
      toast({
        title: "Validation Error",
        description: "Dealer is required for this role",
        variant: "destructive",
      });
      return;
    }

    // If a dealer is selected, ensure the correct companyId is also set based on the dealer
    if (newUser.dealerId && !newUser.companyId) {
        const selectedDealer = dealers.find(d => d.id === newUser.dealerId);
        if (selectedDealer) {
            setNewUser(prev => ({ ...prev, companyId: selectedDealer.companyId }));
        }
    }


    setIsLoading(true);

    try {
      const payload: any = {
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        department: newUser.department,
        role: newUser.role,
        password: newUser.password,
      };

      // Only include company if the role requires it OR if a dealer is selected (which implies a company)
      if (
        newUser.role === UserRole.COMPANY_ADMIN ||
        newUser.role === UserRole.COMPANY_EMPLOYEE ||
        newUser.dealerId // If a dealer is selected, its company ID must be passed
      ) {
        payload.company = newUser.companyId;
      }

      // Only include dealer if the role requires it
      if (
        newUser.role === UserRole.DEALER_ADMIN ||
        newUser.role === UserRole.DEALER_EMPLOYEE
      ) {
        payload.dealer = newUser.dealerId;
      }

      const response = await fetch(`${API_BASE}/register/employee/`, {
        method: "POST",
        headers: makeAuthHeaders(token),
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        // const createdEmployee = await response.json(); // We don't need this specific object right now
        // Reload all users to ensure correct filtering and display after adding
        await loadUsers(dealers, companies); // Pass current dealers and companies to reload users

        toast({
          title: "Success",
          description: "Employee registered successfully",
        });

        // Reset form
        setNewUser({
          name: "",
          email: "",
          phone: "",
          department: "",
          password: "",
          confirmPassword: "",
          role:
            user?.role === UserRole.DEALER_ADMIN
              ? UserRole.DEALER_EMPLOYEE
              : UserRole.COMPANY_EMPLOYEE,
          companyId: user?.companyId, // Reset based on current user's context
          dealerId: user?.dealerId, // Reset based on current user's context
        });

        setIsAddDialogOpen(false);
      } else {
        const errorData = await response.json();
        // Improved error message handling from backend
        const errorMessage = Object.values(errorData).flat().join(", ") || "Failed to register employee";
        throw new Error(errorMessage);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to register employee",
        variant: "destructive",
      });
      console.error("Error registering employee:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteUser = useCallback(async (id: string) => {
    try {
      const response = await fetch(`${API_BASE}/employee/${id}/`, {
        method: "DELETE",
        headers: makeAuthHeaders(token),
      });

      if (response.ok) {
        setUsers(prev => prev.filter(user => user.id !== id));
        toast({
          title: "Success",
          description: "Employee deleted successfully",
        });
      } else {
        throw new Error("Failed to delete employee");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete employee",
        variant: "destructive",
      });
      console.error("Error deleting employee:", error);
    }
  }, [token]);

  /* -------------------------- ROW ------------------------------- */
  const UserRow = ({
    user: u,
    level = 0,
  }: {
    user: User;
    level?: number;
  }) => (
    <TableRow>
      <TableCell
        className="font-medium"
        style={{ paddingLeft: `${level * 20 + 16}px` }}
      >
        <div className="flex items-center gap-2">
          <UserCircle className="h-4 w-4 text-muted-foreground" />
          {u.name}
        </div>
      </TableCell>
      <TableCell>{u.email}</TableCell>
      <TableCell>
        <Badge className={getRoleBadgeColor(u.role)}>
          {getRoleName(u.role)}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          {/* Add Edit functionality here if needed */}
          <Button variant="outline" size="sm" disabled>
            <Edit className="h-4 w-4" />
          </Button>
          {canManageUsers && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDeleteUser(u.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );

  /* ------------------------------------------------------------------ */
  /* RENDER                                                             */
  /* ------------------------------------------------------------------ */
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* HEADER + ADD BUTTON */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              Users Management
            </h2>
            <p className="text-muted-foreground">
              {user?.role === UserRole.APPLICATION_ADMIN
                ? "Manage all users across companies and their dealers."
                : user?.role === UserRole.COMPANY_ADMIN
                ? `Manage users within ${companyMap[user.companyId!]?.name || 'your company'} and its dealers.`
                : user?.role === UserRole.DEALER_ADMIN
                ? `Manage users within ${dealerMap[user.dealerId!]?.name || 'your dealer'} organization.`
                : "View users."
                }
            </p>
          </div>

          {canManageUsers && (
            <Dialog
              open={isAddDialogOpen}
              onOpenChange={setIsAddDialogOpen}
            >
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" /> Add User
                </Button>
              </DialogTrigger>

              {/* -------------- ADD USER DIALOG -------------- */}
              <DialogContent className="sm:max-w-[500px] bg-gradient-to-br from-white to-blue-50 border rounded-xl shadow-lg">
                <DialogHeader>
                  <DialogTitle className="text-blue-700">
                    Add New User
                  </DialogTitle>
                  <DialogDescription>
                    Fill in the employee details below.
                  </DialogDescription>
                </DialogHeader>

                {/* ---------- FORM FIELDS ---------- */}
                <div className="grid gap-4 py-4">
                  {/* NAME */}
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">
                      Name
                    </Label>
                    <Input
                      id="name"
                      value={newUser.name}
                      onChange={(e) =>
                        setNewUser({ ...newUser, name: e.target.value })
                      }
                      className="col-span-3"
                      placeholder="Full name"
                      required
                    />
                  </div>

                  {/* EMAIL */}
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="email" className="text-right">
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={newUser.email}
                      onChange={(e) =>
                        setNewUser({ ...newUser, email: e.target.value })
                      }
                      className="col-span-3"
                      placeholder="user@example.com"
                      required
                    />
                  </div>

                  {/* PHONE */}
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="phone" className="text-right">
                      Phone
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={newUser.phone}
                      onChange={(e) =>
                        setNewUser({ ...newUser, phone: e.target.value })
                      }
                      className="col-span-3"
                      placeholder="+91-XXXXXXXXXX"
                    />
                  </div>

                  {/* DEPARTMENT */}
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="department" className="text-right">
                      Department
                    </Label>
                    <Input
                      id="department"
                      value={newUser.department}
                      onChange={(e) =>
                        setNewUser({
                          ...newUser,
                          department: e.target.value,
                        })
                      }
                      className="col-span-3"
                      placeholder="Optional"
                    />
                  </div>

                  {/* ROLE */}
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="role" className="text-right">
                      Role
                    </Label>
                    <Select
                      value={newUser.role}
                      onValueChange={(value) =>
                        setNewUser((prev) => {
                          const newRole = value as UserRole;
                          let updatedCompanyId = prev.companyId;
                          let updatedDealerId = prev.dealerId;

                          // Logic for handling companyId and dealerId based on selected role
                          if (newRole === UserRole.APPLICATION_ADMIN) {
                            updatedCompanyId = undefined;
                            updatedDealerId = undefined;
                          } else if (newRole === UserRole.COMPANY_ADMIN || newRole === UserRole.COMPANY_EMPLOYEE) {
                            updatedDealerId = undefined; // Clear dealer if switching to company-level role
                            if (user?.role === UserRole.COMPANY_ADMIN) {
                              updatedCompanyId = user.companyId; // Company Admin can only create users for their company
                            }
                          } else if (newRole === UserRole.DEALER_ADMIN || newRole === UserRole.DEALER_EMPLOYEE) {
                            if (user?.role === UserRole.DEALER_ADMIN) {
                              updatedDealerId = user.dealerId; // Dealer Admin can only create users for their dealer
                              // Also set companyId if dealerId is known and has an associated company
                              const associatedDealer = dealers.find(d => d.id === user.dealerId);
                              updatedCompanyId = associatedDealer?.companyId;
                            } else {
                              // If Application or Company Admin, dealer will be selected via DealerSearch,
                              // and the companyId will be inferred from the dealer.
                              // So, for now, we might clear companyId if no dealer is yet selected.
                              if (!prev.dealerId) { // Only clear if no dealer is pre-selected
                                updatedCompanyId = undefined;
                              }
                            }
                          }

                          return {
                            ...prev,
                            role: newRole,
                            companyId: updatedCompanyId,
                            dealerId: updatedDealerId,
                          };
                        })
                      }
                    >

                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        {roleOptions
                          .filter((o) => {
                            if (user?.role === UserRole.DEALER_ADMIN)
                              return o.value === UserRole.DEALER_EMPLOYEE;
                            if (user?.role === UserRole.COMPANY_ADMIN)
                              return (
                                o.value === UserRole.COMPANY_EMPLOYEE ||
                                o.value === UserRole.DEALER_EMPLOYEE ||
                                o.value === UserRole.DEALER_ADMIN
                              );
                            // Application Admin can create all roles
                            return true;
                          })
                          .map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                              {o.label}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* COMPANY (Visible for APPLICATION_ADMIN, or COMPANY_ADMIN adding company-level users) */}
                  {((user?.role === UserRole.APPLICATION_ADMIN && (newUser.role === UserRole.COMPANY_ADMIN || newUser.role === UserRole.COMPANY_EMPLOYEE || newUser.role === UserRole.DEALER_ADMIN || newUser.role === UserRole.DEALER_EMPLOYEE)) || // App Admin sees company for all company/dealer roles
                    (user?.role === UserRole.COMPANY_ADMIN && (newUser.role === UserRole.COMPANY_ADMIN || newUser.role === UserRole.COMPANY_EMPLOYEE || newUser.role === UserRole.DEALER_ADMIN || newUser.role === UserRole.DEALER_EMPLOYEE))) && ( // Company Admin sees company for all roles they can create
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="company" className="text-right">
                        Company
                      </Label>
                      <Select
                        value={newUser.companyId || ""}
                        onValueChange={(value) =>
                          setNewUser({ ...newUser, companyId: value, dealerId: undefined }) // Clear dealer when company changes
                        }
                        disabled={user?.role === UserRole.COMPANY_ADMIN || newUser.role === UserRole.DEALER_ADMIN || newUser.role === UserRole.DEALER_EMPLOYEE} // Disable if Company Admin or if a dealer role is selected (company derived from dealer)
                      >
                        <SelectTrigger className="col-span-3">
                          <SelectValue placeholder="Select company" />
                        </SelectTrigger>
                        <SelectContent>
                          {/* If Company Admin, only show their company */}
                          {user?.role === UserRole.COMPANY_ADMIN
                            ? companies
                                .filter(c => c.id === user.companyId)
                                .map((c) => (
                                  <SelectItem key={c.id} value={c.id}>
                                    {c.name}
                                  </SelectItem>
                                ))
                            : // If Application Admin, show all companies
                              companies.map((c) => (
                                <SelectItem key={c.id} value={c.id}>
                                  {c.name}
                                </SelectItem>
                              ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* DEALER (Visible for APPLICATION_ADMIN, or COMPANY_ADMIN adding dealer-level users) */}
                  {(user?.role === UserRole.APPLICATION_ADMIN || user?.role === UserRole.COMPANY_ADMIN) &&
                    (newUser.role === UserRole.DEALER_EMPLOYEE || newUser.role === UserRole.DEALER_ADMIN) && (
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="dealer" className="text-right">
                          Dealer
                        </Label>
                        <div className="col-span-3">
                          <DealerSearch
                            dealers={companyDealers.filter(d => !newUser.companyId || d.companyId === newUser.companyId)} // Filter dealers by selected company if a company is selected
                            onSelect={(dealerId) => setNewUser({ ...newUser, dealerId, companyId: dealerMap[dealerId]?.companyId })} // Auto-set company based on selected dealer
                            value={newUser.dealerId}
                          />
                        </div>
                      </div>
                    )}
                  {/* DEALER (Dealer Admin creating Dealer employees - pre-filled and disabled) */}
                  {user?.role === UserRole.DEALER_ADMIN &&
                    (newUser.role === UserRole.DEALER_EMPLOYEE || newUser.role === UserRole.DEALER_ADMIN) && ( // Ensure it shows for Dealer Admin creating other dealer roles
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="dealer" className="text-right">
                          Dealer
                        </Label>
                        <Input
                          id="dealer"
                          value={dealerMap[user.dealerId!]?.name || "Loading..."}
                          className="col-span-3"
                          disabled
                        />
                        {/* Hidden input to ensure dealerId is sent with form */}
                        <input type="hidden" name="dealerId" value={newUser.dealerId} />
                        <input type="hidden" name="companyId" value={newUser.companyId} /> {/* Also pass companyId for dealer admin */}
                      </div>
                    )}


                  {/* PASSWORD */}
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="password" className="text-right">
                      Password
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      value={newUser.password}
                      onChange={(e) =>
                        setNewUser({ ...newUser, password: e.target.value })
                      }
                      className="col-span-3"
                      placeholder="New password"
                      required
                    />
                  </div>

                  {/* CONFIRM PASSWORD */}
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="confirmPassword" className="text-right">
                      Confirm
                    </Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={newUser.confirmPassword}
                      onChange={(e) =>
                        setNewUser({
                          ...newUser,
                          confirmPassword: e.target.value,
                        })
                      }
                      className="col-span-3"
                      placeholder="Confirm password"
                      required
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    onClick={handleAddUser}
                    className="bg-blue-600 text-white hover:bg-blue-700"
                    disabled={isLoading}
                  >
                    {isLoading ? "Registering..." : "Register Employee"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* SEARCH BAR */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" /> Search Users / Dealers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              placeholder="Search by user name, email, or dealer details (name, contact, email, phone, GST)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-lg"
            />
          </CardContent>
        </Card>

        {/* USERS TABLE */}
        <Card>
          <CardHeader>
            <CardTitle>All Users</CardTitle>
          </CardHeader>
          <CardContent>
            {isTableLoading ? (
              <div className="flex justify-center items-center h-48">
                <p className="text-gray-500">Loading users...</p>
              </div>
            ) : filteredUsers.length === 0 && searchTerm === "" ? (
              <p className="text-gray-500 text-center py-8">No users found. Start by adding a new user!</p>
            ) : filteredUsers.length === 0 && searchTerm !== "" ? (
              <p className="text-gray-500 text-center py-8">No users match your search criteria.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Render System Admin users if applicable and not filtered out */}
                  {user?.role === UserRole.APPLICATION_ADMIN && systemUsers.length > 0 && (
                    <React.Fragment>
                      <TableRow className="bg-gray-50/70">
                        <TableCell colSpan={4} className="font-semibold text-gray-700">
                          System Users ({systemUsers.length})
                        </TableCell>
                      </TableRow>
                      {systemUsers.map((u) => (
                        <UserRow key={u.id} user={u} />
                      ))}
                    </React.Fragment>
                  )}

                  {/* Render Company/Dealer Users based on role and hierarchy */}
                  {(user?.role === UserRole.APPLICATION_ADMIN || user?.role === UserRole.COMPANY_ADMIN) &&
                    structuredUsers.map((companyData) => {
                      // Filter company data if current user is COMPANY_ADMIN
                      if (user?.role === UserRole.COMPANY_ADMIN && companyData.company.id !== user.companyId && companyData.users.length === 0 && Array.from(companyData.dealers.values()).every(d => d.users.length === 0)) {
                        return null; // Don't render companies the COMPANY_ADMIN is not authorized to see, especially if they have no relevant users
                      }

                      const compKey = `company-${companyData.company.id}`;
                      const totalCompanyUsers = companyData.users.length + Array.from(companyData.dealers.values()).reduce((sum, d) => sum + d.users.length, 0);

                      // Only render company section if it contains users (or if a search term is active)
                      if (totalCompanyUsers === 0 && !searchTerm) {
                          // This condition prevents rendering empty company sections when not searching.
                          // However, during search, if a company/dealer itself matches but has no matching *users*,
                          // we still want to show the company/dealer row, just with 0 users.
                          // So, we need to consider if the company or its dealers are part of the search results.
                          const companyOrDealerMatchedInSearch =
                            (searchTerm && (companyData.company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            dealers.some(d => d.companyId === companyData.company.id && (d.name.toLowerCase().includes(searchTerm.toLowerCase()))))) ||
                            totalCompanyUsers > 0; // Always show if there are users
                          if (!companyOrDealerMatchedInSearch) return null;
                      }

                      return (
                        <React.Fragment key={compKey}>
                          {/* Company Row */}
                          <TableRow className="bg-muted/30 cursor-pointer" onClick={() => toggleExpansion(compKey)}>
                            <TableCell
                              colSpan={4}
                              className="font-semibold text-gray-700"
                            >
                              <div className="flex items-center gap-2">
                                {expanded[compKey] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                <Building2 className="h-4 w-4" /> {companyData.company.name} ({totalCompanyUsers} users)
                              </div>
                            </TableCell>
                          </TableRow>

                          {/* Company Admin & Employee Users */}
                          {expanded[compKey] && companyData.users.map((u) => (
                            <UserRow key={u.id} user={u} level={1} />
                          ))}

                          {/* Dealers within this company */}
                          {expanded[compKey] && Array.from(companyData.dealers.values())
                            .sort((a, b) => a.dealer.name.localeCompare(b.dealer.name)) // Sort dealers by name
                            .map((dealerData) => {
                            const dealerKey = `dealer-${dealerData.dealer.id}`;
                            const totalDealerUsers = dealerData.users.length;

                            // Only render dealer section if it contains users (or if a search term is active and dealer matched)
                            if (totalDealerUsers === 0 && !searchTerm && !dealerMap[dealerData.dealer.id]?.name.toLowerCase().includes(searchTerm.toLowerCase())) return null;

                            return (
                              <React.Fragment key={dealerKey}>
                                {/* Dealer Row */}
                                <TableRow className="bg-blue-50/50 cursor-pointer" onClick={() => toggleExpansion(dealerKey)}>
                                  <TableCell
                                    colSpan={4}
                                    className="font-medium text-gray-700"
                                    style={{ paddingLeft: "40px" }}
                                  >
                                    <div className="flex items-center gap-2">
                                      {expanded[dealerKey] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                      <Building2 className="h-4 w-4 text-muted-foreground" /> {dealerData.dealer.name} ({totalDealerUsers} users)
                                    </div>
                                  </TableCell>
                                </TableRow>

                                {/* Dealer Employees */}
                                {expanded[dealerKey] && dealerData.users.map((u) => (
                                  <UserRow key={u.id} user={u} level={2} />
                                ))}
                              </React.Fragment>
                            );
                          })}
                        </React.Fragment>
                      );
                    })}

                  {/* Fallback for Dealer Admin who only sees their dealer's employees (already filtered by loadUsers) */}
                  {user?.role === UserRole.DEALER_ADMIN && filteredUsers.length > 0 && (
                    <React.Fragment>
                      <TableRow className="bg-gray-50/70">
                        <TableCell colSpan={4} className="font-semibold text-gray-700">
                          Your Dealer's Employees ({filteredUsers.length})
                        </TableCell>
                      </TableRow>
                      {filteredUsers.map((u) => (
                        <UserRow key={u.id} user={u} level={1} />
                      ))}
                    </React.Fragment>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default UsersPage;