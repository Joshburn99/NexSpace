import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Building2, MapPin, Phone, Mail, Clock, Edit, Save, X, Users, Shield, Settings } from 'lucide-react';
import { useFacilityPermissions } from '@/hooks/use-facility-permissions';
import { PermissionGuard } from '@/components/PermissionGuard';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface Facility {
  id: number;
  name: string;
  type: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  email: string;
  bedCount: number;
  isActive: boolean;
  timezone: string;
  autoAssignmentEnabled?: boolean;
  emrSystem?: string;
  netTerms?: string;
  billingContactName?: string;
  billingContactEmail?: string;
  contractStartDate?: string;
  contractEndDate?: string;
}

export default function FacilityProfilePage() {
  const [isEditing, setIsEditing] = useState(false);
  const [editedFacility, setEditedFacility] = useState<Partial<Facility>>({});
  const { permissions, hasPermission, facilityId } = useFacilityPermissions();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Debug logging
  console.log('[FACILITY_PROFILE] Component state:', {
    facilityId,
    hasPermission: hasPermission('view_facility_profile'),
    permissions
  });

  const { data: facility, isLoading, error } = useQuery<Facility>({
    queryKey: ['/api/facilities', facilityId],
    enabled: !!facilityId && hasPermission('view_facility_profile'),
  });

  console.log('[FACILITY_PROFILE] Query state:', {
    facility,
    isLoading,
    error,
    enabled: !!facilityId && hasPermission('view_facility_profile')
  });

  const updateFacility = useMutation({
    mutationFn: async (data: Partial<Facility>) => {
      return apiRequest('PATCH', `/api/facilities/${facilityId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/facilities', facilityId] });
      setIsEditing(false);
      toast({
        title: "Success",
        description: "Facility profile updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update facility profile",
        variant: "destructive",
      });
    },
  });

  if (!hasPermission('view_facility_profile')) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-gray-600">You don't have permission to view facility profiles.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!facilityId) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-gray-600">No facility ID available. Please ensure you are properly logged in.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-gray-600">Loading facility profile...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    console.error('[FACILITY_PROFILE] Error fetching facility:', error);
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-red-600">Error loading facility profile. Please try again.</p>
            <p className="text-sm text-gray-500 mt-2">
              {error instanceof Error ? error.message : 'Unknown error'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!facility) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-gray-600">Facility not found.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleEdit = () => {
    setEditedFacility(facility);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setEditedFacility({});
    setIsEditing(false);
  };

  const handleSave = () => {
    updateFacility.mutate(editedFacility);
  };

  const handleFieldChange = (field: keyof Facility, value: any) => {
    setEditedFacility(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Facility Profile</h1>
          <p className="text-gray-600 mt-2">View and manage facility information</p>
        </div>
        <PermissionGuard permission="edit_facility_profile">
          {!isEditing ? (
            <Button onClick={handleEdit}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={updateFacility.isPending}>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
              <Button variant="outline" onClick={handleCancel}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          )}
        </PermissionGuard>
      </div>

      <Tabs defaultValue="basic" className="space-y-4">
        <TabsList>
          <TabsTrigger value="basic">Basic Information</TabsTrigger>
          <TabsTrigger value="contact">Contact Details</TabsTrigger>
          <TabsTrigger value="operations">Operations</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>

        <TabsContent value="basic">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Core facility details and identification</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Facility Name</Label>
                  {isEditing ? (
                    <Input
                      value={editedFacility.name || ''}
                      onChange={(e) => handleFieldChange('name', e.target.value)}
                    />
                  ) : (
                    <p className="text-lg font-medium">{facility.name}</p>
                  )}
                </div>
                <div>
                  <Label>Facility Type</Label>
                  {isEditing ? (
                    <Select
                      value={editedFacility.type || ''}
                      onValueChange={(value) => handleFieldChange('type', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hospital">Hospital</SelectItem>
                        <SelectItem value="nursing_home">Nursing Home</SelectItem>
                        <SelectItem value="clinic">Clinic</SelectItem>
                        <SelectItem value="rehabilitation">Rehabilitation Center</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-lg font-medium">{facility.type}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Bed Count</Label>
                  {isEditing ? (
                    <Input
                      type="number"
                      value={editedFacility.bedCount || ''}
                      onChange={(e) => handleFieldChange('bedCount', parseInt(e.target.value))}
                    />
                  ) : (
                    <p className="text-lg font-medium">{facility.bedCount}</p>
                  )}
                </div>
                <div>
                  <Label>Status</Label>
                  <div className="flex items-center gap-2 mt-1">
                    {isEditing ? (
                      <Switch
                        checked={editedFacility.isActive}
                        onCheckedChange={(checked) => handleFieldChange('isActive', checked)}
                      />
                    ) : (
                      <Badge variant={facility.isActive ? "default" : "secondary"}>
                        {facility.isActive ? "Active" : "Inactive"}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contact">
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
              <CardDescription>Address and communication details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Street Address</Label>
                {isEditing ? (
                  <Input
                    value={editedFacility.address || ''}
                    onChange={(e) => handleFieldChange('address', e.target.value)}
                  />
                ) : (
                  <p className="text-lg font-medium flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    {facility.address}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>City</Label>
                  {isEditing ? (
                    <Input
                      value={editedFacility.city || ''}
                      onChange={(e) => handleFieldChange('city', e.target.value)}
                    />
                  ) : (
                    <p className="text-lg font-medium">{facility.city}</p>
                  )}
                </div>
                <div>
                  <Label>State</Label>
                  {isEditing ? (
                    <Input
                      value={editedFacility.state || ''}
                      onChange={(e) => handleFieldChange('state', e.target.value)}
                    />
                  ) : (
                    <p className="text-lg font-medium">{facility.state}</p>
                  )}
                </div>
                <div>
                  <Label>ZIP Code</Label>
                  {isEditing ? (
                    <Input
                      value={editedFacility.zipCode || ''}
                      onChange={(e) => handleFieldChange('zipCode', e.target.value)}
                    />
                  ) : (
                    <p className="text-lg font-medium">{facility.zipCode}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Phone</Label>
                  {isEditing ? (
                    <Input
                      value={editedFacility.phone || ''}
                      onChange={(e) => handleFieldChange('phone', e.target.value)}
                    />
                  ) : (
                    <p className="text-lg font-medium flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-500" />
                      {facility.phone}
                    </p>
                  )}
                </div>
                <div>
                  <Label>Email</Label>
                  {isEditing ? (
                    <Input
                      type="email"
                      value={editedFacility.email || ''}
                      onChange={(e) => handleFieldChange('email', e.target.value)}
                    />
                  ) : (
                    <p className="text-lg font-medium flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-500" />
                      {facility.email}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="operations">
          <Card>
            <CardHeader>
              <CardTitle>Operational Settings</CardTitle>
              <CardDescription>Configure facility operations and automation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Timezone</Label>
                  {isEditing ? (
                    <Select
                      value={editedFacility.timezone || ''}
                      onValueChange={(value) => handleFieldChange('timezone', value)}
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
                  ) : (
                    <p className="text-lg font-medium flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-500" />
                      {facility.timezone || 'Not set'}
                    </p>
                  )}
                </div>
                <div>
                  <Label>EMR System</Label>
                  {isEditing ? (
                    <Select
                      value={editedFacility.emrSystem || 'none'}
                      onValueChange={(value) => handleFieldChange('emrSystem', value === 'none' ? null : value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="epic">Epic</SelectItem>
                        <SelectItem value="cerner">Cerner</SelectItem>
                        <SelectItem value="meditech">Meditech</SelectItem>
                        <SelectItem value="allscripts">Allscripts</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-lg font-medium">{facility.emrSystem || 'Not configured'}</p>
                  )}
                </div>
              </div>

              <div>
                <Label className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Auto-Assignment Enabled
                </Label>
                <div className="flex items-center gap-2 mt-2">
                  {isEditing ? (
                    <Switch
                      checked={editedFacility.autoAssignmentEnabled || false}
                      onCheckedChange={(checked) => handleFieldChange('autoAssignmentEnabled', checked)}
                    />
                  ) : (
                    <Badge variant={facility.autoAssignmentEnabled ? "default" : "secondary"}>
                      {facility.autoAssignmentEnabled ? "Enabled" : "Disabled"}
                    </Badge>
                  )}
                  <span className="text-sm text-gray-600">
                    Automatically assign qualified staff to open shifts
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing">
          <Card>
            <CardHeader>
              <CardTitle>Billing Information</CardTitle>
              <CardDescription>Payment terms and billing contacts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Payment Terms</Label>
                {isEditing ? (
                  <Select
                    value={editedFacility.netTerms || 'net30'}
                    onValueChange={(value) => handleFieldChange('netTerms', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="net15">Net 15</SelectItem>
                      <SelectItem value="net30">Net 30</SelectItem>
                      <SelectItem value="net45">Net 45</SelectItem>
                      <SelectItem value="net60">Net 60</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-lg font-medium">{facility.netTerms || 'Net 30'}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Billing Contact Name</Label>
                  {isEditing ? (
                    <Input
                      value={editedFacility.billingContactName || ''}
                      onChange={(e) => handleFieldChange('billingContactName', e.target.value)}
                    />
                  ) : (
                    <p className="text-lg font-medium">{facility.billingContactName || 'Not set'}</p>
                  )}
                </div>
                <div>
                  <Label>Billing Contact Email</Label>
                  {isEditing ? (
                    <Input
                      type="email"
                      value={editedFacility.billingContactEmail || ''}
                      onChange={(e) => handleFieldChange('billingContactEmail', e.target.value)}
                    />
                  ) : (
                    <p className="text-lg font-medium">{facility.billingContactEmail || 'Not set'}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Contract Start Date</Label>
                  {isEditing ? (
                    <Input
                      type="date"
                      value={editedFacility.contractStartDate || ''}
                      onChange={(e) => handleFieldChange('contractStartDate', e.target.value)}
                    />
                  ) : (
                    <p className="text-lg font-medium">
                      {facility.contractStartDate ? new Date(facility.contractStartDate).toLocaleDateString() : 'Not set'}
                    </p>
                  )}
                </div>
                <div>
                  <Label>Contract End Date</Label>
                  {isEditing ? (
                    <Input
                      type="date"
                      value={editedFacility.contractEndDate || ''}
                      onChange={(e) => handleFieldChange('contractEndDate', e.target.value)}
                    />
                  ) : (
                    <p className="text-lg font-medium">
                      {facility.contractEndDate ? new Date(facility.contractEndDate).toLocaleDateString() : 'Not set'}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <PermissionGuard permission="manage_facility_settings">
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Advanced Settings
            </CardTitle>
            <CardDescription>Configure advanced facility settings and automation</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">
              Go to Advanced Settings
            </Button>
          </CardContent>
        </Card>
      </PermissionGuard>
    </div>
  );
}