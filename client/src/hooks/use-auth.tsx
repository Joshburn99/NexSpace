import React, { createContext, ReactNode, useContext, useState, useEffect } from "react";
import { useQuery, useMutation, UseMutationResult } from "@tanstack/react-query";
import { User as SelectUser, InsertUser } from "@/types";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { getDashboardPathByRole } from "@/utils/routes";

type AuthContextType = {
  user: SelectUser | null; // Always returns the current user (impersonated or original)
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<SelectUser, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<SelectUser, Error, InsertUser>;
  forgotPasswordMutation: UseMutationResult<
    { message: string; tempPassword?: string },
    Error,
    { username: string }
  >;
  startImpersonation: (targetUserId: number | SelectUser, userType?: string) => Promise<void>;
  quitImpersonation: () => Promise<void>;
  // Clear impersonation state properties
  isImpersonating: boolean;
  originalUser: SelectUser | null; // Only set when impersonating
  impersonatedUser: SelectUser | null; // Only set when impersonating
};

type LoginData = Pick<InsertUser, "username" | "password">;

export const AuthContext = createContext<AuthContextType | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  
  // Simplified state management
  const [impersonationState, setImpersonationState] = useState<{
    isImpersonating: boolean;
    originalUser: SelectUser | null;
    impersonatedUser: SelectUser | null;
  }>({
    isImpersonating: false,
    originalUser: null,
    impersonatedUser: null,
  });

  // Fetch the current user from the backend
  const {
    data: backendUser,
    error,
    isLoading,
  } = useQuery<SelectUser | undefined, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  // The current user is either the impersonated user (if impersonating) or the backend user
  const currentUser = impersonationState.isImpersonating 
    ? impersonationState.impersonatedUser 
    : backendUser || null;

  // Sync impersonation state with backend response
  useEffect(() => {
    if (!backendUser) {
      // No user logged in - clear impersonation state only if we have one
      if (impersonationState.isImpersonating) {
        setImpersonationState({
          isImpersonating: false,
          originalUser: null,
          impersonatedUser: null,
        });
      }
      return;
    }

    // Check if the backend indicates we're impersonating
    const backendIsImpersonating = (backendUser as any).isImpersonating;
    const backendOriginalUserId = (backendUser as any).originalUserId;
    
    if (backendIsImpersonating) {
      // Backend says we're impersonating - update our state to match
      if (!impersonationState.isImpersonating || 
          impersonationState.impersonatedUser?.id !== backendUser.id) {
        // Need to fetch the original user data
        if (backendOriginalUserId) {
          fetchUserById(backendOriginalUserId).then((origUser) => {
            if (origUser) {
              setImpersonationState({
                isImpersonating: true,
                originalUser: origUser,
                impersonatedUser: backendUser,
              });
            }
          });
        } else {
          // No original user ID - just set the impersonated user
          setImpersonationState({
            isImpersonating: true,
            originalUser: null,
            impersonatedUser: backendUser,
          });
        }
      }
    } else if (impersonationState.isImpersonating) {
      // Backend says we're NOT impersonating but our state says we are - clear it
      setImpersonationState({
        isImpersonating: false,
        originalUser: null,
        impersonatedUser: null,
      });
    }
  }, [backendUser, impersonationState.isImpersonating, impersonationState.impersonatedUser?.id]);

  // Helper function to fetch user by ID
  const fetchUserById = async (userId: number): Promise<SelectUser | null> => {
    try {
      const response = await apiRequest("GET", `/api/users/${userId}`);
      return await response.json();
    } catch (error) {

      return null;
    }
  };

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const res = await apiRequest("POST", "/api/login", credentials);
      return await res.json();
    },
    onSuccess: (user: SelectUser) => {
      queryClient.setQueryData(["/api/user"], user);
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: InsertUser) => {
      const res = await apiRequest("POST", "/api/register", credentials);
      return await res.json();
    },
    onSuccess: (user: SelectUser) => {
      queryClient.setQueryData(["/api/user"], user);
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const forgotPasswordMutation = useMutation({
    mutationFn: async (data: { username: string }) => {
      const res = await apiRequest("POST", "/api/forgot-password", data);
      return await res.json();
    },
    onSuccess: (data: { message: string; tempPassword?: string }) => {
      toast({
        title: "Password Reset",
        description: data.tempPassword
          ? `Your temporary password is: ${data.tempPassword}`
          : data.message,
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Password reset failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Impersonation functions
  const startImpersonation = async (targetUserId: number | SelectUser, userType: string = "user") => {
    if (!currentUser) {

      return;
    }

    // Handle both old signature (user object) and new signature (userId, userType)
    let userId: number;
    let type: string;
    
    if (typeof targetUserId === "object") {
      // Old signature - user object
      userId = targetUserId.id;
      type = "user";
    } else {
      // New signature - userId and userType
      userId = targetUserId;
      type = userType;
    }

    try {

      // Call backend to properly start impersonation with new API endpoint
      const response = await apiRequest("POST", "/api/impersonation/start", {
        userId: userId,
        type: type,
      });
      const impersonationData = await response.json();

      if (impersonationData.ok) {
        // Update our state to reflect impersonation
        setImpersonationState({
          isImpersonating: true,
          originalUser: currentUser,
          impersonatedUser: null, // Will be updated by backend response
        });

        // Force query client to refetch the user data
        // This will cause the backend to return the impersonated user data
        await queryClient.invalidateQueries({ queryKey: ["/api/user"] });
        
        toast({
          title: "Impersonation Started",
          description: `Impersonation session started successfully`,
        });
        
        // Navigate to dashboard
        navigate("/dashboard", { replace: true });
      } else {

        throw new Error("Failed to start impersonation");
      }
    } catch (error) {

      toast({
        title: "Impersonation failed",
        description: "Unable to start impersonation. Please try again.",
        variant: "destructive",
      });
    }
  };

  const quitImpersonation = async () => {
    if (!impersonationState.isImpersonating) {

      return;
    }

    try {

      // Call backend to stop impersonation
      const response = await apiRequest("POST", "/api/impersonation/stop");
      const data = await response.json();
      
      // Clear ALL impersonation-related state
      setImpersonationState({
        isImpersonating: false,
        originalUser: null,
        impersonatedUser: null,
      });
      
      // Clear ALL localStorage items related to impersonation

      localStorage.removeItem("nexspace_impersonation_state");
      localStorage.removeItem("impersonateUserId");
      localStorage.removeItem("originalUserId");
      localStorage.removeItem("nexspace_quick_auth"); // Clear auto-restore if it was for impersonation
      
      // Clear any other potential cached data
      Object.keys(localStorage).forEach(key => {
        if (key.includes("impersonat") || key.includes("originalUser")) {

          localStorage.removeItem(key);
        }
      });
      
      // Invalidate ALL queries to ensure fresh data

      await queryClient.invalidateQueries();
      
      // Force refetch user data specifically
      await queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      
      // Clear any cached query data
      queryClient.clear();
      
      toast({
        title: "Impersonation Ended",
        description: "Returned to your original account",
      });
      
      // Navigate back to impersonation page
      navigate("/admin/impersonation");
    } catch (error) {

      toast({
        title: "Error",
        description: "Failed to stop impersonation. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user: currentUser,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
        forgotPasswordMutation,
        startImpersonation,
        quitImpersonation,
        isImpersonating: impersonationState.isImpersonating,
        originalUser: impersonationState.originalUser,
        impersonatedUser: impersonationState.impersonatedUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
