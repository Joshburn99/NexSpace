import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown, Users, Clock, DollarSign, AlertTriangle, Building, Calendar } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

// Analytics data interfaces
interface StaffingMetrics {
  month: string;
  employees: number;
  contractors: number;
  totalHours: number;
  overtime: number;
  cost: number;
}

interface UnitPerformance {
  unit: string;
  efficiency: number;
  patientSatisfaction: number;
  staffRetention: number;
  avgFillTime: number;
  openShifts: number;
}

interface ShiftTrends {
  date: string;
  filled: number;
  open: number;
  urgent: number;
}

// Mock analytics data
const staffingData: StaffingMetrics[] = [
  { month: 'Jan', employees: 45, contractors: 12, totalHours: 2280, overtime: 156, cost: 89500 },
  { month: 'Feb', employees: 48, contractors: 15, totalHours: 2520, overtime: 189, cost: 98200 },
  { month: 'Mar', employees: 46, contractors: 18, totalHours: 2560, overtime: 203, cost: 102400 },
  { month: 'Apr', employees: 49, contractors: 16, totalHours: 2600, overtime: 187, cost: 99800 },
  { month: 'May', employees: 52, contractors: 14, totalHours: 2640, overtime: 165, cost: 97600 },
  { month: 'Jun', employees: 50, contractors: 17, totalHours: 2680, overtime: 198, cost: 104200 }
];

const unitPerformanceData: UnitPerformance[] = [
  { unit: 'ICU', efficiency: 94, patientSatisfaction: 4.8, staffRetention: 92, avgFillTime: 2.4, openShifts: 3 },
  { unit: 'Med-Surg', efficiency: 89, patientSatisfaction: 4.6, staffRetention: 88, avgFillTime: 3.2, openShifts: 7 },
  { unit: 'Memory Care', efficiency: 91, patientSatisfaction: 4.7, staffRetention: 85, avgFillTime: 4.1, openShifts: 5 },
  { unit: 'Rehabilitation', efficiency: 93, patientSatisfaction: 4.9, staffRetention: 94, avgFillTime: 2.8, openShifts: 2 }
];

const shiftTrendsData: ShiftTrends[] = [
  { date: '2025-06-10', filled: 45, open: 8, urgent: 3 },
  { date: '2025-06-11', filled: 48, open: 6, urgent: 2 },
  { date: '2025-06-12', filled: 42, open: 12, urgent: 5 },
  { date: '2025-06-13', filled: 46, open: 9, urgent: 4 },
  { date: '2025-06-14', filled: 49, open: 7, urgent: 2 },
  { date: '2025-06-15', filled: 51, open: 5, urgent: 1 },
  { date: '2025-06-16', filled: 47, open: 8, urgent: 3 },
  { date: '2025-06-17', filled: 44, open: 11, urgent: 6 }
];

const positionDistribution = [
  { name: 'RN', value: 35, color: '#3B82F6' },
  { name: 'LPN', value: 25, color: '#10B981' },
  { name: 'CNA', value: 30, color: '#8B5CF6' },
  { name: 'PT/OT', value: 8, color: '#F59E0B' },
  { name: 'Other', value: 2, color: '#6B7280' }
];

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [selectedTimeframe, setSelectedTimeframe] = useState('6months');
  const [selectedUnit, setSelectedUnit] = useState('all');

  if (!user) return null;

  const totalStaff = staffingData[staffingData.length - 1].employees + staffingData[staffingData.length - 1].contractors;
  const totalHours = staffingData.reduce((sum, data) => sum + data.totalHours, 0);
  const totalCost = staffingData.reduce((sum, data) => sum + data.cost, 0);
  const avgEfficiency = unitPerformanceData.reduce((sum, unit) => sum + unit.efficiency, 0) / unitPerformanceData.length;

  return (
    <div className="flex h-screen bg-gray-50">
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-white border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
              <p className="text-gray-600">Comprehensive insights into staffing performance and trends</p>
            </div>
            <div className="flex items-center space-x-3">
              <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1month">Last Month</SelectItem>
                  <SelectItem value="3months">Last 3 Months</SelectItem>
                  <SelectItem value="6months">Last 6 Months</SelectItem>
                  <SelectItem value="1year">Last Year</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline">
                <Calendar className="w-4 h-4 mr-2" />
                Custom Range
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {/* Key Performance Indicators */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Staff</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalStaff}</div>
                <p className="text-xs text-muted-foreground">
                  <TrendingUp className="inline w-3 h-3 mr-1" />
                  +8% from last period
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Monthly Hours</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{staffingData[staffingData.length - 1].totalHours.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  <TrendingUp className="inline w-3 h-3 mr-1" />
                  +1.5% from last month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${totalCost.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  <TrendingDown className="inline w-3 h-3 mr-1" />
                  -2.3% from last period
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Efficiency</CardTitle>
                <Building className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{avgEfficiency.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground">
                  <TrendingUp className="inline w-3 h-3 mr-1" />
                  +3.2% from last period
                </p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="staffing" className="space-y-6">
            <TabsList>
              <TabsTrigger value="staffing">Staffing Trends</TabsTrigger>
              <TabsTrigger value="performance">Unit Performance</TabsTrigger>
              <TabsTrigger value="shifts">Shift Analytics</TabsTrigger>
              <TabsTrigger value="composition">Staff Composition</TabsTrigger>
            </TabsList>

            <TabsContent value="staffing" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Staff Count Trends</CardTitle>
                    <CardDescription>Employee vs contractor trends over time</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={staffingData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Line type="monotone" dataKey="employees" stroke="#3B82F6" strokeWidth={2} name="Employees" />
                        <Line type="monotone" dataKey="contractors" stroke="#F59E0B" strokeWidth={2} name="Contractors" />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Cost Analysis</CardTitle>
                    <CardDescription>Monthly staffing costs and overtime trends</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={staffingData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="cost" fill="#10B981" name="Total Cost" />
                        <Bar dataKey="overtime" fill="#EF4444" name="Overtime Hours" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="performance" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Unit Performance Metrics</CardTitle>
                  <CardDescription>Key performance indicators by unit</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {unitPerformanceData.map((unit) => (
                      <div key={unit.unit} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold">{unit.unit}</h3>
                          <div className="flex items-center space-x-2">
                            <Badge variant={unit.openShifts > 5 ? "destructive" : "default"}>
                              {unit.openShifts} open shifts
                            </Badge>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">{unit.efficiency}%</div>
                            <div className="text-sm text-gray-500">Efficiency</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">{unit.patientSatisfaction}</div>
                            <div className="text-sm text-gray-500">Patient Satisfaction</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-purple-600">{unit.staffRetention}%</div>
                            <div className="text-sm text-gray-500">Staff Retention</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-orange-600">{unit.avgFillTime}h</div>
                            <div className="text-sm text-gray-500">Avg Fill Time</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="shifts" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Daily Shift Trends</CardTitle>
                  <CardDescription>Shift fulfillment patterns over the past week</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={shiftTrendsData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} />
                      <YAxis />
                      <Tooltip labelFormatter={(value) => new Date(value).toLocaleDateString()} />
                      <Bar dataKey="filled" stackId="a" fill="#10B981" name="Filled" />
                      <Bar dataKey="open" stackId="a" fill="#F59E0B" name="Open" />
                      <Bar dataKey="urgent" stackId="a" fill="#EF4444" name="Urgent" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="composition" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Staff Position Distribution</CardTitle>
                    <CardDescription>Breakdown by position type</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={positionDistribution}
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, value }) => `${name} ${value}%`}
                        >
                          {positionDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Key Insights</CardTitle>
                    <CardDescription>Notable trends and recommendations</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-start space-x-3">
                        <TrendingUp className="w-5 h-5 text-green-500 mt-0.5" />
                        <div>
                          <div className="font-medium">Improved Efficiency</div>
                          <div className="text-sm text-gray-600">ICU and Rehabilitation units showing 5% efficiency improvement</div>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <AlertTriangle className="w-5 h-5 text-orange-500 mt-0.5" />
                        <div>
                          <div className="font-medium">Overtime Spike</div>
                          <div className="text-sm text-gray-600">March overtime increased 8% due to flu season staffing challenges</div>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <Users className="w-5 h-5 text-blue-500 mt-0.5" />
                        <div>
                          <div className="font-medium">Contractor Utilization</div>
                          <div className="text-sm text-gray-600">25% contractor usage helping maintain staffing flexibility</div>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <Building className="w-5 h-5 text-purple-500 mt-0.5" />
                        <div>
                          <div className="font-medium">Unit Performance</div>
                          <div className="text-sm text-gray-600">All units maintaining {'>'}85% efficiency with strong patient satisfaction scores</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}