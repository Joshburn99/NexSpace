import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { 
  Building2, 
  Save, 
  Clock, 
  Globe,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Shield,
  Zap,
  Settings2
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';

export function FacilitySettings() {
  const { toast } = useToast();
  const facilityId = 1; // TODO: Get from context
  const [activeTab, setActiveTab] = useState('general');

  const { data: facility, isLoading } = useQuery({
    queryKey: ['/api/facilities', facilityId],
    queryFn: async () => {
      // Mock data for now
      return {
        id: facilityId,
        name: 'General Hospital',
        type: 'hospital',
        address: '123 Medical Center Dr',
        city: 'Springfield',
        state: 'IL',
        zip: '62701',
        phone: '(555) 123-4567',
        email: 'admin@generalhospital.com',
        timezone: 'America/Chicago',
        bedCount: 150,
        autoAssignmentEnabled: true,
        maxShiftLength: 12,
        minRestPeriod: 8,
        overtimeThreshold: 40,
        floatPoolEnabled: true,
        requireApproval: true,
        notificationSettings: {
          emailAlerts: true,
          smsAlerts: false,
          criticalOnly: false,
        },
      };
    },
  });

  const updateFacility = useMutation({
    mutationFn: async (updates: any) => {
      const response = await fetch(`/api/facilities/${facilityId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error('Failed to update facility');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Settings Updated',
        description: 'Facility settings have been saved successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/facilities', facilityId] });
    },
    onError: () => {
      toast({
        title: 'Update Failed',
        description: 'Failed to save facility settings. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleSave = (section: string, data: any) => {
    updateFacility.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Facility Settings</h1>
          <p className="text-muted-foreground">Configure facility preferences and automation</p>
        </div>
      </div>

      {/* Settings Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-5 w-full lg:w-auto">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="operations">Operations</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="automation">Automation</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Update facility details and contact information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Facility Name</Label>
                  <Input id="name" defaultValue={facility?.name} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Facility Type</Label>
                  <Select defaultValue={facility?.type}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hospital">Hospital</SelectItem>
                      <SelectItem value="clinic">Clinic</SelectItem>
                      <SelectItem value="nursing_home">Nursing Home</SelectItem>
                      <SelectItem value="assisted_living">Assisted Living</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Street Address</Label>
                <Input id="address" defaultValue={facility?.address} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input id="city" defaultValue={facility?.city} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input id="state" defaultValue={facility?.state} maxLength={2} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zip">ZIP Code</Label>
                  <Input id="zip" defaultValue={facility?.zip} maxLength={10} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" defaultValue={facility?.phone} type="tel" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" defaultValue={facility?.email} type="email" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bedCount">Bed Count</Label>
                  <Input id="bedCount" defaultValue={facility?.bedCount} type="number" min={0} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select defaultValue={facility?.timezone}>
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

              <div className="flex justify-end">
                <Button onClick={() => handleSave('general', {})}>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="operations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Operational Settings</CardTitle>
              <CardDescription>Configure shift and scheduling parameters</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto-Assignment</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically assign qualified staff to open shifts
                    </p>
                  </div>
                  <Switch defaultChecked={facility?.autoAssignmentEnabled} />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Float Pool</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable float pool for flexible staffing
                    </p>
                  </div>
                  <Switch defaultChecked={facility?.floatPoolEnabled} />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Require Approval</Label>
                    <p className="text-sm text-muted-foreground">
                      Require manager approval for shift requests
                    </p>
                  </div>
                  <Switch defaultChecked={facility?.requireApproval} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="maxShiftLength">Max Shift Length (hours)</Label>
                  <Input 
                    id="maxShiftLength" 
                    type="number" 
                    defaultValue={facility?.maxShiftLength} 
                    min={1} 
                    max={24} 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="minRestPeriod">Min Rest Period (hours)</Label>
                  <Input 
                    id="minRestPeriod" 
                    type="number" 
                    defaultValue={facility?.minRestPeriod} 
                    min={1} 
                    max={24} 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="overtimeThreshold">Overtime Threshold (hours/week)</Label>
                <Input 
                  id="overtimeThreshold" 
                  type="number" 
                  defaultValue={facility?.overtimeThreshold} 
                  min={1} 
                  max={80} 
                />
              </div>

              <div className="flex justify-end">
                <Button onClick={() => handleSave('operations', {})}>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Configure how you receive alerts and updates</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Email Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive notifications via email
                    </p>
                  </div>
                  <Switch defaultChecked={facility?.notificationSettings?.emailAlerts} />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>SMS Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive text message notifications
                    </p>
                  </div>
                  <Switch defaultChecked={facility?.notificationSettings?.smsAlerts} />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Critical Alerts Only</Label>
                    <p className="text-sm text-muted-foreground">
                      Only receive notifications for urgent matters
                    </p>
                  </div>
                  <Switch defaultChecked={facility?.notificationSettings?.criticalOnly} />
                </div>
              </div>

              <Card className="border-yellow-200 bg-yellow-50">
                <CardContent className="p-4">
                  <h4 className="font-medium mb-2">Notification Types</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Urgent shift coverage needs</li>
                    <li>• Staff credential expirations</li>
                    <li>• Compliance violations</li>
                    <li>• Budget thresholds</li>
                  </ul>
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button onClick={() => handleSave('notifications', {})}>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="automation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Workflow Automation</CardTitle>
              <CardDescription>Configure automated processes and rules</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h4 className="font-medium">Auto-Assignment Rules</h4>
                <div className="space-y-2">
                  <Label>Priority Order</Label>
                  <Select defaultValue="reliability">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="reliability">Reliability Score</SelectItem>
                      <SelectItem value="seniority">Seniority</SelectItem>
                      <SelectItem value="availability">Availability</SelectItem>
                      <SelectItem value="cost">Cost Efficiency</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Minimum Reliability Score</Label>
                  <Input type="number" defaultValue={4.0} min={1} max={5} step={0.1} />
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Shift Templates</h4>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto-Generate from Templates</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically create shifts based on templates
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="space-y-2">
                  <Label>Generate Shifts (days in advance)</Label>
                  <Input type="number" defaultValue={14} min={1} max={90} />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => handleSave('automation', {})}>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Compliance Settings</CardTitle>
              <CardDescription>Configure regulatory and compliance requirements</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h4 className="font-medium">Credential Requirements</h4>
                <div className="space-y-2">
                  <Label>Expiration Warning (days)</Label>
                  <Input type="number" defaultValue={30} min={1} max={180} />
                  <p className="text-sm text-muted-foreground">
                    Alert when credentials expire within this many days
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Block Expired Credentials</Label>
                    <p className="text-sm text-muted-foreground">
                      Prevent staff with expired credentials from being scheduled
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Regulatory Compliance</h4>
                <div className="space-y-2">
                  <Label>CMS ID</Label>
                  <Input defaultValue="123456" />
                </div>
                <div className="space-y-2">
                  <Label>NPI Number</Label>
                  <Input defaultValue="1234567890" />
                </div>
                <div className="space-y-2">
                  <Label>State License Number</Label>
                  <Input defaultValue="IL-H-12345" />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => handleSave('compliance', {})}>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}