/* ------------------------------------------------------------------ *
 *  Shared Role & Status Enums
 * ------------------------------------------------------------------ */
export enum UserRole {
  APPLICATION_ADMIN  = "APPLICATION_ADMIN",
  COMPANY_ADMIN      = "COMPANY_ADMIN",
  COMPANY_EMPLOYEE   = "COMPANY_EMPLOYEE",
  DEALER_ADMIN       = "DEALER_ADMIN",
  DEALER_EMPLOYEE    = "DEALER_EMPLOYEE",
  SYSTEM_ADMIN = "SYSTEM_ADMIN",
}

export enum UserStatus {
  ACTIVE   = "ACTIVE",
  INACTIVE = "INACTIVE",
  PENDING  = "PENDING",
}
export enum TicketUrgency {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

export enum TicketStatus {
  OPEN = "open",
  IN_PROGRESS = "in_progress",   // ✅ FIXED
  RESOLVED = "resolved",
  CLOSED = "closed",
}
/* ------------------------------------------------------------------ *
 *  Core Entities
 * ------------------------------------------------------------------ */
export interface User {
  id: number;       // Numeric ID as per backend
  name: string;
  email: string;
  role: UserRole;

  phone?: string;
  username?: string;
  department?: string;
  status?: UserStatus;
  companyId?: string;
  dealerId?: string;
  profilePhoto?: string;
  createdAt?: string;
  lastLogin?: string;
  token?: string; 
  company_name?: string;   // JWT or session token for auth
}

/* ----------  Company  ---------- */
export interface Company {
  id: string;
  name: string;

  /* address & geo */
  address: string;
  city?: string;
  state?: string;
  country?: string;
  pinCode?: string;

  /* contact */
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;

  /* tax / compliance */
  gstNumber?: string;
  panNumber?: string;

  /* meta */
  status?: UserStatus;
  createdAt?: string;
}

/* ----------  Dealer  ---------- */
export interface Dealer {
  id: string;
  name: string;
  address: string;

  /* contact */
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;

  /* tax */
  gstNumber?: string;
  panNumber?: string;

  companyId: string;
  status?: UserStatus;
  createdAt?: string;
}

/* ------------------------------------------------------------------ *
 *  Machine & photo helpers
 * ------------------------------------------------------------------ */
export interface MachinePhoto {
  id: number;
  photo: string;  // relative URL from backend
}

/**
 * NOTE:
 * Backend JSON comes in *snake_case* (e.g. model_number, serial_number).
 * We therefore define those exact keys so TypeScript recognises them and
 * VS Code red underlines disappear. If you prefer camelCase on
 * the front‑end, map the response after fetch.
 */
export interface Machine {
  item_name: any;
  id: number;

  /* identifiers */
  model_number: string;
  serial_number: string;
  batch_number?: string | null;
  invoice_number?: string | null;

  /* installation */
  installation_date?: string | null;
  installed_by?: string | null;

  /* client / site info */
  client_company_name?: string | null;
  client_gst_number?: string | null;
  client_contact_person?: string | null;
  client_contact_phone?: string | null;
  location?: string | null;

  /* misc */
  notes?: string | null;
  photos: MachinePhoto[];

  /* status & meta */
  status: "pending" | "installed" | "servicing" | "decommissioned";
  created_at?: string;
}

/* ----------  Task  ---------- */
export interface Task {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  deadline: string;

  priority: "low" | "medium" | "high" | "urgent";
  status: "pending" | "in-progress" | "completed" | "cancelled";

  assignerId: string;
  assigneeId: string;

  /* machine linkage */
  machineId?: string;
  serialNumber?: string;
}

/* ----------  Ticket  ---------- */
export interface Ticket {
  id: string;
  machineId: string;
  serialNumber?: string;

  issueDescription: string;
  dateReported: string;

  reportedById: string;
  assignedToId?: string;

  status: "open" | "in-progress" | "resolved" | "closed";
  urgency: "low" | "medium" | "high" | "critical";
  resolutionNotes?: string;

  feedback?: {
    dealerAdminFeedback?: {
      satisfactionScore: number;
      comments: string;
      followUpNeeded: boolean;
      submittedAt: string;
      submittedBy: string;
    };
    dealerEmployeeFeedback?: {
      satisfactionScore: number;
      comments: string;
      followUpNeeded: boolean;
      submittedAt: string;
      submittedBy: string;
    };
  };

  dealerId?: string;
  createdAt?: string;
}
export interface GenericForeignKeyPayload {
  content_type: string;
  object_id: number;
}

export interface MachineDetailsResponse {
  item_name: string;
  item_code: string;
  invoice_number: string;
  purchase_date: string;
  remarks?: string;
  batch_number?: string;
  vin?: string;
  party_name?: string;
  gst_no?: string;
}

/* ------------------------------------------------------------------ *
 *  Access‑control helper
 * ------------------------------------------------------------------ */
export interface RoleAccess {
  role: UserRole;

  canAccessPages: string[];
  canManageUsers: boolean;
  canAssignTasks: boolean;
  canCreateTickets: boolean;
  canCloseTickets: boolean;
  canInstallMachines: boolean;
}
export interface TicketCategory {
  id: number;
  name: string;
}

// CreateTicketPayload Interface - payload sent for ticket creation

export interface CreateTicketPayload {
  title: string;
  description: string;
  category: number;
  batch_number?: string;
  vin?: string;
  item_name?: string;
  item_code?: string;
  invoice_number?: string;
  purchase_date?: string;
  remarks?: string;
  urgency: TicketUrgency;
  created_by: GenericForeignKeyPayload;
  assigned_to?: GenericForeignKeyPayload | null;
  machine_installation?: number | null;
}