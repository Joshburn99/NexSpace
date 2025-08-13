import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useFacilities } from "@/hooks/use-facility";
import { useRBAC, PermissionGate } from "@/hooks/use-rbac";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
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
  Plus,
  Save,
  Loader2,
} from "lucide-react";
import { format, addDays, subDays, startOfWeek, endOfWeek } from "date-fns";
import { CalendarSkeleton, ShiftListSkeleton } from "@/components/LoadingSkeletons";
import { CalendarEmptyState, ErrorState } from "@/components/EmptyStates";
import { QuickFilters, type FilterState } from "@/components/QuickFilters";
import { formatDate as formatDateUtil, formatTime, formatDateTime, formatRelativeTime, getTimezoneInfo } from "@/lib/date-utils";

// Types
interface Shift {
  id: number;
  title: string;
  start: string;
  end: string;
  facilityId: number;
  facilityName: string;
  department: string;
  requiredWorkers: number;
  assignedWorkerIds: number[];
  rate: number;
  isUrgent: boolean;
  notes?: string;
  requirements?: string[];
  color?: string;
}

interface Staff {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  facilityId: number;
  specialties: string[];
  isActive: boolean;
}

interface Facility {
  id: number;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  timezone?: string;
}

const getShiftColor = (shift: Shift) => {
  if (shift.isUrgent) return "#ef4444"; // red
  if (shift.assignedWorkerIds.length >= shift.requiredWorkers) return "#22c55e"; // green
  if (shift.assignedWorkerIds.length > 0) return "#f59e0b"; // yellow
  return "#6b7280"; // gray
};

export default function EnhancedCalendarPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const rbac = useRBAC();
  const canCreateShifts = user?.role === 'super_admin' || user?.role === 'facility_admin';
  const { data: facilities = [] } = useFacilities();

  // State
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedFacilities, setSelectedFacilities] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddShiftOpen, setIsAddShiftOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [isShiftDetailsOpen, setIsShiftDetailsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"dayGridMonth" | "timeGridWeek" | "timeGridDay">("timeGridWeek");

  // Form state for new shift
  const [newShift, setNewShift] = useState({
    title: "",
    facilityId: "",
    department: "",
    start: "",
    end: "",
    requiredWorkers: 1,
    rate: 50,
    isUrgent: false,
    notes: "",
    requirements: [] as string[],
  });

  // Get calendar date range
  const [calendarStart, calendarEnd] = useMemo(() => {
    const now = new Date();
    const start = startOfWeek(subDays(now, 7));
    const end = endOfWeek(addDays(now, 30));
    return [
      start.toISOString(),
      end.toISOString()
    ];
  }, []);

  // Fetch shifts from calendar API
  const {
    data: calendarEvents = [],
    isLoading: shiftsLoading,
    error: shiftsError,
    refetch: refetchShifts,
  } = useQuery({
    queryKey: ["/api/calendar/shifts", { 
      start: calendarStart, 
      end: calendarEnd,
      facilities: selectedFacilities, 
      search: searchQuery 
    }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("start", calendarStart);
      params.append("end", calendarEnd);
      if (selectedFacilities.length > 0) {
        selectedFacilities.forEach(f => params.append("facilityId", f.toString()));
      }
      if (searchQuery) {
        params.append("search", searchQuery);
      }
      
      const response = await fetch(`/api/calendar/shifts?${params.toString()}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch calendar events");
      }
      return response.json();
    },
  });

  // Fetch staff
  const { data: staff = [] } = useQuery({
    queryKey: ["/api/staff"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/staff");
      if (!response.ok) {
        throw new Error("Failed to fetch staff");
      }
      return response.json();
    },
  });

  // Create shift mutation
  const createShiftMutation = useMutation({
    mutationFn: async (shiftData: any) => {
      const response = await apiRequest("POST", "/api/shifts", shiftData);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create shift");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Shift created successfully",
      });
      setIsAddShiftOpen(false);
      setNewShift({
        title: "",
        facilityId: "",
        department: "",
        start: "",
        end: "",
        requiredWorkers: 1,
        rate: 50,
        isUrgent: false,
        notes: "",
        requirements: [],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Transform calendar events for FullCalendar
  const fullCalendarEvents = useMemo(() => {
    return calendarEvents.map((event: any) => ({
      id: event.id.toString(),
      title: `${event.role} (${event.assignedWorkerIds?.length || 0}/${event.requiredWorkers || 1})`,
      start: event.startUtc,
      end: event.endUtc,
      backgroundColor: event.color || '#3B82F6',
      borderColor: event.color || '#3B82F6',
      extendedProps: {
        shift: event,
      },
    }));
  }, [calendarEvents]);

  // Handle event click
  const handleEventClick = (clickInfo: any) => {
    const shift = clickInfo.event.extendedProps.shift;
    setSelectedShift(shift);
    setIsShiftDetailsOpen(true);
  };

  // Handle create shift
  const handleCreateShift = () => {
    if (!newShift.title || !newShift.facilityId || !newShift.start || !newShift.end) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    createShiftMutation.mutate(newShift);
  };

  // Handle facility filter
  const handleFacilityFilter = (facilityId: string) => {
    const id = parseInt(facilityId);
    setSelectedFacilities(prev => 
      prev.includes(id) 
        ? prev.filter(f => f !== id)
        : [...prev, id]
    );
  };

  if (shiftsError) {
    return (
      <ErrorState 
        title="Failed to load calendar data"
        description="Please try refreshing the page or check your connection."
        onRetry={() => refetchShifts()}
      />
    );
  }

  // Show loading skeleton
  if (shiftsLoading) {
    return <CalendarSkeleton />;
  }

  return (
    <div className="w-full space-y-4 md:space-y-6 p-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Enhanced Calendar</h1>
          <p className="text-muted-foreground">Drag-and-drop shift scheduling dashboard</p>
        </div>
        
        <div className="flex items-center gap-2">
          {canCreateShifts && (
            <Button onClick={() => setIsAddShiftOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Shift
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search shifts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* View Mode */}
            <Select value={viewMode} onValueChange={(value: any) => setViewMode(value)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dayGridMonth">Month</SelectItem>
                <SelectItem value="timeGridWeek">Week</SelectItem>
                <SelectItem value="timeGridDay">Day</SelectItem>
              </SelectContent>
            </Select>

            {/* Facility Filter */}
            <Select onValueChange={handleFacilityFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by facility" />
              </SelectTrigger>
              <SelectContent>
                {facilities.map((facility: any) => (
                  <SelectItem key={facility.id} value={facility.id.toString()}>
                    {facility.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {selectedFacilities.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {selectedFacilities.map(facilityId => {
                const facility = facilities.find(f => f.id === facilityId);
                return facility ? (
                  <Badge key={facilityId} variant="secondary" className="flex items-center gap-1">
                    {facility.name}
                    <X 
                      className="w-3 h-3 cursor-pointer" 
                      onClick={() => setSelectedFacilities(prev => prev.filter(f => f !== facilityId))}
                    />
                  </Badge>
                ) : null;
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Calendar */}
      <Card>
        <CardContent className="p-4">
          {shiftsLoading ? (
            <div className="flex items-center justify-center h-96">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : (
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView={viewMode}
              headerToolbar={{
                left: "prev,next today",
                center: "title",
                right: "dayGridMonth,timeGridWeek,timeGridDay",
              }}
              events={fullCalendarEvents}
              eventClick={handleEventClick}
              editable={canCreateShifts}
              selectable={canCreateShifts}
              height="auto"
              aspectRatio={1.8}
            />
          )}
        </CardContent>
      </Card>

      {/* Add Shift Dialog */}
      <Dialog open={isAddShiftOpen} onOpenChange={setIsAddShiftOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Shift</DialogTitle>
            <DialogDescription>Create a new shift assignment</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Shift Title *</Label>
              <Input
                id="title"
                value={newShift.title}
                onChange={(e) => setNewShift(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Day Nurse"
              />
            </div>

            <div>
              <Label htmlFor="facility">Facility *</Label>
              <Select value={newShift.facilityId} onValueChange={(value) => setNewShift(prev => ({ ...prev, facilityId: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select facility" />
                </SelectTrigger>
                <SelectContent>
                  {facilities.map((facility: any) => (
                    <SelectItem key={facility.id} value={facility.id.toString()}>
                      {facility.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                value={newShift.department}
                onChange={(e) => setNewShift(prev => ({ ...prev, department: e.target.value }))}
                placeholder="e.g., ICU, Emergency"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start">Start Time *</Label>
                <Input
                  id="start"
                  type="datetime-local"
                  value={newShift.start}
                  onChange={(e) => setNewShift(prev => ({ ...prev, start: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="end">End Time *</Label>
                <Input
                  id="end"
                  type="datetime-local"
                  value={newShift.end}
                  onChange={(e) => setNewShift(prev => ({ ...prev, end: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="requiredWorkers">Required Workers</Label>
                <Input
                  id="requiredWorkers"
                  type="number"
                  min="1"
                  value={newShift.requiredWorkers}
                  onChange={(e) => setNewShift(prev => ({ ...prev, requiredWorkers: parseInt(e.target.value) || 1 }))}
                />
              </div>
              <div>
                <Label htmlFor="rate">Hourly Rate ($)</Label>
                <Input
                  id="rate"
                  type="number"
                  min="0"
                  step="0.01"
                  value={newShift.rate}
                  onChange={(e) => setNewShift(prev => ({ ...prev, rate: parseFloat(e.target.value) || 0 }))}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={newShift.notes}
                onChange={(e) => setNewShift(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional information..."
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isUrgent"
                checked={newShift.isUrgent}
                onChange={(e) => setNewShift(prev => ({ ...prev, isUrgent: e.target.checked }))}
                className="w-4 h-4"
              />
              <Label htmlFor="isUrgent">Mark as urgent</Label>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => setIsAddShiftOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateShift}
              disabled={createShiftMutation.isPending}
            >
              {createShiftMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Create Shift
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Shift Details Dialog */}
      <Dialog open={isShiftDetailsOpen} onOpenChange={setIsShiftDetailsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Shift Details</DialogTitle>
          </DialogHeader>
          
          {selectedShift && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold">{selectedShift.title}</h3>
                <p className="text-sm text-muted-foreground">{selectedShift.facilityName}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Department:</strong> {selectedShift.department}
                </div>
                <div>
                  <strong>Rate:</strong> ${selectedShift.rate}/hr
                </div>
                <div>
                  <strong>Workers:</strong> {selectedShift.assignedWorkerIds.length}/{selectedShift.requiredWorkers}
                </div>
                <div>
                  <strong>Status:</strong> 
                  <Badge 
                    variant={selectedShift.isUrgent ? "destructive" : "secondary"}
                    className="ml-1"
                  >
                    {selectedShift.isUrgent ? "Urgent" : "Normal"}
                  </Badge>
                </div>
              </div>
              
              <div>
                <strong>Time:</strong>
                <p className="text-sm">{format(new Date(selectedShift.start), "PPp")} - {format(new Date(selectedShift.end), "p")}</p>
              </div>
              
              {selectedShift.notes && (
                <div>
                  <strong>Notes:</strong>
                  <p className="text-sm text-muted-foreground">{selectedShift.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}