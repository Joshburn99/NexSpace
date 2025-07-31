import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { 
  TrendingUp, 
  DollarSign, 
  Users, 
  Calendar,
  Download,
  Filter,
  ChevronDown
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StatCard } from '@/components/facility/StatCard';

export function FacilityAnalytics() {
  const [timeRange, setTimeRange] = useState('30d');
  const [metric, setMetric] = useState('staffing_cost');

  const { data: analytics, isLoading } = useQuery({
    queryKey: ['/api/facilities', 1, 'analytics', { metric, range: timeRange }],
    queryFn: async () => {
      // Mock data for demonstration
      return {
        summary: {
          totalCost: 284500,
          avgFillRate: 87,
          totalShifts: 450,
          avgRating: 4.8,
        },
        timeSeries: [
          { date: '2024-01-01', cost: 8200, fillRate: 85, shifts: 15 },
          { date: '2024-01-02', cost: 9100, fillRate: 90, shifts: 18 },
          { date: '2024-01-03', cost: 7800, fillRate: 82, shifts: 14 },
          { date: '2024-01-04', cost: 8500, fillRate: 88, shifts: 16 },
          { date: '2024-01-05', cost: 9400, fillRate: 92, shifts: 19 },
          { date: '2024-01-06', cost: 7600, fillRate: 80, shifts: 13 },
          { date: '2024-01-07', cost: 8900, fillRate: 87, shifts: 17 },
        ],
        departmentBreakdown: [
          { name: 'Emergency', value: 35, color: '#ef4444' },
          { name: 'ICU', value: 25, color: '#3b82f6' },
          { name: 'Surgery', value: 20, color: '#10b981' },
          { name: 'Medical', value: 15, color: '#f59e0b' },
          { name: 'Other', value: 5, color: '#6b7280' },
        ],
        shiftsBySpecialty: [
          { specialty: 'RN', count: 180 },
          { specialty: 'LPN', count: 120 },
          { specialty: 'CNA', count: 90 },
          { specialty: 'RT', count: 35 },
          { specialty: 'PT', count: 25 },
        ],
      };
    },
  });

  const handleExportCSV = () => {

  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Analytics & Reporting</h1>
          <p className="text-muted-foreground">Track facility performance and staffing metrics</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Staffing Cost"
          value={`$${(analytics?.summary.totalCost || 0).toLocaleString()}`}
          description="Last 30 days"
          icon={DollarSign}
          color="green"
          trend={{ value: -5, label: 'vs previous period' }}
        />
        <StatCard
          title="Average Fill Rate"
          value={`${analytics?.summary.avgFillRate || 0}%`}
          description="Shift coverage"
          icon={TrendingUp}
          color="blue"
          trend={{ value: 3, label: 'improvement' }}
        />
        <StatCard
          title="Total Shifts"
          value={analytics?.summary.totalShifts || 0}
          description="Scheduled & completed"
          icon={Calendar}
          color="purple"
        />
        <StatCard
          title="Staff Rating"
          value={analytics?.summary.avgRating || 0}
          description="Average performance"
          icon={Users}
          color="yellow"
        />
      </div>

      {/* Main Analytics */}
      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="departments">Departments</TabsTrigger>
          <TabsTrigger value="specialties">Specialties</TabsTrigger>
          <TabsTrigger value="efficiency">Efficiency</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Staffing Cost Trends</CardTitle>
              <CardDescription>Daily staffing costs over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={analytics?.timeSeries}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="cost" 
                    stroke="#3b82f6" 
                    name="Cost ($)"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Fill Rate Trends</CardTitle>
              <CardDescription>Shift coverage percentage over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={analytics?.timeSeries}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="fillRate" 
                    stroke="#10b981" 
                    name="Fill Rate (%)"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="departments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cost by Department</CardTitle>
              <CardDescription>Staffing cost distribution across departments</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={analytics?.departmentBreakdown}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {analytics?.departmentBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="specialties" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Shifts by Specialty</CardTitle>
              <CardDescription>Distribution of shifts across different specialties</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={analytics?.shiftsBySpecialty}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="specialty" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="efficiency" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Cost Efficiency Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Cost per shift</span>
                    <span className="font-medium">$632</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Overtime percentage</span>
                    <span className="font-medium">12%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Agency usage</span>
                    <span className="font-medium">8%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Cost variance</span>
                    <span className="font-medium text-green-600">-3.2%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Operational Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Avg. time to fill</span>
                    <span className="font-medium">2.3 hours</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">No-show rate</span>
                    <span className="font-medium">2.1%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Early clock-out rate</span>
                    <span className="font-medium">4.5%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Shift cancellations</span>
                    <span className="font-medium">1.8%</span>
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