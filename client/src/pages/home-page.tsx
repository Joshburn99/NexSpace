import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { 
  AlertTriangle, 
  Clock, 
  Users, 
  Calendar, 
  MessageSquare, 
  FileText, 
  TrendingUp,
  ArrowRight,
  Bell,
  CheckCircle,
  XCircle,
  AlertCircle,
  Plus,
  UserCheck,
  DollarSign,
  Building
} from "lucide-react";
import { Link } from "wouter";

// Priority task interfaces
interface PriorityTask {
  id: string;
  title: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  type: 'shift' | 'compliance' | 'invoice' | 'credential' | 'message';
  dueDate?: Date;
  count?: number;
  route: string;
}

interface QuickStat {
  title: string;
  value: string | number;
  change: string;
  trend: 'up' | 'down' | 'neutral';
  icon: any;
  color: string;
}

// Mock priority tasks data
const priorityTasks: PriorityTask[] = [
  {
    id: '1',
    title: 'Urgent Shifts Unfilled',
    description: '7 critical shifts need immediate coverage for next 24 hours',
    priority: 'critical',
    type: 'shift',
    count: 7,
    route: '/scheduling'
  },
  {
    id: '2',
    title: 'Expiring Credentials',
    description: '12 staff members have credentials expiring within 30 days',
    priority: 'high',
    type: 'credential',
    count: 12,
    dueDate: new Date(2025, 6, 1),
    route: '/credentials'
  },
  {
    id: '3',
    title: 'Pending Invoice Approvals',
    description: '8 contractor invoices awaiting approval',
    priority: 'high',
    type: 'invoice',
    count: 8,
    route: '/invoices'
  },
  {
    id: '4',
    title: 'Compliance Alert',
    description: 'ICU unit below minimum staffing ratio - immediate attention required',
    priority: 'critical',
    type: 'compliance',
    route: '/compliance'
  },
  {
    id: '5',
    title: 'Unread Messages',
    description: '15 urgent messages from staff requiring response',
    priority: 'medium',
    type: 'message',
    count: 15,
    route: '/messaging'
  }
];

// Today's shifts with proper staffing
const todaysShifts = [
  {
    id: '1',
    unit: 'ICU',
    shift: '7:00 AM - 7:00 PM',
    required: { RN: 2, CNA: 3 },
    assigned: { RN: 1, CNA: 3 },
    status: 'understaffed'
  },
  {
    id: '2',
    unit: 'Med-Surg',
    shift: '7:00 AM - 7:00 PM',
    required: { RN: 1, LPN: 1, CNA: 3 },
    assigned: { RN: 1, LPN: 1, CNA: 3 },
    status: 'filled'
  },
  {
    id: '3',
    unit: 'Memory Care',
    shift: '7:00 AM - 7:00 PM',
    required: { RN: 1, CNA: 3 },
    assigned: { RN: 1, CNA: 2 },
    status: 'understaffed'
  },
  {
    id: '4',
    unit: 'Rehabilitation',
    shift: '7:00 AM - 7:00 PM',
    required: { RN: 1, PT: 1, CNA: 3 },
    assigned: { RN: 1, PT: 1, CNA: 3 },
    status: 'filled'
  },
  {
    id: '5',
    unit: 'ICU',
    shift: '7:00 PM - 7:00 AM',
    required: { RN: 2, CNA: 3 },
    assigned: { RN: 0, CNA: 0 },
    status: 'critical'
  },
  {
    id: '6',
    unit: 'Med-Surg',
    shift: '7:00 PM - 7:00 AM',
    required: { RN: 1, LPN: 1, CNA: 3 },
    assigned: { RN: 1, LPN: 0, CNA: 2 },
    status: 'understaffed'
  }
];

const quickStats: QuickStat[] = [
  {
    title: 'Active Staff',
    value: 67,
    change: '+5 from yesterday',
    trend: 'up',
    icon: Users,
    color: 'text-blue-600'
  },
  {
    title: 'Open Shifts',
    value: 23,
    change: '+8 urgent',
    trend: 'up',
    icon: Calendar,
    color: 'text-red-600'
  },
  {
    title: 'Compliance Rate',
    value: '87%',
    change: '-3% this week',
    trend: 'down',
    icon: CheckCircle,
    color: 'text-yellow-600'
  },
  {
    title: 'Monthly Hours',
    value: '2,840',
    change: '+12% vs target',
    trend: 'up',
    icon: Clock,
    color: 'text-green-600'
  }
];

const recentActivity = [
  {
    id: '1',
    action: 'Sarah Johnson applied for RN - ICU Night Shift',
    time: '5 minutes ago',
    type: 'application',
    icon: UserCheck
  },
  {
    id: '2',
    action: 'Michael Chen submitted timesheet for approval',
    time: '15 minutes ago',
    type: 'timesheet',
    icon: FileText
  },
  {
    id: '3',
    action: 'Emergency shift posted - Med-Surg 11PM-7AM',
    time: '1 hour ago',
    type: 'shift',
    icon: AlertTriangle
  },
  {
    id: '4',
    action: 'Lisa Wang credential renewal approved',
    time: '2 hours ago',
    type: 'credential',
    icon: CheckCircle
  },
  {
    id: '5',
    action: 'Contractor invoice #INV-2025-067 pending review',
    time: '3 hours ago',
    type: 'invoice',
    icon: DollarSign
  }
];

export default function HomePage() {
  const { user } = useAuth();

  if (!user) return null;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'border-red-500 bg-red-50';
      case 'high': return 'border-orange-500 bg-orange-50';
      case 'medium': return 'border-yellow-500 bg-yellow-50';
      case 'low': return 'border-blue-500 bg-blue-50';
      default: return 'border-gray-500 bg-gray-50';
    }
  };

  const getPriorityBadgeColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getShiftStatusColor = (status: string) => {
    switch (status) {
      case 'filled': return 'text-green-600 bg-green-100';
      case 'understaffed': return 'text-orange-600 bg-orange-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600">Welcome back, {user.firstName}</p>
            </div>
            <div className="flex items-center space-x-3">
              <Button variant="outline">
                <Bell className="w-4 h-4 mr-2" />
                Notifications
              </Button>
              <Link href="/scheduling">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Post Shift
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            {quickStats.map((stat, index) => (
              <Card key={index}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground">{stat.change}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Priority Tasks */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Priority Tasks</h2>
              <Link href="/tasks">
                <Button variant="outline" size="sm">
                  View All
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {priorityTasks.slice(0, 4).map((task) => (
                <Link key={task.id} href={task.route}>
                  <Card className={`cursor-pointer hover:shadow-md transition-shadow border-l-4 ${getPriorityColor(task.priority)}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className="font-semibold">{task.title}</h3>
                            <Badge className={getPriorityBadgeColor(task.priority)}>
                              {task.priority.toUpperCase()}
                            </Badge>
                            {task.count && (
                              <Badge variant="secondary">
                                {task.count}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                          {task.dueDate && (
                            <p className="text-xs text-gray-500">
                              Due: {task.dueDate.toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <ArrowRight className="w-4 h-4 text-gray-400 mt-1" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Today's Shifts */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Today's Shifts</CardTitle>
                  <Link href="/scheduling">
                    <Button variant="outline" size="sm">
                      View Schedule
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </div>
                <CardDescription>Current staffing status across all units</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {todaysShifts.map((shift) => (
                    <div key={shift.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="font-medium">{shift.unit}</h4>
                          <Badge className={getShiftStatusColor(shift.status)}>
                            {shift.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">{shift.shift}</p>
                        <div className="flex items-center space-x-4 mt-2 text-xs">
                          {Object.entries(shift.required).map(([role, count]) => (
                            <div key={role} className="flex items-center space-x-1">
                              <span className="text-gray-500">{role}:</span>
                              <span className={shift.assigned[role] >= count ? 'text-green-600' : 'text-red-600'}>
                                {shift.assigned[role] || 0}/{count}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Recent Activity</CardTitle>
                  <Link href="/activity">
                    <Button variant="outline" size="sm">
                      View All
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </div>
                <CardDescription>Latest updates and actions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <activity.icon className="w-4 h-4 text-gray-400 mt-1" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900">{activity.action}</p>
                        <p className="text-xs text-gray-500">{activity.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}