import React, { useState, useCallback } from "react";
import { Responsive, WidthProvider, Layout } from "react-grid-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Settings,
  X,
  Plus,
  BarChart3,
  Clock,
  Users,
  DollarSign,
  AlertTriangle,
  FileText,
  Building,
  Activity,
  Calendar,
  TrendingUp,
  Shield,
  Bell,
  MessageSquare,
  MapPin,
  Target,
  PieChart,
  Save,
  RotateCcw,
} from "lucide-react";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

const ResponsiveGridLayout = WidthProvider(Responsive);

interface WidgetConfig {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  category: "stats" | "activity" | "analytics" | "operations";
  permissions?: string[];
  visible: boolean;
  layout: { x: number; y: number; w: number; h: number };
}

const AVAILABLE_WIDGETS: WidgetConfig[] = [
  // Stats Widgets
  {
    id: "active-staff",
    title: "Active Staff",
    description: "Currently active staff members",
    icon: Users,
    category: "stats",
    visible: true,
    layout: { x: 0, y: 0, w: 3, h: 2 },
  },
  {
    id: "open-shifts",
    title: "Open Shifts",
    description: "Available shift positions",
    icon: Clock,
    category: "stats",
    visible: true,
    layout: { x: 3, y: 0, w: 3, h: 2 },
  },
  {
    id: "compliance-rate",
    title: "Compliance Rate",
    description: "Overall facility compliance percentage",
    icon: Shield,
    category: "stats",
    visible: true,
    layout: { x: 6, y: 0, w: 3, h: 2 },
  },
  {
    id: "monthly-revenue",
    title: "Monthly Revenue",
    description: "Current month revenue totals",
    icon: DollarSign,
    category: "stats",
    permissions: ["view_billing"],
    visible: false,
    layout: { x: 9, y: 0, w: 3, h: 2 },
  },
  {
    id: "urgent-shifts",
    title: "Urgent Shifts",
    description: "Shifts marked as urgent or critical",
    icon: AlertTriangle,
    category: "stats",
    permissions: ["view_schedules"],
    visible: false,
    layout: { x: 0, y: 2, w: 3, h: 2 },
  },
  {
    id: "expiring-credentials",
    title: "Expiring Credentials",
    description: "Staff credentials expiring soon",
    icon: Shield,
    category: "stats",
    permissions: ["view_staff_credentials"],
    visible: false,
    layout: { x: 3, y: 2, w: 3, h: 2 },
  },
  // Activity Widgets
  {
    id: "priority-tasks",
    title: "Priority Tasks",
    description: "Important tasks requiring attention",
    icon: AlertTriangle,
    category: "activity",
    visible: true,
    layout: { x: 0, y: 4, w: 6, h: 4 },
  },
  {
    id: "recent-activity",
    title: "Recent Activity",
    description: "Latest system activities and updates",
    icon: Activity,
    category: "activity",
    visible: true,
    layout: { x: 6, y: 4, w: 6, h: 4 },
  },
  {
    id: "notifications",
    title: "Notifications",
    description: "System alerts and important updates",
    icon: Bell,
    category: "activity",
    visible: false,
    layout: { x: 0, y: 8, w: 4, h: 3 },
  },
  {
    id: "message-center",
    title: "Message Center",
    description: "Recent messages and communications",
    icon: MessageSquare,
    category: "activity",
    visible: false,
    layout: { x: 4, y: 8, w: 4, h: 3 },
  },
  // Analytics Widgets
  {
    id: "performance-trends",
    title: "Performance Trends",
    description: "Staff and facility performance analytics",
    icon: TrendingUp,
    category: "analytics",
    permissions: ["view_analytics"],
    visible: false,
    layout: { x: 0, y: 11, w: 8, h: 4 },
  },
  {
    id: "capacity-planning",
    title: "Capacity Planning",
    description: "Staffing capacity and demand forecasting",
    icon: Target,
    category: "analytics",
    permissions: ["view_analytics"],
    visible: false,
    layout: { x: 8, y: 11, w: 4, h: 4 },
  },
  {
    id: "financial-summary",
    title: "Financial Summary",
    description: "Revenue, costs, and financial metrics",
    icon: PieChart,
    category: "analytics",
    permissions: ["view_billing"],
    visible: false,
    layout: { x: 0, y: 15, w: 6, h: 4 },
  },
  {
    id: "schedule-overview",
    title: "Schedule Overview",
    description: "Weekly and monthly schedule summaries",
    icon: Calendar,
    category: "analytics",
    permissions: ["view_schedules"],
    visible: false,
    layout: { x: 6, y: 15, w: 6, h: 4 },
  },
  // Operations Widgets
  {
    id: "facility-map",
    title: "Facility Map",
    description: "Geographic view of all facilities",
    icon: MapPin,
    category: "operations",
    visible: false,
    layout: { x: 0, y: 19, w: 12, h: 6 },
  },
  {
    id: "staff-availability",
    title: "Staff Availability",
    description: "Real-time staff availability status",
    icon: Users,
    category: "operations",
    permissions: ["view_staff"],
    visible: false,
    layout: { x: 0, y: 25, w: 6, h: 3 },
  },
  {
    id: "shift-coverage",
    title: "Shift Coverage",
    description: "Coverage percentage by department",
    icon: BarChart3,
    category: "operations",
    permissions: ["view_schedules"],
    visible: false,
    layout: { x: 6, y: 25, w: 6, h: 3 },
  },
];

interface DragDropDashboardProps {
  onLayoutChange?: (widgets: WidgetConfig[]) => void;
}

export function DragDropDashboard({ onLayoutChange }: DragDropDashboardProps) {
  const [widgets, setWidgets] = useState<WidgetConfig[]>(AVAILABLE_WIDGETS);
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [layouts, setLayouts] = useState<{ [key: string]: Layout[] }>({});
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Load user's dashboard preferences
  const { data: userWidgets, isLoading } = useQuery({
    queryKey: ["/api/dashboard/widgets"],
    queryFn: () => apiRequest("/api/dashboard/widgets"),
    onSuccess: (data) => {
      if (data?.widgets) {
        setWidgets(data.widgets);
      }
    },
  });

  // Save dashboard preferences
  const saveLayoutMutation = useMutation({
    mutationFn: (widgetConfig: WidgetConfig[]) =>
      apiRequest("/api/dashboard/widgets", "POST", { widgets: widgetConfig }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/widgets"] });
      toast({
        title: "Dashboard Saved",
        description: "Your dashboard layout has been saved successfully.",
      });
      setIsCustomizing(false);
    },
    onError: (error) => {
      console.error("Failed to save dashboard:", error);
      toast({
        title: "Save Failed",
        description: "Could not save dashboard layout. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleLayoutChange = useCallback(
    (layout: Layout[], allLayouts: { [key: string]: Layout[] }) => {
      setLayouts(allLayouts);

      // Update widget layouts based on grid changes
      const updatedWidgets = widgets.map((widget) => {
        const layoutItem = layout.find((item) => item.i === widget.id);
        if (layoutItem) {
          return {
            ...widget,
            layout: { x: layoutItem.x, y: layoutItem.y, w: layoutItem.w, h: layoutItem.h },
          };
        }
        return widget;
      });

      setWidgets(updatedWidgets);
    },
    [widgets]
  );

  const toggleWidget = (widgetId: string) => {
    const updatedWidgets = widgets.map((w) =>
      w.id === widgetId ? { ...w, visible: !w.visible } : w
    );
    setWidgets(updatedWidgets);
  };

  const handleAddWidget = (widgetId: string) => {
    toggleWidget(widgetId);
  };

  const handleRemoveWidget = (widgetId: string) => {
    toggleWidget(widgetId);
  };

  const handleSave = () => {
    saveLayoutMutation.mutate(widgets);
  };

  const handleReset = () => {
    setWidgets(AVAILABLE_WIDGETS);
    toast({
      title: "Dashboard Reset",
      description: "Dashboard has been reset to default layout.",
    });
  };

  const visibleWidgets = widgets.filter((w) => w.visible);
  const hiddenWidgets = widgets.filter((w) => !w.visible);

  const gridLayout = visibleWidgets.map((widget) => ({
    i: widget.id,
    x: widget.layout.x,
    y: widget.layout.y,
    w: widget.layout.w,
    h: widget.layout.h,
    minW: 2,
    minH: 2,
    maxW: 12,
    maxH: 8,
  }));

  const renderWidget = (widget: WidgetConfig) => {
    const IconComponent = widget.icon;

    return (
      <Card key={widget.id} className="h-full flex flex-col">
        {isCustomizing && (
          <div className="absolute top-2 right-2 z-10">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleRemoveWidget(widget.id)}
              className="h-6 w-6 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}
        <CardHeader className="flex-shrink-0 pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <IconComponent className="h-4 w-4" />
            {widget.title}
            {widget.permissions && (
              <Badge variant="secondary" className="text-xs">
                {widget.permissions[0]}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 pt-0">
          <div className="text-xs text-muted-foreground">{widget.description}</div>
          {/* Widget content would go here based on widget.id */}
          <div className="mt-2 text-center text-muted-foreground">
            <div className="text-2xl font-bold">--</div>
            <div className="text-xs">Data loading...</div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return <div>Loading dashboard...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Dashboard Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold">Dashboard</h2>
          <Badge variant="outline">{visibleWidgets.length} widgets</Badge>
        </div>

        <div className="flex items-center gap-2">
          {isCustomizing ? (
            <>
              <Button onClick={handleSave} disabled={saveLayoutMutation.isPending} size="sm">
                <Save className="h-4 w-4 mr-2" />
                Save Layout
              </Button>
              <Button onClick={handleReset} variant="outline" size="sm">
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
              <Button onClick={() => setIsCustomizing(false)} variant="outline" size="sm">
                Cancel
              </Button>
            </>
          ) : (
            <Button onClick={() => setIsCustomizing(true)} size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Customize
            </Button>
          )}
        </div>
      </div>

      {/* Widget Palette (when customizing) */}
      {isCustomizing && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Available Widgets</CardTitle>
            <CardDescription>Click to add widgets to your dashboard</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {hiddenWidgets.map((widget) => {
                const IconComponent = widget.icon;
                return (
                  <Button
                    key={widget.id}
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddWidget(widget.id)}
                    className="flex items-center gap-2 h-auto p-2"
                  >
                    <Plus className="h-3 w-3" />
                    <IconComponent className="h-3 w-3" />
                    <span className="text-xs">{widget.title}</span>
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dashboard Grid */}
      <div
        className={
          isCustomizing ? "border-2 border-dashed border-muted-foreground/20 rounded-lg p-4" : ""
        }
      >
        <ResponsiveGridLayout
          className="layout"
          layouts={layouts}
          onLayoutChange={handleLayoutChange}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
          cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
          rowHeight={60}
          isDraggable={isCustomizing}
          isResizable={isCustomizing}
          compactType="vertical"
          preventCollision={false}
        >
          {visibleWidgets.map(renderWidget)}
        </ResponsiveGridLayout>
      </div>

      {visibleWidgets.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Building className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Widgets Selected</h3>
            <p className="text-muted-foreground text-center mb-4">
              Click "Customize" to add widgets to your dashboard.
            </p>
            <Button onClick={() => setIsCustomizing(true)}>
              <Settings className="h-4 w-4 mr-2" />
              Customize Dashboard
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
