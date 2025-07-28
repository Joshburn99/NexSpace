import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Settings, Play, Pause, Plus, Edit, Trash2, Clock, Users, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useFacilityPermissions } from '@/hooks/use-facility-permissions';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface WorkflowAutomation {
  id: number;
  name: string;
  description: string;
  type: 'shift_assignment' | 'notification' | 'compliance' | 'billing' | 'reporting';
  trigger: string;
  conditions: string;
  actions: string;
  isActive: boolean;
  lastRun?: string;
  nextRun?: string;
  runCount: number;
  createdAt: string;
  updatedAt: string;
}

export default function WorkflowAutomationPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingAutomation, setEditingAutomation] = useState<WorkflowAutomation | null>(null);
  const { hasPermission } = useFacilityPermissions();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'shift_assignment',
    trigger: '',
    conditions: '',
    actions: '',
    isActive: true
  });

  const { data: automations, isLoading } = useQuery<WorkflowAutomation[]>({
    queryKey: ['/api/workflow-automations'],
    initialData: [
      {
        id: 1,
        name: 'Auto-assign ICU Shifts',
        description: 'Automatically assign ICU shifts to available RNs based on experience level',
        type: 'shift_assignment',
        trigger: 'shift_created',
        conditions: 'department == "ICU" && specialty == "RN"',
        actions: 'assign_to_available_staff(experience_level >= 2)',
        isActive: true,
        lastRun: '2025-07-14T18:00:00Z',
        nextRun: '2025-07-15T06:00:00Z',
        runCount: 145,
        createdAt: '2025-06-01T10:00:00Z',
        updatedAt: '2025-07-14T18:00:00Z'
      },
      {
        id: 2,
        name: 'Credential Expiry Notifications',
        description: 'Send notifications when staff credentials are expiring within 30 days',
        type: 'notification',
        trigger: 'daily_check',
        conditions: 'credential_expiry_date <= (today + 30 days)',
        actions: 'send_notification(staff_member, hr_manager)',
        isActive: true,
        lastRun: '2025-07-14T06:00:00Z',
        nextRun: '2025-07-15T06:00:00Z',
        runCount: 42,
        createdAt: '2025-06-15T10:00:00Z',
        updatedAt: '2025-07-14T06:00:00Z'
      },
      {
        id: 3,
        name: 'Overtime Alert System',
        description: 'Alert managers when staff approach overtime thresholds',
        type: 'compliance',
        trigger: 'hours_logged',
        conditions: 'weekly_hours > 35',
        actions: 'send_alert(manager) && log_compliance_event',
        isActive: false,
        lastRun: '2025-07-13T14:30:00Z',
        nextRun: null,
        runCount: 28,
        createdAt: '2025-06-20T10:00:00Z',
        updatedAt: '2025-07-13T14:30:00Z'
      }
    ]
  });

  const createAutomation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/workflow-automations', data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create workflow automation');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workflow-automations'] });
      setIsCreateModalOpen(false);
      resetForm();
      toast({
        title: "Success",
        description: "Workflow automation created successfully",
      });
    },
    onError: (error: any) => {
      console.error('Create automation error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create workflow automation. Please check your connection and try again.",
        variant: "destructive",
      });
    },
  });

  const updateAutomation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('PATCH', `/api/workflow-automations/${data.id}`, data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update workflow automation');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workflow-automations'] });
      setEditingAutomation(null);
      resetForm();
      toast({
        title: "Success",
        description: "Workflow automation updated successfully",
      });
    },
    onError: (error: any) => {
      console.error('Update automation error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update workflow automation. Please check your connection and try again.",
        variant: "destructive",
      });
    },
  });

  const toggleAutomation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const response = await apiRequest('PATCH', `/api/workflow-automations/${id}`, { isActive });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update automation status');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workflow-automations'] });
      toast({
        title: "Success",
        description: "Automation status updated",
      });
    },
    onError: (error: any) => {
      console.error('Toggle automation error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update automation status. Please check your connection and try again.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      type: 'shift_assignment',
      trigger: '',
      conditions: '',
      actions: '',
      isActive: true
    });
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.trigger || !formData.actions) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (editingAutomation) {
      updateAutomation.mutate({ ...formData, id: editingAutomation.id });
    } else {
      createAutomation.mutate(formData);
    }
  };

  const openEditModal = (automation: WorkflowAutomation) => {
    setEditingAutomation(automation);
    setFormData({
      name: automation.name,
      description: automation.description,
      type: automation.type,
      trigger: automation.trigger,
      conditions: automation.conditions,
      actions: automation.actions,
      isActive: automation.isActive
    });
    setIsCreateModalOpen(true);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'shift_assignment': return 'bg-blue-100 text-blue-800';
      case 'notification': return 'bg-yellow-100 text-yellow-800';
      case 'compliance': return 'bg-green-100 text-green-800';
      case 'billing': return 'bg-purple-100 text-purple-800';
      case 'reporting': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'shift_assignment': return Users;
      case 'notification': return AlertCircle;
      case 'compliance': return CheckCircle;
      case 'billing': return Clock;
      case 'reporting': return Settings;
      default: return Settings;
    }
  };

  if (!hasPermission('view_workflow_automation')) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-gray-600">You don't have permission to view workflow automation.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activeAutomations = automations?.filter(a => a.isActive).length || 0;
  const totalRuns = automations?.reduce((sum, a) => sum + a.runCount, 0) || 0;
  const recentRuns = automations?.filter(a => a.lastRun && new Date(a.lastRun) > new Date(Date.now() - 24 * 60 * 60 * 1000)).length || 0;

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Settings className="h-8 w-8" />
            Workflow Automation
          </h1>
          <p className="text-gray-600 mt-2">Automate routine tasks and workflows</p>
        </div>
        {hasPermission('manage_workflow_automation') && (
          <Dialog open={isCreateModalOpen} onOpenChange={(open) => {
            setIsCreateModalOpen(open);
            if (!open) {
              setEditingAutomation(null);
              resetForm();
            }
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Automation
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingAutomation ? 'Edit Automation' : 'Create New Automation'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter automation name"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe what this automation does"
                  />
                </div>

                <div>
                  <Label htmlFor="type">Type *</Label>
                  <Select value={formData.type} onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select automation type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="shift_assignment">Shift Assignment</SelectItem>
                      <SelectItem value="notification">Notification</SelectItem>
                      <SelectItem value="compliance">Compliance</SelectItem>
                      <SelectItem value="billing">Billing</SelectItem>
                      <SelectItem value="reporting">Reporting</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="trigger">Trigger *</Label>
                  <Input
                    id="trigger"
                    value={formData.trigger}
                    onChange={(e) => setFormData(prev => ({ ...prev, trigger: e.target.value }))}
                    placeholder="e.g., shift_created, daily_check, hours_logged"
                  />
                </div>

                <div>
                  <Label htmlFor="conditions">Conditions</Label>
                  <Textarea
                    id="conditions"
                    value={formData.conditions}
                    onChange={(e) => setFormData(prev => ({ ...prev, conditions: e.target.value }))}
                    placeholder="e.g., department == 'ICU' && specialty == 'RN'"
                  />
                </div>

                <div>
                  <Label htmlFor="actions">Actions *</Label>
                  <Textarea
                    id="actions"
                    value={formData.actions}
                    onChange={(e) => setFormData(prev => ({ ...prev, actions: e.target.value }))}
                    placeholder="e.g., assign_to_available_staff(experience_level >= 2)"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                  />
                  <Label htmlFor="isActive">Enable automation</Label>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSubmit} disabled={createAutomation.isPending || updateAutomation.isPending}>
                    {(createAutomation.isPending || updateAutomation.isPending) ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {editingAutomation ? 'Updating...' : 'Creating...'}
                      </>
                    ) : (
                      `${editingAutomation ? 'Update' : 'Create'} Automation`
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="automations">All Automations</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Automations</CardTitle>
                <Settings className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{automations?.length || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active</CardTitle>
                <Play className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activeAutomations}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Runs</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalRuns}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Recent Runs (24h)</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{recentRuns}</div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="automations" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {automations?.map((automation) => {
              const TypeIcon = getTypeIcon(automation.type);
              return (
                <Card key={automation.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <TypeIcon className="h-5 w-5" />
                        <div>
                          <CardTitle className="text-lg">{automation.name}</CardTitle>
                          <p className="text-sm text-gray-600">{automation.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getTypeColor(automation.type)}>
                          {automation.type.replace('_', ' ')}
                        </Badge>
                        <Switch
                          checked={automation.isActive}
                          onCheckedChange={(checked) => toggleAutomation.mutate({ id: automation.id, isActive: checked })}
                          disabled={!hasPermission('manage_workflow_automation')}
                        />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="text-sm">
                        <span className="font-medium">Trigger:</span> {automation.trigger}
                      </div>
                      {automation.conditions && (
                        <div className="text-sm">
                          <span className="font-medium">Conditions:</span> {automation.conditions}
                        </div>
                      )}
                      <div className="text-sm">
                        <span className="font-medium">Actions:</span> {automation.actions}
                      </div>
                      <div className="flex items-center justify-between text-sm text-gray-600 mt-4">
                        <div>Runs: {automation.runCount}</div>
                        <div>
                          {automation.lastRun && (
                            <span>Last: {new Date(automation.lastRun).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                      {hasPermission('manage_workflow_automation') && (
                        <div className="flex gap-2 mt-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditModal(automation)}
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {automations?.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No automations found</h3>
                <p className="text-gray-600 mb-4">Create your first workflow automation to get started</p>
                {hasPermission('manage_workflow_automation') && (
                  <Button onClick={() => setIsCreateModalOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Automation
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}