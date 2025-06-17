import { useState, useRef, useEffect } from "react";
import { Calendar, Clock, Users, MapPin, Filter, Plus, ChevronLeft, ChevronRight, Building, Stethoscope, Navigation, AlertCircle, Eye, User, DollarSign, FileText } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { SidebarNav } from "@/components/ui/sidebar-nav";
import { useToast } from "@/hooks/use-toast";
import { UserRole } from "@shared/schema";
import { hasPermission } from "@/lib/permissions";
import { cn } from "@/lib/utils";

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

// 100-bed skilled nursing facility with 4 units
const facilityUnits: Unit[] = [
  {
    id: 'icu',
    name: 'Intensive Care Unit',
    capacity: 20,
    currentCensus: 18,
    requiredStaffRatio: 0.25, // 1:4 ratio
    departments: ['ICU', 'Critical Care']
  },
  {
    id: 'medsurg',
    name: 'Medical-Surgical',
    capacity: 35,
    currentCensus: 32,
    requiredStaffRatio: 0.167, // 1:6 ratio
    departments: ['Med-Surg', 'General Medicine']
  },
  {
    id: 'memory',
    name: 'Memory Care',
    capacity: 25,
    currentCensus: 23,
    requiredStaffRatio: 0.2, // 1:5 ratio
    departments: ['Memory Care', 'Alzheimer\'s Care']
  },
  {
    id: 'rehab',
    name: 'Rehabilitation',
    capacity: 20,
    currentCensus: 17,
    requiredStaffRatio: 0.2, // 1:5 ratio
    departments: ['Physical Therapy', 'Occupational Therapy']
  }
];

// Comprehensive staff data for 100-bed facility
const mockStaff: Staff[] = [
  // ICU Staff - Employees
  { id: 'sarah-johnson', name: 'Sarah Johnson', position: 'RN', unit: 'ICU', type: 'employee', hourlyRate: 45, skills: ['Critical Care', 'Ventilator Management'], reliabilityScore: 96, isFavorite: true, availability: 'available', currentLocation: { lat: 40.7128, lng: -74.0060, distance: 2.3, lastUpdated: new Date() }, clockedIn: true, color: '#3B82F6' },
  { id: 'michael-chen', name: 'Michael Chen', position: 'RN', unit: 'ICU', type: 'employee', hourlyRate: 43, skills: ['Critical Care', 'ACLS'], reliabilityScore: 92, isFavorite: true, availability: 'available', color: '#3B82F6' },
  { id: 'lisa-martinez', name: 'Lisa Martinez', position: 'LPN', unit: 'ICU', type: 'employee', hourlyRate: 28, skills: ['IV Therapy', 'Medication Administration'], reliabilityScore: 89, isFavorite: false, availability: 'available', color: '#3B82F6' },
  { id: 'james-wilson', name: 'James Wilson', position: 'CNA', unit: 'ICU', type: 'employee', hourlyRate: 18, skills: ['Patient Care', 'Vital Signs'], reliabilityScore: 85, isFavorite: false, availability: 'available', color: '#3B82F6' },
  
  // ICU Staff - Contractors
  { id: 'david-thompson', name: 'David Thompson', position: 'RN', unit: 'ICU', type: 'contractor', hourlyRate: 65, skills: ['Critical Care', 'Travel Nursing'], reliabilityScore: 78, isFavorite: false, availability: 'available', currentLocation: { lat: 40.7580, lng: -73.9855, distance: 0.8, lastUpdated: new Date() }, color: '#F97316' },
  { id: 'amanda-garcia', name: 'Amanda Garcia', position: 'RN', unit: 'ICU', type: 'contractor', hourlyRate: 62, skills: ['ICU', 'Emergency Care'], reliabilityScore: 82, isFavorite: false, availability: 'limited', color: '#F97316' },
  
  // Med-Surg Staff - Employees
  { id: 'emily-rodriguez', name: 'Emily Rodriguez', position: 'RN', unit: 'Med-Surg', type: 'employee', hourlyRate: 42, skills: ['Medical-Surgical', 'Wound Care'], reliabilityScore: 94, isFavorite: true, availability: 'available', clockedIn: true, color: '#3B82F6' },
  { id: 'robert-davis', name: 'Robert Davis', position: 'RN', unit: 'Med-Surg', type: 'employee', hourlyRate: 41, skills: ['General Medicine', 'Patient Education'], reliabilityScore: 90, isFavorite: false, availability: 'available', color: '#3B82F6' },
  { id: 'maria-gonzalez', name: 'Maria Gonzalez', position: 'LPN', unit: 'Med-Surg', type: 'employee', hourlyRate: 26, skills: ['Medication Management', 'Patient Care'], reliabilityScore: 88, isFavorite: true, availability: 'available', color: '#3B82F6' },
  { id: 'chris-taylor', name: 'Chris Taylor', position: 'CNA', unit: 'Med-Surg', type: 'employee', hourlyRate: 17, skills: ['Patient Care', 'Mobility Assistance'], reliabilityScore: 86, isFavorite: false, availability: 'available', color: '#3B82F6' },
  { id: 'jennifer-brown', name: 'Jennifer Brown', position: 'CNA', unit: 'Med-Surg', type: 'employee', hourlyRate: 17, skills: ['Patient Care', 'Documentation'], reliabilityScore: 83, isFavorite: false, availability: 'available', color: '#3B82F6' },
  
  // Med-Surg Staff - Contractors  
  { id: 'kevin-lee', name: 'Kevin Lee', position: 'RN', unit: 'Med-Surg', type: 'contractor', hourlyRate: 58, skills: ['Med-Surg', 'Charge Nurse'], reliabilityScore: 87, isFavorite: false, availability: 'available', color: '#F97316' },
  { id: 'stephanie-white', name: 'Stephanie White', position: 'LPN', unit: 'Med-Surg', type: 'contractor', hourlyRate: 35, skills: ['Medication Administration', 'Wound Care'], reliabilityScore: 79, isFavorite: false, availability: 'available', color: '#F97316' },
  
  // Memory Care Staff - Employees
  { id: 'rachel-kim', name: 'Rachel Kim', position: 'RN', unit: 'Memory Care', type: 'employee', hourlyRate: 44, skills: ['Dementia Care', 'Behavioral Management'], reliabilityScore: 93, isFavorite: true, availability: 'available', color: '#3B82F6' },
  { id: 'daniel-moore', name: 'Daniel Moore', position: 'LPN', unit: 'Memory Care', type: 'employee', hourlyRate: 27, skills: ['Memory Care', 'Activity Therapy'], reliabilityScore: 91, isFavorite: true, availability: 'available', color: '#3B82F6' },
  { id: 'susan-clark', name: 'Susan Clark', position: 'CNA', unit: 'Memory Care', type: 'employee', hourlyRate: 18, skills: ['Dementia Care', 'Personal Care'], reliabilityScore: 84, isFavorite: false, availability: 'available', color: '#3B82F6' },
  
  // Memory Care Staff - Contractors
  { id: 'jason-harris', name: 'Jason Harris', position: 'RN', unit: 'Memory Care', type: 'contractor', hourlyRate: 60, skills: ['Memory Care', 'Psychiatric Nursing'], reliabilityScore: 81, isFavorite: false, availability: 'available', color: '#F97316' },
  
  // Rehabilitation Staff - Employees
  { id: 'nicole-adams', name: 'Nicole Adams', position: 'RN', unit: 'Rehabilitation', type: 'employee', hourlyRate: 43, skills: ['Rehabilitation', 'Physical Therapy'], reliabilityScore: 95, isFavorite: true, availability: 'available', color: '#3B82F6' },
  { id: 'mark-nelson', name: 'Mark Nelson', position: 'PT', unit: 'Rehabilitation', type: 'employee', hourlyRate: 38, skills: ['Physical Therapy', 'Mobility Training'], reliabilityScore: 92, isFavorite: false, availability: 'available', color: '#3B82F6' },
  { id: 'laura-scott', name: 'Laura Scott', position: 'OT', unit: 'Rehabilitation', type: 'employee', hourlyRate: 36, skills: ['Occupational Therapy', 'ADL Training'], reliabilityScore: 89, isFavorite: false, availability: 'available', color: '#3B82F6' },
  
  // Rehabilitation Staff - Contractors
  { id: 'brian-turner', name: 'Brian Turner', position: 'PT', unit: 'Rehabilitation', type: 'contractor', hourlyRate: 55, skills: ['Physical Therapy', 'Sports Medicine'], reliabilityScore: 86, isFavorite: false, availability: 'available', color: '#F97316' }
];

// Comprehensive shift data for next 7 days
const generateShiftsForFacility = (): Shift[] => {
  const shifts: Shift[] = [];
  const today = new Date();
  
  // Generate shifts for next 7 days
  for (let day = 0; day < 7; day++) {
    const shiftDate = new Date(today);
    shiftDate.setDate(today.getDate() + day);
    
    facilityUnits.forEach(unit => {
      // Day shift 7AM-7PM
      shifts.push({
        id: `${unit.id}-day-${day}`,
        title: `Day Shift - ${unit.name}`,
        start: new Date(shiftDate.getFullYear(), shiftDate.getMonth(), shiftDate.getDate(), 7, 0),
        end: new Date(shiftDate.getFullYear(), shiftDate.getMonth(), shiftDate.getDate(), 19, 0),
        unit: unit.name,
        position: 'RN',
        requiredStaff: Math.ceil(unit.currentCensus * unit.requiredStaffRatio),
        assignedStaff: day === 0 ? mockStaff.filter(s => s.unit === unit.name && s.clockedIn).slice(0, 2) : [],
        hourlyRate: 42,
        status: day === 0 ? 'in-progress' : Math.random() > 0.7 ? 'open' : 'filled',
        facilityId: 1,
        createdBy: 'facility-manager',
        requirements: ['Current License', 'CPR Certification'],
        notes: `${unit.currentCensus} patients, ${unit.requiredStaffRatio * 100}% staff ratio required`
      });
      
      // Night shift 7PM-7AM
      shifts.push({
        id: `${unit.id}-night-${day}`,
        title: `Night Shift - ${unit.name}`,
        start: new Date(shiftDate.getFullYear(), shiftDate.getMonth(), shiftDate.getDate(), 19, 0),
        end: new Date(shiftDate.getFullYear(), shiftDate.getMonth(), shiftDate.getDate() + 1, 7, 0),
        unit: unit.name,
        position: 'RN',
        requiredStaff: Math.ceil(unit.currentCensus * unit.requiredStaffRatio * 0.8), // Reduced staffing at night
        assignedStaff: Math.random() > 0.6 ? [] : mockStaff.filter(s => s.unit === unit.name).slice(0, 1),
        hourlyRate: 45, // Night differential
        status: Math.random() > 0.5 ? 'open' : 'filled',
        facilityId: 1,
        createdBy: 'facility-manager',
        requirements: ['Current License', 'CPR Certification', 'Night Shift Experience'],
        notes: `Overnight coverage, reduced census expected`
      });
      
      // Support staff shifts (CNA/LPN)
      if (unit.currentCensus > 15) {
        shifts.push({
          id: `${unit.id}-support-day-${day}`,
          title: `CNA Day Support - ${unit.name}`,
          start: new Date(shiftDate.getFullYear(), shiftDate.getMonth(), shiftDate.getDate(), 7, 0),
          end: new Date(shiftDate.getFullYear(), shiftDate.getMonth(), shiftDate.getDate(), 15, 0),
          unit: unit.name,
          position: 'CNA',
          requiredStaff: 2,
          assignedStaff: Math.random() > 0.4 ? [] : mockStaff.filter(s => s.unit === unit.name && s.position === 'CNA').slice(0, 1),
          hourlyRate: 17,
          status: Math.random() > 0.6 ? 'open' : 'filled',
          facilityId: 1,
          createdBy: 'facility-manager',
          requirements: ['CNA Certification'],
          notes: `Patient care support, high-acuity unit`
        });
      }
    });
  }
  
  return shifts;
};

const mockShifts = generateShiftsForFacility();

type CalendarView = 'next7days' | 'month' | 'daily';

export default function EnhancedSchedulingPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [isShiftDetailsOpen, setIsShiftDetailsOpen] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [shifts, setShifts] = useState<Shift[]>(mockShifts);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedUnit, setSelectedUnit] = useState<string>('all');
  const [selectedPosition, setSelectedPosition] = useState<string>('all');
  const [calendarView, setCalendarView] = useState<CalendarView>('next7days');
  const [isCreateShiftOpen, setIsCreateShiftOpen] = useState(false);
  
  // New shift form data
  const [newShift, setNewShift] = useState({
    title: '',
    start: '',
    end: '',
    unit: '',
    position: 'RN',
    requiredStaff: 1,
    hourlyRate: 42,
    requirements: '',
    notes: ''
  });

  if (!user) return null;

  const canCreateShifts = hasPermission(user.role as UserRole, 'shifts.create');
  const canEditShifts = hasPermission(user.role as UserRole, 'shifts.edit');

  const handleCreateShift = () => {
    if (!newShift.title || !newShift.start || !newShift.end || !newShift.unit) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    const shift: Shift = {
      id: `shift-${Date.now()}`,
      title: newShift.title,
      start: new Date(newShift.start),
      end: new Date(newShift.end),
      unit: newShift.unit,
      position: newShift.position,
      requiredStaff: newShift.requiredStaff,
      assignedStaff: [],
      hourlyRate: newShift.hourlyRate,
      status: 'open',
      facilityId: 1,
      createdBy: user.username,
      requirements: newShift.requirements.split(',').map(r => r.trim()).filter(r => r),
      notes: newShift.notes
    };

    setShifts(prev => [...prev, shift]);
    setIsCreateShiftOpen(false);
    setNewShift({
      title: '',
      start: '',
      end: '',
      unit: '',
      position: 'RN',
      requiredStaff: 1,
      hourlyRate: 42,
      requirements: '',
      notes: ''
    });

    toast({
      title: "Shift Created",
      description: "New shift has been added to the schedule",
    });
  };

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

  const getStaffTypeColor = (type: string) => {
    return type === 'employee' ? 'text-blue-600' : 'text-orange-600';
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
                <div key={shift.id} className={cn("p-2 rounded text-xs border", getStatusColor(shift.status))}>
                  <div className="font-medium truncate">{shift.title}</div>
                  <div className="text-xs opacity-75">
                    {shift.start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} - 
                    {shift.end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span>{shift.assignedStaff.length}/{shift.requiredStaff}</span>
                    <span>${shift.hourlyRate}/hr</span>
                  </div>
                </div>
              ))}
              {getShiftsForDate(date).length > 4 && (
                <div className="text-xs text-gray-500 text-center">
                  +{getShiftsForDate(date).length - 4} more
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderDailyView = () => {
    const selectedDayShifts = getShiftsForDate(selectedDate);
    
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            {selectedDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </h3>
          <div className="flex space-x-2">
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

        {facilityUnits.map(unit => (
          <Card key={unit.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center space-x-2">
                    <Building className="w-5 h-5" />
                    <span>{unit.name}</span>
                  </CardTitle>
                  <CardDescription>
                    Census: {unit.currentCensus}/{unit.capacity} | Required Ratio: 1:{Math.round(1/unit.requiredStaffRatio)}
                  </CardDescription>
                </div>
                <Badge variant="outline">
                  {Math.round((unit.currentCensus / unit.capacity) * 100)}% Occupied
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {getShiftsForUnit(unit.name, selectedDate).map(shift => (
                  <div 
                    key={shift.id} 
                    className={cn("p-3 rounded-lg border cursor-pointer hover:shadow-md transition-shadow", getStatusColor(shift.status))}
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
                        <Badge className={cn("text-xs", getStatusColor(shift.status))}>
                          {shift.status.charAt(0).toUpperCase() + shift.status.slice(1)}
                        </Badge>
                        <Button variant="ghost" size="sm" className="h-6 px-2">
                          <Eye className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    
                    {shift.assignedStaff.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <h5 className="text-sm font-medium">Assigned Staff:</h5>
                        <div className="space-y-1">
                          {shift.assignedStaff.map(staff => (
                            <div key={staff.id} className="flex items-center justify-between text-sm">
                              <div className="flex items-center space-x-2">
                                <span className={getStaffTypeColor(staff.type)}>{staff.name}</span>
                                <Badge variant="outline" className="text-xs">{staff.position}</Badge>
                                {staff.currentLocation && (
                                  <div className="flex items-center space-x-1 text-xs text-gray-500">
                                    <Navigation className="w-3 h-3" />
                                    <span>{staff.currentLocation.distance.toFixed(1)} mi away</span>
                                  </div>
                                )}
                                {staff.clockedIn && (
                                  <Badge variant="default" className="text-xs bg-green-600">Clocked In</Badge>
                                )}
                              </div>
                              <div className="flex items-center space-x-1">
                                <span className="text-xs">Reliability: {staff.reliabilityScore}%</span>
                                {staff.isFavorite && <span className="text-yellow-500">⭐</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {shift.status === 'in-progress' && shift.assignedStaff.some(s => s.currentLocation) && (
                      <div className="mt-3 p-2 bg-blue-50 rounded border">
                        <h5 className="text-sm font-medium text-blue-800 mb-1">Live Tracking</h5>
                        {shift.assignedStaff.filter(s => s.currentLocation).map(staff => (
                          <div key={staff.id} className="text-xs text-blue-600">
                            {staff.name}: {staff.currentLocation!.distance.toFixed(1)} miles from facility
                            {staff.clockedIn ? ' (On-site)' : ' (En route)'}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                
                {getShiftsForUnit(unit.name, selectedDate).length === 0 && (
                  <div className="text-center text-gray-500 py-4">
                    No shifts scheduled for this unit today
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  const renderMonthView = () => {
    // Simplified month view - would typically use a calendar library
    const daysInMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate();
    const firstDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1).getDay();
    
    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    return (
      <div className="grid grid-cols-7 gap-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="p-2 text-center font-semibold bg-gray-100">
            {day}
          </div>
        ))}
        {days.map((day, index) => (
          <div key={index} className="border min-h-[100px] p-1">
            {day && (
              <>
                <div className="font-semibold text-sm">{day}</div>
                <div className="space-y-1">
                  {getShiftsForDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day))
                    .slice(0, 2).map(shift => (
                    <div key={shift.id} className={cn("text-xs p-1 rounded", getStatusColor(shift.status))}>
                      {shift.unit} - {shift.position}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <SidebarNav 
        user={user} 
        expanded={sidebarExpanded}
        onToggle={() => setSidebarExpanded(!sidebarExpanded)}
      />

      <main className="flex-1 overflow-x-hidden overflow-y-auto">
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Advanced Scheduling</h2>
              <p className="text-sm text-gray-500">
                100-bed skilled nursing facility scheduling system
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              {canCreateShifts && (
                <Dialog open={isCreateShiftOpen} onOpenChange={setIsCreateShiftOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Shift
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Create New Shift</DialogTitle>
                      <DialogDescription>
                        Schedule a new shift for your facility
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="title">Shift Title *</Label>
                        <Input
                          id="title"
                          value={newShift.title}
                          onChange={(e) => setNewShift(prev => ({ ...prev, title: e.target.value }))}
                          placeholder="e.g., RN Day Shift - ICU"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="unit">Unit *</Label>
                        <Select value={newShift.unit} onValueChange={(value) => setNewShift(prev => ({ ...prev, unit: value }))}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select unit" />
                          </SelectTrigger>
                          <SelectContent>
                            {facilityUnits.map(unit => (
                              <SelectItem key={unit.id} value={unit.name}>{unit.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label htmlFor="start">Start Date & Time *</Label>
                        <Input
                          id="start"
                          type="datetime-local"
                          value={newShift.start}
                          onChange={(e) => setNewShift(prev => ({ ...prev, start: e.target.value }))}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="end">End Date & Time *</Label>
                        <Input
                          id="end"
                          type="datetime-local"
                          value={newShift.end}
                          onChange={(e) => setNewShift(prev => ({ ...prev, end: e.target.value }))}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="position">Position</Label>
                        <Select value={newShift.position} onValueChange={(value) => setNewShift(prev => ({ ...prev, position: value }))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="RN">RN</SelectItem>
                            <SelectItem value="LPN">LPN</SelectItem>
                            <SelectItem value="CNA">CNA</SelectItem>
                            <SelectItem value="PT">Physical Therapist</SelectItem>
                            <SelectItem value="OT">Occupational Therapist</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label htmlFor="requiredStaff">Required Staff</Label>
                        <Input
                          id="requiredStaff"
                          type="number"
                          min="1"
                          value={newShift.requiredStaff}
                          onChange={(e) => setNewShift(prev => ({ ...prev, requiredStaff: parseInt(e.target.value) }))}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="hourlyRate">Hourly Rate ($)</Label>
                        <Input
                          id="hourlyRate"
                          type="number"
                          min="0"
                          step="0.01"
                          value={newShift.hourlyRate}
                          onChange={(e) => setNewShift(prev => ({ ...prev, hourlyRate: parseFloat(e.target.value) }))}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="requirements">Requirements (comma-separated)</Label>
                        <Input
                          id="requirements"
                          value={newShift.requirements}
                          onChange={(e) => setNewShift(prev => ({ ...prev, requirements: e.target.value }))}
                          placeholder="e.g., Current License, CPR Certification"
                        />
                      </div>
                      
                      <div className="md:col-span-2">
                        <Label htmlFor="notes">Notes</Label>
                        <Textarea
                          id="notes"
                          value={newShift.notes}
                          onChange={(e) => setNewShift(prev => ({ ...prev, notes: e.target.value }))}
                          placeholder="Additional information about this shift"
                        />
                      </div>
                    </div>
                    
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => setIsCreateShiftOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreateShift}>
                        Create Shift
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
        </header>

        <div className="p-6">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div>
                <Label>Calendar View</Label>
                <Select value={calendarView} onValueChange={(value: CalendarView) => setCalendarView(value)}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="next7days">Next 7 Days</SelectItem>
                    <SelectItem value="month">Month View</SelectItem>
                    <SelectItem value="daily">Daily Breakdown</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Filter by Unit</Label>
                <Select value={selectedUnit} onValueChange={setSelectedUnit}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Units</SelectItem>
                    {facilityUnits.map(unit => (
                      <SelectItem key={unit.id} value={unit.name}>{unit.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Filter by Position</Label>
                <Select value={selectedPosition} onValueChange={setSelectedPosition}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
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
              </div>
            </div>
          </div>

          <Card>
            <CardContent className="p-6">
              {calendarView === 'next7days' && renderNext7DaysView()}
              {calendarView === 'daily' && renderDailyView()}
              {calendarView === 'month' && renderMonthView()}
            </CardContent>
          </Card>
        </div>

        {/* Shift Details Modal */}
        <Dialog open={isShiftDetailsOpen} onOpenChange={setIsShiftDetailsOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <Stethoscope className="w-5 h-5" />
                <span>Shift Details</span>
              </DialogTitle>
              <DialogDescription>
                Complete information for this shift assignment
              </DialogDescription>
            </DialogHeader>
            
            {selectedShift && (
              <div className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Position</Label>
                    <div className="mt-1 text-sm">{selectedShift.position}</div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Unit</Label>
                    <div className="mt-1 text-sm">{selectedShift.unit}</div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Shift Time</Label>
                    <div className="mt-1 text-sm flex items-center space-x-1">
                      <Clock className="w-4 h-4" />
                      <span>
                        {selectedShift.start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} - 
                        {selectedShift.end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Hourly Rate</Label>
                    <div className="mt-1 text-sm flex items-center space-x-1">
                      <DollarSign className="w-4 h-4" />
                      <span>${selectedShift.hourlyRate}/hour</span>
                    </div>
                  </div>
                </div>

                {/* Status */}
                <div>
                  <Label className="text-sm font-medium text-gray-700">Status</Label>
                  <div className="mt-1">
                    <Badge className={getStatusColor(selectedShift.status)}>
                      {selectedShift.status.charAt(0).toUpperCase() + selectedShift.status.slice(1)}
                    </Badge>
                  </div>
                </div>

                {/* Assigned Staff */}
                <div>
                  <Label className="text-sm font-medium text-gray-700">Assigned Staff ({selectedShift.assignedStaff.length}/{selectedShift.requiredStaff})</Label>
                  <div className="mt-2 space-y-2">
                    {selectedShift.assignedStaff.length > 0 ? (
                      selectedShift.assignedStaff.map(staff => (
                        <div key={staff.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className={cn("w-3 h-3 rounded-full", staff.type === 'employee' ? 'bg-blue-500' : 'bg-orange-500')}></div>
                            <div>
                              <div className="font-medium">{staff.name}</div>
                              <div className="text-sm text-gray-600">{staff.position} • {staff.type}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium">${staff.hourlyRate}/hr</div>
                            <div className="text-xs text-gray-500">Reliability: {staff.reliabilityScore}%</div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-gray-500 italic p-3 bg-gray-50 rounded-lg">
                        No staff assigned to this shift
                      </div>
                    )}
                  </div>
                </div>

                {/* Requirements */}
                {selectedShift.requirements && selectedShift.requirements.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Requirements</Label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {selectedShift.requirements.map((req, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {req}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {selectedShift.notes && (
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Notes</Label>
                    <div className="mt-1 p-3 bg-gray-50 rounded-lg text-sm">
                      {selectedShift.notes}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-end space-x-2 pt-4 border-t">
                  <Button variant="outline" onClick={() => setIsShiftDetailsOpen(false)}>
                    Close
                  </Button>
                  <Button>
                    Edit Shift
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}