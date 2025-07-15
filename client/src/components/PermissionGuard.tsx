import React from 'react';
import { useFacilityPermissions } from '@/hooks/use-facility-permissions';
import { FacilityPermission } from '@/hooks/use-facility-permissions';
import { Button } from '@/components/ui/button';

interface PermissionGuardProps {
  requiredPermissions: FacilityPermission[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
  requireAll?: boolean; // If true, requires ALL permissions. If false, requires ANY permission
}

export function PermissionGuard({
  requiredPermissions,
  children,
  fallback = null,
  requireAll = false
}: PermissionGuardProps) {
  const { hasPermission, hasAnyPermission } = useFacilityPermissions();

  // Safety check for undefined or empty permissions
  if (!requiredPermissions || requiredPermissions.length === 0) {
    return <>{children}</>;
  }

  const hasAccess = requireAll
    ? requiredPermissions.every(permission => hasPermission(permission))
    : hasAnyPermission(requiredPermissions);

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

// Convenience component for hiding elements when user lacks permissions
export function ConditionalRender({
  requiredPermissions,
  children,
  requireAll = false
}: Omit<PermissionGuardProps, 'fallback'>) {
  return (
    <PermissionGuard
      requiredPermissions={requiredPermissions}
      requireAll={requireAll}
    >
      {children}
    </PermissionGuard>
  );
}

// Conditional Button component that only renders if user has permission
interface ConditionalButtonProps {
  permission: FacilityPermission;
  children: React.ReactNode;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
}

export function ConditionalButton({
  permission,
  children,
  variant = "default",
  size = "default",
  className,
  onClick,
  disabled
}: ConditionalButtonProps) {
  const { hasPermission } = useFacilityPermissions();

  if (!hasPermission(permission)) {
    return null;
  }

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </Button>
  );
}

// Hook for conditional rendering in components
export function useConditionalRender() {
  const { hasPermission, hasAnyPermission } = useFacilityPermissions();

  const shouldRender = (
    requiredPermissions: FacilityPermission[],
    requireAll: boolean = false
  ) => {
    return requireAll
      ? requiredPermissions.every(permission => hasPermission(permission))
      : hasAnyPermission(requiredPermissions);
  };

  return { shouldRender };
}