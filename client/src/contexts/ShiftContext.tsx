import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Shift status types
export type ShiftStatus = 'open' | 'assigned' | 'requested' | 'in_progress' | 'completed' | 'cancelled' | 'ncns' | 'facility_cancelled';
export type ShiftUrgency = 'low' | 'medium' | 'high' | 'critical';

// Shift data interface
export interface Shift {
  id: number;
  title: string;
  facilityId: number;
  facilityName: string;
  department: string;
  specialty: string;
  date: string; // YYYY-MM-DD format
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  rate: number;
  premiumMultiplier: number;
  status: ShiftStatus;
  urgency: ShiftUrgency;
  description?: string;
  requiredStaff: number;
  assignedStaffIds: number[];
  specialRequirements: string[];
  createdById: number;
  createdAt: string;
  updatedAt: string;
}

// Block shift interface
export interface BlockShift {
  id: number;
  title: string;
  facilityId: number;
  facilityName: string;
  department: string;
  specialty: string;
  startDate: string; // YYYY-MM-DD format
  endDate: string; // YYYY-MM-DD format
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  quantity: number;
  rate: number;
  premiumMultiplier: number;
  status: 'open' | 'partially_filled' | 'filled' | 'cancelled';
  urgency: ShiftUrgency;
  description?: string;
  specialRequirements: string[];
  createdById: number;
  createdAt: string;
  updatedAt: string;
}

// Context interface
interface ShiftContextType {
  shifts: Shift[];
  blockShifts: BlockShift[];
  openShifts: Shift[];
  requestedShifts: Shift[];
  bookedShifts: Shift[];
  completedShifts: Shift[];
  isLoading: boolean;
  error: string | null;
  refreshShifts: () => Promise<void>;
  updateShiftStatus: (shiftId: number, status: ShiftStatus) => Promise<void>;
  assignStaffToShift: (shiftId: number, staffIds: number[]) => Promise<void>;
  requestShift: (shiftId: number) => Promise<void>;
  cancelShift: (shiftId: number) => Promise<void>;
}

const ShiftContext = createContext<ShiftContextType | undefined>(undefined);

// Sample shift data for development
const sampleShifts: Shift[] = [
  {
    id: 1,
    title: "ICU Night Shift - RN",
    facilityId: 1,
    facilityName: "Portland General Hospital",
    department: "ICU",
    specialty: "Registered Nurse",
    date: "2025-06-20",
    startTime: "19:00",
    endTime: "07:00",
    rate: 45.00,
    premiumMultiplier: 1.25,
    status: "open",
    urgency: "high",
    description: "ICU night shift requiring critical care experience",
    requiredStaff: 2,
    assignedStaffIds: [],
    specialRequirements: ["BLS", "ACLS", "Critical Care Experience"],
    createdById: 1,
    createdAt: "2025-06-19T10:00:00Z",
    updatedAt: "2025-06-19T10:00:00Z"
  },
  {
    id: 2,
    title: "Emergency Department - Day Shift RN",
    facilityId: 1,
    facilityName: "Portland General Hospital",
    department: "Emergency",
    specialty: "Registered Nurse",
    date: "2025-06-20",
    startTime: "07:00",
    endTime: "19:00",
    rate: 42.00,
    premiumMultiplier: 1.15,
    status: "requested",
    urgency: "critical",
    description: "Emergency department day shift",
    requiredStaff: 1,
    assignedStaffIds: [5],
    specialRequirements: ["BLS", "ACLS", "TNCC"],
    createdById: 2,
    createdAt: "2025-06-19T08:30:00Z",
    updatedAt: "2025-06-19T14:20:00Z"
  },
  {
    id: 3,
    title: "Medical/Surgical - Evening Shift LPN",
    facilityId: 2,
    facilityName: "Mercy Medical Center",
    department: "Med/Surg",
    specialty: "Licensed Practical Nurse",
    date: "2025-06-20",
    startTime: "15:00",
    endTime: "23:00",
    rate: 28.00,
    premiumMultiplier: 1.10,
    status: "assigned",
    urgency: "medium",
    description: "Med/Surg evening shift coverage",
    requiredStaff: 1,
    assignedStaffIds: [12],
    specialRequirements: ["BLS", "Med/Surg Experience"],
    createdById: 3,
    createdAt: "2025-06-19T09:15:00Z",
    updatedAt: "2025-06-19T16:45:00Z"
  },
  {
    id: 4,
    title: "Telemetry Unit - Night Shift RN",
    facilityId: 1,
    facilityName: "Portland General Hospital",
    department: "Telemetry",
    specialty: "Registered Nurse",
    date: "2025-06-21",
    startTime: "19:00",
    endTime: "07:00",
    rate: 40.00,
    premiumMultiplier: 1.30,
    status: "open",
    urgency: "high",
    description: "Telemetry night shift requiring cardiac monitoring experience",
    requiredStaff: 1,
    assignedStaffIds: [],
    specialRequirements: ["BLS", "ACLS", "Telemetry Certification"],
    createdById: 1,
    createdAt: "2025-06-19T11:30:00Z",
    updatedAt: "2025-06-19T11:30:00Z"
  },
  {
    id: 5,
    title: "Operating Room - Day Shift RN",
    facilityId: 3,
    facilityName: "St. Mary's Hospital",
    department: "OR",
    specialty: "Registered Nurse",
    date: "2025-06-21",
    startTime: "06:00",
    endTime: "14:00",
    rate: 48.00,
    premiumMultiplier: 1.20,
    status: "completed",
    urgency: "medium",
    description: "OR day shift - general surgery cases",
    requiredStaff: 1,
    assignedStaffIds: [8],
    specialRequirements: ["BLS", "ACLS", "OR Experience", "CNOR Preferred"],
    createdById: 4,
    createdAt: "2025-06-18T14:00:00Z",
    updatedAt: "2025-06-19T18:00:00Z"
  },
  {
    id: 6,
    title: "Pediatric Unit - Day Shift RN",
    facilityId: 2,
    facilityName: "Mercy Medical Center",
    department: "Pediatrics",
    specialty: "Registered Nurse",
    date: "2025-06-22",
    startTime: "07:00",
    endTime: "19:00",
    rate: 44.00,
    premiumMultiplier: 1.15,
    status: "open",
    urgency: "medium",
    description: "Pediatric unit day shift",
    requiredStaff: 2,
    assignedStaffIds: [],
    specialRequirements: ["BLS", "PALS", "Pediatric Experience"],
    createdById: 3,
    createdAt: "2025-06-19T12:00:00Z",
    updatedAt: "2025-06-19T12:00:00Z"
  },
  {
    id: 7,
    title: "Labor & Delivery - Night Shift RN",
    facilityId: 3,
    facilityName: "St. Mary's Hospital",
    department: "L&D",
    specialty: "Registered Nurse",
    date: "2025-06-22",
    startTime: "19:00",
    endTime: "07:00",
    rate: 46.00,
    premiumMultiplier: 1.35,
    status: "requested",
    urgency: "high",
    description: "Labor and delivery night coverage",
    requiredStaff: 1,
    assignedStaffIds: [15],
    specialRequirements: ["BLS", "NRP", "L&D Experience", "Electronic Fetal Monitoring"],
    createdById: 4,
    createdAt: "2025-06-19T13:15:00Z",
    updatedAt: "2025-06-19T17:30:00Z"
  },
  {
    id: 8,
    title: "Intensive Care - Weekend Day Shift RN",
    facilityId: 1,
    facilityName: "Portland General Hospital",
    department: "ICU",
    specialty: "Registered Nurse",
    date: "2025-06-23",
    startTime: "07:00",
    endTime: "19:00",
    rate: 47.00,
    premiumMultiplier: 1.40,
    status: "open",
    urgency: "critical",
    description: "Weekend ICU coverage - high acuity patients",
    requiredStaff: 3,
    assignedStaffIds: [],
    specialRequirements: ["BLS", "ACLS", "Critical Care Certification", "Ventilator Management"],
    createdById: 1,
    createdAt: "2025-06-19T14:45:00Z",
    updatedAt: "2025-06-19T14:45:00Z"
  }
];

const sampleBlockShifts: BlockShift[] = [
  {
    id: 1,
    title: "ICU Coverage Block",
    facilityId: 1,
    facilityName: "Portland General Hospital",
    department: "ICU",
    specialty: "Registered Nurse",
    startDate: "2025-06-24",
    endDate: "2025-06-28",
    startTime: "19:00",
    endTime: "07:00",
    quantity: 2,
    rate: 45.00,
    premiumMultiplier: 1.25,
    status: "open",
    urgency: "high",
    description: "Week-long ICU night shift coverage block",
    specialRequirements: ["BLS", "ACLS", "Critical Care Experience"],
    createdById: 1,
    createdAt: "2025-06-19T15:00:00Z",
    updatedAt: "2025-06-19T15:00:00Z"
  },
  {
    id: 2,
    title: "Weekend Med/Surg Block",
    facilityId: 2,
    facilityName: "Mercy Medical Center",
    department: "Med/Surg",
    specialty: "Licensed Practical Nurse",
    startDate: "2025-06-21",
    endDate: "2025-06-22",
    startTime: "07:00",
    endTime: "19:00",
    quantity: 3,
    rate: 28.00,
    premiumMultiplier: 1.20,
    status: "partially_filled",
    urgency: "medium",
    description: "Weekend med/surg coverage",
    specialRequirements: ["BLS", "Med/Surg Experience"],
    createdById: 3,
    createdAt: "2025-06-19T16:30:00Z",
    updatedAt: "2025-06-19T16:30:00Z"
  }
];

export function ShiftProvider({ children }: { children: ReactNode }) {
  const [shifts, setShifts] = useState<Shift[]>(sampleShifts);
  const [blockShifts, setBlockShifts] = useState<BlockShift[]>(sampleBlockShifts);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Computed properties for different shift categories
  const openShifts = shifts.filter(shift => shift.status === 'open');
  const requestedShifts = shifts.filter(shift => shift.status === 'requested');
  const bookedShifts = shifts.filter(shift => shift.status === 'assigned' || shift.status === 'in_progress');
  const completedShifts = shifts.filter(shift => shift.status === 'completed');

  const refreshShifts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // In a real app, this would fetch from API
      // For now, we'll simulate API call with existing sample data
      await new Promise(resolve => setTimeout(resolve, 500));
      // setShifts(fetchedShifts);
    } catch (err) {
      setError('Failed to refresh shifts');
    } finally {
      setIsLoading(false);
    }
  };

  const updateShiftStatus = async (shiftId: number, status: ShiftStatus) => {
    try {
      setShifts(prevShifts =>
        prevShifts.map(shift =>
          shift.id === shiftId
            ? { ...shift, status, updatedAt: new Date().toISOString() }
            : shift
        )
      );
    } catch (err) {
      setError('Failed to update shift status');
    }
  };

  const assignStaffToShift = async (shiftId: number, staffIds: number[]) => {
    try {
      setShifts(prevShifts =>
        prevShifts.map(shift =>
          shift.id === shiftId
            ? { 
                ...shift, 
                assignedStaffIds: staffIds,
                status: staffIds.length > 0 ? 'assigned' : 'open',
                updatedAt: new Date().toISOString()
              }
            : shift
        )
      );
    } catch (err) {
      setError('Failed to assign staff to shift');
    }
  };

  const requestShift = async (shiftId: number) => {
    try {
      await updateShiftStatus(shiftId, 'requested');
    } catch (err) {
      setError('Failed to request shift');
    }
  };

  const cancelShift = async (shiftId: number) => {
    try {
      await updateShiftStatus(shiftId, 'cancelled');
    } catch (err) {
      setError('Failed to cancel shift');
    }
  };

  const contextValue: ShiftContextType = {
    shifts,
    blockShifts,
    openShifts,
    requestedShifts,
    bookedShifts,
    completedShifts,
    isLoading,
    error,
    refreshShifts,
    updateShiftStatus,
    assignStaffToShift,
    requestShift,
    cancelShift,
  };

  return (
    <ShiftContext.Provider value={contextValue}>
      {children}
    </ShiftContext.Provider>
  );
}

export function useShifts() {
  const context = useContext(ShiftContext);
  if (context === undefined) {
    throw new Error('useShifts must be used within a ShiftProvider');
  }
  return context;
}