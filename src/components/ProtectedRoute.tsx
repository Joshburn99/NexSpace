import React, { useEffect } from 'react';
import { Redirect, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Loader2, AlertCircle, Lock, LogIn } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string | string[];
  requiredPermission?: string | string[];
  fallbackPath?: string;
}

export function ProtectedRoute({ 
  children, 
  requiredRole, 
  requiredPermission,
  fallbackPath = '/login'
}: ProtectedRouteProps) {
  const [location, setLocation] = useLocation();
  
  // Fetch current user with authentication status
  const { data: user, isLoading, error } = useQuery({
    queryKey: ['/api/users/me'],
    retry: 1,
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
  });

  // Handle loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardContent className="flex flex-col items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-sm text-muted-foreground">Verifying authentication...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Handle unauthenticated state (401)
  if (error || !user) {
    const errorCode = (error as any)?.response?.status;
    
    if (errorCode === 401) {
      // Store the attempted location for redirect after login
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('redirectAfterLogin', location);
      }
      
      return (
        <div className="flex items-center justify-center min-h-screen p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex items-center gap-2">
                <LogIn className="h-5 w-5 text-primary" />
                <CardTitle>Authentication Required</CardTitle>
              </div>
              <CardDescription>
                Please log in to access this page
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Session Expired</AlertTitle>
                <AlertDescription>
                  Your session has expired or you are not logged in. Please authenticate to continue.
                </AlertDescription>
              </Alert>
              <div className="flex gap-2">
                <Button 
                  onClick={() => setLocation('/login')}
                  className="flex-1"
                >
                  Go to Login
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => window.location.reload()}
                  className="flex-1"
                >
                  Refresh Page
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }
    
    // Generic error
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Error Loading User</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Failed to load user information. Please try refreshing the page.
              </AlertDescription>
            </Alert>
            <div className="mt-4 flex gap-2">
              <Button 
                variant="outline"
                onClick={() => window.location.reload()}
                className="flex-1"
              >
                Refresh Page
              </Button>
              <Button 
                onClick={() => setLocation(fallbackPath)}
                className="flex-1"
              >
                Go to Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Handle unauthorized state (403) - user is authenticated but lacks permissions
  if (requiredRole || requiredPermission) {
    const userRole = user.role;
    const userPermissions = user.permissions || [];
    
    // Check role requirements
    if (requiredRole) {
      const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
      
      // Super admin bypasses all checks
      if (userRole !== 'super_admin' && !allowedRoles.includes(userRole)) {
        return (
          <div className="flex items-center justify-center min-h-screen p-4">
            <Card className="w-full max-w-md">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Lock className="h-5 w-5 text-destructive" />
                  <CardTitle>Access Denied</CardTitle>
                </div>
                <CardDescription>
                  You don't have permission to access this page
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Insufficient Permissions</AlertTitle>
                  <AlertDescription>
                    <p>Required role: <strong>{allowedRoles.join(' or ')}</strong></p>
                    <p>Your role: <strong>{userRole}</strong></p>
                  </AlertDescription>
                </Alert>
                <div className="flex gap-2">
                  <Button 
                    variant="outline"
                    onClick={() => window.history.back()}
                    className="flex-1"
                  >
                    Go Back
                  </Button>
                  <Button 
                    onClick={() => setLocation('/')}
                    className="flex-1"
                  >
                    Go to Dashboard
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      }
    }
    
    // Check permission requirements
    if (requiredPermission && userRole !== 'super_admin') {
      const requiredPerms = Array.isArray(requiredPermission) ? requiredPermission : [requiredPermission];
      const missingPerms = requiredPerms.filter(perm => !userPermissions.includes(perm));
      
      if (missingPerms.length > 0) {
        return (
          <div className="flex items-center justify-center min-h-screen p-4">
            <Card className="w-full max-w-md">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Lock className="h-5 w-5 text-destructive" />
                  <CardTitle>Permission Required</CardTitle>
                </div>
                <CardDescription>
                  You need additional permissions to access this feature
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Missing Permissions</AlertTitle>
                  <AlertDescription>
                    <p className="mb-2">Required permissions:</p>
                    <ul className="list-disc list-inside space-y-1">
                      {missingPerms.map(perm => (
                        <li key={perm} className="text-sm">
                          <code className="font-mono">{perm}</code>
                        </li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
                <div className="text-sm text-muted-foreground">
                  <p>Contact your administrator if you believe you should have access to this feature.</p>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline"
                    onClick={() => window.history.back()}
                    className="flex-1"
                  >
                    Go Back
                  </Button>
                  <Button 
                    onClick={() => setLocation('/')}
                    className="flex-1"
                  >
                    Go to Dashboard
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      }
    }
  }

  // User is authenticated and authorized
  return <>{children}</>;
}

// Hook for checking authentication/authorization in components
export function useAuth() {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ['/api/users/me'],
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });

  const isAuthenticated = !isLoading && !error && !!user;
  const isUnauthorized = error && (error as any)?.response?.status === 403;
  const isUnauthenticated = error && (error as any)?.response?.status === 401;

  const hasRole = (role: string | string[]) => {
    if (!user) return false;
    if (user.role === 'super_admin') return true;
    const roles = Array.isArray(role) ? role : [role];
    return roles.includes(user.role);
  };

  const hasPermission = (permission: string | string[]) => {
    if (!user) return false;
    if (user.role === 'super_admin') return true;
    const perms = Array.isArray(permission) ? permission : [permission];
    const userPerms = user.permissions || [];
    return perms.every(p => userPerms.includes(p));
  };

  return {
    user,
    isLoading,
    isAuthenticated,
    isUnauthenticated,
    isUnauthorized,
    hasRole,
    hasPermission,
  };
}