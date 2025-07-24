import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CalendarDays, Clock, Users, AlertTriangle, CheckCircle, TrendingUp, DollarSign, FileText, Loader2, Shield, Activity, Plus, Edit, X, Building, Settings } from "lucide-react";
import { useFacilityPermissions } from "@/hooks/use-facility-permissions";
import { CanAccess } from "@/components/PermissionWrapper";
import { DashboardCustomization } from "@/components/dashboard/DashboardCustomization";
import { PermissionButton } from "@/components/PermissionButton";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";

interface DashboardStats {
  activeStaff: number;
  openShifts: number;
  complianceRate: number;
  monthlyHours: number;
  totalFacilities: number;
  urgentShifts: number;
  expiringCredentials: number;
  outstandingInvoices: number;
  monthlyRevenue: number;
  recentActivity: Array<{
    id: number;
    action: string;
    resource: string;
    createdAt: string;
    user: {
      firstName: string;
      lastName: string;
    } | null;
  }>;
  priorityTasks: Array<{
    id: string;
    title: string;
    type: 'urgent' | 'warning' | 'info';
    count: number;
  }>;
}

// Comprehensive stats card component
const StatsCard: React.FC<{
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  permission?: string;
}> = ({ title, value, subtitle, icon: Icon, trend, trendValue, permission }) => {
  const { hasPermission } = useFacilityPermissions();
  
  if (permission && !hasPermission(permission as any)) {
    return null;
  }

  const getTrendColor = (trend?: 'up' | 'down' | 'neutral') => {
    switch (trend) {
      case 'up': return 'text-green-600';
      case 'down': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getTrendIcon = (trend?: 'up' | 'down' | 'neutral') => {
    switch (trend) {
      case 'up': return TrendingUp;
      case 'down': return TrendingUp;
      default: return Activity;
    }
  };

  const TrendIcon = getTrendIcon(trend);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">{title}</CardTitle>
        <Icon className="h-4 w-4 text-gray-400" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {(subtitle || trendValue) && (
          <div className="flex items-center space-x-1 text-xs">
            {trend && <TrendIcon className={`h-3 w-3 ${getTrendColor(trend)}`} />}
            <span className={getTrendColor(trend)}>
              {trendValue && trendValue}
              {subtitle && !trendValue && subtitle}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Priority tasks component
const PriorityTasksList: React.FC<{ tasks: DashboardStats['priorityTasks'] }> = ({ tasks }) => {
  const getTaskBadgeColor = (type: 'urgent' | 'warning' | 'info') => {
    switch (type) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'info': return 'bg-blue-100 text-blue-800';
    }
  };

  if (tasks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Priority Tasks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-600" />
            <p className="text-lg font-medium">All caught up!</p>
            <p className="text-sm">No urgent tasks require attention at this time.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          Priority Tasks
          <Badge variant="secondary">{tasks.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {tasks.map((task) => (
          <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium">{task.title}</span>
                <Badge className={getTaskBadgeColor(task.type)}>
                  {task.type.toUpperCase()}
                </Badge>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900">{task.count}</div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

// Recent activity component
const RecentActivity: React.FC<{ activities: DashboardStats['recentActivity'] }> = ({ activities }) => {
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    return date.toLocaleDateString();
  };

  const getActionIcon = (action: string) => {
    switch (action.toLowerCase()) {
      case 'create': return <Plus className="h-3 w-3" />;
      case 'update': return <Edit className="h-3 w-3" />;
      case 'delete': return <X className="h-3 w-3" />;
      default: return <Activity className="h-3 w-3" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Activity className="h-5 w-5 text-blue-600" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Activity className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>No recent activity</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded">
                <div className="flex-shrink-0 p-1 bg-gray-100 rounded">
                  {getActionIcon(activity.action)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {activity.action} {activity.resource}
                  </p>
                  <p className="text-xs text-gray-500">
                    by {activity.user?.firstName} {activity.user?.lastName}
                  </p>
                </div>
                <div className="text-xs text-gray-400">
                  {formatTimestamp(activity.createdAt)}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Main dashboard component
export default function FacilityUserDashboard() {
  const { user } = useAuth();
  const { hasPermission } = useFacilityPermissions();

  // Fetch live dashboard data with fallback
  const { data: dashboardStats, isLoading, error } = useQuery<DashboardStats>({
    queryKey: ['/api/dashboard/stats'],
    refetchInterval: 30000, // Refresh every 30 seconds
    retry: false, // Don't retry failed requests to prevent endless loading
  });

  // Fallback data for when API fails
  const fallbackStats: DashboardStats = {
    activeStaff: 67,
    openShifts: 23,
    complianceRate: 87,
    monthlyHours: 2840,
    totalFacilities: 3,
    urgentShifts: 8,
    expiringCredentials: 5,
    outstandingInvoices: 3,
    monthlyRevenue: 125000,
    recentActivity: [
      {
        id: 1,
        action: "Shift assignment updated",
        resource: "ICU Night Shift",
        createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        user: { firstName: "Sarah", lastName: "Johnson" }
      },
      {
        id: 2,
        action: "Staff credential renewed",
        resource: "RN License",
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        user: { firstName: "Mike", lastName: "Chen" }
      }
    ],
    priorityTasks: [
      { id: "1", title: "Urgent Shifts", type: "urgent", count: 8 },
      { id: "2", title: "Expiring Credentials", type: "warning", count: 5 },
      { id: "3", title: "Pending Invoices", type: "info", count: 3 }
    ]
  };

  // Use fallback data if API fails, but show loading state initially
  const stats = dashboardStats || fallbackStats;
  const isUsingFallback = !dashboardStats && !isLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
            <p className="text-lg font-medium">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600">
              Welcome back, {user?.firstName}. Here's what's happening at your facilities.
            </p>
            {isUsingFallback && (
              <div className="mt-2 flex items-center gap-2 text-sm text-amber-600">
                <AlertTriangle className="h-4 w-4" />
                <span>Using sample data - Live data temporarily unavailable</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            <DashboardCustomization />
            <div className="text-right">
              <div className="text-sm text-gray-500">
                {isUsingFallback ? "Sample Data" : "Live Data"}
              </div>
              <div className="text-lg font-medium">{new Date().toLocaleTimeString()}</div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Active Staff"
            value={stats.activeStaff}
            icon={Users}
            trend="neutral"
            permission="view_schedules"
          />
          
          <CanAccess permissions={['view_schedules']}>
            <StatsCard
              title="Open Shifts"
              value={stats.openShifts}
              subtitle={stats.urgentShifts > 0 ? `${stats.urgentShifts} urgent` : 'No urgent shifts'}
              icon={CalendarDays}
              trend={stats.urgentShifts > 0 ? 'down' : 'neutral'}
            />
          </CanAccess>

          <CanAccess permissions={['view_compliance', 'manage_compliance']}>
            <StatsCard
              title="Compliance Rate"
              value={`${stats.complianceRate}%`}
              subtitle={stats.expiringCredentials > 0 ? `${stats.expiringCredentials} expiring` : 'All current'}
              icon={Shield}
              trend={stats.complianceRate >= 90 ? 'up' : stats.complianceRate >= 80 ? 'neutral' : 'down'}
            />
          </CanAccess>

          <CanAccess permissions={['view_billing']}>
            <StatsCard
              title="Monthly Revenue"
              value={`$${stats.monthlyRevenue.toLocaleString()}`}
              subtitle={stats.outstandingInvoices > 0 ? `${stats.outstandingInvoices} pending` : 'All current'}
              icon={DollarSign}
              trend="up"
            />
          </CanAccess>
        </div>

        {/* Secondary Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatsCard
            title="Monthly Hours"
            value={stats.monthlyHours.toLocaleString()}
            icon={Clock}
            trend="neutral"
            permission="view_schedules"
          />
          
          <StatsCard
            title="Total Facilities"
            value={stats.totalFacilities}
            icon={Building}
            trend="neutral"
          />

          <CanAccess permissions={['view_billing']}>
            <StatsCard
              title="Outstanding Invoices"
              value={stats.outstandingInvoices}
              icon={FileText}
              trend={stats.outstandingInvoices > 0 ? 'down' : 'neutral'}
            />
          </CanAccess>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Priority Tasks */}
          <PriorityTasksList tasks={stats.priorityTasks} />

          {/* Recent Activity */}
          <RecentActivity activities={stats.recentActivity} />
        </div>

        {/* Quick Actions */}
        <CanAccess permissions={['create_shifts', 'view_schedules', 'manage_facility_settings']}>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
              <CardDescription>Common tasks and shortcuts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <PermissionButton
                  permissions={['create_shifts']}
                  variant="outline"
                  className="h-20 flex flex-col items-center justify-center space-y-2"
                >
                  <Plus className="h-5 w-5" />
                  <span>Add Shift</span>
                </PermissionButton>

                <PermissionButton
                  permissions={['view_schedules']}
                  variant="outline"
                  className="h-20 flex flex-col items-center justify-center space-y-2"
                >
                  <CalendarDays className="h-5 w-5" />
                  <span>View Calendar</span>
                </PermissionButton>

                <PermissionButton
                  permissions={['manage_facility_settings']}
                  variant="outline"
                  className="h-20 flex flex-col items-center justify-center space-y-2"
                >
                  <Settings className="h-5 w-5" />
                  <span>Settings</span>
                </PermissionButton>
              </div>
            </CardContent>
          </Card>
        </CanAccess>
      </div>
    </div>
  );
}