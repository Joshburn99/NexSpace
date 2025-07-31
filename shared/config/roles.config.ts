// Role and Permission Configuration
// Centralizes all role-based access control definitions

export const ROLES = {
  // System Roles
  SUPER_ADMIN: 'super_admin',
  
  // Facility User Roles
  FACILITY_ADMIN: 'facility_admin',
  BILLING_MANAGER: 'billing_manager',
  SCHEDULER: 'scheduler',
  HR_MANAGER: 'hr_manager',
  COMPLIANCE_OFFICER: 'compliance_officer',
  CLINICAL_COORDINATOR: 'clinical_coordinator',
  OPERATIONS_MANAGER: 'operations_manager',
  FINANCE_DIRECTOR: 'finance_director',
  QUALITY_MANAGER: 'quality_manager',
  SUPERVISOR: 'supervisor',
  VIEWER: 'viewer',
  
  // Staff Roles
  REGISTERED_NURSE: 'Registered Nurse',
  LICENSED_PRACTICAL_NURSE: 'Licensed Practical Nurse',
  CERTIFIED_NURSING_ASSISTANT: 'Certified Nursing Assistant',
  PHYSICIAN: 'Physician',
  PHYSICIAN_ASSISTANT: 'Physician Assistant',
  NURSE_PRACTITIONER: 'Nurse Practitioner',
  THERAPIST: 'Therapist',
  TECHNICIAN: 'Technician',
  ADMINISTRATIVE: 'Administrative',
  SUPPORT_STAFF: 'Support Staff',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

// Department Configuration
export const DEPARTMENTS = [
  'ICU',
  'Emergency',
  'Medical-Surgical',
  'Operating Room',
  'Labor & Delivery',
  'Pediatrics',
  'Oncology',
  'Cardiology',
  'Neurology',
  'Orthopedics',
  'Psychiatry',
  'Rehabilitation',
  'Radiology',
  'Laboratory',
  'Pharmacy',
  'Administration',
] as const;

export type Department = typeof DEPARTMENTS[number];

// Shift Types
export const SHIFT_TYPES = {
  DAY: 'Day',
  EVENING: 'Evening',
  NIGHT: 'Night',
  ROTATING: 'Rotating',
  FLEX: 'Flex',
  ON_CALL: 'On Call',
} as const;

export type ShiftType = typeof SHIFT_TYPES[keyof typeof SHIFT_TYPES];

// Shift Status
export const SHIFT_STATUS = {
  OPEN: 'open',
  ASSIGNED: 'assigned',
  REQUESTED: 'requested',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  NO_SHOW: 'no_show',
} as const;

export type ShiftStatus = typeof SHIFT_STATUS[keyof typeof SHIFT_STATUS];

// Staff Status
export const STAFF_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  ON_LEAVE: 'on_leave',
  TERMINATED: 'terminated',
  PENDING: 'pending',
} as const;

export type StaffStatus = typeof STAFF_STATUS[keyof typeof STAFF_STATUS];

// Certification Types
export const CERTIFICATION_TYPES = [
  'BLS',
  'ACLS',
  'PALS',
  'NRP',
  'TNCC',
  'ENPC',
  'CEN',
  'CCRN',
  'CNOR',
  'RN License',
  'LPN License',
  'CNA Certification',
  'CPR',
  'First Aid',
  'NIHSS',
  'Telemetry',
  'Ventilator',
  'Dialysis',
  'Chemotherapy',
] as const;

export type CertificationType = typeof CERTIFICATION_TYPES[number];

// Language Codes
export const LANGUAGES = {
  EN: 'English',
  ES: 'Spanish',
  FR: 'French',
  ZH: 'Chinese',
  AR: 'Arabic',
  PT: 'Portuguese',
  RU: 'Russian',
  JA: 'Japanese',
  DE: 'German',
  KO: 'Korean',
  VI: 'Vietnamese',
  TL: 'Tagalog',
  HI: 'Hindi',
  IT: 'Italian',
  PL: 'Polish',
} as const;

export type LanguageCode = keyof typeof LANGUAGES;

// Facility Types
export const FACILITY_TYPES = {
  HOSPITAL: 'Hospital',
  SKILLED_NURSING: 'Skilled Nursing Facility',
  ASSISTED_LIVING: 'Assisted Living',
  REHABILITATION: 'Rehabilitation Center',
  HOSPICE: 'Hospice',
  HOME_HEALTH: 'Home Health Agency',
  CLINIC: 'Clinic',
  URGENT_CARE: 'Urgent Care',
  SURGERY_CENTER: 'Surgery Center',
} as const;

export type FacilityType = typeof FACILITY_TYPES[keyof typeof FACILITY_TYPES];

// Permission Groups
export const PERMISSION_GROUPS = {
  SHIFTS: 'shifts',
  STAFF: 'staff',
  BILLING: 'billing',
  FACILITY: 'facility',
  REPORTS: 'reports',
  COMPLIANCE: 'compliance',
  SETTINGS: 'settings',
} as const;

export type PermissionGroup = typeof PERMISSION_GROUPS[keyof typeof PERMISSION_GROUPS];

// Time Zones
export const TIME_ZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'America/Anchorage',
  'Pacific/Honolulu',
] as const;

export type TimeZone = typeof TIME_ZONES[number];

// Priority Levels
export const PRIORITY_LEVELS = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
} as const;

export type PriorityLevel = typeof PRIORITY_LEVELS[keyof typeof PRIORITY_LEVELS];