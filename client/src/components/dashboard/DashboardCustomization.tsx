import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Settings, Layout, BarChart3, Clock, Users, DollarSign, AlertTriangle, FileText, Building, Activity } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface WidgetConfig {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  category: 'stats' | 'activity' | 'tasks' | 'analytics';
  permissions?: string[];
  visible: boolean;
  position?: { x: number; y: number; w: number; h: number };
}

interface DashboardLayout {
  layout: string;
  widgets: WidgetConfig[];
}

const availableWidgets: WidgetConfig[] = [
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
    icon: BarChart3,
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
    visible: true,
    position: { x: 9, y: 0, w: 3, h: 2 }
  },
  {
    id: 'monthly-hours',
    title: 'Monthly Hours',
    description: 'Total hours worked this month',
    icon: Clock,
    category: 'stats',
    permissions: ['view_schedules'],
    visible: true,
    position: { x: 0, y: 2, w: 4, h: 2 }
  },
  {
    id: 'total-facilities',
    title: 'Total Facilities',
    description: 'Number of associated facilities',
    icon: Building,
    category: 'stats',
    visible: true,
    position: { x: 4, y: 2, w: 4, h: 2 }
  },
  {
    id: 'outstanding-invoices',
    title: 'Outstanding Invoices',
    description: 'Pending invoice count',
    icon: FileText,
    category: 'stats',
    permissions: ['view_billing'],
    visible: true,
    position: { x: 8, y: 2, w: 4, h: 2 }
  },
  {
    id: 'priority-tasks',
    title: 'Priority Tasks',
    description: 'Important tasks requiring attention',
    icon: AlertTriangle,
    category: 'tasks',
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
    icon: FileText,
    category: 'stats',
    permissions: ['view_staff_credentials'],
    visible: false,
    position: { x: 4, y: 8, w: 4, h: 2 }
  },
  {
    id: 'quick-stats',
    title: 'Quick Stats Overview',
    description: 'Condensed view of key metrics',
    icon: BarChart3,
    category: 'analytics',
    visible: false,
    position: { x: 8, y: 8, w: 4, h: 2 }
  }
];

interface DashboardCustomizationProps {
  onLayoutChange?: (layout: DashboardLayout) => void;
}

export function DashboardCustomization({ onLayoutChange }: DashboardCustomizationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();

  // Fetch current widget configuration
  const { data: currentLayout, isLoading } = useQuery<DashboardLayout>({
    queryKey: ['/api/dashboard/widgets'],
    retry: false
  });

  // Save widget configuration
  const saveLayoutMutation = useMutation({
    mutationFn: (widgets: WidgetConfig[]) => 
      apiRequest('/api/dashboard/widgets', 'POST', { widgets }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/widgets'] });
      setIsOpen(false);
      if (onLayoutChange) {
        onLayoutChange({ layout: 'grid', widgets: widgets as WidgetConfig[] });
      }
    }
  });

  const handleWidgetToggle = (widgetId: string, visible: boolean) => {
    const updatedWidgets = availableWidgets.map(widget => 
      widget.id === widgetId ? { ...widget, visible } : widget
    );
    
    // Apply changes immediately for preview
    const layout = { layout: 'grid', widgets: updatedWidgets };
    if (onLayoutChange) {
      onLayoutChange(layout);
    }
  };

  const handleSaveLayout = () => {
    const visibleWidgets = availableWidgets.filter(widget => widget.visible);
    saveLayoutMutation.mutate(visibleWidgets);
  };

  const handleResetToDefault = () => {
    const defaultWidgets = availableWidgets.map(widget => ({
      ...widget,
      visible: ['active-staff', 'open-shifts', 'compliance-rate', 'priority-tasks', 'recent-activity'].includes(widget.id)
    }));
    
    // Update local state
    availableWidgets.forEach((widget, index) => {
      availableWidgets[index] = defaultWidgets[index];
    });
    
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
          {/* Category Sections */}
          {Object.entries(categorizedWidgets).map(([category, widgets]) => (
            <div key={category}>
              <h3 className="text-lg font-semibold mb-3 capitalize flex items-center gap-2">
                {category === 'stats' && <BarChart3 className="h-4 w-4" />}
                {category === 'activity' && <Activity className="h-4 w-4" />}
                {category === 'tasks' && <AlertTriangle className="h-4 w-4" />}
                {category === 'analytics' && <BarChart3 className="h-4 w-4" />}
                {category} Widgets
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {widgets.map((widget) => {
                  const IconComponent = widget.icon;
                  return (
                    <Card key={widget.id} className={`transition-all ${widget.visible ? 'ring-2 ring-blue-500' : ''}`}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <IconComponent className="h-4 w-4 text-blue-600" />
                            <CardTitle className="text-sm">{widget.title}</CardTitle>
                          </div>
                          <Checkbox
                            id={widget.id}
                            checked={widget.visible}
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
                            <span className="text-xs text-gray-500">
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