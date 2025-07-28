import React from "react";
import { CanAccess } from "./PermissionWrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Calendar,
  Users,
  DollarSign,
  BarChart3,
  FileText,
  Clock,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";

interface DashboardWidget {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  permissions: string[];
  content: React.ReactNode;
  priority: "high" | "medium" | "low";
}

/**
 * Permission-based dashboard component that shows widgets based on user permissions
 * Each widget is wrapped in permission checks to ensure only authorized users see relevant data
 */
export function PermissionDashboard() {
  const widgets: DashboardWidget[] = [
    {
      id: "active-staff",
      title: "Active Staff",
      icon: Users,
      permissions: ["view_staff"],
      priority: "high",
      content: (
        <div className="space-y-2">
          <div className="text-2xl font-bold text-blue-600">67</div>
          <div className="text-sm text-gray-600">5 more than yesterday</div>
        </div>
      ),
    },
    {
      id: "open-shifts",
      title: "Open Shifts",
      icon: Calendar,
      permissions: ["view_schedule"],
      priority: "high",
      content: (
        <div className="space-y-2">
          <div className="text-2xl font-bold text-red-600">23</div>
          <div className="text-sm text-gray-600">12 urgent</div>
        </div>
      ),
    },
    {
      id: "compliance-rate",
      title: "Compliance Rate",
      icon: CheckCircle,
      permissions: ["view_compliance"],
      priority: "medium",
      content: (
        <div className="space-y-2">
          <div className="text-2xl font-bold text-green-600">87%</div>
          <div className="text-sm text-gray-600">+2% this week</div>
        </div>
      ),
    },
    {
      id: "monthly-hours",
      title: "Monthly Hours",
      icon: Clock,
      permissions: ["view_timesheets"],
      priority: "medium",
      content: (
        <div className="space-y-2">
          <div className="text-2xl font-bold text-purple-600">2,840</div>
          <div className="text-sm text-gray-600">avg 142 hours</div>
        </div>
      ),
    },
    {
      id: "billing-summary",
      title: "Billing Summary",
      icon: DollarSign,
      permissions: ["view_billing"],
      priority: "medium",
      content: (
        <div className="space-y-2">
          <div className="text-2xl font-bold text-green-600">$48,320</div>
          <div className="text-sm text-gray-600">This month</div>
        </div>
      ),
    },
    {
      id: "analytics-overview",
      title: "Analytics Overview",
      icon: BarChart3,
      permissions: ["view_analytics"],
      priority: "low",
      content: (
        <div className="space-y-2">
          <div className="text-2xl font-bold text-blue-600">↑ 15%</div>
          <div className="text-sm text-gray-600">Performance increase</div>
        </div>
      ),
    },
  ];

  // Sort widgets by priority (high > medium > low)
  const sortedWidgets = widgets.sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {sortedWidgets.map((widget) => (
        <CanAccess key={widget.id} permissions={widget.permissions as any[]}>
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">{widget.title}</CardTitle>
              <widget.icon className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>{widget.content}</CardContent>
          </Card>
        </CanAccess>
      ))}
    </div>
  );
}

/**
 * Priority task component that shows urgent items based on user permissions
 */
export function PriorityTasks() {
  const tasks = [
    {
      id: "urgent-shifts",
      title: "Urgent Shifts Unfilled",
      description: "7 critical shifts need immediate coverage for next 24 hours",
      priority: "critical",
      permissions: ["view_schedule", "edit_shifts"],
      action: "View Details",
    },
    {
      id: "expiring-credentials",
      title: "Expiring Credentials",
      description: "12 staff members have credentials expiring within 30 days",
      priority: "high",
      permissions: ["view_staff_credentials", "manage_credentials"],
      action: "Due 7/15/25",
    },
    {
      id: "pending-approvals",
      title: "Pending Invoice Approvals",
      description: "8 contractor invoices awaiting approval",
      priority: "high",
      permissions: ["view_billing", "approve_invoices"],
      action: "Review",
    },
    {
      id: "compliance-alert",
      title: "Compliance Alert",
      description: "ICU unit below minimum staffing ratio - immediate attention required",
      priority: "critical",
      permissions: ["view_compliance", "manage_facility_settings"],
      action: "Address Now",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Priority Tasks</h3>
        <CanAccess permissions={["view_reports", "view_analytics"]}>
          <button className="text-sm text-blue-600 hover:text-blue-800">View All →</button>
        </CanAccess>
      </div>

      <div className="space-y-3">
        {tasks.map((task) => (
          <CanAccess key={task.id} permissions={task.permissions as any[]}>
            <div
              className={`p-4 rounded-lg border-l-4 ${
                task.priority === "critical"
                  ? "border-red-500 bg-red-50"
                  : "border-yellow-500 bg-yellow-50"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-gray-900">{task.title}</h4>
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        task.priority === "critical"
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {task.priority.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                </div>
                <button className="text-sm text-blue-600 hover:text-blue-800 whitespace-nowrap ml-4">
                  {task.action}
                </button>
              </div>
            </div>
          </CanAccess>
        ))}
      </div>
    </div>
  );
}
