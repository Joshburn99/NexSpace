import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { UserCheck, Clock, Calendar, TrendingUp, TrendingDown, Users, Search, Download } from 'lucide-react';
import { useFacilityPermissions } from '@/hooks/use-facility-permissions';

interface AttendanceRecord {
  id: number;
  staffId: number;
  staffName: string;
  specialty: string;
  department: string;
  date: string;
  clockIn: string;
  clockOut?: string;
  scheduledStart: string;
  scheduledEnd: string;
  hoursWorked: number;
  scheduledHours: number;
  status: 'on_time' | 'late' | 'early' | 'absent' | 'no_show';
  notes?: string;
}

export default function AttendancePage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState('week');
  const { hasPermission } = useFacilityPermissions();

  const { data: attendanceData, isLoading } = useQuery<AttendanceRecord[]>({
    queryKey: ['/api/attendance', dateRange, departmentFilter],
    initialData: [
      {
        id: 1,
        staffId: 1,
        staffName: 'Sarah Johnson',
        specialty: 'Registered Nurse',
        department: 'ICU',
        date: '2025-07-14',
        clockIn: '06:55',
        clockOut: '19:10',
        scheduledStart: '07:00',
        scheduledEnd: '19:00',
        hoursWorked: 12.25,
        scheduledHours: 12,
        status: 'on_time',
        notes: 'Stayed late to complete patient care'
      },
      {
        id: 2,
        staffId: 2,
        staffName: 'Michael Chen',
        specialty: 'Licensed Practical Nurse',
        department: 'Emergency',
        date: '2025-07-14',
        clockIn: '07:15',
        clockOut: '19:30',
        scheduledStart: '07:00',
        scheduledEnd: '19:00',
        hoursWorked: 12.25,
        scheduledHours: 12,
        status: 'late',
        notes: 'Traffic delay'
      },
      {
        id: 3,
        staffId: 3,
        staffName: 'Emily Rodriguez',
        specialty: 'Certified Nursing Assistant',
        department: 'Med-Surg',
        date: '2025-07-14',
        clockIn: '06:45',
        clockOut: '18:50',
        scheduledStart: '07:00',
        scheduledEnd: '19:00',
        hoursWorked: 12.08,
        scheduledHours: 12,
        status: 'early',
        notes: 'Early arrival for patient handoff'
      },
      {
        id: 4,
        staffId: 4,
        staffName: 'David Wilson',
        specialty: 'Respiratory Therapist',
        department: 'ICU',
        date: '2025-07-14',
        clockIn: '',
        clockOut: '',
        scheduledStart: '07:00',
        scheduledEnd: '19:00',
        hoursWorked: 0,
        scheduledHours: 12,
        status: 'absent',
        notes: 'Called in sick'
      }
    ]
  });

  if (!hasPermission('view_attendance_reports')) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-gray-600">You don't have permission to view attendance reports.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const filteredAttendance = attendanceData?.filter(record => {
    const matchesSearch = record.staffName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         record.specialty.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         record.department.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = departmentFilter === 'all' || record.department === departmentFilter;
    const matchesStatus = statusFilter === 'all' || record.status === statusFilter;
    
    return matchesSearch && matchesDepartment && matchesStatus;
  }) || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'on_time': return 'bg-green-100 text-green-800';
      case 'early': return 'bg-blue-100 text-blue-800';
      case 'late': return 'bg-yellow-100 text-yellow-800';
      case 'absent': return 'bg-red-100 text-red-800';
      case 'no_show': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'on_time': return UserCheck;
      case 'early': return TrendingUp;
      case 'late': return TrendingDown;
      case 'absent': return Clock;
      case 'no_show': return Users;
      default: return Clock;
    }
  };

  const totalStaff = attendanceData?.length || 0;
  const onTimeCount = attendanceData?.filter(r => r.status === 'on_time').length || 0;
  const lateCount = attendanceData?.filter(r => r.status === 'late').length || 0;
  const absentCount = attendanceData?.filter(r => r.status === 'absent').length || 0;
  const attendanceRate = totalStaff > 0 ? ((totalStaff - absentCount) / totalStaff * 100).toFixed(1) : '0';

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <UserCheck className="h-8 w-8" />
            Attendance Reports
          </h1>
          <p className="text-gray-600 mt-2">Monitor staff attendance and punctuality</p>
        </div>
        <div className="flex gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="records">Attendance Records</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
                <UserCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{attendanceRate}%</div>
                <div className="text-xs text-muted-foreground">
                  {totalStaff - absentCount} of {totalStaff} staff present
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">On Time</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{onTimeCount}</div>
                <div className="text-xs text-muted-foreground">
                  {totalStaff > 0 ? (onTimeCount / totalStaff * 100).toFixed(1) : 0}% punctuality rate
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Late Arrivals</CardTitle>
                <TrendingDown className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{lateCount}</div>
                <div className="text-xs text-muted-foreground">
                  {totalStaff > 0 ? (lateCount / totalStaff * 100).toFixed(1) : 0}% late rate
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Absences</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{absentCount}</div>
                <div className="text-xs text-muted-foreground">
                  {totalStaff > 0 ? (absentCount / totalStaff * 100).toFixed(1) : 0}% absence rate
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="records" className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search staff..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                <SelectItem value="ICU">ICU</SelectItem>
                <SelectItem value="Emergency">Emergency</SelectItem>
                <SelectItem value="Med-Surg">Med-Surg</SelectItem>
                <SelectItem value="Surgery">Surgery</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="on_time">On Time</SelectItem>
                <SelectItem value="early">Early</SelectItem>
                <SelectItem value="late">Late</SelectItem>
                <SelectItem value="absent">Absent</SelectItem>
                <SelectItem value="no_show">No Show</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            {filteredAttendance.map((record) => {
              const StatusIcon = getStatusIcon(record.status);
              return (
                <Card key={record.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <StatusIcon className="h-5 w-5" />
                          <div>
                            <div className="font-semibold">{record.staffName}</div>
                            <div className="text-sm text-gray-600">{record.specialty} • {record.department}</div>
                          </div>
                        </div>
                        <Badge className={getStatusColor(record.status)}>
                          {record.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          {record.clockIn ? `${record.clockIn} - ${record.clockOut || 'Active'}` : 'No Clock In'}
                        </div>
                        <div className="text-xs text-gray-600">
                          Scheduled: {record.scheduledStart} - {record.scheduledEnd}
                        </div>
                        <div className="text-xs text-gray-600">
                          Hours: {record.hoursWorked.toFixed(2)} / {record.scheduledHours}
                        </div>
                      </div>
                    </div>
                    {record.notes && (
                      <div className="mt-2 text-sm text-gray-600 border-t pt-2">
                        <span className="font-medium">Notes:</span> {record.notes}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {filteredAttendance.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <UserCheck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No attendance records found</h3>
                <p className="text-gray-600">
                  {searchTerm || departmentFilter !== 'all' || statusFilter !== 'all' 
                    ? 'Try adjusting your search or filters'
                    : 'No attendance records available for the selected period'
                  }
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Department Attendance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">ICU</span>
                    <span className="text-sm text-gray-600">85%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: '85%' }}></div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Emergency</span>
                    <span className="text-sm text-gray-600">92%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-600 h-2 rounded-full" style={{ width: '92%' }}></div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Med-Surg</span>
                    <span className="text-sm text-gray-600">78%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-yellow-600 h-2 rounded-full" style={{ width: '78%' }}></div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Weekly Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Monday</span>
                    <span className="text-sm text-gray-600">88%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: '88%' }}></div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Tuesday</span>
                    <span className="text-sm text-gray-600">92%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-600 h-2 rounded-full" style={{ width: '92%' }}></div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Wednesday</span>
                    <span className="text-sm text-gray-600">85%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-yellow-600 h-2 rounded-full" style={{ width: '85%' }}></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}