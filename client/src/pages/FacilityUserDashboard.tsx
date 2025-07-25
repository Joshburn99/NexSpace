import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CalendarDays, Clock, Users, AlertTriangle, CheckCircle, TrendingUp, DollarSign, FileText, Loader2, Shield, Activity, Plus, Settings, Building } from "lucide-react";
import { useFacilityPermissions } from "@/hooks/use-facility-permissions";
import { CanAccess } from "@/components/PermissionWrapper";
import { PermissionButton } from "@/components/PermissionButton";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Toaster } from "@/components/ui/toaster";
import { apiRequest } from "@/lib/queryClient";
import { EditableDashboard } from "@/components/dashboard/EditableDashboard";

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
    user: { firstName: string; lastName: string; };
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
              <span className="text-2xl font-bold">{task.count}</span>
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
    return date.toLocaleString();
  };

  const getActionIcon = (action: string) => {
    if (action.includes('shift') || action.includes('assignment')) return <Clock className="h-3 w-3" />;
    if (action.includes('credential') || action.includes('license')) return <Shield className="h-3 w-3" />;
    if (action.includes('staff') || action.includes('user')) return <Users className="h-3 w-3" />;
    return <Activity className="h-3 w-3" />;
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
  const [isEditMode, setIsEditMode] = React.useState(false);

  // Load dashboard statistics
  const { data: dashboardStats, isLoading: statsLoading, error: statsError } = useQuery<DashboardStats>({
    queryKey: ['/api/dashboard/stats'],
    refetchInterval: 30000, // Refresh every 30 seconds for real-time data
  });

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (statsError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Error Loading Dashboard</h2>
          <p className="text-gray-600">Failed to load dashboard data. Please try refreshing the page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold">Dashboard</h1>
            {user && (
              <Badge variant="outline">
                {user?.role === 'super_admin' ? 'Super Admin' : 'Facility User'}
              </Badge>
            )}
          </div>
          <Button
            variant={isEditMode ? "default" : "outline"}
            size="sm"
            onClick={() => setIsEditMode(!isEditMode)}
            className="gap-2"
          >
            <Settings className="h-4 w-4" />
            {isEditMode ? 'Done Editing' : 'Edit Dashboard'}
          </Button>
        </div>

        {/* Stats Overview - Real-time Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Active Staff"
            value={dashboardStats?.activeStaff || 0}
            subtitle="currently on duty"
            icon={Users}
            trend="neutral"
          />
          <StatsCard
            title="Open Shifts"
            value={dashboardStats?.openShifts || 0}
            subtitle="need coverage"
            icon={Clock}
            trend={dashboardStats && dashboardStats.openShifts > 5 ? 'up' : 'neutral'}
            trendValue={dashboardStats && dashboardStats.openShifts > 5 ? `${dashboardStats.openShifts - 5} above target` : undefined}
          />
          <StatsCard
            title="Compliance Rate"
            value={`${dashboardStats?.complianceRate || 0}%`}
            subtitle="facility wide"
            icon={Shield}
            trend={dashboardStats && dashboardStats.complianceRate >= 90 ? 'up' : 'down'}
            trendValue={dashboardStats && dashboardStats.complianceRate >= 90 ? 'Good' : 'Needs attention'}
          />
          <StatsCard
            title="Monthly Revenue"
            value={`$${(dashboardStats?.monthlyRevenue || 0).toLocaleString()}`}
            subtitle="current month"
            icon={DollarSign}
            trend="up"
            trendValue="12% vs last month"
            permission="view_billing"
          />
        </div>

        {/* Secondary Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Monthly Hours"
            value={`${dashboardStats?.monthlyHours || 0}`}
            subtitle="staff hours worked"
            icon={Clock}
            trend="neutral"
          />
          <StatsCard
            title="Total Facilities"
            value={dashboardStats?.totalFacilities || 0}
            subtitle="under management"
            icon={Building}
            trend="neutral"
          />
          <StatsCard
            title="Outstanding Invoices"
            value={dashboardStats?.outstandingInvoices || 0}
            subtitle="pending payment"
            icon={FileText}
            trend={dashboardStats && dashboardStats.outstandingInvoices > 10 ? 'up' : 'neutral'}
            permission="view_billing"
          />
          <StatsCard
            title="Urgent Shifts"
            value={dashboardStats?.urgentShifts || 0}
            subtitle="critical coverage"
            icon={AlertTriangle}
            trend={dashboardStats && dashboardStats.urgentShifts > 0 ? 'up' : 'neutral'}
            permission="view_schedules"
          />
        </div>

        <Separator />

        {/* Priority Tasks and Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PriorityTasksList tasks={dashboardStats?.priorityTasks || []} />
          
          <RecentActivity activities={dashboardStats?.recentActivity || []} />
        </div>

        {/* Quick Actions */}
        <CanAccess permissions={['create_shifts', 'view_schedules', 'manage_facility_settings']}>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Quick Actions
              </CardTitle>
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
      
      {/* Editable Dashboard Overlay */}
      <EditableDashboard 
        isEditMode={isEditMode} 
        dashboardStats={dashboardStats}
        user={user}
      />
      
      <Toaster />
    </div>
  );
}