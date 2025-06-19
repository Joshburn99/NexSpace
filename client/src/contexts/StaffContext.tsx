import React, { createContext, useContext, ReactNode } from 'react';
import { useCredentials } from '@/contexts/CredentialsContext';
import { useQuery } from '@tanstack/react-query';

export interface StaffMember {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  phone?: string;
  department?: string;
  compliant: boolean;
  activeCredentials: number;
  expiringCredentials: number;
  avatar?: string;
}

interface StaffContextType {
  staff: StaffMember[];
  compliantStaff: StaffMember[];
  nonCompliantStaff: StaffMember[];
  getStaffById: (id: number) => StaffMember | undefined;
  getStaffByRole: (role: string) => StaffMember[];
  isLoading: boolean;
}

const StaffContext = createContext<StaffContextType | null>(null);

export const StaffProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { data: users = [] } = useQuery({
    queryKey: ['/api/users'],
    enabled: true,
  });

  const { credentials, getActiveCredentials, getExpiringCredentials } = useCredentials();

  const staff: StaffMember[] = users.map((user: any) => {
    const userCredentials = credentials.filter(cred => cred.userId === user.id);
    const activeUserCredentials = getActiveCredentials().filter(cred => cred.userId === user.id);
    const expiringUserCredentials = getExpiringCredentials().filter(cred => cred.userId === user.id);
    
    const compliant = activeUserCredentials.length > 0 && expiringUserCredentials.length === 0;

    return {
      id: user.id,
      firstName: user.firstName || user.name?.split(' ')[0] || '',
      lastName: user.lastName || user.name?.split(' ')[1] || '',
      email: user.email,
      role: user.role,
      phone: user.phone,
      department: user.department,
      compliant,
      activeCredentials: activeUserCredentials.length,
      expiringCredentials: expiringUserCredentials.length,
      avatar: user.avatar,
    };
  });

  const compliantStaff = staff.filter(s => s.compliant);
  const nonCompliantStaff = staff.filter(s => !s.compliant);

  const getStaffById = (id: number): StaffMember | undefined => {
    return staff.find(s => s.id === id);
  };

  const getStaffByRole = (role: string): StaffMember[] => {
    return staff.filter(s => s.role === role);
  };

  const value: StaffContextType = {
    staff,
    compliantStaff,
    nonCompliantStaff,
    getStaffById,
    getStaffByRole,
    isLoading: false,
  };

  return (
    <StaffContext.Provider value={value}>
      {children}
    </StaffContext.Provider>
  );
};

export const useStaff = (): StaffContextType => {
  const context = useContext(StaffContext);
  if (!context) {
    throw new Error('useStaff must be used within a StaffProvider');
  }
  return context;
};