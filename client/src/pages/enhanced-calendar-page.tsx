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
  X
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
  status: "open" | "requested" | "confirmed" | "cancelled" | "filled";
  rate: number;
  urgency: "low" | "medium" | "high" | "critical";
  description: string;
  assignedStaffId?: number;
  assignedStaffName?: string;
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

export default function EnhancedCalendarPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"dayGridMonth" | "timeGridWeek" | "timeGridDay">("dayGridMonth");
  const [selectedShift, setSelectedShift] = useState<EnhancedShift | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
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

  // Convert to calendar events
  const calendarEvents = filteredShifts.map(shift => ({
    id: shift.id.toString(),
    title: `${shift.department} - ${shift.specialty}`,
    start: `${shift.date}T${shift.startTime}`,
    end: `${shift.date}T${shift.endTime}`,
    backgroundColor: getStatusColor(shift.status),
    borderColor: getStatusColor(shift.status),
    textColor: '#fff',
    extendedProps: {
      shift,
      facility: shift.facilityName,
      rate: shift.rate,
      urgency: shift.urgency
    }
  }));

  function getStatusColor(status: string) {
    switch (status) {
      case "open": return "#ef4444";
      case "requested": return "#f59e0b";
      case "confirmed": return "#10b981";
      case "filled": return "#3b82f6";
      case "cancelled": return "#6b7280";
      default: return "#6b7280";
    }
  }

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
              onClick={() => setViewMode("dayGridMonth")}
              size="sm"
            >
              Month
            </Button>
            <Button
              variant={viewMode === "timeGridWeek" ? "default" : "outline"}
              onClick={() => setViewMode("timeGridWeek")}
              size="sm"
            >
              Week
            </Button>
            <Button
              variant={viewMode === "timeGridDay" ? "default" : "outline"}
              onClick={() => setViewMode("timeGridDay")}
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
                  const facility = facilities.find((f: any) => f.id.toString() === facilityId);
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
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Shift Calendar
            {isLoading && <Badge variant="secondary">Loading...</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded"></div>
              <span>Open</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-500 rounded"></div>
              <span>Requested</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span>Confirmed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <span>Filled</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gray-500 rounded"></div>
              <span>Cancelled</span>
            </div>
          </div>

          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView={viewMode}
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: ''
            }}
            events={calendarEvents}
            eventClick={handleEventClick}
            height="auto"
            dayMaxEvents={3}
            moreLinkClick="popover"
            eventDisplay="block"
            displayEventTime={true}
            eventTimeFormat={{
              hour: 'numeric',
              minute: '2-digit',
              meridiem: 'short'
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
                  <Label>Rate</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span>${selectedShift.rate}/hour</span>
                  </div>
                </div>
              </div>

              <div>
                <Label>Status</Label>
                <div className="mt-1">
                  <Badge style={{ backgroundColor: getStatusColor(selectedShift.status) }}>
                    {selectedShift.status.charAt(0).toUpperCase() + selectedShift.status.slice(1)}
                  </Badge>
                </div>
              </div>

              {selectedShift.assignedStaffName && (
                <div>
                  <Label>Assigned Staff</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedShift.assignedStaffName}</span>
                  </div>
                </div>
              )}

              <div>
                <Label>Description</Label>
                <p className="mt-1 text-sm text-muted-foreground">{selectedShift.description}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}