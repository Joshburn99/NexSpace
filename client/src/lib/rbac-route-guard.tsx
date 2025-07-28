import { useAuth } from "@/hooks/use-auth";
import { useRBAC } from "@/hooks/use-rbac";
import { Loader2, Shield } from "lucide-react";
import { Redirect, Route } from "wouter";
import type { Permission, SystemRole } from "@shared/rbac";

/**
 * Enhanced Route Protection with RBAC
 * Provides comprehensive access control for frontend routes
 */

interface RBACRouteGuardProps {
  path: string;
  component: () => React.JSX.Element | null;
  requiredPermissions?: Permission[];
  requiredRole?: SystemRole;
  fallbackPath?: string;
  allowSuperAdmin?: boolean;
}

export function RBACRouteGuard({
  path,
  component: Component,
  requiredPermissions = [],
  requiredRole,
  fallbackPath = "/dashboard",
  allowSuperAdmin = true
}: RBACRouteGuardProps) {
  const { user, isLoading } = useAuth();
  const { hasPermission, hasRole, hasAnyPermission } = useRBAC();

  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      </Route>
    );
  }

  if (!user) {
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  return (
    <Route path={path}>
      {() => {
        // Super admin bypass (if allowed)
        if (allowSuperAdmin && user.role === 'super_admin') {
          return <Component />;
        }

        // Check required role
        if (requiredRole && !hasRole(requiredRole)) {
          return <AccessDeniedPage requiredRole={requiredRole} fallbackPath={fallbackPath} />;
        }

        // Check required permissions
        if (requiredPermissions.length > 0) {
          const hasRequiredPermissions = requiredPermissions.every(permission => 
            hasPermission(permission)
          );
          
          if (!hasRequiredPermissions) {
            return <AccessDeniedPage requiredPermissions={requiredPermissions} fallbackPath={fallbackPath} />;
          }
        }

        return <Component />;
      }}
    </Route>
  );
}

// Enhanced ProtectedRoute that includes RBAC
export function ProtectedRoute({
  path,
  component: Component,
  requiredPermissions,
  requiredRole,
  fallbackPath,
  allowSuperAdmin = true
}: RBACRouteGuardProps) {
  return (
    <RBACRouteGuard
      path={path}
      component={Component}
      requiredPermissions={requiredPermissions}
      requiredRole={requiredRole}
      fallbackPath={fallbackPath}
      allowSuperAdmin={allowSuperAdmin}
    />
  );
}

// Admin-only route protection
export function AdminRoute({
  path,
  component,
  fallbackPath = "/dashboard"
}: {
  path: string;
  component: () => React.JSX.Element | null;
  fallbackPath?: string;
}) {
  return (
    <ProtectedRoute
      path={path}
      component={component}
      requiredRole="super_admin"
      fallbackPath={fallbackPath}
      allowSuperAdmin={true}
    />
  );
}

// Facility user route protection
export function FacilityRoute({
  path,
  component,
  requiredPermissions,
  fallbackPath = "/facility-dashboard"
}: {
  path: string;
  component: () => React.JSX.Element | null;
  requiredPermissions?: Permission[];
  fallbackPath?: string;
}) {
  const facilityRoles: SystemRole[] = [
    'facility_admin', 'scheduling_coordinator', 'hr_manager', 
    'billing_manager', 'supervisor', 'director_of_nursing', 
    'corporate', 'regional_director'
  ];

  return (
    <Route path={path}>
      {() => {
        const { user } = useAuth();
        const { hasAnyRole, hasPermission } = useRBAC();

        if (!user) {
          return <Redirect to="/auth" />;
        }

        // Check if user has any facility role or is super admin
        if (!hasAnyRole(facilityRoles) && user.role !== 'super_admin') {
          return <AccessDeniedPage fallbackPath={fallbackPath} />;
        }

        // Check permissions if specified
        if (requiredPermissions && requiredPermissions.length > 0) {
          const hasRequiredPermissions = requiredPermissions.every(permission =>
            hasPermission(permission)
          );

          if (!hasRequiredPermissions && user.role !== 'super_admin') {
            return <AccessDeniedPage requiredPermissions={requiredPermissions} fallbackPath={fallbackPath} />;
          }
        }

        const ComponentToRender = component;
        return <ComponentToRender />;
      }}
    </Route>
  );
}

// Staff-only route protection
export function StaffRoute({
  path,
  component,
  fallbackPath = "/dashboard"
}: {
  path: string;
  component: () => React.JSX.Element | null;
  fallbackPath?: string;
}) {
  return (
    <ProtectedRoute
      path={path}
      component={component}
      requiredRole="staff"
      fallbackPath={fallbackPath}
    />
  );
}

// Access denied page component
function AccessDeniedPage({
  requiredRole,
  requiredPermissions,
  fallbackPath = "/dashboard"
}: {
  requiredRole?: SystemRole;
  requiredPermissions?: Permission[];
  fallbackPath?: string;
}) {
  const { user } = useAuth();

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 shadow-lg rounded-lg p-8 text-center">
        <Shield className="h-16 w-16 text-red-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Access Denied
        </h1>
        <div className="text-gray-600 dark:text-gray-300 mb-6">
          <p className="mb-2">You don't have permission to access this page.</p>
          {requiredRole && (
            <p className="text-sm">Required role: <span className="font-semibold">{requiredRole}</span></p>
          )}
          {requiredPermissions && requiredPermissions.length > 0 && (
            <div className="text-sm mt-2">
              <p>Required permissions:</p>
              <ul className="list-disc list-inside mt-1">
                {requiredPermissions.map((permission, index) => (
                  <li key={index} className="font-mono text-xs">{permission}</li>
                ))}
              </ul>
            </div>
          )}
          {user && (
            <p className="text-xs mt-3 text-gray-500">
              Current role: <span className="font-semibold">{user.role}</span>
            </p>
          )}
        </div>
        <button
          onClick={() => window.location.href = fallbackPath}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}

// Hook for checking route access programmatically
export function useRouteAccess() {
  const { user } = useAuth();
  const { hasPermission, hasRole, hasAnyRole } = useRBAC();

  const canAccessRoute = (
    requiredPermissions: Permission[] = [],
    requiredRole?: SystemRole,
    allowSuperAdmin: boolean = true
  ): boolean => {
    if (!user) return false;

    // Super admin bypass
    if (allowSuperAdmin && user.role === 'super_admin') {
      return true;
    }

    // Check role requirement
    if (requiredRole && !hasRole(requiredRole)) {
      return false;
    }

    // Check permission requirements
    if (requiredPermissions.length > 0) {
      return requiredPermissions.every(permission => hasPermission(permission));
    }

    return true;
  };

  const canAccessAdminRoutes = (): boolean => {
    return user?.role === 'super_admin';
  };

  const canAccessFacilityRoutes = (requiredPermissions: Permission[] = []): boolean => {
    if (!user) return false;

    const facilityRoles: SystemRole[] = [
      'facility_admin', 'scheduling_coordinator', 'hr_manager',
      'billing_manager', 'supervisor', 'director_of_nursing',
      'corporate', 'regional_director'
    ];

    const hasFacilityRole = hasAnyRole(facilityRoles) || user.role === 'super_admin';
    
    if (!hasFacilityRole) return false;

    if (requiredPermissions.length > 0 && user.role !== 'super_admin') {
      return requiredPermissions.every(permission => hasPermission(permission));
    }

    return true;
  };

  return {
    canAccessRoute,
    canAccessAdminRoutes,
    canAccessFacilityRoutes
  };
}