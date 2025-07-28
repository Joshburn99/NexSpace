import React, { ReactNode } from "react";
import { useFacilityPermissions } from "@/hooks/use-facility-permissions";
import { FacilityPermission } from "@/hooks/use-facility-permissions";

interface PermissionWrapperProps {
  children: ReactNode;
  permission?: FacilityPermission;
  permissions?: FacilityPermission[];
  requireAll?: boolean;
  fallback?: ReactNode;
  className?: string;
}

/**
 * Permission wrapper component that conditionally renders children based on user permissions
 *
 * @param permission - Single permission to check
 * @param permissions - Array of permissions to check
 * @param requireAll - If true, user must have ALL permissions. If false, user needs ANY permission (default: false)
 * @param fallback - Component to render if user lacks permission (default: null)
 * @param className - CSS classes to apply to wrapper
 *
 * Examples:
 * <CanAccess permission="create_shifts">
 *   <Button>Post Shift</Button>
 * </CanAccess>
 *
 * <CanAccess permissions={['view_billing', 'manage_billing']} requireAll={false}>
 *   <BillingDashboard />
 * </CanAccess>
 */
export function CanAccess({
  children,
  permission,
  permissions = [],
  requireAll = false,
  fallback = null,
  className,
}: PermissionWrapperProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = useFacilityPermissions();

  // Build permission array from single permission or permissions array
  const permissionsToCheck = permission ? [permission] : permissions;

  // No permissions specified - render children (for always-visible content)
  if (permissionsToCheck.length === 0) {
    return <div className={className}>{children}</div>;
  }

  // Check permissions based on requireAll flag
  const hasAccess = requireAll
    ? hasAllPermissions(permissionsToCheck)
    : hasAnyPermission(permissionsToCheck);

  // Debug logging for permission checks
    permissionsToCheck,
    requireAll,
    hasAccess,
    userPermissions: useFacilityPermissions().getUserPermissions(),
  });

  if (!hasAccess) {
    return fallback ? <div className={className}>{fallback}</div> : null;
  }

  return <div className={className}>{children}</div>;
}

/**
 * Hook for permission-based conditional rendering in components
 *
 * @param permission - Permission to check
 * @returns boolean indicating if user has permission
 *
 * Example:
 * const canCreateShifts = usePermissionCheck('create_shifts');
 * if (canCreateShifts) {
 *   return <PostShiftButton />;
 * }
 */
export function usePermissionCheck(permission: FacilityPermission): boolean {
  const { hasPermission } = useFacilityPermissions();
  return hasPermission(permission);
}

/**
 * Hook for checking multiple permissions
 *
 * @param permissions - Array of permissions to check
 * @param requireAll - If true, user must have ALL permissions
 * @returns boolean indicating if user has required permissions
 */
export function usePermissionsCheck(
  permissions: FacilityPermission[],
  requireAll: boolean = false
): boolean {
  const { hasAnyPermission, hasAllPermissions } = useFacilityPermissions();
  return requireAll ? hasAllPermissions(permissions) : hasAnyPermission(permissions);
}
