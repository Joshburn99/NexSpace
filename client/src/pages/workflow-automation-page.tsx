import { useState } from "react";
import { Zap, Clock, CheckCircle, AlertTriangle, Settings, Play, Pause, RotateCcw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { AppLayout } from "@/components/ui/app-layout";
import { useToast } from "@/hooks/use-toast";

const workflowTemplates = [
  {
    id: 1,
    name: "Standard Invoice Auto-Approval",
    type: "invoice",
    description: "Automatically approve invoices under $5,000 from verified contractors",
    isActive: true,
    conditions: [
      { field: "amount", operator: "less_than", value: "5000" },
      { field: "contractor_verified", operator: "equals", value: "true" },
      { field: "hours_within_range", operator: "equals", value: "true" }
    ],
    actions: [
      { type: "set_status", value: "approved" },
      { type: "send_notification", recipients: ["contractor", "facility_manager"] },
      { type: "schedule_payment", delay_days: 1 }
    ],
    processedCount: 127,
    successRate: 98.4
  },
  {
    id: 2,
    name: "Urgent Work Log Review",
    type: "work_log",
    description: "Fast-track work logs with overtime hours for immediate review",
    isActive: true,
    conditions: [
      { field: "overtime_hours", operator: "greater_than", value: "0" },
      { field: "facility_priority", operator: "equals", value: "high" }
    ],
    actions: [
      { type: "set_priority", value: "urgent" },
      { type: "assign_reviewer", value: "senior_manager" },
      { type: "send_alert", recipients: ["facility_manager", "hr_director"] }
    ],
    processedCount: 43,
    successRate: 100
  },
  {
    id: 3,
    name: "Compliance Flag Detection",
    type: "both",
    description: "Flag submissions missing required credentials or documentation",
    isActive: true,
    conditions: [
      { field: "credentials_expired", operator: "equals", value: "true" },
      { field: "documentation_complete", operator: "equals", value: "false" }
    ],
    actions: [
      { type: "set_status", value: "compliance_review" },
      { type: "create_task", assignee: "compliance_team" },
      { type: "block_payment", reason: "compliance_issue" }
    ],
    processedCount: 18,
    successRate: 94.4
  }
];

const recentActivity = [
  {
    id: 1,
    workflow: "Standard Invoice Auto-Approval",
    item: "Invoice #INV-2024-0156",
    action: "Auto-approved",
    timestamp: "2025-06-17T20:15:00Z",
    status: "success"
  },
  {
    id: 2,
    workflow: "Urgent Work Log Review",
    item: "Work Log #WL-2024-0892",
    action: "Escalated to manager",
    timestamp: "2025-06-17T19:45:00Z",
    status: "success"
  },
  {
    id: 3,
    workflow: "Compliance Flag Detection",
    item: "Invoice #INV-2024-0157",
    action: "Flagged for compliance",
    timestamp: "2025-06-17T19:30:00Z",
    status: "warning"
  }
];

export default function WorkflowAutomationPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("workflows");
  const [selectedWorkflow, setSelectedWorkflow] = useState(workflowTemplates[0]);

  const [newWorkflow, setNewWorkflow] = useState({
    name: "",
    type: "invoice",
    description: "",
    isActive: true,
    conditions: [{ field: "", operator: "", value: "" }],
    actions: [{ type: "", value: "" }]
  });

  const conditionFields = {
    invoice: [
      "amount", "contractor_verified", "hours_within_range", "facility_id", 
      "submission_time", "documentation_complete", "credentials_expired"
    ],
    work_log: [
      "overtime_hours", "facility_priority", "shift_type", "user_role",
      "hours_logged", "break_violations", "geolocation_verified"
    ]
  };

  const operators = [
    { value: "equals", label: "Equals" },
    { value: "not_equals", label: "Does not equal" },
    { value: "greater_than", label: "Greater than" },
    { value: "less_than", label: "Less than" },
    { value: "contains", label: "Contains" },
    { value: "starts_with", label: "Starts with" }
  ];

  const actionTypes = [
    { value: "set_status", label: "Set Status" },
    { value: "assign_reviewer", label: "Assign Reviewer" },
    { value: "send_notification", label: "Send Notification" },
    { value: "send_alert", label: "Send Alert" },
    { value: "schedule_payment", label: "Schedule Payment" },
    { value: "create_task", label: "Create Task" },
    { value: "block_payment", label: "Block Payment" },
    { value: "set_priority", label: "Set Priority" }
  ];

  const addCondition = () => {
    setNewWorkflow(prev => ({
      ...prev,
      conditions: [...prev.conditions, { field: "", operator: "", value: "" }]
    }));
  };

  const addAction = () => {
    setNewWorkflow(prev => ({
      ...prev,
      actions: [...prev.actions, { type: "", value: "" }]
    }));
  };

  const toggleWorkflow = (workflowId: number) => {
    toast({
      title: "Workflow updated",
      description: "Workflow status has been changed successfully."
    });
  };

  const saveWorkflow = () => {
    toast({
      title: "Workflow created",
      description: "New automation workflow has been saved and activated."
    });
  };

  return (
    <AppLayout>
      <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Workflow Automation</h1>
              <p className="text-gray-600 dark:text-gray-300">Automate invoice and work log processing with intelligent rules</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline">
                <Settings className="w-4 h-4 mr-2" />
                Global Settings
              </Button>
              <Button>
                <Zap className="w-4 h-4 mr-2" />
                Create Workflow
              </Button>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Active Workflows</p>
                    <p className="text-2xl font-bold">{workflowTemplates.filter(w => w.isActive).length}</p>
                  </div>
                  <Play className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Items Processed Today</p>
                    <p className="text-2xl font-bold">47</p>
                    <p className="text-xs text-green-500">+12% from yesterday</p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Success Rate</p>
                    <p className="text-2xl font-bold text-green-600">97.8%</p>
                    <p className="text-xs text-gray-500">Last 30 days</p>
                  </div>
                  <AlertTriangle className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Time Saved</p>
                    <p className="text-2xl font-bold">23.4h</p>
                    <p className="text-xs text-gray-500">This week</p>
                  </div>
                  <Clock className="w-8 h-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="workflows">Active Workflows</TabsTrigger>
              <TabsTrigger value="create">Create Workflow</TabsTrigger>
              <TabsTrigger value="activity">Recent Activity</TabsTrigger>
              <TabsTrigger value="settings">Global Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="workflows" className="space-y-6">
              <div className="grid grid-cols-1 gap-6">
                {workflowTemplates.map((workflow) => (
                  <Card key={workflow.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            {workflow.name}
                            <Badge className={workflow.type === 'invoice' ? 'bg-blue-100 text-blue-800' : 
                                           workflow.type === 'work_log' ? 'bg-green-100 text-green-800' : 
                                           'bg-purple-100 text-purple-800'}>
                              {workflow.type === 'invoice' ? 'Invoice' : 
                               workflow.type === 'work_log' ? 'Work Log' : 'Both'}
                            </Badge>
                          </CardTitle>
                          <CardDescription>{workflow.description}</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={workflow.isActive}
                            onCheckedChange={() => toggleWorkflow(workflow.id)}
                          />
                          <Badge className={workflow.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                            {workflow.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <div>
                          <h4 className="font-medium mb-2">Conditions</h4>
                          <div className="space-y-1 text-sm">
                            {workflow.conditions.map((condition, index) => (
                              <div key={index} className="p-2 bg-gray-50 dark:bg-gray-800 rounded">
                                {condition.field} {condition.operator.replace('_', ' ')} {condition.value}
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <h4 className="font-medium mb-2">Actions</h4>
                          <div className="space-y-1 text-sm">
                            {workflow.actions.map((action, index) => (
                              <div key={index} className="p-2 bg-gray-50 dark:bg-gray-800 rounded">
                                {action.type.replace('_', ' ')}: {action.value}
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <h4 className="font-medium mb-2">Performance</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span>Processed:</span>
                              <span className="font-medium">{workflow.processedCount}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Success Rate:</span>
                              <span className="font-medium text-green-600">{workflow.successRate}%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <Button variant="outline" size="sm">Edit</Button>
                        <Button variant="outline" size="sm">Duplicate</Button>
                        <Button variant="outline" size="sm">View Logs</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="create" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Create New Workflow</CardTitle>
                  <CardDescription>Build custom automation rules for invoice and work log processing</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="workflowName">Workflow Name</Label>
                      <Input
                        id="workflowName"
                        value={newWorkflow.name}
                        onChange={(e) => setNewWorkflow(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="e.g. High-Value Invoice Review"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="workflowType">Workflow Type</Label>
                      <Select value={newWorkflow.type} onValueChange={(value) => setNewWorkflow(prev => ({ ...prev, type: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="invoice">Invoice Processing</SelectItem>
                          <SelectItem value="work_log">Work Log Processing</SelectItem>
                          <SelectItem value="both">Both Types</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="workflowDescription">Description</Label>
                    <Textarea
                      id="workflowDescription"
                      value={newWorkflow.description}
                      onChange={(e) => setNewWorkflow(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe what this workflow does and when it should trigger..."
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Conditions (ALL must be met)</Label>
                      <Button type="button" variant="outline" size="sm" onClick={addCondition}>
                        Add Condition
                      </Button>
                    </div>
                    {newWorkflow.conditions.map((condition, index) => (
                      <div key={index} className="grid grid-cols-3 gap-4 p-4 border rounded-lg">
                        <Select value={condition.field} onValueChange={(value) => {
                          const updated = [...newWorkflow.conditions];
                          updated[index].field = value;
                          setNewWorkflow(prev => ({ ...prev, conditions: updated }));
                        }}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select field" />
                          </SelectTrigger>
                          <SelectContent>
                            {conditionFields[newWorkflow.type as keyof typeof conditionFields]?.map(field => (
                              <SelectItem key={field} value={field}>{field.replace('_', ' ')}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select value={condition.operator} onValueChange={(value) => {
                          const updated = [...newWorkflow.conditions];
                          updated[index].operator = value;
                          setNewWorkflow(prev => ({ ...prev, conditions: updated }));
                        }}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select operator" />
                          </SelectTrigger>
                          <SelectContent>
                            {operators.map(op => (
                              <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          value={condition.value}
                          onChange={(e) => {
                            const updated = [...newWorkflow.conditions];
                            updated[index].value = e.target.value;
                            setNewWorkflow(prev => ({ ...prev, conditions: updated }));
                          }}
                          placeholder="Value"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Actions (ALL will be executed)</Label>
                      <Button type="button" variant="outline" size="sm" onClick={addAction}>
                        Add Action
                      </Button>
                    </div>
                    {newWorkflow.actions.map((action, index) => (
                      <div key={index} className="grid grid-cols-2 gap-4 p-4 border rounded-lg">
                        <Select value={action.type} onValueChange={(value) => {
                          const updated = [...newWorkflow.actions];
                          updated[index].type = value;
                          setNewWorkflow(prev => ({ ...prev, actions: updated }));
                        }}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select action" />
                          </SelectTrigger>
                          <SelectContent>
                            {actionTypes.map(actionType => (
                              <SelectItem key={actionType.value} value={actionType.value}>{actionType.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          value={action.value}
                          onChange={(e) => {
                            const updated = [...newWorkflow.actions];
                            updated[index].value = e.target.value;
                            setNewWorkflow(prev => ({ ...prev, actions: updated }));
                          }}
                          placeholder="Value"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={newWorkflow.isActive}
                      onCheckedChange={(checked) => setNewWorkflow(prev => ({ ...prev, isActive: checked }))}
                    />
                    <Label>Activate workflow immediately</Label>
                  </div>

                  <Button onClick={saveWorkflow} className="w-full">
                    <Zap className="w-4 h-4 mr-2" />
                    Create Workflow
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activity" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Automation Activity</CardTitle>
                  <CardDescription>Track workflow executions and outcomes</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentActivity.map((activity) => (
                      <div key={activity.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className={`w-3 h-3 rounded-full ${
                            activity.status === 'success' ? 'bg-green-500' : 
                            activity.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                          }`} />
                          <div>
                            <p className="font-medium">{activity.workflow}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-300">{activity.item}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{activity.action}</p>
                          <p className="text-sm text-gray-500">
                            {new Date(activity.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Global Automation Settings</CardTitle>
                  <CardDescription>Configure system-wide automation preferences</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h3 className="font-medium">Processing Limits</h3>
                      <div className="space-y-2">
                        <Label>Max auto-approval amount</Label>
                        <Input type="number" defaultValue="5000" />
                      </div>
                      <div className="space-y-2">
                        <Label>Processing delay (minutes)</Label>
                        <Input type="number" defaultValue="5" />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h3 className="font-medium">Notification Settings</h3>
                      <div className="flex items-center justify-between">
                        <Label>Email notifications</Label>
                        <Switch defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>SMS alerts for failures</Label>
                        <Switch defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>Daily summary reports</Label>
                        <Switch defaultChecked />
                      </div>
                    </div>
                  </div>
                  <Button>Save Global Settings</Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
    </AppLayout>
  );
}