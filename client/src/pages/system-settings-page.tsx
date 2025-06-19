import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Settings, Save, ArrowLeft, Home, Bell, Shield, Database, Mail, Globe } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface SystemSettings {
  id: number;
  organizationName: string;
  organizationLogo: string;
  timezone: string;
  dateFormat: string;
  currency: string;
  emailNotifications: boolean;
  smsNotifications: boolean;
  autoApproveShifts: boolean;
  requireManagerApproval: boolean;
  allowSelfCancellation: boolean;
  cancellationDeadlineHours: number;
  defaultShiftDuration: number;
  overtimeThreshold: number;
  backupEmailFrequency: string;
  sessionTimeout: number;
  passwordMinLength: number;
  requireTwoFactor: boolean;
  allowRemoteWork: boolean;
  maintenanceMode: boolean;
}

export default function SystemSettingsPage() {
  const { toast } = useToast();
  const [hasChanges, setHasChanges] = useState(false);

  const { data: settings, isLoading } = useQuery<SystemSettings>({
    queryKey: ["/api/system-settings"],
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (settingsData: Partial<SystemSettings>) => {
      const response = await apiRequest("PATCH", "/api/system-settings", settingsData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/system-settings"] });
      setHasChanges(false);
      toast({
        title: "Settings Updated",
        description: "System settings have been saved successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update settings",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const settingsData = Object.fromEntries(formData.entries());
    
    // Convert string values to appropriate types
    const processedData = {
      ...settingsData,
      emailNotifications: formData.get('emailNotifications') === 'on',
      smsNotifications: formData.get('smsNotifications') === 'on',
      autoApproveShifts: formData.get('autoApproveShifts') === 'on',
      requireManagerApproval: formData.get('requireManagerApproval') === 'on',
      allowSelfCancellation: formData.get('allowSelfCancellation') === 'on',
      requireTwoFactor: formData.get('requireTwoFactor') === 'on',
      allowRemoteWork: formData.get('allowRemoteWork') === 'on',
      maintenanceMode: formData.get('maintenanceMode') === 'on',
      cancellationDeadlineHours: parseInt(formData.get('cancellationDeadlineHours') as string) || 24,
      defaultShiftDuration: parseInt(formData.get('defaultShiftDuration') as string) || 8,
      overtimeThreshold: parseInt(formData.get('overtimeThreshold') as string) || 40,
      sessionTimeout: parseInt(formData.get('sessionTimeout') as string) || 30,
      passwordMinLength: parseInt(formData.get('passwordMinLength') as string) || 8,
    };

    updateSettingsMutation.mutate(processedData);
  };

  const defaultSettings: SystemSettings = {
    id: 1,
    organizationName: "NexSpace Healthcare",
    organizationLogo: "/logo.png",
    timezone: "America/Chicago",
    dateFormat: "MM/DD/YYYY",
    currency: "USD",
    emailNotifications: true,
    smsNotifications: false,
    autoApproveShifts: false,
    requireManagerApproval: true,
    allowSelfCancellation: true,
    cancellationDeadlineHours: 24,
    defaultShiftDuration: 8,
    overtimeThreshold: 40,
    backupEmailFrequency: "weekly",
    sessionTimeout: 30,
    passwordMinLength: 8,
    requireTwoFactor: false,
    allowRemoteWork: true,
    maintenanceMode: false,
  };

  const currentSettings: SystemSettings = settings || defaultSettings;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-4 mb-4">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <Home className="h-4 w-4" />
              Dashboard
            </Button>
          </Link>
        </div>
        <h1 className="text-3xl font-bold">System Settings</h1>
        <p className="text-muted-foreground">
          Configure system-wide settings and preferences
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="shifts">Shifts & Scheduling</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Organization Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="organizationName">Organization Name</Label>
                    <Input 
                      id="organizationName" 
                      name="organizationName" 
                      defaultValue={currentSettings.organizationName}
                      onChange={() => setHasChanges(true)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select name="timezone" defaultValue={currentSettings.timezone}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="America/New_York">Eastern Time</SelectItem>
                        <SelectItem value="America/Chicago">Central Time</SelectItem>
                        <SelectItem value="America/Denver">Mountain Time</SelectItem>
                        <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="dateFormat">Date Format</Label>
                    <Select name="dateFormat" defaultValue={currentSettings.dateFormat}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                        <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                        <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="currency">Currency</Label>
                    <Select name="currency" defaultValue={currentSettings.currency}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD ($)</SelectItem>
                        <SelectItem value="EUR">EUR (€)</SelectItem>
                        <SelectItem value="GBP">GBP (£)</SelectItem>
                        <SelectItem value="CAD">CAD (C$)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notification Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="emailNotifications">Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">Send notifications via email</p>
                  </div>
                  <Switch 
                    id="emailNotifications" 
                    name="emailNotifications" 
                    defaultChecked={currentSettings.emailNotifications}
                    onCheckedChange={() => setHasChanges(true)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="smsNotifications">SMS Notifications</Label>
                    <p className="text-sm text-muted-foreground">Send notifications via SMS</p>
                  </div>
                  <Switch 
                    id="smsNotifications" 
                    name="smsNotifications" 
                    defaultChecked={currentSettings.smsNotifications}
                    onCheckedChange={() => setHasChanges(true)}
                  />
                </div>
                <div>
                  <Label htmlFor="backupEmailFrequency">Backup Email Frequency</Label>
                  <Select name="backupEmailFrequency" defaultValue={currentSettings.backupEmailFrequency}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="never">Never</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="shifts" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Shift Management
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="autoApproveShifts">Auto-approve Shifts</Label>
                    <p className="text-sm text-muted-foreground">Automatically approve shift applications</p>
                  </div>
                  <Switch 
                    id="autoApproveShifts" 
                    name="autoApproveShifts" 
                    defaultChecked={currentSettings.autoApproveShifts}
                    onCheckedChange={() => setHasChanges(true)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="requireManagerApproval">Require Manager Approval</Label>
                    <p className="text-sm text-muted-foreground">Require manager approval for shifts</p>
                  </div>
                  <Switch 
                    id="requireManagerApproval" 
                    name="requireManagerApproval" 
                    defaultChecked={currentSettings.requireManagerApproval}
                    onCheckedChange={() => setHasChanges(true)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="allowSelfCancellation">Allow Self-cancellation</Label>
                    <p className="text-sm text-muted-foreground">Workers can cancel their own shifts</p>
                  </div>
                  <Switch 
                    id="allowSelfCancellation" 
                    name="allowSelfCancellation" 
                    defaultChecked={currentSettings.allowSelfCancellation}
                    onCheckedChange={() => setHasChanges(true)}
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="cancellationDeadlineHours">Cancellation Deadline (hours)</Label>
                    <Input 
                      id="cancellationDeadlineHours" 
                      name="cancellationDeadlineHours" 
                      type="number" 
                      defaultValue={currentSettings.cancellationDeadlineHours}
                      onChange={() => setHasChanges(true)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="defaultShiftDuration">Default Shift Duration (hours)</Label>
                    <Input 
                      id="defaultShiftDuration" 
                      name="defaultShiftDuration" 
                      type="number" 
                      defaultValue={currentSettings.defaultShiftDuration}
                      onChange={() => setHasChanges(true)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="overtimeThreshold">Overtime Threshold (hours/week)</Label>
                    <Input 
                      id="overtimeThreshold" 
                      name="overtimeThreshold" 
                      type="number" 
                      defaultValue={currentSettings.overtimeThreshold}
                      onChange={() => setHasChanges(true)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Security Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="requireTwoFactor">Require Two-Factor Authentication</Label>
                    <p className="text-sm text-muted-foreground">Require 2FA for all users</p>
                  </div>
                  <Switch 
                    id="requireTwoFactor" 
                    name="requireTwoFactor" 
                    defaultChecked={currentSettings.requireTwoFactor}
                    onCheckedChange={() => setHasChanges(true)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="allowRemoteWork">Allow Remote Work</Label>
                    <p className="text-sm text-muted-foreground">Enable remote shift applications</p>
                  </div>
                  <Switch 
                    id="allowRemoteWork" 
                    name="allowRemoteWork" 
                    defaultChecked={currentSettings.allowRemoteWork}
                    onCheckedChange={() => setHasChanges(true)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="maintenanceMode">Maintenance Mode</Label>
                    <p className="text-sm text-muted-foreground">Temporarily disable system access</p>
                  </div>
                  <Switch 
                    id="maintenanceMode" 
                    name="maintenanceMode" 
                    defaultChecked={currentSettings.maintenanceMode}
                    onCheckedChange={() => setHasChanges(true)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
                    <Input 
                      id="sessionTimeout" 
                      name="sessionTimeout" 
                      type="number" 
                      defaultValue={currentSettings.sessionTimeout}
                      onChange={() => setHasChanges(true)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="passwordMinLength">Minimum Password Length</Label>
                    <Input 
                      id="passwordMinLength" 
                      name="passwordMinLength" 
                      type="number" 
                      defaultValue={currentSettings.passwordMinLength}
                      onChange={() => setHasChanges(true)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <div className="flex justify-end gap-2">
            <Button 
              type="submit" 
              disabled={!hasChanges || updateSettingsMutation.isPending}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              {updateSettingsMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </Tabs>
      </form>
    </div>
  );
}