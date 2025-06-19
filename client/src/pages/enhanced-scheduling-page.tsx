import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Calendar as CalendarIcon,
  Clock,
  Users,
  MapPin,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Star,
  Filter,
  Search,
  UserPlus,
  Activity,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { apiRequest, getQueryFn, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import {
  format,
  addDays,
  startOfWeek,
  parseISO,
  isToday,
  isSameDay,
} from 'date-fns';

interface Shift {
  id: number;
  facilityId: number;
  department: string;
  position?: string;
  startTime: string;
  endTime: string;
  requiredStaff: number;
  assignedStaff?: number[];
  hourlyRate: number;
  shiftType: string;
  status?: string;
  notes?: string;
  createdById: number;
  specialRequirements?: string[];
}

interface Staff {
  id: number;
  firstName: string;
  lastName: string;
  role: string;
  specialties: string[];
  reliability: number;
  hourlyRate: number;
  isAvailable: boolean;
  department: string;
}

const specialtyColors = {
  RN: 'bg-blue-500',
  LPN: 'bg-green-500',
  CNA: 'bg-purple-500',
  PT: 'bg-orange-500',
  OT: 'bg-pink-500',
};

const departments = [
  'ICU',
  'Med-Surg',
  'Memory Care',
  'Rehabilitation',
  'Emergency',
];
const positions = ['RN', 'LPN', 'CNA', 'PT', 'OT', 'Aide'];

export default function EnhancedSchedulingPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('week');
  const [isCreateShiftOpen, setIsCreateShiftOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterPosition, setFilterPosition] = useState('all');
  const [searchStaff, setSearchStaff] = useState('');

  // Form state for creating shifts
  const [newShift, setNewShift] = useState({
    department: '',
    position: '',
    startTime: '',
    endTime: '',
    requiredStaff: 1,
    hourlyRate: 30,
    shiftType: 'regular',
    notes: '',
    specialRequirements: [] as string[],
  });

  // Queries
  const { data: shifts = [], isLoading: loadingShifts } = useQuery<Shift[]>({
    queryKey: ['/api/shifts/1'],
    queryFn: getQueryFn({ on401: 'throw' }),
  });

  const { data: users = [], isLoading: loadingUsers } = useQuery<any[]>({
    queryKey: ['/api/users'],
    queryFn: getQueryFn({ on401: 'throw' }),
  });

  const { data: openShifts = [] } = useQuery<Shift[]>({
    queryKey: ['/api/shifts/open'],
    queryFn: getQueryFn({ on401: 'throw' }),
  });

  // Filter staff by internal employees
  const staff: Staff[] = users
    .filter(user => user.role === 'INTERNAL_EMPLOYEE')
    .map(user => ({
      id: user.id,
      firstName: user.firstName || 'Unknown',
      lastName: user.lastName || 'User',
      role: user.role,
      specialties: ['RN'], // Default for now
      reliability: 95,
      hourlyRate: 35,
      isAvailable: true,
      department: 'ICU',
    }));

  // Mutations
  const createShiftMutation = useMutation({
    mutationFn: async (shiftData: any) => {
      const res = await apiRequest('POST', '/api/shifts', {
        ...shiftData,
        facilityId: 1,
        createdById: user?.id,
        startTime: new Date(shiftData.startTime),
        endTime: new Date(shiftData.endTime),
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Shift Created',
        description: 'New shift has been created successfully',
      });
      setIsCreateShiftOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/shifts'] });
      resetForm();
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to create shift',
        variant: 'destructive',
      });
    },
  });

  const assignStaffMutation = useMutation({
    mutationFn: async ({
      shiftId,
      staffIds,
    }: {
      shiftId: number;
      staffIds: number[];
    }) => {
      const res = await apiRequest('PUT', `/api/shifts/${shiftId}/assign`, {
        staffIds,
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Staff Assigned',
        description: 'Staff has been assigned to the shift successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/shifts'] });
    },
    onError: () => {
      toast({
        title: 'Assignment Failed',
        description: 'Failed to assign staff to shift',
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
    setNewShift({
      department: '',
      position: '',
      startTime: '',
      endTime: '',
      requiredStaff: 1,
      hourlyRate: 30,
      shiftType: 'regular',
      notes: '',
      specialRequirements: [],
    });
  };

  const handleCreateShift = () => {
    if (!newShift.department || !newShift.startTime || !newShift.endTime) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }
    createShiftMutation.mutate(newShift);
  };

  const getSpecialtyColor = (specialty: string) => {
    return (
      specialtyColors[specialty as keyof typeof specialtyColors] ||
      'bg-gray-500'
    );
  };

  const getShiftStatusColor = (shift: Shift) => {
    const assignedCount = shift.assignedStaff?.length || 0;
    if (assignedCount === 0) return 'bg-red-100 text-red-800';
    if (assignedCount < shift.requiredStaff)
      return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  const getShiftStatusText = (shift: Shift) => {
    const assignedCount = shift.assignedStaff?.length || 0;
    if (assignedCount === 0) return 'Unfilled';
    if (assignedCount < shift.requiredStaff) return 'Partially Filled';
    return 'Fully Staffed';
  };

  const getWeekDates = (date: Date) => {
    const start = startOfWeek(date);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  };

  const getShiftsForDate = (date: Date) => {
    return shifts.filter(shift => {
      const shiftDate = parseISO(shift.startTime);
      return isSameDay(shiftDate, date);
    });
  };

  const weekDates = getWeekDates(selectedDate);

  return (
    <div className="p-6">
      {/* Quick Actions and Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Button onClick={() => setIsCreateShiftOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Shift
          </Button>
          <Button variant="outline">
            <UserPlus className="w-4 h-4 mr-2" />
            Quick Assign
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={viewMode}
            onValueChange={(value: any) => setViewMode(value)}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Day</SelectItem>
              <SelectItem value="week">Week</SelectItem>
              <SelectItem value="month">Month</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterDepartment} onValueChange={setFilterDepartment}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map(dept => (
                <SelectItem key={dept} value={dept}>
                  {dept}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterPosition} onValueChange={setFilterPosition}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Position" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Positions</SelectItem>
              {positions.map(pos => (
                <SelectItem key={pos} value={pos}>
                  {pos}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search staff..."
            value={searchStaff}
            onChange={e => setSearchStaff(e.target.value)}
            className="pl-10 w-48"
          />
        </div>
      </div>

      {/* Calendar Navigation */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedDate(addDays(selectedDate, -7))}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h2 className="text-lg font-semibold">
            {format(selectedDate, 'MMMM yyyy')}
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedDate(addDays(selectedDate, 7))}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline">
              <CalendarIcon className="w-4 h-4 mr-2" />
              {format(selectedDate, 'PPP')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={date => date && setSelectedDate(date)}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      <Tabs defaultValue="calendar" className="space-y-6">
        <TabsList>
          <TabsTrigger value="calendar">Calendar View</TabsTrigger>
          <TabsTrigger value="shifts">Shifts List</TabsTrigger>
          <TabsTrigger value="staff">Staff Availability</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar">
          {viewMode === 'week' && (
            <div className="grid grid-cols-8 gap-2">
              <div className="font-medium text-sm text-gray-600 p-3"></div>
              {weekDates.map(date => (
                <div
                  key={date.toISOString()}
                  className="text-center p-3 border-b"
                >
                  <div className="font-medium text-sm text-gray-900">
                    {format(date, 'EEE')}
                  </div>
                  <div
                    className={`text-lg font-bold ${isToday(date) ? 'text-blue-600' : 'text-gray-600'}`}
                  >
                    {format(date, 'd')}
                  </div>
                </div>
              ))}

              {/* Time slots */}
              {Array.from({ length: 24 }, (_, hour) => (
                <div key={hour} className="grid grid-cols-8 col-span-8 gap-2">
                  <div className="text-sm text-gray-500 p-2 text-right">
                    {hour === 0
                      ? '12 AM'
                      : hour <= 12
                        ? `${hour} AM`
                        : `${hour - 12} PM`}
                  </div>
                  {weekDates.map(date => {
                    const dayShifts = getShiftsForDate(date).filter(shift => {
                      const shiftHour = new Date(shift.startTime).getHours();
                      return shiftHour === hour;
                    });

                    return (
                      <div
                        key={`${date.toISOString()}-${hour}`}
                        className="min-h-12 border border-gray-100 p-1"
                      >
                        {dayShifts.map(shift => (
                          <div
                            key={shift.id}
                            className="bg-blue-100 text-blue-800 text-xs p-1 rounded mb-1 cursor-pointer hover:bg-blue-200"
                            onClick={() => setSelectedShift(shift)}
                          >
                            <div className="font-medium">
                              {shift.department}
                            </div>
                            <div className="text-xs">{shift.position}</div>
                            <div className="text-xs">
                              {shift.assignedStaff?.length || 0}/
                              {shift.requiredStaff}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="shifts">
          <Card>
            <CardHeader>
              <CardTitle>All Shifts</CardTitle>
              <CardDescription>
                Manage and monitor all scheduled shifts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Department</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Staffing</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shifts.map(shift => (
                    <TableRow key={shift.id}>
                      <TableCell>{shift.department}</TableCell>
                      <TableCell>
                        <Badge
                          className={getSpecialtyColor(shift.position || 'RN')}
                        >
                          {shift.position || 'General'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {format(parseISO(shift.startTime), 'MMM d, yyyy')}
                          </div>
                          <div className="text-sm text-gray-600">
                            {format(parseISO(shift.startTime), 'h:mm a')} -{' '}
                            {format(parseISO(shift.endTime), 'h:mm a')}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          {shift.assignedStaff?.length || 0}/
                          {shift.requiredStaff}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getShiftStatusColor(shift)}>
                          {getShiftStatusText(shift)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedShift(shift)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <UserPlus className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="staff">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Available Staff</CardTitle>
                <CardDescription>
                  Staff members available for assignment
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {staff
                    .filter(s => s.isAvailable)
                    .map(member => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-3 h-3 rounded-full ${getSpecialtyColor(member.specialties[0])}`}
                          ></div>
                          <div>
                            <div className="font-medium">
                              {member.firstName} {member.lastName}
                            </div>
                            <div className="text-sm text-gray-600">
                              {member.department}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 text-yellow-500" />
                            <span className="text-sm">
                              {member.reliability}%
                            </span>
                          </div>
                          <Badge>{member.specialties[0]}</Badge>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Open Shifts</CardTitle>
                <CardDescription>
                  Shifts needing staff assignment
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {openShifts.slice(0, 5).map(shift => (
                    <div key={shift.id} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium">{shift.department}</div>
                        <Badge variant="outline">{shift.position}</Badge>
                      </div>
                      <div className="text-sm text-gray-600 mb-2">
                        {format(parseISO(shift.startTime), 'MMM d, h:mm a')} -{' '}
                        {format(parseISO(shift.endTime), 'h:mm a')}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">
                          Need {shift.requiredStaff} staff
                        </span>
                        <Button size="sm">Assign Staff</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Open Shifts
                    </p>
                    <p className="text-3xl font-bold text-red-600">
                      {openShifts.length}
                    </p>
                  </div>
                  <AlertTriangle className="w-8 h-8 text-red-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Total Shifts
                    </p>
                    <p className="text-3xl font-bold text-blue-600">
                      {shifts.length}
                    </p>
                  </div>
                  <Activity className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Available Staff
                    </p>
                    <p className="text-3xl font-bold text-green-600">
                      {staff.filter(s => s.isAvailable).length}
                    </p>
                  </div>
                  <Users className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Create Shift Dialog */}
      <Dialog open={isCreateShiftOpen} onOpenChange={setIsCreateShiftOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Shift</DialogTitle>
            <DialogDescription>
              Add a new shift to the schedule
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="department">Department</Label>
              <Select
                value={newShift.department}
                onValueChange={value =>
                  setNewShift({ ...newShift, department: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map(dept => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="position">Position</Label>
              <Select
                value={newShift.position}
                onValueChange={value =>
                  setNewShift({ ...newShift, position: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select position" />
                </SelectTrigger>
                <SelectContent>
                  {positions.map(pos => (
                    <SelectItem key={pos} value={pos}>
                      {pos}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startTime">Start Time</Label>
                <Input
                  type="datetime-local"
                  value={newShift.startTime}
                  onChange={e =>
                    setNewShift({ ...newShift, startTime: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="endTime">End Time</Label>
                <Input
                  type="datetime-local"
                  value={newShift.endTime}
                  onChange={e =>
                    setNewShift({ ...newShift, endTime: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="requiredStaff">Required Staff</Label>
                <Input
                  type="number"
                  min="1"
                  value={newShift.requiredStaff}
                  onChange={e =>
                    setNewShift({
                      ...newShift,
                      requiredStaff: parseInt(e.target.value),
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="hourlyRate">Hourly Rate ($)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newShift.hourlyRate}
                  onChange={e =>
                    setNewShift({
                      ...newShift,
                      hourlyRate: parseFloat(e.target.value),
                    })
                  }
                />
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                placeholder="Additional notes or requirements..."
                value={newShift.notes}
                onChange={e =>
                  setNewShift({ ...newShift, notes: e.target.value })
                }
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleCreateShift}
                disabled={createShiftMutation.isPending}
              >
                {createShiftMutation.isPending ? 'Creating...' : 'Create Shift'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsCreateShiftOpen(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
