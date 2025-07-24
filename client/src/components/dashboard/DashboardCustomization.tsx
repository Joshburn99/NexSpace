import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Settings, Layout, BarChart3, Clock, Users, DollarSign, AlertTriangle, FileText, Building, Activity, Calendar, TrendingUp, Shield, Bell, MessageSquare, MapPin, Target, PieChart } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface WidgetConfig {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  category: 'stats' | 'activity' | 'analytics' | 'operations';
  permissions?: string[];
  visible: boolean;
  position?: { x: number; y: number; w: number; h: number };
}

interface DashboardLayout {
  layout: string;
  widgets: WidgetConfig[];
}

const availableWidgets: WidgetConfig[] = [
  // Core Stats Widgets
  {
    id: 'active-staff',
    title: 'Active Staff',
    description: 'Display current active staff count',
    icon: Users,
    category: 'stats',
    permissions: ['view_staff'],
    visible: true,
    position: { x: 0, y: 0, w: 3, h: 2 }
  },
  {
    id: 'open-shifts',
    title: 'Open Shifts',
    description: 'Show number of unfilled shifts',
    icon: Clock,
    category: 'stats',
    permissions: ['view_schedules'],
    visible: true,
    position: { x: 3, y: 0, w: 3, h: 2 }
  },
  {
    id: 'compliance-rate',
    title: 'Compliance Rate',
    description: 'Staff compliance percentage',
    icon: Shield,
    category: 'stats',
    permissions: ['view_compliance'],
    visible: true,
    position: { x: 6, y: 0, w: 3, h: 2 }
  },
  {
    id: 'monthly-revenue',
    title: 'Monthly Revenue',
    description: 'Current month revenue totals',
    icon: DollarSign,
    category: 'stats',
    permissions: ['view_billing'],
    visible: false,
    position: { x: 9, y: 0, w: 3, h: 2 }
  },
  {
    id: 'monthly-hours',
    title: 'Monthly Hours',
    description: 'Total hours worked this month',
    icon: Clock,
    category: 'stats',
    permissions: ['view_schedules'],
    visible: false,
    position: { x: 0, y: 2, w: 4, h: 2 }
  },
  {
    id: 'total-facilities',
    title: 'Total Facilities',
    description: 'Number of associated facilities',
    icon: Building,
    category: 'stats',
    visible: false,
    position: { x: 4, y: 2, w: 4, h: 2 }
  },
  {
    id: 'outstanding-invoices',
    title: 'Outstanding Invoices',
    description: 'Pending invoice count',
    icon: FileText,
    category: 'stats',
    permissions: ['view_billing'],
    visible: false,
    position: { x: 8, y: 2, w: 4, h: 2 }
  },
  {
    id: 'urgent-shifts',
    title: 'Urgent Shifts',
    description: 'Shifts marked as urgent or critical',
    icon: AlertTriangle,
    category: 'stats',
    permissions: ['view_schedules'],
    visible: false,
    position: { x: 0, y: 8, w: 4, h: 2 }
  },
  {
    id: 'expiring-credentials',
    title: 'Expiring Credentials',
    description: 'Staff credentials expiring soon',
    icon: Shield,
    category: 'stats',
    permissions: ['view_staff_credentials'],
    visible: false,
    position: { x: 4, y: 8, w: 4, h: 2 }
  },
  
  // Activity & Communication Widgets
  {
    id: 'priority-tasks',
    title: 'Priority Tasks',
    description: 'Important tasks requiring attention',
    icon: AlertTriangle,
    category: 'activity',
    visible: true,
    position: { x: 0, y: 4, w: 6, h: 4 }
  },
  {
    id: 'recent-activity',
    title: 'Recent Activity',
    description: 'Latest system activities and updates',
    icon: Activity,
    category: 'activity',
    visible: true,
    position: { x: 6, y: 4, w: 6, h: 4 }
  },
  {
    id: 'notifications',
    title: 'Notifications',
    description: 'System alerts and important updates',
    icon: Bell,
    category: 'activity',
    visible: false,
    position: { x: 0, y: 10, w: 6, h: 3 }
  },
  {
    id: 'message-center',
    title: 'Message Center',
    description: 'Recent messages and communications',
    icon: MessageSquare,
    category: 'activity',
    visible: false,
    position: { x: 6, y: 10, w: 6, h: 3 }
  },
  
  // Analytics & Reporting Widgets
  {
    id: 'performance-trends',
    title: 'Performance Trends',
    description: 'Staff and facility performance analytics',
    icon: TrendingUp,
    category: 'analytics',
    permissions: ['view_analytics'],
    visible: false,
    position: { x: 0, y: 14, w: 8, h: 4 }
  },
  {
    id: 'capacity-planning',
    title: 'Capacity Planning',
    description: 'Staffing capacity and demand forecasting',
    icon: Target,
    category: 'analytics',
    permissions: ['view_analytics'],
    visible: false,
    position: { x: 8, y: 14, w: 4, h: 4 }
  },
  {
    id: 'financial-summary',
    title: 'Financial Summary',
    description: 'Revenue, costs, and financial metrics',
    icon: PieChart,
    category: 'analytics',
    permissions: ['view_billing'],
    visible: false,
    position: { x: 0, y: 18, w: 6, h: 4 }
  },
  {
    id: 'schedule-overview',
    title: 'Schedule Overview',
    description: 'Weekly and monthly schedule summaries',
    icon: Calendar,
    category: 'analytics',
    permissions: ['view_schedules'],
    visible: false,
    position: { x: 6, y: 18, w: 6, h: 4 }
  },
  
  // Location & Operations Widgets
  {
    id: 'facility-map',
    title: 'Facility Map',
    description: 'Geographic view of all facilities',
    icon: MapPin,
    category: 'operations',
    visible: false,
    position: { x: 0, y: 22, w: 12, h: 6 }
  },
  {
    id: 'quick-actions',
    title: 'Quick Actions',
    description: 'Shortcuts to common tasks',
    icon: Settings,
    category: 'operations',
    visible: false,
    position: { x: 0, y: 28, w: 12, h: 2 }
  },
  
  // Additional Operational Widgets
  {
    id: 'staff-availability',
    title: 'Staff Availability',
    description: 'Real-time staff availability status',
    icon: Users,
    category: 'operations',
    permissions: ['view_staff'],
    visible: false,
    position: { x: 0, y: 30, w: 6, h: 3 }
  },
  {
    id: 'shift-coverage',
    title: 'Shift Coverage',
    description: 'Coverage percentage by department',
    icon: BarChart3,
    category: 'operations',
    permissions: ['view_schedules'],
    visible: false,
    position: { x: 6, y: 30, w: 6, h: 3 }
  }
];

interface DashboardCustomizationProps {
  onLayoutChange?: (layout: DashboardLayout) => void;
}

export function DashboardCustomization({ onLayoutChange }: DashboardCustomizationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [widgetStates, setWidgetStates] = useState<Record<string, boolean>>({});
  const queryClient = useQueryClient();

  // Initialize widget states from default configuration
  React.useEffect(() => {
    const initialStates: Record<string, boolean> = {};
    availableWidgets.forEach(widget => {
      initialStates[widget.id] = widget.visible;
    });
    setWidgetStates(initialStates);
  }, []);

  // Fetch current widget configuration
  const { data: currentLayout, isLoading } = useQuery<DashboardLayout>({
    queryKey: ['/api/dashboard/widgets'],
    retry: false,
    onSuccess: (data) => {
      if (data?.widgets) {
        const states: Record<string, boolean> = {};
        data.widgets.forEach((widget: any) => {
          states[widget.id] = widget.visible;
        });
        setWidgetStates(states);
      }
    }
  });

  // Save widget configuration
  const saveLayoutMutation = useMutation({
    mutationFn: (widgets: WidgetConfig[]) => 
      apiRequest('/api/dashboard/widgets', 'POST', { widgets }),
    onSuccess: (_, widgets) => {
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/widgets'] });
      setIsOpen(false);
      if (onLayoutChange) {
        onLayoutChange({ layout: 'grid', widgets: widgets as WidgetConfig[] });
      }
    }
  });

  const handleWidgetToggle = (widgetId: string, visible: boolean) => {
    const newStates = { ...widgetStates, [widgetId]: visible };
    setWidgetStates(newStates);
    
    // Apply changes immediately for preview
    const updatedWidgets = availableWidgets.map(widget => ({
      ...widget,
      visible: newStates[widget.id] ?? widget.visible
    }));
    
    const layout = { layout: 'grid', widgets: updatedWidgets };
    if (onLayoutChange) {
      onLayoutChange(layout);
    }
  };

  const handleSaveLayout = () => {
    const updatedWidgets = availableWidgets.map(widget => ({
      ...widget,
      visible: widgetStates[widget.id] ?? widget.visible
    }));
    const visibleWidgets = updatedWidgets.filter(widget => widget.visible);
    saveLayoutMutation.mutate(visibleWidgets);
  };

  const handleResetToDefault = () => {
    const defaultStates: Record<string, boolean> = {};
    const defaultVisibleIds = ['active-staff', 'open-shifts', 'compliance-rate', 'priority-tasks', 'recent-activity'];
    
    availableWidgets.forEach(widget => {
      defaultStates[widget.id] = defaultVisibleIds.includes(widget.id);
    });
    
    setWidgetStates(defaultStates);
    
    const defaultWidgets = availableWidgets.map(widget => ({
      ...widget,
      visible: defaultStates[widget.id]
    }));
    
    const layout = { layout: 'grid', widgets: defaultWidgets };
    if (onLayoutChange) {
      onLayoutChange(layout);
    }
  };

  const categorizedWidgets = availableWidgets.reduce((acc, widget) => {
    if (!acc[widget.category]) {
      acc[widget.category] = [];
    }
    acc[widget.category].push(widget);
    return acc;
  }, {} as Record<string, WidgetConfig[]>);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Customize Dashboard
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layout className="h-5 w-5" />
            Customize Your Dashboard
          </DialogTitle>
          <DialogDescription>
            Choose which widgets to display on your dashboard. Changes are applied immediately and saved when you click "Save Layout".
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Layout Options */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Layout className="h-4 w-4" />
              Dashboard Layout
            </h3>
            <div className="text-sm text-gray-600 mb-2">
              Choose widgets to display. They will be automatically arranged in a responsive grid.
            </div>
            <div className="flex gap-2 text-sm">
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
                {Object.values(widgetStates).filter(Boolean).length} widgets enabled
              </span>
              <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded">
                Auto-arranged grid layout
              </span>
            </div>
          </div>

          {/* Category Sections */}
          {Object.entries(categorizedWidgets).map(([category, widgets]) => (
            <div key={category}>
              <h3 className="text-lg font-semibold mb-3 capitalize flex items-center gap-2">
                {category === 'stats' && <BarChart3 className="h-4 w-4" />}
                {category === 'activity' && <Activity className="h-4 w-4" />}
                {category === 'analytics' && <TrendingUp className="h-4 w-4" />}
                {category === 'operations' && <Settings className="h-4 w-4" />}
                {category} Widgets ({widgets.length})
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {widgets.map((widget) => {
                  const IconComponent = widget.icon;
                  const isSelected = widgetStates[widget.id] ?? widget.visible;
                  return (
                    <Card key={widget.id} className={`transition-all cursor-pointer hover:shadow-md ${
                      isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                    }`}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <IconComponent className={`h-4 w-4 ${isSelected ? 'text-blue-600' : 'text-gray-500'}`} />
                            <CardTitle className="text-sm">{widget.title}</CardTitle>
                          </div>
                          <Checkbox
                            id={widget.id}
                            checked={isSelected}
                            onCheckedChange={(checked) => 
                              handleWidgetToggle(widget.id, checked as boolean)
                            }
                          />
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <p className="text-sm text-gray-600">{widget.description}</p>
                        {widget.permissions && (
                          <div className="mt-2">
                            <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                              Requires: {widget.permissions.join(', ')}
                            </span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
          
          {/* Quick Actions */}
          <div className="mb-4 p-4 bg-amber-50 rounded-lg">
            <h4 className="font-medium text-amber-800 mb-2">Quick Presets</h4>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const basicStates = Object.keys(widgetStates).reduce((acc, key) => {
                    acc[key] = ['active-staff', 'open-shifts', 'compliance-rate'].includes(key);
                    return acc;
                  }, {} as Record<string, boolean>);
                  setWidgetStates(basicStates);
                }}
              >
                Essential Only
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const managerStates = Object.keys(widgetStates).reduce((acc, key) => {
                    acc[key] = ['active-staff', 'open-shifts', 'compliance-rate', 'priority-tasks', 'recent-activity', 'urgent-shifts'].includes(key);
                    return acc;
                  }, {} as Record<string, boolean>);
                  setWidgetStates(managerStates);
                }}
              >
                Manager View
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const analyticsStates = Object.keys(widgetStates).reduce((acc, key) => {
                    const analyticsWidgets = ['active-staff', 'open-shifts', 'compliance-rate', 'performance-trends', 'capacity-planning', 'financial-summary'];
                    acc[key] = analyticsWidgets.includes(key);
                    return acc;
                  }, {} as Record<string, boolean>);
                  setWidgetStates(analyticsStates);
                }}
              >
                Analytics Focus
              </Button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleResetToDefault}
              className="flex items-center gap-2"
            >
              <Layout className="h-4 w-4" />
              Reset to Default
            </Button>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setIsOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveLayout}
                disabled={saveLayoutMutation.isPending}
                className="flex items-center gap-2"
              >
                {saveLayoutMutation.isPending ? (
                  <>Saving...</>
                ) : (
                  <>
                    <Settings className="h-4 w-4" />
                    Save Layout
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}