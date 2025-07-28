import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, User, UserCheck } from "lucide-react";
import { useSession } from "@/contexts/SessionContext";

export function SessionRestoreButton() {
  const { sessionState, restoreSession, stopImpersonation } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [username, setUsername] = useState("joshburn");
  const [password, setPassword] = useState("admin123");
  const [isLoading, setIsLoading] = useState(false);

  const handleQuickRestore = async () => {
    setIsLoading(true);
    try {
      // Check if there's stored impersonation state
      const impersonationState = localStorage.getItem("nexspace_impersonation_state");
      const impersonationData = impersonationState ? JSON.parse(impersonationState) : null;

      await restoreSession(username, password, impersonationData?.impersonatedUserId);
      setIsOpen(false);
    } catch (error) {
      console.error("Failed to restore session:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopImpersonation = async () => {
    try {
      await stopImpersonation();
    } catch (error) {
      console.error("Failed to stop impersonation:", error);
    }
  };

  // Show impersonation status if active
  if (sessionState.isImpersonating) {
    return (
      <div className="flex items-center gap-2">
        <Badge
          variant="secondary"
          className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
        >
          <UserCheck className="h-3 w-3 mr-1" />
          Impersonating: {sessionState.user?.firstName} {sessionState.user?.lastName}
        </Badge>
        <Button size="sm" variant="outline" onClick={handleStopImpersonation} className="text-xs">
          <User className="h-3 w-3 mr-1" />
          Quit Session
        </Button>
      </div>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Quick Restore
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Restore Session</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Quickly restore your superuser session and any active impersonation state.
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
            />
          </div>

          {localStorage.getItem("nexspace_impersonation_state") && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="text-sm text-blue-800 dark:text-blue-200">
                Will restore active impersonation session if credentials are valid.
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              onClick={handleQuickRestore}
              disabled={isLoading || !username || !password}
              className="flex-1"
            >
              {isLoading ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Restore Session
            </Button>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
