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
import { Calendar, Clock, DollarSign, MapPin, Users, Building, Plus, Filter, ChevronLeft, ChevronRight, ArrowLeft, CalendarDays } from 'lucide-react';
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
  urgency: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  isBlockShift: boolean;
  blockEndDate?: string;
  blockQuantity?: number;
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

  // Post shift mutation
  const postShiftMutation = useMutation({
    mutationFn: async (shiftData: any) => {
      const endpoint = shiftData.isBlockShift ? '/api/block-shifts' : '/api/shifts';
      return fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(shiftData),
      }).then(res => res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/shifts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/block-shifts'] });
      toast({
        title: 'Success',
        description: 'Shift posted successfully',
      });
      setShowPostingDialog(false);
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
      case 'open': return 'bg-green-100 text-green-800';
      case 'assigned': return 'bg-blue-100 text-blue-800';
      case 'requested': return 'bg-yellow-100 text-yellow-800';
      case 'in_progress': return 'bg-purple-100 text-purple-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'ncns': return 'bg-red-100 text-red-800';
      case 'facility_cancelled': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getUrgencyColor = (urgency?: string) => {
    switch (urgency) {
      case 'critical': return 'border-red-500 bg-red-50';
      case 'high': return 'border-orange-500 bg-orange-50';
      case 'medium': return 'border-yellow-500 bg-yellow-50';
      case 'low': return 'border-green-500 bg-green-50';
      default: return 'border-gray-200 bg-white';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Unified Calendar</h1>
          <p className="text-muted-foreground">
            Comprehensive scheduling and shift management
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
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
            onClick={() => setSelectedDate(addDays(selectedDate, -7))}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous Week
          </Button>
          <h2 className="text-xl font-semibold">
            {format(weekStart, 'MMM d')} - {format(addDays(weekStart, 6), 'MMM d, yyyy')}
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedDate(addDays(selectedDate, 7))}
          >
            Next Week
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button
          variant="outline"
          onClick={() => setSelectedDate(new Date())}
        >
          Today
        </Button>
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
                  <SelectValue placeholder="All Urgencies" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Urgencies</SelectItem>
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
          <CardTitle>7-Day Calendar View</CardTitle>
        </CardHeader>
        <CardContent>
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
                          <Badge variant="outline" className="text-xs">
                            {getSpecialtyAbbreviation(shift.specialty)}
                          </Badge>
                          <span className="text-xs font-medium">${shift.rate}/hr</span>
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Post New Shift</DialogTitle>
            <DialogDescription>
              Create a new shift posting with preset times and premium rates
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Block Shift Toggle */}
            <div className="flex items-center space-x-2">
              <Switch
                id="block-shift"
                checked={shiftForm.isBlockShift}
                onCheckedChange={(checked) => setShiftForm(prev => ({ ...prev, isBlockShift: checked }))}
              />
              <Label htmlFor="block-shift">Block Shift (Multiple days/positions)</Label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Shift Title</Label>
                <Input
                  value={shiftForm.title}
                  onChange={(e) => setShiftForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., ICU Day Shift"
                />
              </div>
              <div>
                <Label>Facility</Label>
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={shiftForm.date}
                  onChange={(e) => setShiftForm(prev => ({ ...prev, date: e.target.value }))}
                />
              </div>
              {shiftForm.isBlockShift && (
                <div>
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={shiftForm.blockEndDate}
                    onChange={(e) => setShiftForm(prev => ({ ...prev, blockEndDate: e.target.value }))}
                  />
                </div>
              )}
            </div>

            {/* Preset Times */}
            <div>
              <Label>Preset Times</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {PRESET_TIMES.map((preset, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => handlePresetTimeSelect(preset)}
                    className={
                      shiftForm.startTime === preset.start && shiftForm.endTime === preset.end
                        ? 'bg-primary text-primary-foreground'
                        : ''
                    }
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Time</Label>
                <Input
                  type="time"
                  value={shiftForm.startTime}
                  onChange={(e) => setShiftForm(prev => ({ ...prev, startTime: e.target.value }))}
                />
              </div>
              <div>
                <Label>End Time</Label>
                <Input
                  type="time"
                  value={shiftForm.endTime}
                  onChange={(e) => setShiftForm(prev => ({ ...prev, endTime: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Specialty</Label>
                <Select value={shiftForm.specialty} onValueChange={handleSpecialtyChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select specialty" />
                  </SelectTrigger>
                  <SelectContent>
                    {SPECIALTIES.map((specialty) => (
                      <SelectItem key={specialty} value={specialty}>
                        {getSpecialtyAbbreviation(specialty)} - {specialty}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Department</Label>
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

            {/* Premium Rate Slider */}
            <div>
              <Label>Premium Rate: {Math.round(shiftForm.premiumMultiplier * 100)}% (${shiftForm.rate}/hr)</Label>
              <div className="mt-2">
                <Slider
                  value={[shiftForm.premiumMultiplier]}
                  onValueChange={(value) => handlePremiumMultiplierChange(value[0])}
                  min={1.0}
                  max={1.7}
                  step={0.05}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>Standard (100%)</span>
                  <span>Premium (170%)</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
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
          </div>

          <div className="flex justify-end gap-2">
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