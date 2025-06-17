import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Users, Clock, DollarSign, AlertTriangle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { SidebarNav } from "@/components/ui/sidebar-nav";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function AnalyticsPage() {
  const { user } = useAuth();

  const { data: dashboardStats } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    enabled: !!user,
  });

  const { data: recentActivity = [] } = useQuery({
    queryKey: ["/api/dashboard/recent-activity"],
    enabled: !!user,
  });

  // Mock data for charts - in real app this would come from API
  const staffingData = [
    { name: 'Mon', assigned: 45, required: 50 },
    { name: 'Tue', assigned: 48, required: 50 },
    { name: 'Wed', assigned: 42, required: 50 },
    { name: 'Thu', assigned: 47, required: 50 },
    { name: 'Fri', assigned: 49, required: 50 },
    { name: 'Sat', assigned: 38, required: 45 },
    { name: 'Sun', assigned: 35, required: 45 },
  ];

  const complianceData = [
    { name: 'Credentials', value: 95 },
    { name: 'Training', value: 88 },
    { name: 'Background', value: 100 },
    { name: 'Licenses', value: 92 },
  ];

  const roleDistribution = [
    { name: 'RNs', value: 35, count: 12 },
    { name: 'LPNs', value: 25, count: 8 },
    { name: 'CNAs', value: 40, count: 15 },
  ];

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <SidebarNav user={user!} />
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics</h1>
              <p className="text-gray-600 dark:text-gray-300">Facility performance and insights</p>
            </div>
          </div>

          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Staff</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{(dashboardStats as any)?.activeStaff || 0}</div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-green-600 flex items-center">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    +12% from last week
                  </span>
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Open Shifts</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{(dashboardStats as any)?.openShifts || 0}</div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-red-600 flex items-center">
                    <TrendingDown className="w-3 h-3 mr-1" />
                    +3 from yesterday
                  </span>
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Compliance Rate</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{(dashboardStats as any)?.complianceRate || 0}%</div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-green-600 flex items-center">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    +2% from last month
                  </span>
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Monthly Hours</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{(dashboardStats as any)?.monthlyHours || 0}</div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-green-600 flex items-center">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    +8% from last month
                  </span>
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Staffing Levels Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Weekly Staffing Levels</CardTitle>
                <CardDescription>
                  Required vs assigned staff by day
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={staffingData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="required" fill="#e5e7eb" name="Required" />
                    <Bar dataKey="assigned" fill="#3b82f6" name="Assigned" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Staff Role Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Staff Role Distribution</CardTitle>
                <CardDescription>
                  Current staff by role type
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={roleDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {roleDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Compliance Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Compliance Metrics</CardTitle>
                <CardDescription>
                  Current compliance status across categories
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {complianceData.map((item, index) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <span className="text-sm font-medium">{item.name}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            item.value >= 95 ? 'bg-green-600' : 
                            item.value >= 80 ? 'bg-yellow-600' : 'bg-red-600'
                          }`}
                          style={{ width: `${item.value}%` }}
                        />
                      </div>
                      <Badge variant={item.value >= 95 ? "default" : item.value >= 80 ? "secondary" : "destructive"}>
                        {item.value}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>
                  Latest system events and changes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(recentActivity as any[]).length === 0 ? (
                    <p className="text-sm text-gray-500">No recent activity</p>
                  ) : (
                    (recentActivity as any[]).slice(0, 10).map((activity: any) => (
                      <div key={activity.id} className="flex items-start gap-3 text-sm">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-gray-900 dark:text-white">
                            {activity.action} {activity.resource}
                          </p>
                          <p className="text-gray-500 text-xs">
                            {new Date(activity.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}