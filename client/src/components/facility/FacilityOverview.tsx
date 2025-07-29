import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Building2, 
  Users, 
  Calendar, 
  DollarSign,
  TrendingUp,
  Clock,
  UserCheck,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatCard } from './StatCard';
import { useAuth } from '@/hooks/use-auth';

export function FacilityOverview() {
  const { user } = useAuth();
  const facilityId = 1; // TODO: Get from context or route

  const { data: stats, isLoading } = useQuery({
    queryKey: ['/api/facilities', facilityId, 'stats'],
    queryFn: async () => {
      // Mock data for now
      return {
        openShifts: 12,
        staffCount: 186,
        complianceRate: 92,
        monthlyRevenue: 425000,
        fillRate: 87,
        overtimeHours: 234,
        upcomingShifts: 48,
        activeStaff: 142,
      };
    },
  });

  const { data: recentActivity } = useQuery({
    queryKey: ['/api/facilities', facilityId, 'activity'],
    queryFn: async () => {
      return [
        { id: 1, type: 'shift_filled', message: 'Emergency Dept shift filled by Sarah Johnson', time: '5 minutes ago' },
        { id: 2, type: 'credential_expiring', message: 'John Smith\'s RN license expires in 30 days', time: '1 hour ago' },
        { id: 3, type: 'shift_created', message: 'New ICU night shift posted for tomorrow', time: '2 hours ago' },
        { id: 4, type: 'staff_added', message: 'Maria Garcia joined as Registered Nurse', time: '3 hours ago' },
      ];
    },
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
          <h1 className="text-2xl font-bold">Facility Overview</h1>
          <p className="text-muted-foreground">Welcome back, {user?.name || user?.email}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">View Reports</Button>
          <Button>
            <Calendar className="w-4 h-4 mr-2" />
            View Schedule
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Open Shifts"
          value={stats?.openShifts || 0}
          description="Requiring coverage"
          icon={Calendar}
          color="red"
          trend={{ value: -15, label: 'from last week' }}
        />
        <StatCard
          title="Active Staff"
          value={stats?.staffCount || 0}
          description="Currently employed"
          icon={Users}
          color="blue"
          trend={{ value: 5, label: 'new this month' }}
        />
        <StatCard
          title="Compliance Rate"
          value={`${stats?.complianceRate || 0}%`}
          description="Credentials up to date"
          icon={UserCheck}
          color="green"
        />
        <StatCard
          title="Monthly Revenue"
          value={`$${(stats?.monthlyRevenue || 0).toLocaleString()}`}
          description="Current month"
          icon={DollarSign}
          color="purple"
          trend={{ value: 8, label: 'vs last month' }}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Shift Coverage */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Shift Coverage This Week</CardTitle>
            <CardDescription>Overview of staffing levels by department</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Emergency Department</span>
                  <span className="text-sm text-muted-foreground">85%</span>
                </div>
                <Progress value={85} className="h-2" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">ICU</span>
                  <span className="text-sm text-muted-foreground">92%</span>
                </div>
                <Progress value={92} className="h-2" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Medical-Surgical</span>
                  <span className="text-sm text-muted-foreground">78%</span>
                </div>
                <Progress value={78} className="h-2" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Pediatrics</span>
                  <span className="text-sm text-muted-foreground">95%</span>
                </div>
                <Progress value={95} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start">
              <Calendar className="w-4 h-4 mr-2" />
              Create Shift
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Users className="w-4 h-4 mr-2" />
              Add Staff Member
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <AlertCircle className="w-4 h-4 mr-2" />
              View Urgent Shifts
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <UserCheck className="w-4 h-4 mr-2" />
              Review Credentials
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest updates from your facility</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivity?.map((activity) => (
              <div key={activity.id} className="flex items-start gap-4">
                <div className={`p-2 rounded-full ${
                  activity.type === 'shift_filled' ? 'bg-green-100' :
                  activity.type === 'credential_expiring' ? 'bg-yellow-100' :
                  activity.type === 'shift_created' ? 'bg-blue-100' :
                  'bg-gray-100'
                }`}>
                  {activity.type === 'shift_filled' ? <UserCheck className="w-4 h-4 text-green-600" /> :
                   activity.type === 'credential_expiring' ? <AlertCircle className="w-4 h-4 text-yellow-600" /> :
                   activity.type === 'shift_created' ? <Calendar className="w-4 h-4 text-blue-600" /> :
                   <Users className="w-4 h-4 text-gray-600" />}
                </div>
                <div className="flex-1">
                  <p className="text-sm">{activity.message}</p>
                  <p className="text-xs text-muted-foreground">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}