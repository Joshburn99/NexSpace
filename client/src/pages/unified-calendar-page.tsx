import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { format, parseISO, startOfWeek, addDays, isSameDay } from "date-fns";
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

// Medical specialty abbreviations mapping
const specialtyAbbreviations: Record<string, string> = {
  'Registered Nurse': 'RN',
  'Licensed Practical Nurse': 'LPN', 
  'Certified Nursing Assistant': 'CNA',
  'Physical Therapist': 'PT',
  'Respiratory Therapist': 'RT',
  'Medical Doctor': 'MD',
  'Nurse Practitioner': 'NP',
  'Physician Assistant': 'PA',
  'Occupational Therapist': 'OT',
  'Speech Language Pathologist': 'SLP'
};

const statusColors: Record<string, string> = {
  open: 'bg-blue-500',
  assigned: 'bg-green-500',
  requested: 'bg-yellow-500',
  in_progress: 'bg-purple-500',
  completed: 'bg-gray-500',
  cancelled: 'bg-red-500',
  ncns: 'bg-red-700',
  facility_cancelled: 'bg-orange-500'
};

const statusLabels: Record<string, string> = {
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

  // Helper function to get abbreviated specialty
  const getSpecialtyAbbreviation = (specialty: string) => {
    return specialtyAbbreviations[specialty] || specialty;
  };

  // Calculate week dates
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Filter shifts based on current filters
  const filteredShifts = useMemo(() => {
    return shifts.filter(shift => {
      const matchesSearch = !searchTerm || 
        shift.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        shift.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        shift.specialty?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesFacility = selectedFilters.facility === 'all' || 
        shift.facilityId?.toString() === selectedFilters.facility;
      
      const matchesDepartment = selectedFilters.department === 'all' || 
        shift.department === selectedFilters.department;
      
      const matchesSpecialty = selectedFilters.specialty === 'all' || 
        shift.specialty === selectedFilters.specialty;
      
      const matchesStatus = selectedFilters.status === 'all' || 
        shift.status === selectedFilters.status;
      
      const matchesUrgency = selectedFilters.urgency === 'all' || 
        shift.urgency === selectedFilters.urgency;

      return matchesSearch && matchesFacility && matchesDepartment && 
             matchesSpecialty && matchesStatus && matchesUrgency;
    });
  }, [shifts, searchTerm, selectedFilters]);

  // Group shifts by date
  const shiftsByDate = useMemo(() => {
    const grouped: Record<string, Shift[]> = {};
    filteredShifts.forEach(shift => {
      const date = format(parseISO(shift.date), 'yyyy-MM-dd');
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(shift);
    });
    return grouped;
  }, [filteredShifts]);

  // Get unique values for filters
  const departments = Array.from(new Set(shifts.map(s => s.department).filter(Boolean)));
  const specialties = Array.from(new Set(shifts.map(s => s.specialty).filter(Boolean)));

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
        description: "New shift has been created successfully.",
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
        description: "Block shift posting has been created successfully.",
      });
    },
  });

  const handleCreateShift = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const shiftData = {
      title: formData.get('title') as string,
      date: formData.get('date') as string,
      startTime: formData.get('startTime') as string,
      endTime: formData.get('endTime') as string,
      department: formData.get('department') as string,
      specialty: formData.get('specialty') as string,
      facilityId: parseInt(formData.get('facilityId') as string),
      rate: parseFloat(formData.get('rate') as string),
      urgency: formData.get('urgency') as string,
      description: formData.get('description') as string,
      status: 'open'
    };
    createShiftMutation.mutate(shiftData);
  };

  const handleCreateBlockShift = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const blockShiftData = {
      title: formData.get('title') as string,
      startDate: formData.get('startDate') as string,
      endDate: formData.get('endDate') as string,
      department: formData.get('department') as string,
      specialty: formData.get('specialty') as string,
      quantity: parseInt(formData.get('quantity') as string),
      rate: parseFloat(formData.get('rate') as string),
      description: formData.get('description') as string
    };
    createBlockShiftMutation.mutate(blockShiftData);
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
            <h1 className="text-3xl font-bold">Unified Calendar & Scheduling</h1>
            <p className="text-muted-foreground">
              Consolidated view of all scheduling, calendar, and shift management
            </p>
          </div>
          <div className="flex items-center gap-2">
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
                    Post a new shift opportunity for staff to apply
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateShift} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="title">Shift Title</Label>
                      <Input name="title" required />
                    </div>
                    <div>
                      <Label htmlFor="date">Date</Label>
                      <Input name="date" type="date" required />
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
                      <Label htmlFor="department">Department</Label>
                      <Select name="department" required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ICU">ICU</SelectItem>
                          <SelectItem value="Emergency">Emergency</SelectItem>
                          <SelectItem value="Med-Surg">Med-Surg</SelectItem>
                          <SelectItem value="OR">OR</SelectItem>
                          <SelectItem value="PACU">PACU</SelectItem>
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
                          <SelectItem value="RN">RN</SelectItem>
                          <SelectItem value="LPN">LPN</SelectItem>
                          <SelectItem value="CNA">CNA</SelectItem>
                          <SelectItem value="RT">RT</SelectItem>
                          <SelectItem value="PT">PT</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="facilityId">Facility</Label>
                      <Select name="facilityId" required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select facility" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">General Hospital</SelectItem>
                          <SelectItem value="2">Metro Medical</SelectItem>
                          <SelectItem value="3">City Clinic</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="rate">Hourly Rate ($)</Label>
                      <Input name="rate" type="number" step="0.01" required />
                    </div>
                    <div>
                      <Label htmlFor="urgency">Urgency</Label>
                      <Select name="urgency">
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
                    <Label htmlFor="description">Description</Label>
                    <Textarea name="description" placeholder="Shift details and requirements..." />
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

      <Tabs defaultValue="calendar" className="space-y-6">
        <TabsList>
          <TabsTrigger value="calendar">7-Day Calendar</TabsTrigger>
          <TabsTrigger value="block-shifts">Block Shifts</TabsTrigger>
          <TabsTrigger value="filters">Advanced Filters</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Quick Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
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
                      {specialties.map(specialty => (
                        <SelectItem key={specialty} value={specialty}>
                          {getSpecialtyAbbreviation(specialty)}
                        </SelectItem>
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
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="assigned">Assigned</SelectItem>
                      <SelectItem value="requested">Requested</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="urgency">Urgency</Label>
                  <Select value={selectedFilters.urgency} onValueChange={(value) => 
                    setSelectedFilters(prev => ({ ...prev, urgency: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="All Urgency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Urgency</SelectItem>
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
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Week of {format(weekStart, 'MMM d, yyyy')}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setCurrentWeek(addDays(currentWeek, -7))}
                  >
                    Previous Week
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setCurrentWeek(new Date())}
                  >
                    Today
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setCurrentWeek(addDays(currentWeek, 7))}
                  >
                    Next Week
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-4">
                {weekDays.map((day, index) => {
                  const dateKey = format(day, 'yyyy-MM-dd');
                  const dayShifts = shiftsByDate[dateKey] || [];
                  
                  return (
                    <div key={index} className="space-y-2">
                      <div className="text-center p-2 bg-muted rounded-lg">
                        <div className="font-semibold">{format(day, 'EEE')}</div>
                        <div className="text-sm text-muted-foreground">{format(day, 'MMM d')}</div>
                      </div>
                      
                      <div className="space-y-1 min-h-[200px]">
                        {dayShifts.map((shift) => (
                          <Card 
                            key={shift.id} 
                            className="p-2 cursor-pointer hover:shadow-md transition-shadow"
                            onClick={() => setSelectedShift(shift)}
                          >
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <Badge 
                                  className={`${statusColors[shift.status]} text-white text-xs`}
                                >
                                  {statusLabels[shift.status]}
                                </Badge>
                                {shift.urgency && shift.urgency !== 'low' && (
                                  <AlertTriangle className="h-3 w-3 text-orange-500" />
                                )}
                              </div>
                              <div className="text-xs font-medium truncate">{shift.title}</div>
                              <div className="text-xs text-muted-foreground">
                                {shift.startTime} - {shift.endTime}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {getSpecialtyAbbreviation(shift.specialty)} • {shift.department}
                              </div>
                              <div className="text-xs font-medium text-green-600">
                                ${shift.rate}/hr
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="block-shifts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Active Block Shifts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {blockShifts.map((blockShift) => (
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
        </TabsContent>

        <TabsContent value="filters" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Advanced Filters & Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch 
                  id="show-block-shifts"
                  checked={showBlockShifts}
                  onCheckedChange={setShowBlockShifts}
                />
                <Label htmlFor="show-block-shifts">Show block shifts in calendar</Label>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Filter by Facility</Label>
                  <Select value={selectedFilters.facility} onValueChange={(value) => 
                    setSelectedFilters(prev => ({ ...prev, facility: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="All Facilities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Facilities</SelectItem>
                      <SelectItem value="1">General Hospital</SelectItem>
                      <SelectItem value="2">Metro Medical</SelectItem>
                      <SelectItem value="3">City Clinic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
                  <Label>Status</Label>
                  <Badge className={`${statusColors[selectedShift.status]} text-white`}>
                    {statusLabels[selectedShift.status]}
                  </Badge>
                </div>
                <div>
                  <Label>Department</Label>
                  <div className="text-sm">{selectedShift.department}</div>
                </div>
                <div>
                  <Label>Specialty</Label>
                  <div className="text-sm">{getSpecialtyAbbreviation(selectedShift.specialty)}</div>
                </div>
                <div>
                  <Label>Rate</Label>
                  <div className="text-sm font-medium text-green-600">${selectedShift.rate}/hour</div>
                </div>
                <div>
                  <Label>Facility</Label>
                  <div className="text-sm">{selectedShift.facilityName || 'Unknown Facility'}</div>
                </div>
              </div>
              
              {selectedShift.description && (
                <div>
                  <Label>Description</Label>
                  <div className="text-sm text-muted-foreground">{selectedShift.description}</div>
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
    </div>
  );
}