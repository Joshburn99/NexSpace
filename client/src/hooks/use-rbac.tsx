import { createContext, useContext, ReactNode, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { 
  SystemRole, 
  Permission, 
  hasPermission, 
  hasAnyPermission, 
  hasAllPermissions,
  ROLE_PERMISSIONS,
  ROLE_METADATA
} from '@shared/rbac';

interface RBACContextType {
  userRole: SystemRole;
  permissions: Permission[];
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
  hasAllPermissions: (permissions: Permission[]) => boolean;
  roleMetadata: typeof ROLE_METADATA[SystemRole];
}

const RBACContext = createContext<RBACContextType | null>(null);

export function RBACProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  
  const contextValue = useMemo(() => {
    // Default to viewer role if no user or role
    const userRole = (user?.role as SystemRole) || 'viewer';
    const permissions = ROLE_PERMISSIONS[userRole] || [];
    const roleMetadata = ROLE_METADATA[userRole];
    
    return {
      userRole,
      permissions,
      hasPermission: (permission: Permission) => hasPermission(userRole, permission),
      hasAnyPermission: (permissions: Permission[]) => hasAnyPermission(userRole, permissions),
      hasAllPermissions: (permissions: Permission[]) => hasAllPermissions(userRole, permissions),
      roleMetadata
    };
  }, [user?.role]);
  
  return (
    <RBACContext.Provider value={contextValue}>
      {children}
    </RBACContext.Provider>
  );
}

export function useRBAC() {
  const context = useContext(RBACContext);
  if (!context) {
    throw new Error('useRBAC must be used within RBACProvider');
  }
  return context;
}

// Permission-based component wrapper
interface PermissionGateProps {
  permission?: Permission;
  permissions?: Permission[];
  requireAll?: boolean;
  children: ReactNode;
  fallback?: ReactNode;
  showIndicator?: boolean;
}

export function PermissionGate({ 
  permission, 
  permissions, 
  requireAll = false,
  children, 
  fallback = null,
  showIndicator = false
}: PermissionGateProps) {
  const rbac = useRBAC();
  
  let hasAccess = false;
  
  if (permission) {
    hasAccess = rbac.hasPermission(permission);
  } else if (permissions) {
    hasAccess = requireAll 
      ? rbac.hasAllPermissions(permissions)
      : rbac.hasAnyPermission(permissions);
  } else {
    hasAccess = true; // No permission specified, allow access
  }
  
  if (!hasAccess) {
    if (showIndicator && fallback) {
      return (
        <div className="relative group">
          {fallback}
          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
            Requires permission: {permission || permissions?.join(', ')}
          </div>
        </div>
      );
    }
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
}

// Action button with permission indicator
interface PermissionActionProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  permission?: Permission;
  permissions?: Permission[];
  requireAll?: boolean;
  showLockIcon?: boolean;
  tooltipText?: string;
}

export function PermissionAction({ 
  permission,
  permissions,
  requireAll = false,
  showLockIcon = true,
  tooltipText,
  children,
  className = '',
  ...props
}: PermissionActionProps) {
  const rbac = useRBAC();
  
  let hasAccess = false;
  
  if (permission) {
    hasAccess = rbac.hasPermission(permission);
  } else if (permissions) {
    hasAccess = requireAll 
      ? rbac.hasAllPermissions(permissions)
      : rbac.hasAnyPermission(permissions);
  } else {
    hasAccess = true;
  }
  
  if (!hasAccess) {
    const message = tooltipText || `Requires ${permission || permissions?.join(', ')} permission`;
    
    return (
      <div className="relative inline-block group">
        <button
          className={`${className} opacity-50 cursor-not-allowed relative`}
          disabled
          {...props}
        >
          {children}
          {showLockIcon && (
            <svg className="w-3 h-3 absolute top-0 right-0 -mt-1 -mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
          )}
        </button>
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
          {message}
        </div>
      </div>
    );
  }
  
  return (
    <button className={className} {...props}>
      {children}
    </button>
  );
}

// Role badge component
export function RoleBadge({ role }: { role?: SystemRole }) {
  const rbac = useRBAC();
  const displayRole = role || rbac.userRole;
  const metadata = ROLE_METADATA[displayRole];
  
  if (!metadata) return null;
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${metadata.color}`}>
      {metadata.label}
    </span>
  );
}

// Permission indicator component
export function PermissionIndicator({ 
  permissions 
}: { 
  permissions: Permission[] 
}) {
  const rbac = useRBAC();
  
  return (
    <div className="flex flex-wrap gap-1">
      {permissions.map(permission => {
        const hasAccess = rbac.hasPermission(permission);
        return (
          <span
            key={permission}
            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
              hasAccess 
                ? 'bg-green-100 text-green-800' 
                : 'bg-gray-100 text-gray-500'
            }`}
          >
            {hasAccess && (
              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
            {permission.replace(/\./g, ' ').replace(/_/g, ' ')}
          </span>
        );
      })}
    </div>
  );
}