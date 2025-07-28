import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, LogOut, Eye } from "lucide-react";

export function ImpersonationIndicator() {
  const { impersonatedUser, originalUser, quitImpersonation } = useAuth();

  if (!impersonatedUser || !originalUser) {
    return null;
  }

  return (
    <div className="bg-orange-50 dark:bg-orange-900/20 border-b border-orange-200 dark:border-orange-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <div className="flex items-center gap-2">
              <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                <Eye className="h-3 w-3 mr-1" />
                Impersonating
              </Badge>
              <span className="text-sm text-orange-800 dark:text-orange-200">
                Viewing as <strong>{impersonatedUser.username}</strong> (
                {impersonatedUser.firstName} {impersonatedUser.lastName})
              </span>
              <span className="text-xs text-orange-600 dark:text-orange-300">
                • Original: {originalUser.username}
              </span>
            </div>
          </div>

          <Button
            onClick={quitImpersonation}
            size="sm"
            variant="outline"
            className="bg-white hover:bg-orange-50 border-orange-200 text-orange-700 hover:text-orange-800"
          >
            <LogOut className="h-3 w-3 mr-2" />
            Quit Impersonation
          </Button>
        </div>
      </div>
    </div>
  );
}
