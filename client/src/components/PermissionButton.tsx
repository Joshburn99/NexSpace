import React from 'react';
import { Button } from '@/components/ui/button';
import { CanAccess } from './PermissionWrapper';
import { FacilityPermission } from '@/hooks/use-facility-permissions';

interface PermissionButtonProps {
  permission?: FacilityPermission;
  permissions?: FacilityPermission[];
  requireAll?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

/**
 * Permission-aware button component that only renders if user has required permissions
 * 
 * @param permission - Single permission required to show button
 * @param permissions - Array of permissions (user needs any or all based on requireAll)
 * @param requireAll - If true, user must have ALL permissions
 * @param children - Button content
 * @param onClick - Click handler
 * @param className - Additional CSS classes
 * @param variant - Button variant
 * @param size - Button size
 * @param disabled - Whether button is disabled
 * @param type - Button type
 * 
 * Examples:
 * <PermissionButton permission="create_shifts" onClick={handlePostShift}>
 *   Post Shift
 * </PermissionButton>
 * 
 * <PermissionButton permissions={['edit_shifts', 'delete_shifts']} variant="destructive">
 *   Delete Shift
 * </PermissionButton>
 */
export function PermissionButton({
  permission,
  permissions,
  requireAll = false,
  children,
  onClick,
  className,
  variant = 'default',
  size = 'default',
  disabled = false,
  type = 'button',
  ...props
}: PermissionButtonProps) {
  return (
    <CanAccess permission={permission} permissions={permissions} requireAll={requireAll}>
      <Button
        type={type}
        variant={variant}
        size={size}
        onClick={onClick}
        disabled={disabled}
        className={className}
        {...props}
      >
        {children}
      </Button>
    </CanAccess>
  );
}