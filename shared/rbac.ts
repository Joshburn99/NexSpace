// Comprehensive Role-Based Access Control (RBAC) System

export type SystemRole = 
  | 'super_admin'
  | 'facility_admin'
  | 'scheduling_coordinator'
  | 'hr_manager'
  | 'billing_manager'
  | 'supervisor'
  | 'director_of_nursing'
  | 'corporate'
  | 'regional_director'
  | 'staff'
  | 'viewer';

export type Permission = 
  // User Management
  | 'users.view'
  | 'users.create'
  | 'users.edit'
  | 'users.delete'
  | 'users.impersonate'
  
  // Facility Management
  | 'facilities.view'
  | 'facilities.create'
  | 'facilities.edit'
  | 'facilities.delete'
  | 'facilities.manage_settings'
  | 'facilities.view_profile'
  | 'facilities.edit_profile'
  
  // Shift & Schedule Management
  | 'shifts.view'
  | 'shifts.create'
  | 'shifts.edit'
  | 'shifts.delete'
  | 'shifts.assign'
  | 'shifts.request'
  | 'shifts.approve_requests'
  | 'shifts.manage_templates'
  
  // Staff Management
  | 'staff.view'
  | 'staff.create'
  | 'staff.edit'
  | 'staff.deactivate'
  | 'staff.view_credentials'
  | 'staff.edit_credentials'
  | 'staff.manage_credentials'
  
  // Billing & Finance
  | 'billing.view'
  | 'billing.create'
  | 'billing.edit'
  | 'billing.approve'
  | 'billing.view_rates'
  | 'billing.edit_rates'
  | 'billing.export'
  
  // Compliance & Documents
  | 'compliance.view'
  | 'compliance.manage'
  | 'compliance.upload_documents'
  | 'compliance.verify_credentials'
  
  // Analytics & Reports
  | 'analytics.view'
  | 'analytics.export'
  | 'analytics.view_attendance'
  | 'analytics.view_overtime'
  | 'analytics.view_float_pool'
  | 'analytics.view_agency_usage'
  
  // Job Management
  | 'jobs.view'
  | 'jobs.create'
  | 'jobs.edit'
  | 'jobs.delete'
  | 'jobs.manage_applications'
  
  // System Administration
  | 'system.view_audit_logs'
  | 'system.manage_permissions'
  | 'system.workflow_automation'
  | 'system.referral_management'
  | 'system.manage_integrations';

// Role-Permission Matrix
export const ROLE_PERMISSIONS: Record<SystemRole, Permission[]> = {
  // Superuser - Full system access
  super_admin: [
    // All permissions
    'users.view', 'users.create', 'users.edit', 'users.delete', 'users.impersonate',
    'facilities.view', 'facilities.create', 'facilities.edit', 'facilities.delete', 'facilities.manage_settings', 'facilities.view_profile', 'facilities.edit_profile',
    'shifts.view', 'shifts.create', 'shifts.edit', 'shifts.delete', 'shifts.assign', 'shifts.request', 'shifts.approve_requests', 'shifts.manage_templates',
    'staff.view', 'staff.create', 'staff.edit', 'staff.deactivate', 'staff.view_credentials', 'staff.edit_credentials', 'staff.manage_credentials',
    'billing.view', 'billing.create', 'billing.edit', 'billing.approve', 'billing.view_rates', 'billing.edit_rates', 'billing.export',
    'compliance.view', 'compliance.manage', 'compliance.upload_documents', 'compliance.verify_credentials',
    'analytics.view', 'analytics.export', 'analytics.view_attendance', 'analytics.view_overtime', 'analytics.view_float_pool', 'analytics.view_agency_usage',
    'jobs.view', 'jobs.create', 'jobs.edit', 'jobs.delete', 'jobs.manage_applications',
    'system.view_audit_logs', 'system.manage_permissions', 'system.workflow_automation', 'system.referral_management', 'system.manage_integrations'
  ],
  
  // Facility Administrator - Full facility management
  facility_admin: [
    'users.view', 'users.create', 'users.edit',
    'facilities.view', 'facilities.manage_settings', 'facilities.view_profile', 'facilities.edit_profile',
    'shifts.view', 'shifts.create', 'shifts.edit', 'shifts.delete', 'shifts.assign', 'shifts.approve_requests', 'shifts.manage_templates',
    'staff.view', 'staff.create', 'staff.edit', 'staff.deactivate', 'staff.view_credentials', 'staff.edit_credentials', 'staff.manage_credentials',
    'billing.view', 'billing.create', 'billing.edit', 'billing.approve', 'billing.view_rates', 'billing.edit_rates', 'billing.export',
    'compliance.view', 'compliance.manage', 'compliance.upload_documents', 'compliance.verify_credentials',
    'analytics.view', 'analytics.export', 'analytics.view_attendance', 'analytics.view_overtime', 'analytics.view_float_pool', 'analytics.view_agency_usage',
    'jobs.view', 'jobs.create', 'jobs.edit', 'jobs.delete', 'jobs.manage_applications',
    'system.view_audit_logs', 'system.manage_permissions'
  ],
  
  // Scheduling Coordinator - Schedule and shift management
  scheduling_coordinator: [
    'facilities.view', 'facilities.view_profile',
    'shifts.view', 'shifts.create', 'shifts.edit', 'shifts.delete', 'shifts.assign', 'shifts.approve_requests', 'shifts.manage_templates',
    'staff.view', 'staff.view_credentials',
    'analytics.view', 'analytics.view_attendance', 'analytics.view_overtime'
  ],
  
  // HR Manager - Staff and compliance management
  hr_manager: [
    'facilities.view', 'facilities.view_profile',
    'shifts.view',
    'staff.view', 'staff.create', 'staff.edit', 'staff.deactivate', 'staff.view_credentials', 'staff.edit_credentials', 'staff.manage_credentials',
    'compliance.view', 'compliance.manage', 'compliance.upload_documents', 'compliance.verify_credentials',
    'analytics.view', 'analytics.view_attendance', 'analytics.view_overtime',
    'jobs.view', 'jobs.create', 'jobs.edit', 'jobs.delete', 'jobs.manage_applications',
    'system.referral_management'
  ],
  
  // Billing Manager - Financial management
  billing_manager: [
    'facilities.view', 'facilities.view_profile',
    'shifts.view',
    'staff.view',
    'billing.view', 'billing.create', 'billing.edit', 'billing.approve', 'billing.view_rates', 'billing.edit_rates', 'billing.export',
    'analytics.view', 'analytics.export'
  ],
  
  // Supervisor - Limited management capabilities
  supervisor: [
    'facilities.view', 'facilities.view_profile',
    'shifts.view', 'shifts.approve_requests',
    'staff.view', 'staff.view_credentials',
    'analytics.view'
  ],
  
  // Director of Nursing - Clinical oversight
  director_of_nursing: [
    'facilities.view', 'facilities.view_profile',
    'shifts.view', 'shifts.create', 'shifts.edit', 'shifts.assign', 'shifts.approve_requests',
    'staff.view', 'staff.edit', 'staff.view_credentials', 'staff.edit_credentials',
    'compliance.view', 'compliance.manage', 'compliance.verify_credentials',
    'analytics.view', 'analytics.view_attendance', 'analytics.view_overtime'
  ],
  
  // Corporate - Multi-facility oversight
  corporate: [
    'facilities.view', 'facilities.view_profile',
    'shifts.view',
    'staff.view',
    'billing.view', 'billing.view_rates',
    'compliance.view',
    'analytics.view', 'analytics.export', 'analytics.view_attendance', 'analytics.view_overtime', 'analytics.view_float_pool', 'analytics.view_agency_usage'
  ],
  
  // Regional Director - Regional oversight
  regional_director: [
    'facilities.view', 'facilities.view_profile', 'facilities.edit_profile',
    'shifts.view',
    'staff.view',
    'billing.view', 'billing.view_rates',
    'compliance.view',
    'analytics.view', 'analytics.export', 'analytics.view_attendance', 'analytics.view_overtime', 'analytics.view_float_pool', 'analytics.view_agency_usage',
    'system.view_audit_logs'
  ],
  
  // Staff - Basic access for healthcare workers
  staff: [
    'facilities.view_profile',
    'shifts.view', 'shifts.request',
    'staff.view', // Limited to own profile
    'staff.view_credentials', // Limited to own credentials
    'analytics.view' // Limited to own data
  ],
  
  // Viewer - Read-only access
  viewer: [
    'facilities.view', 'facilities.view_profile',
    'shifts.view',
    'staff.view'
  ]
};

// Helper functions for permission checking
export function hasPermission(role: SystemRole, permission: Permission): boolean {
  const rolePermissions = ROLE_PERMISSIONS[role] || [];
  return rolePermissions.includes(permission);
}

export function hasAnyPermission(role: SystemRole, permissions: Permission[]): boolean {
  return permissions.some(permission => hasPermission(role, permission));
}

export function hasAllPermissions(role: SystemRole, permissions: Permission[]): boolean {
  return permissions.every(permission => hasPermission(role, permission));
}

// Role metadata for UI display
export const ROLE_METADATA: Record<SystemRole, { 
  label: string; 
  description: string; 
  color: string;
  icon: string;
}> = {
  super_admin: {
    label: 'Super Admin',
    description: 'Full system access with ability to manage all facilities and users',
    color: 'bg-red-100 text-red-800',
    icon: 'Shield'
  },
  facility_admin: {
    label: 'Facility Administrator',
    description: 'Complete facility management including staff, billing, and compliance',
    color: 'bg-purple-100 text-purple-800',
    icon: 'Building'
  },
  scheduling_coordinator: {
    label: 'Scheduling Coordinator',
    description: 'Manage shifts, schedules, and staff assignments',
    color: 'bg-blue-100 text-blue-800',
    icon: 'Calendar'
  },
  hr_manager: {
    label: 'HR Manager',
    description: 'Manage staff, credentials, compliance, and recruitment',
    color: 'bg-green-100 text-green-800',
    icon: 'Users'
  },
  billing_manager: {
    label: 'Billing Manager',
    description: 'Manage invoices, rates, and financial operations',
    color: 'bg-yellow-100 text-yellow-800',
    icon: 'DollarSign'
  },
  supervisor: {
    label: 'Supervisor',
    description: 'View schedules and staff with limited approval capabilities',
    color: 'bg-indigo-100 text-indigo-800',
    icon: 'UserCheck'
  },
  director_of_nursing: {
    label: 'Director of Nursing',
    description: 'Clinical oversight with schedule and compliance management',
    color: 'bg-teal-100 text-teal-800',
    icon: 'Heart'
  },
  corporate: {
    label: 'Corporate',
    description: 'Multi-facility oversight with analytics and reporting access',
    color: 'bg-gray-100 text-gray-800',
    icon: 'Briefcase'
  },
  regional_director: {
    label: 'Regional Director',
    description: 'Regional facility management with comprehensive analytics',
    color: 'bg-orange-100 text-orange-800',
    icon: 'MapPin'
  },
  staff: {
    label: 'Staff Member',
    description: 'Healthcare worker with shift and profile access',
    color: 'bg-cyan-100 text-cyan-800',
    icon: 'User'
  },
  viewer: {
    label: 'Viewer',
    description: 'Read-only access to schedules and basic information',
    color: 'bg-gray-100 text-gray-600',
    icon: 'Eye'
  }
};

// Action-based permission groups for UI
export const PERMISSION_GROUPS = {
  userManagement: {
    label: 'User Management',
    permissions: ['users.view', 'users.create', 'users.edit', 'users.delete', 'users.impersonate'] as Permission[]
  },
  facilityManagement: {
    label: 'Facility Management',
    permissions: ['facilities.view', 'facilities.create', 'facilities.edit', 'facilities.delete', 'facilities.manage_settings'] as Permission[]
  },
  scheduling: {
    label: 'Scheduling',
    permissions: ['shifts.view', 'shifts.create', 'shifts.edit', 'shifts.delete', 'shifts.assign', 'shifts.approve_requests'] as Permission[]
  },
  staffManagement: {
    label: 'Staff Management',
    permissions: ['staff.view', 'staff.create', 'staff.edit', 'staff.deactivate', 'staff.manage_credentials'] as Permission[]
  },
  financial: {
    label: 'Financial',
    permissions: ['billing.view', 'billing.create', 'billing.edit', 'billing.approve', 'billing.view_rates', 'billing.edit_rates'] as Permission[]
  },
  compliance: {
    label: 'Compliance',
    permissions: ['compliance.view', 'compliance.manage', 'compliance.upload_documents', 'compliance.verify_credentials'] as Permission[]
  },
  analytics: {
    label: 'Analytics & Reports',
    permissions: ['analytics.view', 'analytics.export', 'analytics.view_attendance', 'analytics.view_overtime'] as Permission[]
  }
};