import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
  facilityId?: number;
}

interface SessionState {
  user: User | null;
  isImpersonating: boolean;
  originalUser: User | null;
  impersonatedUserId: number | null;
}

interface SessionContextType {
  sessionState: SessionState;
  isLoading: boolean;
  startImpersonation: (userId: number) => Promise<void>;
  stopImpersonation: () => Promise<void>;
  restoreSession: (username: string, password: string, impersonatedUserId?: number) => Promise<void>;
  checkSession: () => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

// Local storage keys for persistent session state
const STORAGE_KEYS = {
  IMPERSONATION_STATE: 'nexspace_impersonation_state',
  ORIGINAL_USER: 'nexspace_original_user',
  QUICK_AUTH: 'nexspace_quick_auth'
};

export function SessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [sessionState, setSessionState] = useState<SessionState>({
    user: null,
    isImpersonating: false,
    originalUser: null,
    impersonatedUserId: null
  });

  // Check session status on load
  const { data: sessionData, isLoading, refetch } = useQuery({
    queryKey: ["/api/session-status"],
    retry: false,
    staleTime: 0,
  });

  // Update session state when data changes
  useEffect(() => {
    if (sessionData && typeof sessionData === 'object') {
      setSessionState({
        user: (sessionData as any).user,
        isImpersonating: (sessionData as any).isImpersonating,
        originalUser: (sessionData as any).originalUser,
        impersonatedUserId: (sessionData as any).impersonatedUserId
      });

      // Persist impersonation state for server restarts
      if ((sessionData as any).isImpersonating) {
        localStorage.setItem(STORAGE_KEYS.IMPERSONATION_STATE, JSON.stringify({
          impersonatedUserId: (sessionData as any).impersonatedUserId,
          originalUser: (sessionData as any).originalUser
        }));
      } else {
        localStorage.removeItem(STORAGE_KEYS.IMPERSONATION_STATE);
      }
    }
  }, [sessionData]);

  // Auto-restore session on app load if session expired
  useEffect(() => {
    const attemptAutoRestore = async () => {
      if (!sessionData && !isLoading) {
        const quickAuth = localStorage.getItem(STORAGE_KEYS.QUICK_AUTH);
        const impersonationState = localStorage.getItem(STORAGE_KEYS.IMPERSONATION_STATE);
        
        if (quickAuth) {
          try {
            const authData = JSON.parse(quickAuth);
            const impersonationData = impersonationState ? JSON.parse(impersonationState) : null;
            
            await restoreSession(
              authData.username, 
              authData.password, 
              impersonationData?.impersonatedUserId
            );
          } catch (error) {
            console.error("Failed to auto-restore session:", error);
            // Clear invalid stored data
            localStorage.removeItem(STORAGE_KEYS.QUICK_AUTH);
            localStorage.removeItem(STORAGE_KEYS.IMPERSONATION_STATE);
          }
        }
      }
    };

    attemptAutoRestore();
  }, [sessionData, isLoading]);

  const impersonationMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await fetch("/api/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId })
      });
      return await response.json();
    },
    onSuccess: () => {
      refetch();
      queryClient.invalidateQueries();
    }
  });

  const stopImpersonationMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/stop-impersonation", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      return await response.json();
    },
    onSuccess: () => {
      localStorage.removeItem(STORAGE_KEYS.IMPERSONATION_STATE);
      refetch();
      queryClient.invalidateQueries();
    }
  });

  const restoreSessionMutation = useMutation({
    mutationFn: async ({ username, password, impersonatedUserId }: {
      username: string;
      password: string;
      impersonatedUserId?: number;
    }) => {
      const response = await fetch("/api/restore-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, impersonatedUserId })
      });
      return await response.json();
    },
    onSuccess: (data: any) => {
      // Store quick auth for future auto-restore (dev only)
      if (process.env.NODE_ENV === 'development') {
        localStorage.setItem(STORAGE_KEYS.QUICK_AUTH, JSON.stringify({
          username: data.user?.username === 'joshburn' ? 'joshburn' : '',
          password: data.user?.username === 'joshburn' ? 'admin123' : ''
        }));
      }
      
      refetch();
      queryClient.invalidateQueries();
    }
  });

  const startImpersonation = async (userId: number) => {
    await impersonationMutation.mutateAsync(userId);
  };

  const stopImpersonation = async () => {
    await stopImpersonationMutation.mutateAsync();
  };

  const restoreSession = async (username: string, password: string, impersonatedUserId?: number) => {
    await restoreSessionMutation.mutateAsync({ username, password, impersonatedUserId });
  };

  const checkSession = () => {
    refetch();
  };

  return (
    <SessionContext.Provider value={{
      sessionState,
      isLoading,
      startImpersonation,
      stopImpersonation,
      restoreSession,
      checkSession
    }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}