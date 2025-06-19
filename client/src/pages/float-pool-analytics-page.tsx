import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  DollarSign, 
  TrendingUp, 
  Users,
  PieChart,
  BarChart3,
  Award,
  Target,
  Clock,
  Building,
  Calendar,
  Percent
} from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell } from "recharts";

interface FloatPoolMetrics {
  totalSavings: number;
  avgAgencyCost: number;
  avgFloatPoolCost: number;
  utilizationRate: number;
  hoursFloat: number;
  hoursAgency: number;
  monthlyTrend: Array<{
    month: string;
    floatPoolCost: number;
    agencyCost: number;
    savings: number;
  }>;
  departmentBreakdown: Array<{
    department: string;
    floatHours: number;
    agencyHours: number;
    savings: number;
  }>;
}

export default function FloatPoolAnalyticsPage() {
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState("6months");

  const { data: metrics, isLoading } = useQuery<FloatPoolMetrics>({
    queryKey: [`/api/analytics/float-pool?range=${timeRange}`]
  });

  // Sample data for demonstration
  const sampleMetrics: FloatPoolMetrics = {
    totalSavings: 142500,
    avgAgencyCost: 85,
    avgFloatPoolCost: 62,
    utilizationRate: 78,
    hoursFloat: 2840,
    hoursAgency: 1260,
    monthlyTrend: [
      { month: "Jan", floatPoolCost: 18500, agencyCost: 28000, savings: 9500 },
      { month: "Feb", floatPoolCost: 22000, agencyCost: 35000, savings: 13000 },
      { month: "Mar", floatPoolCost: 19800, agencyCost: 31500, savings: 11700 },
      { month: "Apr", floatPoolCost: 24200, agencyCost: 38000, savings: 13800 },
      { month: "May", floatPoolCost: 26500, agencyCost: 42000, savings: 15500 },
      { month: "Jun", floatPoolCost: 28900, agencyCost: 45500, savings: 16600 }
    ],
    departmentBreakdown: [
      { department: "ICU", floatHours: 840, agencyHours: 420, savings: 32500 },
      { department: "Med-Surg", floatHours: 720, agencyHours: 380, savings: 28000 },
      { department: "Emergency", floatHours: 650, agencyHours: 290, savings: 24500 },
      { department: "Pediatrics", floatHours: 430, agencyHours: 120, savings: 18500 },
      { department: "Surgery", floatHours: 200, agencyHours: 50, savings: 9000 }
    ]
  };

  const displayMetrics = metrics || sampleMetrics;
  const savingsRate = ((displayMetrics.avgAgencyCost - displayMetrics.avgFloatPoolCost) / displayMetrics.avgAgencyCost * 100);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  const pieData = displayMetrics.departmentBreakdown.map((dept, index) => ({
    name: dept.department,
    value: dept.savings,
    color: COLORS[index % COLORS.length]
  }));

  return (
    <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Float Pool Analytics</h1>
          <p className="text-gray-600">Cost savings and utilization metrics</p>
        </div>
        <div className="space-y-6">
        {/* Controls */}
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select time range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3months">Last 3 Months</SelectItem>
                <SelectItem value="6months">Last 6 Months</SelectItem>
                <SelectItem value="1year">Last Year</SelectItem>
                <SelectItem value="2years">Last 2 Years</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button>
            <Calendar className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Savings</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                ${displayMetrics.totalSavings.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                <TrendingUp className="inline w-3 h-3 text-green-500 mr-1" />
                +12% from last period
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cost Per Hour Savings</CardTitle>
              <Percent className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                ${displayMetrics.avgAgencyCost - displayMetrics.avgFloatPoolCost}
              </div>
              <p className="text-xs text-muted-foreground">
                {savingsRate.toFixed(1)}% savings vs agency
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Float Pool Utilization</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{displayMetrics.utilizationRate}%</div>
              <Progress value={displayMetrics.utilizationRate} className="mt-2" />
              <p className="text-xs text-muted-foreground mt-1">
                Target: 85%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Float vs Agency Hours</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {((displayMetrics.hoursFloat / (displayMetrics.hoursFloat + displayMetrics.hoursAgency)) * 100).toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">
                {displayMetrics.hoursFloat} float / {displayMetrics.hoursAgency} agency
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Monthly Savings Trend */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="w-5 h-5" />
                <span>Monthly Savings Trend</span>
              </CardTitle>
              <CardDescription>
                Comparison of float pool vs agency costs over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={displayMetrics.monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, '']} />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="floatPoolCost" 
                    stroke="#0088FE" 
                    name="Float Pool Cost"
                    strokeWidth={2}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="agencyCost" 
                    stroke="#FF8042" 
                    name="Agency Cost"
                    strokeWidth={2}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="savings" 
                    stroke="#00C49F" 
                    name="Monthly Savings"
                    strokeWidth={3}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Department Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Building className="w-5 h-5" />
                <span>Savings by Department</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RechartsPieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, 'Savings']} />
                </RechartsPieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Department Hours Comparison */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="w-5 h-5" />
                <span>Hours by Department</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={displayMetrics.departmentBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="department" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="floatHours" fill="#0088FE" name="Float Pool Hours" />
                  <Bar dataKey="agencyHours" fill="#FF8042" name="Agency Hours" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Department Table */}
        <Card>
          <CardHeader>
            <CardTitle>Department Performance Summary</CardTitle>
            <CardDescription>
              Detailed breakdown of float pool utilization and savings by department
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Department</th>
                    <th className="text-right py-2">Float Hours</th>
                    <th className="text-right py-2">Agency Hours</th>
                    <th className="text-right py-2">Total Savings</th>
                    <th className="text-right py-2">Utilization Rate</th>
                    <th className="text-right py-2">Avg Savings/Hour</th>
                  </tr>
                </thead>
                <tbody>
                  {displayMetrics.departmentBreakdown.map((dept, index) => {
                    const totalHours = dept.floatHours + dept.agencyHours;
                    const utilizationRate = (dept.floatHours / totalHours) * 100;
                    const avgSavingsPerHour = dept.savings / dept.floatHours;
                    
                    return (
                      <tr key={index} className="border-b">
                        <td className="py-3 font-medium">{dept.department}</td>
                        <td className="text-right py-3">{dept.floatHours}</td>
                        <td className="text-right py-3">{dept.agencyHours}</td>
                        <td className="text-right py-3 text-green-600 font-semibold">
                          ${dept.savings.toLocaleString()}
                        </td>
                        <td className="text-right py-3">
                          <Badge variant={utilizationRate >= 70 ? "default" : "secondary"}>
                            {utilizationRate.toFixed(1)}%
                          </Badge>
                        </td>
                        <td className="text-right py-3">
                          ${avgSavingsPerHour.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Recommendations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Award className="w-5 h-5" />
              <span>Optimization Recommendations</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">Expand ICU Float Pool</h4>
                <p className="text-blue-800 text-sm">
                  ICU shows highest savings potential. Consider adding 2-3 more float pool nurses 
                  to reduce agency dependency by an estimated 25%.
                </p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <h4 className="font-semibold text-green-900 mb-2">Optimize Surgery Schedule</h4>
                <p className="text-green-800 text-sm">
                  Surgery department has the best float pool utilization rate. Use this model 
                  for other departments to improve overall efficiency.
                </p>
              </div>
              <div className="p-4 bg-yellow-50 rounded-lg">
                <h4 className="font-semibold text-yellow-900 mb-2">Cross-Train Emergency Staff</h4>
                <p className="text-yellow-800 text-sm">
                  Cross-training emergency float pool staff for Med-Surg could increase 
                  utilization and reduce agency costs by an estimated $8,000/month.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
  );
}