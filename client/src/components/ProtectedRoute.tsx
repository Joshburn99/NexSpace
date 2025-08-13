import { useEffect, useState } from 'react';
import { Redirect } from 'wouter';
import { Loader2 } from 'lucide-react';

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  facilityId?: number;
  permissions?: string[];
}

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermissions?: string[];
}

export function ProtectedRoute({ children, requiredPermissions = [] }: ProtectedRouteProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me', {
          credentials: 'include',
        });

        if (response.status === 401) {
          setError('Not authenticated');
          setLoading(false);
          return;
        }

        if (!response.ok) {
          throw new Error('Failed to fetch user');
        }

        const userData = await response.json();
        setUser(userData);

        // Check permissions if required
        if (requiredPermissions.length > 0) {
          const hasAllPermissions = requiredPermissions.every(permission =>
            userData.permissions?.includes(permission)
          );

          if (!hasAllPermissions) {
            setError('Insufficient permissions');
          }
        }
      } catch (err) {
        console.error('Auth check failed:', err);
        setError('Authentication check failed');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [requiredPermissions]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error === 'Not authenticated') {
    return <Redirect to="/login" />;
  }

  if (error === 'Insufficient permissions') {
    return (
      <div className="flex h-screen flex-col items-center justify-center">
        <h1 className="text-2xl font-bold text-danger">Access Denied</h1>
        <p className="mt-2 text-muted-foreground">You don't have permission to access this page.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center">
        <h1 className="text-2xl font-bold text-danger">Error</h1>
        <p className="mt-2 text-muted-foreground">{error}</p>
      </div>
    );
  }

  return <>{children}</>;
}

// Export useAuth hook for accessing user in components
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(res => res.ok ? res.json() : null)
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  return { user, loading };
}