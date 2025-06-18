import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Settings, Building2, User, Shield, Bell, Moon, Globe, Save, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { UserRole } from "@shared/schema";
import { hasPermission } from "@/lib/permissions";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

type AppView = 'facility' | 'clinician' | 'employee' | 'contractor';

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [appView, setAppView] = useState<AppView>('facility');
  const [selectedRole, setSelectedRole] = useState(user?.role || '');
  const [notifications, setNotifications] = useState({
    emailAlerts: true,
    smsAlerts: false,
    pushNotifications: true,
    scheduleChanges: true,
    shiftReminders: true,
    systemUpdates: false
  });
  const [preferences, setPreferences] = useState({
    darkMode: false,
    language: 'en',
    timezone: 'America/New_York',
    defaultCalendarView: 'next7days',
    autoRefresh: true,
    soundAlerts: true
  });

  // Role update mutation
  const updateRoleMutation = useMutation({
    mutationFn: async (newRole: string) => {
      return apiRequest('PATCH', `/api/user/${user!.id}`, { role: newRole });
    },
    onSuccess: () => {
      toast({
        title: "Role Updated",
        description: "Your user role has been successfully updated.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update user role.",
        variant: "destructive"
      });
      setSelectedRole(user?.role || ''); // Reset to original role on error
    }
  });

  if (!user) return null;

  const isSuperUser = user.role === UserRole.SUPER_ADMIN || user.role === UserRole.FACILITY_MANAGER;

  const getRoleDisplay = (role: string) => {
    switch (role) {
      case UserRole.SUPER_ADMIN: return "Super Admin";
      case UserRole.CLIENT_ADMINISTRATOR: return "Client Administrator";
      case UserRole.FACILITY_MANAGER: return "Facility Manager";
      case UserRole.INTERNAL_EMPLOYEE: return "Internal Employee";
      case UserRole.CONTRACTOR_1099: return "1099 Contractor";
      default: return role;
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

  const switchAppView = (newView: AppView) => {
    setAppView(newView);
    
    // Navigate to appropriate dashboard based on view
    let route = '/';
    switch (newView) {
      case 'clinician':
        route = '/clinician-dashboard';
        break;
      case 'employee':
        route = '/employee-dashboard';
        break;
      case 'contractor':
        route = '/contractor-dashboard';
        break;
      case 'facility':
      default:
        route = '/';
        break;
    }
    
    // Navigate to the appropriate route
    window.location.href = route;
    
    toast({
      title: `Switched to ${newView.charAt(0).toUpperCase() + newView.slice(1)} View`,
      description: `You are now viewing the application from a ${newView} perspective.`,
    });
  };

  return (
    <Layout>
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
          {/* Super User App View Switcher */}
          {isSuperUser && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="w-5 h-5" />
                  <span>Super User Controls</span>
                </CardTitle>
                <CardDescription>
                  Switch between different app views to experience various user perspectives and role interfaces
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Application View</Label>
                    <div className="mt-2 grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <Card 
                        className={cn(
                          "cursor-pointer transition-all border-2",
                          appView === 'facility' 
                            ? "border-blue-500 bg-blue-50" 
                            : "border-gray-200 hover:border-gray-300"
                        )}
                        onClick={() => switchAppView('facility')}
                      >
                        <CardContent className="p-4">
                          <div className="flex flex-col items-center text-center space-y-2">
                            <Building2 className={cn(
                              "w-8 h-8",
                              appView === 'facility' ? "text-blue-600" : "text-gray-500"
                            )} />
                            <div>
                              <h3 className="font-medium">Facility View</h3>
                              <p className="text-xs text-gray-600">
                                Manage schedules, staff, and operations
                              </p>
                            </div>
                            {appView === 'facility' && (
                              <Badge className="bg-blue-100 text-blue-800">
                                Active
                              </Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>

                      <Card 
                        className={cn(
                          "cursor-pointer transition-all border-2",
                          appView === 'clinician' 
                            ? "border-green-500 bg-green-50" 
                            : "border-gray-200 hover:border-gray-300"
                        )}
                        onClick={() => switchAppView('clinician')}
                      >
                        <CardContent className="p-4">
                          <div className="flex flex-col items-center text-center space-y-2">
                            <User className={cn(
                              "w-8 h-8",
                              appView === 'clinician' ? "text-green-600" : "text-gray-500"
                            )} />
                            <div>
                              <h3 className="font-medium">Clinician View</h3>
                              <p className="text-xs text-gray-600">
                                Basic clinician dashboard
                              </p>
                            </div>
                            {appView === 'clinician' && (
                              <Badge className="bg-green-100 text-green-800">
                                Active
                              </Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>

                      <Card 
                        className={cn(
                          "cursor-pointer transition-all border-2",
                          appView === 'employee' 
                            ? "border-purple-500 bg-purple-50" 
                            : "border-gray-200 hover:border-gray-300"
                        )}
                        onClick={() => switchAppView('employee')}
                      >
                        <CardContent className="p-4">
                          <div className="flex flex-col items-center text-center space-y-2">
                            <Shield className={cn(
                              "w-8 h-8",
                              appView === 'employee' ? "text-purple-600" : "text-gray-500"
                            )} />
                            <div>
                              <h3 className="font-medium">Employee View</h3>
                              <p className="text-xs text-gray-600">
                                PTO, benefits, and employee tools
                              </p>
                            </div>
                            {appView === 'employee' && (
                              <Badge className="bg-purple-100 text-purple-800">
                                Active
                              </Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>

                      <Card 
                        className={cn(
                          "cursor-pointer transition-all border-2",
                          appView === 'contractor' 
                            ? "border-orange-500 bg-orange-50" 
                            : "border-gray-200 hover:border-gray-300"
                        )}
                        onClick={() => switchAppView('contractor')}
                      >
                        <CardContent className="p-4">
                          <div className="flex flex-col items-center text-center space-y-2">
                            <FileText className={cn(
                              "w-8 h-8",
                              appView === 'contractor' ? "text-orange-600" : "text-gray-500"
                            )} />
                            <div>
                              <h3 className="font-medium">Contractor View</h3>
                              <p className="text-xs text-gray-600">
                                Gig history, 1099s, and contractor tools
                              </p>
                            </div>
                            {appView === 'contractor' && (
                              <Badge className="bg-orange-100 text-orange-800">
                                Active
                              </Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <div className="flex items-start space-x-2">
                      <Shield className="w-5 h-5 text-amber-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-amber-800">Role-Based View Testing</h4>
                        <p className="text-sm text-amber-700">
                          Switch between facility management, clinician, employee, and contractor views to experience 
                          role-specific dashboards and interfaces. Each view shows different data, tools, and workflows 
                          relevant to that user type.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

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
                    <Select value={selectedRole} onValueChange={handleRoleChange} disabled={updateRoleMutation.isPending}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={UserRole.SUPER_ADMIN}>Super Admin</SelectItem>
                        <SelectItem value={UserRole.CLIENT_ADMINISTRATOR}>Client Administrator</SelectItem>
                        <SelectItem value={UserRole.FACILITY_MANAGER}>Facility Manager</SelectItem>
                        <SelectItem value={UserRole.INTERNAL_EMPLOYEE}>Internal Employee</SelectItem>
                        <SelectItem value={UserRole.CONTRACTOR_1099}>1099 Contractor</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input id="role" value={getRoleDisplay(user.role)} readOnly className="bg-gray-50" />
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
                      setNotifications(prev => ({ ...prev, emailAlerts: checked }))
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
                      setNotifications(prev => ({ ...prev, smsAlerts: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="pushNotifications">Push Notifications</Label>
                    <p className="text-sm text-gray-500">Browser notifications for real-time updates</p>
                  </div>
                  <Switch
                    id="pushNotifications"
                    checked={notifications.pushNotifications}
                    onCheckedChange={(checked) => 
                      setNotifications(prev => ({ ...prev, pushNotifications: checked }))
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="scheduleChanges">Schedule Changes</Label>
                    <p className="text-sm text-gray-500">Alerts when shifts are modified or cancelled</p>
                  </div>
                  <Switch
                    id="scheduleChanges"
                    checked={notifications.scheduleChanges}
                    onCheckedChange={(checked) => 
                      setNotifications(prev => ({ ...prev, scheduleChanges: checked }))
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
                      setNotifications(prev => ({ ...prev, shiftReminders: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="systemUpdates">System Updates</Label>
                    <p className="text-sm text-gray-500">Information about platform updates and maintenance</p>
                  </div>
                  <Switch
                    id="systemUpdates"
                    checked={notifications.systemUpdates}
                    onCheckedChange={(checked) => 
                      setNotifications(prev => ({ ...prev, systemUpdates: checked }))
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
                      setPreferences(prev => ({ ...prev, darkMode: checked }))
                    }
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="language">Language</Label>
                    <Select value={preferences.language} onValueChange={(value) => 
                      setPreferences(prev => ({ ...prev, language: value }))
                    }>
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
                    <Select value={preferences.timezone} onValueChange={(value) => 
                      setPreferences(prev => ({ ...prev, timezone: value }))
                    }>
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
                    <Select value={preferences.defaultCalendarView} onValueChange={(value) => 
                      setPreferences(prev => ({ ...prev, defaultCalendarView: value }))
                    }>
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
                    <p className="text-sm text-gray-500">Automatically refresh data every 30 seconds</p>
                  </div>
                  <Switch
                    id="autoRefresh"
                    checked={preferences.autoRefresh}
                    onCheckedChange={(checked) => 
                      setPreferences(prev => ({ ...prev, autoRefresh: checked }))
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
                      setPreferences(prev => ({ ...prev, soundAlerts: checked }))
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}