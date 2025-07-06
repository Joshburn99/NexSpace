import React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useFacilityPermissions } from '@/hooks/use-facility-permissions';
import { PermissionGuard, ConditionalButton } from '@/components/PermissionGuard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  Users,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  Plus,
  Eye,
  Edit,
  Shield,
  BarChart3
} from 'lucide-react';

// Dashboard metrics based on role permissions
const getDashboardMetrics = (permissions: string[]) => {
  const metrics = [];
  
  if (permissions.includes('view_schedules')) {
    metrics.push({
      title: 'Active Staff',
      value: '67',
      change: '+5 from yesterday',
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      permission: 'view_schedules'
    });
    
    metrics.push({
      title: 'Open Shifts',
      value: '23',
      change: '+8 urgent',
      icon: Calendar,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      permission: 'view_schedules'
    });
  }
  
  if (permissions.includes('view_billing')) {
    metrics.push({
      title: 'Monthly Revenue',
      value: '$2,840',
      change: '+12% vs target',
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      permission: 'view_billing'
    });
  }
  
  if (permissions.includes('manage_compliance')) {
    metrics.push({
      title: 'Compliance Rate',
      value: '87%',
      change: '-3% this week',
      icon: Shield,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      permission: 'manage_compliance'
    });
  }
  
  return metrics;
};

// Priority tasks based on permissions
const getPriorityTasks = (permissions: string[]) => {
  const tasks = [];
  
  if (permissions.includes('view_schedules')) {
    tasks.push({
      title: 'Urgent Shifts Unfilled',
      description: '7 critical shifts need immediate coverage for next 24 hours',
      priority: 'CRITICAL',
      count: 7,
      icon: AlertTriangle,
      permission: 'view_schedules',
      actionText: 'View Shifts',
      actionPermission: 'view_schedules'
    });
  }
  
  if (permissions.includes('manage_compliance')) {
    tasks.push({
      title: 'Expiring Credentials',
      description: '12 staff members have credentials expiring within 30 days',
      priority: 'HIGH',
      count: 12,
      icon: Clock,
      permission: 'manage_compliance',
      actionText: 'Manage Credentials',
      actionPermission: 'manage_credentials'
    });
  }
  
  if (permissions.includes('view_billing')) {
    tasks.push({
      title: 'Pending Invoice Approvals',
      description: '8 contractor invoices awaiting approval',
      priority: 'HIGH',
      count: 8,
      icon: DollarSign,
      permission: 'view_billing',
      actionText: 'Review Invoices',
      actionPermission: 'approve_invoices'
    });
  }
  
  if (permissions.includes('manage_compliance')) {
    tasks.push({
      title: 'Compliance Alert',
      description: 'ICU unit below minimum staffing ratio - immediate attention required',
      priority: 'CRITICAL',
      count: 1,
      icon: Shield,
      permission: 'manage_compliance',
      actionText: 'View Details',
      actionPermission: 'manage_compliance'
    });
  }
  
  return tasks;
};

export default function FacilityUserDashboard() {
  const { user } = useAuth();
  const { getUserPermissions, hasPermission } = useFacilityPermissions();
  
  const userPermissions = getUserPermissions();
  const dashboardMetrics = getDashboardMetrics(userPermissions);
  const priorityTasks = getPriorityTasks(userPermissions);
  
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return 'border-red-500 text-red-700 bg-red-50';
      case 'HIGH': return 'border-orange-500 text-orange-700 bg-orange-50';
      default: return 'border-blue-500 text-blue-700 bg-blue-50';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Dashboard Overview
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Welcome back, {user?.firstName} {user?.lastName}
          </p>
          <Badge variant="outline" className="mt-2">
            {user?.role?.replace('_', ' ').toUpperCase()}
          </Badge>
        </div>
        
        {/* Quick Actions */}
        <div className="flex gap-2">
          <ConditionalButton permission="create_shifts">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Post Shift
            </Button>
          </ConditionalButton>
          
          <ConditionalButton permission="create_staff">
            <Button variant="outline" className="gap-2">
              <Users className="h-4 w-4" />
              Add Staff
            </Button>
          </ConditionalButton>
        </div>
      </div>

      {/* Metrics Grid */}
      {dashboardMetrics.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {dashboardMetrics.map((metric, index) => {
            const IconComponent = metric.icon;
            return (
              <PermissionGuard key={index} permission={metric.permission as any}>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          {metric.title}
                        </p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                          {metric.value}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {metric.change}
                        </p>
                      </div>
                      <div className={`p-3 rounded-lg ${metric.bgColor}`}>
                        <IconComponent className={`h-6 w-6 ${metric.color}`} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </PermissionGuard>
            );
          })}
        </div>
      )}

      {/* Priority Tasks */}
      <PermissionGuard permissions={['view_schedules', 'manage_compliance', 'view_billing']}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Priority Tasks
              <Badge variant="outline" className="ml-auto">
                {priorityTasks.length} items
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {priorityTasks.map((task, index) => {
                const IconComponent = task.icon;
                return (
                  <PermissionGuard key={index} permission={task.permission as any}>
                    <div className={`border-l-4 p-4 rounded-lg ${getPriorityColor(task.priority)}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex gap-3">
                          <IconComponent className="h-5 w-5 mt-0.5" />
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{task.title}</h3>
                              <Badge variant="outline" className="text-xs">
                                {task.priority}
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                {task.count}
                              </Badge>
                            </div>
                            <p className="text-sm mt-1 opacity-80">
                              {task.description}
                            </p>
                          </div>
                        </div>
                        
                        <ConditionalButton permission={task.actionPermission as any}>
                          <Button size="sm" variant="outline">
                            {task.actionText}
                          </Button>
                        </ConditionalButton>
                      </div>
                    </div>
                  </PermissionGuard>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </PermissionGuard>

      {/* Role-Specific Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Scheduling Section */}
        <PermissionGuard permission="view_schedules">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Today's Schedule
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded">
                  <div>
                    <p className="font-medium">ICU Day Shift</p>
                    <p className="text-sm text-gray-600">7:00 AM - 7:00 PM</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">2/3 filled</Badge>
                    <ConditionalButton permission="assign_staff">
                      <Button size="sm" variant="outline">
                        <Edit className="h-3 w-3 mr-1" />
                        Assign
                      </Button>
                    </ConditionalButton>
                  </div>
                </div>
                
                <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-900/20 rounded">
                  <div>
                    <p className="font-medium">Emergency Department</p>
                    <p className="text-sm text-gray-600">11:00 PM - 7:00 AM</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive">0/2 filled</Badge>
                    <ConditionalButton permission="assign_staff">
                      <Button size="sm" variant="outline">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Urgent
                      </Button>
                    </ConditionalButton>
                  </div>
                </div>
              </div>
              
              <ConditionalButton permission="view_schedules">
                <Button variant="outline" className="w-full mt-4">
                  <Eye className="h-4 w-4 mr-2" />
                  View Full Schedule
                </Button>
              </ConditionalButton>
            </CardContent>
          </Card>
        </PermissionGuard>

        {/* Staff Overview */}
        <PermissionGuard permission="view_staff">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Staff Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Active Staff</span>
                  <span className="font-semibold">67</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm">Available Now</span>
                  <span className="font-semibold text-green-600">23</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm">On Shift</span>
                  <span className="font-semibold text-blue-600">44</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm">Credentials Expiring</span>
                  <span className="font-semibold text-orange-600">12</span>
                </div>
              </div>
              
              <ConditionalButton permission="view_staff">
                <Button variant="outline" className="w-full mt-4">
                  <Users className="h-4 w-4 mr-2" />
                  Manage Staff
                </Button>
              </ConditionalButton>
            </CardContent>
          </Card>
        </PermissionGuard>
      </div>

      {/* Access Notice for Limited Users */}
      {userPermissions.length <= 3 && (
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  Limited Access Account
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-300">
                  Your dashboard shows features available to your role. Contact your administrator to request additional permissions.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}