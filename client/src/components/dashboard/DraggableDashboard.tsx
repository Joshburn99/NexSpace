import React, { useState, useEffect } from "react";
import GridLayout, { Layout, WidthProvider } from "react-grid-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CalendarDays,
  Clock,
  Users,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  DollarSign,
  FileText,
  Shield,
  Activity,
  Building,
  X,
  GripVertical,
} from "lucide-react";
import { useFacilityPermissions } from "@/hooks/use-facility-permissions";
import { CanAccess } from "@/components/PermissionWrapper";
// PriorityTasksList is defined inline in FacilityUserDashboard.tsx
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

const ResponsiveGridLayout = WidthProvider(GridLayout);

interface DashboardWidget {
  id: string;
  title: string;
  type: "stats" | "activity" | "chart";
  permission?: string;
  icon: React.ComponentType<any>;
  content?: React.ReactNode;
}

interface DraggableDashboardProps {
  isEditMode: boolean;
  dashboardStats: any;
  onSaveLayout?: (layout: Layout[]) => void;
}

const GRID_COLS = 12;
const ROW_HEIGHT = 100;

export function DraggableDashboard({ isEditMode, dashboardStats }: DraggableDashboardProps) {
  const { hasPermission } = useFacilityPermissions();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Load saved preferences
  const { data: savedPreferences } = useQuery({
    queryKey: ["/api/user/dashboard-preferences"],
    enabled: true,
  });

  // Default layout configuration
  const defaultLayouts: { [key: string]: Layout } = {
    "active-staff": { i: "active-staff", x: 0, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
    "open-shifts": { i: "open-shifts", x: 3, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
    "compliance-rate": { i: "compliance-rate", x: 6, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
    "monthly-revenue": { i: "monthly-revenue", x: 9, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
    "monthly-hours": { i: "monthly-hours", x: 0, y: 2, w: 3, h: 2, minW: 2, minH: 2 },
    "total-facilities": { i: "total-facilities", x: 3, y: 2, w: 3, h: 2, minW: 2, minH: 2 },
    "outstanding-invoices": { i: "outstanding-invoices", x: 6, y: 2, w: 3, h: 2, minW: 2, minH: 2 },
    "urgent-shifts": { i: "urgent-shifts", x: 9, y: 2, w: 3, h: 2, minW: 2, minH: 2 },
    "priority-tasks": { i: "priority-tasks", x: 0, y: 4, w: 6, h: 3, minW: 4, minH: 3 },
    "recent-activity": { i: "recent-activity", x: 6, y: 4, w: 6, h: 3, minW: 4, minH: 3 },
  };

  const [layouts, setLayouts] = useState<Layout[]>(() => {
    if (savedPreferences && "layout" in savedPreferences && savedPreferences.layout) {
      return savedPreferences.layout;
    }
    return Object.values(defaultLayouts);
  });

  const [enabledWidgets, setEnabledWidgets] = useState<string[]>(() => {
    if (savedPreferences && "widgets" in savedPreferences && savedPreferences.widgets) {
      return savedPreferences.widgets.filter((w: any) => w.enabled).map((w: any) => w.id);
    }
    return Object.keys(defaultLayouts);
  });

  // Define available widgets
  const widgets: DashboardWidget[] = [
    {
      id: "active-staff",
      title: "Active Staff",
      type: "stats",
      permission: "view_staff",
      icon: Users,
      content: (
        <div className="text-center">
          <div className="text-3xl font-bold">{dashboardStats?.activeStaff || 0}</div>
          <p className="text-sm text-gray-600">currently on duty</p>
        </div>
      ),
    },
    {
      id: "open-shifts",
      title: "Open Shifts",
      type: "stats",
      permission: "view_schedules",
      icon: Clock,
      content: (
        <div className="text-center">
          <div className="text-3xl font-bold">{dashboardStats?.openShifts || 0}</div>
          <p className="text-sm text-gray-600">→ 5 above target</p>
        </div>
      ),
    },
    {
      id: "compliance-rate",
      title: "Compliance Rate",
      type: "stats",
      permission: "view_compliance",
      icon: Shield,
      content: (
        <div className="text-center">
          <div className="text-3xl font-bold">{dashboardStats?.complianceRate || 100}%</div>
          <p className="text-sm text-gray-600">→ Good</p>
        </div>
      ),
    },
    {
      id: "monthly-revenue",
      title: "Monthly Revenue",
      type: "stats",
      permission: "view_billing",
      icon: DollarSign,
      content: (
        <div className="text-center">
          <div className="text-3xl font-bold">
            ${((dashboardStats?.monthlyRevenue || 0) / 1000).toFixed(0)}k
          </div>
          <p className="text-sm text-gray-600">→ 12% vs last month</p>
        </div>
      ),
    },
    {
      id: "monthly-hours",
      title: "Monthly Hours",
      type: "stats",
      permission: "view_timesheets",
      icon: Clock,
      content: (
        <div className="text-center">
          <div className="text-3xl font-bold">{dashboardStats?.monthlyHours || 0}</div>
          <p className="text-sm text-gray-600">staff hours worked</p>
        </div>
      ),
    },
    {
      id: "total-facilities",
      title: "Total Facilities",
      type: "stats",
      icon: Building,
      content: (
        <div className="text-center">
          <div className="text-3xl font-bold">{dashboardStats?.totalFacilities || 0}</div>
          <p className="text-sm text-gray-600">under management</p>
        </div>
      ),
    },
    {
      id: "outstanding-invoices",
      title: "Outstanding Invoices",
      type: "stats",
      permission: "view_billing",
      icon: FileText,
      content: (
        <div className="text-center">
          <div className="text-3xl font-bold">{dashboardStats?.outstandingInvoices || 0}</div>
          <p className="text-sm text-gray-600">pending payment</p>
        </div>
      ),
    },
    {
      id: "urgent-shifts",
      title: "Urgent Shifts",
      type: "stats",
      permission: "view_schedules",
      icon: AlertTriangle,
      content: (
        <div className="text-center">
          <div className="text-3xl font-bold">{dashboardStats?.urgentShifts || 0}</div>
          <p className="text-sm text-gray-600">critical coverage</p>
        </div>
      ),
    },
    {
      id: "priority-tasks",
      title: "Priority Tasks",
      type: "activity",
      icon: AlertTriangle,
      content: (
        <div className="space-y-3">
          {(dashboardStats?.priorityTasks || []).map((task: any) => (
            <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">{task.title}</span>
                  <Badge
                    className={
                      task.type === "urgent"
                        ? "bg-red-100 text-red-800"
                        : task.type === "warning"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-blue-100 text-blue-800"
                    }
                  >
                    {task.type.toUpperCase()}
                  </Badge>
                </div>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold">{task.count}</span>
              </div>
            </div>
          ))}
          {(!dashboardStats?.priorityTasks || dashboardStats.priorityTasks.length === 0) && (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-600" />
              <p className="text-lg font-medium">All caught up!</p>
              <p className="text-sm">No urgent tasks require attention.</p>
            </div>
          )}
        </div>
      ),
    },
    {
      id: "recent-activity",
      title: "Recent Activity",
      type: "activity",
      icon: Activity,
      content: (
        <div className="space-y-3">
          {dashboardStats?.recentActivity?.slice(0, 5).map((activity: any) => (
            <div key={activity.id} className="flex items-start gap-3 text-sm">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
              <div className="flex-1">
                <p>
                  {activity.action} {activity.resource}
                </p>
                <p className="text-xs text-gray-500">
                  by {activity.user?.firstName} {activity.user?.lastName} •{" "}
                  {new Date(activity.createdAt).toRelativeTime()}
                </p>
              </div>
            </div>
          )) || <p className="text-sm text-gray-500">No recent activity</p>}
        </div>
      ),
    },
  ];

  // Filter widgets based on permissions and enabled state
  const visibleWidgets = widgets.filter((widget) => {
    if (!enabledWidgets.includes(widget.id)) return false;
    if (widget.permission && !hasPermission(widget.permission as any)) return false;
    return true;
  });

  const visibleLayouts = layouts.filter((layout) => visibleWidgets.some((w) => w.id === layout.i));

  // Save dashboard mutation
  const saveDashboardMutation = useMutation({
    mutationFn: async (data: { layout: Layout[]; widgets: any[] }) => {
      const response = await fetch("/api/user/dashboard-preferences", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to save dashboard preferences");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Dashboard Saved",
        description: "Your dashboard layout has been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user/dashboard-preferences"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save dashboard layout.",
        variant: "destructive",
      });
    },
  });

  const handleLayoutChange = (newLayout: Layout[]) => {
    setLayouts(newLayout);
  };

  const removeWidget = (widgetId: string) => {
    setEnabledWidgets((prev) => prev.filter((id) => id !== widgetId));
  };

  useEffect(() => {
    if (!isEditMode && layouts.length > 0) {
      // Auto-save when exiting edit mode
      const widgetConfig = Object.keys(defaultLayouts).map((id) => ({
        id,
        enabled: enabledWidgets.includes(id),
      }));
      saveDashboardMutation.mutate({ layout: layouts, widgets: widgetConfig });
    }
  }, [isEditMode]);

  return (
    <ResponsiveGridLayout
      className={`layout ${isEditMode ? "editing" : ""}`}
      layout={visibleLayouts}
      cols={GRID_COLS}
      rowHeight={ROW_HEIGHT}
      isDraggable={isEditMode}
      isResizable={isEditMode}
      onLayoutChange={handleLayoutChange}
      margin={[16, 16]}
      containerPadding={[0, 0]}
      style={{ minHeight: "800px" }}
    >
      {visibleWidgets.map((widget) => {
        const Icon = widget.icon;
        return (
          <div key={widget.id} className="dashboard-widget">
            <Card className="h-full relative group">
              {isEditMode && (
                <>
                  <div className="absolute top-2 left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                    <GripVertical className="h-5 w-5 text-gray-400 cursor-move" />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 z-10 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeWidget(widget.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </>
              )}
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  {widget.title}
                </CardTitle>
              </CardHeader>
              <CardContent>{widget.content}</CardContent>
            </Card>
          </div>
        );
      })}
    </ResponsiveGridLayout>
  );
}

// Add extension for relative time
declare global {
  interface Date {
    toRelativeTime(): string;
  }
}

Date.prototype.toRelativeTime = function () {
  const seconds = Math.floor((new Date().getTime() - this.getTime()) / 1000);
  const intervals = [
    { label: "year", seconds: 31536000 },
    { label: "month", seconds: 2592000 },
    { label: "day", seconds: 86400 },
    { label: "hour", seconds: 3600 },
    { label: "minute", seconds: 60 },
  ];

  for (const interval of intervals) {
    const count = Math.floor(seconds / interval.seconds);
    if (count >= 1) {
      return `${count} ${interval.label}${count > 1 ? "s" : ""} ago`;
    }
  }
  return "just now";
};
