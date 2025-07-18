import {
  pgTable,
  text,
  serial,
  integer,
  boolean,
  timestamp,
  decimal,
  jsonb,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enhanced Facility Management Types
export interface FloatPoolMargins {
  [specialty: string]: number; // e.g., { "Registered Nurse": 15.00, "CNA": 8.00 }
}

export interface SpecialtyRates {
  [specialty: string]: number; // e.g., { "Registered Nurse": 45.00, "LPN": 32.00 }
}

export interface WorkflowAutomationConfig {
  autoApproveShifts?: boolean;
  autoNotifyManagers?: boolean;
  autoGenerateInvoices?: boolean;
  requireManagerApproval?: boolean;
  enableOvertimeAlerts?: boolean;
  autoAssignBySpecialty?: boolean;
}

export interface ShiftManagementSettings {
  overtimeThreshold?: number; // hours before overtime kicks in
  maxConsecutiveShifts?: number;
  minHoursBetweenShifts?: number;
  allowBackToBackShifts?: boolean;
  requireManagerApprovalForOvertime?: boolean;
  autoCalculateOvertime?: boolean;
}

export interface StaffingTargets {
  [department: string]: {
    targetHours: number;
    minStaff: number;
    maxStaff: number;
    preferredStaffMix?: { [specialty: string]: number };
  };
}

export interface CustomRules {
  floatPoolRules?: {
    maxHoursPerWeek?: number;
    specialtyRestrictions?: string[];
    requireAdditionalTraining?: boolean;
  };
  overtimeRules?: {
    maxOvertimeHours?: number;
    overtimeApprovalRequired?: boolean;
    overtimeRate?: number;
  };
  attendanceRules?: {
    maxLateArrivals?: number;
    maxNoCallNoShows?: number;
    probationaryPeriod?: number;
  };
  requiredDocuments?: string[];
}

export interface RegulatoryDocument {
  id: string;
  name: string;
  type: 'license' | 'certification' | 'policy' | 'procedure' | 'contract';
  url?: string;
  uploadDate: string;
  expirationDate?: string;
  status: 'active' | 'expired' | 'pending_renewal';
}

// User roles enum
export const UserRole = {
  INTERNAL_EMPLOYEE: "internal_employee",
  CONTRACTOR_1099: "contractor_1099",
  FACILITY_MANAGER: "facility_manager",
  CLIENT_ADMINISTRATOR: "client_administrator",
  SUPER_ADMIN: "super_admin",
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

// Facility User roles enum - specific to facility management
export const FacilityUserRole = {
  FACILITY_ADMIN: "facility_admin",
  SCHEDULING_COORDINATOR: "scheduling_coordinator",
  HR_MANAGER: "hr_manager",
  CORPORATE: "corporate",
  REGIONAL_DIRECTOR: "regional_director",
  BILLING: "billing",
  SUPERVISOR: "supervisor",
  DIRECTOR_OF_NURSING: "director_of_nursing",
} as const;

export type FacilityUserRole = (typeof FacilityUserRole)[keyof typeof FacilityUserRole];

// Permission categories for facility users
export const FacilityPermission = {
  // Facility Management
  VIEW_FACILITY_PROFILE: "view_facility_profile",
  EDIT_FACILITY_PROFILE: "edit_facility_profile",
  
  // Shift Management
  CREATE_SHIFTS: "create_shifts",
  EDIT_SHIFTS: "edit_shifts",
  DELETE_SHIFTS: "delete_shifts",
  APPROVE_SHIFT_REQUESTS: "approve_shift_requests",
  
  // Staff Management
  ONBOARD_STAFF: "onboard_staff",
  OFFBOARD_STAFF: "offboard_staff",
  
  // Billing & Financial
  VIEW_RATES: "view_rates",
  EDIT_RATES: "edit_rates",
  PREMIUM_SHIFT_MULTIPLIER_1_0: "premium_shift_multiplier_1_0",
  PREMIUM_SHIFT_MULTIPLIER_1_1: "premium_shift_multiplier_1_1",
  PREMIUM_SHIFT_MULTIPLIER_1_2: "premium_shift_multiplier_1_2",
  PREMIUM_SHIFT_MULTIPLIER_1_3: "premium_shift_multiplier_1_3",
  PREMIUM_SHIFT_MULTIPLIER_1_4: "premium_shift_multiplier_1_4",
  PREMIUM_SHIFT_MULTIPLIER_1_5: "premium_shift_multiplier_1_5",
  PREMIUM_SHIFT_MULTIPLIER_1_6: "premium_shift_multiplier_1_6",
  
  // Timesheets & Payroll
  VIEW_TIMESHEETS: "view_timesheets",
  EXPORT_TIMESHEETS: "export_timesheets",
  APPROVE_TIMESHEETS: "approve_timesheets",
  APPROVE_PAYROLL: "approve_payroll",
  
  // Analytics & Reporting
  ACCESS_ANALYTICS: "access_analytics",
  ACCESS_REPORTS: "access_reports",
  
  // User & Team Management
  MANAGE_USERS_AND_TEAM: "manage_users_and_team",
  
  // Job Management
  MANAGE_JOB_OPENINGS: "manage_job_openings",
  VIEW_JOB_OPENINGS: "view_job_openings",
} as const;

export type FacilityPermission = (typeof FacilityPermission)[keyof typeof FacilityPermission];

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  role: text("role").notNull(),
  avatar: text("avatar"),
  isActive: boolean("is_active").default(true),
  facilityId: integer("facility_id"),
  specialty: text("specialty"), // Worker specialty (RN, CNA, PT, etc.)
  associatedFacilities: jsonb("associated_facilities"), // Array of facility IDs for workers
  availabilityStatus: text("availability_status").default("available"), // available, unavailable, busy
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Facility Users table - dedicated facility management users
export const facilityUsers = pgTable("facility_users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  role: text("role").notNull(), // FacilityUserRole enum
  avatar: text("avatar"),
  isActive: boolean("is_active").default(true),
  
  // Facility associations
  primaryFacilityId: integer("primary_facility_id").notNull(),
  associatedFacilityIds: jsonb("associated_facility_ids").default([]), // Array of facility IDs
  
  // Contact & Profile
  phone: text("phone"),
  title: text("title"), // Job title (e.g., "Nursing Director", "Operations Manager")
  department: text("department"), // Department they manage
  
  // Permissions & Access
  permissions: jsonb("permissions").default([]), // Array of FacilityPermission values
  customPermissions: jsonb("custom_permissions").default({}), // Custom per-facility permissions
  
  // Account Management
  lastLogin: timestamp("last_login"),
  loginCount: integer("login_count").default(0),
  passwordResetRequired: boolean("password_reset_required").default(false),
  twoFactorEnabled: boolean("two_factor_enabled").default(false),
  
  // Audit & Tracking
  createdById: integer("created_by_id"), // Who created this user
  notes: text("notes"), // Admin notes about this user
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Facility User Permissions table - tracks specific permissions per facility
export const facilityUserPermissions = pgTable("facility_user_permissions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  facilityId: integer("facility_id").notNull(),
  permission: text("permission").notNull(), // FacilityPermission enum value
  grantedById: integer("granted_by_id").notNull(), // Who granted this permission
  grantedAt: timestamp("granted_at").defaultNow(),
  isActive: boolean("is_active").default(true),
  
  // Optional constraints/limitations
  constraints: jsonb("constraints"), // e.g., { "departments": ["ICU", "ER"], "maxShifts": 50 }
  expiresAt: timestamp("expires_at"), // Optional expiration date
  
  notes: text("notes"), // Reason for granting/specific conditions
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Facility User Role Templates - predefined permission sets
export const facilityUserRoleTemplates = pgTable("facility_user_role_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(), // "Scheduling Manager", "HR Director", etc.
  description: text("description"),
  role: text("role").notNull(), // FacilityUserRole enum value
  permissions: jsonb("permissions").notNull(), // Array of FacilityPermission values
  isDefault: boolean("is_default").default(false), // Default template for this role
  isActive: boolean("is_active").default(true),
  
  // Template metadata
  createdById: integer("created_by_id").notNull(),
  facilityId: integer("facility_id"), // Facility-specific template (null for system-wide)
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Facility User to Facility Association - many-to-many relationship
export const facilityUserFacilityAssociations = pgTable("facility_user_facility_associations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  facilityId: integer("facility_id").notNull(),
  isPrimary: boolean("is_primary").default(false), // One primary facility per user
  teamId: integer("team_id"), // Associated team for this facility
  assignedById: integer("assigned_by_id"), // Who assigned this association
  assignedAt: timestamp("assigned_at").defaultNow(),
  isActive: boolean("is_active").default(true),
  
  // Role-specific permissions for this facility
  facilitySpecificPermissions: jsonb("facility_specific_permissions").default([]),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Junction table for facility user team membership  
export const facilityUserTeamMemberships = pgTable("facility_user_team_memberships", {
  id: serial("id").primaryKey(),
  facilityUserId: integer("facility_user_id").notNull(),
  teamId: integer("team_id").notNull(),
  role: text("role").default("member"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Facility User Activity Log - audit trail
export const facilityUserActivityLog = pgTable("facility_user_activity_log", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  facilityId: integer("facility_id").notNull(),
  action: text("action").notNull(), // "login", "create_shift", "edit_profile", etc.
  resource: text("resource"), // What was affected (shift ID, staff ID, etc.)
  details: jsonb("details"), // Additional context/data
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  timestamp: timestamp("timestamp").defaultNow(),
});

// Facilities table
export const facilities = pgTable("facilities", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  phone: text("phone"),
  email: text("email"),
  website: text("website"),
  cmsId: text("cms_id").unique(),
  npiNumber: text("npi_number"),
  facilityType: text("facility_type"), // nursing_home, hospital, assisted_living, etc.
  bedCount: integer("bed_count"),
  privateRooms: integer("private_rooms"),
  semiPrivateRooms: integer("semi_private_rooms"),
  overallRating: integer("overall_rating"), // 1-5 star rating from CMS
  healthInspectionRating: integer("health_inspection_rating"),
  qualityMeasureRating: integer("quality_measure_rating"),
  staffingRating: integer("staffing_rating"),
  rnStaffingRating: integer("rn_staffing_rating"),
  ownershipType: text("ownership_type"), // for-profit, non-profit, government
  certificationDate: timestamp("certification_date"),
  participatesMedicare: boolean("participates_medicare").default(false),
  participatesMedicaid: boolean("participates_medicaid").default(false),
  specialtyServices: jsonb("specialty_services"), // array of services offered
  languagesSpoken: jsonb("languages_spoken"), // array of languages
  adminName: text("admin_name"),
  adminTitle: text("admin_title"),
  medicalDirector: text("medical_director"),
  lastInspectionDate: timestamp("last_inspection_date"),
  deficiencyCount: integer("deficiency_count"),
  complaintsCount: integer("complaints_count"),
  finesTotal: decimal("fines_total", { precision: 10, scale: 2 }),
  autoImported: boolean("auto_imported").default(false),
  lastDataUpdate: timestamp("last_data_update"),
  dataSource: text("data_source"), // cms, manual, api_import
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  isActive: boolean("is_active").default(true),

  // New Enhanced Facility Management Fields
  autoAssignmentEnabled: boolean("auto_assignment_enabled").default(false),
  teamId: integer("team_id"), // nullable for corporate/team grouping
  netTerms: text("net_terms").default("Net 30"), // billing terms
  floatPoolMargins: jsonb("float_pool_margins"), // { specialty: dollarAmount }
  billRates: jsonb("bill_rates"), // { specialty: dollarAmount }
  payRates: jsonb("pay_rates"), // { specialty: dollarAmount }
  workflowAutomationConfig: jsonb("workflow_automation_config"), // workflow toggles
  timezone: text("timezone").default("America/New_York"),
  shiftManagementSettings: jsonb("shift_management_settings"), // overtime rules, etc.
  billingContactName: text("billing_contact_name"),
  billingContactEmail: text("billing_contact_email"),
  staffingTargets: jsonb("staffing_targets"), // { department: targetHours }
  emrSystem: text("emr_system"), // EMR/PMS system name
  contractStartDate: timestamp("contract_start_date"),
  payrollProviderId: integer("payroll_provider_id"), // FK to payroll_providers
  customRules: jsonb("custom_rules"), // float pool, overtime, attendance rules
  regulatoryDocs: jsonb("regulatory_docs"), // array of document URLs/metadata

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Permissions table
export const permissions = pgTable("permissions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  category: text("category").notNull(),
});

// Role permissions junction table
export const rolePermissions = pgTable("role_permissions", {
  id: serial("id").primaryKey(),
  role: text("role").notNull(),
  permissionId: integer("permission_id").notNull(),
});

// Jobs table
export const jobs = pgTable("jobs", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  department: text("department"),
  facilityId: integer("facility_id").notNull(),
  payRateMin: decimal("pay_rate_min", { precision: 10, scale: 2 }),
  payRateMax: decimal("pay_rate_max", { precision: 10, scale: 2 }),
  jobType: text("job_type").notNull(), // full-time, part-time, contract
  requirements: text("requirements").array(),
  isActive: boolean("is_active").default(true),
  postedById: integer("posted_by_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Job applications table
export const jobApplications = pgTable("job_applications", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").notNull(),
  applicantId: integer("applicant_id").notNull(),
  status: text("status").notNull().default("pending"), // pending, reviewed, accepted, rejected
  coverLetter: text("cover_letter"),
  resume: text("resume_url"),
  appliedAt: timestamp("applied_at").defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
  reviewedById: integer("reviewed_by_id"),
});

// Shifts table
export const shifts = pgTable("shifts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  facilityId: integer("facility_id").notNull(),
  facilityName: text("facility_name"),
  department: text("department").notNull(),
  specialty: text("specialty").notNull(),
  shiftType: text("shift_type").notNull().default("Day"), // Day, Night, Evening, Weekend, On-Call
  date: text("date").notNull(), // YYYY-MM-DD format
  startTime: text("start_time").notNull(), // HH:MM format
  endTime: text("end_time").notNull(), // HH:MM format
  rate: decimal("rate", { precision: 6, scale: 2 }).notNull(),
  premiumMultiplier: decimal("premium_multiplier", { precision: 3, scale: 2 }).default("1.00"),
  status: text("status").notNull().default("open"), // open, assigned, requested, in_progress, completed, cancelled, ncns, facility_cancelled, pending_invoice_review
  urgency: text("urgency").default("medium"), // low, medium, high, critical
  description: text("description"),
  requiredStaff: integer("required_staff").default(1),
  assignedStaffIds: integer("assigned_staff_ids").array(),
  specialRequirements: text("special_requirements").array(),
  createdById: integer("created_by_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Block shifts table
export const blockShifts = pgTable("block_shifts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  facilityId: integer("facility_id").notNull(),
  facilityName: text("facility_name"),
  department: text("department").notNull(),
  specialty: text("specialty").notNull(),
  startDate: text("start_date").notNull(), // YYYY-MM-DD format
  endDate: text("end_date").notNull(), // YYYY-MM-DD format
  startTime: text("start_time").notNull(), // HH:MM format
  endTime: text("end_time").notNull(), // HH:MM format
  quantity: integer("quantity").notNull().default(1), // number of positions
  rate: decimal("rate", { precision: 6, scale: 2 }).notNull(),
  premiumMultiplier: decimal("premium_multiplier", { precision: 3, scale: 2 }).default("1.00"),
  status: text("status").notNull().default("open"), // open, partially_filled, filled, cancelled
  urgency: text("urgency").default("medium"), // low, medium, high, critical
  description: text("description"),
  specialRequirements: text("special_requirements").array(),
  createdById: integer("created_by_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Facility settings table for configurable rates and times
export const facilitySettings = pgTable("facility_settings", {
  id: serial("id").primaryKey(),
  facilityId: integer("facility_id").notNull().unique(),
  baseRates: jsonb("base_rates"), // { "Registered Nurse": 35, "LPN": 28, ... }
  presetTimes: jsonb("preset_times"), // [{ label: "7AM-7PM", start: "07:00", end: "19:00" }, ...]
  allowedPremiums: jsonb("allowed_premiums"), // { min: 1.0, max: 1.7, step: 0.05 }
  departments: text("departments").array(),
  specialtyServices: text("specialty_services").array(),
  autoApprovalRules: jsonb("auto_approval_rules"),
  notificationSettings: jsonb("notification_settings"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Time clock entries
export const timeClockEntries = pgTable("time_clock_entries", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  shiftId: integer("shift_id"),
  clockIn: timestamp("clock_in"),
  clockOut: timestamp("clock_out"),
  location: jsonb("location"), // GPS coordinates
  deviceFingerprint: text("device_fingerprint"),
  totalHours: decimal("total_hours", { precision: 5, scale: 2 }),
  isApproved: boolean("is_approved").default(false),
  approvedById: integer("approved_by_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Invoices table
export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  contractorId: integer("contractor_id").notNull(),
  facilityId: integer("facility_id").notNull(),
  invoiceNumber: text("invoice_number").notNull().unique(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default("pending"), // pending, approved, paid, rejected
  workPeriodStart: timestamp("work_period_start").notNull(),
  workPeriodEnd: timestamp("work_period_end").notNull(),
  submittedAt: timestamp("submitted_at").defaultNow(),
  approvedAt: timestamp("approved_at"),
  approvedById: integer("approved_by_id"),
  paidAt: timestamp("paid_at"),
});

// Work logs table
export const workLogs = pgTable("work_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  shiftId: integer("shift_id"),
  description: text("description").notNull(),
  hoursWorked: decimal("hours_worked", { precision: 5, scale: 2 }).notNull(),
  workDate: timestamp("work_date").notNull(),
  status: text("status").notNull().default("pending"), // pending, approved, rejected
  reviewedById: integer("reviewed_by_id"),
  reviewedAt: timestamp("reviewed_at"),
  submittedAt: timestamp("submitted_at").defaultNow(),
});

// Shift assignments table
export const shiftAssignments = pgTable("shift_assignments", {
  id: serial("id").primaryKey(),
  shiftId: text("shift_id").notNull(),
  workerId: integer("worker_id").notNull(),
  assignedAt: timestamp("assigned_at").defaultNow(),
  assignedById: integer("assigned_by_id").notNull(),
  status: text("status").notNull().default("assigned"), // assigned, unassigned, completed
});

// Shift templates for generating recurring shifts - replaces in-memory template storage
export const shiftTemplates = pgTable("shift_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  department: text("department").notNull(),
  specialty: text("specialty").notNull(),
  facilityId: integer("facility_id").notNull(),
  facilityName: text("facility_name"),
  buildingId: text("building_id"),
  buildingName: text("building_name"),
  minStaff: integer("min_staff").notNull(),
  maxStaff: integer("max_staff").notNull(),
  shiftType: text("shift_type").notNull(), // day, night, evening
  startTime: text("start_time").notNull(), // HH:MM format
  endTime: text("end_time").notNull(), // HH:MM format
  daysOfWeek: jsonb("days_of_week").notNull(), // array of day numbers [0-6]
  isActive: boolean("is_active").default(true),
  hourlyRate: decimal("hourly_rate", { precision: 6, scale: 2 }),
  daysPostedOut: integer("days_posted_out").default(14),
  notes: text("notes"),
  generatedShiftsCount: integer("generated_shifts_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Generated shifts from templates - replaces global templateGeneratedShifts
export const generatedShifts = pgTable("generated_shifts", {
  id: text("id").primaryKey(), // stable ID format: templateId + date + position
  templateId: integer("template_id").notNull(),
  title: text("title").notNull(),
  date: text("date").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  department: text("department").notNull(),
  specialty: text("specialty").notNull(),
  facilityId: integer("facility_id").notNull(),
  facilityName: text("facility_name").notNull(),
  buildingId: text("building_id"),
  buildingName: text("building_name"),
  status: text("status").notNull().default("open"), // open, filled, cancelled
  rate: decimal("rate", { precision: 10, scale: 2 }).notNull(),
  urgency: text("urgency").default("medium"),
  description: text("description"),
  requiredWorkers: integer("required_workers").default(1),
  minStaff: integer("min_staff").default(1),
  maxStaff: integer("max_staff").default(1),
  totalHours: integer("total_hours").default(8),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Session data for persistence across server restarts - replaces file-based sessions
export const userSessions = pgTable("user_sessions", {
  id: text("id").primaryKey(),
  userId: integer("user_id").notNull(),
  sessionData: jsonb("session_data").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Teams table for managing facility-user relationships
export const teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  leaderId: integer("leader_id"), // reference to users table
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Team members junction table for many-to-many relationship
export const teamMembers = pgTable("team_members", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").notNull(),
  userId: integer("user_id").notNull(),
  role: text("role").default("member"), // leader, member, coordinator
  joinedAt: timestamp("joined_at").defaultNow(),
});

// Team facilities junction table for many-to-many relationship
export const teamFacilities = pgTable("team_facilities", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").notNull(),
  facilityId: integer("facility_id").notNull(),
  assignedAt: timestamp("assigned_at").defaultNow(),
});

// Credentials table
export const credentials = pgTable("credentials", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  credentialType: text("credential_type").notNull(), // BLS, ACLS, etc.
  credentialNumber: text("credential_number"),
  issuingAuthority: text("issuing_authority"),
  issueDate: timestamp("issue_date"),
  expirationDate: timestamp("expiration_date"),
  documentUrl: text("document_url"),
  status: text("status").notNull().default("active"), // active, expired, pending
  verifiedAt: timestamp("verified_at"),
  verifiedById: integer("verified_by_id"),
});

// Messages table
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").notNull(),
  recipientId: integer("recipient_id"),
  conversationId: text("conversation_id"),
  content: text("content").notNull(),
  messageType: text("message_type").default("text"), // text, system, file
  isRead: boolean("is_read").default(false),
  shiftId: integer("shift_id"), // Optional: tie message to specific shift
  createdAt: timestamp("created_at").defaultNow(),
});

// Audit logs table
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  action: text("action").notNull(),
  resource: text("resource").notNull(),
  resourceId: integer("resource_id"),
  oldValues: jsonb("old_values"),
  newValues: jsonb("new_values"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Shift requests table
export const shiftRequests = pgTable("shift_requests", {
  id: serial("id").primaryKey(),
  shiftId: integer("shift_id").notNull(),
  userId: integer("user_id").notNull(),
  status: text("status").notNull().default("pending"), // pending, approved, rejected, auto_assigned
  requestedAt: timestamp("requested_at").defaultNow(),
  processedAt: timestamp("processed_at"),
  processedById: integer("processed_by_id"),
  notes: text("notes"),
});

// Shift history table
export const shiftHistory = pgTable("shift_history", {
  id: serial("id").primaryKey(),
  shiftId: integer("shift_id").notNull(),
  userId: integer("user_id").notNull(),
  action: text("action").notNull(), // requested, assigned, completed, cancelled, no_call_no_show
  timestamp: timestamp("timestamp").defaultNow(),
  performedById: integer("performed_by_id"),
  notes: text("notes"),
  previousStatus: text("previous_status"),
  newStatus: text("new_status"),
});

// Staff table for enhanced profiles
export const staff = pgTable("staff", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  specialty: text("specialty").notNull(),
  department: text("department").notNull(),
  licenseNumber: text("license_number"),
  licenseExpiry: timestamp("license_expiry"),
  isActive: boolean("is_active").default(true),
  employmentType: text("employment_type").notNull(), // full_time, part_time, contract
  hourlyRate: decimal("hourly_rate", { precision: 6, scale: 2 }),
  location: text("location"),
  availabilityStatus: text("availability_status").default("available"), // available, on_assignment, unavailable
  profilePhoto: text("profile_photo"),
  bio: text("bio"),
  certifications: text("certifications").array(),
  languages: text("languages").array(),
  userId: integer("user_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  // Enhanced staff fields
  currentLocation: jsonb("current_location"), // { lat: number, lng: number, timestamp: string, accuracy?: number }
  accountStatus: text("account_status").default("active"), // active, inactive, pending, suspended
  totalWorkedShifts: integer("total_worked_shifts").default(0),
  reliabilityScore: decimal("reliability_score", { precision: 3, scale: 2 }).default("0.00"), // 0.00 to 5.00
  homeZipCode: text("home_zip_code"),
  homeAddress: text("home_address"),

  // Compliance and licensing fields
  licenseExpirationDate: timestamp("license_expiration_date"),
  backgroundCheckDate: timestamp("background_check_date"),
  drugTestDate: timestamp("drug_test_date"),
  covidVaccinationStatus: jsonb("covid_vaccination_status"), // { status: 'vaccinated'|'unvaccinated'|'exempt', doses: number, lastDose: string, booster: boolean }
  requiredCredentialsStatus: jsonb("required_credentials_status"), // { [credentialType]: { status: 'current'|'expired'|'pending', expirationDate: string } }

  // Performance and attendance tracking
  lateArrivalCount: integer("late_arrival_count").default(0),
  noCallNoShowCount: integer("no_call_no_show_count").default(0),
  lastWorkDate: timestamp("last_work_date"),

  // Preferences and scheduling
  preferredShiftTypes: jsonb("preferred_shift_types"), // ['day', 'night', 'weekend', 'on_call']
  weeklyAvailability: jsonb("weekly_availability"), // { monday: { available: boolean, startTime: string, endTime: string }, ... }

  // Contact and financial information
  directDepositInfo: jsonb("direct_deposit_info"), // { bankName: string, routingNumber: string, accountNumber: string, accountType: 'checking'|'savings' } - encrypted
  emergencyContact: jsonb("emergency_contact"), // { name: string, phone: string, relationship: string, email?: string }
  associatedFacilities: jsonb("associated_facilities").default('[]'), // Array of facility IDs for workers
});

// Payroll Integration Tables
export const payrollProviders = pgTable("payroll_providers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  apiEndpoint: text("api_endpoint").notNull(),
  authType: text("auth_type").notNull(), // 'oauth', 'api_key', 'basic'
  isActive: boolean("is_active").default(true),
  supportedFeatures: jsonb("supported_features"), // array of features like ['timesheet_sync', 'direct_deposit', 'tax_calc']
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const payrollConfigurations = pgTable("payroll_configurations", {
  id: serial("id").primaryKey(),
  facilityId: integer("facility_id").notNull(),
  providerId: integer("provider_id").notNull(),
  configuration: jsonb("configuration").notNull(), // provider-specific config
  isActive: boolean("is_active").default(true),
  lastSyncAt: timestamp("last_sync_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const payrollEmployees = pgTable("payroll_employees", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  facilityId: integer("facility_id").notNull(),
  externalEmployeeId: text("external_employee_id"), // ID in payroll system
  payrollProviderId: integer("payroll_provider_id").notNull(),
  employeeType: text("employee_type").notNull(), // 'W2', '1099', 'hourly', 'salary'
  hourlyRate: decimal("hourly_rate", { precision: 10, scale: 2 }),
  salaryAmount: decimal("salary_amount", { precision: 10, scale: 2 }),
  overtimeRate: decimal("overtime_rate", { precision: 10, scale: 2 }),
  taxInformation: jsonb("tax_information"), // W4 info, state taxes, etc.
  directDepositInfo: jsonb("direct_deposit_info"), // encrypted bank details
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const timesheets = pgTable("timesheets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  facilityId: integer("facility_id").notNull(),
  payPeriodStart: timestamp("pay_period_start").notNull(),
  payPeriodEnd: timestamp("pay_period_end").notNull(),
  totalHours: decimal("total_hours", { precision: 8, scale: 2 }).notNull(),
  regularHours: decimal("regular_hours", { precision: 8, scale: 2 }).notNull(),
  overtimeHours: decimal("overtime_hours", { precision: 8, scale: 2 }).default("0"),
  holidayHours: decimal("holiday_hours", { precision: 8, scale: 2 }).default("0"),
  sickHours: decimal("sick_hours", { precision: 8, scale: 2 }).default("0"),
  vacationHours: decimal("vacation_hours", { precision: 8, scale: 2 }).default("0"),
  grossPay: decimal("gross_pay", { precision: 10, scale: 2 }),
  status: text("status").notNull().default("draft"), // 'draft', 'submitted', 'approved', 'processed', 'paid'
  submittedAt: timestamp("submitted_at"),
  approvedAt: timestamp("approved_at"),
  approvedBy: integer("approved_by"),
  processedAt: timestamp("processed_at"),
  payrollSyncId: text("payroll_sync_id"), // reference to external payroll system
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const timesheetEntries = pgTable("timesheet_entries", {
  id: serial("id").primaryKey(),
  timesheetId: integer("timesheet_id").notNull(),
  shiftId: integer("shift_id"),
  workDate: timestamp("work_date").notNull(),
  clockIn: timestamp("clock_in"),
  clockOut: timestamp("clock_out"),
  breakStart: timestamp("break_start"),
  breakEnd: timestamp("break_end"),
  hoursWorked: decimal("hours_worked", { precision: 8, scale: 2 }).notNull(),
  hourlyRate: decimal("hourly_rate", { precision: 10, scale: 2 }).notNull(),
  entryType: text("entry_type").notNull(), // 'regular', 'overtime', 'holiday', 'sick', 'vacation'
  isApproved: boolean("is_approved").default(false),
  approvedBy: integer("approved_by"),
  approvedAt: timestamp("approved_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const payrollSyncLogs = pgTable("payroll_sync_logs", {
  id: serial("id").primaryKey(),
  facilityId: integer("facility_id").notNull(),
  providerId: integer("provider_id").notNull(),
  syncType: text("sync_type").notNull(), // 'employee_sync', 'timesheet_sync', 'payment_sync'
  status: text("status").notNull(), // 'success', 'failed', 'partial'
  recordsProcessed: integer("records_processed").default(0),
  recordsSucceeded: integer("records_succeeded").default(0),
  recordsFailed: integer("records_failed").default(0),
  errorDetails: jsonb("error_details"),
  syncData: jsonb("sync_data"), // data that was synced
  startedAt: timestamp("started_at").notNull(),
  completedAt: timestamp("completed_at"),
  createdBy: integer("created_by"),
});

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  timesheetId: integer("timesheet_id").notNull(),
  userId: integer("user_id").notNull(),
  facilityId: integer("facility_id").notNull(),
  payrollProviderId: integer("payroll_provider_id").notNull(),
  externalPaymentId: text("external_payment_id"), // reference in payroll system
  grossAmount: decimal("gross_amount", { precision: 10, scale: 2 }).notNull(),
  federalTax: decimal("federal_tax", { precision: 10, scale: 2 }).default("0"),
  stateTax: decimal("state_tax", { precision: 10, scale: 2 }).default("0"),
  socialSecurity: decimal("social_security", { precision: 10, scale: 2 }).default("0"),
  medicare: decimal("medicare", { precision: 10, scale: 2 }).default("0"),
  otherDeductions: decimal("other_deductions", { precision: 10, scale: 2 }).default("0"),
  netAmount: decimal("net_amount", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: text("payment_method").notNull(), // 'direct_deposit', 'check', 'card'
  paymentDate: timestamp("payment_date"),
  status: text("status").notNull().default("pending"), // 'pending', 'processing', 'completed', 'failed', 'cancelled'
  failureReason: text("failure_reason"),
  metadata: jsonb("metadata"), // additional payment details
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  facility: one(facilities, { fields: [users.facilityId], references: [facilities.id] }),
  postedJobs: many(jobs),
  applications: many(jobApplications),
  shifts: many(shifts),
  timeClockEntries: many(timeClockEntries),
  invoices: many(invoices),
  workLogs: many(workLogs),
  credentials: many(credentials),
  sentMessages: many(messages, { relationName: "sender" }),
  receivedMessages: many(messages, { relationName: "recipient" }),
  auditLogs: many(auditLogs),
}));

export const facilitiesRelations = relations(facilities, ({ one, many }) => ({
  users: many(users),
  jobs: many(jobs),
  shifts: many(shifts),
  invoices: many(invoices),
  payrollProvider: one(payrollProviders, { 
    fields: [facilities.payrollProviderId], 
    references: [payrollProviders.id] 
  }),
  teamFacilities: many(teamFacilities),
}));

export const teamsRelations = relations(teams, ({ one, many }) => ({
  leader: one(users, { fields: [teams.leaderId], references: [users.id] }),
  members: many(teamMembers),
  facilities: many(teamFacilities),
}));

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  team: one(teams, { fields: [teamMembers.teamId], references: [teams.id] }),
  user: one(users, { fields: [teamMembers.userId], references: [users.id] }),
}));

export const teamFacilitiesRelations = relations(teamFacilities, ({ one }) => ({
  team: one(teams, { fields: [teamFacilities.teamId], references: [teams.id] }),
  facility: one(facilities, { fields: [teamFacilities.facilityId], references: [facilities.id] }),
}));

export const jobsRelations = relations(jobs, ({ one, many }) => ({
  facility: one(facilities, { fields: [jobs.facilityId], references: [facilities.id] }),
  postedBy: one(users, { fields: [jobs.postedById], references: [users.id] }),
  applications: many(jobApplications),
}));

export const shiftsRelations = relations(shifts, ({ one, many }) => ({
  facility: one(facilities, { fields: [shifts.facilityId], references: [facilities.id] }),
  createdBy: one(users, { fields: [shifts.createdById], references: [users.id] }),
  timeClockEntries: many(timeClockEntries),
  workLogs: many(workLogs),
  messages: many(messages),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFacilitySchema = createInsertSchema(facilities).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertJobSchema = createInsertSchema(jobs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertJobApplicationSchema = createInsertSchema(jobApplications).omit({
  id: true,
  appliedAt: true,
  reviewedAt: true,
});

export const insertShiftSchema = createInsertSchema(shifts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).partial({
  title: true, // Make title optional
  facilityName: true, // Make facilityName optional
  assignedStaffIds: true, // Make assignedStaffIds optional
  specialRequirements: true, // Make specialRequirements optional
  premiumMultiplier: true, // Make premiumMultiplier optional
  shiftType: true, // Make shiftType optional with default
});

export const insertInvoiceSchema = createInsertSchema(invoices).omit({
  id: true,
  submittedAt: true,
  approvedAt: true,
  paidAt: true,
});

export const insertWorkLogSchema = createInsertSchema(workLogs).omit({
  id: true,
  submittedAt: true,
  reviewedAt: true,
});

export const insertCredentialSchema = createInsertSchema(credentials).omit({
  id: true,
  verifiedAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export const insertStaffSchema = createInsertSchema(staff).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertShiftRequestSchema = createInsertSchema(shiftRequests).omit({
  id: true,
  requestedAt: true,
  processedAt: true,
});

export const insertShiftHistorySchema = createInsertSchema(shiftHistory).omit({
  id: true,
  timestamp: true,
});

// Payroll insert schemas
export const insertPayrollProviderSchema = createInsertSchema(payrollProviders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPayrollConfigurationSchema = createInsertSchema(payrollConfigurations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPayrollEmployeeSchema = createInsertSchema(payrollEmployees).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTimesheetSchema = createInsertSchema(timesheets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Team insert schemas
export const insertTeamSchema = createInsertSchema(teams).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTeamMemberSchema = createInsertSchema(teamMembers).omit({
  id: true,
  joinedAt: true,
});

export const insertTeamFacilitySchema = createInsertSchema(teamFacilities).omit({
  id: true,
  assignedAt: true,
});

export const insertTimesheetEntrySchema = createInsertSchema(timesheetEntries).omit({
  id: true,
  createdAt: true,
});

export const insertPayrollSyncLogSchema = createInsertSchema(payrollSyncLogs).omit({
  id: true,
});

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertFacility = z.infer<typeof insertFacilitySchema>;
export type Facility = typeof facilities.$inferSelect;
export type InsertJob = z.infer<typeof insertJobSchema>;
export type Job = typeof jobs.$inferSelect;
export type InsertJobApplication = z.infer<typeof insertJobApplicationSchema>;
export type JobApplication = typeof jobApplications.$inferSelect;
export type InsertShift = z.infer<typeof insertShiftSchema>;
export type Shift = typeof shifts.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = typeof invoices.$inferSelect;
export type InsertWorkLog = z.infer<typeof insertWorkLogSchema>;
export type WorkLog = typeof workLogs.$inferSelect;
export type InsertCredential = z.infer<typeof insertCredentialSchema>;
export type Credential = typeof credentials.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertStaff = z.infer<typeof insertStaffSchema>;
export type Staff = typeof staff.$inferSelect;
export type InsertShiftRequest = z.infer<typeof insertShiftRequestSchema>;
export type ShiftRequest = typeof shiftRequests.$inferSelect;
export type InsertShiftHistory = z.infer<typeof insertShiftHistorySchema>;
export type ShiftHistory = typeof shiftHistory.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;

// Payroll types
export type InsertPayrollProvider = z.infer<typeof insertPayrollProviderSchema>;
export type PayrollProvider = typeof payrollProviders.$inferSelect;
export type InsertPayrollConfiguration = z.infer<typeof insertPayrollConfigurationSchema>;
export type PayrollConfiguration = typeof payrollConfigurations.$inferSelect;
export type InsertPayrollEmployee = z.infer<typeof insertPayrollEmployeeSchema>;
export type PayrollEmployee = typeof payrollEmployees.$inferSelect;
export type InsertTimesheet = z.infer<typeof insertTimesheetSchema>;
export type Timesheet = typeof timesheets.$inferSelect;
export type InsertTimesheetEntry = z.infer<typeof insertTimesheetEntrySchema>;
export type TimesheetEntry = typeof timesheetEntries.$inferSelect;
export type InsertPayrollSyncLog = z.infer<typeof insertPayrollSyncLogSchema>;
export type PayrollSyncLog = typeof payrollSyncLogs.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof payments.$inferSelect;

// New table insert schemas and types
export const insertShiftTemplateSchema = createInsertSchema(shiftTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertGeneratedShiftSchema = createInsertSchema(generatedShifts).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertUserSessionSchema = createInsertSchema(userSessions).omit({
  createdAt: true,
  updatedAt: true,
});

export type InsertShiftTemplate = z.infer<typeof insertShiftTemplateSchema>;
export type ShiftTemplate = typeof shiftTemplates.$inferSelect;
export type InsertGeneratedShift = z.infer<typeof insertGeneratedShiftSchema>;
export type GeneratedShift = typeof generatedShifts.$inferSelect;
export type InsertUserSession = z.infer<typeof insertUserSessionSchema>;
export type UserSession = typeof userSessions.$inferSelect;

// Facility User schemas and types
export const insertFacilityUserSchema = createInsertSchema(facilityUsers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFacilityUserPermissionSchema = createInsertSchema(facilityUserPermissions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFacilityUserRoleTemplateSchema = createInsertSchema(facilityUserRoleTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFacilityUserActivityLogSchema = createInsertSchema(facilityUserActivityLog).omit({
  id: true,
});

export const insertFacilityUserFacilityAssociationSchema = createInsertSchema(facilityUserFacilityAssociations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFacilityUserTeamMembershipSchema = createInsertSchema(facilityUserTeamMemberships).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertFacilityUser = z.infer<typeof insertFacilityUserSchema>;
export type FacilityUser = typeof facilityUsers.$inferSelect;
export type InsertFacilityUserPermission = z.infer<typeof insertFacilityUserPermissionSchema>;
export type FacilityUserPermission = typeof facilityUserPermissions.$inferSelect;
export type InsertFacilityUserRoleTemplate = z.infer<typeof insertFacilityUserRoleTemplateSchema>;
export type FacilityUserRoleTemplate = typeof facilityUserRoleTemplates.$inferSelect;
export type InsertFacilityUserActivityLog = z.infer<typeof insertFacilityUserActivityLogSchema>;
export type FacilityUserActivityLog = typeof facilityUserActivityLog.$inferSelect;
export type InsertFacilityUserFacilityAssociation = z.infer<typeof insertFacilityUserFacilityAssociationSchema>;
export type FacilityUserFacilityAssociation = typeof facilityUserFacilityAssociations.$inferSelect;
export type InsertFacilityUserTeamMembership = z.infer<typeof insertFacilityUserTeamMembershipSchema>;
export type FacilityUserTeamMembership = typeof facilityUserTeamMemberships.$inferSelect;