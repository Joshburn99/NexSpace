// Core TypeScript interfaces for NexSpace healthcare scheduling platform

export type UserRole = "staff" | "facility_admin" | "superuser";

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
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  specialty?: Specialty;
  facilityIds: string[]; // Array of facility IDs user is associated with
  isActive: boolean;
  phoneNumber?: string;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
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
