import React, { createContext, useContext, ReactNode, useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export interface StaffMember {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  phone?: string;
  department?: string;
  specialty?: string;
  compliant: boolean;
  activeCredentials: number;
  expiringCredentials: number;
  avatar?: string;
  bio?: string;
  location?: string;
  hourlyRate?: number;
  experience?: string;
  skills?: string[];
  certifications?: string[];
  resumeUrl?: string;
  coverLetterUrl?: string;
  linkedIn?: string;
  portfolio?: string;
  yearsExperience?: number;
  rating?: number;
  totalShifts?: number;
  // Enhanced fields
  associatedFacilities?: number[]; // Array of facility IDs
  currentLocation?: {
    lat: number;
    lng: number;
    timestamp: string;
    accuracy?: number;
  };
  accountStatus?: "active" | "inactive" | "pending" | "suspended";
  totalWorkedShifts?: number;
  reliabilityScore?: number; // 0.00 to 5.00
  homeZipCode?: string;
  homeAddress?: string;
  availabilityStatus?: "available" | "unavailable" | "busy";

  // Compliance and licensing
  licenseExpirationDate?: string;
  backgroundCheckDate?: string;
  drugTestDate?: string;
  covidVaccinationStatus?: {
    status: "vaccinated" | "unvaccinated" | "exempt";
    doses: number;
    lastDose?: string;
    booster: boolean;
  };
  requiredCredentialsStatus?: {
    [credentialType: string]: {
      status: "current" | "expired" | "pending";
      expirationDate: string;
    };
  };

  // Performance and attendance
  lateArrivalCount?: number;
  noCallNoShowCount?: number;
  lastWorkDate?: string;

  // Preferences and scheduling
  preferredShiftTypes?: ("day" | "night" | "weekend" | "on_call")[];
  weeklyAvailability?: {
    [day: string]: {
      available: boolean;
      startTime?: string;
      endTime?: string;
    };
  };

  // Contact and financial
  directDepositInfo?: {
    bankName: string;
    routingNumber: string;
    accountNumber: string;
    accountType: "checking" | "savings";
  };
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
    email?: string;
  };
}

interface StaffContextType {
  staff: StaffMember[];
  compliantStaff: StaffMember[];
  nonCompliantStaff: StaffMember[];
  getStaffById: (id: number) => StaffMember | undefined;
  getStaffByRole: (role: string) => StaffMember[];
  updateStaff: (member: StaffMember) => void;
  updateStaffMember: (id: number, updates: Partial<StaffMember>) => Promise<void>;
  isLoading: boolean;
}

const StaffContext = createContext<StaffContextType | null>(null);

export const StaffProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();

  // Fetch staff data from backend API
  const { data: staffData = [], isLoading } = useQuery({
    queryKey: ["/api/staff"],
    queryFn: () => fetch("/api/staff").then((res) => res.json()),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Mutation for updating staff profiles
  const updateStaffMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<StaffMember> }) => {
      const response = await fetch(`/api/staff/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error("Failed to update profile");
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate and refetch staff data
      queryClient.invalidateQueries({ queryKey: ["/api/staff"] });
    },
  });

  // Keep sample staff data as fallback
  const sampleStaff: StaffMember[] = [
    {
      id: 1,
      firstName: "Alice",
      lastName: "Smith",
      email: "alice@nexspace.com",
      role: "employee",
      phone: "555-0101",
      department: "ICU",
      specialty: "Registered Nurse",
      compliant: true,
      activeCredentials: 8,
      expiringCredentials: 1,
    },
    {
      id: 2,
      firstName: "Bob",
      lastName: "Johnson",
      email: "bob@nexspace.com",
      role: "contractor",
      phone: "555-0202",
      department: "Emergency",
      specialty: "Licensed Practical Nurse",
      compliant: true,
      activeCredentials: 4,
      expiringCredentials: 1,
    },
    {
      id: 3,
      firstName: "Carol",
      lastName: "Lee",
      email: "carol@nexspace.com",
      role: "clinician",
      phone: "555-0303",
      department: "Med/Surg",
      specialty: "Certified Nursing Assistant",
      compliant: true,
      activeCredentials: 6,
      expiringCredentials: 0,
    },
    {
      id: 4,
      firstName: "David",
      lastName: "Wilson",
      email: "david@nexspace.com",
      role: "manager",
      phone: "555-0404",
      department: "Administration",
      compliant: true,
      activeCredentials: 3,
      expiringCredentials: 0,
    },
    {
      id: 5,
      firstName: "Emma",
      lastName: "Davis",
      email: "emma@nexspace.com",
      role: "employee",
      phone: "555-0505",
      department: "Pediatrics",
      compliant: false,
      activeCredentials: 2,
      expiringCredentials: 3,
    },
    {
      id: 6,
      firstName: "Frank",
      lastName: "Miller",
      email: "frank@nexspace.com",
      role: "contractor",
      phone: "555-0606",
      department: "OR",
      compliant: true,
      activeCredentials: 7,
      expiringCredentials: 0,
    },
    {
      id: 7,
      firstName: "Grace",
      lastName: "Taylor",
      email: "grace@nexspace.com",
      role: "clinician",
      phone: "555-0707",
      department: "L&D",
      compliant: true,
      activeCredentials: 5,
      expiringCredentials: 1,
    },
    {
      id: 8,
      firstName: "Henry",
      lastName: "Brown",
      email: "henry@nexspace.com",
      role: "employee",
      phone: "555-0808",
      department: "Oncology",
      compliant: true,
      activeCredentials: 4,
      expiringCredentials: 0,
    },
  ];

  // Use actual API data or fallback to sample data
  const currentStaffData = staffData.length > 0 ? staffData : sampleStaff;

  const compliantStaff = currentStaffData.filter((s: StaffMember) => s.compliant);
  const nonCompliantStaff = currentStaffData.filter((s: StaffMember) => !s.compliant);

  const getStaffById = (id: number): StaffMember | undefined => {
    return currentStaffData.find((s: StaffMember) => s.id === id);
  };

  const getStaffByRole = (role: string): StaffMember[] => {
    return currentStaffData.filter((s: StaffMember) => s.role === role);
  };

  const updateStaff = (updated: StaffMember) => {
    // Use the mutation to persist changes to backend
    updateStaffMutation.mutate({
      id: updated.id,
      updates: updated,
    });
  };

  const updateStaffMember = async (id: number, updates: Partial<StaffMember>): Promise<void> => {
    // Use the mutation to persist changes to backend
    updateStaffMutation.mutate({ id, updates });
  };

  const value: StaffContextType = {
    staff: currentStaffData,
    compliantStaff,
    nonCompliantStaff,
    getStaffById,
    getStaffByRole,
    updateStaff,
    updateStaffMember,
    isLoading,
  };

  return <StaffContext.Provider value={value}>{children}</StaffContext.Provider>;
};

export const useStaff = (): StaffContextType => {
  const context = useContext(StaffContext);
  if (!context) {
    throw new Error("useStaff must be used within a StaffProvider");
  }
  return context;
};
