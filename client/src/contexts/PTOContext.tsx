import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface PTORequest {
  id: number;
  employeeId: number;
  employeeName: string;
  requestType: 'vacation' | 'sick' | 'personal' | 'family' | 'bereavement';
  startDate: string;
  endDate: string;
  totalDays: number;
  reason?: string;
  status: 'pending' | 'approved' | 'denied';
  requestedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  isEmergency: boolean;
}

export interface PTOBalance {
  employeeId: number;
  vacationAvailable: number;
  vacationUsed: number;
  sickAvailable: number;
  sickUsed: number;
  personalAvailable: number;
  personalUsed: number;
  totalEarned: number;
  carryOver: number;
}

interface PTOContextType {
  requests: PTORequest[];
  balances: PTOBalance[];
  getEmployeeBalance: (employeeId: number) => PTOBalance | null;
  getEmployeeRequests: (employeeId: number) => PTORequest[];
  getPendingRequests: () => PTORequest[];
  submitPTORequest: (request: Omit<PTORequest, 'id' | 'requestedAt' | 'status'>) => void;
  reviewPTORequest: (requestId: number, status: 'approved' | 'denied', reviewNotes?: string, reviewedBy?: string) => void;
  isLoading: boolean;
}

const PTOContext = createContext<PTOContextType | undefined>(undefined);

// Sample PTO balances
const sampleBalances: PTOBalance[] = [
  {
    employeeId: 1,
    vacationAvailable: 15,
    vacationUsed: 5,
    sickAvailable: 8,
    sickUsed: 2,
    personalAvailable: 3,
    personalUsed: 1,
    totalEarned: 26,
    carryOver: 5
  },
  {
    employeeId: 2,
    vacationAvailable: 12,
    vacationUsed: 8,
    sickAvailable: 10,
    sickUsed: 1,
    personalAvailable: 2,
    personalUsed: 0,
    totalEarned: 24,
    carryOver: 3
  },
  {
    employeeId: 3,
    vacationAvailable: 18,
    vacationUsed: 3,
    sickAvailable: 12,
    sickUsed: 0,
    personalAvailable: 4,
    personalUsed: 1,
    totalEarned: 34,
    carryOver: 8
  }
];

// Sample PTO requests
const sampleRequests: PTORequest[] = [
  {
    id: 1,
    employeeId: 1,
    employeeName: 'Alice Smith',
    requestType: 'vacation',
    startDate: '2025-07-15',
    endDate: '2025-07-19',
    totalDays: 5,
    reason: 'Family vacation to Hawaii',
    status: 'pending',
    requestedAt: '2025-06-20T10:30:00Z',
    isEmergency: false
  },
  {
    id: 2,
    employeeId: 2,
    employeeName: 'Bob Johnson',
    requestType: 'sick',
    startDate: '2025-06-18',
    endDate: '2025-06-19',
    totalDays: 2,
    reason: 'Medical appointment and recovery',
    status: 'approved',
    requestedAt: '2025-06-17T08:15:00Z',
    reviewedBy: 'Sarah Johnson',
    reviewedAt: '2025-06-17T14:30:00Z',
    reviewNotes: 'Approved for medical reasons',
    isEmergency: true
  },
  {
    id: 3,
    employeeId: 3,
    employeeName: 'Carol Lee',
    requestType: 'personal',
    startDate: '2025-07-01',
    endDate: '2025-07-01',
    totalDays: 1,
    reason: 'Personal business',
    status: 'pending',
    requestedAt: '2025-06-19T16:45:00Z',
    isEmergency: false
  }
];

export const PTOProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [requests, setRequests] = useState<PTORequest[]>(sampleRequests);
  const [balances] = useState<PTOBalance[]>(sampleBalances);
  const [isLoading] = useState(false);

  const getEmployeeBalance = (employeeId: number): PTOBalance | null => {
    return balances.find(balance => balance.employeeId === employeeId) || null;
  };

  const getEmployeeRequests = (employeeId: number): PTORequest[] => {
    return requests.filter(request => request.employeeId === employeeId);
  };

  const getPendingRequests = (): PTORequest[] => {
    return requests.filter(request => request.status === 'pending');
  };

  const submitPTORequest = (requestData: Omit<PTORequest, 'id' | 'requestedAt' | 'status'>) => {
    const newRequest: PTORequest = {
      ...requestData,
      id: Date.now(),
      status: 'pending',
      requestedAt: new Date().toISOString()
    };
    setRequests(prev => [...prev, newRequest]);
  };

  const reviewPTORequest = (requestId: number, status: 'approved' | 'denied', reviewNotes?: string, reviewedBy?: string) => {
    setRequests(prev => prev.map(request => 
      request.id === requestId 
        ? {
            ...request,
            status,
            reviewedBy,
            reviewedAt: new Date().toISOString(),
            reviewNotes
          }
        : request
    ));
  };

  const value: PTOContextType = {
    requests,
    balances,
    getEmployeeBalance,
    getEmployeeRequests,
    getPendingRequests,
    submitPTORequest,
    reviewPTORequest,
    isLoading
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