import { useState, useRef, useMemo } from "react";
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
import ShiftCalendar from "@/components/ShiftCalendar";
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
  "OT": "#06b6d4", // cyan - Occupational Therapist
  "CST": "#84cc16", // lime - Certified Surgical Tech
  "PCT": "#ec4899", // pink - Patient Care Technician
  "MA": "#64748b", // slate - Medical Assistant
  "Registered Nurse": "#ef4444",
  "Licensed Practical Nurse": "#10b981",
  "Certified Nursing Assistant": "#3b82f6",
  "Respiratory Therapist": "#8b5cf6",
  "Physical Therapist": "#f59e0b",
  "Occupational Therapist": "#06b6d4",
  "Certified Surgical Tech": "#84cc16",
  "Patient Care Technician": "#ec4899",
  "Medical Assistant": "#64748b",
  "default": "#6b7280"
};

// Status colors and icons
const statusConfig = {
  open: { color: '#10b981', bgColor: '#dcfce7', icon: 'circle' },
  requested: { color: '#f59e0b', bgColor: '#fef3c7', icon: 'clock' },
  confirmed: { color: '#3b82f6', bgColor: '#dbeafe', icon: 'check-circle' },
  filled: { color: '#059669', bgColor: '#d1fae5', icon: 'user-check' },
  cancelled: { color: '#ef4444', bgColor: '#fee2e2', icon: 'x-circle' },
  expired: { color: '#6b7280', bgColor: '#f3f4f6', icon: 'alert-triangle' },
  in_progress: { color: '#8b5cf6', bgColor: '#ede9fe', icon: 'play-circle' },
  completed: { color: '#059669', bgColor: '#d1fae5', icon: 'check-circle-2' },
  pending_review: { color: '#f59e0b', bgColor: '#fef3c7', icon: 'alert-circle' }
};

// Status icon SVG paths for calendar events
const getStatusIconSvg = (status: string) => {
  const svgPaths = {
    open: '<circle cx="12" cy="12" r="10"/>',
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
  
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedShift, setSelectedShift] = useState<EnhancedShift | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddShiftDialog, setShowAddShiftDialog] = useState(false);
  const [showPostShiftModal, setShowPostShiftModal] = useState(false);
  
  // Advanced filters state
  const [filters, setFilters] = useState<CalendarFilter>({
    facilities: [],
    teams: [],
    workers: [],
    specialties: [],
    statuses: [],
    dateRange: {
      start: format(new Date(), 'yyyy-MM-dd'),
      end: format(addDays(new Date(), 30), 'yyyy-MM-dd')
    }
  });

  // Fetch data with enhanced refresh for regenerated shifts
  const { data: shifts = [], isLoading: shiftsLoading, refetch: refetchShifts } = useQuery({
    queryKey: ['/api/shifts'],
    staleTime: 10000, // 10 seconds for faster updates
    refetchInterval: 15000, // Auto-refresh every 15 seconds for real-time updates
    refetchOnWindowFocus: true, // Refetch when window gains focus
    refetchOnReconnect: true // Refetch on network reconnect
  });

  const { data: facilities = [] } = useQuery({
    queryKey: ['/api/facilities']
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['/api/staff']
  });

  // Create mutation for posting shifts
  const postShiftMutation = useMutation({
    mutationFn: async (shiftData: any) => {
      return await fetch('/api/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(shiftData)
      }).then(res => res.json());
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Shift created successfully"
      });
      setShowPostShiftModal(false);
      queryClient.invalidateQueries({ queryKey: ['/api/shifts'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create shift",
        variant: "destructive"
      });
    }
  });

  // Filter shifts based on current filters
  const filteredShifts = useMemo(() => {
    if (!shifts || !Array.isArray(shifts)) return [];
    
    return (shifts as EnhancedShift[]).filter((shift: EnhancedShift) => {
      // Search term filter
      if (searchTerm && !shift.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !shift.facilityName.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !shift.department.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      
      // Facility filter
      if (filters.facilities.length > 0 && !filters.facilities.includes(shift.facilityId.toString())) {
        return false;
      }
      
      // Specialty filter
      if (filters.specialties.length > 0 && !filters.specialties.includes(shift.specialty)) {
        return false;
      }
      
      // Status filter
      if (filters.statuses.length > 0 && !filters.statuses.includes(shift.status)) {
        return false;
      }
      
      // Worker filter
      if (filters.workers.length > 0 && shift.assignedStaffId && 
          !filters.workers.includes(shift.assignedStaffId.toString())) {
        return false;
      }
      
      return true;
    });
  }, [shifts, searchTerm, filters]);

  // Get unique values for filter dropdowns
  const specialties = Array.isArray(shifts) ? Array.from(new Set((shifts as EnhancedShift[]).map(shift => shift.specialty))) : [];
  const statuses = Array.isArray(shifts) ? Array.from(new Set((shifts as EnhancedShift[]).map(shift => shift.status))) : [];

  // Transform shifts into calendar events
  const calendarEvents = filteredShifts.map((shift: EnhancedShift) => {
    const specialtyColor = specialtyColors[shift.specialty as keyof typeof specialtyColors] || specialtyColors.default;
    const statusInfo = statusConfig[shift.status as keyof typeof statusConfig] || statusConfig.open;
    
    // Format display text based on staffing status
    let displayText = shift.title;
    if (shift.filledPositions !== undefined && shift.totalPositions !== undefined) {
      displayText = `${shift.title} (${shift.filledPositions}/${shift.totalPositions})`;
    }
    
    return {
      id: shift.id.toString(),
      title: displayText,
      start: `${shift.date}T${shift.startTime}`,
      end: `${shift.date}T${shift.endTime}`,
      backgroundColor: specialtyColor,
      borderColor: statusInfo.color,
      textColor: 'white',
      extendedProps: {
        shift: shift,
        specialty: shift.specialty,
        status: shift.status,
        facility: shift.facilityName,
        department: shift.department
      }
    };
  });

  // Filter helper functions
  const handleFilterChange = (type: keyof CalendarFilter, value: string[]) => {
    setFilters(prev => ({ ...prev, [type]: value }));
  };

  const clearFilters = () => {
    setFilters({
      facilities: [],
      teams: [],
      workers: [],
      specialties: [],
      statuses: [],
      dateRange: {
        start: format(new Date(), 'yyyy-MM-dd'),
        end: format(addDays(new Date(), 30), 'yyyy-MM-dd')
      }
    });
    setSearchTerm("");
  };

  const activeFilterCount = filters.facilities.length + filters.teams.length + 
    filters.workers.length + filters.specialties.length + filters.statuses.length;

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
          {/* Template functionality moved to navbar */}
        </div>
      </div>

      {/* Calendar View */}
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
                  {filters.statuses.map((status) => (
                    <Badge key={status} variant="secondary">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Schedule Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Shifts</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredShifts.length}</div>
            <p className="text-xs text-muted-foreground">
              {Array.isArray(shifts) && (shifts as any[]).length > filteredShifts.length ? 
                `${filteredShifts.length} of ${(shifts as any[]).length} shown` : 
                'All shifts displayed'
              }
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Positions</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredShifts.filter(shift => shift.status === 'open').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Awaiting assignment
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Filled Shifts</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredShifts.filter(shift => shift.status === 'filled' || shift.status === 'confirmed').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Staff assigned
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Urgent Coverage</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredShifts.filter(shift => shift.urgency === 'critical' || shift.urgency === 'high').length}
            </div>
            <p className="text-xs text-muted-foreground">
              High priority shifts
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Calendar Component */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Calendar View
            </div>
            <div className="text-sm text-muted-foreground">
              {filteredShifts.length} shifts displayed
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ShiftCalendar />
        </CardContent>
      </Card>

      {/* Shift Detail Modal */}
      <Dialog open={!!selectedShift} onOpenChange={() => setSelectedShift(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {selectedShift?.title}
            </DialogTitle>
          </DialogHeader>
          {selectedShift && (
            <div className="space-y-4">
              {/* Basic Information */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Date & Time</Label>
                  <p className="text-sm">{selectedShift.date} from {selectedShift.startTime} to {selectedShift.endTime}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Department</Label>
                  <p className="text-sm">{selectedShift.department}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Facility</Label>
                  <p className="text-sm">{selectedShift.facilityName}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Specialty Required</Label>
                  <Badge style={{ 
                    backgroundColor: specialtyColors[selectedShift.specialty as keyof typeof specialtyColors] || specialtyColors.default,
                    color: 'white' 
                  }}>
                    {selectedShift.specialty}
                  </Badge>
                </div>
              </div>

              {/* Status and Staffing */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <Badge style={{ 
                    backgroundColor: statusConfig[selectedShift.status as keyof typeof statusConfig]?.bgColor,
                    color: statusConfig[selectedShift.status as keyof typeof statusConfig]?.color
                  }}>
                    {selectedShift.status}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium">Staffing</Label>
                  <p className="text-sm">
                    {selectedShift.filledPositions || 0} of {selectedShift.totalPositions || 1} positions filled
                  </p>
                </div>
              </div>

              {/* Description */}
              {selectedShift.description && (
                <div>
                  <Label className="text-sm font-medium">Description</Label>
                  <p className="text-sm text-muted-foreground">{selectedShift.description}</p>
                </div>
              )}

              {/* Assignment Information */}
              {selectedShift.assignedStaffId && (
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                  <Label className="text-sm font-medium text-green-900 dark:text-green-100">Assigned Staff</Label>
                  <div className="mt-2 space-y-1">
                    <p className="text-sm font-medium">{selectedShift.assignedStaffName}</p>
                    <p className="text-sm text-green-700 dark:text-green-300">{selectedShift.assignedStaffEmail}</p>
                    <p className="text-sm text-green-700 dark:text-green-300">{selectedShift.assignedStaffPhone}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Post Shift Modal */}
      {showPostShiftModal && (
        <Dialog open={showPostShiftModal} onOpenChange={setShowPostShiftModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Shift</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target as HTMLFormElement);
              const data = Object.fromEntries(formData.entries());
              
              // Calculate total hours
              const totalHours = calculateHoursBetween(data.startTime as string, data.endTime as string);
              
              postShiftMutation.mutate({
                ...data,
                facilityId: parseInt(data.facilityId as string),
                requiredWorkers: parseInt(data.requiredWorkers as string),
                totalHours: totalHours
              });
            }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">Shift Title</Label>
                  <Input name="title" placeholder="ICU Day Shift" required />
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
                      const endTimeInput = document.querySelector('input[name="endTime"]') as HTMLInputElement;
                      if (endTimeInput.value) {
                        const hours = calculateHoursBetween(e.target.value, endTimeInput.value);
                        const totalHoursInput = document.querySelector('input[name="totalHours"]') as HTMLInputElement;
                        if (totalHoursInput) totalHoursInput.value = hours.toString();
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
                      const startTimeInput = document.querySelector('input[name="startTime"]') as HTMLInputElement;
                      if (startTimeInput.value) {
                        const hours = calculateHoursBetween(startTimeInput.value, e.target.value);
                        const totalHoursInput = document.querySelector('input[name="totalHours"]') as HTMLInputElement;
                        if (totalHoursInput) totalHoursInput.value = hours.toString();
                      }
                    }}
                  />
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
                      {(facilities as any[]).map((facility: any) => (
                        <SelectItem key={facility.id} value={facility.id.toString()}>
                          {facility.name}
                        </SelectItem>
                      ))}
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
                      <SelectItem value="Registered Nurse">RN - Registered Nurse</SelectItem>
                      <SelectItem value="Licensed Practical Nurse">LPN - Licensed Practical Nurse</SelectItem>
                      <SelectItem value="Certified Nursing Assistant">CNA - Certified Nursing Assistant</SelectItem>
                      <SelectItem value="Respiratory Therapist">RT - Respiratory Therapist</SelectItem>
                      <SelectItem value="Physical Therapist">PT - Physical Therapist</SelectItem>
                      <SelectItem value="Occupational Therapist">OT - Occupational Therapist</SelectItem>
                      <SelectItem value="Certified Surgical Tech">CST - Certified Surgical Tech</SelectItem>
                      <SelectItem value="Patient Care Technician">PCT - Patient Care Technician</SelectItem>
                      <SelectItem value="Medical Assistant">MA - Medical Assistant</SelectItem>
                    </SelectContent>
                  </Select>
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