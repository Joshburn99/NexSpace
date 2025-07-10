import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  Download, 
  TrendingUp, 
  Users, 
  Clock,
  DollarSign,
  Calendar,
  FileText,
  Filter
} from 'lucide-react';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

// Sample report data
const shiftCompletionData = [
  { month: 'Jan', completed: 245, total: 280 },
  { month: 'Feb', completed: 290, total: 320 },
  { month: 'Mar', completed: 315, total: 340 },
  { month: 'Apr', completed: 275, total: 300 },
  { month: 'May', completed: 340, total: 360 },
  { month: 'Jun', completed: 320, total: 350 },
];

const staffUtilizationData = [
  { name: 'RN', hours: 1200, cost: 54000 },
  { name: 'LPN', hours: 800, cost: 28000 },
  { name: 'CNA', hours: 600, cost: 18000 },
  { name: 'PT', hours: 400, cost: 16000 },
  { name: 'RT', hours: 300, cost: 12000 },
];

const departmentData = [
  { name: 'ICU', value: 35, hours: 840 },
  { name: 'Emergency', value: 25, hours: 600 },
  { name: 'Med-Surg', value: 20, hours: 480 },
  { name: 'OR', value: 12, hours: 288 },
  { name: 'Other', value: 8, hours: 192 },
];

export default function ReportsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [activeTab, setActiveTab] = useState('overview');

  // Sample data fetching
  const { data: reportMetrics = {}, isLoading } = useQuery({
    queryKey: ['/api/reports/metrics'],
    queryFn: () => Promise.resolve({
      totalShifts: 350,
      completedShifts: 320,
      staffHours: 2400,
      totalCost: 128000,
      avgCompletionRate: 91.4,
      staffUtilization: 87.2
    })
  });

  const exportReport = (type: string) => {
    // Implement export functionality
    console.log(`Exporting ${type} report`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Reports & Analytics</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Comprehensive facility performance and operational analytics
          </p>
        </div>
        <div className="flex space-x-2">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-3 py-2 border rounded-md"
          >
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
            <option value="year">This Year</option>
          </select>
          <Button variant="outline" onClick={() => exportReport('comprehensive')}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Shifts</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportMetrics.totalShifts}</div>
            <p className="text-xs text-muted-foreground">
              +12% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportMetrics.avgCompletionRate}%</div>
            <p className="text-xs text-muted-foreground">
              +2.1% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Staff Hours</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportMetrics.staffHours}</div>
            <p className="text-xs text-muted-foreground">
              +8% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${reportMetrics.totalCost?.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              +5.2% from last month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Report Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="staffing">Staffing</TabsTrigger>
          <TabsTrigger value="departments">Departments</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Shift Completion Trends</CardTitle>
                <CardDescription>Monthly shift completion rates</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={shiftCompletionData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="completed" stroke="#8884d8" />
                    <Line type="monotone" dataKey="total" stroke="#82ca9d" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Department Distribution</CardTitle>
                <CardDescription>Hours by department</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={departmentData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {departmentData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="staffing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Staff Utilization by Role</CardTitle>
              <CardDescription>Hours worked and associated costs by staff type</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={staffUtilizationData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="hours" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="departments" className="space-y-6">
          <div className="grid gap-4">
            {departmentData.map((dept, index) => (
              <Card key={dept.name}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{dept.name}</CardTitle>
                    <Badge variant="outline">{dept.hours} hours</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-4">
                    <div className="flex-1">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${dept.value * 2}%` }}
                        ></div>
                      </div>
                    </div>
                    <span className="text-sm text-gray-600">{dept.value}%</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="financial" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Cost Analysis by Staff Type</CardTitle>
              <CardDescription>Labor costs breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={staffUtilizationData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, 'Cost']} />
                  <Bar dataKey="cost" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}