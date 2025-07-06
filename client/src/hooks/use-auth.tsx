import { createContext, ReactNode, useContext, useState, useEffect } from "react";
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
  startImpersonation: (user: SelectUser) => void;
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
    const origId = localStorage.getItem('originalUserId');
    const impId = localStorage.getItem('impersonateUserId');
    
    if (origId && impId && user) {
      // If we have stored impersonation data and a user, check if we need to restore state
      const originalUserId = parseInt(origId);
      const impersonatedUserId = parseInt(impId);
      
      if (user.id === originalUserId) {
        // We're logged in as the original user, need to fetch impersonated user
        fetchUserById(impersonatedUserId).then(impUser => {
          if (impUser) {
            setOriginalUser(user);
            setCurrentUser(impUser);
            setImpersonatedUser(impUser);
          }
        });
      } else if (user.id === impersonatedUserId) {
        // We're already showing as the impersonated user
        fetchUserById(originalUserId).then(origUser => {
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
  const startImpersonation = (userToImpersonate: SelectUser) => {
    if (!effectiveUser) return;
    
    console.log('Starting impersonation:', userToImpersonate);
    setOriginalUser(effectiveUser);
    setCurrentUser(userToImpersonate);
    setImpersonatedUser(userToImpersonate);
    localStorage.setItem('originalUserId', effectiveUser.id.toString());
    localStorage.setItem('impersonateUserId', userToImpersonate.id.toString());
    
    // Force query client to update the user data
    queryClient.setQueryData(["/api/user"], userToImpersonate);
  };

  const quitImpersonation = () => {
    const origId = localStorage.getItem('originalUserId');
    if (origId && originalUser) {
      setCurrentUser(originalUser);
    }
    setOriginalUser(null);
    setImpersonatedUser(null);
    localStorage.removeItem('originalUserId');
    localStorage.removeItem('impersonateUserId');
    navigate('/admin/impersonation');
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
