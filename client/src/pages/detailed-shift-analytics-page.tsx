import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, ScatterChart, Scatter
} from "recharts";
import { 
  TrendingUp, Users, Clock, Target, ArrowLeft, Home, Filter,
  Calendar, Award, Building, UserCheck, Timer, Percent
} from "lucide-react";

interface ShiftAnalytics {
  id: number;
  title: string;
  specialty: string;
  facilityName: string;
  workerType: string;
  totalApplications: number;
  avgApplicationsPerOpening: number;
  daysPosted: number;
  filledDate: string | null;
  status: string;
  urgency: string;
  hourlyRate: number;
  shiftDate: string;
  duration: number;
}

export default function DetailedShiftAnalyticsPage() {
  const [selectedSpecialty, setSelectedSpecialty] = useState("all");
  const [selectedWorkerType, setSelectedWorkerType] = useState("all");
  const [timeRange, setTimeRange] = useState("30");

  const { data: shiftAnalytics = [], isLoading } = useQuery<ShiftAnalytics[]>({
    queryKey: ["/api/shift-analytics", { specialty: selectedSpecialty, workerType: selectedWorkerType, timeRange }],
  });

  // Calculate aggregated metrics
  const totalShifts = shiftAnalytics.length;
  const avgApplicationsPerShift = shiftAnalytics.reduce((sum: number, shift: ShiftAnalytics) => 
    sum + shift.avgApplicationsPerOpening, 0) / totalShifts || 0;
  const avgDaysToFill = shiftAnalytics.filter((s: ShiftAnalytics) => s.status === 'filled')
    .reduce((sum: number, shift: ShiftAnalytics) => sum + shift.daysPosted, 0) / 
    shiftAnalytics.filter((s: ShiftAnalytics) => s.status === 'filled').length || 0;

  // Group by specialty
  const specialtyStats = shiftAnalytics.reduce((acc: any, shift: ShiftAnalytics) => {
    if (!acc[shift.specialty]) {
      acc[shift.specialty] = {
        totalShifts: 0,
        totalApplications: 0,
        avgDaysPosted: 0,
        filledShifts: 0
      };
    }
    acc[shift.specialty].totalShifts++;
    acc[shift.specialty].totalApplications += shift.totalApplications;
    acc[shift.specialty].avgDaysPosted += shift.daysPosted;
    if (shift.status === 'filled') acc[shift.specialty].filledShifts++;
    return acc;
  }, {});

  // Calculate averages for specialty stats
  Object.keys(specialtyStats).forEach(specialty => {
    const stats = specialtyStats[specialty];
    stats.avgApplicationsPerShift = stats.totalApplications / stats.totalShifts;
    stats.avgDaysPosted = stats.avgDaysPosted / stats.totalShifts;
    stats.fillRate = (stats.filledShifts / stats.totalShifts) * 100;
  });

  // Group by worker type
  const workerTypeStats = shiftAnalytics.reduce((acc: any, shift: ShiftAnalytics) => {
    if (!acc[shift.workerType]) {
      acc[shift.workerType] = {
        totalShifts: 0,
        totalApplications: 0,
        avgDaysPosted: 0,
        filledShifts: 0
      };
    }
    acc[shift.workerType].totalShifts++;
    acc[shift.workerType].totalApplications += shift.totalApplications;
    acc[shift.workerType].avgDaysPosted += shift.daysPosted;
    if (shift.status === 'filled') acc[shift.workerType].filledShifts++;
    return acc;
  }, {});

  // Calculate averages for worker type stats
  Object.keys(workerTypeStats).forEach(type => {
    const stats = workerTypeStats[type];
    stats.avgApplicationsPerShift = stats.totalApplications / stats.totalShifts;
    stats.avgDaysPosted = stats.avgDaysPosted / stats.totalShifts;
    stats.fillRate = (stats.filledShifts / stats.totalShifts) * 100;
  });

  // Prepare chart data
  const specialtyChartData = Object.entries(specialtyStats).map(([specialty, stats]: [string, any]) => ({
    specialty: specialty.replace('_', ' ').toUpperCase(),
    avgApplications: Math.round(stats.avgApplicationsPerShift * 10) / 10,
    avgDays: Math.round(stats.avgDaysPosted * 10) / 10,
    fillRate: Math.round(stats.fillRate * 10) / 10
  }));

  const workerTypeChartData = Object.entries(workerTypeStats).map(([type, stats]: [string, any]) => ({
    type: type.replace('_', ' ').toUpperCase(),
    avgApplications: Math.round(stats.avgApplicationsPerShift * 10) / 10,
    avgDays: Math.round(stats.avgDaysPosted * 10) / 10,
    fillRate: Math.round(stats.fillRate * 10) / 10
  }));

  const urgencyDistribution = shiftAnalytics.reduce((acc: any, shift: ShiftAnalytics) => {
    acc[shift.urgency] = (acc[shift.urgency] || 0) + 1;
    return acc;
  }, {});

  const urgencyChartData = Object.entries(urgencyDistribution).map(([urgency, count]) => ({
    urgency: urgency.toUpperCase(),
    count,
    percentage: Math.round((count as number / totalShifts) * 100)
  }));

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  if (isLoading) {
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
          <Link href="/analytics">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Analytics
            </Button>
          </Link>
        </div>
        <h1 className="text-3xl font-bold">Detailed Shift Analytics</h1>
        <p className="text-muted-foreground">
          Comprehensive analysis of shift applications, posting duration, and performance metrics
        </p>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium">Specialty</label>
              <Select value={selectedSpecialty} onValueChange={setSelectedSpecialty}>
                <SelectTrigger>
                  <SelectValue placeholder="All Specialties" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Specialties</SelectItem>
                  <SelectItem value="registered_nurse">Registered Nurse</SelectItem>
                  <SelectItem value="licensed_practical_nurse">Licensed Practical Nurse</SelectItem>
                  <SelectItem value="certified_nursing_assistant">Certified Nursing Assistant</SelectItem>
                  <SelectItem value="physical_therapist">Physical Therapist</SelectItem>
                  <SelectItem value="respiratory_therapist">Respiratory Therapist</SelectItem>
                  <SelectItem value="medical_technologist">Medical Technologist</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Worker Type</label>
              <Select value={selectedWorkerType} onValueChange={setSelectedWorkerType}>
                <SelectTrigger>
                  <SelectValue placeholder="All Worker Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Worker Types</SelectItem>
                  <SelectItem value="internal_employee">Internal Employee</SelectItem>
                  <SelectItem value="contractor_1099">1099 Contractor</SelectItem>
                  <SelectItem value="agency_staff">Agency Staff</SelectItem>
                  <SelectItem value="float_pool">Float Pool</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Time Range</label>
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                  <SelectItem value="365">Last year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-sm font-medium">Total Shifts</p>
                <p className="text-2xl font-bold">{totalShifts}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-sm font-medium">Avg Applications/Shift</p>
                <p className="text-2xl font-bold">{avgApplicationsPerShift.toFixed(1)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-500" />
              <div>
                <p className="text-sm font-medium">Avg Days to Fill</p>
                <p className="text-2xl font-bold">{avgDaysToFill.toFixed(1)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-purple-500" />
              <div>
                <p className="text-sm font-medium">Fill Rate</p>
                <p className="text-2xl font-bold">
                  {((shiftAnalytics.filter((s: ShiftAnalytics) => s.status === 'filled').length / totalShifts) * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="specialty" className="space-y-6">
        <TabsList>
          <TabsTrigger value="specialty">By Specialty</TabsTrigger>
          <TabsTrigger value="worker-type">By Worker Type</TabsTrigger>
          <TabsTrigger value="urgency">By Urgency</TabsTrigger>
          <TabsTrigger value="detailed">Detailed View</TabsTrigger>
        </TabsList>

        <TabsContent value="specialty" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Applications per Opening by Specialty</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={specialtyChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="specialty" angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="avgApplications" fill="#0088FE" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Average Days Posted by Specialty</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={specialtyChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="specialty" angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="avgDays" fill="#00C49F" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Specialty Performance Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Specialty</TableHead>
                    <TableHead>Total Shifts</TableHead>
                    <TableHead>Avg Applications</TableHead>
                    <TableHead>Avg Days Posted</TableHead>
                    <TableHead>Fill Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(specialtyStats).map(([specialty, stats]: [string, any]) => (
                    <TableRow key={specialty}>
                      <TableCell className="font-medium">
                        {specialty.replace('_', ' ').toUpperCase()}
                      </TableCell>
                      <TableCell>{stats.totalShifts}</TableCell>
                      <TableCell>{stats.avgApplicationsPerShift.toFixed(1)}</TableCell>
                      <TableCell>{stats.avgDaysPosted.toFixed(1)}</TableCell>
                      <TableCell>
                        <Badge variant={stats.fillRate > 80 ? "default" : stats.fillRate > 60 ? "secondary" : "destructive"}>
                          {stats.fillRate.toFixed(1)}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="worker-type" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Applications per Opening by Worker Type</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={workerTypeChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="type" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="avgApplications" fill="#FFBB28" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Average Days Posted by Worker Type</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={workerTypeChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="type" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="avgDays" fill="#FF8042" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Worker Type Performance Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Worker Type</TableHead>
                    <TableHead>Total Shifts</TableHead>
                    <TableHead>Avg Applications</TableHead>
                    <TableHead>Avg Days Posted</TableHead>
                    <TableHead>Fill Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(workerTypeStats).map(([type, stats]: [string, any]) => (
                    <TableRow key={type}>
                      <TableCell className="font-medium">
                        {type.replace('_', ' ').toUpperCase()}
                      </TableCell>
                      <TableCell>{stats.totalShifts}</TableCell>
                      <TableCell>{stats.avgApplicationsPerShift.toFixed(1)}</TableCell>
                      <TableCell>{stats.avgDaysPosted.toFixed(1)}</TableCell>
                      <TableCell>
                        <Badge variant={stats.fillRate > 80 ? "default" : stats.fillRate > 60 ? "secondary" : "destructive"}>
                          {stats.fillRate.toFixed(1)}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="urgency" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Shift Distribution by Urgency</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={urgencyChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ urgency, percentage }) => `${urgency} ${percentage}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {urgencyChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Urgency Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {urgencyChartData.map((item, index) => (
                    <div key={item.urgency} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="font-medium">{item.urgency}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">{item.count} shifts</div>
                        <div className="text-sm text-muted-foreground">{item.percentage}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="detailed" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Detailed Shift Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Shift Title</TableHead>
                    <TableHead>Specialty</TableHead>
                    <TableHead>Worker Type</TableHead>
                    <TableHead>Facility</TableHead>
                    <TableHead>Applications</TableHead>
                    <TableHead>Days Posted</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Urgency</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shiftAnalytics.slice(0, 20).map((shift: ShiftAnalytics) => (
                    <TableRow key={shift.id}>
                      <TableCell className="font-medium">{shift.title}</TableCell>
                      <TableCell>{shift.specialty.replace('_', ' ').toUpperCase()}</TableCell>
                      <TableCell>{shift.workerType.replace('_', ' ').toUpperCase()}</TableCell>
                      <TableCell>{shift.facilityName}</TableCell>
                      <TableCell>{shift.totalApplications}</TableCell>
                      <TableCell>{shift.daysPosted}</TableCell>
                      <TableCell>
                        <Badge variant={shift.status === 'filled' ? "default" : shift.status === 'open' ? "secondary" : "destructive"}>
                          {shift.status.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={shift.urgency === 'urgent' ? "destructive" : shift.urgency === 'high' ? "secondary" : "outline"}>
                          {shift.urgency.toUpperCase()}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}