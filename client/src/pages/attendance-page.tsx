import { useState } from "react";
import { AlertTriangle, Clock, XCircle, Users, Calendar, Filter, Download, TrendingDown } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { SidebarNav } from "@/components/ui/sidebar-nav";

const mockAttendanceData = [
  {
    id: 1,
    employeeName: "Sarah Johnson",
    position: "Registered Nurse",
    specialty: "ICU",
    employeeType: "internal",
    facility: "Sunrise Senior Living",
    shiftDate: "2025-06-17",
    scheduledStart: "06:00",
    scheduledEnd: "18:00",
    actualClockIn: "06:15",
    actualClockOut: "18:10",
    status: "late_in",
    minutesLate: 15,
    notes: "Traffic delay due to construction"
  },
  {
    id: 2,
    employeeName: "Michael Chen",
    position: "Licensed Practical Nurse",
    specialty: "Memory Care",
    employeeType: "prn",
    facility: "Golden Years Care",
    shiftDate: "2025-06-16",
    scheduledStart: "18:00",
    scheduledEnd: "06:00",
    actualClockIn: null,
    actualClockOut: null,
    status: "ncns",
    minutesLate: 0,
    notes: "No call, no show - unable to reach"
  },
  {
    id: 3,
    employeeName: "Emily Rodriguez",
    position: "Certified Nursing Assistant",
    specialty: "Assisted Living",
    employeeType: "internal",
    facility: "Harmony Health Center",
    shiftDate: "2025-06-15",
    scheduledStart: "14:00",
    scheduledEnd: "22:00",
    actualClockIn: null,
    actualClockOut: null,
    status: "cancelled",
    minutesLate: 0,
    notes: "Called in sick 2 hours before shift"
  },
  {
    id: 4,
    employeeName: "David Thompson",
    position: "Physical Therapist",
    specialty: "Rehabilitation",
    employeeType: "internal",
    facility: "Rehabilitation Center East",
    shiftDate: "2025-06-14",
    scheduledStart: "08:00",
    scheduledEnd: "16:00",
    actualClockIn: "07:45",
    actualClockOut: "16:20",
    status: "early_in",
    minutesLate: -15,
    notes: "Arrived early to prepare for patients"
  },
  {
    id: 5,
    employeeName: "Lisa Williams",
    position: "Registered Nurse",
    specialty: "Emergency",
    employeeType: "prn",
    facility: "Metropolitan Hospital",
    shiftDate: "2025-06-13",
    scheduledStart: "19:00",
    scheduledEnd: "07:00",
    actualClockIn: "19:25",
    actualClockOut: "07:05",
    status: "late_in",
    minutesLate: 25,
    notes: "Family emergency - notified supervisor"
  }
];

const attendanceStats = {
  totalShifts: 150,
  cancelledShifts: 8,
  ncnsShifts: 3,
  lateArrivals: 12,
  earlyArrivals: 5,
  onTimeShifts: 122
};

export default function AttendancePage() {
  const { user } = useAuth();
  const [timeframe, setTimeframe] = useState("last_30_days");
  const [specialty, setSpecialty] = useState("all");
  const [employeeType, setEmployeeType] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const getStatusColor = (status: string) => {
    switch (status) {
      case "cancelled": return "bg-yellow-100 text-yellow-800";
      case "ncns": return "bg-red-100 text-red-800";
      case "late_in": return "bg-orange-100 text-orange-800";
      case "early_in": return "bg-blue-100 text-blue-800";
      case "on_time": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "cancelled": return <XCircle className="w-4 h-4" />;
      case "ncns": return <AlertTriangle className="w-4 h-4" />;
      case "late_in": return <Clock className="w-4 h-4" />;
      case "early_in": return <Clock className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "cancelled": return "Cancelled";
      case "ncns": return "No Call/No Show";
      case "late_in": return "Late Arrival";
      case "early_in": return "Early Arrival";
      case "on_time": return "On Time";
      default: return status;
    }
  };

  const filteredData = mockAttendanceData.filter(record => {
    const matchesSearch = searchTerm === "" || 
      record.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.position.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSpecialty = specialty === "all" || record.specialty === specialty;
    const matchesType = employeeType === "all" || record.employeeType === employeeType;
    const matchesStatus = statusFilter === "all" || record.status === statusFilter;
    
    return matchesSearch && matchesSpecialty && matchesType && matchesStatus;
  });

  const specialties = Array.from(new Set(mockAttendanceData.map(record => record.specialty)));

  const cancelRate = ((attendanceStats.cancelledShifts + attendanceStats.ncnsShifts) / attendanceStats.totalShifts * 100).toFixed(1);
  const lateRate = (attendanceStats.lateArrivals / attendanceStats.totalShifts * 100).toFixed(1);

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <SidebarNav user={user!} />
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Attendance Tracking</h1>
              <p className="text-gray-600 dark:text-gray-300">Monitor shift attendance, cancellations, and punctuality</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export Data
              </Button>
              <Button>
                <Calendar className="w-4 h-4 mr-2" />
                Schedule Report
              </Button>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Shifts</p>
                    <p className="text-2xl font-bold">{attendanceStats.totalShifts}</p>
                  </div>
                  <Users className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Cancelled</p>
                    <p className="text-2xl font-bold text-yellow-600">{attendanceStats.cancelledShifts}</p>
                    <p className="text-xs text-gray-500">{((attendanceStats.cancelledShifts / attendanceStats.totalShifts) * 100).toFixed(1)}%</p>
                  </div>
                  <XCircle className="w-8 h-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">NCNS</p>
                    <p className="text-2xl font-bold text-red-600">{attendanceStats.ncnsShifts}</p>
                    <p className="text-xs text-gray-500">{((attendanceStats.ncnsShifts / attendanceStats.totalShifts) * 100).toFixed(1)}%</p>
                  </div>
                  <AlertTriangle className="w-8 h-8 text-red-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Late Arrivals</p>
                    <p className="text-2xl font-bold text-orange-600">{attendanceStats.lateArrivals}</p>
                    <p className="text-xs text-gray-500">{lateRate}%</p>
                  </div>
                  <Clock className="w-8 h-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Cancel Rate</p>
                    <p className="text-2xl font-bold text-red-600">{cancelRate}%</p>
                    <p className="text-xs text-gray-500">+2.1% this month</p>
                  </div>
                  <TrendingDown className="w-8 h-8 text-red-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">On Time</p>
                    <p className="text-2xl font-bold text-green-600">{attendanceStats.onTimeShifts}</p>
                    <p className="text-xs text-gray-500">{((attendanceStats.onTimeShifts / attendanceStats.totalShifts) * 100).toFixed(1)}%</p>
                  </div>
                  <Clock className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-64">
                  <Input
                    placeholder="Search by employee name or position..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Select value={timeframe} onValueChange={setTimeframe}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Time Period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="last_7_days">Last 7 Days</SelectItem>
                    <SelectItem value="last_30_days">Last 30 Days</SelectItem>
                    <SelectItem value="last_90_days">Last 90 Days</SelectItem>
                    <SelectItem value="current_month">Current Month</SelectItem>
                    <SelectItem value="last_month">Last Month</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={specialty} onValueChange={setSpecialty}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Specialty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Specialties</SelectItem>
                    {specialties.map(spec => (
                      <SelectItem key={spec} value={spec}>{spec}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={employeeType} onValueChange={setEmployeeType}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Employee Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="internal">Internal Staff</SelectItem>
                    <SelectItem value="prn">PRN/Contract</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="ncns">No Call/No Show</SelectItem>
                    <SelectItem value="late_in">Late Arrivals</SelectItem>
                    <SelectItem value="early_in">Early Arrivals</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Attendance Records */}
          <Card>
            <CardHeader>
              <CardTitle>Attendance Records</CardTitle>
              <CardDescription>
                Detailed attendance data for the selected filters ({filteredData.length} records)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredData.map((record) => (
                  <div key={record.id} className="flex items-center justify-between p-4 border rounded-lg hover:shadow-md transition-shadow">
                    <div className="flex items-center space-x-4">
                      <Avatar className="w-12 h-12">
                        <AvatarFallback>
                          {record.employeeName.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div>
                        <h4 className="font-medium">{record.employeeName}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-300">{record.position}</p>
                        <p className="text-sm text-gray-500">
                          {record.specialty} • {record.employeeType === 'internal' ? 'Internal' : 'PRN'}
                        </p>
                      </div>
                    </div>

                    <div className="text-center">
                      <p className="font-medium">{record.facility}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {new Date(record.shiftDate).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-gray-500">
                        {record.scheduledStart} - {record.scheduledEnd}
                      </p>
                    </div>

                    <div className="text-center">
                      {record.actualClockIn ? (
                        <>
                          <p className="text-sm">
                            <span className="font-medium">In:</span> {record.actualClockIn}
                          </p>
                          <p className="text-sm">
                            <span className="font-medium">Out:</span> {record.actualClockOut || 'Active'}
                          </p>
                          {record.minutesLate !== 0 && (
                            <p className={`text-xs ${record.minutesLate > 0 ? 'text-red-500' : 'text-blue-500'}`}>
                              {record.minutesLate > 0 ? '+' : ''}{record.minutesLate} minutes
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="text-sm text-gray-500">No clock data</p>
                      )}
                    </div>

                    <div className="text-center">
                      <Badge className={getStatusColor(record.status)}>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(record.status)}
                          {getStatusLabel(record.status)}
                        </div>
                      </Badge>
                      {record.notes && (
                        <p className="text-xs text-gray-500 mt-1 max-w-32">
                          {record.notes}
                        </p>
                      )}
                    </div>

                    <Button variant="outline" size="sm">
                      View Details
                    </Button>
                  </div>
                ))}
              </div>

              {filteredData.length === 0 && (
                <div className="text-center py-8">
                  <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No attendance records found
                  </h3>
                  <p className="text-gray-500">
                    Try adjusting your search criteria or filters
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}