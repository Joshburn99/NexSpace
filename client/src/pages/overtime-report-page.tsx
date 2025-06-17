import { useState } from "react";
import { TrendingUp, Clock, DollarSign, User, Calendar, Filter, Download } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { SidebarNav } from "@/components/ui/sidebar-nav";

const mockOvertimeData = [
  {
    id: 1,
    employeeName: "Sarah Johnson",
    position: "Registered Nurse",
    department: "ICU",
    regularHours: 40,
    overtimeHours: 12,
    totalHours: 52,
    regularRate: 45,
    overtimeRate: 67.5,
    totalCost: 2610,
    week: "2025-06-16",
    facility: "Sunrise Senior Living"
  },
  {
    id: 2,
    employeeName: "Michael Chen",
    position: "Licensed Practical Nurse",
    department: "Memory Care",
    regularHours: 40,
    overtimeHours: 8,
    totalHours: 48,
    regularRate: 32,
    overtimeRate: 48,
    totalCost: 1664,
    week: "2025-06-16",
    facility: "Golden Years Care"
  },
  {
    id: 3,
    employeeName: "Emily Rodriguez",
    position: "Certified Nursing Assistant",
    department: "Assisted Living",
    regularHours: 40,
    overtimeHours: 6,
    totalHours: 46,
    regularRate: 22,
    overtimeRate: 33,
    totalCost: 1078,
    week: "2025-06-16",
    facility: "Harmony Health Center"
  },
  {
    id: 4,
    employeeName: "David Thompson",
    position: "Physical Therapist",
    department: "Rehabilitation",
    regularHours: 32,
    overtimeHours: 4,
    totalHours: 36,
    regularRate: 55,
    overtimeRate: 82.5,
    totalCost: 2090,
    week: "2025-06-16",
    facility: "Rehabilitation Center East"
  }
];

const weeklyTrends = [
  { week: "2025-05-19", totalOvertimeHours: 18, totalCost: 4125, employees: 3 },
  { week: "2025-05-26", totalOvertimeHours: 24, totalCost: 5680, employees: 4 },
  { week: "2025-06-02", totalOvertimeHours: 32, totalCost: 7250, employees: 5 },
  { week: "2025-06-09", totalOvertimeHours: 28, totalCost: 6890, employees: 4 },
  { week: "2025-06-16", totalOvertimeHours: 30, totalCost: 7442, employees: 4 }
];

export default function OvertimeReportPage() {
  const { user } = useAuth();
  const [timeframe, setTimeframe] = useState("current_week");
  const [department, setDepartment] = useState("all");
  const [employeeType, setEmployeeType] = useState("all");

  const currentWeekData = mockOvertimeData;
  const totalOvertimeHours = currentWeekData.reduce((sum, emp) => sum + emp.overtimeHours, 0);
  const totalOvertimeCost = currentWeekData.reduce((sum, emp) => sum + (emp.overtimeHours * emp.overtimeRate), 0);
  const avgOvertimePerEmployee = totalOvertimeHours / currentWeekData.length;

  // Calculate WoW trends
  const currentWeek = weeklyTrends[weeklyTrends.length - 1];
  const previousWeek = weeklyTrends[weeklyTrends.length - 2];
  const hoursChange = ((currentWeek.totalOvertimeHours - previousWeek.totalOvertimeHours) / previousWeek.totalOvertimeHours) * 100;
  const costChange = ((currentWeek.totalCost - previousWeek.totalCost) / previousWeek.totalCost) * 100;

  const departments = Array.from(new Set(mockOvertimeData.map(emp => emp.department)));

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <SidebarNav user={user!} />
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Overtime Report</h1>
              <p className="text-gray-600 dark:text-gray-300">Analyze overtime trends, costs, and individual insights</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export Report
              </Button>
              <Button>
                <Calendar className="w-4 h-4 mr-2" />
                Schedule Report
              </Button>
            </div>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-4">
                <Select value={timeframe} onValueChange={setTimeframe}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Time Period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="current_week">Current Week</SelectItem>
                    <SelectItem value="last_week">Last Week</SelectItem>
                    <SelectItem value="last_4_weeks">Last 4 Weeks</SelectItem>
                    <SelectItem value="current_month">Current Month</SelectItem>
                    <SelectItem value="last_month">Last Month</SelectItem>
                    <SelectItem value="quarter">This Quarter</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={department} onValueChange={setDepartment}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {departments.map(dept => (
                      <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={employeeType} onValueChange={setEmployeeType}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Employee Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Staff</SelectItem>
                    <SelectItem value="internal">Internal Staff</SelectItem>
                    <SelectItem value="prn">PRN/Contract</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total OT Hours</p>
                    <p className="text-2xl font-bold">{totalOvertimeHours}h</p>
                    <p className={`text-xs ${hoursChange >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                      {hoursChange >= 0 ? '+' : ''}{hoursChange.toFixed(1)}% WoW
                    </p>
                  </div>
                  <Clock className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">OT Cost</p>
                    <p className="text-2xl font-bold">${totalOvertimeCost.toLocaleString()}</p>
                    <p className={`text-xs ${costChange >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                      {costChange >= 0 ? '+' : ''}{costChange.toFixed(1)}% WoW
                    </p>
                  </div>
                  <DollarSign className="w-8 h-8 text-red-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Avg OT/Employee</p>
                    <p className="text-2xl font-bold">{avgOvertimePerEmployee.toFixed(1)}h</p>
                    <p className="text-xs text-gray-500">Per week</p>
                  </div>
                  <User className="w-8 h-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Employees w/ OT</p>
                    <p className="text-2xl font-bold">{currentWeekData.length}</p>
                    <p className="text-xs text-gray-500">This week</p>
                  </div>
                  <User className="w-8 h-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Weekly Trends */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Weekly Trends
                </CardTitle>
                <CardDescription>
                  Overtime hours and costs over the last 5 weeks
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {weeklyTrends.map((week, index) => (
                    <div key={week.week} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div>
                        <p className="font-medium">Week of {new Date(week.week).toLocaleDateString()}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">{week.employees} employees</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{week.totalOvertimeHours}h</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">${week.totalCost.toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Department Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Department Breakdown</CardTitle>
                <CardDescription>
                  Overtime distribution by department
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {departments.map(dept => {
                    const deptData = currentWeekData.filter(emp => emp.department === dept);
                    const deptOTHours = deptData.reduce((sum, emp) => sum + emp.overtimeHours, 0);
                    const deptOTCost = deptData.reduce((sum, emp) => sum + (emp.overtimeHours * emp.overtimeRate), 0);
                    
                    return (
                      <div key={dept} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <h4 className="font-medium">{dept}</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-300">{deptData.length} employees</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{deptOTHours}h</p>
                          <p className="text-sm text-gray-600 dark:text-gray-300">${deptOTCost.toLocaleString()}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Individual Employee Details */}
          <Card>
            <CardHeader>
              <CardTitle>Individual Overtime Details</CardTitle>
              <CardDescription>
                Detailed breakdown by employee for the selected time period
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {currentWeekData.map((employee) => (
                  <div key={employee.id} className="flex items-center justify-between p-4 border rounded-lg hover:shadow-md transition-shadow">
                    <div className="flex items-center space-x-4">
                      <Avatar className="w-12 h-12">
                        <AvatarFallback>
                          {employee.employeeName.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div>
                        <h4 className="font-medium">{employee.employeeName}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-300">{employee.position}</p>
                        <p className="text-sm text-gray-500">{employee.department} • {employee.facility}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-6 text-center">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-300">Regular Hours</p>
                        <p className="font-bold">{employee.regularHours}h</p>
                        <p className="text-xs text-gray-500">${employee.regularRate}/hr</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-300">Overtime Hours</p>
                        <p className="font-bold text-orange-600">{employee.overtimeHours}h</p>
                        <p className="text-xs text-gray-500">${employee.overtimeRate}/hr</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-300">Total Cost</p>
                        <p className="font-bold text-green-600">${employee.totalCost.toLocaleString()}</p>
                        <p className="text-xs text-gray-500">{employee.totalHours}h total</p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end">
                      <Badge className={employee.overtimeHours > 10 ? "bg-red-100 text-red-800" : 
                                      employee.overtimeHours > 5 ? "bg-yellow-100 text-yellow-800" : 
                                      "bg-green-100 text-green-800"}>
                        {employee.overtimeHours > 10 ? "High OT" : 
                         employee.overtimeHours > 5 ? "Moderate OT" : "Low OT"}
                      </Badge>
                      <Button variant="outline" size="sm" className="mt-2">
                        View Details
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}