import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { AppLayout } from "@/components/ui/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Settings, Building2, User, Shield, Bell, Moon, Globe, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { UserRole } from "@shared/schema";
import { hasPermission } from "@/lib/permissions";
import { useToast } from "@/hooks/use-toast";

type AppView = 'facility' | 'clinician';

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [appView, setAppView] = useState<AppView>('facility');
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

  if (!user) return null;

  const isSuperUser = user.role === UserRole.SUPER_ADMIN || user.role === UserRole.FACILITY_MANAGER;

  const handleSaveSettings = () => {
    toast({
      title: "Settings Saved",
      description: "Your preferences have been updated successfully.",
    });
  };

  const switchAppView = (newView: AppView) => {
    setAppView(newView);
    toast({
      title: `Switched to ${newView.charAt(0).toUpperCase() + newView.slice(1)} View`,
      description: `You are now viewing the application from a ${newView} perspective.`,
    });
  };

  return (
    <AppLayout title="Settings" subtitle="Manage your account and application preferences">
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
                  Switch between facility and clinician app views to experience different user perspectives
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Application View</Label>
                    <div className="mt-2 grid grid-cols-2 gap-4">
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
                          <div className="flex items-center space-x-3">
                            <Building2 className={cn(
                              "w-6 h-6",
                              appView === 'facility' ? "text-blue-600" : "text-gray-500"
                            )} />
                            <div>
                              <h3 className="font-medium">Facility View</h3>
                              <p className="text-sm text-gray-600">
                                Manage schedules, staff, and operations
                              </p>
                            </div>
                          </div>
                          {appView === 'facility' && (
                            <Badge className="mt-2 bg-blue-100 text-blue-800">
                              Currently Active
                            </Badge>
                          )}
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
                          <div className="flex items-center space-x-3">
                            <User className={cn(
                              "w-6 h-6",
                              appView === 'clinician' ? "text-green-600" : "text-gray-500"
                            )} />
                            <div>
                              <h3 className="font-medium">Clinician View</h3>
                              <p className="text-sm text-gray-600">
                                View shifts, apply for jobs, track time
                              </p>
                            </div>
                          </div>
                          {appView === 'clinician' && (
                            <Badge className="mt-2 bg-green-100 text-green-800">
                              Currently Active
                            </Badge>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <div className="flex items-start space-x-2">
                      <Shield className="w-5 h-5 text-amber-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-amber-800">Super User Access</h4>
                        <p className="text-sm text-amber-700">
                          As a super user, you can switch between views to understand how different user types 
                          experience the platform. This helps with training, troubleshooting, and system optimization.
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
                  <Input id="role" value={user.role} readOnly className="bg-gray-50" />
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
    </AppLayout>
  );
}