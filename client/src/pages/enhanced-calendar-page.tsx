import { useState, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useFacilities, useFacility, getFacilityDisplayName, getFacilityTimezone } from "@/hooks/use-facility";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import {
  Calendar,
  Clock,
  Users,
  Filter,
  Search,
  Building,
  MapPin,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  User,
  AlertCircle,
  CheckCircle,
  X,
  MessageCircle,
  ExternalLink,
  Timer,
  UserCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Star,
  PlayCircle,
  Plus
} from "lucide-react";
import { format, addDays, startOfWeek } from "date-fns";

interface EnhancedShift {
  id: number;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  department: string;
  specialty: string;
  facilityId: number;
  facilityName: string;
  status: "open" | "requested" | "confirmed" | "cancelled" | "filled" | "expired" | "in_progress" | "completed" | "pending_review";
  rate: number;
  urgency: "low" | "medium" | "high" | "critical";
  description: string;
  assignedStaffId?: number;
  assignedStaffName?: string;
  assignedStaffEmail?: string;
  assignedStaffPhone?: string;
  assignedStaffSpecialty?: string;
  assignedStaffRating?: number;
  invoiceAmount?: number;
  invoiceStatus?: "pending_review" | "approved" | "rejected";
  invoiceHours?: number;
  filledPositions?: number;
  totalPositions?: number;
  minStaff?: number;
  maxStaff?: number;
}

interface CalendarFilter {
  facilities: string[];
  teams: string[];
  workers: string[];
  specialties: string[];
  statuses: string[];
  dateRange: {
    start: string;
    end: string;
  };
}

// Specialty color mapping by certification
const specialtyColors = {
  "RN": "#ef4444", // red - Registered Nurse
  "LPN": "#10b981", // emerald - Licensed Practical Nurse
  "CNA": "#3b82f6", // blue - Certified Nursing Assistant
  "RT": "#8b5cf6", // violet - Respiratory Therapist
  "PT": "#f59e0b", // amber - Physical Therapist
  "OT": "#84cc16", // lime - Occupational Therapist
  "CST": "#7c3aed", // purple - Certified Surgical Technologist
  "PCT": "#06b6d4", // cyan - Patient Care Technician
  "MA": "#f97316", // orange - Medical Assistant
  "EMT": "#dc2626", // dark red - Emergency Medical Technician
  "CRNA": "#be123c", // rose - Certified Registered Nurse Anesthetist
  "NP": "#9333ea", // purple - Nurse Practitioner
  "PA": "#14b8a6", // teal - Physician Assistant
  "default": "#6b7280"
};

// Status icons and colors
const statusConfig = {
  open: { icon: AlertCircle, color: "#ef4444", label: "Open" },
  requested: { icon: Clock, color: "#f59e0b", label: "Requested" },
  confirmed: { icon: CheckCircle2, color: "#10b981", label: "Confirmed" },
  filled: { icon: User, color: "#3b82f6", label: "Filled" },
  cancelled: { icon: XCircle, color: "#6b7280", label: "Cancelled" },
  expired: { icon: AlertTriangle, color: "#dc2626", label: "Expired" },
  in_progress: { icon: PlayCircle, color: "#8b5cf6", label: "In Progress" },
  completed: { icon: CheckCircle, color: "#059669", label: "Completed" },
  pending_review: { icon: Timer, color: "#8b5cf6", label: "Pending Review" },
  ncns: { icon: AlertTriangle, color: "#ef4444", label: "NCNS" },
  pending_timesheet: { icon: Timer, color: "#f59e0b", label: "Pending Timesheet" },
  paid: { icon: CheckCircle, color: "#10b981", label: "Paid" },
  no_show: { icon: X, color: "#dc2626", label: "No Show" },
  late: { icon: Clock, color: "#f97316", label: "Late" },
  early_departure: { icon: AlertCircle, color: "#ea580c", label: "Early Departure" }
};

// Helper function to get SVG paths for status icons
const getStatusIconSVG = (status: string) => {
  const svgPaths = {
    open: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="8" r="1"/><circle cx="12" cy="16" r="1"/>',
    requested: '<circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/>',
    confirmed: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22,4 12,14.01 9,11.01"/>',
    filled: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16,11 18,13 22,9"/>',
    cancelled: '<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>',
    expired: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="m12 17 .01 0"/>',
    in_progress: '<circle cx="12" cy="12" r="10"/><polygon points="10,8 16,12 10,16 10,8"/>',
    completed: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22,4 12,14.01 9,11.01"/>',
    pending_review: '<circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/>',
    default: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>'
  };
  return svgPaths[status as keyof typeof svgPaths] || svgPaths.default;
};

export default function EnhancedCalendarPage() {
  const { user, impersonatedUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Determine current user and their facility access
  const currentUser = impersonatedUser || user;
  const isFacilityUser = currentUser?.role?.includes('facility_');
  const userAssociatedFacilities = currentUser?.associatedFacilities || [];
  
  // Helper function to calculate hours between two times
  const calculateHoursBetween = (startTime: string, endTime: string): number => {
    if (!startTime || !endTime) return 8;
    
    const start = new Date(`2000-01-01 ${startTime}`);
    const end = new Date(`2000-01-01 ${endTime}`);
    
    // Handle overnight shifts
    if (end < start) {
      end.setDate(end.getDate() + 1);
    }
    
    const diffMs = end.getTime() - start.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    
    return Math.round(diffHours * 10) / 10; // Round to 1 decimal place
  };

  // Redirect workers to their Open Shifts list view
  const isWorker = user?.role === "internal_employee" || user?.role === "contractor_1099";
  
  if (isWorker) {
    // Import and render worker Open Shifts page instead
    const WorkerOpenShiftsPage = require("./worker-open-shifts-page").default;
    return <WorkerOpenShiftsPage />;
  }
  
  const calendarRef = useRef<FullCalendar>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"dayGridMonth" | "timeGridWeek" | "timeGridDay">("dayGridMonth");
  const [selectedShift, setSelectedShift] = useState<EnhancedShift | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddShiftDialog, setShowAddShiftDialog] = useState(false);
  const [shiftFormData, setShiftFormData] = useState({
    title: '',
    specialty: 'RN',
    shiftType: 'Day',
    date: format(new Date(), 'yyyy-MM-dd'),
    selectedDates: [] as string[],
    facilityId: '',
    startTime: '07:00',
    endTime: '19:00',
    rate: '45.00',
    urgency: 'medium',
    description: '',
    requiredStaff: '1'
  });

  
  // Advanced filters state with facility user filtering
  const [filters, setFilters] = useState<CalendarFilter>(() => {
    // Auto-filter by facility for facility users
    const initialFilters: CalendarFilter = {
      facilities: isFacilityUser && userAssociatedFacilities.length > 0 
        ? userAssociatedFacilities.map(String) 
        : [],
      teams: [],
      workers: [],
      specialties: [],
      statuses: [],
      dateRange: {
        start: format(new Date(), "yyyy-MM-dd"),
        end: format(addDays(new Date(), 30), "yyyy-MM-dd")
      }
    };
    return initialFilters;
  });

  // Fetch shifts with filters
  const { data: shifts = [], isLoading, refetch: refetchShifts } = useQuery<EnhancedShift[]>({
    queryKey: ["/api/shifts", filters, searchTerm],
    staleTime: 0, // Always fetch fresh data
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  // Fetch facilities for filters using centralized hook
  const { data: allFacilities = [] } = useFacilities({ isActive: true });
  
  // Filter facilities based on user associations
  const facilities = useMemo(() => {
    if (!isFacilityUser || !userAssociatedFacilities.length) {
      return allFacilities;
    }
    // For facility users, only show facilities they are associated with
    return allFacilities.filter(facility => 
      userAssociatedFacilities.includes(facility.id)
    );
  }, [allFacilities, isFacilityUser, userAssociatedFacilities]);

  // Fetch staff for filters
  const { data: staff = [] } = useQuery({
    queryKey: ["/api/staff"],
  });



  // Fetch shift requests for selected shift
  const { data: shiftRequests = [] } = useQuery<any[]>({
    queryKey: [`/api/shift-requests/${selectedShift?.id}`],
    enabled: !!selectedShift?.id,
  });

  // Create shift mutation
  const createShiftMutation = useMutation({
    mutationFn: async (shiftData: any) => {
      const response = await fetch('/api/shifts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(shiftData),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const error = await response.json();
        console.error('Shift creation error:', error);
        throw new Error(error.message || error.fieldErrors?.join('; ') || 'Failed to create shift');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });
      toast({ title: "Success", description: "Shift created successfully" });
      setShowAddShiftDialog(false);
      setShiftFormData({
        title: '',
        specialty: 'RN',
        shiftType: 'Day',
        date: format(new Date(), 'yyyy-MM-dd'),
        selectedDates: [],
        facilityId: '',
        startTime: '07:00',
        endTime: '19:00',
        rate: '45.00',
        urgency: 'medium',
        description: '',
        requiredStaff: '1'
      });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to create shift",
        variant: "destructive"
      });
    }
  });

  // Assignment mutations
  const assignWorkerMutation = useMutation({
    mutationFn: async ({ shiftId, workerId }: { shiftId: number; workerId: number }) => {
      const response = await fetch(`/api/shifts/${shiftId}/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ workerId }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Assignment failed');
      }
      
      return response.json();
    },
    onSuccess: async (data, variables) => {
      toast({
        title: "Worker Assigned",
        description: "Worker has been successfully assigned to the shift."
      });
      
      // Invalidate and refetch all related data
      queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });
      queryClient.invalidateQueries({ queryKey: [`/api/shift-requests/${variables.shiftId}`] });
      
      // Force immediate refresh with a small delay to ensure server has processed
      setTimeout(async () => {
        // First refetch the shifts data
        await queryClient.refetchQueries({ queryKey: ["/api/shifts"] });
        
        // Then get the updated data and update selected shift
        const updatedShifts = queryClient.getQueryData(["/api/shifts"]) as EnhancedShift[];
        if (updatedShifts && selectedShift) {
          const updatedShift = updatedShifts.find(s => s.id === selectedShift.id);
          if (updatedShift) {
            console.log('Updating selected shift after assignment:', {
              id: updatedShift.id,
              assignedStaff: (updatedShift as any).assignedStaff,
              filledPositions: updatedShift.filledPositions,
              totalPositions: updatedShift.totalPositions
            });
            setSelectedShift(updatedShift);
          }
        }
      }, 300);
    },
    onError: (error: any) => {
      toast({
        title: "Assignment Failed",
        description: error.message || "Failed to assign worker to shift.",
        variant: "destructive"
      });
    }
  });



  const unassignWorkerMutation = useMutation({
    mutationFn: async ({ shiftId, workerId }: { shiftId: number; workerId: number }) => {
      const response = await fetch(`/api/shifts/${shiftId}/unassign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ workerId }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Unassignment failed');
      }
      
      return response.json();
    },
    onSuccess: async (data, variables) => {
      toast({
        title: "Worker Unassigned",
        description: "Worker has been removed from the shift."
      });
      
      // Invalidate and refetch all related data
      queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });
      queryClient.invalidateQueries({ queryKey: [`/api/shift-requests/${variables.shiftId}`] });
      
      // Force immediate refresh with a small delay to ensure server has processed
      setTimeout(async () => {
        // First refetch the shifts data
        await queryClient.refetchQueries({ queryKey: ["/api/shifts"] });
        
        // Then get the updated data and update selected shift
        const updatedShifts = queryClient.getQueryData(["/api/shifts"]) as EnhancedShift[];
        if (updatedShifts && selectedShift) {
          const updatedShift = updatedShifts.find(s => s.id === selectedShift.id);
          if (updatedShift) {
            console.log('Updating selected shift after unassignment:', {
              id: updatedShift.id,
              assignedStaff: (updatedShift as any).assignedStaff,
              filledPositions: updatedShift.filledPositions,
              totalPositions: updatedShift.totalPositions
            });
            setSelectedShift(updatedShift);
          }
        }
      }, 300);
    },
    onError: (error: any) => {
      toast({
        title: "Unassignment Failed",
        description: error.message || "Failed to remove worker from shift.",
        variant: "destructive"
      });
    }
  });

  // Extract unique filter options from actual shift data
  const specialties = useMemo(() => {
    const uniqueSpecialties = Array.from(new Set(shifts.map(s => s.specialty))).filter(Boolean);
    // Use the same specialty codes as the calendar colors
    const defaultSpecialties = ["RN", "LPN", "CNA", "RT", "PT", "OT", "CST", "PCT", "MA", "EMT", "CRNA", "NP", "PA"];
    return uniqueSpecialties.length > 0 ? uniqueSpecialties : defaultSpecialties;
  }, [shifts]);

  const statuses = useMemo(() => {
    const uniqueStatuses = Array.from(new Set(shifts.map(s => s.status))).filter(Boolean);
    return uniqueStatuses.length > 0 ? uniqueStatuses : ["open", "requested", "confirmed", "cancelled", "filled"];
  }, [shifts]);

  const departments = useMemo(() => {
    const uniqueDepartments = Array.from(new Set(shifts.map(s => s.department))).filter(Boolean);
    return uniqueDepartments.length > 0 ? uniqueDepartments : ["ICU", "Emergency", "Medical-Surgical", "Operating Room", "Labor & Delivery"];
  }, [shifts]);

  // Apply filters to shifts with proper field mapping
  const filteredShifts = shifts.filter(shift => {
    const matchesSearch = searchTerm === "" || 
      shift.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shift.facilityName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shift.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shift.specialty?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFacility = filters.facilities.length === 0 || 
      filters.facilities.includes(shift.facilityId?.toString());
    
    const matchesSpecialty = filters.specialties.length === 0 || 
      filters.specialties.includes(shift.specialty);
    
    const matchesStatus = filters.statuses.length === 0 || 
      filters.statuses.includes(shift.status);

    // Fix worker matching to check assigned staff properly
    const matchesWorker = filters.workers.length === 0 || 
      ((shift as any).assignedStaff && (shift as any).assignedStaff.some((staff: any) => 
        filters.workers.includes(staff.id?.toString() || staff.workerId?.toString())
      )) ||
      (shift.assignedStaffId && filters.workers.includes(shift.assignedStaffId.toString()));

    return matchesSearch && matchesFacility && matchesSpecialty && matchesStatus && matchesWorker;
  });

  // Process shifts to check for expired status
  const processedShifts = filteredShifts.map(shift => {
    const shiftDateTime = new Date(`${shift.date}T${shift.endTime}`);
    const now = new Date();
    
    if (shift.status === "open" && shiftDateTime < now) {
      return { ...shift, status: "expired" as const };
    }
    return shift;
  });

  // Group shifts by date, specialty, and time for monthly view
  const groupShiftsByDay = (shifts: any[]) => {
    const groupedByDate: { [date: string]: any[] } = {};
    
    shifts.forEach(shift => {
      if (!groupedByDate[shift.date]) {
        groupedByDate[shift.date] = [];
      }
      groupedByDate[shift.date].push(shift);
    });

    // Group shifts within each day by specialty and time
    Object.keys(groupedByDate).forEach(date => {
      const dayShifts = groupedByDate[date];
      const grouped: { [key: string]: any[] } = {};
      
      dayShifts.forEach(shift => {
        const groupKey = `${shift.specialty}-${shift.startTime}-${shift.endTime}`;
        if (!grouped[groupKey]) {
          grouped[groupKey] = [];
        }
        grouped[groupKey].push(shift);
      });
      
      groupedByDate[date] = Object.values(grouped);
    });
    
    return groupedByDate;
  };

  const groupedShifts = groupShiftsByDay(processedShifts);

  // Convert to calendar events with enhanced grouping
  const calendarEvents = Object.entries(groupedShifts).flatMap(([date, dayGroups]) => {
    return dayGroups.map((group: any[], groupIndex: number) => {
      const firstShift = group[0];
      const specialty = firstShift.specialty;
      const specialtyColor = (specialtyColors as any)[specialty] || specialtyColors.default;
      const statusInfo = statusConfig[firstShift.status as keyof typeof statusConfig] || statusConfig.open;
      
      // Calculate filled/total using backend assignment data with proper single-worker handling
      const totalWorkers = firstShift.totalPositions || 1; // Default to 1 for single shifts
      const filledWorkers = firstShift.filledPositions || 0;
      
      let title = '';
      if (totalWorkers === 1) {
        // Single worker shift: show worker name if assigned, otherwise show "Requesting"
        const assignedWorkerName = firstShift.assignedStaffNames?.[0] || 
                                 firstShift.assignedStaff?.[0]?.name || 
                                 (firstShift.assignedStaff?.[0]?.firstName && firstShift.assignedStaff?.[0]?.lastName ? 
                                  `${firstShift.assignedStaff[0].firstName} ${firstShift.assignedStaff[0].lastName}` : null) ||
                                 firstShift.assignedStaffName;
        
        if (assignedWorkerName && filledWorkers > 0) {
          title = `${assignedWorkerName} – ${firstShift.startTime}–${firstShift.endTime}`;
        } else {
          title = `Requesting – ${firstShift.startTime}–${firstShift.endTime}`;
        }
      } else {
        // Multi-worker shift: "Specialty – Filled/Total – Start–End Time"
        title = `${specialty} – ${filledWorkers}/${totalWorkers} – ${firstShift.startTime}–${firstShift.endTime}`;
      }
      
      return {
        id: `${date}-${groupIndex}-${firstShift.id}`,
        title,
        start: `${date}T${firstShift.startTime}`,
        end: `${date}T${firstShift.endTime}`,
        backgroundColor: specialtyColor,
        borderColor: specialtyColor,
        textColor: '#fff',
        extendedProps: {
          shifts: group,
          shift: firstShift,
          facility: firstShift.facilityName,
          specialty,
          rate: firstShift.rate,
          urgency: firstShift.urgency,
          statusIcon: statusInfo?.icon || AlertCircle,
          statusColor: statusInfo?.color || "#6b7280",
          statusLabel: statusInfo?.label || firstShift.status,
          specialtyColor: specialtyColor,
          totalWorkers,
          filledWorkers,
          isGrouped: totalWorkers > 1
        }
      };
    });
  });

  const handleEventClick = (info: any) => {
    setSelectedShift(info.event.extendedProps.shift);
  };

  const handleFilterChange = (filterType: keyof CalendarFilter, value: any) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      facilities: [],
      teams: [],
      workers: [],
      specialties: [],
      statuses: [],
      dateRange: {
        start: format(new Date(), "yyyy-MM-dd"),
        end: format(addDays(new Date(), 30), "yyyy-MM-dd")
      }
    });
    setSearchTerm("");
  };

  const activeFilterCount = 
    filters.facilities.length + 
    filters.specialties.length + 
    filters.statuses.length + 
    filters.workers.length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Enhanced Calendar
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Advanced scheduling view with comprehensive filtering and real-time updates
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowAddShiftDialog(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Shift
          </Button>
        </div>
      </div>


      {/* Filter Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant={showFilters ? "default" : "outline"}
            onClick={() => setShowFilters(!showFilters)}
            size="sm"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
          </Button>

          <div className="flex gap-1">
            <Button
              variant={viewMode === "dayGridMonth" ? "default" : "outline"}
              onClick={() => {
                setViewMode("dayGridMonth");
                calendarRef.current?.getApi().changeView("dayGridMonth");
              }}
              size="sm"
            >
              Month
            </Button>
            <Button
              variant={viewMode === "timeGridWeek" ? "default" : "outline"}
              onClick={() => {
                setViewMode("timeGridWeek");
                calendarRef.current?.getApi().changeView("timeGridWeek");
              }}
              size="sm"
            >
              Week
            </Button>
            <Button
              variant={viewMode === "timeGridDay" ? "default" : "outline"}
              onClick={() => {
                setViewMode("timeGridDay");
                calendarRef.current?.getApi().changeView("timeGridDay");
              }}
              size="sm"
            >
              Day
            </Button>
          </div>
        </div>
      </div>

      {/* Advanced Filters Panel */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Advanced Filters
              </div>
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-2" />
                Clear All
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {/* Search */}
              <div>
                <Label>Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search shifts..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Facility Filter */}
              <div>
                <Label>Facilities</Label>
                <Select
                  value={filters.facilities[0] || "all"}
                  onValueChange={(value) => 
                    handleFilterChange("facilities", value === "all" ? [] : [value])
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Facilities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Facilities</SelectItem>
                    {(facilities as any[]).map((facility: any) => (
                      <SelectItem key={facility.id} value={facility.id.toString()}>
                        {facility.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Specialty Filter */}
              <div>
                <Label>Specialty</Label>
                <Select
                  value={filters.specialties[0] || "all"}
                  onValueChange={(value) => 
                    handleFilterChange("specialties", value === "all" ? [] : [value])
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Specialties" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Specialties</SelectItem>
              {specialties.map((specialty, idx) => (
                <SelectItem key={`${specialty}-${idx}`} value={specialty}>
                  {specialty}
                </SelectItem>
              ))}
              </SelectContent>
              </Select>
              </div>
              
              {/* Status Filter */}
              <div>
                <Label>Status</Label>
                <Select
                  value={filters.statuses[0] || "all"}
                  onValueChange={(value) => 
                    handleFilterChange("statuses", value === "all" ? [] : [value])
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {statuses.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Worker Filter */}
              <div>
                <Label>Assigned Worker</Label>
                <Select
                  value={filters.workers[0] || "all"}
                  onValueChange={(value) => 
                    handleFilterChange("workers", value === "all" ? [] : [value])
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Workers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Workers</SelectItem>
                    {(staff as any[]).map((worker: any) => (
                      <SelectItem key={worker.id} value={worker.id.toString()}>
                        {worker.firstName} {worker.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Filter Summary */}
            {activeFilterCount > 0 && (
              <div className="mt-4 space-y-2">
                <div className="flex flex-wrap gap-2">
                  {filters.facilities.map(facilityId => {
                    const facility = (facilities as any[]).find((f: any) => f.id.toString() === facilityId);
                    return facility ? (
                      <Badge key={facilityId} variant="secondary">
                        <Building className="h-3 w-3 mr-1" />
                        {facility.name}
                      </Badge>
                    ) : null;
                  })}
                </div>

                <div className="flex flex-wrap gap-2">
                  {filters.specialties.map((specialty, idx) => (
                    <Badge key={`${specialty}-${idx}`} variant="secondary">
                      <Users className="h-3 w-3 mr-1" />
                      {specialty}
                    </Badge>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2">
                  {filters.statuses.map(status => (
                    <Badge key={status} variant="secondary">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Shifts</p>
                <p className="text-2xl font-bold">{filteredShifts.length}</p>
              </div>
              <Calendar className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Open Shifts</p>
                <p className="text-2xl font-bold text-red-600">
                  {filteredShifts.filter(s => s.status === "open").length}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Filled Shifts</p>
                <p className="text-2xl font-bold text-green-600">
                  {filteredShifts.filter(s => s.status === "filled" || s.status === "confirmed").length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg. Rate</p>
                <p className="text-2xl font-bold">
                  ${filteredShifts.length > 0 ? 
                    Math.round(filteredShifts.reduce((sum, s) => sum + s.rate, 0) / filteredShifts.length) 
                    : 0}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Calendar */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Shift Calendar
            {isLoading && <Badge variant="secondary">Loading...</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Calendar Legend */}
          <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium mb-2">Specialty Colors</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {Object.entries(specialtyColors).filter(([key]) => key !== 'default').slice(0, 6).map(([specialty, color]) => (
                  <div key={specialty} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: color }} />
                    <span className="truncate">{specialty}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium mb-2">Status Icons</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {Object.entries(statusConfig).slice(0, 6).map(([status, config]) => {
                  const IconComponent = config?.icon || AlertCircle;
                  return (
                    <div key={status} className="flex items-center gap-2">
                      <IconComponent className="w-3 h-3" style={{ color: config?.color || "#6b7280" }} />
                      <span className="truncate">{config?.label || status}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView={viewMode}
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: ''
            }}
            views={{
              dayGridMonth: {
                dayMaxEvents: 6,
                moreLinkClick: 'popover',
                moreLinkContent: (args) => {
                  const hiddenEventCount = args.num;
                  return `Show ${hiddenEventCount} more`;
                }
              },
              timeGridWeek: {
                slotMinTime: '05:00:00',
                slotMaxTime: '23:00:00',
                slotDuration: '01:00:00',
                slotLabelInterval: '02:00:00',
                allDaySlot: false
              },
              timeGridDay: {
                slotMinTime: '05:00:00',
                slotMaxTime: '23:00:00',
                slotDuration: '01:00:00',
                slotLabelInterval: '01:00:00',
                allDaySlot: false
              }
            }}
            events={calendarEvents}
            viewDidMount={(info) => {
              setViewMode(info.view.type as "dayGridMonth" | "timeGridWeek" | "timeGridDay");
            }}
            eventClick={handleEventClick}
            height="auto"
            dayMaxEvents={6}
            moreLinkClick="popover"
            eventDisplay="block"
            displayEventTime={true}
            eventTimeFormat={{
              hour: 'numeric',
              minute: '2-digit',
              meridiem: 'short'
            }}
            eventContent={(eventInfo) => {
              const extendedProps = eventInfo.event.extendedProps;
              const shift = extendedProps.shift;
              const statusInfo = statusConfig[shift.status as keyof typeof statusConfig] || statusConfig.open;
              const isGrouped = extendedProps.isGrouped;
              const specialty = extendedProps.specialty;
              const StatusIcon = statusInfo.icon;
              
              let displayText = '';
              if (isGrouped) {
                // Multi-worker shift: "Specialty – Filled/Total – Start–End Time"
                displayText = `${specialty} – ${extendedProps.filledWorkers}/${extendedProps.totalWorkers} – ${shift.startTime}–${shift.endTime}`;
              } else {
                // Single worker shift: "Worker Name – Start–End Time"
                const workerName = shift.assignedStaffName || 'Requesting';
                displayText = `${workerName} – ${shift.startTime}–${shift.endTime}`;
              }
              
              return {
                html: `
                  <div class="fc-event-content-custom relative w-full h-full p-1 rounded border" style="background-color: ${eventInfo.event.backgroundColor}; min-height: 18px; border-color: ${eventInfo.event.borderColor};">
                    <div class="absolute top-0 right-0 w-4 h-4 flex items-center justify-center rounded-full" style="background-color: ${statusInfo.color};">
                      <svg class="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 24 24">
                        ${getStatusIconSVG(shift.status)}
                      </svg>
                    </div>
                    <div class="text-xs font-medium text-white truncate pr-5" style="max-width: calc(100% - 20px); line-height: 1.1;">
                      ${displayText}
                    </div>
                  </div>
                `
              };
            }}
          />
        </CardContent>
      </Card>

      {/* Shift Detail Modal */}
      <Dialog open={!!selectedShift} onOpenChange={() => setSelectedShift(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Shift Details</DialogTitle>
            <DialogDescription>
              Manage shift assignments and view staffing information
            </DialogDescription>
          </DialogHeader>
          {selectedShift && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Facility</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    <span>{getFacilityDisplayName(facilities.find(f => f.id === selectedShift.facilityId)) || selectedShift.facilityName}</span>
                  </div>
                </div>
                <div>
                  <Label>Department</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedShift.department}</span>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Date & Time</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedShift.date} {selectedShift.startTime} - {selectedShift.endTime}</span>
                  </div>
                </div>
                <div>
                  <Label>Urgency</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={selectedShift.urgency === 'critical' ? 'destructive' : selectedShift.urgency === 'high' ? 'default' : 'secondary'}>
                      {selectedShift.urgency}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Status</Label>
                  <div className="flex items-center gap-2 mt-1">
                    {(() => {
                      const statusInfo = statusConfig[selectedShift.status as keyof typeof statusConfig] || statusConfig.open;
                      const StatusIcon = statusInfo?.icon || AlertCircle;
                      return <StatusIcon className="h-4 w-4" style={{ color: statusInfo?.color || "#6b7280" }} />;
                    })()}
                    <Badge style={{ backgroundColor: (statusConfig[selectedShift.status as keyof typeof statusConfig] || statusConfig.open)?.color || "#6b7280" }}>
                      {(statusConfig[selectedShift.status as keyof typeof statusConfig] || statusConfig.open)?.label || selectedShift.status}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label>Specialty</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <div 
                      className="w-4 h-4 rounded" 
                      style={{ backgroundColor: (specialtyColors as any)[selectedShift.specialty] || specialtyColors.default }}
                    />
                    <span>{selectedShift.specialty}</span>
                  </div>
                </div>
              </div>

              {/* Staffing Information */}
              <div className="bg-muted/50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-base font-semibold">Staffing Status</Label>
                  {selectedShift.filledPositions !== undefined && selectedShift.totalPositions !== undefined && (
                    <Badge variant={selectedShift.filledPositions >= (selectedShift.minStaff || 1) ? "default" : "destructive"}>
                      {selectedShift.filledPositions}/{selectedShift.totalPositions} Filled
                    </Badge>
                  )}
                </div>

                {(selectedShift as any).assignedStaff && (selectedShift as any).assignedStaff.length > 0 ? (
                  <div className="space-y-3">
                    {(selectedShift as any).assignedStaff.map((staff: any, index: number) => (
                      <div key={staff.id || index} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                            <User className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{staff.name}</p>
                            {staff.specialty && (
                              <p className="text-sm text-muted-foreground">{staff.specialty}</p>
                            )}
                            {staff.rating && (
                              <div className="flex items-center gap-1 mt-1">
                                <Star className="h-3 w-3 text-yellow-500 fill-current" />
                                <span className="text-sm text-muted-foreground">{staff.rating.toFixed(1)}/5</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              if (staff.id) {
                                window.location.href = `/enhanced-staff?profile=${staff.id}`;
                              }
                            }}
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Profile
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              if (staff.id) {
                                window.location.href = `/messaging?conversation=${staff.id}`;
                              }
                            }}
                          >
                            <MessageCircle className="h-3 w-3 mr-1" />
                            Message
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => {
                              if (selectedShift && staff.id) {
                                unassignWorkerMutation.mutate({
                                  shiftId: selectedShift.id,
                                  workerId: staff.id
                                });
                              }
                            }}
                            disabled={unassignWorkerMutation.isPending}
                          >
                            <X className="h-3 w-3 mr-1" />
                            {unassignWorkerMutation.isPending ? "Removing..." : "Remove"}
                          </Button>
                        </div>
                      </div>
                    ))}
                    
                    {/* Invoice Information for Completed Shifts Only */}
                    {selectedShift.status === 'completed' && selectedShift.invoiceAmount && (
                      <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
                        <div className="flex items-center justify-between mb-2">
                          <Label className="text-sm font-semibold text-green-800 dark:text-green-200">Invoice Information</Label>
                          <Badge variant={selectedShift.invoiceStatus === 'approved' ? 'default' : 'secondary'}>
                            {selectedShift.invoiceStatus === 'approved' ? 'Approved' : 'Pending Review'}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Hours Worked:</span>
                            <span className="ml-2 font-medium">{selectedShift.invoiceHours}h</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Amount:</span>
                            <span className="ml-2 font-medium">${selectedShift.invoiceAmount.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : selectedShift.assignedStaffName ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{selectedShift.assignedStaffName}</p>
                          {selectedShift.assignedStaffSpecialty && (
                            <p className="text-sm text-muted-foreground">{selectedShift.assignedStaffSpecialty}</p>
                          )}
                          {selectedShift.assignedStaffRating && (
                            <div className="flex items-center gap-1 mt-1">
                              <Star className="h-3 w-3 text-yellow-500 fill-current" />
                              <span className="text-sm text-muted-foreground">{selectedShift.assignedStaffRating.toFixed(1)}/5</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            if (selectedShift.assignedStaffId) {
                              window.location.href = `/enhanced-staff?profile=${selectedShift.assignedStaffId}`;
                            }
                          }}
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Profile
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            if (selectedShift.assignedStaffId) {
                              window.location.href = `/messaging?conversation=${selectedShift.assignedStaffId}`;
                            }
                          }}
                        >
                          <MessageCircle className="h-3 w-3 mr-1" />
                          Message
                        </Button>
                      </div>
                    </div>
                    
                    {/* Invoice Information for Completed Shifts Only */}
                    {selectedShift.status === 'completed' && selectedShift.invoiceAmount && (
                      <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
                        <div className="flex items-center justify-between mb-2">
                          <Label className="text-sm font-semibold text-green-800 dark:text-green-200">Invoice Information</Label>
                          <Badge variant={selectedShift.invoiceStatus === 'approved' ? 'default' : 'secondary'}>
                            {selectedShift.invoiceStatus === 'approved' ? 'Approved' : 'Pending Review'}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Hours Worked:</span>
                            <span className="ml-2 font-medium">{selectedShift.invoiceHours}h</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Amount:</span>
                            <span className="ml-2 font-medium">${selectedShift.invoiceAmount.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No staff assigned to this shift</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {selectedShift.totalPositions ? `${selectedShift.totalPositions} position(s) available` : 'Position available'}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <Label>Description</Label>
                <p className="mt-1 text-sm text-muted-foreground">{selectedShift.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Urgency Level</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <div className={`w-2 h-2 rounded-full ${
                      selectedShift.urgency === 'critical' ? 'bg-red-500' :
                      selectedShift.urgency === 'high' ? 'bg-orange-500' :
                      selectedShift.urgency === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                    }`} />
                    <span className="capitalize">{selectedShift.urgency}</span>
                  </div>
                </div>
                <div>
                  <Label>Shift Duration</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Timer className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {(() => {
                        const start = new Date(`2000-01-01T${selectedShift.startTime}`);
                        let end = new Date(`2000-01-01T${selectedShift.endTime}`);
                        
                        // Handle overnight shifts (end time is next day)
                        if (end <= start) {
                          end = new Date(`2000-01-02T${selectedShift.endTime}`);
                        }
                        
                        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
                        return `${Math.abs(hours)} hours`;
                      })()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Shift Requests List for Facility Managers and Super Admins */}
              {user && (user.role === 'facility_manager' || user.role === 'super_admin' || user.role === 'admin') && 
               selectedShift.status !== 'filled' && selectedShift.status !== 'cancelled' && selectedShift.status !== 'completed' && 
               (selectedShift.filledPositions || 0) < (selectedShift.totalPositions || 1) && (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-base font-semibold text-blue-900 dark:text-blue-100">Shift Requests</Label>
                    {(() => {
                      const assignedStaff = (selectedShift as any).assignedStaff || [];
                      const availableRequests = shiftRequests.filter((request: any) => 
                        !assignedStaff.some((staff: any) => staff.id === request.workerId)
                      );
                      return <Badge variant="secondary">{availableRequests.length} Available Request{availableRequests.length !== 1 ? 's' : ''}</Badge>;
                    })()}
                  </div>
                  
                  {shiftRequests.filter((request: any) => {
                    const assignedStaff = (selectedShift as any).assignedStaff || [];
                    return !assignedStaff.some((staff: any) => staff.id === request.workerId);
                  }).length > 0 ? (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {shiftRequests.filter((request: any) => {
                        const assignedStaff = (selectedShift as any).assignedStaff || [];
                        return !assignedStaff.some((staff: any) => staff.id === request.workerId);
                      }).map((request: any) => (
                        <div key={request.id} className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-blue-200 dark:border-blue-700">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center flex-shrink-0">
                                <User className="h-4 w-4 text-blue-600 dark:text-blue-300" />
                              </div>
                              <div>
                                <p className="font-medium text-sm">{request.workerName}</p>
                                <p className="text-xs text-muted-foreground">{request.specialty}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="flex items-center gap-1 mb-1">
                                <span className="text-xs text-muted-foreground">Reliability:</span>
                                <span className="text-xs font-medium text-green-600">{request.reliabilityScore}%</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Star className="h-3 w-3 text-yellow-500 fill-current" />
                                <span className="text-xs">{request.averageRating?.toFixed(1)}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="mt-2 grid grid-cols-2 gap-4 text-xs">
                            <div>
                              <span className="text-muted-foreground">Shifts Worked:</span>
                              <span className="ml-1 font-medium">{request.totalShiftsWorked}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Rate:</span>
                              <span className="ml-1 font-medium">${request.hourlyRate?.toFixed(0)}/hr</span>
                            </div>
                          </div>
                          
                          <div className="mt-2 flex gap-2">
                            <Button size="sm" variant="outline" className="flex-1 text-xs">
                              <ExternalLink className="h-3 w-3 mr-1" />
                              View Profile
                            </Button>
                            <Button 
                              size="sm" 
                              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs"
                              onClick={() => {
                                if (selectedShift && request.workerId) {
                                  assignWorkerMutation.mutate({
                                    shiftId: selectedShift.id,
                                    workerId: request.workerId
                                  });
                                }
                              }}
                              disabled={assignWorkerMutation.isPending}
                            >
                              <UserCheck className="h-3 w-3 mr-1" />
                              {assignWorkerMutation.isPending ? "Assigning..." : "Assign"}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <Users className="h-8 w-8 text-blue-400 mx-auto mb-2" />
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        {shiftRequests.length > 0 
                          ? "All eligible workers have been assigned to this shift" 
                          : "No requests for this shift yet"
                        }
                      </p>
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                        {shiftRequests.length > 0 
                          ? "Additional positions can be filled when new workers submit requests" 
                          : "Workers can request this shift from their dashboard"
                        }
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Regular Employee Request Action */}
              {user && (user.role === 'employee' || user.role === 'contractor') && selectedShift.status === 'open' && !selectedShift.assignedStaffId && (
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base font-semibold text-green-900 dark:text-green-100">Request This Shift</Label>
                      <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                        Submit a request to work this shift. Your request will be reviewed by the facility manager.
                      </p>
                    </div>
                    <Button className="bg-green-600 hover:bg-green-700 text-white">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Request Shift
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Shift Dialog */}
      <Dialog open={showAddShiftDialog} onOpenChange={setShowAddShiftDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Shift</DialogTitle>
            <DialogDescription>
              Create a new shift assignment for your facility
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Title</Label>
                <input 
                  type="text" 
                  className="w-full mt-1 p-2 border rounded-md"
                  placeholder="ICU Day Shift"
                  value={shiftFormData.title}
                  onChange={(e) => setShiftFormData({...shiftFormData, title: e.target.value})}
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Specialty</Label>
                <select 
                  className="w-full mt-1 p-2 border rounded-md"
                  value={shiftFormData.specialty}
                  onChange={(e) => setShiftFormData({...shiftFormData, specialty: e.target.value})}
                >
                  <option value="RN">RN - Registered Nurse</option>
                  <option value="LPN">LPN - Licensed Practical Nurse</option>
                  <option value="CNA">CNA - Certified Nursing Assistant</option>
                  <option value="RT">RT - Respiratory Therapist</option>
                  <option value="PT">PT - Physical Therapist</option>
                  <option value="CST">CST - Certified Surgical Tech</option>
                  <option value="PCT">PCT - Patient Care Technician</option>
                  <option value="MA">MA - Medical Assistant</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Shift Type</Label>
                <select 
                  className="w-full mt-1 p-2 border rounded-md"
                  value={shiftFormData.shiftType}
                  onChange={(e) => setShiftFormData({...shiftFormData, shiftType: e.target.value})}
                >
                  <option value="Day">Day Shift</option>
                  <option value="Night">Night Shift</option>
                  <option value="Evening">Evening Shift</option>
                  <option value="Weekend">Weekend Shift</option>
                  <option value="On-Call">On-Call</option>
                </select>
              </div>
              <div>
                <Label className="text-sm font-medium">Facility</Label>
                <div className="mt-1">
                  <select 
                    className="w-full p-2 border rounded-md"
                    value={shiftFormData.facilityId}
                    onChange={(e) => setShiftFormData({...shiftFormData, facilityId: e.target.value})}
                  >
                    <option value="">Select Facility</option>
                    {facilities.map((facility) => (
                      <option key={facility.id} value={facility.id.toString()}>
                        {getFacilityDisplayName(facility)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium">Date Selection</Label>
              <div className="space-y-2">
                <div className="relative">
                  <input 
                    type="date" 
                    className="w-full mt-1 p-2 border rounded-md pr-10"
                    value={shiftFormData.date}
                    onChange={(e) => {
                      const newDate = e.target.value;
                      setShiftFormData({...shiftFormData, date: newDate});
                      
                      // Auto-add date to selection if not already selected
                      if (newDate && !shiftFormData.selectedDates.includes(newDate)) {
                        setShiftFormData(prev => ({
                          ...prev,
                          date: newDate,
                          selectedDates: [...prev.selectedDates, newDate].sort()
                        }));
                      }
                    }}
                    multiple={false}
                  />
                </div>
                {shiftFormData.selectedDates.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-gray-700">Selected dates ({shiftFormData.selectedDates.length}):</div>
                    <div className="flex flex-wrap gap-1">
                      {shiftFormData.selectedDates.map(date => (
                        <span key={date} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                          {date}
                          <button
                            type="button"
                            onClick={() => setShiftFormData(prev => ({
                              ...prev,
                              selectedDates: prev.selectedDates.filter(d => d !== date)
                            }))}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShiftFormData(prev => ({...prev, selectedDates: []}))}
                      className="h-6 text-xs"
                    >
                      Clear All
                    </Button>
                  </div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Start Time</Label>
                <input 
                  type="time" 
                  className="w-full mt-1 p-2 border rounded-md"
                  value={shiftFormData.startTime}
                  onChange={(e) => setShiftFormData({...shiftFormData, startTime: e.target.value})}
                />
              </div>
              <div>
                <Label className="text-sm font-medium">End Time</Label>
                <input 
                  type="time" 
                  className="w-full mt-1 p-2 border rounded-md"
                  value={shiftFormData.endTime}
                  onChange={(e) => setShiftFormData({...shiftFormData, endTime: e.target.value})}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Hourly Rate</Label>
                <input 
                  type="number" 
                  className="w-full mt-1 p-2 border rounded-md"
                  placeholder="45.00"
                  step="0.01"
                  value={shiftFormData.rate}
                  onChange={(e) => setShiftFormData({...shiftFormData, rate: e.target.value})}
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Required Staff</Label>
                <input 
                  type="number" 
                  className="w-full mt-1 p-2 border rounded-md"
                  min="1"
                  max="10"
                  value={shiftFormData.requiredStaff}
                  onChange={(e) => setShiftFormData({...shiftFormData, requiredStaff: e.target.value})}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Urgency</Label>
                <select 
                  className="w-full mt-1 p-2 border rounded-md"
                  value={shiftFormData.urgency}
                  onChange={(e) => setShiftFormData({...shiftFormData, urgency: e.target.value})}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium">Description</Label>
              <textarea 
                className="w-full mt-1 p-2 border rounded-md"
                rows={3}
                placeholder="Additional shift details and requirements..."
                value={shiftFormData.description}
                onChange={(e) => setShiftFormData({...shiftFormData, description: e.target.value})}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => setShowAddShiftDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (!shiftFormData.facilityId) {
                  toast({ 
                    title: "Validation Error", 
                    description: "Please select a facility", 
                    variant: "destructive" 
                  });
                  return;
                }

                // Use selected dates if any, otherwise use single date
                const datesToCreate = shiftFormData.selectedDates.length > 0 
                  ? shiftFormData.selectedDates 
                  : [shiftFormData.date];

                // Create a shift for each selected date
                datesToCreate.forEach(date => {
                  createShiftMutation.mutate({
                    title: shiftFormData.title || `${shiftFormData.specialty} Shift`,
                    specialty: shiftFormData.specialty,
                    shiftType: shiftFormData.shiftType,
                    department: shiftFormData.specialty, // Use specialty as department fallback
                    date: date,
                    facilityId: parseInt(shiftFormData.facilityId),
                    startTime: shiftFormData.startTime,
                    endTime: shiftFormData.endTime,
                    rate: parseFloat(shiftFormData.rate) || 45.00,
                    urgency: shiftFormData.urgency,
                    description: shiftFormData.description || '',
                    requiredStaff: parseInt(shiftFormData.requiredStaff) || 1,
                    status: 'open'
                  });
                });
              }}
              disabled={createShiftMutation.isPending}
            >
{createShiftMutation.isPending ? "Creating..." : `Create ${shiftFormData.selectedDates.length > 1 ? `${shiftFormData.selectedDates.length} Shifts` : 'Shift'}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
