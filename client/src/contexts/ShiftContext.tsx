import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";

// Shift status types
export type ShiftStatus =
  | "open"
  | "assigned"
  | "requested"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "ncns"
  | "facility_cancelled";
export type ShiftUrgency = "low" | "medium" | "high" | "critical";

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
  hourlyRate: number; // Additional property for compatibility
  premiumMultiplier: number;
  status: ShiftStatus;
  urgency: ShiftUrgency;
  description?: string;
  requiredStaff: number;
  assignedStaffIds: number[];
  assignedTo?: number; // For individual assignments
  requestedBy?: number; // For shift requests
  specialRequirements: string[];
  requirements: string[]; // Additional property for compatibility
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
  status: "open" | "partially_filled" | "filled" | "cancelled";
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
  open: Shift[];
  requested: Shift[];
  booked: Shift[];
  history: Shift[];
  openShifts: Shift[];
  requestedShifts: Shift[];
  bookedShifts: Shift[];
  completedShifts: Shift[];
  isLoading: boolean;
  error: string | null;
  getShiftById: (id: number) => Shift | undefined;
  refreshShifts: () => Promise<void>;
  updateShiftStatus: (shiftId: number, status: ShiftStatus) => Promise<void>;
  assignStaffToShift: (shiftId: number, staffId: number) => Promise<void>;
  requestShift: (shiftId: number) => Promise<void>;
  assignShift: (shiftId: number, userId: number) => Promise<void>;
  cancelShift: (shiftId: number) => Promise<void>;
  addShift: (shift: Omit<Shift, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  fetchShiftHistory: (userId: number) => Promise<void>;
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
    rate: 45.0,
    hourlyRate: 45.0,
    premiumMultiplier: 1.25,
    status: "open",
    urgency: "high",
    description: "ICU night shift requiring critical care experience",
    requiredStaff: 2,
    assignedStaffIds: [],
    specialRequirements: ["BLS", "ACLS", "Critical Care Experience"],
    requirements: ["Registered Nurse"],
    createdById: 1,
    createdAt: "2025-06-19T10:00:00Z",
    updatedAt: "2025-06-19T10:00:00Z",
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
    rate: 42.0,
    hourlyRate: 42.0,
    premiumMultiplier: 1.15,
    status: "requested",
    urgency: "critical",
    description: "Emergency department day shift",
    requiredStaff: 1,
    assignedStaffIds: [5],
    requestedBy: 5,
    specialRequirements: ["BLS", "ACLS", "TNCC"],
    requirements: ["Registered Nurse"],
    createdById: 2,
    createdAt: "2025-06-19T08:30:00Z",
    updatedAt: "2025-06-19T14:20:00Z",
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
    rate: 28.0,
    hourlyRate: 28.0,
    premiumMultiplier: 1.1,
    status: "assigned",
    urgency: "medium",
    description: "Med/Surg evening shift coverage",
    requiredStaff: 1,
    assignedStaffIds: [12],
    assignedTo: 12,
    specialRequirements: ["BLS", "Med/Surg Experience"],
    requirements: ["Licensed Practical Nurse"],
    createdById: 3,
    createdAt: "2025-06-19T09:15:00Z",
    updatedAt: "2025-06-19T16:45:00Z",
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
    rate: 40.0,
    hourlyRate: 40.0,
    premiumMultiplier: 1.3,
    status: "open",
    urgency: "high",
    description: "Telemetry night shift requiring cardiac monitoring experience",
    requiredStaff: 1,
    assignedStaffIds: [],
    specialRequirements: ["BLS", "ACLS", "Telemetry Certification"],
    requirements: ["Registered Nurse"],
    createdById: 1,
    createdAt: "2025-06-19T11:30:00Z",
    updatedAt: "2025-06-19T11:30:00Z",
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
    rate: 48.0,
    hourlyRate: 48.0,
    premiumMultiplier: 1.2,
    status: "completed",
    urgency: "medium",
    description: "OR day shift - general surgery cases",
    requiredStaff: 1,
    assignedStaffIds: [8],
    assignedTo: 8,
    specialRequirements: ["BLS", "ACLS", "OR Experience", "CNOR Preferred"],
    requirements: ["Registered Nurse"],
    createdById: 4,
    createdAt: "2025-06-18T14:00:00Z",
    updatedAt: "2025-06-19T18:00:00Z",
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
    rate: 44.0,
    hourlyRate: 44.0,
    premiumMultiplier: 1.15,
    status: "open",
    urgency: "medium",
    description: "Pediatric unit day shift",
    requiredStaff: 2,
    assignedStaffIds: [],
    specialRequirements: ["BLS", "PALS", "Pediatric Experience"],
    requirements: ["Registered Nurse"],
    createdById: 3,
    createdAt: "2025-06-19T12:00:00Z",
    updatedAt: "2025-06-19T12:00:00Z",
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
    rate: 46.0,
    hourlyRate: 46.0,
    premiumMultiplier: 1.35,
    status: "requested",
    urgency: "high",
    description: "Labor and delivery night coverage",
    requiredStaff: 1,
    assignedStaffIds: [15],
    requestedBy: 15,
    specialRequirements: ["BLS", "NRP", "L&D Experience", "Electronic Fetal Monitoring"],
    requirements: ["Registered Nurse"],
    createdById: 4,
    createdAt: "2025-06-19T13:15:00Z",
    updatedAt: "2025-06-19T17:30:00Z",
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
    rate: 47.0,
    hourlyRate: 47.0,
    premiumMultiplier: 1.4,
    status: "open",
    urgency: "critical",
    description: "Weekend ICU coverage - high acuity patients",
    requiredStaff: 3,
    assignedStaffIds: [],
    specialRequirements: ["BLS", "ACLS", "Critical Care Certification", "Ventilator Management"],
    requirements: ["Registered Nurse"],
    createdById: 1,
    createdAt: "2025-06-19T14:45:00Z",
    updatedAt: "2025-06-19T14:45:00Z",
  },
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
    rate: 45.0,
    premiumMultiplier: 1.25,
    status: "open",
    urgency: "high",
    description: "Week-long ICU night shift coverage block",
    specialRequirements: ["BLS", "ACLS", "Critical Care Experience"],
    createdById: 1,
    createdAt: "2025-06-19T15:00:00Z",
    updatedAt: "2025-06-19T15:00:00Z",
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
    rate: 28.0,
    premiumMultiplier: 1.2,
    status: "partially_filled",
    urgency: "medium",
    description: "Weekend med/surg coverage",
    specialRequirements: ["BLS", "Med/Surg Experience"],
    createdById: 3,
    createdAt: "2025-06-19T16:30:00Z",
    updatedAt: "2025-06-19T16:30:00Z",
  },
];

export function ShiftProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [open, setOpen] = useState<Shift[]>([]);
  const [requested, setRequested] = useState<Shift[]>([]);
  const [booked, setBooked] = useState<Shift[]>([]);
  const [history, setHistory] = useState<Shift[]>([]);
  const [blockShifts, setBlockShifts] = useState<BlockShift[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load all shift categories when user changes
  useEffect(() => {
    if (user) {
      loadAllShifts();
    }
  }, [user]);

  const loadAllShifts = async () => {
    if (!user) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch all shift categories in parallel
      const [openResponse, requestedResponse, bookedResponse, historyResponse] = await Promise.all([
        fetch('/api/shifts?status=open', { credentials: 'include' }),
        fetch('/api/shifts?status=requested', { credentials: 'include' }),
        fetch('/api/shifts?status=assigned,in_progress', { credentials: 'include' }),
        fetch(`/api/shifts/history/${user.id}`, { credentials: 'include' })
      ]);

      if (openResponse.ok) {
        const openData = await openResponse.json();
        setOpen(openData);
      } else {
        // Fallback to sample data for development
        setOpen(sampleShifts.filter(s => s.status === 'open'));
      }

      if (requestedResponse.ok) {
        const requestedData = await requestedResponse.json();
        setRequested(requestedData);
      } else {
        setRequested(sampleShifts.filter(s => s.status === 'requested'));
      }

      if (bookedResponse.ok) {
        const bookedData = await bookedResponse.json();
        setBooked(bookedData);
      } else {
        setBooked(sampleShifts.filter(s => s.status === 'assigned' || s.status === 'in_progress'));
      }

      if (historyResponse.ok) {
        const historyData = await historyResponse.json();
        setHistory(historyData);
      } else {
        setHistory(sampleShifts.filter(s => s.status === 'completed'));
      }

    } catch (error) {
      console.error('Failed to load shifts:', error);
      setError('Failed to load shifts');
      
      // Fallback to sample data
      setOpen(sampleShifts.filter(s => s.status === 'open'));
      setRequested(sampleShifts.filter(s => s.status === 'requested'));
      setBooked(sampleShifts.filter(s => s.status === 'assigned' || s.status === 'in_progress'));
      setHistory(sampleShifts.filter(s => s.status === 'completed'));
    } finally {
      setIsLoading(false);
    }
  };

  // Legacy computed properties for backward compatibility
  const shifts = [...open, ...requested, ...booked, ...history];
  const openShifts = open;
  const requestedShifts = requested;
  const bookedShifts = booked;
  const completedShifts = history.filter((shift) => shift.status === "completed");

  const refreshShifts = async () => {
    await loadAllShifts();
  };

  const fetchShiftHistory = async (userId: number) => {
    if (!user) return;
    
    try {
      const response = await fetch(`/api/shifts/history/${userId}`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setHistory(data);
      } else {
        setHistory(sampleShifts.filter(s => s.status === "completed"));
      }
    } catch (err) {
      console.error("Failed to fetch shift history:", err);
      setHistory(sampleShifts.filter(s => s.status === "completed"));
    }
  };

  const updateShiftStatus = async (shiftId: number, status: ShiftStatus) => {
    try {
      setShifts((prevShifts) =>
        prevShifts.map((shift) =>
          shift.id === shiftId ? { ...shift, status, updatedAt: new Date().toISOString() } : shift
        )
      );
    } catch (err) {
      setError("Failed to update shift status");
    }
  };

  const assignStaffToShift = async (shiftId: number, staffId: number) => {
    try {
      setShifts((prevShifts) =>
        prevShifts.map((shift) =>
          shift.id === shiftId
            ? {
                ...shift,
                assignedStaffIds: [staffId],
                status: "assigned",
                updatedAt: new Date().toISOString(),
              }
            : shift
        )
      );
    } catch (err) {
      setError("Failed to assign staff to shift");
    }
  };

  const getShiftById = (id: number): Shift | undefined => {
    return shifts.find(shift => shift.id === id);
  };

  const addShift = async (shiftData: Omit<Shift, "id" | "createdAt" | "updatedAt">) => {
    try {
      const newShift: Shift = {
        ...shiftData,
        id: Date.now(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setShifts(prevShifts => [...prevShifts, newShift]);
    } catch (err) {
      setError("Failed to add shift");
    }
  };

  const requestShift = async (shiftId: number) => {
    if (!user) return;
    
    try {
      const response = await fetch('/api/shifts/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ shiftId, userId: user.id })
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Move shift from open to requested
        const shiftToMove = open.find(s => s.id === shiftId);
        if (shiftToMove) {
          setOpen(prev => prev.filter(s => s.id !== shiftId));
          
          if (data.autoAssigned) {
            // Auto-assigned, move to booked
            setBooked(prev => [...prev, data.assignedShift]);
          } else {
            // Move to requested
            setRequested(prev => [...prev, data.requestedShift]);
          }
          
          // Add to history
          setHistory(prev => [...prev, data.historyEntry]);
        }
      } else {
        throw new Error('Failed to request shift');
      }
    } catch (err) {
      setError("Failed to request shift");
    }
  };

  const assignShift = async (shiftId: number, userId: number) => {
    try {
      const response = await fetch('/api/shifts/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ shiftId, userId })
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Move shift from requested to booked
        const shiftToMove = requested.find(s => s.id === shiftId);
        if (shiftToMove) {
          setRequested(prev => prev.filter(s => s.id !== shiftId));
          setBooked(prev => [...prev, data.assignedShift]);
          setHistory(prev => [...prev, data.historyEntry]);
        }
      } else {
        throw new Error('Failed to assign shift');
      }
    } catch (err) {
      setError("Failed to assign shift");
    }
  };

  const cancelShift = async (shiftId: number) => {
    try {
      await updateShiftStatus(shiftId, "cancelled");
    } catch (err) {
      setError("Failed to cancel shift");
    }
  };

  const contextValue: ShiftContextType = {
    shifts,
    blockShifts,
    open,
    requested,
    booked,
    history,
    openShifts,
    requestedShifts,
    bookedShifts,
    completedShifts,
    isLoading,
    error,
    getShiftById,
    refreshShifts,
    updateShiftStatus,
    assignStaffToShift,
    requestShift,
    assignShift,
    cancelShift,
    addShift,
    fetchShiftHistory,
  };

  return <ShiftContext.Provider value={contextValue}>{children}</ShiftContext.Provider>;
}

export function useShifts() {
  const context = useContext(ShiftContext);
  if (context === undefined) {
    throw new Error("useShifts must be used within a ShiftProvider");
  }
  return context;
}
