import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { getDashboardPathByRole, validateRoleRouteAccess } from "@/utils/routes";
import type { SystemRole } from "@/types";

export default function NotFound() {
  const { user } = useAuth();
  const [location, navigate] = useLocation();

  useEffect(() => {
    // Check if user is impersonating and accessing an unauthorized route
    if (user && (user as any).isImpersonating) {
      const userRole = user.role as SystemRole;
      const hasAccess = validateRoleRouteAccess(userRole, location);
      
      if (!hasAccess) {

        // Redirect to appropriate dashboard for this role
        const fallbackRoute = getDashboardPathByRole(userRole);
        navigate(fallbackRoute, { replace: true });
        return;
      }
    }
  }, [user, location, navigate]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <h1 className="text-2xl font-bold text-gray-900">404 Page Not Found</h1>
          </div>

          <p className="mt-4 text-sm text-gray-600">
            The page you're looking for doesn't exist or you don't have permission to access it.
          </p>
          
          {(user as any)?.isImpersonating && (
            <p className="mt-2 text-xs text-blue-600">
              Impersonated users can only access routes allowed for their role ({user.role}).
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
