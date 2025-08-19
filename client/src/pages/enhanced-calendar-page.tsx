
import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useFacilities } from "@/hooks/use-facility";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import {
  Calendar,
  Clock,
  Users,
  Search,
  Filter,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  AlertCircle,
  XCircle,
  User,
  Building,
  MapPin,
  DollarSign,
  History,
  Eye,
  UserCheck,
  UserX,
  Loader2,
} from "lucide-react";
import { addDays, subDays, startOfWeek, endOfWeek, format } from "date-fns";

// Enhanced types for better type safety
interface EnhancedShift {
  id: number;
  title: string;
  facilityId: number;
  facilityName: string;
  department: string;
  specialty: string;
  date: string;
  startTime: string;
  endTime: string;
  status: 'open' | 'pending' | 'filled' | 'cancelled';
  urgency: 'low' | 'medium' | 'high' | 'critical';
  rate: number;
  requiredStaff: number;
  assignedStaffIds: number[];
  requestedStaffIds: number[];
  requirements: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Role-based color scheme
const getShiftColorByStatus = (shift: EnhancedShift) => {
  switch (shift.status) {
    case 'open': return '#3B82F6'; // Blue
    case 'pending': return '#F59E0B'; // Amber
    case 'filled': return '#10B981'; // Green
    case 'cancelled': return '#EF4444'; // Red
    default: return '#6B7280'; // Gray
  }
};

const getUrgencyIndicator = (urgency: string) => {
  switch (urgency) {
    case 'critical': return '🔴';
    case 'high': return '🟠';
    case 'medium': return '🟡';
    default: return '🟢';
  }
};

// Superuser Calendar Component
const SuperuserCalendar: React.FC<{
  shifts: EnhancedShift[];
  facilities: any[];
  onShiftClick: (shift: EnhancedShift) => void;
  onCreateShift: () => void;
}> = ({ shifts, facilities, onShiftClick, onCreateShift }) => {
  const [selectedFacilities, setSelectedFacilities] = useState<number[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [urgencyFilter, setUrgencyFilter] = useState<string>('all');

  const filteredShifts = useMemo(() => {
    return shifts.filter(shift => {
      if (selectedFacilities.length > 0 && !selectedFacilities.includes(shift.facilityId)) return false;
      if (statusFilter !== 'all' && shift.status !== statusFilter) return false;
      if (urgencyFilter !== 'all' && shift.urgency !== urgencyFilter) return false;
      return true;
    });
  }, [shifts, selectedFacilities, statusFilter, urgencyFilter]);

  const calendarEvents = filteredShifts.map(shift => ({
    id: shift.id.toString(),
    title: `${getUrgencyIndicator(shift.urgency)} ${shift.specialty} • ${shift.facilityName}`,
    start: `${shift.date}T${shift.startTime}`,
    end: `${shift.date}T${shift.endTime}`,
    backgroundColor: getShiftColorByStatus(shift),
    borderColor: getShiftColorByStatus(shift),
    extendedProps: { shift }
  }));

  return (
    <div className="space-y-6">
      {/* Superuser Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Building className="w-5 h-5" />
              System-Wide Schedule Management
            </span>
            <Button onClick={onCreateShift}>
              <Plus className="w-4 h-4 mr-2" />
              Create Shift
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Facility Filter */}
            <Select onValueChange={(value) => {
              if (value === 'all') setSelectedFacilities([]);
              else setSelectedFacilities([parseInt(value)]);
            }}>
              <SelectTrigger>
                <SelectValue placeholder="All Facilities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Facilities</SelectItem>
                {facilities.map(facility => (
                  <SelectItem key={facility.id} value={facility.id.toString()}>
                    {facility.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="filled">Filled</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            {/* Urgency Filter */}
            <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Urgency</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>

            {/* Quick Stats */}
            <div className="text-sm space-y-1">
              <div>Total Shifts: {filteredShifts.length}</div>
              <div>Open: {filteredShifts.filter(s => s.status === 'open').length}</div>
              <div>Critical: {filteredShifts.filter(s => s.urgency === 'critical').length}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar */}
      <Card>
        <CardContent className="p-4">
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek,timeGridDay'
            }}
            events={calendarEvents}
            eventClick={(info) => onShiftClick(info.event.extendedProps.shift)}
            height="auto"
            slotMinTime="06:00:00"
            slotMaxTime="24:00:00"
          />
        </CardContent>
      </Card>
    </div>
  );
};

// Facility User Calendar Component
const FacilityUserCalendar: React.FC<{
  shifts: EnhancedShift[];
  onShiftClick: (shift: EnhancedShift) => void;
  onCreateShift: () => void;
  onAssignShift: (shiftId: number, staffId: number) => void;
  onCancelShift: (shiftId: number) => void;
}> = ({ shifts, onShiftClick, onCreateShift, onAssignShift, onCancelShift }) => {
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');

  const departments = useMemo(() => {
    const deps = [...new Set(shifts.map(s => s.department))];
    return deps.filter(Boolean);
  }, [shifts]);

  const filteredShifts = useMemo(() => {
    return shifts.filter(shift => 
      departmentFilter === 'all' || shift.department === departmentFilter
    );
  }, [shifts, departmentFilter]);

  const calendarEvents = filteredShifts.map(shift => {
    const staffingRatio = `${shift.assignedStaffIds.length}/${shift.requiredStaff}`;
    return {
      id: shift.id.toString(),
      title: `${shift.specialty} (${staffingRatio}) • ${shift.department}`,
      start: `${shift.date}T${shift.startTime}`,
      end: `${shift.date}T${shift.endTime}`,
      backgroundColor: getShiftColorByStatus(shift),
      borderColor: getShiftColorByStatus(shift),
      extendedProps: { shift }
    };
  });

  return (
    <div className="space-y-6">
      {/* Facility Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Facility Schedule Management
            </span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setViewMode(viewMode === 'calendar' ? 'list' : 'calendar')}>
                {viewMode === 'calendar' ? 'List View' : 'Calendar View'}
              </Button>
              <Button onClick={onCreateShift}>
                <Plus className="w-4 h-4 mr-2" />
                Post Shift
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-center">
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map(dept => (
                  <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex gap-4 text-sm">
              <Badge variant="outline" className="bg-blue-50">
                <div className="w-3 h-3 bg-blue-500 rounded mr-2"></div>
                Open
              </Badge>
              <Badge variant="outline" className="bg-amber-50">
                <div className="w-3 h-3 bg-amber-500 rounded mr-2"></div>
                Pending
              </Badge>
              <Badge variant="outline" className="bg-green-50">
                <div className="w-3 h-3 bg-green-500 rounded mr-2"></div>
                Filled
              </Badge>
              <Badge variant="outline" className="bg-red-50">
                <div className="w-3 h-3 bg-red-500 rounded mr-2"></div>
                Cancelled
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar or List View */}
      {viewMode === 'calendar' ? (
        <Card>
          <CardContent className="p-4">
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="timeGridWeek"
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay'
              }}
              events={calendarEvents}
              eventClick={(info) => onShiftClick(info.event.extendedProps.shift)}
              height="auto"
              slotMinTime="06:00:00"
              slotMaxTime="24:00:00"
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-4">
              {filteredShifts.map(shift => (
                <div key={shift.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-4 h-4 rounded`} style={{ backgroundColor: getShiftColorByStatus(shift) }}></div>
                      <div>
                        <h3 className="font-medium">{shift.title}</h3>
                        <p className="text-sm text-gray-600">
                          {format(new Date(shift.date), 'MMM dd')} • {shift.startTime} - {shift.endTime} • {shift.department}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={shift.status === 'open' ? 'destructive' : 'default'}>
                        {shift.assignedStaffIds.length}/{shift.requiredStaff} Staffed
                      </Badge>
                      <Button size="sm" variant="outline" onClick={() => onShiftClick(shift)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// Staff Calendar Component
const StaffCalendar: React.FC<{
  openShifts: EnhancedShift[];
  myShifts: EnhancedShift[];
  shiftHistory: EnhancedShift[];
  onRequestShift: (shiftId: number) => void;
  onShiftClick: (shift: EnhancedShift) => void;
}> = ({ openShifts, myShifts, shiftHistory, onRequestShift, onShiftClick }) => {
  const [activeTab, setActiveTab] = useState('available');
  const [specialtyFilter, setSpecialtyFilter] = useState<string>('all');

  const specialties = useMemo(() => {
    const specs = [...new Set(openShifts.map(s => s.specialty))];
    return specs.filter(Boolean);
  }, [openShifts]);

  const filteredOpenShifts = useMemo(() => {
    return openShifts.filter(shift => 
      specialtyFilter === 'all' || shift.specialty === specialtyFilter
    );
  }, [openShifts, specialtyFilter]);

  return (
    <div className="space-y-6">
      {/* Staff Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            My Schedule & Available Shifts
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Tabs for different views */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="available">Available Shifts ({filteredOpenShifts.length})</TabsTrigger>
          <TabsTrigger value="my-shifts">My Shifts ({myShifts.length})</TabsTrigger>
          <TabsTrigger value="history">History ({shiftHistory.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="available" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <Select value={specialtyFilter} onValueChange={setSpecialtyFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by specialty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Specialties</SelectItem>
                    {specialties.map(spec => (
                      <SelectItem key={spec} value={spec}>{spec}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {filteredOpenShifts.map(shift => (
                  <div key={shift.id} className="border rounded-lg p-4 hover:bg-blue-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{shift.title}</h3>
                          <Badge variant="secondary">{shift.specialty}</Badge>
                          {shift.urgency === 'critical' && <Badge variant="destructive">Critical</Badge>}
                          {shift.urgency === 'high' && <Badge variant="destructive">High Priority</Badge>}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {format(new Date(shift.date), 'MMM dd, yyyy')}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {shift.startTime} - {shift.endTime}
                          </div>
                          <div className="flex items-center gap-1">
                            <Building className="w-4 h-4" />
                            {shift.facilityName}
                          </div>
                          <div className="flex items-center gap-1">
                            <DollarSign className="w-4 h-4" />
                            ${shift.rate}/hr
                          </div>
                        </div>
                        {shift.requirements.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {shift.requirements.map((req, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {req}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => onShiftClick(shift)}>
                          View Details
                        </Button>
                        <Button size="sm" onClick={() => onRequestShift(shift.id)}>
                          Request Shift
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="my-shifts">
          <Card>
            <CardContent className="p-4">
              <FullCalendar
                plugins={[dayGridPlugin, timeGridPlugin]}
                initialView="timeGridWeek"
                headerToolbar={{
                  left: 'prev,next today',
                  center: 'title',
                  right: 'timeGridWeek,timeGridDay'
                }}
                events={myShifts.map(shift => ({
                  id: shift.id.toString(),
                  title: `${shift.specialty} • ${shift.facilityName}`,
                  start: `${shift.date}T${shift.startTime}`,
                  end: `${shift.date}T${shift.endTime}`,
                  backgroundColor: '#10B981',
                  borderColor: '#10B981',
                  extendedProps: { shift }
                }))}
                eventClick={(info) => onShiftClick(info.event.extendedProps.shift)}
                height="auto"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardContent className="p-4">
              <div className="space-y-4">
                {shiftHistory.map(shift => (
                  <div key={shift.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">{shift.title}</h3>
                        <p className="text-sm text-gray-600">
                          {format(new Date(shift.date), 'MMM dd, yyyy')} • {shift.startTime} - {shift.endTime}
                        </p>
                        <p className="text-sm text-gray-600">{shift.facilityName} • {shift.department}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant="secondary">{shift.status}</Badge>
                        <p className="text-sm text-gray-600 mt-1">${shift.rate}/hr</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Main Enhanced Calendar Page
export default function EnhancedCalendarPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: facilities = [] } = useFacilities();

  const [selectedShift, setSelectedShift] = useState<EnhancedShift | null>(null);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [isCreateShiftOpen, setIsCreateShiftOpen] = useState(false);

  // Fetch shifts based on user role
  const { data: shifts = [], isLoading } = useQuery({
    queryKey: ['/api/calendar/shifts', user?.role, user?.id],
    queryFn: async () => {
      const params = new URLSearchParams();
      
      if (user?.role === 'staff') {
        params.append('staffId', user.id.toString());
      } else if (user?.role === 'facility_admin' && user?.facilityId) {
        params.append('facilityId', user.facilityId.toString());
      }
      
      const response = await fetch(`/api/calendar/shifts?${params}`, {
        credentials: 'include',
      });
      
      if (!response.ok) throw new Error('Failed to fetch shifts');
      return response.json();
    },
  });

  // Mutation for requesting shifts
  const requestShiftMutation = useMutation({
    mutationFn: async (shiftId: number) => {
      const response = await fetch(`/api/shifts/${shiftId}/request`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to request shift');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'Shift request submitted successfully' });
      queryClient.invalidateQueries({ queryKey: ['/api/calendar/shifts'] });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to request shift', variant: 'destructive' });
    },
  });

  const handleShiftClick = (shift: EnhancedShift) => {
    setSelectedShift(shift);
    setIsShiftModalOpen(true);
  };

  const handleRequestShift = (shiftId: number) => {
    requestShiftMutation.mutate(shiftId);
  };

  const handleCreateShift = () => {
    setIsCreateShiftOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  // Render appropriate calendar based on user role
  const renderCalendar = () => {
    switch (user?.role) {
      case 'super_admin':
        return (
          <SuperuserCalendar
            shifts={shifts}
            facilities={facilities}
            onShiftClick={handleShiftClick}
            onCreateShift={handleCreateShift}
          />
        );
      
      case 'facility_admin':
      case 'facility_manager':
        return (
          <FacilityUserCalendar
            shifts={shifts}
            onShiftClick={handleShiftClick}
            onCreateShift={handleCreateShift}
            onAssignShift={(shiftId, staffId) => {
              // TODO: Implement assign shift mutation
            }}
            onCancelShift={(shiftId) => {
              // TODO: Implement cancel shift mutation
            }}
          />
        );
      
      case 'staff':
        const openShifts = shifts.filter((s: EnhancedShift) => s.status === 'open');
        const myShifts = shifts.filter((s: EnhancedShift) => 
          s.assignedStaffIds.includes(user?.id || 0) || s.requestedStaffIds.includes(user?.id || 0)
        );
        const shiftHistory = shifts.filter((s: EnhancedShift) => 
          s.status === 'completed' && s.assignedStaffIds.includes(user?.id || 0)
        );
        
        return (
          <StaffCalendar
            openShifts={openShifts}
            myShifts={myShifts}
            shiftHistory={shiftHistory}
            onRequestShift={handleRequestShift}
            onShiftClick={handleShiftClick}
          />
        );
      
      default:
        return <div>Access denied. Please contact your administrator.</div>;
    }
  };

  return (
    <div className="container mx-auto p-6">
      {renderCalendar()}
      
      {/* Shift Details Modal */}
      <Dialog open={isShiftModalOpen} onOpenChange={setIsShiftModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Shift Details</DialogTitle>
          </DialogHeader>
          {selectedShift && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Title</label>
                  <p>{selectedShift.title}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Facility</label>
                  <p>{selectedShift.facilityName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Department</label>
                  <p>{selectedShift.department}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Specialty</label>
                  <p>{selectedShift.specialty}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Date & Time</label>
                  <p>{format(new Date(selectedShift.date), 'MMM dd, yyyy')} • {selectedShift.startTime} - {selectedShift.endTime}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Rate</label>
                  <p>${selectedShift.rate}/hour</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Staffing</label>
                  <p>{selectedShift.assignedStaffIds.length}/{selectedShift.requiredStaff} filled</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <Badge variant={selectedShift.status === 'open' ? 'destructive' : 'default'}>
                    {selectedShift.status}
                  </Badge>
                </div>
              </div>
              
              {selectedShift.requirements.length > 0 && (
                <div>
                  <label className="text-sm font-medium">Requirements</label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedShift.requirements.map((req, idx) => (
                      <Badge key={idx} variant="outline">{req}</Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {selectedShift.notes && (
                <div>
                  <label className="text-sm font-medium">Notes</label>
                  <p className="text-sm">{selectedShift.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
