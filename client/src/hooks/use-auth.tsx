import React, { createContext, ReactNode, useContext, useState, useEffect } from "react";
import { useQuery, useMutation, UseMutationResult } from "@tanstack/react-query";
import { insertUserSchema, User as SelectUser, InsertUser } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

type AuthContextType = {
  user: SelectUser | null;
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
  startImpersonation: (user: SelectUser) => Promise<void>;
  quitImpersonation: () => void;
  impersonatedUser: SelectUser | null;
  originalUser: SelectUser | null;
};

type LoginData = Pick<InsertUser, "username" | "password">;

export const AuthContext = createContext<AuthContextType | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [originalUser, setOriginalUser] = useState<SelectUser | null>(null);
  const [impersonatedUser, setImpersonatedUser] = useState<SelectUser | null>(null);
  const [currentUser, setCurrentUser] = useState<SelectUser | null>(null);

  const {
    data: user,
    error,
    isLoading,
  } = useQuery<SelectUser | undefined, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  // Use current user if impersonating, otherwise use fetched user
  const effectiveUser = currentUser || user || null;

  // Rehydrate impersonation state on load
  useEffect(() => {
    const origId = localStorage.getItem("originalUserId");
    const impId = localStorage.getItem("impersonateUserId");

    if (origId && impId && user) {
      // If we have stored impersonation data and a user, check if we need to restore state
      const originalUserId = parseInt(origId);
      const impersonatedUserId = parseInt(impId);

      if (user.id === originalUserId) {
        // We're logged in as the original user, need to fetch impersonated user
        fetchUserById(impersonatedUserId).then((impUser) => {
          if (impUser) {
            setOriginalUser(user);
            setCurrentUser(impUser);
            setImpersonatedUser(impUser);
          }
        });
      } else if (user.id === impersonatedUserId) {
        // We're already showing as the impersonated user
        fetchUserById(originalUserId).then((origUser) => {
          if (origUser) {
            setOriginalUser(origUser);
            setCurrentUser(user);
            setImpersonatedUser(user);
          }
        });
      }
    }
  }, [user]);

  // Helper function to fetch user by ID
  const fetchUserById = async (userId: number): Promise<SelectUser | null> => {
    try {
      const response = await apiRequest("GET", `/api/users/${userId}`);
      return await response.json();
    } catch (error) {
      console.error("Failed to fetch user:", error);
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
    if (!effectiveUser) return;

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
      // Call backend to properly start impersonation and get enhanced user data
      const response = await apiRequest("POST", "/api/impersonate/start", {
        targetUserId: userId,
        userType: type,
      });
      const impersonationData = await response.json();

      if (impersonationData.impersonatedUser) {
        const enhancedUser = impersonationData.impersonatedUser;

        setOriginalUser(effectiveUser);
        setCurrentUser(enhancedUser);
        setImpersonatedUser(enhancedUser);
        localStorage.setItem("originalUserId", effectiveUser.id.toString());
        localStorage.setItem("impersonateUserId", enhancedUser.id.toString());

        // Force query client to update the user data with enhanced data
        queryClient.setQueryData(["/api/user"], enhancedUser);
        
        toast({
          title: "Impersonation Started",
          description: `Now viewing as ${enhancedUser.firstName} ${enhancedUser.lastName}`,
        });
      } else {
        console.error(
          "[IMPERSONATION] No impersonated user in response:",
          impersonationData
        );
        throw new Error("Failed to start impersonation");
      }
    } catch (error) {
      console.error("Failed to start impersonation:", error);
      toast({
        title: "Impersonation failed",
        description: "Unable to start impersonation. Please try again.",
        variant: "destructive",
      });
    }
  };

  const quitImpersonation = async () => {
    try {
      // Call backend to stop impersonation
      const response = await apiRequest("POST", "/api/impersonate/stop");
      const data = await response.json();
      
      if (data.originalUser) {
        // Update state with original user
        setCurrentUser(data.originalUser);
        queryClient.setQueryData(["/api/user"], data.originalUser);
      }
      
      setOriginalUser(null);
      setImpersonatedUser(null);
      localStorage.removeItem("originalUserId");
      localStorage.removeItem("impersonateUserId");
      
      toast({
        title: "Impersonation Ended",
        description: "Returned to your original account",
      });
      
      navigate("/admin/impersonation");
    } catch (error) {
      console.error("Failed to stop impersonation:", error);
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
        user: effectiveUser,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
        forgotPasswordMutation,
        startImpersonation,
        quitImpersonation,
        impersonatedUser,
        originalUser,
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
