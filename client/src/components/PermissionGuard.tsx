import React from 'react';
import { useFacilityPermissions, FacilityPermission } from '@/hooks/use-facility-permissions';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, AlertTriangle } from 'lucide-react';

interface PermissionGuardProps {
  children: React.ReactNode;
  permission?: FacilityPermission;
  permissions?: FacilityPermission[];
  requireAll?: boolean;
  fallback?: React.ReactNode;
  showAccessDenied?: boolean;
}

export function PermissionGuard({ 
  children, 
  permission, 
  permissions = [], 
  requireAll = false,
  fallback = null,
  showAccessDenied = false
}: PermissionGuardProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = useFacilityPermissions();
  
  // Determine if user has required permissions
  let hasAccess = true;
  
  if (permission) {
    hasAccess = hasPermission(permission);
  } else if (permissions.length > 0) {
    hasAccess = requireAll 
      ? hasAllPermissions(permissions) 
      : hasAnyPermission(permissions);
  }
  
  if (hasAccess) {
    return <>{children}</>;
  }
  
  if (fallback) {
    return <>{fallback}</>;
  }
  
  if (showAccessDenied) {
    return (
      <Alert className="border-red-200 bg-red-50 dark:bg-red-900/20">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800 dark:text-red-200">
          You don't have permission to access this feature. Contact your administrator if you need access.
        </AlertDescription>
      </Alert>
    );
  }
  
  return null;
}

// Helper component for conditional buttons
interface ConditionalButtonProps {
  children: React.ReactNode;
  permission?: FacilityPermission;
  permissions?: FacilityPermission[];
  requireAll?: boolean;
}

export function ConditionalButton({ 
  children, 
  permission, 
  permissions = [], 
  requireAll = false 
}: ConditionalButtonProps) {
  return (
    <PermissionGuard 
      permission={permission} 
      permissions={permissions} 
      requireAll={requireAll}
    >
      {children}
    </PermissionGuard>
  );
}

// Helper component for navigation items
interface ConditionalNavItemProps {
  children: React.ReactNode;
  permission?: FacilityPermission;
  permissions?: FacilityPermission[];
  href?: string;
}

export function ConditionalNavItem({ 
  children, 
  permission, 
  permissions = [],
  href
}: ConditionalNavItemProps) {
  const { canAccessPage } = useFacilityPermissions();
  
  // If href is provided, check page access
  if (href) {
    const page = href.split('/').pop() || '';
    if (!canAccessPage(page)) {
      return null;
    }
  }
  
  return (
    <PermissionGuard 
      permission={permission} 
      permissions={permissions}
    >
      {children}
    </PermissionGuard>
  );
}