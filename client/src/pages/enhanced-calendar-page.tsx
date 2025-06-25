import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
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
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useRef } from 'react';
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
  PlayCircle
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
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
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
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [showUseTemplateModal, setShowUseTemplateModal] = useState(false);
  const [showPostShiftModal, setShowPostShiftModal] = useState(false);
  const [activeTab, setActiveTab] = useState("calendar");
  
  // Advanced filters state
  const [filters, setFilters] = useState<CalendarFilter>({
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

  // Fetch shifts with filters
  const { data: shifts = [], isLoading, refetch: refetchShifts } = useQuery<EnhancedShift[]>({
    queryKey: ["/api/shifts", filters, searchTerm],
    staleTime: 0, // Always fetch fresh data
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  // Fetch facilities for filters
  const { data: facilities = [] } = useQuery({
    queryKey: ["/api/facilities"],
  });

  // Fetch staff for filters
  const { data: staff = [] } = useQuery({
    queryKey: ["/api/staff"],
  });

  // Fetch shift templates
  const { data: templates = [] } = useQuery<any[]>({
    queryKey: ["/api/shift-templates"],
  });

  // Fetch shift requests for selected shift
  const { data: shiftRequests = [] } = useQuery<any[]>({
    queryKey: [`/api/shift-requests/${selectedShift?.id}`],
    enabled: !!selectedShift?.id,
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

  // Post shift mutation
  const postShiftMutation = useMutation({
    mutationFn: async (shiftData: any) => {
      const response = await fetch('/api/shifts/post', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ shiftData }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to post shift');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Shift Added",
        description: "Shift has been successfully added to the schedule."
      });
      
      // Force immediate refresh of calendar data
      queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shifts", filters, searchTerm] });
      refetchShifts();
      setShowPostShiftModal(false);
      
      // Force page refresh to ensure new shift appears
      setTimeout(() => {
        window.location.reload();
      }, 300);
    },
    onError: (error: any) => {
      toast({
        title: "Add Shift Failed",
        description: error.message || "Failed to add shift.",
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
    return uniqueSpecialties.length > 0 ? uniqueSpecialties : ["RN", "LPN", "CNA", "PT", "RT"];
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
      filters.facilities.includes((shift.facilityId || shift.facility_id)?.toString());
    
    const matchesSpecialty = filters.specialties.length === 0 || 
      filters.specialties.includes(shift.specialty);
    
    const matchesStatus = filters.statuses.length === 0 || 
      filters.statuses.includes(shift.status);

    // Fix worker matching to check assigned staff properly
    const matchesWorker = filters.workers.length === 0 || 
      (shift.assignedStaff && shift.assignedStaff.some((staff: any) => 
        filters.workers.includes(staff.id?.toString() || staff.workerId?.toString())
      )) ||
      (shift.assignedStaffId && filters.workers.includes(shift.assignedStaffId.toString())) ||
      (shift.assignedStaffIds && shift.assignedStaffIds.some((id: any) => 
        filters.workers.includes(id.toString())
      ));

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
        id: `${date}-${groupIndex}`,
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
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
            <TabsList>
              <TabsTrigger value="calendar">Calendar</TabsTrigger>
              <TabsTrigger value="templates">Shift Templates</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {activeTab === "calendar" && (
        <>
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
          {user && (user.role === 'facility_manager' || user.role === 'super_admin' || user.role === 'admin') && (
            <Button
              onClick={() => setShowPostShiftModal(true)}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Calendar className="h-4 w-4 mr-2" />
              Add Shift
            </Button>
          )}
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
          </DialogHeader>
          {selectedShift && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Facility</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedShift.facilityName}</span>
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
              {user && (user.role === 'facility_manager' || user.role === 'super_admin' || user.role === 'admin') && selectedShift.status === 'open' && (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-base font-semibold text-blue-900 dark:text-blue-100">Shift Requests</Label>
                    <Badge variant="secondary">{shiftRequests.length} Request{shiftRequests.length !== 1 ? 's' : ''}</Badge>
                  </div>
                  
                  {shiftRequests.length > 0 ? (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {shiftRequests.map((request: any) => (
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
                      <p className="text-sm text-blue-700 dark:text-blue-300">No requests for this shift yet</p>
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">Workers can request this shift from their dashboard</p>
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Shift</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Title</Label>
                <input 
                  type="text" 
                  className="w-full mt-1 p-2 border rounded-md"
                  placeholder="ICU Day Shift"
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Specialty</Label>
                <select className="w-full mt-1 p-2 border rounded-md">
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
                <Label className="text-sm font-medium">Date</Label>
                <input 
                  type="date" 
                  className="w-full mt-1 p-2 border rounded-md"
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Facility</Label>
                <select className="w-full mt-1 p-2 border rounded-md">
                  <option value="1">Portland General Hospital</option>
                  <option value="2">Oregon Health & Science University</option>
                  <option value="3">Providence Portland Medical Center</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Start Time</Label>
                <input 
                  type="time" 
                  className="w-full mt-1 p-2 border rounded-md"
                  defaultValue="07:00"
                />
              </div>
              <div>
                <Label className="text-sm font-medium">End Time</Label>
                <input 
                  type="time" 
                  className="w-full mt-1 p-2 border rounded-md"
                  defaultValue="19:00"
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
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Urgency</Label>
                <select className="w-full mt-1 p-2 border rounded-md">
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
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => setShowAddShiftDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              toast({ title: "Shift Created", description: "New shift has been added successfully" });
              setShowAddShiftDialog(false);
            }}>
              Create Shift
            </Button>
          </div>
        </DialogContent>
      </Dialog>
        </>
      )}

      {/* Shift Templates Tab */}
      {activeTab === "templates" && (
        <div className="space-y-6">
          {/* Templates Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Shift Templates</h2>
              <p className="text-gray-600 dark:text-gray-400">Create and manage reusable shift templates</p>
            </div>
            <Button onClick={() => setShowTemplateModal(true)}>
              <Calendar className="w-4 h-4 mr-2" />
              Create Template
            </Button>
          </div>

          {/* Templates Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(templates as any[]).map((template: any) => (
              <Card key={template.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <Badge 
                      style={{ 
                        backgroundColor: specialtyColors[template.specialty as keyof typeof specialtyColors] || specialtyColors.default,
                        color: 'white' 
                      }}
                    >
                      {template.specialty}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <Building className="w-4 h-4" />
                      <span>{template.department} - {template.facilityName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <Clock className="w-4 h-4" />
                      <span>{template.startTime} - {template.endTime}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <DollarSign className="w-4 h-4" />
                      <span>${template.hourlyRate}/hr</span>
                    </div>
                    <div className="flex gap-1 mt-2">
                      <Badge variant="outline" className="text-xs">
                        <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                        Employees
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mr-1"></div>
                        Float Pool
                      </Badge>
                    </div>
                    {template.notes && (
                      <p className="text-sm text-gray-500 mt-2">{template.notes}</p>
                    )}
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button 
                      size="sm" 
                      onClick={() => {
                        setSelectedTemplate(template);
                        setShowUseTemplateModal(true);
                      }}
                    >
                      Use Template
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        setSelectedTemplate(template);
                        setShowTemplateModal(true);
                      }}
                    >
                      Edit
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {(templates as any[]).length === 0 && (
              <div className="col-span-full text-center py-12">
                <Calendar className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No templates yet</h3>
                <p className="text-gray-500 mb-4">Create your first shift template to get started</p>
                <Button onClick={() => setShowTemplateModal(true)}>
                  Create Template
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Template Creation/Edit Modal */}
      <Dialog open={showTemplateModal} onOpenChange={setShowTemplateModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedTemplate ? 'Edit Template' : 'Create Shift Template'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Template Name</Label>
                <Input 
                  placeholder="e.g., ICU Day Shift RN"
                  defaultValue={selectedTemplate?.name || ""}
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Facility</Label>
                <Select defaultValue={selectedTemplate?.facilityId || ""}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select facility" />
                  </SelectTrigger>
                  <SelectContent>
                    {(facilities as any[]).map((facility: any) => (
                      <SelectItem key={facility.id} value={facility.id.toString()}>
                        {facility.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label className="text-sm font-medium">Building/Unit</Label>
              <Select defaultValue={selectedTemplate?.buildingId || ""}>
                <SelectTrigger>
                  <SelectValue placeholder="Select building or unit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="main-building">Main Building</SelectItem>
                  <SelectItem value="north-wing">North Wing</SelectItem>
                  <SelectItem value="south-wing">South Wing</SelectItem>
                  <SelectItem value="west-tower">West Tower</SelectItem>
                  <SelectItem value="emergency-dept">Emergency Department</SelectItem>
                  <SelectItem value="icu-unit">ICU Unit</SelectItem>
                  <SelectItem value="or-suite">OR Suite</SelectItem>
                  <SelectItem value="maternity-ward">Maternity Ward</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Department</Label>
                <Select defaultValue={selectedTemplate?.department || ""}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ICU">ICU</SelectItem>
                    <SelectItem value="Emergency">Emergency</SelectItem>
                    <SelectItem value="Medical/Surgical">Medical/Surgical</SelectItem>
                    <SelectItem value="Operating Room">Operating Room</SelectItem>
                    <SelectItem value="Labor & Delivery">Labor & Delivery</SelectItem>
                    <SelectItem value="Pediatrics">Pediatrics</SelectItem>
                    <SelectItem value="Rehabilitation">Rehabilitation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium">Specialty</Label>
                <Select defaultValue={selectedTemplate?.specialty || ""}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select specialty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RN">RN - Registered Nurse</SelectItem>
                    <SelectItem value="LPN">LPN - Licensed Practical Nurse</SelectItem>
                    <SelectItem value="CNA">CNA - Certified Nursing Assistant</SelectItem>
                    <SelectItem value="RT">RT - Respiratory Therapist</SelectItem>
                    <SelectItem value="PT">PT - Physical Therapist</SelectItem>
                    <SelectItem value="OT">OT - Occupational Therapist</SelectItem>
                    <SelectItem value="CST">CST - Certified Surgical Tech</SelectItem>
                    <SelectItem value="PCT">PCT - Patient Care Technician</SelectItem>
                    <SelectItem value="MA">MA - Medical Assistant</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-sm font-medium">Shift Type</Label>
                <Select defaultValue={selectedTemplate?.shiftType || "Day Shift"}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select shift type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Day Shift">Day Shift</SelectItem>
                    <SelectItem value="Night Shift">Night Shift</SelectItem>
                    <SelectItem value="Evening Shift">Evening Shift</SelectItem>
                    <SelectItem value="Weekend Shift">Weekend Shift</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium">Start Time</Label>
                <Input 
                  type="time"
                  defaultValue={selectedTemplate?.startTime || "07:00"}
                />
              </div>
              <div>
                <Label className="text-sm font-medium">End Time</Label>
                <Input 
                  type="time"
                  defaultValue={selectedTemplate?.endTime || "19:00"}
                />
              </div>
            </div>
            
            <div>
              <Label className="text-sm font-medium">Staff Required</Label>
              <Input 
                type="number" 
                placeholder="1"
                defaultValue={selectedTemplate?.minStaff || selectedTemplate?.maxStaff || "1"}
                min="1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Number of staff positions needed for this shift
              </p>
            </div>
            
            <div>
              <Label className="text-sm font-medium">Staffing Priority Tiers</Label>
              <div className="space-y-3 mt-2">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-100 text-green-800 rounded-full flex items-center justify-center text-sm font-medium">1</div>
                    <div>
                      <div className="font-medium">Employees</div>
                      <div className="text-xs text-gray-500">Internal staff members - highest priority</div>
                    </div>
                  </div>
                  <input type="checkbox" defaultChecked className="rounded" />
                </div>
                
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-sm font-medium">2</div>
                    <div>
                      <div className="font-medium">Contractors (Float Pool)</div>
                      <div className="text-xs text-gray-500">Contract workers - medium priority</div>
                    </div>
                  </div>
                  <input type="checkbox" defaultChecked className="rounded" />
                </div>
                
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-orange-100 text-orange-800 rounded-full flex items-center justify-center text-sm font-medium">3</div>
                    <div>
                      <div className="font-medium">Outside Agencies</div>
                      <div className="text-xs text-gray-500">External staffing agencies - lowest priority</div>
                    </div>
                  </div>
                  <input type="checkbox" className="rounded" />
                </div>
              </div>
              <div className="text-xs text-gray-500 mt-2">
                Shifts will be offered to staff groups in priority order. Higher priority groups get first access to available shifts.
              </div>
            </div>
            
            <div>
              <Label className="text-sm font-medium">Days of Week</Label>
              <div className="flex gap-4 mt-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <label key={day} className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      defaultChecked={selectedTemplate?.daysOfWeek?.includes(day) || day !== 'Sun' && day !== 'Sat'}
                      className="rounded"
                    />
                    <span className="text-sm">{day}</span>
                  </label>
                ))}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Hourly Rate (Optional)</Label>
                <Input 
                  type="number" 
                  placeholder="0"
                  step="0.01"
                  defaultValue={selectedTemplate?.hourlyRate || "0"}
                />
              </div>
              <div className="flex items-center gap-2 mt-6">
                <input 
                  type="checkbox" 
                  id="activeTemplate"
                  defaultChecked={selectedTemplate?.active !== false}
                  className="rounded"
                />
                <Label htmlFor="activeTemplate" className="text-sm font-medium">Active Template</Label>
              </div>
            </div>
            
            <div>
              <Label className="text-sm font-medium">Notes (Optional)</Label>
              <textarea 
                className="w-full mt-1 p-2 border rounded-md"
                rows={3}
                placeholder="Additional template details..."
                defaultValue={selectedTemplate?.notes || ""}
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => {
              setShowTemplateModal(false);
              setSelectedTemplate(null);
            }}>
              Cancel
            </Button>
            <Button onClick={() => {
              toast({ 
                title: selectedTemplate ? "Template Updated" : "Template Created", 
                description: "Shift template has been saved successfully" 
              });
              setShowTemplateModal(false);
              setSelectedTemplate(null);
            }}>
              {selectedTemplate ? 'Update Template' : 'Create Template'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Use Template Modal */}
      <Dialog open={showUseTemplateModal} onOpenChange={setShowUseTemplateModal}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Schedule Shifts from Template</DialogTitle>
          </DialogHeader>
          <form data-use-template className="space-y-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <h4 className="font-medium text-sm mb-2">Template: {selectedTemplate?.name}</h4>
              <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                <div>Department: {selectedTemplate?.department}</div>
                <div>Specialty: {selectedTemplate?.specialty}</div>
                <div>Time: {selectedTemplate?.startTime} - {selectedTemplate?.endTime}</div>
              </div>
            </div>
            
            <div>
              <Label className="text-sm font-medium">Start Date</Label>
              <Input 
                name="startDate"
                type="date"
                defaultValue={new Date().toISOString().split('T')[0]}
              />
            </div>
            
            <div>
              <Label className="text-sm font-medium">End Date</Label>
              <Input 
                name="endDate"
                type="date"
                defaultValue={new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
              />
            </div>
            
            <div>
              <Label className="text-sm font-medium">Days in Advance to Post</Label>
              <select name="daysInAdvance" className="w-full mt-1 p-2 border rounded-md" defaultValue="7">
                <option value="1">1 day</option>
                <option value="3">3 days</option>
                <option value="7">7 days</option>
                <option value="14">14 days</option>
                <option value="21">21 days</option>
                <option value="30">30 days</option>
              </select>
            </div>
            
            <div className="text-xs text-gray-500">
              Shifts will be created based on the template's selected days of the week within the date range.
            </div>
          </form>
          
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => {
              setShowUseTemplateModal(false);
              setSelectedTemplate(null);
            }}>
              Cancel
            </Button>
            <Button onClick={async () => {
              try {
                const form = document.querySelector('form[data-use-template]') as HTMLFormElement;
                const formData = new FormData(form);
                
                const response = await fetch('/api/shifts/from-template', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  credentials: 'include',
                  body: JSON.stringify({
                    templateId: selectedTemplate.id,
                    startDate: formData.get('startDate') || new Date().toISOString().split('T')[0],
                    endDate: formData.get('endDate') || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    daysInAdvance: parseInt(formData.get('daysInAdvance') as string) || 7
                  })
                });
                
                if (response.ok) {
                  const result = await response.json();
                  toast({ 
                    title: "Shifts Created", 
                    description: `${result.generatedShifts} shifts have been scheduled from the template` 
                  });
                  setShowUseTemplateModal(false);
                  setSelectedTemplate(null);
                  // Refresh shifts data without page reload
                  queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });
                } else {
                  throw new Error('Failed to create shifts');
                }
              } catch (error) {
                toast({ 
                  title: "Error", 
                  description: "Failed to create shifts from template" 
                });
              }
            }}>
              Create Shifts
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Shift Modal */}
      {showPostShiftModal && (
        <Dialog open={showPostShiftModal} onOpenChange={setShowPostShiftModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Shift</DialogTitle>
            </DialogHeader>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const facilityId = parseInt(formData.get('facilityId') as string);
              const facility = (facilities as any[])?.find(f => f.id === facilityId);
              
              // Calculate total hours from start and end time
              const startTime = formData.get('startTime') as string;
              const endTime = formData.get('endTime') as string;
              const totalHours = calculateHoursBetween(startTime, endTime);
              
              // Get multiplier and base rate (placeholder - will be calculated from staff profile when workers request)
              const multiplier = parseFloat(formData.get('rateMultiplier') as string) || 1.0;
              const baseRate = 45.00; // Base rate placeholder - actual rate comes from staff profile during assignment
              
              const shiftData = {
                title: formData.get('title'),
                date: formData.get('date'),
                startTime: startTime,
                endTime: endTime,
                department: formData.get('department'),
                specialty: formData.get('specialty'),
                facilityId: facilityId,
                facilityName: facility?.name || 'Unknown Facility',
                hourlyRate: baseRate * multiplier,
                rate: baseRate * multiplier,
                rateMultiplier: multiplier,
                urgency: formData.get('urgency'),
                description: formData.get('description'),
                requiredWorkers: parseInt(formData.get('requiredWorkers') as string) || 1,
                minStaff: parseInt(formData.get('minStaff') as string) || 1,
                maxStaff: parseInt(formData.get('maxStaff') as string) || 1,
                totalHours: totalHours,
                buildingId: 'main-building',
                buildingName: 'Main Building'
              };
              postShiftMutation.mutate(shiftData);
            }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">Shift Title</Label>
                  <Input name="title" placeholder="e.g., ICU Day Shift" required />
                </div>
                <div>
                  <Label htmlFor="date">Date</Label>
                  <Input name="date" type="date" required />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startTime">Start Time</Label>
                  <Input 
                    name="startTime" 
                    type="time" 
                    required 
                    onChange={(e) => {
                      const startTime = e.target.value;
                      const endTimeInput = document.querySelector('input[name="endTime"]') as HTMLInputElement;
                      const totalHoursInput = document.querySelector('input[name="totalHours"]') as HTMLInputElement;
                      if (endTimeInput?.value && totalHoursInput) {
                        const hours = calculateHoursBetween(startTime, endTimeInput.value);
                        totalHoursInput.value = hours.toString();
                      }
                    }}
                  />
                </div>
                <div>
                  <Label htmlFor="endTime">End Time</Label>
                  <Input 
                    name="endTime" 
                    type="time" 
                    required 
                    onChange={(e) => {
                      const endTime = e.target.value;
                      const startTimeInput = document.querySelector('input[name="startTime"]') as HTMLInputElement;
                      const totalHoursInput = document.querySelector('input[name="totalHours"]') as HTMLInputElement;
                      if (startTimeInput?.value && totalHoursInput) {
                        const hours = calculateHoursBetween(startTimeInput.value, endTime);
                        totalHoursInput.value = hours.toString();
                      }
                    }}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="department">Department</Label>
                  <Select name="department" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ICU">ICU</SelectItem>
                      <SelectItem value="Emergency">Emergency</SelectItem>
                      <SelectItem value="Operating Room">Operating Room</SelectItem>
                      <SelectItem value="Medical/Surgical">Medical/Surgical</SelectItem>
                      <SelectItem value="Pediatrics">Pediatrics</SelectItem>
                      <SelectItem value="Oncology">Oncology</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="specialty">Specialty</Label>
                  <Select name="specialty" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select specialty" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="RN">RN</SelectItem>
                      <SelectItem value="LPN">LPN</SelectItem>
                      <SelectItem value="CNA">CNA</SelectItem>
                      <SelectItem value="CST">CST</SelectItem>
                      <SelectItem value="RT">RT</SelectItem>
                      <SelectItem value="PT">PT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="facilityId">Facility</Label>
                  <Select name="facilityId" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select facility" />
                    </SelectTrigger>
                    <SelectContent>
                      {(facilities as any[])?.map((facility) => (
                        <SelectItem key={facility.id} value={facility.id.toString()}>
                          {facility.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="rateMultiplier">Rate Multiplier</Label>
                  <div className="px-2">
                    <input 
                      name="rateMultiplier"
                      type="range" 
                      min="1.0" 
                      max="1.6" 
                      step="0.1" 
                      defaultValue="1.0"
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                      onChange={(e) => {
                        const multiplierValue = document.querySelector('.multiplier-display');
                        if (multiplierValue) {
                          multiplierValue.textContent = `${e.target.value}x`;
                        }
                      }}
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>1.0x</span>
                      <span className="multiplier-display">1.0x</span>
                      <span>1.6x</span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">Applied to worker's base rate upon request</p>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="requiredWorkers">Required Workers</Label>
                  <Input name="requiredWorkers" type="number" min="1" defaultValue="1" />
                </div>
                <div>
                  <Label htmlFor="urgency">Urgency</Label>
                  <Select name="urgency" defaultValue="medium">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="totalHours">Total Hours</Label>
                  <Input name="totalHours" type="number" min="1" defaultValue="8" readOnly className="bg-gray-100" />
                  <p className="text-xs text-gray-600 mt-1">Auto-calculated from start/end time</p>
                </div>
              </div>
              
              <div>
                <Label htmlFor="description">Description</Label>
                <Input name="description" placeholder="Shift details and requirements" />
              </div>
              
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowPostShiftModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={postShiftMutation.isPending}
                >
                  {postShiftMutation.isPending ? "Adding..." : "Add Shift"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}