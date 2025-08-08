import { createContext, useContext, ReactNode } from "react";
import { useCurrentUser } from "@/hooks/use-current-user";

// Define all possible facility user permissions
export type FacilityPermission =
  | "view_schedules"
  | "create_shifts"
  | "edit_shifts"
  | "delete_shifts"
  | "assign_staff"
  | "approve_shift_requests"
  | "view_staff"
  | "create_staff"
  | "edit_staff"
  | "deactivate_staff"
  | "view_staff_credentials"
  | "edit_staff_credentials"
  | "manage_credentials"
  | "view_facility_profile"
  | "edit_facility_profile"
  | "view_billing"
  | "manage_billing"
  | "view_rates"
  | "edit_rates"
  | "approve_invoices"
  | "view_reports"
  | "view_analytics"
  | "export_data"
  | "view_compliance"
  | "manage_compliance"
  | "upload_documents"
  | "manage_facility_users"
  | "manage_facility_settings"
  | "manage_permissions"
  | "view_audit_logs"
  | "view_job_openings"
  | "manage_job_openings"
  | "view_workflow_automation"
  | "manage_workflow_automation"
  | "view_referral_system"
  | "manage_referral_system"
  | "view_attendance_reports"
  | "view_overtime_reports"
  | "view_float_pool_savings"
  | "view_agency_usage";

// Role-based permission mappings
const ROLE_PERMISSIONS: Record<string, FacilityPermission[]> = {
  facility_admin: [
    "view_schedules",
    "create_shifts",
    "edit_shifts",
    "delete_shifts",
    "assign_staff",
    "approve_shift_requests",
    "view_staff",
    "create_staff",
    "edit_staff",
    "deactivate_staff",
    "view_staff_credentials",
    "edit_staff_credentials",
    "manage_credentials",
    "view_facility_profile",
    "edit_facility_profile",
    "manage_facility_settings",
    "view_billing",
    "manage_billing",
    "view_rates",
    "edit_rates",
    "approve_invoices",
    "view_reports",
    "view_analytics",
    "export_data",
    "view_compliance",
    "manage_compliance",
    "upload_documents",
    "manage_facility_users",
    "manage_permissions",
    "view_audit_logs",
    "view_job_openings",
    "manage_job_openings",
    "view_workflow_automation",
    "manage_workflow_automation",
    "view_referral_system",
    "manage_referral_system",
    "view_attendance_reports",
    "view_overtime_reports",
    "view_float_pool_savings",
    "view_agency_usage",
  ],
  scheduling_coordinator: [
    "view_schedules",
    "create_shifts",
    "edit_shifts",
    "assign_staff",
    "approve_shift_requests",
    "view_staff",
    "view_reports",
    "view_analytics",
  ],
  hr_manager: [
    "view_staff",
    "create_staff",
    "edit_staff",
    "deactivate_staff",
    "view_staff_credentials",
    "edit_staff_credentials",
    "manage_credentials",
    "view_compliance",
    "manage_compliance",
    "upload_documents",
    "view_reports",
    "export_data",
    "view_job_openings",
    "manage_job_openings",
    "view_referral_system",
    "manage_referral_system",
    "view_attendance_reports",
    "view_overtime_reports",
  ],
  corporate: [
    "view_schedules",
    "create_shifts",
    "edit_shifts",
    "assign_staff",
    "view_staff",
    "view_reports",
    "view_analytics",
  ],
  regional_director: [
    "view_schedules",
    "create_shifts",
    "edit_shifts",
    "assign_staff",
    "view_staff",
    "view_facility_profile",
    "edit_facility_profile",
    "view_billing",
    "view_reports",
    "view_analytics",
    "export_data",
    "view_compliance",
    "manage_compliance",
    "view_referral_system",
    "manage_referral_system",
    "view_attendance_reports",
    "view_overtime_reports",
    "view_float_pool_savings",
    "view_agency_usage",
  ],
  facility_administrator: [
    "view_schedules",
    "create_shifts",
    "edit_shifts",
    "delete_shifts",
    "assign_staff",
    "approve_shift_requests",
    "view_staff",
    "create_staff",
    "edit_staff",
    "deactivate_staff",
    "view_staff_credentials",
    "edit_staff_credentials",
    "manage_credentials",
    "view_facility_profile",
    "edit_facility_profile",
    "manage_facility_settings",
    "view_billing",
    "manage_billing",
    "view_rates",
    "edit_rates",
    "approve_invoices",
    "view_reports",
    "view_analytics",
    "export_data",
    "view_compliance",
    "manage_compliance",
    "upload_documents",
    "manage_facility_users",
    "view_audit_logs",
    "view_job_openings",
    "manage_job_openings",
    "view_workflow_automation",
    "manage_workflow_automation",
    "view_referral_system",
    "manage_referral_system",
    "view_attendance_reports",
    "view_overtime_reports",
    "view_float_pool_savings",
    "view_agency_usage",
  ],
  billing: [
    "view_billing",
    "manage_billing",
    "view_rates",
    "edit_rates",
    "approve_invoices",
    "view_reports",
    "export_data",
    "view_analytics",
  ],
  supervisor: ["view_schedules", "assign_staff", "view_staff", "view_reports"],
  director_of_nursing: [
    "view_schedules",
    "create_shifts",
    "edit_shifts",
    "assign_staff",
    "approve_shift_requests",
    "view_staff",
    "create_staff",
    "edit_staff",
    "view_staff_credentials",
    "edit_staff_credentials",
    "manage_credentials",
    "view_reports",
    "view_analytics",
    "view_compliance",
    "manage_compliance",
    "view_referral_system",
    "manage_referral_system",
    "view_attendance_reports",
    "view_overtime_reports",
    "view_float_pool_savings",
  ],
  viewer: ["view_schedules", "view_staff", "view_facility_profile", "view_billing", "view_reports"],
};

// Page-specific permission requirements
const PAGE_PERMISSIONS: Record<string, FacilityPermission[]> = {
  dashboard: ["view_schedules", "view_staff"],
  schedule: ["view_schedules"],
  shifts: ["view_schedules", "create_shifts", "edit_shifts"],
  staff: ["view_staff"],
  "staff-management": ["view_staff", "create_staff", "edit_staff"],
  credentials: ["view_staff_credentials", "manage_credentials"],
  facility: ["view_facility_profile"],
  "facility-settings": ["view_facility_profile", "edit_facility_profile", "manage_facility_settings"],
  billing: ["view_billing"],
  "billing-management": ["view_billing", "manage_billing"],
  rates: ["view_rates"],
  "rates-management": ["view_rates", "edit_rates"],
  invoices: ["view_billing", "approve_invoices"],
  reports: ["view_reports"],
  analytics: ["view_analytics"],
  compliance: ["view_compliance"],
  "compliance-management": ["view_compliance", "manage_compliance"],
  users: ["manage_facility_users"],
  permissions: ["manage_permissions"],
  "audit-logs": ["view_audit_logs"],
  jobs: ["view_job_openings"],
  "job-management": ["view_job_openings", "manage_job_openings"],
  workflow: ["view_workflow_automation"],
  "workflow-management": ["view_workflow_automation", "manage_workflow_automation"],
  referrals: ["view_referral_system"],
  "referral-management": ["view_referral_system", "manage_referral_system"],
  attendance: ["view_attendance_reports"],
  overtime: ["view_overtime_reports"],
  "float-pool": ["view_float_pool_savings"],
  "agency-usage": ["view_agency_usage"],
};

interface FacilityPermissionsContextType {
  hasPermission: (permission: FacilityPermission) => boolean;
  hasAnyPermission: (permissions: FacilityPermission[]) => boolean;
  hasAllPermissions: (permissions: FacilityPermission[]) => boolean;
  getUserPermissions: () => FacilityPermission[];
  canAccessPage: (page: string) => boolean;
  facilityId: number | null;
}

const FacilityPermissionsContext = createContext<FacilityPermissionsContextType | null>(null);

export function FacilityPermissionsProvider({ children }: { children: ReactNode }) {
  const { user } = useCurrentUser();

  const getFacilityId = (): number | null => {
    if (!user) return null;
    
    // Check if user has facilityId property
    if ('facilityId' in user && typeof user.facilityId === 'number') {
      return user.facilityId;
    }
    
    // Check facilities array
    if ('facilities' in user && Array.isArray(user.facilities) && user.facilities.length > 0) {
      const firstFacility = user.facilities[0];
      if (typeof firstFacility === 'object' && 'id' in firstFacility) {
        return firstFacility.id;
      }
      if (typeof firstFacility === 'number') {
        return firstFacility;
      }
    }
    
    return null;
  };

  const getUserPermissions = (): FacilityPermission[] => {
    if (!user) return [];
    
    // Super admin gets all permissions
    if (user.role === 'super_admin') {
      return Object.values(PAGE_PERMISSIONS).flat();
    }
    
    // Check role-based permissions
    const userRole = user.role as keyof typeof ROLE_PERMISSIONS;
    if (userRole in ROLE_PERMISSIONS) {
      return ROLE_PERMISSIONS[userRole];
    }
    
    // Check custom permissions
    if ('permissions' in user && Array.isArray(user.permissions)) {
      return user.permissions as FacilityPermission[];
    }
    
    return [];
  };

  const hasPermission = (permission: FacilityPermission): boolean => {
    const permissions = getUserPermissions();
    return permissions.includes(permission);
  };

  const hasAnyPermission = (permissions: FacilityPermission[]): boolean => {
    const userPermissions = getUserPermissions();
    return permissions.some(permission => userPermissions.includes(permission));
  };

  const hasAllPermissions = (permissions: FacilityPermission[]): boolean => {
    const userPermissions = getUserPermissions();
    return permissions.every(permission => userPermissions.includes(permission));
  };

  const canAccessPage = (page: string): boolean => {
    const pagePermissions = PAGE_PERMISSIONS[page as keyof typeof PAGE_PERMISSIONS];
    if (!pagePermissions) return true; // No restrictions for unknown pages
    return hasAnyPermission(pagePermissions);
  };

  const value: FacilityPermissionsContextType = {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    getUserPermissions,
    canAccessPage,
    facilityId: getFacilityId(),
  };

  return (
    <FacilityPermissionsContext.Provider value={value}>
      {children}
    </FacilityPermissionsContext.Provider>
  );
}

export function useFacilityPermissions() {
  const context = useContext(FacilityPermissionsContext);
  if (!context) {
    throw new Error("useFacilityPermissions must be used within a FacilityPermissionsProvider");
  }
  return context;
}

// Helper hook for conditional rendering
export function useConditionalRender() {
  const { hasPermission, hasAnyPermission } = useFacilityPermissions();

  return {
    showIfPermission: (permission: FacilityPermission, component: ReactNode) =>
      hasPermission(permission) ? component : null,
    showIfAnyPermission: (permissions: FacilityPermission[], component: ReactNode) =>
      hasAnyPermission(permissions) ? component : null,
  };
}
