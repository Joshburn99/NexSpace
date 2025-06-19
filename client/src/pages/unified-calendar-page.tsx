import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { 
  Calendar, Clock, Plus, Filter, ArrowLeft, Home, Users, 
  MapPin, DollarSign, AlertTriangle, CheckCircle, XCircle,
  Pause, Ban, UserX, Building, Briefcase, Search
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { addDays, format, startOfWeek, isSameDay, parseISO } from "date-fns";

interface Shift {
  id: number;
  facilityId: number;
  facilityName: string;
  department: string;
  startTime: string;
  endTime: string;
  date: string;
  assignedUserId?: number;
  assignedUserName?: string;
  hourlyRate: number;
  status: 'open' | 'assigned' | 'requested' | 'in_progress' | 'completed' | 'cancelled' | 'ncns' | 'facility_cancelled';
  specialty: string;
  requirements: string[];
  urgency: 'low' | 'medium' | 'high' | 'critical';
  isBlockShift?: boolean;
  blockDuration?: number; // weeks for block shifts
  notes?: string;
}

interface BlockShift {
  id: number;
  facilityId: number;
  facilityName: string;
  department: string;
  startDate: string;
  endDate: string;
  weekDuration: number;
  scheduledDays: string[];
  shiftTime: string;
  hourlyRate: number;
  specialty: string;
  requirements: string[];
  customRequirements: string;
  status: 'open' | 'assigned' | 'in_progress' | 'completed';
  assignedUserId?: number;
  totalHoursPerWeek: number;
}

const statusColors = {
  open: 'bg-blue-500',
  assigned: 'bg-green-500',
  requested: 'bg-yellow-500',
  in_progress: 'bg-purple-500',
  completed: 'bg-gray-500',
  cancelled: 'bg-red-500',
  ncns: 'bg-red-700',
  facility_cancelled: 'bg-orange-500'
};

const statusLabels = {
  open: 'Open',
  assigned: 'Assigned',
  requested: 'Requested',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  ncns: 'NCNS',
  facility_cancelled: 'Facility Cancelled'
};

export default function UnifiedCalendarPage() {
  const { toast } = useToast();
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [selectedFilters, setSelectedFilters] = useState({
    facility: 'all',
    department: 'all',
    specialty: 'all',
    status: 'all',
    urgency: 'all'
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [showBlockShifts, setShowBlockShifts] = useState(false);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [showNewShiftDialog, setShowNewShiftDialog] = useState(false);
  const [showNewBlockShiftDialog, setShowNewBlockShiftDialog] = useState(false);

  const { data: shifts = [], isLoading: shiftsLoading } = useQuery<Shift[]>({
    queryKey: ["/api/shifts"],
  });

  const { data: blockShifts = [], isLoading: blockShiftsLoading } = useQuery<BlockShift[]>({
    queryKey: ["/api/block-shifts"],
  });

  const { data: facilities = [] } = useQuery({
    queryKey: ["/api/facilities"],
  });

  const { data: users = [] } = useQuery({
    queryKey: ["/api/users"],
  });

  // Calculate week dates
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Filter shifts based on current filters
  const filteredShifts = useMemo(() => {
    return shifts.filter(shift => {
      const matchesFacility = selectedFilters.facility === 'all' || shift.facilityId.toString() === selectedFilters.facility;
      const matchesDepartment = selectedFilters.department === 'all' || shift.department === selectedFilters.department;
      const matchesSpecialty = selectedFilters.specialty === 'all' || shift.specialty === selectedFilters.specialty;
      const matchesStatus = selectedFilters.status === 'all' || shift.status === selectedFilters.status;
      const matchesUrgency = selectedFilters.urgency === 'all' || shift.urgency === selectedFilters.urgency;
      const matchesSearch = searchTerm === "" || 
        shift.facilityName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        shift.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
        shift.specialty.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesFacility && matchesDepartment && matchesSpecialty && matchesStatus && matchesUrgency && matchesSearch;
    });
  }, [shifts, selectedFilters, searchTerm]);

  // Group shifts by date
  const shiftsByDate = useMemo(() => {
    const grouped: { [key: string]: Shift[] } = {};
    filteredShifts.forEach(shift => {
      const date = format(parseISO(shift.date), 'yyyy-MM-dd');
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(shift);
    });
    return grouped;
  }, [filteredShifts]);

  // Get unique values for filters
  const departments = [...new Set(shifts.map(s => s.department))];
  const specialties = [...new Set(shifts.map(s => s.specialty))];

  const createShiftMutation = useMutation({
    mutationFn: async (shiftData: any) => {
      const response = await apiRequest("POST", "/api/shifts", shiftData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });
      setShowNewShiftDialog(false);
      toast({
        title: "Shift Created",
        description: "New shift has been posted successfully.",
      });
    },
  });

  const createBlockShiftMutation = useMutation({
    mutationFn: async (blockShiftData: any) => {
      const response = await apiRequest("POST", "/api/block-shifts", blockShiftData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/block-shifts"] });
      setShowNewBlockShiftDialog(false);
      toast({
        title: "Block Shift Created",
        description: "New block shift contract has been posted successfully.",
      });
    },
  });

  const updateShiftStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const response = await apiRequest("PATCH", `/api/shifts/${id}`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });
      toast({
        title: "Shift Updated",
        description: "Shift status has been updated successfully.",
      });
    },
  });

  const handleCreateShift = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const shiftData = {
      facilityId: parseInt(formData.get('facilityId') as string),
      department: formData.get('department') as string,
      date: formData.get('date') as string,
      startTime: formData.get('startTime') as string,
      endTime: formData.get('endTime') as string,
      specialty: formData.get('specialty') as string,
      hourlyRate: parseFloat(formData.get('hourlyRate') as string),
      urgency: formData.get('urgency') as string,
      requirements: (formData.get('requirements') as string).split(',').map(r => r.trim()).filter(r => r),
      notes: formData.get('notes') as string,
      status: 'open'
    };
    createShiftMutation.mutate(shiftData);
  };

  const handleCreateBlockShift = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const blockShiftData = {
      facilityId: parseInt(formData.get('facilityId') as string),
      department: formData.get('department') as string,
      startDate: formData.get('startDate') as string,
      weekDuration: parseInt(formData.get('weekDuration') as string),
      scheduledDays: JSON.parse(formData.get('scheduledDays') as string),
      shiftTime: formData.get('shiftTime') as string,
      specialty: formData.get('specialty') as string,
      hourlyRate: parseFloat(formData.get('hourlyRate') as string),
      requirements: (formData.get('requirements') as string).split(',').map(r => r.trim()).filter(r => r),
      customRequirements: formData.get('customRequirements') as string,
      totalHoursPerWeek: parseInt(formData.get('totalHoursPerWeek') as string),
      status: 'open'
    };
    createBlockShiftMutation.mutate(blockShiftData);
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentWeek(prev => addDays(prev, direction === 'next' ? 7 : -7));
  };

  if (shiftsLoading || blockShiftsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-4 mb-4">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <Home className="h-4 w-4" />
              Dashboard
            </Button>
          </Link>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Unified Calendar</h1>
            <p className="text-muted-foreground">
              Centralized scheduling and shift management
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={showNewBlockShiftDialog} onOpenChange={setShowNewBlockShiftDialog}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Briefcase className="h-4 w-4" />
                  New Block Shift
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create Block Shift Contract</DialogTitle>
                  <DialogDescription>
                    Create a 3-14 week contract shift with custom requirements
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateBlockShift} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="facilityId">Facility</Label>
                      <Select name="facilityId" required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select facility" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.isArray(facilities) && facilities.map((facility: any) => (
                            <SelectItem key={facility.id} value={facility.id.toString()}>
                              {facility.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="department">Department</Label>
                      <Input name="department" required />
                    </div>
                    <div>
                      <Label htmlFor="startDate">Start Date</Label>
                      <Input name="startDate" type="date" required />
                    </div>
                    <div>
                      <Label htmlFor="weekDuration">Duration (Weeks)</Label>
                      <Select name="weekDuration" required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select duration" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 12 }, (_, i) => i + 3).map(weeks => (
                            <SelectItem key={weeks} value={weeks.toString()}>
                              {weeks} weeks
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
                          <SelectItem value="registered_nurse">Registered Nurse</SelectItem>
                          <SelectItem value="licensed_practical_nurse">Licensed Practical Nurse</SelectItem>
                          <SelectItem value="certified_nursing_assistant">Certified Nursing Assistant</SelectItem>
                          <SelectItem value="physical_therapist">Physical Therapist</SelectItem>
                          <SelectItem value="respiratory_therapist">Respiratory Therapist</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="hourlyRate">Hourly Rate</Label>
                      <Input name="hourlyRate" type="number" step="0.01" required />
                    </div>
                    <div>
                      <Label htmlFor="shiftTime">Shift Time</Label>
                      <Input name="shiftTime" placeholder="e.g., 7:00 AM - 7:00 PM" required />
                    </div>
                    <div>
                      <Label htmlFor="totalHoursPerWeek">Hours per Week</Label>
                      <Input name="totalHoursPerWeek" type="number" required />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="scheduledDays">Scheduled Days</Label>
                    <Input 
                      name="scheduledDays" 
                      placeholder='["Monday", "Tuesday", "Wednesday"]' 
                      required 
                    />
                  </div>
                  <div>
                    <Label htmlFor="requirements">Requirements (comma-separated)</Label>
                    <Input name="requirements" placeholder="BLS, ACLS, 2+ years experience" />
                  </div>
                  <div>
                    <Label htmlFor="customRequirements">Custom Requirements</Label>
                    <Textarea name="customRequirements" placeholder="Additional specific requirements for this contract..." />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setShowNewBlockShiftDialog(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createBlockShiftMutation.isPending}>
                      Create Block Shift
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
            
            <Dialog open={showNewShiftDialog} onOpenChange={setShowNewShiftDialog}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  New Shift
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create New Shift</DialogTitle>
                  <DialogDescription>
                    Post a new shift to the job board
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateShift} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="facilityId">Facility</Label>
                      <Select name="facilityId" required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select facility" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.isArray(facilities) && facilities.map((facility: any) => (
                            <SelectItem key={facility.id} value={facility.id.toString()}>
                              {facility.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="department">Department</Label>
                      <Input name="department" required />
                    </div>
                    <div>
                      <Label htmlFor="date">Date</Label>
                      <Input name="date" type="date" required />
                    </div>
                    <div>
                      <Label htmlFor="specialty">Specialty</Label>
                      <Select name="specialty" required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select specialty" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="registered_nurse">Registered Nurse</SelectItem>
                          <SelectItem value="licensed_practical_nurse">Licensed Practical Nurse</SelectItem>
                          <SelectItem value="certified_nursing_assistant">Certified Nursing Assistant</SelectItem>
                          <SelectItem value="physical_therapist">Physical Therapist</SelectItem>
                          <SelectItem value="respiratory_therapist">Respiratory Therapist</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="startTime">Start Time</Label>
                      <Input name="startTime" type="time" required />
                    </div>
                    <div>
                      <Label htmlFor="endTime">End Time</Label>
                      <Input name="endTime" type="time" required />
                    </div>
                    <div>
                      <Label htmlFor="hourlyRate">Hourly Rate</Label>
                      <Input name="hourlyRate" type="number" step="0.01" required />
                    </div>
                    <div>
                      <Label htmlFor="urgency">Urgency</Label>
                      <Select name="urgency" required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select urgency" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="critical">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="requirements">Requirements (comma-separated)</Label>
                    <Input name="requirements" placeholder="BLS, ACLS, 2+ years experience" />
                  </div>
                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea name="notes" placeholder="Additional information..." />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setShowNewShiftDialog(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createShiftMutation.isPending}>
                      Create Shift
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-4">
            <div>
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search shifts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="facility">Facility</Label>
              <Select value={selectedFilters.facility} onValueChange={(value) => 
                setSelectedFilters(prev => ({ ...prev, facility: value }))
              }>
                <SelectTrigger>
                  <SelectValue placeholder="All Facilities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Facilities</SelectItem>
                  {Array.isArray(facilities) && facilities.map((facility: any) => (
                    <SelectItem key={facility.id} value={facility.id.toString()}>
                      {facility.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="department">Department</Label>
              <Select value={selectedFilters.department} onValueChange={(value) => 
                setSelectedFilters(prev => ({ ...prev, department: value }))
              }>
                <SelectTrigger>
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map(dept => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="specialty">Specialty</Label>
              <Select value={selectedFilters.specialty} onValueChange={(value) => 
                setSelectedFilters(prev => ({ ...prev, specialty: value }))
              }>
                <SelectTrigger>
                  <SelectValue placeholder="All Specialties" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Specialties</SelectItem>
                  {specialties.map(spec => (
                    <SelectItem key={spec} value={spec}>{spec.replace('_', ' ').toUpperCase()}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={selectedFilters.status} onValueChange={(value) => 
                setSelectedFilters(prev => ({ ...prev, status: value }))
              }>
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="urgency">Urgency</Label>
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
          <div className="flex items-center gap-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="block-shifts"
                checked={showBlockShifts}
                onCheckedChange={setShowBlockShifts}
              />
              <Label htmlFor="block-shifts">Show Block Shifts</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigateWeek('prev')}>
            ← Previous Week
          </Button>
          <h2 className="text-xl font-semibold">
            {format(weekStart, 'MMM d')} - {format(addDays(weekStart, 6), 'MMM d, yyyy')}
          </h2>
          <Button variant="outline" onClick={() => navigateWeek('next')}>
            Next Week →
          </Button>
        </div>
        <Button variant="outline" onClick={() => setCurrentWeek(new Date())}>
          Today
        </Button>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-4">
        {weekDays.map((day, index) => {
          const dayKey = format(day, 'yyyy-MM-dd');
          const dayShifts = shiftsByDate[dayKey] || [];
          const isToday = isSameDay(day, new Date());

          return (
            <Card key={index} className={`min-h-[400px] ${isToday ? 'ring-2 ring-primary' : ''}`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  {format(day, 'EEE d')}
                  {isToday && <Badge variant="secondary" className="ml-2 text-xs">Today</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2 space-y-2">
                {dayShifts.map((shift) => (
                  <div
                    key={shift.id}
                    className={`p-2 rounded-md text-xs cursor-pointer hover:opacity-80 transition-opacity ${statusColors[shift.status]} text-white`}
                    onClick={() => setSelectedShift(shift)}
                  >
                    <div className="font-medium truncate">{shift.facilityName}</div>
                    <div className="truncate">{shift.department}</div>
                    <div>{shift.startTime} - {shift.endTime}</div>
                    <div className="flex items-center justify-between mt-1">
                      <Badge variant="secondary" className="text-xs bg-white/20">
                        {statusLabels[shift.status]}
                      </Badge>
                      {shift.urgency === 'critical' && (
                        <AlertTriangle className="h-3 w-3" />
                      )}
                    </div>
                    {shift.assignedUserName && (
                      <div className="text-xs opacity-90 truncate">
                        👤 {shift.assignedUserName}
                      </div>
                    )}
                  </div>
                ))}
                {dayShifts.length === 0 && (
                  <div className="text-center text-muted-foreground text-xs mt-8">
                    No shifts
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Shift Details Dialog */}
      {selectedShift && (
        <Dialog open={!!selectedShift} onOpenChange={() => setSelectedShift(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                {selectedShift.facilityName} - {selectedShift.department}
              </DialogTitle>
              <DialogDescription>
                {format(parseISO(selectedShift.date), 'EEEE, MMMM d, yyyy')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Time</Label>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {selectedShift.startTime} - {selectedShift.endTime}
                  </div>
                </div>
                <div>
                  <Label>Hourly Rate</Label>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    ${selectedShift.hourlyRate}/hour
                  </div>
                </div>
                <div>
                  <Label>Specialty</Label>
                  <div>{selectedShift.specialty.replace('_', ' ').toUpperCase()}</div>
                </div>
                <div>
                  <Label>Status</Label>
                  <Badge className={`${statusColors[selectedShift.status]} text-white`}>
                    {statusLabels[selectedShift.status]}
                  </Badge>
                </div>
              </div>
              
              {selectedShift.assignedUserName && (
                <div>
                  <Label>Assigned To</Label>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    {selectedShift.assignedUserName}
                  </div>
                </div>
              )}

              {selectedShift.requirements && selectedShift.requirements.length > 0 && (
                <div>
                  <Label>Requirements</Label>
                  <div className="flex flex-wrap gap-1">
                    {selectedShift.requirements.map((req, i) => (
                      <Badge key={i} variant="outline">{req}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {selectedShift.notes && (
                <div>
                  <Label>Notes</Label>
                  <div className="p-2 bg-muted rounded-md">
                    {selectedShift.notes}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Select 
                  value={selectedShift.status} 
                  onValueChange={(newStatus) => {
                    updateShiftStatusMutation.mutate({ 
                      id: selectedShift.id, 
                      status: newStatus 
                    });
                    setSelectedShift({ ...selectedShift, status: newStatus as any });
                  }}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={() => setSelectedShift(null)}>
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}