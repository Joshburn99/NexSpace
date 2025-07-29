import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertCircle,
  Settings,
  Clock,
  Users,
  Shield,
  DollarSign,
  Save,
  Loader2,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useFacilityPermissions } from "@/hooks/use-facility-permissions";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ShiftManagementSettings as ShiftManagementSettingsComponent } from "@/components/ShiftManagementSettings";

interface WorkflowAutomationConfig {
  autoApproveShifts: boolean;
  autoSendReminders: boolean;
  reminderTimingHours: number;
  overtimeAlerts: boolean;
  overtimeThresholdHours: number;
  requireApprovalForOvertime: boolean;
  autoAssignBySpecialty: boolean;
  priorityFillRules: string[];
}

interface ShiftManagementSettings {
  minShiftLength: number;
  maxShiftLength: number;
  breakRequiredAfterHours: number;
  breakDurationMinutes: number;
  maxConsecutiveDays: number;
  minRestBetweenShifts: number;
  allowDoubleBooking: boolean;
  requireFloatPoolApproval: boolean;
}

interface StaffingTargets {
  [key: string]: {
    day: number;
    evening: number;
    night: number;
  };
}

interface CustomRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  conditions: any;
  actions: any;
}

interface FacilitySettings {
  id: number;
  workflowAutomationConfig: WorkflowAutomationConfig;
  shiftManagementSettings: ShiftManagementSettings;
  staffingTargets: StaffingTargets;
  customRules: CustomRule[];
}

export default function FacilitySettingsPage() {
  const [activeTab, setActiveTab] = useState("workflow");
  const [hasChanges, setHasChanges] = useState(false);
  const { permissions, hasPermission, facilityId } = useFacilityPermissions();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery<FacilitySettings>({
    queryKey: ["/api/facilities", facilityId, "settings"],
    enabled: !!facilityId && hasPermission("manage_facility_settings"),
  });

  const updateSettings = useMutation({
    mutationFn: async (data: Partial<FacilitySettings>) => {
      const response = await apiRequest("PATCH", `/api/facilities/${facilityId}/settings`, data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update settings");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/facilities", facilityId, "settings"] });
      setHasChanges(false);
      toast({
        title: "Success",
        description: "Settings updated successfully",
      });
    },
    onError: (error: any) => {
      console.error("Settings update error:", error);
      toast({
        title: "Error",
        description:
          error.message || "Failed to update settings. Please check your connection and try again.",
        variant: "destructive",
      });
    },
  });

  if (!hasPermission("manage_facility_settings")) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-gray-600">You don't have permission to manage facility settings.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading || !settings) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-gray-600">Loading settings...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleSave = () => {
    updateSettings.mutate(settings);
  };

  const updateWorkflowConfig = (field: keyof WorkflowAutomationConfig, value: any) => {
    setHasChanges(true);
    // Update logic here
  };

  const updateShiftSettings = (field: keyof ShiftManagementSettings, value: any) => {
    setHasChanges(true);
    // Update logic here
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Settings className="h-8 w-8" />
            Facility Settings
          </h1>
          <p className="text-gray-600 mt-2">
            Configure advanced facility operations and automation
          </p>
        </div>
        {hasChanges && (
          <Button onClick={handleSave} disabled={updateSettings.isPending}>
            {updateSettings.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="workflow">Workflow Automation</TabsTrigger>
          <TabsTrigger value="shifts">Shift Management</TabsTrigger>
          <TabsTrigger value="staffing">Staffing Targets</TabsTrigger>
          <TabsTrigger value="rules">Custom Rules</TabsTrigger>
        </TabsList>

        <TabsContent value="workflow">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Workflow Automation
              </CardTitle>
              <CardDescription>Configure automatic processes and notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto-Approve Shifts</Label>
                    <p className="text-sm text-gray-600">
                      Automatically approve shift requests that meet criteria
                    </p>
                  </div>
                  <Switch
                    checked={settings.workflowAutomationConfig?.autoApproveShifts || false}
                    onCheckedChange={(checked) =>
                      updateWorkflowConfig("autoApproveShifts", checked)
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto-Send Reminders</Label>
                    <p className="text-sm text-gray-600">
                      Send automatic shift reminders to assigned staff
                    </p>
                  </div>
                  <Switch
                    checked={settings.workflowAutomationConfig?.autoSendReminders || false}
                    onCheckedChange={(checked) =>
                      updateWorkflowConfig("autoSendReminders", checked)
                    }
                  />
                </div>

                {settings.workflowAutomationConfig?.autoSendReminders && (
                  <div className="ml-6 space-y-2">
                    <Label>Reminder Timing (hours before shift)</Label>
                    <Input
                      type="number"
                      value={settings.workflowAutomationConfig.reminderTimingHours || 24}
                      onChange={(e) =>
                        updateWorkflowConfig("reminderTimingHours", parseInt(e.target.value))
                      }
                      className="w-32"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Overtime Alerts</Label>
                    <p className="text-sm text-gray-600">
                      Alert managers when staff approach overtime
                    </p>
                  </div>
                  <Switch
                    checked={settings.workflowAutomationConfig?.overtimeAlerts || false}
                    onCheckedChange={(checked) => updateWorkflowConfig("overtimeAlerts", checked)}
                  />
                </div>

                {settings.workflowAutomationConfig?.overtimeAlerts && (
                  <div className="ml-6 space-y-4">
                    <div className="space-y-2">
                      <Label>Overtime Threshold (hours per week)</Label>
                      <Input
                        type="number"
                        value={settings.workflowAutomationConfig.overtimeThresholdHours || 40}
                        onChange={(e) =>
                          updateWorkflowConfig("overtimeThresholdHours", parseInt(e.target.value))
                        }
                        className="w-32"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={
                          settings.workflowAutomationConfig.requireApprovalForOvertime || false
                        }
                        onCheckedChange={(checked) =>
                          updateWorkflowConfig("requireApprovalForOvertime", checked)
                        }
                      />
                      <Label>Require approval for overtime shifts</Label>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto-Assign by Specialty</Label>
                    <p className="text-sm text-gray-600">
                      Automatically match staff to shifts based on specialty
                    </p>
                  </div>
                  <Switch
                    checked={settings.workflowAutomationConfig?.autoAssignBySpecialty || false}
                    onCheckedChange={(checked) =>
                      updateWorkflowConfig("autoAssignBySpecialty", checked)
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="shifts">
          <ShiftManagementSettingsComponent 
            facilityId={facilityId || 0} 
            canEdit={hasPermission("manage_teams")}
          />
        </TabsContent>

        <TabsContent value="staffing">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Staffing Targets
              </CardTitle>
              <CardDescription>Set target staffing levels by department and shift</CardDescription>
            </CardHeader>
            <CardContent>
              <Alert className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Define minimum staffing requirements for each department across different shifts.
                  These targets will be used for scheduling recommendations and compliance
                  monitoring.
                </AlertDescription>
              </Alert>

              <div className="space-y-6">
                {["ICU", "Emergency", "Medical/Surgical", "Pediatrics"].map((dept) => (
                  <div key={dept} className="space-y-3">
                    <h4 className="font-medium text-lg">{dept}</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Day Shift</Label>
                        <Input
                          type="number"
                          placeholder="0"
                          value={settings.staffingTargets?.[dept]?.day || ""}
                          onChange={(e) => {
                            // Update staffing targets
                            setHasChanges(true);
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Evening Shift</Label>
                        <Input
                          type="number"
                          placeholder="0"
                          value={settings.staffingTargets?.[dept]?.evening || ""}
                          onChange={(e) => {
                            // Update staffing targets
                            setHasChanges(true);
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Night Shift</Label>
                        <Input
                          type="number"
                          placeholder="0"
                          value={settings.staffingTargets?.[dept]?.night || ""}
                          onChange={(e) => {
                            // Update staffing targets
                            setHasChanges(true);
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Custom Rules
              </CardTitle>
              <CardDescription>
                Create facility-specific scheduling and compliance rules
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Custom rules allow you to define facility-specific logic for scheduling,
                  compliance, and alerts. Contact support to help configure advanced custom rules.
                </AlertDescription>
              </Alert>

              {settings.customRules && settings.customRules.length > 0 ? (
                <div className="space-y-4">
                  {settings.customRules.map((rule) => (
                    <div
                      key={rule.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div>
                        <h4 className="font-medium">{rule.name}</h4>
                        <p className="text-sm text-gray-600">{rule.description}</p>
                      </div>
                      <Switch
                        checked={rule.enabled}
                        onCheckedChange={(checked) => {
                          // Update rule enabled status
                          setHasChanges(true);
                        }}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No custom rules configured</p>
                  <Button variant="outline" className="mt-4">
                    Contact Support to Add Rules
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
