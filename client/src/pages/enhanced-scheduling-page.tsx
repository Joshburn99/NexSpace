import { useState, useRef, useEffect } from "react";
import { Calendar, Clock, Users, MapPin, Filter, Plus, ChevronLeft, ChevronRight, Building, Stethoscope, Navigation, AlertCircle, Eye, User, DollarSign, FileText, CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// Mock data interfaces
interface Shift {
  id: string;
  title: string;
  start: Date;
  end: Date;
  unit: string;
  position: string;
  requiredStaff: number;
  assignedStaff: Staff[];
  hourlyRate: number;
  status: 'open' | 'filled' | 'urgent' | 'cancelled' | 'in-progress';
  facilityId: number;
  createdBy: string;
  requirements?: string[];
  notes?: string;
  room?: string;
}

interface Staff {
  id: string;
  name: string;
  position: string;
  unit: string;
  type: 'employee' | 'contractor';
  hourlyRate: number;
  skills: string[];
  reliabilityScore: number;
  isFavorite: boolean;
  availability: 'available' | 'unavailable' | 'limited';
  currentLocation?: {
    lat: number;
    lng: number;
    distance: number; // in miles from facility
    lastUpdated: Date;
  };
  clockedIn?: boolean;
  color: string;
}

interface Unit {
  id: string;
  name: string;
  capacity: number;
  currentCensus: number;
  requiredStaffRatio: number;
  departments: string[];
}

type CalendarView = 'next7days' | 'month' | 'daily';

// Mock data
const mockUnits: Unit[] = [
  { id: '1', name: 'ICU', capacity: 20, currentCensus: 18, requiredStaffRatio: 2.5, departments: ['Critical Care'] },
  { id: '2', name: 'Med-Surg', capacity: 30, currentCensus: 25, requiredStaffRatio: 3.0, departments: ['Medical', 'Surgical'] },
  { id: '3', name: 'Memory Care', capacity: 25, currentCensus: 22, requiredStaffRatio: 4.0, departments: ['Dementia Care'] },
  { id: '4', name: 'Rehabilitation', capacity: 25, currentCensus: 20, requiredStaffRatio: 3.5, departments: ['Physical Therapy', 'Occupational Therapy'] }
];

const mockStaff: Staff[] = [
  {
    id: '1', name: 'Sarah Johnson', position: 'RN', unit: 'ICU', type: 'employee',
    hourlyRate: 35, skills: ['IV Therapy', 'Ventilator Care'], reliabilityScore: 96,
    isFavorite: true, availability: 'available', clockedIn: true, color: '#3B82F6',
    currentLocation: { lat: 40.7128, lng: -74.0060, distance: 0.2, lastUpdated: new Date() }
  },
  {
    id: '2', name: 'Michael Chen', position: 'CNA', unit: 'Med-Surg', type: 'contractor',
    hourlyRate: 18, skills: ['Patient Care', 'Medication Administration'], reliabilityScore: 88,
    isFavorite: false, availability: 'available', clockedIn: false, color: '#F97316',
    currentLocation: { lat: 40.7200, lng: -74.0100, distance: 1.5, lastUpdated: new Date() }
  },
  {
    id: '3', name: 'Emily Rodriguez', position: 'LPN', unit: 'Memory Care', type: 'employee',
    hourlyRate: 28, skills: ['Dementia Care', 'Behavioral Management'], reliabilityScore: 94,
    isFavorite: true, availability: 'available', clockedIn: true, color: '#3B82F6'
  },
  {
    id: '4', name: 'David Park', position: 'PT', unit: 'Rehabilitation', type: 'contractor',
    hourlyRate: 42, skills: ['Physical Therapy', 'Mobility Training'], reliabilityScore: 92,
    isFavorite: false, availability: 'limited', clockedIn: false, color: '#F97316'
  }
];

const mockShifts: Shift[] = [
  {
    id: '1', title: 'Night Nurse - ICU', start: new Date(2025, 5, 17, 19, 0), end: new Date(2025, 5, 18, 7, 0),
    unit: 'ICU', position: 'RN', requiredStaff: 2, assignedStaff: [mockStaff[0]], hourlyRate: 35,
    status: 'in-progress', facilityId: 1, createdBy: 'Admin', notes: 'Critical care experience required',
    requirements: ['IV Therapy', 'Ventilator Care']
  },
  {
    id: '2', title: 'Day CNA - Med-Surg', start: new Date(2025, 5, 17, 7, 0), end: new Date(2025, 5, 17, 19, 0),
    unit: 'Med-Surg', position: 'CNA', requiredStaff: 3, assignedStaff: [mockStaff[1]], hourlyRate: 18,
    status: 'filled', facilityId: 1, createdBy: 'Supervisor', notes: 'Patient care focus'
  },
  {
    id: '3', title: 'Evening LPN - Memory Care', start: new Date(2025, 5, 17, 15, 0), end: new Date(2025, 5, 17, 23, 0),
    unit: 'Memory Care', position: 'LPN', requiredStaff: 2, assignedStaff: [], hourlyRate: 28,
    status: 'urgent', facilityId: 1, createdBy: 'Manager', notes: 'Dementia care experience preferred'
  },
  {
    id: '4', title: 'Morning PT - Rehabilitation', start: new Date(2025, 5, 18, 8, 0), end: new Date(2025, 5, 18, 16, 0),
    unit: 'Rehabilitation', position: 'PT', requiredStaff: 1, assignedStaff: [], hourlyRate: 42,
    status: 'open', facilityId: 1, createdBy: 'Director', notes: 'Physical therapy certification required'
  }
];

export default function EnhancedSchedulingPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [isShiftDetailsOpen, setIsShiftDetailsOpen] = useState(false);
  const [isBulkScheduleOpen, setIsBulkScheduleOpen] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [shifts, setShifts] = useState<Shift[]>(mockShifts);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedUnit, setSelectedUnit] = useState<string>('all');
  const [selectedPosition, setSelectedPosition] = useState<string>('all');
  const [calendarView, setCalendarView] = useState<CalendarView>('next7days');

  if (!user) return null;

  const getNext7Days = () => {
    const days = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      days.push(date);
    }
    return days;
  };

  const getShiftsForDate = (date: Date) => {
    return shifts.filter(shift => {
      const shiftDate = new Date(shift.start);
      return shiftDate.toDateString() === date.toDateString() &&
             (selectedUnit === 'all' || shift.unit === selectedUnit) &&
             (selectedPosition === 'all' || shift.position === selectedPosition);
    });
  };

  const getShiftsForUnit = (unitName: string, date: Date) => {
    return shifts.filter(shift => {
      const shiftDate = new Date(shift.start);
      return shiftDate.toDateString() === date.toDateString() && shift.unit === unitName;
    });
  };

  const getSpecialtyColor = (position: string) => {
    switch (position) {
      case 'RN': return 'border-blue-300 bg-blue-100';
      case 'LPN': return 'border-green-300 bg-green-100';
      case 'CNA': return 'border-purple-300 bg-purple-100';
      case 'PT': return 'border-orange-300 bg-orange-100';
      case 'OT': return 'border-pink-300 bg-pink-100';
      case 'RT': return 'border-cyan-300 bg-cyan-100';
      default: return 'border-gray-300 bg-gray-100';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-red-100 text-red-800 border-red-200';
      case 'filled': return 'bg-green-100 text-green-800 border-green-200';
      case 'urgent': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'in-progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'cancelled': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open': return <AlertCircle className="w-3 h-3 text-red-500" />;
      case 'filled': return <Users className="w-3 h-3 text-green-500" />;
      case 'urgent': return <AlertTriangle className="w-3 h-3 text-orange-500" />;
      case 'cancelled': return <XCircle className="w-3 h-3 text-gray-500" />;
      case 'in-progress': return <Clock className="w-3 h-3 text-blue-500" />;
      default: return <Clock className="w-3 h-3 text-gray-500" />;
    }
  };

  const getStatusDescription = (status: string) => {
    switch (status) {
      case 'open': return 'This shift is available and needs staff assignment';
      case 'filled': return 'This shift has been fully staffed';
      case 'urgent': return 'This shift requires immediate attention - understaffed or last minute';
      case 'cancelled': return 'This shift has been cancelled';
      case 'in-progress': return 'This shift is currently active';
      default: return 'Unknown status';
    }
  };

  const getStaffTypeColor = (type: string) => {
    return type === 'employee' ? 'text-blue-600' : 'text-orange-600';
  };

  const renderDailyView = () => {
    return (
      <div className="grid gap-4">
        {mockUnits.map(unit => (
          <Card key={unit.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">{unit.name}</CardTitle>
                  <CardDescription>
                    Census: {unit.currentCensus}/{unit.capacity} | Required Ratio: 1:{unit.requiredStaffRatio}
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-sm">
                  {getShiftsForUnit(unit.name, selectedDate).length} shifts
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {getShiftsForUnit(unit.name, selectedDate).map(shift => (
                  <TooltipProvider key={shift.id}>
                    <div 
                      className={cn("p-3 rounded-lg border cursor-pointer hover:shadow-md transition-shadow", getSpecialtyColor(shift.position))}
                      onClick={() => {
                        setSelectedShift(shift);
                        setIsShiftDetailsOpen(true);
                      }}
                    >
                      <div className="flex justify-between items-center">
                        <div className="space-y-1">
                          <h4 className="font-medium text-sm">{shift.position}</h4>
                          <div className="text-xs text-gray-600">
                            {shift.assignedStaff.length > 0 ? (
                              <span className="font-medium">{shift.assignedStaff[0].name}</span>
                            ) : (
                              <span className="text-gray-400 italic">Unassigned</span>
                            )}
                          </div>
                          <div className="flex items-center space-x-1 text-xs text-gray-500">
                            <Clock className="w-3 h-3" />
                            <span>
                              {shift.start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} - 
                              {shift.end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end space-y-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center space-x-1 cursor-help">
                                {getStatusIcon(shift.status)}
                                <Badge className={cn("text-xs", getStatusColor(shift.status))}>
                                  {shift.status.charAt(0).toUpperCase() + shift.status.slice(1)}
                                </Badge>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{getStatusDescription(shift.status)}</p>
                            </TooltipContent>
                          </Tooltip>
                          <Button variant="ghost" size="sm" className="h-6 px-2">
                            <Eye className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </TooltipProvider>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  const renderNext7DaysView = () => {
    const days = getNext7Days();
    
    return (
      <div className="grid grid-cols-7 gap-2">
        {days.map((date, index) => (
          <div key={index} className="border rounded-lg p-3 bg-white min-h-[300px]">
            <h3 className="font-semibold text-sm mb-2">
              {date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </h3>
            <div className="space-y-2">
              {getShiftsForDate(date).slice(0, 4).map(shift => (
                <TooltipProvider key={shift.id}>
                  <div 
                    className={cn("p-2 rounded border cursor-pointer hover:shadow-sm transition-shadow text-xs", getSpecialtyColor(shift.position))}
                    onClick={() => {
                      setSelectedShift(shift);
                      setIsShiftDetailsOpen(true);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{shift.position}</div>
                        <div className="text-gray-600">
                          {shift.assignedStaff.length > 0 ? shift.assignedStaff[0].name : 'Open'}
                        </div>
                        <div className="text-gray-500">
                          {shift.start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        </div>
                      </div>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="cursor-help">
                            {getStatusIcon(shift.status)}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{getStatusDescription(shift.status)}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                </TooltipProvider>
              ))}
              
              {getShiftsForDate(date).length > 4 && (
                <div className="text-xs text-gray-500 text-center mt-2">
                  +{getShiftsForDate(date).length - 4} more
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-white border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Enhanced Scheduling</h1>
              <p className="text-gray-600">Manage shifts with specialty-based color coding and real-time tracking</p>
            </div>
            <div className="flex items-center space-x-3">
              <Dialog open={isBulkScheduleOpen} onOpenChange={setIsBulkScheduleOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Bulk Schedule
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl">
                  <DialogHeader>
                    <DialogTitle>Bulk Schedule Shifts</DialogTitle>
                    <DialogDescription>
                      Create multiple shifts at once using templates or custom configurations
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="text-center py-8 text-gray-500">
                      Bulk scheduling functionality coming soon
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Select value={calendarView} onValueChange={(value: CalendarView) => setCalendarView(value)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily View</SelectItem>
                  <SelectItem value="next7days">Next 7 Days</SelectItem>
                  <SelectItem value="month">Month View</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedUnit} onValueChange={setSelectedUnit}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Units" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Units</SelectItem>
                  <SelectItem value="ICU">ICU</SelectItem>
                  <SelectItem value="Med-Surg">Med-Surg</SelectItem>
                  <SelectItem value="Memory Care">Memory Care</SelectItem>
                  <SelectItem value="Rehabilitation">Rehabilitation</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedPosition} onValueChange={setSelectedPosition}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Positions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Positions</SelectItem>
                  <SelectItem value="RN">RN</SelectItem>
                  <SelectItem value="LPN">LPN</SelectItem>
                  <SelectItem value="CNA">CNA</SelectItem>
                  <SelectItem value="PT">PT</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const newDate = new Date(selectedDate);
                  newDate.setDate(selectedDate.getDate() - 1);
                  setSelectedDate(newDate);
                }}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="font-medium">
                {selectedDate.toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const newDate = new Date(selectedDate);
                  newDate.setDate(selectedDate.getDate() + 1);
                  setSelectedDate(newDate);
                }}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {calendarView === 'daily' && renderDailyView()}
          {calendarView === 'next7days' && renderNext7DaysView()}
          {calendarView === 'month' && renderNext7DaysView()}
        </div>
      </div>

      {/* Shift Details Dialog */}
      <Dialog open={isShiftDetailsOpen} onOpenChange={setIsShiftDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Shift Details</DialogTitle>
            <DialogDescription>
              View and manage shift information
            </DialogDescription>
          </DialogHeader>
          {selectedShift && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Position</Label>
                  <p className="text-sm text-gray-600">{selectedShift.position}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Unit</Label>
                  <p className="text-sm text-gray-600">{selectedShift.unit}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Time</Label>
                  <p className="text-sm text-gray-600">
                    {selectedShift.start.toLocaleString()} - {selectedShift.end.toLocaleString()}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <Badge className={cn("text-xs", getStatusColor(selectedShift.status))}>
                    {selectedShift.status.charAt(0).toUpperCase() + selectedShift.status.slice(1)}
                  </Badge>
                </div>
              </div>
              {selectedShift.notes && (
                <div>
                  <Label className="text-sm font-medium">Notes</Label>
                  <p className="text-sm text-gray-600">{selectedShift.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}