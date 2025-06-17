import { UserRole } from "@shared/schema";

// Define all possible permissions in the system
export const PERMISSIONS = {
  // User management
  USERS_VIEW: "users.view",
  USERS_CREATE: "users.create", 
  USERS_EDIT: "users.edit",
  USERS_DELETE: "users.delete",
  USERS_IMPERSONATE: "users.impersonate",

  // Facility management
  FACILITIES_VIEW: "facilities.view",
  FACILITIES_CREATE: "facilities.create",
  FACILITIES_EDIT: "facilities.edit",
  FACILITIES_DELETE: "facilities.delete",

  // Job management
  JOBS_VIEW: "jobs.view",
  JOBS_CREATE: "jobs.create",
  JOBS_EDIT: "jobs.edit",
  JOBS_DELETE: "jobs.delete",
  JOBS_MANAGE: "jobs.manage", // Approve/reject applications

  // Shift management
  SHIFTS_VIEW: "shifts.view",
  SHIFTS_CREATE: "shifts.create",
  SHIFTS_EDIT: "shifts.edit",
  SHIFTS_DELETE: "shifts.delete",
  SHIFTS_ASSIGN: "shifts.assign",

  // Invoice management
  INVOICES_VIEW: "invoices.view",
  INVOICES_CREATE: "invoices.create",
  INVOICES_APPROVE: "invoices.approve",
  INVOICES_PAY: "invoices.pay",

  // Work log management
  WORK_LOGS_VIEW: "work_logs.view",
  WORK_LOGS_CREATE: "work_logs.create",
  WORK_LOGS_APPROVE: "work_logs.approve",
  WORK_LOGS_REJECT: "work_logs.reject",

  // Credential management
  CREDENTIALS_VIEW: "credentials.view",
  CREDENTIALS_CREATE: "credentials.create",
  CREDENTIALS_VERIFY: "credentials.verify",
  CREDENTIALS_DELETE: "credentials.delete",

  // Analytics and reporting
  ANALYTICS_VIEW: "analytics.view",
  ANALYTICS_EXPORT: "analytics.export",
  REPORTS_GENERATE: "reports.generate",

  // Financial data
  FINANCIAL_VIEW: "financial.view",
  FINANCIAL_EDIT: "financial.edit",
  PAYROLL_ACCESS: "payroll.access",

  // Time clock
  TIME_CLOCK_USE: "time_clock.use",
  TIME_CLOCK_APPROVE: "time_clock.approve",

  // Messaging
  MESSAGES_SEND: "messages.send",
  MESSAGES_VIEW: "messages.view",
  MESSAGES_MODERATE: "messages.moderate",

  // Audit logs
  AUDIT_LOGS_VIEW: "audit_logs.view",
} as const;

// Role-based permission mapping
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  [UserRole.SUPER_ADMIN]: Object.values(PERMISSIONS), // Super admin has all permissions

  [UserRole.CLIENT_ADMINISTRATOR]: [
    PERMISSIONS.USERS_VIEW,
    PERMISSIONS.USERS_CREATE,
    PERMISSIONS.USERS_EDIT,
    PERMISSIONS.FACILITIES_VIEW,
    PERMISSIONS.FACILITIES_EDIT,
    PERMISSIONS.JOBS_VIEW,
    PERMISSIONS.JOBS_CREATE,
    PERMISSIONS.JOBS_EDIT,
    PERMISSIONS.JOBS_MANAGE,
    PERMISSIONS.SHIFTS_VIEW,
    PERMISSIONS.SHIFTS_CREATE,
    PERMISSIONS.SHIFTS_EDIT,
    PERMISSIONS.SHIFTS_ASSIGN,
    PERMISSIONS.INVOICES_VIEW,
    PERMISSIONS.INVOICES_APPROVE,
    PERMISSIONS.WORK_LOGS_VIEW,
    PERMISSIONS.WORK_LOGS_APPROVE,
    PERMISSIONS.CREDENTIALS_VIEW,
    PERMISSIONS.CREDENTIALS_VERIFY,
    PERMISSIONS.ANALYTICS_VIEW,
    PERMISSIONS.REPORTS_GENERATE,
    PERMISSIONS.FINANCIAL_VIEW,
    PERMISSIONS.PAYROLL_ACCESS,
    PERMISSIONS.TIME_CLOCK_APPROVE,
    PERMISSIONS.MESSAGES_SEND,
    PERMISSIONS.MESSAGES_VIEW,
    PERMISSIONS.MESSAGES_MODERATE,
    PERMISSIONS.AUDIT_LOGS_VIEW,
  ],

  [UserRole.FACILITY_MANAGER]: [
    PERMISSIONS.USERS_VIEW,
    PERMISSIONS.JOBS_VIEW,
    PERMISSIONS.JOBS_CREATE,
    PERMISSIONS.JOBS_EDIT,
    PERMISSIONS.JOBS_MANAGE,
    PERMISSIONS.SHIFTS_VIEW,
    PERMISSIONS.SHIFTS_CREATE,
    PERMISSIONS.SHIFTS_EDIT,
    PERMISSIONS.SHIFTS_ASSIGN,
    PERMISSIONS.INVOICES_VIEW,
    PERMISSIONS.INVOICES_APPROVE,
    PERMISSIONS.WORK_LOGS_VIEW,
    PERMISSIONS.WORK_LOGS_APPROVE,
    PERMISSIONS.CREDENTIALS_VIEW,
    PERMISSIONS.CREDENTIALS_VERIFY,
    PERMISSIONS.ANALYTICS_VIEW,
    PERMISSIONS.REPORTS_GENERATE,
    PERMISSIONS.FINANCIAL_VIEW,
    PERMISSIONS.TIME_CLOCK_APPROVE,
    PERMISSIONS.MESSAGES_SEND,
    PERMISSIONS.MESSAGES_VIEW,
  ],

  [UserRole.INTERNAL_EMPLOYEE]: [
    PERMISSIONS.JOBS_VIEW,
    PERMISSIONS.SHIFTS_VIEW,
    PERMISSIONS.WORK_LOGS_VIEW,
    PERMISSIONS.WORK_LOGS_CREATE,
    PERMISSIONS.CREDENTIALS_VIEW,
    PERMISSIONS.CREDENTIALS_CREATE,
    PERMISSIONS.TIME_CLOCK_USE,
    PERMISSIONS.MESSAGES_SEND,
    PERMISSIONS.MESSAGES_VIEW,
  ],

  [UserRole.CONTRACTOR_1099]: [
    PERMISSIONS.JOBS_VIEW,
    PERMISSIONS.SHIFTS_VIEW,
    PERMISSIONS.INVOICES_VIEW,
    PERMISSIONS.INVOICES_CREATE,
    PERMISSIONS.WORK_LOGS_VIEW,
    PERMISSIONS.WORK_LOGS_CREATE,
    PERMISSIONS.CREDENTIALS_VIEW,
    PERMISSIONS.CREDENTIALS_CREATE,
    PERMISSIONS.TIME_CLOCK_USE,
    PERMISSIONS.MESSAGES_SEND,
    PERMISSIONS.MESSAGES_VIEW,
  ],
};

/**
 * Check if a user has a specific permission based on their role
 */
export function hasPermission(userRole: UserRole, permission: string): boolean {
  // Super admin always has permission
  if (userRole === UserRole.SUPER_ADMIN) {
    return true;
  }

  const rolePermissions = ROLE_PERMISSIONS[userRole] || [];
  return rolePermissions.includes(permission);
}

/**
 * Check if a user has any of the specified permissions
 */
export function hasAnyPermission(userRole: UserRole, permissions: string[]): boolean {
  return permissions.some(permission => hasPermission(userRole, permission));
}

/**
 * Check if a user has all of the specified permissions
 */
export function hasAllPermissions(userRole: UserRole, permissions: string[]): boolean {
  return permissions.every(permission => hasPermission(userRole, permission));
}

/**
 * Get all permissions for a specific role
 */
export function getRolePermissions(userRole: UserRole): string[] {
  return ROLE_PERMISSIONS[userRole] || [];
}

/**
 * Filter a list of items based on required permissions
 */
export function filterByPermissions<T extends { requiredPermissions?: string[] }>(
  items: T[],
  userRole: UserRole
): T[] {
  return items.filter(item => {
    if (!item.requiredPermissions || item.requiredPermissions.length === 0) {
      return true;
    }
    return hasAnyPermission(userRole, item.requiredPermissions);
  });
}

/**
 * Permission-based component wrapper
 */
export function withPermissions<P extends object>(
  Component: React.ComponentType<P>,
  requiredPermissions: string[],
  fallback?: React.ComponentType<P>
) {
  return function PermissionWrappedComponent(props: P & { userRole: UserRole }) {
    const { userRole, ...componentProps } = props;
    
    if (hasAnyPermission(userRole, requiredPermissions)) {
      return <Component {...(componentProps as P)} />;
    }
    
    if (fallback) {
      return <fallback {...(componentProps as P)} />;
    }
    
    return null;
  };
}
