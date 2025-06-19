import { useState } from 'react';
import { format, parseISO, addDays, startOfWeek, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Clock, DollarSign, MapPin, Users, Building, Plus, Filter, ChevronLeft, ChevronRight, ArrowLeft, CalendarDays, Home } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';

interface Shift {
  id: number;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  department: string;
  specialty: string;
  status: 'open' | 'assigned' | 'requested' | 'in_progress' | 'completed' | 'cancelled' | 'ncns' | 'facility_cancelled';
  facilityId: number;
  facilityName?: string;
  rate: number;
  urgency?: 'low' | 'medium' | 'high' | 'critical';
  description?: string;
  isUnderStaffed?: boolean;
  currentStaff?: number;
  requiredStaff?: number;
}

interface ShiftRequest {
  id: number;
  shiftId: number;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  department: string;
  specialty: string;
  facilityName: string;
  status: string;
  urgency: string;
  requestedWorkers: RequestedWorker[];
}

interface RequestedWorker {
  id: number;
  name: string;
  reliabilityScore: number;
  totalShiftsWorked: number;
  isFavorite: boolean;
  specialty: string;
  certifications: string[];
  profileUrl: string;
}

interface BlockShift {
  id: number;
  title: string;
  startDate: string;
  endDate: string;
  department: string;
  specialty: string;
  quantity: number;
  rate: number;
  description?: string;
}

interface ShiftPostingForm {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  department: string;
  specialty: string;
  facilityId: number;
  rate: number;
  premiumMultiplier: number;
  urgency: string;
  description: string;
  isBlockShift: boolean;
  blockEndDate: string;
  blockQuantity: number;
}

const PRESET_TIMES = [
  { label: '7:00 AM - 7:00 PM', start: '07:00', end: '19:00' },
  { label: '7:00 PM - 7:00 AM', start: '19:00', end: '07:00' },
  { label: '6:00 AM - 6:00 PM', start: '06:00', end: '18:00' },
  { label: '6:00 PM - 6:00 AM', start: '18:00', end: '06:00' },
  { label: '8:00 AM - 8:00 PM', start: '08:00', end: '20:00' },
  { label: '8:00 PM - 8:00 AM', start: '20:00', end: '08:00' },
];

const BASE_RATES = {
  'Registered Nurse': 35,
  'Licensed Practical Nurse': 28,
  'Certified Nursing Assistant': 18,
  'Physical Therapist': 45,
  'Respiratory Therapist': 32,
  'Medical Doctor': 85,
  'Nurse Practitioner': 55,
  'Physician Assistant': 50,
};

const SPECIALTIES = [
  'Registered Nurse',
  'Licensed Practical Nurse', 
  'Certified Nursing Assistant',
  'Physical Therapist',
  'Respiratory Therapist',
  'Medical Doctor',
  'Nurse Practitioner',
  'Physician Assistant'
];

const DEPARTMENTS = [
  'Emergency Department',
  'Intensive Care Unit',
  'Medical/Surgical',
  'Pediatrics',
  'Oncology',
  'Cardiology',
  'Orthopedics',
  'Rehabilitation',
  'Operating Room',
  'Labor & Delivery'
];

function getSpecialtyAbbreviation(specialty: string): string {
  const abbreviations: { [key: string]: string } = {
    'Registered Nurse': 'RN',
    'Licensed Practical Nurse': 'LPN',
    'Certified Nursing Assistant': 'CNA',
    'Physical Therapist': 'PT',
    'Respiratory Therapist': 'RT',
    'Medical Doctor': 'MD',
    'Nurse Practitioner': 'NP',
    'Physician Assistant': 'PA'
  };
  return abbreviations[specialty] || specialty;
}

export default function UnifiedCalendarPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [showPostingDialog, setShowPostingDialog] = useState(false);
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [selectedFilters, setSelectedFilters] = useState({
    facility: 'all',
    specialty: 'all',
    department: 'all',
    urgency: 'all'
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [shiftForm, setShiftForm] = useState<ShiftPostingForm>({
    title: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    startTime: '07:00',
    endTime: '19:00',
    department: '',
    specialty: '',
    facilityId: 1,
    rate: 35,
    premiumMultiplier: 1.0,
    urgency: 'medium',
    description: '',
    isBlockShift: false,
    blockEndDate: '',
    blockQuantity: 1
  });

  // Fetch shifts data
  const { data: shifts = [], isLoading: shiftsLoading } = useQuery({
    queryKey: ['/api/shifts'],
  });

  // Fetch block shifts data
  const { data: blockShifts = [], isLoading: blockShiftsLoading } = useQuery({
    queryKey: ['/api/block-shifts'],
  });

  // Fetch facilities for form
  const { data: facilities = [] } = useQuery({
    queryKey: ['/api/facilities'],
  });

  // Fetch shift requests data
  const { data: shiftRequests = [] } = useQuery({
    queryKey: ['/api/shift-requests'],
  });

  // Post shift mutation
  const postShiftMutation = useMutation({
    mutationFn: async (shiftData: any) => {
      const endpoint = shiftData.isBlockShift ? '/api/block-shifts' : '/api/shifts';
      return fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(shiftData),
      }).then(res => res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/shifts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/block-shifts'] });
      setShowPostingDialog(false);
      toast({
        title: 'Success',
        description: 'Shift posted successfully',
      });
      setShiftForm({
        title: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        startTime: '07:00',
        endTime: '19:00',
        department: '',
        specialty: '',
        facilityId: 1,
        rate: 35,
        premiumMultiplier: 1.0,
        urgency: 'medium',
        description: '',
        isBlockShift: false,
        blockEndDate: '',
        blockQuantity: 1
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to post shift',
        variant: 'destructive',
      });
    },
  });

  // Generate week view dates
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Generate month view dates
  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(selectedDate);
  const monthDates = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Filter shifts based on selected filters
  const filteredShifts = shifts.filter((shift: Shift) => {
    if (selectedFilters.facility !== 'all' && shift.facilityId.toString() !== selectedFilters.facility) return false;
    if (selectedFilters.specialty !== 'all' && shift.specialty !== selectedFilters.specialty) return false;
    if (selectedFilters.department !== 'all' && shift.department !== selectedFilters.department) return false;
    if (selectedFilters.urgency !== 'all' && shift.urgency !== selectedFilters.urgency) return false;
    return true;
  });

  const handlePresetTimeSelect = (preset: typeof PRESET_TIMES[0]) => {
    setShiftForm(prev => ({
      ...prev,
      startTime: preset.start,
      endTime: preset.end
    }));
  };

  const handleSpecialtyChange = (specialty: string) => {
    const baseRate = BASE_RATES[specialty as keyof typeof BASE_RATES] || 35;
    setShiftForm(prev => ({
      ...prev,
      specialty,
      rate: Math.round(baseRate * prev.premiumMultiplier)
    }));
  };

  const handlePremiumMultiplierChange = (multiplier: number) => {
    const baseRate = BASE_RATES[shiftForm.specialty as keyof typeof BASE_RATES] || 35;
    setShiftForm(prev => ({
      ...prev,
      premiumMultiplier: multiplier,
      rate: Math.round(baseRate * multiplier)
    }));
  };

  const handleSubmitShift = () => {
    if (!shiftForm.title || !shiftForm.specialty || !shiftForm.department) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    const shiftData = {
      ...shiftForm,
      facilityName: facilities.find((f: any) => f.id === shiftForm.facilityId)?.name || 'Unknown Facility'
    };

    postShiftMutation.mutate(shiftData);
  };

  const getShiftsForDate = (date: Date) => {
    return filteredShifts.filter((shift: Shift) => 
      isSameDay(parseISO(shift.date), date)
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-gradient-to-r from-emerald-100 to-emerald-200 text-emerald-800 border border-emerald-300 shadow-emerald-100';
      case 'assigned': return 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border border-blue-300 shadow-blue-100';
      case 'requested': return 'bg-gradient-to-r from-amber-100 to-amber-200 text-amber-800 border border-amber-300 shadow-amber-100';
      case 'in_progress': return 'bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800 border border-purple-300 shadow-purple-100';
      case 'completed': return 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border border-green-300 shadow-green-100';
      case 'cancelled': return 'bg-gradient-to-r from-red-100 to-red-200 text-red-800 border border-red-300 shadow-red-100';
      case 'ncns': return 'bg-gradient-to-r from-red-200 to-red-300 text-red-900 border border-red-400 shadow-red-200';
      case 'facility_cancelled': return 'bg-gradient-to-r from-orange-100 to-orange-200 text-orange-800 border border-orange-300 shadow-orange-100';
      default: return 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border border-gray-300';
    }
  };

  const getUrgencyColor = (urgency?: string) => {
    switch (urgency) {
      case 'critical': return 'border-red-500 bg-gradient-to-br from-red-50 to-red-100 shadow-lg shadow-red-200/50';
      case 'high': return 'border-orange-500 bg-gradient-to-br from-orange-50 to-orange-100 shadow-lg shadow-orange-200/50';
      case 'medium': return 'border-yellow-500 bg-gradient-to-br from-yellow-50 to-yellow-100 shadow-md shadow-yellow-200/50';
      case 'low': return 'border-green-500 bg-gradient-to-br from-green-50 to-green-100 shadow-md shadow-green-200/50';
      default: return 'border-gray-300 bg-gradient-to-br from-gray-50 to-gray-100 shadow-sm';
    }
  };

  const getSpecialtyBadgeColor = (specialty: string) => {
    const colors: { [key: string]: string } = {
      'Registered Nurse': 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-blue-300',
      'Licensed Practical Nurse': 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-indigo-300',
      'Certified Nursing Assistant': 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-purple-300',
      'Physical Therapist': 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-green-300',
      'Respiratory Therapist': 'bg-gradient-to-r from-teal-500 to-teal-600 text-white shadow-teal-300',
      'Medical Doctor': 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-red-300',
      'Nurse Practitioner': 'bg-gradient-to-r from-pink-500 to-pink-600 text-white shadow-pink-300',
      'Physician Assistant': 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-orange-300'
    };
    return colors[specialty] || 'bg-gradient-to-r from-gray-500 to-gray-600 text-white shadow-gray-300';
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="outline" size="sm">
              <Home className="h-4 w-4 mr-2" />
              Home
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Unified Calendar</h1>
            <p className="text-muted-foreground">
              Comprehensive scheduling and shift management
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
          <Link to="/scheduling-config">
            <Button variant="outline" size="sm">
              <CalendarDays className="h-4 w-4 mr-2" />
              Configuration
            </Button>
          </Link>
          <Button onClick={() => setShowPostingDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Post Shift
          </Button>
        </div>
      </div>

      {/* Calendar Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedDate(viewMode === 'week' ? addDays(selectedDate, -7) : addDays(selectedDate, -30))}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous {viewMode === 'week' ? 'Week' : 'Month'}
          </Button>
          <h2 className="text-xl font-semibold">
            {viewMode === 'week' 
              ? `${format(weekStart, 'MMM d')} - ${format(addDays(weekStart, 6), 'MMM d, yyyy')}`
              : format(selectedDate, 'MMMM yyyy')
            }
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedDate(viewMode === 'week' ? addDays(selectedDate, 7) : addDays(selectedDate, 30))}
          >
            Next {viewMode === 'week' ? 'Week' : 'Month'}
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'week' | 'month')}>
            <TabsList>
              <TabsTrigger value="week">Week View</TabsTrigger>
              <TabsTrigger value="month">Month View</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedDate(new Date())}
          >
            Today
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Facility</Label>
              <Select value={selectedFilters.facility} onValueChange={(value) => 
                setSelectedFilters(prev => ({ ...prev, facility: value }))
              }>
                <SelectTrigger>
                  <SelectValue placeholder="All Facilities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Facilities</SelectItem>
                  {facilities.map((facility: any) => (
                    <SelectItem key={facility.id} value={facility.id.toString()}>
                      {facility.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Specialty</Label>
              <Select value={selectedFilters.specialty} onValueChange={(value) => 
                setSelectedFilters(prev => ({ ...prev, specialty: value }))
              }>
                <SelectTrigger>
                  <SelectValue placeholder="All Specialties" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Specialties</SelectItem>
                  {SPECIALTIES.map((specialty) => (
                    <SelectItem key={specialty} value={specialty}>
                      {getSpecialtyAbbreviation(specialty)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Department</Label>
              <Select value={selectedFilters.department} onValueChange={(value) => 
                setSelectedFilters(prev => ({ ...prev, department: value }))
              }>
                <SelectTrigger>
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {DEPARTMENTS.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Urgency</Label>
              <Select value={selectedFilters.urgency} onValueChange={(value) => 
                setSelectedFilters(prev => ({ ...prev, urgency: value }))
              }>
                <SelectTrigger>
                  <SelectValue placeholder="All Urgency Levels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Urgency Levels</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar Grid */}
      <Card>
        <CardHeader>
          <CardTitle>{viewMode === 'week' ? '7-Day Calendar View' : 'Monthly Calendar View'}</CardTitle>
        </CardHeader>
        <CardContent>
          {viewMode === 'week' ? (
            <div className="grid grid-cols-7 gap-2">
              {weekDates.map((date, index) => {
                const dayShifts = getShiftsForDate(date);
                const isToday = isSameDay(date, new Date());
                
                return (
                  <div
                    key={index}
                    className={`min-h-[200px] p-2 border rounded-lg ${
                      isToday ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'
                    }`}
                  >
                    <div className="font-semibold text-sm mb-2">
                      {format(date, 'EEE')}
                      <br />
                      {format(date, 'MMM d')}
                    </div>
                    <div className="space-y-1">
                      {dayShifts.map((shift: Shift) => (
                        <div
                          key={shift.id}
                          className={`p-2 rounded text-xs cursor-pointer border-l-4 ${getUrgencyColor(shift.urgency)}`}
                          onClick={() => setSelectedShift(shift)}
                        >
                          <div className="font-medium truncate">{shift.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {shift.startTime} - {shift.endTime}
                          </div>
                          <div className="flex items-center justify-between">
                            <Badge className={`text-xs ${getSpecialtyBadgeColor(shift.specialty)} shadow-sm`}>
                              {getSpecialtyAbbreviation(shift.specialty)}
                            </Badge>
                            <span className="text-xs font-medium text-green-600">${shift.rate}/hr</span>
                          </div>
                          <Badge className={`text-xs ${getStatusColor(shift.status)}`}>
                            {shift.status.replace('_', ' ')}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="p-2 text-center font-semibold text-sm border-b">
                  {day}
                </div>
              ))}
              {monthDates.map((date, index) => {
                const dayShifts = getShiftsForDate(date);
                const isToday = isSameDay(date, new Date());
                const isCurrentMonth = isSameMonth(date, selectedDate);
                
                return (
                  <div
                    key={index}
                    className={`min-h-[100px] p-1 border rounded-sm ${
                      isToday ? 'bg-blue-50 border-blue-200' : 
                      isCurrentMonth ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-100'
                    }`}
                  >
                    <div className={`text-xs font-medium mb-1 ${
                      isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
                    }`}>
                      {format(date, 'd')}
                    </div>
                    <div className="space-y-1">
                      {dayShifts.slice(0, 3).map((shift: Shift) => (
                        <div
                          key={shift.id}
                          className={`p-1 rounded text-xs cursor-pointer truncate ${getUrgencyColor(shift.urgency)}`}
                          onClick={() => setSelectedShift(shift)}
                          title={`${shift.title} - ${shift.startTime}-${shift.endTime}`}
                        >
                          <div className="font-medium truncate">{getSpecialtyAbbreviation(shift.specialty)}</div>
                        </div>
                      ))}
                      {dayShifts.length > 3 && (
                        <div className="text-xs text-muted-foreground">
                          +{dayShifts.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Block Shifts Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Active Block Shifts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {blockShifts.map((blockShift: BlockShift) => (
              <Card key={blockShift.id} className="p-4">
                <div className="space-y-2">
                  <div className="font-semibold">{blockShift.title}</div>
                  <div className="text-sm text-muted-foreground">
                    {format(parseISO(blockShift.startDate), 'MMM d')} - {format(parseISO(blockShift.endDate), 'MMM d, yyyy')}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{getSpecialtyAbbreviation(blockShift.specialty)}</Badge>
                    <Badge variant="outline">{blockShift.department}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {blockShift.quantity} positions
                    </span>
                    <span className="font-medium text-green-600">
                      ${blockShift.rate}/hr
                    </span>
                  </div>
                  {blockShift.description && (
                    <div className="text-xs text-muted-foreground">
                      {blockShift.description}
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Shift Requests Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Shift Requests with Worker Selection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {shiftRequests.map((request: ShiftRequest) => (
              <Card key={request.id} className="p-4 border-l-4 border-l-orange-500">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold">{request.title}</h4>
                      <div className="text-sm text-muted-foreground">
                        {format(parseISO(request.date), 'MMM d, yyyy')} • {request.startTime} - {request.endTime}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline">{getSpecialtyAbbreviation(request.specialty)}</Badge>
                        <Badge variant="outline">{request.department}</Badge>
                        <Badge variant="secondary">{request.facilityName}</Badge>
                      </div>
                    </div>
                    <Badge variant={request.urgency === 'high' ? 'destructive' : request.urgency === 'medium' ? 'default' : 'secondary'}>
                      {request.urgency} priority
                    </Badge>
                  </div>
                  
                  <div>
                    <h5 className="font-medium mb-2">Available Workers ({request.requestedWorkers.length})</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {request.requestedWorkers.map((worker: RequestedWorker) => (
                        <div key={worker.id} className="border rounded-lg p-3 hover:bg-gray-50 transition-colors">
                          <div className="flex items-center justify-between mb-2">
                            <div className="font-medium">{worker.name}</div>
                            {worker.isFavorite && (
                              <Badge variant="secondary" className="text-xs">★ Favorite</Badge>
                            )}
                          </div>
                          <div className="space-y-1 text-sm">
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">Reliability</span>
                              <span className={`font-medium ${worker.reliabilityScore >= 95 ? 'text-green-600' : worker.reliabilityScore >= 85 ? 'text-blue-600' : 'text-orange-600'}`}>
                                {worker.reliabilityScore}%
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">Shifts Worked</span>
                              <span className="font-medium">{worker.totalShiftsWorked}</span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {worker.certifications.slice(0, 2).join(', ')}
                              {worker.certifications.length > 2 && ` +${worker.certifications.length - 2} more`}
                            </div>
                          </div>
                          <div className="flex gap-2 mt-2">
                            <Button size="sm" variant="outline" className="flex-1">
                              Select
                            </Button>
                            <Link to={worker.profileUrl}>
                              <Button size="sm" variant="ghost">View Profile</Button>
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Shift Details Dialog */}
      {selectedShift && (
        <Dialog open={!!selectedShift} onOpenChange={() => setSelectedShift(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selectedShift.title}</DialogTitle>
              <DialogDescription>
                Shift details and information
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Date & Time</Label>
                  <div className="text-sm">
                    {format(parseISO(selectedShift.date), 'MMM d, yyyy')} at {selectedShift.startTime} - {selectedShift.endTime}
                  </div>
                </div>
                <div>
                  <Label>Rate</Label>
                  <div className="text-sm font-medium text-green-600">
                    ${selectedShift.rate}/hour
                  </div>
                </div>
                <div>
                  <Label>Specialty</Label>
                  <Badge variant="outline">{getSpecialtyAbbreviation(selectedShift.specialty)}</Badge>
                </div>
                <div>
                  <Label>Department</Label>
                  <Badge variant="outline">{selectedShift.department}</Badge>
                </div>
                <div>
                  <Label>Status</Label>
                  <Badge className={getStatusColor(selectedShift.status)}>
                    {selectedShift.status.replace('_', ' ')}
                  </Badge>
                </div>
                <div>
                  <Label>Facility</Label>
                  <div className="text-sm">{selectedShift.facilityName}</div>
                </div>
              </div>
              
              {selectedShift.description && (
                <div>
                  <Label>Description</Label>
                  <div className="text-sm text-muted-foreground">
                    {selectedShift.description}
                  </div>
                </div>
              )}
              
              {selectedShift.urgency && (
                <div>
                  <Label>Urgency</Label>
                  <Badge variant={selectedShift.urgency === 'critical' ? 'destructive' : 'outline'}>
                    {selectedShift.urgency.charAt(0).toUpperCase() + selectedShift.urgency.slice(1)}
                  </Badge>
                </div>
              )}
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSelectedShift(null)}>
                Close
              </Button>
              <Button>
                Apply for Shift
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Shift Posting Dialog */}
      <Dialog open={showPostingDialog} onOpenChange={setShowPostingDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Post New Shift</DialogTitle>
            <DialogDescription>
              Create a new shift posting with preset times and premium rates
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="max-h-[70vh] pr-4">
            <div className="space-y-4">
              {/* Block Shift Toggle */}
              <div className="flex items-center space-x-2">
                <Switch
                  id="block-shift"
                  checked={shiftForm.isBlockShift}
                  onCheckedChange={(checked) => setShiftForm(prev => ({ ...prev, isBlockShift: checked }))}
                />
                <Label htmlFor="block-shift">Block Shift (Multiple positions over time period)</Label>
              </div>

              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Shift Title *</Label>
                  <Input
                    value={shiftForm.title}
                    onChange={(e) => setShiftForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g., ICU Night Shift"
                  />
                </div>
                <div>
                  <Label>Facility *</Label>
                  <Select value={shiftForm.facilityId.toString()} onValueChange={(value) => 
                    setShiftForm(prev => ({ ...prev, facilityId: parseInt(value) }))
                  }>
                    <SelectTrigger>
                      <SelectValue />
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
              </div>

              {/* Date and Time */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>{shiftForm.isBlockShift ? 'Start Date *' : 'Date *'}</Label>
                  <Input
                    type="date"
                    value={shiftForm.date}
                    onChange={(e) => setShiftForm(prev => ({ ...prev, date: e.target.value }))}
                  />
                </div>
                {shiftForm.isBlockShift && (
                  <div>
                    <Label>End Date *</Label>
                    <Input
                      type="date"
                      value={shiftForm.blockEndDate}
                      onChange={(e) => setShiftForm(prev => ({ ...prev, blockEndDate: e.target.value }))}
                    />
                  </div>
                )}
                <div>
                  <Label>Start Time *</Label>
                  <Input
                    type="time"
                    value={shiftForm.startTime}
                    onChange={(e) => setShiftForm(prev => ({ ...prev, startTime: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>End Time *</Label>
                  <Input
                    type="time"
                    value={shiftForm.endTime}
                    onChange={(e) => setShiftForm(prev => ({ ...prev, endTime: e.target.value }))}
                  />
                </div>
              </div>

              {/* Preset Times */}
              <div>
                <Label>Quick Time Presets</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                  {PRESET_TIMES.map((preset, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      onClick={() => handlePresetTimeSelect(preset)}
                      className="text-xs"
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Specialty and Department */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Specialty *</Label>
                  <Select value={shiftForm.specialty} onValueChange={handleSpecialtyChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select specialty" />
                    </SelectTrigger>
                    <SelectContent>
                      {SPECIALTIES.map((specialty) => (
                        <SelectItem key={specialty} value={specialty}>
                          {specialty}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Department *</Label>
                  <Select value={shiftForm.department} onValueChange={(value) => 
                    setShiftForm(prev => ({ ...prev, department: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {DEPARTMENTS.map((dept) => (
                        <SelectItem key={dept} value={dept}>
                          {dept}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Premium Multiplier and Rate */}
              <div className="space-y-4">
                <div>
                  <Label>Premium Multiplier: {shiftForm.premiumMultiplier.toFixed(1)}x</Label>
                  <Slider
                    value={[shiftForm.premiumMultiplier]}
                    onValueChange={(value) => handlePremiumMultiplierChange(value[0])}
                    max={2.0}
                    min={1.0}
                    step={0.1}
                    className="mt-2"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>1.0x (Standard)</span>
                    <span>1.5x (Premium)</span>
                    <span>2.0x (Critical)</span>
                  </div>
                </div>
                <div>
                  <Label>Hourly Rate</Label>
                  <div className="text-2xl font-bold text-green-600">
                    ${shiftForm.rate}/hour
                  </div>
                </div>
              </div>

              {/* Urgency */}
              <div>
                <Label>Urgency</Label>
                <Select value={shiftForm.urgency} onValueChange={(value: any) => 
                  setShiftForm(prev => ({ ...prev, urgency: value }))
                }>
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
              {shiftForm.isBlockShift && (
                <div>
                  <Label>Number of Positions</Label>
                  <Input
                    type="number"
                    value={shiftForm.blockQuantity}
                    onChange={(e) => setShiftForm(prev => ({ ...prev, blockQuantity: parseInt(e.target.value) || 1 }))}
                    min="1"
                  />
                </div>
              )}
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={shiftForm.description}
                onChange={(e) => setShiftForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Additional shift details, requirements, or notes..."
                rows={3}
              />
            </div>
          </ScrollArea>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowPostingDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitShift} disabled={postShiftMutation.isPending}>
              {postShiftMutation.isPending ? 'Posting...' : 'Post Shift'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}