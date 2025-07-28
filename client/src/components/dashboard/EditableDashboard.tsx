import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  X,
  GripVertical,
  Settings2,
  Layout,
  Users,
  BarChart3,
  Clock,
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
  Eye,
  Check,
} from "lucide-react";
import { useFacilityPermissions } from "@/hooks/use-facility-permissions";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Widget {
  id: string;
  type: string;
  title: string;
  enabled: boolean;
  category: "stats" | "activity" | "analytics" | "operations";
  permissions?: string[];
  icon: React.ComponentType<any>;
  description: string;
}

const AVAILABLE_WIDGETS: Widget[] = [
  // Stats widgets
  {
    id: "active-staff",
    type: "stats",
    title: "Active Staff",
    enabled: true,
    category: "stats",
    permissions: ["view_staff"],
    icon: Users,
    description: "Shows currently active staff members",
  },
  {
    id: "open-shifts",
    type: "stats",
    title: "Open Shifts",
    enabled: true,
    category: "stats",
    permissions: ["view_schedules"],
    icon: Clock,
    description: "Displays shifts needing coverage",
  },
  {
    id: "compliance-rate",
    type: "stats",
    title: "Compliance Rate",
    enabled: true,
    category: "stats",
    permissions: ["view_compliance"],
    icon: Shield,
    description: "Facility-wide compliance percentage",
  },
  {
    id: "monthly-revenue",
    type: "stats",
    title: "Monthly Revenue",
    enabled: true,
    category: "stats",
    permissions: ["view_billing"],
    icon: DollarSign,
    description: "Current month revenue tracking",
  },
  {
    id: "monthly-hours",
    type: "stats",
    title: "Monthly Hours",
    enabled: true,
    category: "stats",
    permissions: ["view_timesheets"],
    icon: Clock,
    description: "Total staff hours worked this month",
  },
  {
    id: "total-facilities",
    type: "stats",
    title: "Total Facilities",
    enabled: true,
    category: "stats",
    icon: Building,
    description: "Number of facilities under management",
  },
  {
    id: "outstanding-invoices",
    type: "stats",
    title: "Outstanding Invoices",
    enabled: true,
    category: "stats",
    permissions: ["view_billing"],
    icon: FileText,
    description: "Invoices pending payment",
  },
  {
    id: "urgent-shifts",
    type: "stats",
    title: "Urgent Shifts",
    enabled: true,
    category: "stats",
    permissions: ["view_schedules"],
    icon: AlertTriangle,
    description: "Critical shifts needing immediate coverage",
  },

  // Activity widgets
  {
    id: "priority-tasks",
    type: "activity",
    title: "Priority Tasks",
    enabled: true,
    category: "activity",
    icon: Target,
    description: "High-priority action items",
  },
  {
    id: "recent-activity",
    type: "activity",
    title: "Recent Activity",
    enabled: true,
    category: "activity",
    icon: Activity,
    description: "Latest platform activities",
  },
  {
    id: "notifications",
    type: "activity",
    title: "Notifications",
    enabled: false,
    category: "activity",
    icon: Bell,
    description: "System notifications and alerts",
  },
  {
    id: "message-center",
    type: "activity",
    title: "Message Center",
    enabled: false,
    category: "activity",
    permissions: ["view_messages"],
    icon: MessageSquare,
    description: "Recent messages and communications",
  },

  // Analytics widgets
  {
    id: "performance-trends",
    type: "analytics",
    title: "Performance Trends",
    enabled: false,
    category: "analytics",
    permissions: ["view_analytics"],
    icon: TrendingUp,
    description: "Staff performance metrics over time",
  },
  {
    id: "capacity-planning",
    type: "analytics",
    title: "Capacity Planning",
    enabled: false,
    category: "analytics",
    permissions: ["view_analytics"],
    icon: BarChart3,
    description: "Future staffing needs analysis",
  },
  {
    id: "financial-summary",
    type: "analytics",
    title: "Financial Summary",
    enabled: false,
    category: "analytics",
    permissions: ["view_billing"],
    icon: PieChart,
    description: "Financial overview and breakdowns",
  },
  {
    id: "schedule-overview",
    type: "analytics",
    title: "Schedule Overview",
    enabled: false,
    category: "analytics",
    permissions: ["view_schedules"],
    icon: Calendar,
    description: "Weekly/monthly schedule summary",
  },

  // Operations widgets
  {
    id: "facility-map",
    type: "operations",
    title: "Facility Map",
    enabled: false,
    category: "operations",
    permissions: ["view_facility_profile"],
    icon: MapPin,
    description: "Interactive facility locations map",
  },
  {
    id: "quick-actions",
    type: "operations",
    title: "Quick Actions",
    enabled: true,
    category: "operations",
    icon: Settings2,
    description: "Common actions and shortcuts",
  },
  {
    id: "staff-availability",
    type: "operations",
    title: "Staff Availability",
    enabled: false,
    category: "operations",
    permissions: ["view_staff"],
    icon: Users,
    description: "Real-time staff availability status",
  },
  {
    id: "shift-coverage",
    type: "operations",
    title: "Shift Coverage",
    enabled: false,
    category: "operations",
    permissions: ["view_schedules"],
    icon: Eye,
    description: "Coverage status across all shifts",
  },
];

interface EditableDashboardProps {
  isEditMode: boolean;
  dashboardStats: any;
  user: any;
}

export function EditableDashboard({ isEditMode, dashboardStats, user }: EditableDashboardProps) {
  const { hasPermission } = useFacilityPermissions();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCustomizeDialog, setShowCustomizeDialog] = useState(false);
  const [widgets, setWidgets] = useState<Widget[]>(AVAILABLE_WIDGETS);
  const [selectedCategory, setSelectedCategory] = useState<
    "all" | "stats" | "activity" | "analytics" | "operations"
  >("all");

  // Filter widgets based on permissions
  const availableWidgets = widgets.filter((widget) => {
    if (!widget.permissions || widget.permissions.length === 0) return true;
    return widget.permissions.some((perm) => hasPermission(perm as any));
  });

  const enabledWidgets = availableWidgets.filter((w) => w.enabled);
  const widgetsByCategory = {
    stats: availableWidgets.filter((w) => w.category === "stats"),
    activity: availableWidgets.filter((w) => w.category === "activity"),
    analytics: availableWidgets.filter((w) => w.category === "analytics"),
    operations: availableWidgets.filter((w) => w.category === "operations"),
  };

  const filteredWidgets =
    selectedCategory === "all" ? availableWidgets : widgetsByCategory[selectedCategory];

  const toggleWidget = (widgetId: string) => {
    setWidgets((prev) => prev.map((w) => (w.id === widgetId ? { ...w, enabled: !w.enabled } : w)));
  };

  const applyPreset = (preset: "essential" | "manager" | "analytics") => {
    const presets = {
      essential: ["active-staff", "open-shifts", "priority-tasks", "recent-activity"],
      manager: [
        "active-staff",
        "open-shifts",
        "compliance-rate",
        "monthly-revenue",
        "priority-tasks",
        "recent-activity",
        "quick-actions",
      ],
      analytics: [
        "performance-trends",
        "capacity-planning",
        "financial-summary",
        "schedule-overview",
        "compliance-rate",
        "monthly-revenue",
      ],
    };

    setWidgets((prev) => prev.map((w) => ({ ...w, enabled: presets[preset].includes(w.id) })));
  };

  const saveDashboardMutation = useMutation({
    mutationFn: async (widgetConfig: any) => {
      const response = await fetch("/api/user/dashboard-preferences", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ widgets: widgetConfig }),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to save dashboard preferences");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Dashboard Saved",
        description: "Your dashboard configuration has been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user/dashboard-preferences"] });
      setShowCustomizeDialog(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save dashboard configuration.",
        variant: "destructive",
      });
    },
  });

  const handleSaveConfiguration = () => {
    const widgetConfig = widgets.map((w) => ({
      id: w.id,
      enabled: w.enabled,
    }));
    saveDashboardMutation.mutate(widgetConfig);
  };

  if (!isEditMode) {
    return null;
  }

  return (
    <>
      {/* Edit Mode Overlay */}
      <div className="fixed inset-0 bg-black/10 z-40 pointer-events-none" />

      {/* Floating Action Button */}
      <div className="fixed bottom-8 right-8 z-50">
        <Button size="lg" onClick={() => setShowCustomizeDialog(true)} className="shadow-lg gap-2">
          <Plus className="h-5 w-5" />
          Customize Widgets
        </Button>
      </div>

      {/* Widget Customization Dialog */}
      <Dialog open={showCustomizeDialog} onOpenChange={setShowCustomizeDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Customize Dashboard Widgets</DialogTitle>
            <DialogDescription>
              Select which widgets to display on your dashboard. Drag to reorder.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Presets */}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => applyPreset("essential")}>
                Essential Only
              </Button>
              <Button variant="outline" size="sm" onClick={() => applyPreset("manager")}>
                Manager View
              </Button>
              <Button variant="outline" size="sm" onClick={() => applyPreset("analytics")}>
                Analytics Focus
              </Button>
            </div>

            {/* Category Filter */}
            <Tabs value={selectedCategory} onValueChange={(v) => setSelectedCategory(v as any)}>
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="stats">Stats</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
                <TabsTrigger value="operations">Operations</TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Widget Selection */}
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-2">
                {filteredWidgets.map((widget) => {
                  const Icon = widget.icon;
                  return (
                    <div
                      key={widget.id}
                      className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                        widget.enabled ? "bg-blue-50 border-blue-200" : "bg-white border-gray-200"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id={widget.id}
                          checked={widget.enabled}
                          onCheckedChange={() => toggleWidget(widget.id)}
                        />
                        <Icon className="h-5 w-5 text-gray-600" />
                        <div>
                          <Label htmlFor={widget.id} className="text-sm font-medium cursor-pointer">
                            {widget.title}
                          </Label>
                          <p className="text-xs text-gray-500">{widget.description}</p>
                          {widget.permissions && widget.permissions.length > 0 && (
                            <div className="flex gap-1 mt-1">
                              {widget.permissions.map((perm) => (
                                <Badge key={perm} variant="outline" className="text-xs">
                                  {perm.replace(/_/g, " ")}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <GripVertical className="h-4 w-4 text-gray-400" />
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            {/* Widget Count */}
            <div className="text-sm text-gray-600">{enabledWidgets.length} widgets selected</div>

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCustomizeDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveConfiguration} disabled={saveDashboardMutation.isPending}>
                {saveDashboardMutation.isPending ? "Saving..." : "Save Configuration"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
