import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Bell, 
  Mail, 
  MessageSquare, 
  Smartphone,
  Clock,
  DollarSign,
  Calendar,
  AlertCircle,
  MapPin,
  Star,
  Zap
} from "lucide-react";

interface NotificationSetting {
  id: string;
  label: string;
  description: string;
  email: boolean;
  sms: boolean;
  inApp: boolean;
  icon: React.ReactNode;
}

export default function NotificationPreferencesPage() {
  const [notifications, setNotifications] = useState<NotificationSetting[]>([
    {
      id: "new-shifts",
      label: "New Shift Opportunities",
      description: "When shifts matching your preferences become available",
      email: true,
      sms: true,
      inApp: true,
      icon: <Calendar className="h-5 w-5" />
    },
    {
      id: "urgent-shifts",
      label: "Urgent Staffing Needs",
      description: "High-priority shifts with premium rates",
      email: true,
      sms: true,
      inApp: true,
      icon: <Zap className="h-5 w-5" />
    },
    {
      id: "shift-reminders",
      label: "Shift Reminders",
      description: "Upcoming shift notifications (24hr, 2hr before)",
      email: true,
      sms: true,
      inApp: true,
      icon: <Clock className="h-5 w-5" />
    },
    {
      id: "shift-updates",
      label: "Shift Status Updates",
      description: "When your shift requests are approved or declined",
      email: true,
      sms: false,
      inApp: true,
      icon: <AlertCircle className="h-5 w-5" />
    },
    {
      id: "messages",
      label: "Direct Messages",
      description: "Messages from facilities and colleagues",
      email: true,
      sms: false,
      inApp: true,
      icon: <MessageSquare className="h-5 w-5" />
    },
    {
      id: "credentials",
      label: "Credential Expiry Alerts",
      description: "Reminders when licenses or certifications near expiration",
      email: true,
      sms: false,
      inApp: true,
      icon: <AlertCircle className="h-5 w-5" />
    },
    {
      id: "payments",
      label: "Payment Notifications",
      description: "When payments are processed or invoices are ready",
      email: true,
      sms: false,
      inApp: true,
      icon: <DollarSign className="h-5 w-5" />
    }
  ]);

  const [shiftAlertRadius, setShiftAlertRadius] = useState([25]);
  const [minRate, setMinRate] = useState("");
  const [quietHours, setQuietHours] = useState({
    enabled: true,
    start: "22:00",
    end: "07:00"
  });

  const updateNotification = (id: string, channel: 'email' | 'sms' | 'inApp', value: boolean) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === id 
          ? { ...notif, [channel]: value }
          : notif
      )
    );
  };

  const NotificationRow = ({ notification }: { notification: NotificationSetting }) => (
    <div className="flex items-center justify-between py-4 border-b last:border-0">
      <div className="flex items-start gap-3 flex-1">
        <div className="p-2 bg-gray-100 rounded-lg">
          {notification.icon}
        </div>
        <div>
          <p className="font-medium">{notification.label}</p>
          <p className="text-sm text-gray-600">{notification.description}</p>
        </div>
      </div>
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-gray-400" />
          <Switch
            checked={notification.email}
            onCheckedChange={(checked) => updateNotification(notification.id, 'email', checked)}
          />
        </div>
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-gray-400" />
          <Switch
            checked={notification.sms}
            onCheckedChange={(checked) => updateNotification(notification.id, 'sms', checked)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Smartphone className="h-4 w-4 text-gray-400" />
          <Switch
            checked={notification.inApp}
            onCheckedChange={(checked) => updateNotification(notification.id, 'inApp', checked)}
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Notification Preferences</h1>
          <p className="text-gray-600">Stay informed without being overwhelmed</p>
        </div>

        <Tabs defaultValue="channels" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="channels">Notification Channels</TabsTrigger>
            <TabsTrigger value="shift-alerts">Shift Alerts</TabsTrigger>
            <TabsTrigger value="quiet-hours">Quiet Hours</TabsTrigger>
          </TabsList>

          {/* Notification Channels */}
          <TabsContent value="channels">
            <Card>
              <CardHeader>
                <CardTitle>Choose How You Want to Be Notified</CardTitle>
                <CardDescription>
                  Select your preferred communication channels for each type of notification
                </CardDescription>
                <div className="flex items-center gap-6 mt-4 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <span>Email</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    <span>SMS</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4" />
                    <span>In-App</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="divide-y">
                  {notifications.map(notification => (
                    <NotificationRow key={notification.id} notification={notification} />
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Shift Alert Settings */}
          <TabsContent value="shift-alerts" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Smart Shift Alerts</CardTitle>
                <CardDescription>
                  We'll only notify you about shifts that match your criteria
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Distance Setting */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-base">Maximum Distance</Label>
                    <span className="text-sm font-medium">{shiftAlertRadius[0]} miles</span>
                  </div>
                  <Slider
                    value={shiftAlertRadius}
                    onValueChange={setShiftAlertRadius}
                    max={100}
                    step={5}
                    className="w-full"
                  />
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="h-4 w-4" />
                    <span>Only show shifts within this radius of your location</span>
                  </div>
                </div>

                {/* Minimum Rate */}
                <div className="space-y-2">
                  <Label htmlFor="minRate">Minimum Hourly Rate</Label>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-gray-400" />
                    <Input
                      id="minRate"
                      type="number"
                      placeholder="40"
                      value={minRate}
                      onChange={(e) => setMinRate(e.target.value)}
                      className="max-w-[100px]"
                    />
                    <span className="text-sm text-gray-600">per hour</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    You won't receive alerts for shifts below this rate
                  </p>
                </div>

                {/* Preferred Facilities */}
                <div className="space-y-3">
                  <Label>Preferred Facilities</Label>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="gap-1">
                      <Star className="h-3 w-3" />
                      Portland General Hospital
                    </Badge>
                    <Badge variant="secondary" className="gap-1">
                      <Star className="h-3 w-3" />
                      St. Mary's Medical Center
                    </Badge>
                    <Button variant="outline" size="sm">
                      + Add Facility
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">
                    Get instant alerts when these facilities post new shifts
                  </p>
                </div>

                {/* Alert Frequency */}
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Bell className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-blue-900">Smart Alert Frequency</p>
                      <p className="text-sm text-blue-700 mt-1">
                        We'll bundle similar shifts together to reduce notification fatigue. 
                        Urgent shifts will always notify you immediately.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Quiet Hours */}
          <TabsContent value="quiet-hours">
            <Card>
              <CardHeader>
                <CardTitle>Quiet Hours</CardTitle>
                <CardDescription>
                  Set times when you don't want to receive non-urgent notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="quiet-hours-toggle" className="text-base font-medium">
                      Enable Quiet Hours
                    </Label>
                    <p className="text-sm text-gray-600">
                      Pause non-urgent notifications during specified times
                    </p>
                  </div>
                  <Switch
                    id="quiet-hours-toggle"
                    checked={quietHours.enabled}
                    onCheckedChange={(checked) => 
                      setQuietHours(prev => ({ ...prev, enabled: checked }))
                    }
                  />
                </div>

                {quietHours.enabled && (
                  <div className="space-y-4 pt-4 border-t">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="start-time">Start Time</Label>
                        <Input
                          id="start-time"
                          type="time"
                          value={quietHours.start}
                          onChange={(e) => 
                            setQuietHours(prev => ({ ...prev, start: e.target.value }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="end-time">End Time</Label>
                        <Input
                          id="end-time"
                          type="time"
                          value={quietHours.end}
                          onChange={(e) => 
                            setQuietHours(prev => ({ ...prev, end: e.target.value }))
                          }
                        />
                      </div>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600">
                        <strong>Note:</strong> You'll still receive notifications for:
                      </p>
                      <ul className="mt-2 space-y-1 text-sm text-gray-600">
                        <li className="flex items-center gap-2">
                          <Zap className="h-4 w-4 text-yellow-500" />
                          Urgent shift requests
                        </li>
                        <li className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-blue-500" />
                          Shift reminders for upcoming shifts
                        </li>
                        <li className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-red-500" />
                          Critical credential expiry warnings
                        </li>
                      </ul>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        <div className="flex justify-between items-center mt-8">
          <Button variant="outline">Back</Button>
          <div className="flex gap-3">
            <Button variant="outline">Skip for now</Button>
            <Button>Save Preferences</Button>
          </div>
        </div>
      </div>
    </div>
  );
}