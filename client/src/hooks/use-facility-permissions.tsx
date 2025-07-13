import { createContext, useContext, ReactNode } from 'react';
import { useAuth } from '@/hooks/use-auth';

// Define all possible facility user permissions
export type FacilityPermission = 
  | 'view_schedules'
  | 'create_shifts'
  | 'edit_shifts'
  | 'delete_shifts'
  | 'assign_staff'
  | 'approve_shift_requests'
  | 'view_staff'
  | 'create_staff'
  | 'edit_staff'
  | 'deactivate_staff'
  | 'view_staff_credentials'
  | 'edit_staff_credentials'
  | 'manage_credentials'
  | 'view_facility_profile'
  | 'edit_facility_profile'
  | 'view_billing'
  | 'manage_billing'
  | 'view_rates'
  | 'edit_rates'
  | 'approve_invoices'
  | 'view_reports'
  | 'view_analytics'
  | 'export_data'
  | 'view_compliance'
  | 'manage_compliance'
  | 'upload_documents'
  | 'manage_facility_users'
  | 'manage_facility_settings'
  | 'manage_permissions'
  | 'view_audit_logs';

// Role-based permission mappings
const ROLE_PERMISSIONS: Record<string, FacilityPermission[]> = {
  facility_admin: [
    'view_schedules', 'create_shifts', 'edit_shifts', 'delete_shifts', 'assign_staff', 'approve_shift_requests',
    'view_staff', 'create_staff', 'edit_staff', 'deactivate_staff', 'view_staff_credentials', 'edit_staff_credentials', 'manage_credentials',
    'view_facility_profile', 'edit_facility_profile', 'manage_facility_settings',
    'view_billing', 'manage_billing', 'view_rates', 'edit_rates', 'approve_invoices',
    'view_reports', 'view_analytics', 'export_data',
    'view_compliance', 'manage_compliance', 'upload_documents',
    'manage_facility_users', 'manage_permissions', 'view_audit_logs'
  ],
  scheduling_coordinator: [
    'view_schedules', 'create_shifts', 'edit_shifts', 'assign_staff', 'approve_shift_requests',
    'view_staff', 'view_reports', 'view_analytics'
  ],
  hr_manager: [
    'view_staff', 'create_staff', 'edit_staff', 'deactivate_staff', 'view_staff_credentials', 'edit_staff_credentials', 'manage_credentials',
    'view_compliance', 'manage_compliance', 'upload_documents', 'view_reports', 'export_data'
  ],
  corporate: [
    'view_schedules', 'create_shifts', 'edit_shifts', 'assign_staff',
    'view_staff', 'view_reports', 'view_analytics'
  ],
  regional_director: [
    'view_schedules', 'create_shifts', 'edit_shifts', 'assign_staff',
    'view_staff', 'view_reports', 'view_analytics'
  ],
  billing: [
    'view_billing', 'manage_billing', 'view_rates', 'edit_rates', 'approve_invoices',
    'view_reports', 'export_data', 'view_analytics'
  ],
  supervisor: [
    'view_schedules', 'assign_staff', 'view_staff', 'view_reports'
  ],
  director_of_nursing: [
    'view_schedules', 'create_shifts', 'edit_shifts', 'assign_staff', 'approve_shift_requests',
    'view_staff', 'create_staff', 'edit_staff', 'view_staff_credentials', 'edit_staff_credentials', 'manage_credentials',
    'view_reports', 'view_analytics', 'view_compliance', 'manage_compliance'
  ],
  viewer: [
    'view_schedules', 'view_staff', 'view_facility_profile', 'view_billing', 'view_reports'
  ]
};

interface FacilityPermissionsContextType {
  hasPermission: (permission: FacilityPermission) => boolean;
  hasAnyPermission: (permissions: FacilityPermission[]) => boolean;
  hasAllPermissions: (permissions: FacilityPermission[]) => boolean;
  getUserPermissions: () => FacilityPermission[];
  canAccessPage: (page: string) => boolean;
}

const FacilityPermissionsContext = createContext<FacilityPermissionsContextType | null>(null);

export function FacilityPermissionsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  
  const getUserPermissions = (): FacilityPermission[] => {
    if (!user || user.role === 'super_admin') {
      // Super admins have all permissions
      return Object.values(ROLE_PERMISSIONS).flat();
    }
    
    // Get permissions from user's role and explicit permissions
    const userPermissions = (user as any).permissions || [];
    const rolePermissions = ROLE_PERMISSIONS[user.role] || [];
    
    // Debug logging for permissions
    console.log(`[PERMISSIONS] getUserPermissions debug for ${user.email}:`, {
      userRole: user.role,
      userPermissions,
      rolePermissions,
      availableRoles: Object.keys(ROLE_PERMISSIONS),
      hasUserPermissions: userPermissions && userPermissions.length > 0,
      userPermissionsLength: userPermissions?.length || 0
    });
    
    // If user has explicit permissions from backend (login/impersonation), use those
    if (userPermissions && userPermissions.length > 0) {
      console.log(`[PERMISSIONS] Using explicit permissions for ${user.email}:`, userPermissions);
      return userPermissions as FacilityPermission[];
    }
    
    // Otherwise fallback to role-based permissions
    console.log(`[PERMISSIONS] Using role-based permissions for ${user.role}:`, rolePermissions);
    return rolePermissions as FacilityPermission[];
  };

  const hasPermission = (permission: FacilityPermission): boolean => {
    if (!user) return false;
    
    // Super admins have all permissions
    if (user.role === 'super_admin') return true;
    
    const userPermissions = getUserPermissions();
    return userPermissions.includes(permission);
  };

  const hasAnyPermission = (permissions: FacilityPermission[]): boolean => {
    return permissions.some(permission => hasPermission(permission));
  };

  const hasAllPermissions = (permissions: FacilityPermission[]): boolean => {
    return permissions.every(permission => hasPermission(permission));
  };

  const canAccessPage = (page: string): boolean => {
    const pagePermissions: Record<string, FacilityPermission[]> = {
      'dashboard': ['view_schedules', 'view_staff', 'view_reports'],
      'schedule': ['view_schedules'],
      'staff': ['view_staff'],
      'billing': ['view_billing'],
      'reports': ['view_reports'],
      'analytics': ['view_analytics'],
      'compliance': ['manage_compliance'],
      'settings': ['view_facility_profile'],
      'users': ['manage_facility_users']
    };

    const requiredPermissions = pagePermissions[page];
    if (!requiredPermissions) return true; // Unknown pages are accessible by default
    
    return hasAnyPermission(requiredPermissions);
  };

  return (
    <FacilityPermissionsContext.Provider value={{
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
      getUserPermissions,
      canAccessPage
    }}>
      {children}
    </FacilityPermissionsContext.Provider>
  );
}

export function useFacilityPermissions() {
  const context = useContext(FacilityPermissionsContext);
  if (!context) {
    throw new Error('useFacilityPermissions must be used within a FacilityPermissionsProvider');
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