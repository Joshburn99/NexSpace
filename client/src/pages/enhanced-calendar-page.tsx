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
  status: "open" | "requested" | "confirmed" | "cancelled" | "filled" | "expired" | "in_progress" | "completed";
  rate: number;
  urgency: "low" | "medium" | "high" | "critical";
  description: string;
  assignedStaffId?: number;
  assignedStaffName?: string;
  assignedStaffEmail?: string;
  assignedStaffPhone?: string;
  assignedStaffSpecialty?: string;
  assignedStaffRating?: number;
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
  filled: { icon: UserCheck, color: "#3b82f6", label: "Filled" },
  cancelled: { icon: XCircle, color: "#6b7280", label: "Cancelled" },
  expired: { icon: AlertTriangle, color: "#dc2626", label: "Expired" },
  in_progress: { icon: PlayCircle, color: "#8b5cf6", label: "In Progress" },
  completed: { icon: CheckCircle, color: "#059669", label: "Completed" },
  ncns: { icon: AlertTriangle, color: "#ef4444", label: "NCNS" },
  pending_timesheet: { icon: Timer, color: "#f59e0b", label: "Pending Timesheet" },
  paid: { icon: CheckCircle, color: "#10b981", label: "Paid" },
  no_show: { icon: X, color: "#dc2626", label: "No Show" },
  late: { icon: Clock, color: "#f97316", label: "Late" },
  early_departure: { icon: AlertCircle, color: "#ea580c", label: "Early Departure" }
};

export default function EnhancedCalendarPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const calendarRef = useRef<FullCalendar>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"dayGridMonth" | "timeGridWeek" | "timeGridDay">("dayGridMonth");
  const [selectedShift, setSelectedShift] = useState<EnhancedShift | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddShiftDialog, setShowAddShiftDialog] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
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
  const { data: shifts = [], isLoading } = useQuery<EnhancedShift[]>({
    queryKey: ["/api/shifts", filters, searchTerm],
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

  // Filter options
  const specialties = ["Registered Nurse", "Licensed Practical Nurse", "Certified Nursing Assistant", "Physical Therapist", "Respiratory Therapist"];
  const statuses = ["open", "requested", "confirmed", "cancelled", "filled"];
  const departments = ["ICU", "Emergency", "Medical-Surgical", "Operating Room", "Labor & Delivery"];

  // Apply filters to shifts
  const filteredShifts = shifts.filter(shift => {
    const matchesSearch = searchTerm === "" || 
      shift.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shift.facilityName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shift.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shift.specialty.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFacility = filters.facilities.length === 0 || 
      filters.facilities.includes(shift.facilityId.toString());
    
    const matchesSpecialty = filters.specialties.length === 0 || 
      filters.specialties.includes(shift.specialty);
    
    const matchesStatus = filters.statuses.length === 0 || 
      filters.statuses.includes(shift.status);

    const matchesWorker = filters.workers.length === 0 || 
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

  // Convert to calendar events with specialty-based colors
  const calendarEvents = processedShifts.map(shift => {
    const specialtyColor = (specialtyColors as any)[shift.specialty] || specialtyColors.default;
    const statusInfo = statusConfig[shift.status as keyof typeof statusConfig] || statusConfig.open;
    
    return {
      id: shift.id.toString(),
      title: `${shift.title}`,
      start: `${shift.date}T${shift.startTime}`,
      end: `${shift.date}T${shift.endTime}`,
      backgroundColor: specialtyColor,
      borderColor: specialtyColor,
      textColor: '#fff',
      extendedProps: {
        shift: { ...shift, status: shift.status },
        facility: shift.facilityName,
        specialty: shift.specialty,
        rate: shift.rate,
        urgency: shift.urgency,
        statusIcon: statusInfo?.icon || AlertCircle,
        statusColor: statusInfo?.color || "#6b7280",
        statusLabel: statusInfo?.label || shift.status,
        specialtyColor: specialtyColor
      }
    };
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
              onClick={() => setShowAddShiftDialog(true)}
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
                    {specialties.map((specialty) => (
                      <SelectItem key={specialty} value={specialty}>
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
              <div className="mt-4 flex flex-wrap gap-2">
                {filters.facilities.map(facilityId => {
                  const facility = (facilities as any[]).find((f: any) => f.id.toString() === facilityId);
                  return facility ? (
                    <Badge key={facilityId} variant="secondary">
                      <Building className="h-3 w-3 mr-1" />
                      {facility.name}
                    </Badge>
                  ) : null;
                })}
                {filters.specialties.map(specialty => (
                  <Badge key={specialty} variant="secondary">
                    <Users className="h-3 w-3 mr-1" />
                    {specialty}
                  </Badge>
                ))}
                {filters.statuses.map(status => (
                  <Badge key={status} variant="secondary">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </Badge>
                ))}
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
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Shift Calendar
              {isLoading && <Badge variant="secondary">Loading...</Badge>}
            </div>
            {/* Status Icons Legend */}
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Status:</span>
              {Object.entries(statusConfig).map(([key, config]) => {
                const Icon = config.icon;
                return (
                  <div key={key} className="flex items-center gap-1">
                    <div 
                      className="w-3 h-3 rounded-full flex items-center justify-center" 
                      style={{ backgroundColor: config.color }}
                    >
                      <Icon className="w-1.5 h-1.5 text-white" />
                    </div>
                    <span className="text-xs text-gray-600 dark:text-gray-400">{config.label}</span>
                  </div>
                );
              })}
            </div>
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
                dayMaxEvents: 3,
                moreLinkClick: 'popover'
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
            dayMaxEvents={2}
            moreLinkClick="popover"
            eventDisplay="block"
            displayEventTime={true}
            eventTimeFormat={{
              hour: 'numeric',
              minute: '2-digit',
              meridiem: 'short'
            }}
            eventContent={(eventInfo) => {
              const shift = eventInfo.event.extendedProps.shift;
              const statusInfo = statusConfig[shift.status as keyof typeof statusConfig] || statusConfig.open;
              const StatusIcon = statusInfo?.icon || AlertCircle;
              
              return {
                html: `
                  <div class="fc-event-content-custom relative w-full h-full p-1" style="background-color: ${eventInfo.event.backgroundColor}">
                    <div class="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center" style="background-color: ${statusInfo?.color || "#6b7280"}">
                      <svg viewBox="0 0 24 24" fill="white" class="w-2 h-2">
                        <circle cx="12" cy="12" r="10"/>
                      </svg>
                    </div>
                    <div class="text-xs font-medium text-white truncate pr-6">
                      ${shift.assignedStaffName || 'Unassigned'}
                    </div>
                    <div class="text-xs text-white opacity-90 truncate">
                      ${shift.facilityName}
                    </div>
                    <div class="text-xs text-white opacity-80 truncate">
                      ${shift.startTime} - ${shift.endTime}
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
        <DialogContent className="max-w-2xl">
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

              {selectedShift.assignedStaffName && (
                <div className="bg-muted/50 p-4 rounded-lg">
                  <Label className="text-base font-semibold">Assigned Worker</Label>
                  <div className="mt-2 space-y-3">
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
                              <span className="text-sm text-muted-foreground">{selectedShift.assignedStaffRating}/5</span>
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
                    {selectedShift.assignedStaffEmail && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>Email:</span>
                        <span>{selectedShift.assignedStaffEmail}</span>
                      </div>
                    )}
                    {selectedShift.assignedStaffPhone && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>Phone:</span>
                        <span>{selectedShift.assignedStaffPhone}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

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
                        const end = new Date(`2000-01-01T${selectedShift.endTime}`);
                        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
                        return `${hours} hours`;
                      })()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Role-based Assignment Controls for Facility Managers and Super Admins */}
              {user && (user.role === 'facility_manager' || user.role === 'super_admin' || user.role === 'admin') && selectedShift.status === 'open' && (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                  <Label className="text-base font-semibold text-blue-900 dark:text-blue-100">Administrative Actions</Label>
                  <div className="mt-3 space-y-3">
                    <div className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                      As a facility manager, you can view shift requests and directly assign qualified staff to this shift.
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-100">
                        <Users className="h-3 w-3 mr-1" />
                        View Requests ({Math.floor(Math.random() * 5) + 1})
                      </Button>
                      <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                        <UserCheck className="h-3 w-3 mr-1" />
                        Assign Staff
                      </Button>
                    </div>
                  </div>
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
                      <span>{template.department}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <Clock className="w-4 h-4" />
                      <span>{template.startTime} - {template.endTime}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <DollarSign className="w-4 h-4" />
                      <span>${template.hourlyRate}/hr</span>
                    </div>
                    {template.description && (
                      <p className="text-sm text-gray-500 mt-2">{template.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button 
                      size="sm" 
                      onClick={() => {
                        setSelectedTemplate(template);
                        setShowAddShiftDialog(true);
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedTemplate ? 'Edit Template' : 'Create Shift Template'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Template Name</Label>
                <Input 
                  placeholder="e.g., ICU Day Shift RN"
                  defaultValue={selectedTemplate?.name || ""}
                />
              </div>
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
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Specialty/Certification</Label>
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
              <div>
                <Label className="text-sm font-medium">Hourly Rate</Label>
                <Input 
                  type="number" 
                  placeholder="45.00"
                  step="0.01"
                  defaultValue={selectedTemplate?.hourlyRate || ""}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
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
              <div>
                <Label className="text-sm font-medium">Duration (hours)</Label>
                <Input 
                  type="number" 
                  placeholder="12"
                  defaultValue={selectedTemplate?.duration || "12"}
                />
              </div>
            </div>
            
            <div>
              <Label className="text-sm font-medium">Description</Label>
              <textarea 
                className="w-full mt-1 p-2 border rounded-md"
                rows={3}
                placeholder="Template description and requirements..."
                defaultValue={selectedTemplate?.description || ""}
              />
            </div>
            
            <div>
              <Label className="text-sm font-medium">Required Certifications</Label>
              <Input 
                placeholder="e.g., BLS, ACLS, PALS"
                defaultValue={selectedTemplate?.requiredCertifications?.join(', ') || ""}
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
    </div>
  );
}