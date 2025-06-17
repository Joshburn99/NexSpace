import { useState } from "react";
import { Calendar, Plus, Filter, Search, MapPin, Phone, Mail, Clock, Users, ArrowLeft, ChevronLeft, ChevronRight, Building } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { Link } from "wouter";

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
  status: 'open' | 'filled' | 'urgent' | 'cancelled' | 'in-progress' | 'completed';
  facilityId: number;
  createdBy: string;
  requirements?: string[];
  notes?: string;
  room?: string;
  premiumPay?: number;
  shiftType: 'regular' | 'prn' | 'block';
}

interface Staff {
  id: string;
  firstName: string;
  lastName: string;
  position: string;
  unit: string;
  type: 'employee' | 'contractor';
  hourlyRate: number;
  skills: string[];
  reliabilityScore: number;
  isFavorite: boolean;
  availability: 'available' | 'unavailable' | 'limited';
  contactInfo: {
    phone: string;
    email: string;
  };
  currentLocation?: {
    lat: number;
    lng: number;
    distance: number;
    lastUpdated: Date;
    address: string;
  };
  clockedIn?: boolean;
  color: string;
}

interface BulkScheduleTemplate {
  id: string;
  name: string;
  description: string;
  shifts: {
    position: string;
    unit: string;
    startTime: string;
    endTime: string;
    daysOfWeek: number[];
    requiredStaff: number;
  }[];
}

// Comprehensive shift data with proper staffing ratios
const mockShifts: Shift[] = [
  // Today's shifts
  {
    id: '1', title: 'Day Shift RN - ICU', start: new Date(2025, 5, 17, 7), end: new Date(2025, 5, 17, 19),
    unit: 'ICU', position: 'RN', requiredStaff: 2, hourlyRate: 45, status: 'filled', facilityId: 1,
    createdBy: 'Manager Smith', assignedStaff: ['staff1', 'staff2'] as any, shiftType: 'regular'
  },
  {
    id: '2', title: 'Day Shift CNA - ICU', start: new Date(2025, 5, 17, 7), end: new Date(2025, 5, 17, 19),
    unit: 'ICU', position: 'CNA', requiredStaff: 3, hourlyRate: 22, status: 'filled', facilityId: 1,
    createdBy: 'Manager Smith', assignedStaff: ['staff3', 'staff4', 'staff5'] as any, shiftType: 'regular'
  },
  {
    id: '3', title: 'Night Shift RN - ICU', start: new Date(2025, 5, 17, 19), end: new Date(2025, 5, 18, 7),
    unit: 'ICU', position: 'RN', requiredStaff: 2, hourlyRate: 48, status: 'urgent', facilityId: 1,
    createdBy: 'Manager Smith', assignedStaff: [] as any, premiumPay: 10, shiftType: 'prn'
  },
  {
    id: '4', title: 'Night Shift CNA - ICU', start: new Date(2025, 5, 17, 19), end: new Date(2025, 5, 18, 7),
    unit: 'ICU', position: 'CNA', requiredStaff: 3, hourlyRate: 25, status: 'urgent', facilityId: 1,
    createdBy: 'Manager Smith', assignedStaff: [] as any, premiumPay: 5, shiftType: 'prn'
  },
  // Med-Surg shifts
  {
    id: '5', title: 'Day Shift RN - Med-Surg', start: new Date(2025, 5, 17, 7), end: new Date(2025, 5, 17, 19),
    unit: 'Med-Surg', position: 'RN', requiredStaff: 1, hourlyRate: 42, status: 'filled', facilityId: 1,
    createdBy: 'Supervisor Lee', assignedStaff: ['staff6'] as any, shiftType: 'regular'
  },
  {
    id: '6', title: 'Day Shift LPN - Med-Surg', start: new Date(2025, 5, 17, 7), end: new Date(2025, 5, 17, 19),
    unit: 'Med-Surg', position: 'LPN', requiredStaff: 1, hourlyRate: 32, status: 'filled', facilityId: 1,
    createdBy: 'Supervisor Lee', assignedStaff: ['staff7'] as any, shiftType: 'regular'
  },
  {
    id: '7', title: 'Day Shift CNA - Med-Surg', start: new Date(2025, 5, 17, 7), end: new Date(2025, 5, 17, 19),
    unit: 'Med-Surg', position: 'CNA', requiredStaff: 3, hourlyRate: 20, status: 'filled', facilityId: 1,
    createdBy: 'Supervisor Lee', assignedStaff: ['staff8', 'staff9', 'staff10'] as any, shiftType: 'regular'
  },
  // Memory Care shifts
  {
    id: '8', title: 'Day Shift RN - Memory Care', start: new Date(2025, 5, 17, 7), end: new Date(2025, 5, 17, 19),
    unit: 'Memory Care', position: 'RN', requiredStaff: 1, hourlyRate: 40, status: 'filled', facilityId: 1,
    createdBy: 'Director Johnson', assignedStaff: ['staff11'] as any, shiftType: 'regular'
  },
  {
    id: '9', title: 'Day Shift CNA - Memory Care', start: new Date(2025, 5, 17, 7), end: new Date(2025, 5, 17, 19),
    unit: 'Memory Care', position: 'CNA', requiredStaff: 3, hourlyRate: 21, status: 'open', facilityId: 1,
    createdBy: 'Director Johnson', assignedStaff: ['staff12', 'staff13'] as any, shiftType: 'regular'
  },
  // Rehabilitation shifts
  {
    id: '10', title: 'Day Shift PT - Rehabilitation', start: new Date(2025, 5, 17, 8), end: new Date(2025, 5, 17, 17),
    unit: 'Rehabilitation', position: 'PT', requiredStaff: 1, hourlyRate: 55, status: 'filled', facilityId: 1,
    createdBy: 'Manager Davis', assignedStaff: ['staff14'] as any, shiftType: 'regular'
  },
  {
    id: '11', title: 'Day Shift CNA - Rehabilitation', start: new Date(2025, 5, 17, 8), end: new Date(2025, 5, 17, 17),
    unit: 'Rehabilitation', position: 'CNA', requiredStaff: 3, hourlyRate: 22, status: 'filled', facilityId: 1,
    createdBy: 'Manager Davis', assignedStaff: ['staff15', 'staff16', 'staff17'] as any, shiftType: 'regular'
  }
];

// Staff data with contact info and location
const mockStaff: Staff[] = [
  {
    id: 'staff1', firstName: 'Sarah', lastName: 'Johnson', position: 'RN', unit: 'ICU', type: 'employee',
    hourlyRate: 45, skills: ['Critical Care', 'IV Therapy'], reliabilityScore: 95, isFavorite: true,
    availability: 'available', color: '#3B82F6', clockedIn: true,
    contactInfo: { phone: '(555) 123-4567', email: 'sarah.johnson@facility.com' },
    currentLocation: { lat: 40.7128, lng: -74.0060, distance: 0.2, lastUpdated: new Date(), address: 'Main Building, ICU Unit' }
  },
  {
    id: 'staff2', firstName: 'Michael', lastName: 'Chen', position: 'RN', unit: 'ICU', type: 'contractor',
    hourlyRate: 48, skills: ['Emergency Care', 'Ventilator Management'], reliabilityScore: 88, isFavorite: false,
    availability: 'available', color: '#F59E0B', clockedIn: true,
    contactInfo: { phone: '(555) 234-5678', email: 'mchen.contractor@email.com' },
    currentLocation: { lat: 40.7130, lng: -74.0058, distance: 0.1, lastUpdated: new Date(), address: 'Main Building, ICU Unit' }
  },
  {
    id: 'staff3', firstName: 'Emily', lastName: 'Rodriguez', position: 'CNA', unit: 'ICU', type: 'employee',
    hourlyRate: 22, skills: ['Patient Care', 'Vital Signs'], reliabilityScore: 92, isFavorite: false,
    availability: 'available', color: '#8B5CF6', clockedIn: true,
    contactInfo: { phone: '(555) 345-6789', email: 'emily.rodriguez@facility.com' }
  },
  {
    id: 'staff4', firstName: 'David', lastName: 'Park', position: 'CNA', unit: 'ICU', type: 'employee',
    hourlyRate: 22, skills: ['Patient Care', 'Mobility Assistance'], reliabilityScore: 89, isFavorite: false,
    availability: 'available', color: '#8B5CF6', clockedIn: true,
    contactInfo: { phone: '(555) 456-7890', email: 'david.park@facility.com' }
  },
  {
    id: 'staff5', firstName: 'Lisa', lastName: 'Wang', position: 'CNA', unit: 'ICU', type: 'contractor',
    hourlyRate: 25, skills: ['Patient Care', 'Documentation'], reliabilityScore: 85, isFavorite: false,
    availability: 'available', color: '#F59E0B', clockedIn: true,
    contactInfo: { phone: '(555) 567-8901', email: 'lwang.contractor@email.com' }
  }
];

// Bulk schedule templates
const scheduleTemplates: BulkScheduleTemplate[] = [
  {
    id: '1',
    name: 'Standard ICU Coverage',
    description: 'Standard 24/7 ICU staffing with 2 RNs and 3 CNAs per shift',
    shifts: [
      { position: 'RN', unit: 'ICU', startTime: '07:00', endTime: '19:00', daysOfWeek: [1,2,3,4,5,6,0], requiredStaff: 2 },
      { position: 'RN', unit: 'ICU', startTime: '19:00', endTime: '07:00', daysOfWeek: [1,2,3,4,5,6,0], requiredStaff: 2 },
      { position: 'CNA', unit: 'ICU', startTime: '07:00', endTime: '19:00', daysOfWeek: [1,2,3,4,5,6,0], requiredStaff: 3 },
      { position: 'CNA', unit: 'ICU', startTime: '19:00', endTime: '07:00', daysOfWeek: [1,2,3,4,5,6,0], requiredStaff: 3 }
    ]
  },
  {
    id: '2',
    name: 'Med-Surg Day Shift',
    description: 'Standard medical-surgical day shift coverage',
    shifts: [
      { position: 'RN', unit: 'Med-Surg', startTime: '07:00', endTime: '19:00', daysOfWeek: [1,2,3,4,5,6,0], requiredStaff: 1 },
      { position: 'LPN', unit: 'Med-Surg', startTime: '07:00', endTime: '19:00', daysOfWeek: [1,2,3,4,5,6,0], requiredStaff: 1 },
      { position: 'CNA', unit: 'Med-Surg', startTime: '07:00', endTime: '19:00', daysOfWeek: [1,2,3,4,5,6,0], requiredStaff: 3 }
    ]
  },
  {
    id: '3',
    name: 'Weekend Emergency Coverage',
    description: 'Enhanced weekend staffing for all units',
    shifts: [
      { position: 'RN', unit: 'ICU', startTime: '07:00', endTime: '19:00', daysOfWeek: [6,0], requiredStaff: 3 },
      { position: 'RN', unit: 'Med-Surg', startTime: '07:00', endTime: '19:00', daysOfWeek: [6,0], requiredStaff: 2 },
      { position: 'CNA', unit: 'ICU', startTime: '07:00', endTime: '19:00', daysOfWeek: [6,0], requiredStaff: 4 },
      { position: 'CNA', unit: 'Med-Surg', startTime: '07:00', endTime: '19:00', daysOfWeek: [6,0], requiredStaff: 4 }
    ]
  }
];

type CalendarView = 'next7days' | 'month' | 'daily';

export default function EnhancedSchedulingPage() {
  const { user } = useAuth();
  const [calendarView, setCalendarView] = useState<CalendarView>('next7days');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedBuilding, setSelectedBuilding] = useState('main');
  const [selectedUnit, setSelectedUnit] = useState('all');
  const [selectedPosition, setSelectedPosition] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [showBulkSchedule, setShowBulkSchedule] = useState(false);
  const [bulkScheduleData, setBulkScheduleData] = useState({
    selectedDays: [] as Date[],
    startTime: '07:00',
    endTime: '19:00',
    position: '',
    unit: '',
    premiumPay: 0,
    shiftType: 'regular' as 'regular' | 'prn' | 'block',
    selectedTemplate: ''
  });

  const buildings = [
    { id: 'main', name: 'Main Building', address: '123 Care St' },
    { id: 'north', name: 'North Wing', address: '456 Health Ave' },
    { id: 'south', name: 'South Campus', address: '789 Medical Blvd' }
  ];

  if (!user) return null;

  const getSpecialtyColor = (position: string, type: 'employee' | 'contractor') => {
    const baseColors = {
      'RN': '#3B82F6',
      'LPN': '#10B981', 
      'CNA': '#8B5CF6',
      'PT': '#F59E0B',
      'OT': '#EF4444'
    };
    return baseColors[position] || '#6B7280';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'filled': return 'bg-green-100 text-green-800 border-green-200';
      case 'open': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'in-progress': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'completed': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'cancelled': return 'bg-red-50 text-red-600 border-red-100';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const filteredShifts = mockShifts.filter(shift => {
    return (selectedUnit === 'all' || shift.unit === selectedUnit) &&
           (selectedPosition === 'all' || shift.position === selectedPosition) &&
           (selectedStatus === 'all' || shift.status === selectedStatus);
  });

  const getShiftsForDate = (date: Date) => {
    return filteredShifts.filter(shift => 
      shift.start.toDateString() === date.toDateString()
    );
  };

  const next7Days = Array.from({length: 7}, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i);
    return date;
  });

  const handleBulkScheduleSubmit = () => {
    console.log('Bulk schedule data:', bulkScheduleData);
    setShowBulkSchedule(false);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Dashboard
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Enhanced Scheduling</h1>
                <p className="text-gray-600">Manage shifts and staffing across all units</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button variant="outline" onClick={() => setShowBulkSchedule(true)}>
                <Calendar className="w-4 h-4 mr-2" />
                Bulk Schedule
              </Button>
              <Link href="/shift-requests">
                <Button variant="outline">
                  <Users className="w-4 h-4 mr-2" />
                  Shift Requests
                </Button>
              </Link>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Post Single Shift
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {/* Filters */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    if (calendarView === 'daily') {
                      const newDate = new Date(selectedDate);
                      newDate.setDate(newDate.getDate() - 1);
                      setSelectedDate(newDate);
                    } else if (calendarView === 'next7days') {
                      const newDate = new Date(selectedDate);
                      newDate.setDate(newDate.getDate() - 7);
                      setSelectedDate(newDate);
                    } else if (calendarView === 'month') {
                      const newDate = new Date(selectedDate);
                      newDate.setMonth(newDate.getMonth() - 1);
                      setSelectedDate(newDate);
                    }
                  }}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                
                <Select value={calendarView} onValueChange={(value: CalendarView) => setCalendarView(value)}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="next7days">Next 7 Days</SelectItem>
                    <SelectItem value="month">Month View</SelectItem>
                    <SelectItem value="daily">Daily View</SelectItem>
                  </SelectContent>
                </Select>
                
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    if (calendarView === 'daily') {
                      const newDate = new Date(selectedDate);
                      newDate.setDate(newDate.getDate() + 1);
                      setSelectedDate(newDate);
                    } else if (calendarView === 'next7days') {
                      const newDate = new Date(selectedDate);
                      newDate.setDate(newDate.getDate() + 7);
                      setSelectedDate(newDate);
                    } else if (calendarView === 'month') {
                      const newDate = new Date(selectedDate);
                      newDate.setMonth(newDate.getMonth() + 1);
                      setSelectedDate(newDate);
                    }
                  }}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>

              {/* Building Filter */}
              <Select value={selectedBuilding} onValueChange={setSelectedBuilding}>
                <SelectTrigger className="w-48">
                  <Building className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {buildings.map((building) => (
                    <SelectItem key={building.id} value={building.id}>
                      <div className="flex flex-col">
                        <span>{building.name}</span>
                        <span className="text-xs text-gray-500">{building.address}</span>
                      </div>
                    </SelectItem>
                  ))}
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
                  <SelectItem value="OT">OT</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="filled">Filled</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Input placeholder="Search shifts..." className="w-64" />
              <Button variant="outline" size="icon">
                <Search className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Calendar View */}
          {calendarView === 'next7days' && (
            <div className="grid grid-cols-7 gap-4">
              {next7Days.map((date, index) => (
                <Card key={index} className="min-h-[400px]">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      {date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {getShiftsForDate(date).map((shift) => (
                      <div
                        key={shift.id}
                        className="p-2 rounded border cursor-pointer hover:shadow-sm transition-shadow"
                        style={{ borderLeftColor: getSpecialtyColor(shift.position, 'employee'), borderLeftWidth: '4px' }}
                        onClick={() => setSelectedShift(shift)}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="text-xs font-medium" style={{ color: getSpecialtyColor(shift.position, 'employee') }}>
                            {shift.position}
                          </div>
                          <Badge className={cn("text-xs", getStatusColor(shift.status))}>
                            {shift.status}
                          </Badge>
                        </div>
                        <div className="text-xs text-gray-600 mb-1">{shift.unit}</div>
                        <div className="text-xs text-gray-500">
                          {shift.start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} - 
                          {shift.end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        </div>
                        {shift.assignedStaff.length > 0 && (
                          <div className="text-xs text-gray-500 mt-1">
                            {shift.assignedStaff.length}/{shift.requiredStaff} staff
                          </div>
                        )}
                        {shift.premiumPay && (
                          <div className="text-xs text-green-600 mt-1">
                            +${shift.premiumPay}/hr premium
                          </div>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Shift Details Dialog */}
          <Dialog open={!!selectedShift} onOpenChange={() => setSelectedShift(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{selectedShift?.title}</DialogTitle>
                <DialogDescription>
                  {selectedShift?.unit} • {selectedShift?.start.toLocaleDateString()}
                </DialogDescription>
              </DialogHeader>
              
              {selectedShift && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Shift Time</Label>
                      <p className="text-sm">
                        {selectedShift.start.toLocaleString()} - {selectedShift.end.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Hourly Rate</Label>
                      <p className="text-sm">
                        ${selectedShift.hourlyRate}/hour
                        {selectedShift.premiumPay && (
                          <span className="text-green-600"> (+${selectedShift.premiumPay} premium)</span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-gray-700">Assigned Staff ({selectedShift.assignedStaff.length}/{selectedShift.requiredStaff})</Label>
                    <div className="mt-2 space-y-3">
                      {selectedShift.assignedStaff.map((staffId) => {
                        const staff = mockStaff.find(s => s.id === staffId);
                        if (!staff) return null;
                        
                        return (
                          <div key={staff.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <h4 className="font-medium">{staff.firstName} {staff.lastName}</h4>
                                <Badge variant={staff.type === 'employee' ? 'default' : 'secondary'}>
                                  {staff.type}
                                </Badge>
                                {staff.clockedIn && (
                                  <Badge className="bg-green-100 text-green-800">
                                    Clocked In
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                                <div className="flex items-center space-x-1">
                                  <Phone className="w-3 h-3" />
                                  <span>{staff.contactInfo.phone}</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <Mail className="w-3 h-3" />
                                  <span>{staff.contactInfo.email}</span>
                                </div>
                              </div>
                              {staff.currentLocation && (
                                <div className="flex items-center space-x-1 mt-1 text-sm text-gray-500">
                                  <MapPin className="w-3 h-3" />
                                  <span>{staff.currentLocation.address} • {staff.currentLocation.distance} miles</span>
                                  <span className="text-xs">
                                    (Updated: {staff.currentLocation.lastUpdated.toLocaleTimeString()})
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-medium">${staff.hourlyRate}/hr</div>
                              <div className="text-xs text-gray-500">Score: {staff.reliabilityScore}%</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {selectedShift.notes && (
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Notes</Label>
                      <p className="text-sm mt-1">{selectedShift.notes}</p>
                    </div>
                  )}
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Bulk Schedule Dialog */}
          <Dialog open={showBulkSchedule} onOpenChange={setShowBulkSchedule}>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>Bulk Schedule Creator</DialogTitle>
                <DialogDescription>
                  Create multiple shifts at once using templates or custom settings
                </DialogDescription>
              </DialogHeader>

              <Tabs defaultValue="custom" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="custom">Custom Schedule</TabsTrigger>
                  <TabsTrigger value="template">Use Template</TabsTrigger>
                </TabsList>

                <TabsContent value="custom" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Select Days</Label>
                      <div className="mt-2 grid grid-cols-7 gap-2">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                          <div key={day} className="flex items-center space-x-2">
                            <Checkbox id={`day-${index}`} />
                            <Label htmlFor={`day-${index}`} className="text-xs">{day}</Label>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <Label>Time Range</Label>
                      <div className="mt-2 flex items-center space-x-2">
                        <Input 
                          type="time" 
                          value={bulkScheduleData.startTime}
                          onChange={(e) => setBulkScheduleData({...bulkScheduleData, startTime: e.target.value})}
                        />
                        <span>to</span>
                        <Input 
                          type="time" 
                          value={bulkScheduleData.endTime}
                          onChange={(e) => setBulkScheduleData({...bulkScheduleData, endTime: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>Position</Label>
                      <Select value={bulkScheduleData.position} onValueChange={(value) => setBulkScheduleData({...bulkScheduleData, position: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Position" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="RN">RN</SelectItem>
                          <SelectItem value="LPN">LPN</SelectItem>
                          <SelectItem value="CNA">CNA</SelectItem>
                          <SelectItem value="PT">PT</SelectItem>
                          <SelectItem value="OT">OT</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Unit</Label>
                      <Select value={bulkScheduleData.unit} onValueChange={(value) => setBulkScheduleData({...bulkScheduleData, unit: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Unit" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ICU">ICU</SelectItem>
                          <SelectItem value="Med-Surg">Med-Surg</SelectItem>
                          <SelectItem value="Memory Care">Memory Care</SelectItem>
                          <SelectItem value="Rehabilitation">Rehabilitation</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Shift Type</Label>
                      <Select value={bulkScheduleData.shiftType} onValueChange={(value: 'regular' | 'prn' | 'block') => setBulkScheduleData({...bulkScheduleData, shiftType: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="regular">Regular</SelectItem>
                          <SelectItem value="prn">PRN</SelectItem>
                          <SelectItem value="block">Block Schedule</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label>Premium Pay ($/hour) - Permission Required</Label>
                    <Input 
                      type="number" 
                      value={bulkScheduleData.premiumPay}
                      onChange={(e) => setBulkScheduleData({...bulkScheduleData, premiumPay: Number(e.target.value)})}
                      disabled={user.role !== 'admin'}
                      placeholder={user.role !== 'admin' ? 'Admin permission required' : '0'}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="template" className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    {scheduleTemplates.map((template) => (
                      <Card key={template.id} className={cn(
                        "cursor-pointer transition-all",
                        bulkScheduleData.selectedTemplate === template.id ? "ring-2 ring-blue-500 bg-blue-50" : "hover:shadow-md"
                      )} onClick={() => setBulkScheduleData({...bulkScheduleData, selectedTemplate: template.id})}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-semibold">{template.name}</h3>
                              <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                              <div className="mt-2 text-xs text-gray-500">
                                {template.shifts.length} shift types included
                              </div>
                            </div>
                            <Checkbox 
                              checked={bulkScheduleData.selectedTemplate === template.id}
                              onChange={() => {}}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setShowBulkSchedule(false)}>
                  Cancel
                </Button>
                <Button onClick={handleBulkScheduleSubmit}>
                  Create Shifts
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}