import { createContext, ReactNode, useContext } from 'react';
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from '@tanstack/react-query';
import {
  insertUserSchema,
  User as SelectUser,
  InsertUser,
} from '@shared/schema';
import { getQueryFn, apiRequest, queryClient } from '../lib/queryClient';
import { useToast } from '@/hooks/use-toast';

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
};

type LoginData = Pick<InsertUser, 'username' | 'password'>;

export const AuthContext = createContext<AuthContextType | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<SelectUser | undefined, Error>({
    queryKey: ['/api/user'],
    queryFn: getQueryFn({ on401: 'returnNull' }),
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const res = await apiRequest('POST', '/api/login', credentials);
      return await res.json();
    },
    onSuccess: (user: SelectUser) => {
      queryClient.setQueryData(['/api/user'], user);
    },
    onError: (error: Error) => {
      toast({
        title: 'Login failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: InsertUser) => {
      const res = await apiRequest('POST', '/api/register', credentials);
      return await res.json();
    },
    onSuccess: (user: SelectUser) => {
      queryClient.setQueryData(['/api/user'], user);
    },
    onError: (error: Error) => {
      toast({
        title: 'Registration failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('POST', '/api/logout');
    },
    onSuccess: () => {
      queryClient.setQueryData(['/api/user'], null);
    },
    onError: (error: Error) => {
      toast({
        title: 'Logout failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const forgotPasswordMutation = useMutation({
    mutationFn: async (data: { username: string }) => {
      const res = await apiRequest('POST', '/api/forgot-password', data);
      return await res.json();
    },
    onSuccess: (data: { message: string; tempPassword?: string }) => {
      toast({
        title: 'Password Reset',
        description: data.tempPassword
          ? `Your temporary password is: ${data.tempPassword}`
          : data.message,
        variant: 'default',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Password reset failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
        forgotPasswordMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
