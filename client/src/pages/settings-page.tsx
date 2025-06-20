import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Settings, Bell, Moon, Globe, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { UserRole } from "@shared/schema";
import { hasPermission } from "@/lib/permissions";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [selectedRole, setSelectedRole] = useState(user?.role || "");
  const [notifications, setNotifications] = useState({
    emailAlerts: true,
    smsAlerts: false,
    pushNotifications: true,
    scheduleChanges: true,
    shiftReminders: true,
    systemUpdates: false,
  });
  const [preferences, setPreferences] = useState({
    darkMode: false,
    language: "en",
    timezone: "America/New_York",
    defaultCalendarView: "next7days",
    autoRefresh: true,
    soundAlerts: true,
  });

  // Role update mutation
  const updateRoleMutation = useMutation({
    mutationFn: async (newRole: string) => {
      return apiRequest("PATCH", `/api/user/${user!.id}`, { role: newRole });
    },
    onSuccess: () => {
      toast({
        title: "Role Updated",
        description: "Your user role has been successfully updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update user role.",
        variant: "destructive",
      });
      setSelectedRole(user?.role || ""); // Reset to original role on error
    },
  });

  if (!user) return null;

  const isSuperUser = user.role === UserRole.SUPER_ADMIN || user.role === UserRole.FACILITY_MANAGER;

  const getRoleDisplay = (role: string) => {
    switch (role) {
      case UserRole.SUPER_ADMIN:
        return "Super Admin";
      case UserRole.CLIENT_ADMINISTRATOR:
        return "Client Administrator";
      case UserRole.FACILITY_MANAGER:
        return "Facility Manager";
      case UserRole.INTERNAL_EMPLOYEE:
        return "Internal Employee";
      case UserRole.CONTRACTOR_1099:
        return "1099 Contractor";
      default:
        return role;
    }
  };

  const handleRoleChange = (newRole: string) => {
    setSelectedRole(newRole);
    updateRoleMutation.mutate(newRole);
  };

  const handleSaveSettings = () => {
    toast({
      title: "Settings Saved",
      description: "Your preferences have been updated successfully.",
    });
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
            <Settings className="w-6 h-6" />
            <span>Settings</span>
          </h2>
          <p className="text-sm text-gray-500">
            Manage your account preferences and application settings
          </p>
        </div>

        <Button onClick={handleSaveSettings}>
          <Save className="w-4 h-4 mr-2" />
          Save Changes
        </Button>
      </div>

      <div className="space-y-6">


        {/* Account Information */}
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>Your basic account details and profile information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name</Label>
                <Input id="firstName" value={user.firstName} readOnly className="bg-gray-50" />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input id="lastName" value={user.lastName} readOnly className="bg-gray-50" />
              </div>
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" value={user.email} readOnly className="bg-gray-50" />
              </div>
              <div>
                <Label htmlFor="role">User Role</Label>
                {user.role === UserRole.CLIENT_ADMINISTRATOR ? (
                  <Select
                    value={selectedRole}
                    onValueChange={handleRoleChange}
                    disabled={updateRoleMutation.isPending}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={UserRole.SUPER_ADMIN}>Super Admin</SelectItem>
                      <SelectItem value={UserRole.CLIENT_ADMINISTRATOR}>
                        Client Administrator
                      </SelectItem>
                      <SelectItem value={UserRole.FACILITY_MANAGER}>Facility Manager</SelectItem>
                      <SelectItem value={UserRole.INTERNAL_EMPLOYEE}>Internal Employee</SelectItem>
                      <SelectItem value={UserRole.CONTRACTOR_1099}>1099 Contractor</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id="role"
                    value={getRoleDisplay(user.role)}
                    readOnly
                    className="bg-gray-50"
                  />
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notification Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Bell className="w-5 h-5" />
              <span>Notification Preferences</span>
            </CardTitle>
            <CardDescription>Choose how you want to receive alerts and updates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="emailAlerts">Email Alerts</Label>
                  <p className="text-sm text-gray-500">Receive notifications via email</p>
                </div>
                <Switch
                  id="emailAlerts"
                  checked={notifications.emailAlerts}
                  onCheckedChange={(checked) =>
                    setNotifications((prev) => ({ ...prev, emailAlerts: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="smsAlerts">SMS Alerts</Label>
                  <p className="text-sm text-gray-500">Get urgent notifications via text message</p>
                </div>
                <Switch
                  id="smsAlerts"
                  checked={notifications.smsAlerts}
                  onCheckedChange={(checked) =>
                    setNotifications((prev) => ({ ...prev, smsAlerts: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="pushNotifications">Push Notifications</Label>
                  <p className="text-sm text-gray-500">
                    Browser notifications for real-time updates
                  </p>
                </div>
                <Switch
                  id="pushNotifications"
                  checked={notifications.pushNotifications}
                  onCheckedChange={(checked) =>
                    setNotifications((prev) => ({ ...prev, pushNotifications: checked }))
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="scheduleChanges">Schedule Changes</Label>
                  <p className="text-sm text-gray-500">
                    Alerts when shifts are modified or cancelled
                  </p>
                </div>
                <Switch
                  id="scheduleChanges"
                  checked={notifications.scheduleChanges}
                  onCheckedChange={(checked) =>
                    setNotifications((prev) => ({ ...prev, scheduleChanges: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="shiftReminders">Shift Reminders</Label>
                  <p className="text-sm text-gray-500">Reminders before upcoming shifts</p>
                </div>
                <Switch
                  id="shiftReminders"
                  checked={notifications.shiftReminders}
                  onCheckedChange={(checked) =>
                    setNotifications((prev) => ({ ...prev, shiftReminders: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="systemUpdates">System Updates</Label>
                  <p className="text-sm text-gray-500">
                    Information about platform updates and maintenance
                  </p>
                </div>
                <Switch
                  id="systemUpdates"
                  checked={notifications.systemUpdates}
                  onCheckedChange={(checked) =>
                    setNotifications((prev) => ({ ...prev, systemUpdates: checked }))
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Application Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Globe className="w-5 h-5" />
              <span>Application Preferences</span>
            </CardTitle>
            <CardDescription>Customize your application experience</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="darkMode">Dark Mode</Label>
                  <p className="text-sm text-gray-500">Use dark theme for the interface</p>
                </div>
                <Switch
                  id="darkMode"
                  checked={preferences.darkMode}
                  onCheckedChange={(checked) =>
                    setPreferences((prev) => ({ ...prev, darkMode: checked }))
                  }
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="language">Language</Label>
                  <Select
                    value={preferences.language}
                    onValueChange={(value) =>
                      setPreferences((prev) => ({ ...prev, language: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select
                    value={preferences.timezone}
                    onValueChange={(value) =>
                      setPreferences((prev) => ({ ...prev, timezone: value }))
                    }
                  >
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

                <div>
                  <Label htmlFor="defaultCalendarView">Default Calendar View</Label>
                  <Select
                    value={preferences.defaultCalendarView}
                    onValueChange={(value) =>
                      setPreferences((prev) => ({ ...prev, defaultCalendarView: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="next7days">Next 7 Days</SelectItem>
                      <SelectItem value="month">Month View</SelectItem>
                      <SelectItem value="daily">Daily Breakdown</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="autoRefresh">Auto Refresh</Label>
                  <p className="text-sm text-gray-500">
                    Automatically refresh data every 30 seconds
                  </p>
                </div>
                <Switch
                  id="autoRefresh"
                  checked={preferences.autoRefresh}
                  onCheckedChange={(checked) =>
                    setPreferences((prev) => ({ ...prev, autoRefresh: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="soundAlerts">Sound Alerts</Label>
                  <p className="text-sm text-gray-500">Play sounds for important notifications</p>
                </div>
                <Switch
                  id="soundAlerts"
                  checked={preferences.soundAlerts}
                  onCheckedChange={(checked) =>
                    setPreferences((prev) => ({ ...prev, soundAlerts: checked }))
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
