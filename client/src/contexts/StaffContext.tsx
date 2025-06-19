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

  // Sample staff data for impersonation system
  const sampleStaff: StaffMember[] = [
    {
      id: 1,
      firstName: 'Alice',
      lastName: 'Smith',
      email: 'alice@nexspace.com',
      role: 'employee',
      phone: '555-0101',
      department: 'ICU',
      compliant: true,
      activeCredentials: 5,
      expiringCredentials: 0,
    },
    {
      id: 2,
      firstName: 'Bob',
      lastName: 'Johnson',
      email: 'bob@nexspace.com',
      role: 'contractor',
      phone: '555-0202',
      department: 'Emergency',
      compliant: true,
      activeCredentials: 4,
      expiringCredentials: 1,
    },
    {
      id: 3,
      firstName: 'Carol',
      lastName: 'Lee',
      email: 'carol@nexspace.com',
      role: 'clinician',
      phone: '555-0303',
      department: 'Med/Surg',
      compliant: true,
      activeCredentials: 6,
      expiringCredentials: 0,
    },
    {
      id: 4,
      firstName: 'David',
      lastName: 'Wilson',
      email: 'david@nexspace.com',
      role: 'manager',
      phone: '555-0404',
      department: 'Administration',
      compliant: true,
      activeCredentials: 3,
      expiringCredentials: 0,
    },
    {
      id: 5,
      firstName: 'Emma',
      lastName: 'Davis',
      email: 'emma@nexspace.com',
      role: 'employee',
      phone: '555-0505',
      department: 'Pediatrics',
      compliant: false,
      activeCredentials: 2,
      expiringCredentials: 3,
    },
    {
      id: 6,
      firstName: 'Frank',
      lastName: 'Miller',
      email: 'frank@nexspace.com',
      role: 'contractor',
      phone: '555-0606',
      department: 'OR',
      compliant: true,
      activeCredentials: 7,
      expiringCredentials: 0,
    },
    {
      id: 7,
      firstName: 'Grace',
      lastName: 'Taylor',
      email: 'grace@nexspace.com',
      role: 'clinician',
      phone: '555-0707',
      department: 'L&D',
      compliant: true,
      activeCredentials: 5,
      expiringCredentials: 1,
    },
    {
      id: 8,
      firstName: 'Henry',
      lastName: 'Brown',
      email: 'henry@nexspace.com',
      role: 'employee',
      phone: '555-0808',
      department: 'Oncology',
      compliant: true,
      activeCredentials: 4,
      expiringCredentials: 0,
    },
  ];

  // Combine API users with sample staff for impersonation
  const apiStaff: StaffMember[] = Array.isArray(users) ? users.map((user: any) => {
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
  }) : [];

  // Use sample staff data if no API users, otherwise combine both
  const staff: StaffMember[] = apiStaff.length > 0 ? [...apiStaff, ...sampleStaff] : sampleStaff;

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