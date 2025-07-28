import React, { createContext, useContext, ReactNode } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';

export interface TimeOffType {
  id: number;
  name: string;
  displayName: string;
  description?: string;
  color: string;
  icon?: string;
  requiresApproval: boolean;
  requiresDocumentation: boolean;
  maxConsecutiveDays?: number;
  advanceNoticeRequired?: number;
  isActive: boolean;
}

export interface TimeOffBalance {
  id: number;
  userId: number;
  timeOffTypeId: number;
  year: number;
  allocated: string;
  used: string;
  pending: string;
  available: string;
  createdAt: string;
  updatedAt: string;
  type?: TimeOffType;
}

export interface TimeOffRequest {
  id: number;
  userId: number;
  timeOffTypeId: number;
  startDate: string;
  endDate: string;
  totalHours: string;
  reason?: string;
  status: 'pending' | 'approved' | 'denied' | 'cancelled';
  requestedAt: string;
  reviewedBy?: number;
  reviewedAt?: string;
  reviewNotes?: string;
  affectedShifts?: number[];
  createdAt: string;
  updatedAt: string;
  // Additional fields from the API enrichment
  userName?: string;
  userEmail?: string;
  typeName?: string;
  typeColor?: string;
}

interface CreateTimeOffRequest {
  timeOffTypeId: number;
  startDate: string;
  endDate: string;
  totalHours: string;
  reason?: string;
}

interface PTOContextType {
  requests: TimeOffRequest[];
  balances: TimeOffBalance[];
  types: TimeOffType[];
  getEmployeeBalance: (employeeId: number) => TimeOffBalance[];
  getEmployeeRequests: (employeeId: number) => TimeOffRequest[];
  getPendingRequests: () => TimeOffRequest[];
  submitPTORequest: (request: CreateTimeOffRequest) => Promise<void>;
  reviewPTORequest: (requestId: number, status: 'approved' | 'denied', reviewNotes?: string) => Promise<void>;
  cancelPTORequest: (requestId: number) => Promise<void>;
  isLoading: boolean;
  isLoadingBalances: boolean;
  isLoadingTypes: boolean;
}

const PTOContext = createContext<PTOContextType | undefined>(undefined);

export const PTOProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const currentYear = new Date().getFullYear();
  
  // Fetch time-off types
  const { data: types = [], isLoading: isLoadingTypes } = useQuery<TimeOffType[]>({
    queryKey: ['/api/timeoff/types'],
    enabled: !!user,
  });
  
  // Fetch user's time-off balances
  const { data: balances = [], isLoading: isLoadingBalances, refetch: refetchBalances } = useQuery<TimeOffBalance[]>({
    queryKey: ['/api/timeoff/balance', currentYear],
    queryFn: () => fetch(`/api/timeoff/balance?year=${currentYear}`).then(res => res.json()),
    enabled: !!user,
  });
  
  // Fetch time-off requests
  const { data: requests = [], isLoading: isLoadingRequests, refetch: refetchRequests } = useQuery<TimeOffRequest[]>({
    queryKey: ['/api/timeoff/requests'],
    enabled: !!user,
  });
  
  // Submit PTO request mutation
  const submitMutation = useMutation({
    mutationFn: async (requestData: CreateTimeOffRequest) => {
      const res = await apiRequest('/api/timeoff/requests', 'POST', requestData);
      return res.json();
    },
    onSuccess: () => {
      refetchRequests();
      refetchBalances();
      queryClient.invalidateQueries({ queryKey: ['/api/timeoff/requests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/timeoff/balance'] });
    },
  });
  
  // Review PTO request mutation
  const reviewMutation = useMutation({
    mutationFn: async ({ requestId, status, reviewNotes }: { requestId: number; status: 'approved' | 'denied'; reviewNotes?: string }) => {
      const res = await apiRequest(
        `/api/timeoff/requests/${requestId}/review`, 
        'POST', 
        { status, reviewNotes }
      );
      return res.json();
    },
    onSuccess: () => {
      refetchRequests();
      refetchBalances();
      queryClient.invalidateQueries({ queryKey: ['/api/timeoff/requests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/timeoff/balance'] });
    },
  });
  
  // Cancel PTO request mutation
  const cancelMutation = useMutation({
    mutationFn: async (requestId: number) => {
      const res = await apiRequest(`/api/timeoff/requests/${requestId}/cancel`, 'POST');
      return res.json();
    },
    onSuccess: () => {
      refetchRequests();
      refetchBalances();
      queryClient.invalidateQueries({ queryKey: ['/api/timeoff/requests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/timeoff/balance'] });
    },
  });
  
  const getEmployeeBalance = (employeeId: number): TimeOffBalance[] => {
    return balances.filter((balance: TimeOffBalance) => balance.userId === employeeId);
  };

  const getEmployeeRequests = (employeeId: number): TimeOffRequest[] => {
    return requests.filter((request: TimeOffRequest) => request.userId === employeeId);
  };

  const getPendingRequests = (): TimeOffRequest[] => {
    return requests.filter((request: TimeOffRequest) => request.status === 'pending');
  };

  const submitPTORequest = async (requestData: CreateTimeOffRequest) => {
    await submitMutation.mutateAsync(requestData);
  };

  const reviewPTORequest = async (requestId: number, status: 'approved' | 'denied', reviewNotes?: string) => {
    await reviewMutation.mutateAsync({ requestId, status, reviewNotes });
  };
  
  const cancelPTORequest = async (requestId: number) => {
    await cancelMutation.mutateAsync(requestId);
  };

  const value: PTOContextType = {
    requests,
    balances,
    types,
    getEmployeeBalance,
    getEmployeeRequests,
    getPendingRequests,
    submitPTORequest,
    reviewPTORequest,
    cancelPTORequest,
    isLoading: isLoadingRequests,
    isLoadingBalances,
    isLoadingTypes,
  };

  return <PTOContext.Provider value={value}>{children}</PTOContext.Provider>;
};

export const usePTO = (): PTOContextType => {
  const context = useContext(PTOContext);
  if (!context) {
    throw new Error('usePTO must be used within a PTOProvider');
  }
  return context;
};