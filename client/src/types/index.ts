// Core TypeScript interfaces for NexSpace healthcare scheduling platform

export type UserRole = "staff" | "facility_admin" | "superuser" | "super_admin" | "internal_employee" | "contractor_1099" | "facility_manager" | "client_administrator";

export type Specialty =
  | "RN"
  | "LPN"
  | "CNA"
  | "HCA"
  | "RT"
  | "PT"
  | "OT"
  | "ST"
  | "PharmTech"
  | "LabTech"
  | "RadTech"
  | "CST"
  | "Dietitian"
  | "SocialWorker"
  | "Chaplain"
  | "Maintenance"
  | "Housekeeping"
  | "Transport";

export type ShiftStatus = "draft" | "open" | "filled" | "in_progress" | "completed" | "cancelled";

export type AssignmentStatus = "pending" | "confirmed" | "declined" | "completed" | "no_show";

export interface User {
  id: number | string;
  username?: string;
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
  role: UserRole | string;
  specialty?: Specialty | string;
  facilityId?: number | null;
  facilityIds?: string[]; // Array of facility IDs user is associated with
  facilityUserId?: number; // ID from facility_users table for facility users
  associatedFacilities?: any;
  isActive?: boolean;
  phoneNumber?: string;
  avatar?: string | null;
  availabilityStatus?: string;
  dashboardPreferences?: any;
  onboardingCompleted?: boolean;
  onboardingStep?: number;
  calendarFeedToken?: string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  accountType?: string;
  isImpersonating?: boolean;
  userType?: string;
}

export type InsertUser = Omit<User, 'id' | 'createdAt' | 'updatedAt'> & {
  password: string;
}

// RBAC Types
export type SystemRole = 
  | "super_admin"
  | "facility_manager"
  | "facility_admin"
  | "scheduling_coordinator"
  | "hr_manager"
  | "billing_manager"
  | "supervisor"
  | "director_of_nursing"
  | "corporate"
  | "regional_director"
  | "staff"
  | "internal_employee"
  | "contractor_1099"
  | "client_administrator"
  | "viewer";

export type Permission = string;

export interface RoleMetadata {
  name: string;
  label?: string;
  description: string;
  permissions: Permission[];
  color?: string;
}

export const ROLE_PERMISSIONS: Record<SystemRole, Permission[]> = {
  super_admin: ["*"],
  facility_manager: ["facilities.*", "shifts.*", "staff.view"],
  facility_admin: ["facilities.*", "shifts.*", "staff.*"],
  scheduling_coordinator: ["shifts.*", "staff.view"],
  hr_manager: ["staff.*", "profile.*"],
  billing_manager: ["billing.*", "invoices.*"],
  supervisor: ["shifts.view", "staff.view"],
  director_of_nursing: ["shifts.*", "staff.*", "compliance.*"],
  corporate: ["*"],
  regional_director: ["facilities.*", "analytics.*"],
  staff: ["shifts.view", "shifts.request", "profile.*"],
  internal_employee: ["shifts.view", "profile.*"],
  contractor_1099: ["shifts.view", "profile.*"],
  client_administrator: ["facilities.*", "shifts.*", "staff.*"],
  viewer: []
};

export const ROLE_METADATA: Record<SystemRole, RoleMetadata> = {
  super_admin: {
    name: "Super Admin",
    label: "Super Admin",
    description: "Full system access",
    permissions: ROLE_PERMISSIONS.super_admin,
    color: "red"
  },
  facility_manager: {
    name: "Facility Manager",
    label: "Facility Manager",
    description: "Manage facilities and shifts",
    permissions: ROLE_PERMISSIONS.facility_manager,
    color: "blue"
  },
  facility_admin: {
    name: "Facility Admin",
    label: "Facility Admin",
    description: "Facility administration",
    permissions: ROLE_PERMISSIONS.facility_admin,
    color: "blue"
  },
  scheduling_coordinator: {
    name: "Scheduling Coordinator",
    label: "Scheduling",
    description: "Manage shift scheduling",
    permissions: ROLE_PERMISSIONS.scheduling_coordinator,
    color: "green"
  },
  hr_manager: {
    name: "HR Manager",
    label: "HR",
    description: "Human resources management",
    permissions: ROLE_PERMISSIONS.hr_manager,
    color: "purple"
  },
  billing_manager: {
    name: "Billing Manager",
    label: "Billing",
    description: "Billing and invoicing",
    permissions: ROLE_PERMISSIONS.billing_manager,
    color: "yellow"
  },
  supervisor: {
    name: "Supervisor",
    label: "Supervisor",
    description: "Team supervision",
    permissions: ROLE_PERMISSIONS.supervisor,
    color: "orange"
  },
  director_of_nursing: {
    name: "Director of Nursing",
    label: "DON",
    description: "Nursing department leadership",
    permissions: ROLE_PERMISSIONS.director_of_nursing,
    color: "indigo"
  },
  corporate: {
    name: "Corporate",
    label: "Corporate",
    description: "Corporate management",
    permissions: ROLE_PERMISSIONS.corporate,
    color: "red"
  },
  regional_director: {
    name: "Regional Director",
    label: "Regional",
    description: "Regional oversight",
    permissions: ROLE_PERMISSIONS.regional_director,
    color: "teal"
  },
  staff: {
    name: "Staff",
    label: "Staff",
    description: "Basic staff member",
    permissions: ROLE_PERMISSIONS.staff,
    color: "gray"
  },
  internal_employee: {
    name: "Internal Employee",
    label: "Employee",
    description: "Company employee",
    permissions: ROLE_PERMISSIONS.internal_employee,
    color: "gray"
  },
  contractor_1099: {
    name: "Contractor",
    label: "Contractor",
    description: "Independent contractor",
    permissions: ROLE_PERMISSIONS.contractor_1099,
    color: "gray"
  },
  client_administrator: {
    name: "Client Administrator",
    label: "Client Admin",
    description: "Client facility administrator",
    permissions: ROLE_PERMISSIONS.client_administrator,
    color: "blue"
  },
  viewer: {
    name: "Viewer",
    label: "Viewer",
    description: "Read-only access",
    permissions: ROLE_PERMISSIONS.viewer,
    color: "gray"
  }
};

// Helper functions for permission checking
export function hasPermission(role: SystemRole, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role] || [];
  if (permissions.includes("*")) return true;
  if (permissions.includes(permission)) return true;
  
  // Check for wildcard permissions (e.g., "facilities.*")
  const permissionParts = permission.split(".");
  for (let i = permissionParts.length; i > 0; i--) {
    const wildcardPermission = permissionParts.slice(0, i - 1).concat("*").join(".");
    if (permissions.includes(wildcardPermission)) return true;
  }
  
  return false;
}

export function hasAnyPermission(role: SystemRole, permissions: Permission[]): boolean {
  return permissions.some(permission => hasPermission(role, permission));
}

export function hasAllPermissions(role: SystemRole, permissions: Permission[]): boolean {
  return permissions.every(permission => hasPermission(role, permission));
}

export interface Facility {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phoneNumber: string;
  email?: string;
  bedCount: number;
  facilityType: "hospital" | "nursing_home" | "assisted_living" | "rehab_center" | "clinic";
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Shift {
  id: string;
  title: string;
  facilityId: string;
  specialty: Specialty;
  date: string; // YYYY-MM-DD format
  startTime: string; // HH:mm format (24-hour)
  endTime: string; // HH:mm format (24-hour)
  requiredWorkers: number;
  assignedWorkerIds: string[];
  status: ShiftStatus;
  description?: string;
  requirements?: string[];
  payRate?: number;
  createdAt: Date;
  updatedAt: Date;
  // Backend assignment tracking fields
  assignedStaff?: AssignedWorker[];
  filledPositions?: number;
  totalPositions?: number;
  minStaff?: number;
}

// Backend assigned worker structure
export interface AssignedWorker {
  id: number;
  name: string;
  firstName: string;
  lastName: string;
  specialty: Specialty;
  rating: number;
  email: string;
  avatar?: string;
}

export interface Assignment {
  id: string;
  userId: string;
  shiftId: string;
  status: AssignmentStatus;
  assignedAt: Date;
  updatedAt: Date;
  notes?: string;
}

// Utility types for working with shifts
export interface ShiftWithDetails extends Shift {
  facility: Facility;
  assignedWorkers: User[];
  availableWorkers?: User[];
}

export interface ShiftsBySpecialty {
  [specialty: string]: Shift[];
}

export interface ShiftsByDate {
  [date: string]: Shift[];
}

// Filter interfaces for complex queries
export interface ShiftFilters {
  facilityId?: string;
  specialty?: Specialty;
  status?: ShiftStatus;
  dateFrom?: string;
  dateTo?: string;
  workerId?: string;
}

export interface UserFilters {
  role?: UserRole;
  specialty?: Specialty;
  facilityId?: string;
  isActive?: boolean;
}

// Additional types for components
export interface Credential {
  id: string;
  userId: string;
  type: string;
  name: string;
  expirationDate?: Date;
  status: 'active' | 'expired' | 'pending';
  verifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Job {
  id: string;
  title: string;
  facilityId: string;
  department?: string;
  description: string;
  requirements?: string[];
  salary?: string;
  status: 'open' | 'closed' | 'filled';
  postedAt: Date;
  closingDate?: Date;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId?: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}
