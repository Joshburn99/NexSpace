import React from 'react';
import { Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/use-auth';

interface AdminBadgeProps {
  variant?: 'default' | 'compact';
  className?: string;
}

export function AdminBadge({ variant = 'default', className }: AdminBadgeProps) {
  const { user } = useAuth();

  // Check if user has admin privileges (from role or JWT token claims)
  const isAdmin = user?.role === 'super_admin' || (user as any)?.isAdmin;

  if (!isAdmin) {
    return null;
  }

  if (variant === 'compact') {
    return (
      <Badge 
        variant="outline" 
        className={`
          bg-gradient-to-r from-red-50 to-orange-50 
          border-red-200 text-red-700 
          flex items-center gap-1 px-2 py-1 text-xs font-semibold
          shadow-sm hover:shadow-md transition-shadow
          ${className || ''}
        `}
      >
        <Shield className="w-3 h-3" />
        Admin
      </Badge>
    );
  }

  return (
    <Badge 
      variant="outline" 
      className={`
        bg-gradient-to-r from-red-50 to-orange-50 
        border-red-200 text-red-700 
        flex items-center gap-2 px-3 py-1 font-semibold
        shadow-sm hover:shadow-md transition-shadow
        animate-pulse-subtle
        ${className || ''}
      `}
    >
      <Shield className="w-4 h-4" />
      You are admin
    </Badge>
  );
}

// Hook to check admin status
export function useIsAdmin() {
  const { user } = useAuth();
  return user?.role === 'super_admin' || (user as any)?.isAdmin || false;
}