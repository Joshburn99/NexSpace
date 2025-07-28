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
import { Building2, MapPin, Phone, Mail, Clock, Edit, Save, X, Users, Shield, Settings, Loader2 } from 'lucide-react';
import { useFacilityPermissions } from '@/hooks/use-facility-permissions';
import { PermissionGuard } from '@/components/PermissionGuard';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface Facility {
  id: number;
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  email: string;
  website?: string;
  
  // CMS & Regulatory
  cmsId?: string;
  npiNumber?: string;
  facilityType?: string;
  bedCount?: number;
  privateRooms?: number;
  semiPrivateRooms?: number;
  overallRating?: number;
  healthInspectionRating?: number;
  qualityMeasureRating?: number;
  staffingRating?: number;
  rnStaffingRating?: number;
  ownershipType?: string;
  certificationDate?: string;
  participatesMedicare?: boolean;
  participatesMedicaid?: boolean;
  
  // Operations
  isActive: boolean;
  timezone: string;
  autoAssignmentEnabled?: boolean;
  teamId?: number;
  emrSystem?: string;
  specialtyServices?: string[];
  languagesSpoken?: string[];
  
  // Billing & Rates
  netTerms?: string;
  billingContactName?: string;
  billingContactEmail?: string;
  floatPoolMargins?: Record<string, number>;
  billRates?: Record<string, number>;
  payRates?: Record<string, number>;
  
  // Workflow & Settings
  workflowAutomationConfig?: {
    autoApproveShifts?: boolean;
    autoNotifyManagers?: boolean;
    autoGenerateInvoices?: boolean;
    requireManagerApproval?: boolean;
    enableOvertimeAlerts?: boolean;
    autoAssignBySpecialty?: boolean;
  };
  shiftManagementSettings?: {
    overtimeThreshold?: number;
    maxConsecutiveShifts?: number;
    minHoursBetweenShifts?: number;
    allowBackToBackShifts?: boolean;
    requireManagerApprovalForOvertime?: boolean;
    autoCalculateOvertime?: boolean;
  };
  
  // Staffing & Rules
  staffingTargets?: Record<string, any>;
  customRules?: {
    floatPoolRules?: any;
    overtimeRules?: any;
    attendanceRules?: any;
    requiredDocuments?: string[];
  };
  
  // Compliance
  regulatoryDocs?: any[];
  lastInspectionDate?: string;
  deficiencyCount?: number;
  complaintsCount?: number;
  finesTotal?: number;
  
  // Contract & Admin
  contractStartDate?: string;
  contractEndDate?: string;
  adminName?: string;
  adminTitle?: string;
  medicalDirector?: string;
  payrollProviderId?: number;
  
  // Location
  latitude?: number;
  longitude?: number;
  
  // Metadata
  autoImported?: boolean;
  lastDataUpdate?: string;
  dataSource?: string;
  createdAt?: string;
  updatedAt?: string;
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
    enabled: !!facilityId && hasPermission('view_facility_profile'),
    queryKey: ['/api/facilities', facilityId]
  });

  const updateFacility = useMutation({
    mutationFn: async (data: Partial<Facility>) => {
      const response = await apiRequest('PATCH', `/api/facilities/${facilityId}`, data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update facility profile');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/facilities', facilityId] });
      setIsEditing(false);
      toast({
        title: "Success",
        description: "Facility profile updated successfully",
      });
    },
    onError: (error: any) => {
      console.error('Facility update error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update facility profile. Please check your data and try again.",
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
    <div className="w-full space-y-4 md:space-y-6 p-4 md:p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-3xl font-bold">Facility Profile</h1>
          <p className="text-sm md:text-base text-gray-600 mt-1 md:mt-2">View and manage facility information</p>
        </div>
        <PermissionGuard requiredPermissions={["edit_facility_profile"]}>
          {!isEditing ? (
            <Button onClick={handleEdit} className="min-h-[44px] touch-manipulation">
              <Edit className="h-4 w-4 mr-1 md:mr-2" />
              Edit Profile
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={updateFacility.isPending} className="min-h-[44px] touch-manipulation">
                {updateFacility.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 md:mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-1 md:mr-2" />
                    Save
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={handleCancel} className="min-h-[44px] touch-manipulation">
                <X className="h-4 w-4 mr-1 md:mr-2" />
                Cancel
              </Button>
            </div>
          )}
        </PermissionGuard>
      </div>

      <Tabs defaultValue="basic" className="space-y-4">
        <TabsList className="w-full overflow-x-auto flex md:grid md:grid-cols-8 gap-1 md:gap-2">
          <TabsTrigger value="basic" className="min-w-fit">Basic Info</TabsTrigger>
          <TabsTrigger value="contact" className="min-w-fit">Contact</TabsTrigger>
          <TabsTrigger value="operations" className="min-w-fit">Operations</TabsTrigger>
          <TabsTrigger value="billing" className="min-w-fit">Billing & Rates</TabsTrigger>
          <TabsTrigger value="compliance" className="min-w-fit">Compliance</TabsTrigger>
          <TabsTrigger value="workflow" className="min-w-fit">Workflow</TabsTrigger>
          <TabsTrigger value="shifts" className="min-w-fit">Shift Rules</TabsTrigger>
          <TabsTrigger value="staffing" className="min-w-fit">Staffing</TabsTrigger>
        </TabsList>

        <TabsContent value="basic">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Core facility details and identification</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                <div>
                  <Label className="text-sm">Facility Name</Label>
                  {isEditing ? (
                    <Input
                      value={editedFacility.name || ''}
                      onChange={(e) => handleFieldChange('name', e.target.value)}
                      className="min-h-[40px]"
                    />
                  ) : (
                    <p className="text-base md:text-lg font-medium">{facility.name}</p>
                  )}
                </div>
                <div>
                  <Label className="text-sm">Facility Type</Label>
                  {isEditing ? (
                    <Select
                      value={editedFacility.facilityType || ''}
                      onValueChange={(value) => handleFieldChange('facilityType', value)}
                    >
                      <SelectTrigger className="min-h-[40px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hospital">Hospital</SelectItem>
                        <SelectItem value="nursing_home">Nursing Home</SelectItem>
                        <SelectItem value="assisted_living">Assisted Living</SelectItem>
                        <SelectItem value="rehab_center">Rehabilitation Center</SelectItem>
                        <SelectItem value="clinic">Clinic</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-base md:text-lg font-medium">{facility.facilityType || 'Not specified'}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                <div>
                  <Label className="text-sm">CMS ID</Label>
                  {isEditing ? (
                    <Input
                      value={editedFacility.cmsId || ''}
                      onChange={(e) => handleFieldChange('cmsId', e.target.value)}
                      placeholder="CMS Certification Number"
                      className="min-h-[40px]"
                    />
                  ) : (
                    <p className="text-base md:text-lg font-medium">{facility.cmsId || 'Not specified'}</p>
                  )}
                </div>
                <div>
                  <Label className="text-sm">NPI Number</Label>
                  {isEditing ? (
                    <Input
                      value={editedFacility.npiNumber || ''}
                      onChange={(e) => handleFieldChange('npiNumber', e.target.value)}
                      placeholder="National Provider Identifier"
                      className="min-h-[40px]"
                    />
                  ) : (
                    <p className="text-base md:text-lg font-medium">{facility.npiNumber || 'Not specified'}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                <div>
                  <Label>Bed Count</Label>
                  {isEditing ? (
                    <Input
                      type="number"
                      value={editedFacility.bedCount || ''}
                      onChange={(e) => handleFieldChange('bedCount', parseInt(e.target.value))}
                    />
                  ) : (
                    <p className="text-lg font-medium">{facility.bedCount || 0}</p>
                  )}
                </div>
                <div>
                  <Label>Ownership Type</Label>
                  {isEditing ? (
                    <Select
                      value={editedFacility.ownershipType || ''}
                      onValueChange={(value) => handleFieldChange('ownershipType', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="for-profit">For Profit</SelectItem>
                        <SelectItem value="non-profit">Non Profit</SelectItem>
                        <SelectItem value="government">Government</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-lg font-medium">{facility.ownershipType || 'Not specified'}</p>
                  )}
                </div>
                <div>
                  <Label>Status</Label>
                  <div className="flex items-center gap-2 mt-1">
                    {isEditing ? (
                      <Switch
                        checked={editedFacility.isActive !== false}
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Team Assignment</Label>
                  {isEditing ? (
                    <Input
                      type="number"
                      value={editedFacility.teamId || ''}
                      onChange={(e) => handleFieldChange('teamId', e.target.value ? parseInt(e.target.value) : null)}
                      placeholder="Team ID"
                    />
                  ) : (
                    <p className="text-lg font-medium">{facility.teamId ? `Team ${facility.teamId}` : 'No team assigned'}</p>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <Label>Medicare</Label>
                    <div className="flex items-center gap-2 mt-1">
                      {isEditing ? (
                        <Switch
                          checked={editedFacility.participatesMedicare || false}
                          onCheckedChange={(checked) => handleFieldChange('participatesMedicare', checked)}
                        />
                      ) : (
                        <Badge variant={facility.participatesMedicare ? "default" : "secondary"}>
                          {facility.participatesMedicare ? "Yes" : "No"}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex-1">
                    <Label>Medicaid</Label>
                    <div className="flex items-center gap-2 mt-1">
                      {isEditing ? (
                        <Switch
                          checked={editedFacility.participatesMedicaid || false}
                          onCheckedChange={(checked) => handleFieldChange('participatesMedicaid', checked)}
                        />
                      ) : (
                        <Badge variant={facility.participatesMedicaid ? "default" : "secondary"}>
                          {facility.participatesMedicaid ? "Yes" : "No"}
                        </Badge>
                      )}
                    </div>
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
              <CardTitle>Billing & Rates Configuration</CardTitle>
              <CardDescription>Financial settings, rates, and billing information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Billing Contact Information */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Billing Contact</h3>
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
              </div>

              {/* Payment Terms */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Payment Terms</Label>
                  {isEditing ? (
                    <Select
                      value={editedFacility.netTerms || 'Net 30'}
                      onValueChange={(value) => handleFieldChange('netTerms', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Net 15">Net 15</SelectItem>
                        <SelectItem value="Net 30">Net 30</SelectItem>
                        <SelectItem value="Net 45">Net 45</SelectItem>
                        <SelectItem value="Net 60">Net 60</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-lg font-medium">{facility.netTerms || 'Net 30'}</p>
                  )}
                </div>
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
              </div>

              {/* Float Pool Margins */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Float Pool Margins by Specialty</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {['RN', 'LPN', 'CNA', 'RT', 'PT', 'OT'].map((specialty) => (
                    <div key={specialty}>
                      <Label>{specialty} Margin ($)</Label>
                      {isEditing ? (
                        <Input
                          type="number"
                          step="0.01"
                          value={editedFacility.floatPoolMargins?.[specialty] || ''}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value) || 0;
                            handleFieldChange('floatPoolMargins', {
                              ...(editedFacility.floatPoolMargins || {}),
                              [specialty]: value
                            });
                          }}
                          placeholder="0.00"
                        />
                      ) : (
                        <p className="text-lg font-medium">
                          ${facility.floatPoolMargins?.[specialty]?.toFixed(2) || '0.00'}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Bill Rates */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Bill Rates by Specialty</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {['RN', 'LPN', 'CNA', 'RT', 'PT', 'OT'].map((specialty) => (
                    <div key={specialty}>
                      <Label>{specialty} Bill Rate ($/hr)</Label>
                      {isEditing ? (
                        <Input
                          type="number"
                          step="0.01"
                          value={editedFacility.billRates?.[specialty] || ''}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value) || 0;
                            handleFieldChange('billRates', {
                              ...(editedFacility.billRates || {}),
                              [specialty]: value
                            });
                          }}
                          placeholder="0.00"
                        />
                      ) : (
                        <p className="text-lg font-medium">
                          ${facility.billRates?.[specialty]?.toFixed(2) || '0.00'}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Pay Rates */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Pay Rates by Specialty</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {['RN', 'LPN', 'CNA', 'RT', 'PT', 'OT'].map((specialty) => (
                    <div key={specialty}>
                      <Label>{specialty} Pay Rate ($/hr)</Label>
                      {isEditing ? (
                        <Input
                          type="number"
                          step="0.01"
                          value={editedFacility.payRates?.[specialty] || ''}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value) || 0;
                            handleFieldChange('payRates', {
                              ...(editedFacility.payRates || {}),
                              [specialty]: value
                            });
                          }}
                          placeholder="0.00"
                        />
                      ) : (
                        <p className="text-lg font-medium">
                          ${facility.payRates?.[specialty]?.toFixed(2) || '0.00'}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance">
          <Card>
            <CardHeader>
              <CardTitle>Compliance & Regulatory Information</CardTitle>
              <CardDescription>Inspection history, deficiencies, and regulatory compliance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* CMS Ratings */}
              <div>
                <h3 className="text-lg font-semibold mb-3">CMS Ratings</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label>Overall Rating</Label>
                    {isEditing ? (
                      <Input
                        type="number"
                        min="1"
                        max="5"
                        value={editedFacility.overallRating || ''}
                        onChange={(e) => handleFieldChange('overallRating', parseInt(e.target.value))}
                      />
                    ) : (
                      <p className="text-lg font-medium">{facility.overallRating ? `${facility.overallRating} ⭐` : 'Not rated'}</p>
                    )}
                  </div>
                  <div>
                    <Label>Health Inspection</Label>
                    {isEditing ? (
                      <Input
                        type="number"
                        min="1"
                        max="5"
                        value={editedFacility.healthInspectionRating || ''}
                        onChange={(e) => handleFieldChange('healthInspectionRating', parseInt(e.target.value))}
                      />
                    ) : (
                      <p className="text-lg font-medium">{facility.healthInspectionRating ? `${facility.healthInspectionRating} ⭐` : 'Not rated'}</p>
                    )}
                  </div>
                  <div>
                    <Label>Quality Measures</Label>
                    {isEditing ? (
                      <Input
                        type="number"
                        min="1"
                        max="5"
                        value={editedFacility.qualityMeasureRating || ''}
                        onChange={(e) => handleFieldChange('qualityMeasureRating', parseInt(e.target.value))}
                      />
                    ) : (
                      <p className="text-lg font-medium">{facility.qualityMeasureRating ? `${facility.qualityMeasureRating} ⭐` : 'Not rated'}</p>
                    )}
                  </div>
                  <div>
                    <Label>Staffing Rating</Label>
                    {isEditing ? (
                      <Input
                        type="number"
                        min="1"
                        max="5"
                        value={editedFacility.staffingRating || ''}
                        onChange={(e) => handleFieldChange('staffingRating', parseInt(e.target.value))}
                      />
                    ) : (
                      <p className="text-lg font-medium">{facility.staffingRating ? `${facility.staffingRating} ⭐` : 'Not rated'}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Inspection & Compliance */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Inspection & Compliance</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Last Inspection Date</Label>
                    {isEditing ? (
                      <Input
                        type="date"
                        value={editedFacility.lastInspectionDate || ''}
                        onChange={(e) => handleFieldChange('lastInspectionDate', e.target.value)}
                      />
                    ) : (
                      <p className="text-lg font-medium">
                        {facility.lastInspectionDate ? new Date(facility.lastInspectionDate).toLocaleDateString() : 'Not recorded'}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label>Certification Date</Label>
                    {isEditing ? (
                      <Input
                        type="date"
                        value={editedFacility.certificationDate || ''}
                        onChange={(e) => handleFieldChange('certificationDate', e.target.value)}
                      />
                    ) : (
                      <p className="text-lg font-medium">
                        {facility.certificationDate ? new Date(facility.certificationDate).toLocaleDateString() : 'Not recorded'}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Deficiencies & Complaints */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Deficiencies & Complaints</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Deficiency Count</Label>
                    {isEditing ? (
                      <Input
                        type="number"
                        min="0"
                        value={editedFacility.deficiencyCount || ''}
                        onChange={(e) => handleFieldChange('deficiencyCount', parseInt(e.target.value))}
                      />
                    ) : (
                      <p className="text-lg font-medium">{facility.deficiencyCount || 0}</p>
                    )}
                  </div>
                  <div>
                    <Label>Complaints Count</Label>
                    {isEditing ? (
                      <Input
                        type="number"
                        min="0"
                        value={editedFacility.complaintsCount || ''}
                        onChange={(e) => handleFieldChange('complaintsCount', parseInt(e.target.value))}
                      />
                    ) : (
                      <p className="text-lg font-medium">{facility.complaintsCount || 0}</p>
                    )}
                  </div>
                  <div>
                    <Label>Total Fines ($)</Label>
                    {isEditing ? (
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={editedFacility.finesTotal || ''}
                        onChange={(e) => handleFieldChange('finesTotal', parseFloat(e.target.value))}
                      />
                    ) : (
                      <p className="text-lg font-medium">${facility.finesTotal?.toFixed(2) || '0.00'}</p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="workflow">
          <Card>
            <CardHeader>
              <CardTitle>Workflow Automation Configuration</CardTitle>
              <CardDescription>Configure automated workflows and approval processes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Auto-Approve Shifts</Label>
                    <p className="text-sm text-gray-600">Automatically approve shift requests that meet criteria</p>
                  </div>
                  {isEditing ? (
                    <Switch
                      checked={editedFacility.workflowAutomationConfig?.autoApproveShifts || false}
                      onCheckedChange={(checked) => handleFieldChange('workflowAutomationConfig', {
                        ...(editedFacility.workflowAutomationConfig || {}),
                        autoApproveShifts: checked
                      })}
                    />
                  ) : (
                    <Badge variant={facility.workflowAutomationConfig?.autoApproveShifts ? "default" : "secondary"}>
                      {facility.workflowAutomationConfig?.autoApproveShifts ? "Enabled" : "Disabled"}
                    </Badge>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Auto-Notify Managers</Label>
                    <p className="text-sm text-gray-600">Send notifications to managers for important events</p>
                  </div>
                  {isEditing ? (
                    <Switch
                      checked={editedFacility.workflowAutomationConfig?.autoNotifyManagers || false}
                      onCheckedChange={(checked) => handleFieldChange('workflowAutomationConfig', {
                        ...(editedFacility.workflowAutomationConfig || {}),
                        autoNotifyManagers: checked
                      })}
                    />
                  ) : (
                    <Badge variant={facility.workflowAutomationConfig?.autoNotifyManagers ? "default" : "secondary"}>
                      {facility.workflowAutomationConfig?.autoNotifyManagers ? "Enabled" : "Disabled"}
                    </Badge>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Auto-Generate Invoices</Label>
                    <p className="text-sm text-gray-600">Generate invoices automatically based on worked shifts</p>
                  </div>
                  {isEditing ? (
                    <Switch
                      checked={editedFacility.workflowAutomationConfig?.autoGenerateInvoices || false}
                      onCheckedChange={(checked) => handleFieldChange('workflowAutomationConfig', {
                        ...(editedFacility.workflowAutomationConfig || {}),
                        autoGenerateInvoices: checked
                      })}
                    />
                  ) : (
                    <Badge variant={facility.workflowAutomationConfig?.autoGenerateInvoices ? "default" : "secondary"}>
                      {facility.workflowAutomationConfig?.autoGenerateInvoices ? "Enabled" : "Disabled"}
                    </Badge>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Require Manager Approval</Label>
                    <p className="text-sm text-gray-600">Require manager approval for all shift changes</p>
                  </div>
                  {isEditing ? (
                    <Switch
                      checked={editedFacility.workflowAutomationConfig?.requireManagerApproval || false}
                      onCheckedChange={(checked) => handleFieldChange('workflowAutomationConfig', {
                        ...(editedFacility.workflowAutomationConfig || {}),
                        requireManagerApproval: checked
                      })}
                    />
                  ) : (
                    <Badge variant={facility.workflowAutomationConfig?.requireManagerApproval ? "default" : "secondary"}>
                      {facility.workflowAutomationConfig?.requireManagerApproval ? "Enabled" : "Disabled"}
                    </Badge>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Enable Overtime Alerts</Label>
                    <p className="text-sm text-gray-600">Alert managers when staff approach overtime thresholds</p>
                  </div>
                  {isEditing ? (
                    <Switch
                      checked={editedFacility.workflowAutomationConfig?.enableOvertimeAlerts || false}
                      onCheckedChange={(checked) => handleFieldChange('workflowAutomationConfig', {
                        ...(editedFacility.workflowAutomationConfig || {}),
                        enableOvertimeAlerts: checked
                      })}
                    />
                  ) : (
                    <Badge variant={facility.workflowAutomationConfig?.enableOvertimeAlerts ? "default" : "secondary"}>
                      {facility.workflowAutomationConfig?.enableOvertimeAlerts ? "Enabled" : "Disabled"}
                    </Badge>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Auto-Assign by Specialty</Label>
                    <p className="text-sm text-gray-600">Match staff to shifts based on their specialties</p>
                  </div>
                  {isEditing ? (
                    <Switch
                      checked={editedFacility.workflowAutomationConfig?.autoAssignBySpecialty || false}
                      onCheckedChange={(checked) => handleFieldChange('workflowAutomationConfig', {
                        ...(editedFacility.workflowAutomationConfig || {}),
                        autoAssignBySpecialty: checked
                      })}
                    />
                  ) : (
                    <Badge variant={facility.workflowAutomationConfig?.autoAssignBySpecialty ? "default" : "secondary"}>
                      {facility.workflowAutomationConfig?.autoAssignBySpecialty ? "Enabled" : "Disabled"}
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="shifts">
          <Card>
            <CardHeader>
              <CardTitle>Shift Management Settings</CardTitle>
              <CardDescription>Configure shift rules and overtime policies</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Overtime Threshold (hours)</Label>
                  {isEditing ? (
                    <Input
                      type="number"
                      value={editedFacility.shiftManagementSettings?.overtimeThreshold || ''}
                      onChange={(e) => handleFieldChange('shiftManagementSettings', {
                        ...(editedFacility.shiftManagementSettings || {}),
                        overtimeThreshold: parseInt(e.target.value)
                      })}
                      placeholder="40"
                    />
                  ) : (
                    <p className="text-lg font-medium">{facility.shiftManagementSettings?.overtimeThreshold || 40} hours</p>
                  )}
                </div>
                <div>
                  <Label>Max Consecutive Shifts</Label>
                  {isEditing ? (
                    <Input
                      type="number"
                      value={editedFacility.shiftManagementSettings?.maxConsecutiveShifts || ''}
                      onChange={(e) => handleFieldChange('shiftManagementSettings', {
                        ...(editedFacility.shiftManagementSettings || {}),
                        maxConsecutiveShifts: parseInt(e.target.value)
                      })}
                      placeholder="5"
                    />
                  ) : (
                    <p className="text-lg font-medium">{facility.shiftManagementSettings?.maxConsecutiveShifts || 5} shifts</p>
                  )}
                </div>
                <div>
                  <Label>Min Hours Between Shifts</Label>
                  {isEditing ? (
                    <Input
                      type="number"
                      value={editedFacility.shiftManagementSettings?.minHoursBetweenShifts || ''}
                      onChange={(e) => handleFieldChange('shiftManagementSettings', {
                        ...(editedFacility.shiftManagementSettings || {}),
                        minHoursBetweenShifts: parseInt(e.target.value)
                      })}
                      placeholder="8"
                    />
                  ) : (
                    <p className="text-lg font-medium">{facility.shiftManagementSettings?.minHoursBetweenShifts || 8} hours</p>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Allow Back-to-Back Shifts</Label>
                    <p className="text-sm text-gray-600">Allow staff to work consecutive shifts without break</p>
                  </div>
                  {isEditing ? (
                    <Switch
                      checked={editedFacility.shiftManagementSettings?.allowBackToBackShifts || false}
                      onCheckedChange={(checked) => handleFieldChange('shiftManagementSettings', {
                        ...(editedFacility.shiftManagementSettings || {}),
                        allowBackToBackShifts: checked
                      })}
                    />
                  ) : (
                    <Badge variant={facility.shiftManagementSettings?.allowBackToBackShifts ? "default" : "secondary"}>
                      {facility.shiftManagementSettings?.allowBackToBackShifts ? "Allowed" : "Not Allowed"}
                    </Badge>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Require Manager Approval for Overtime</Label>
                    <p className="text-sm text-gray-600">Manager must approve shifts that result in overtime</p>
                  </div>
                  {isEditing ? (
                    <Switch
                      checked={editedFacility.shiftManagementSettings?.requireManagerApprovalForOvertime || false}
                      onCheckedChange={(checked) => handleFieldChange('shiftManagementSettings', {
                        ...(editedFacility.shiftManagementSettings || {}),
                        requireManagerApprovalForOvertime: checked
                      })}
                    />
                  ) : (
                    <Badge variant={facility.shiftManagementSettings?.requireManagerApprovalForOvertime ? "default" : "secondary"}>
                      {facility.shiftManagementSettings?.requireManagerApprovalForOvertime ? "Required" : "Not Required"}
                    </Badge>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Auto-Calculate Overtime</Label>
                    <p className="text-sm text-gray-600">Automatically calculate overtime based on threshold</p>
                  </div>
                  {isEditing ? (
                    <Switch
                      checked={editedFacility.shiftManagementSettings?.autoCalculateOvertime || false}
                      onCheckedChange={(checked) => handleFieldChange('shiftManagementSettings', {
                        ...(editedFacility.shiftManagementSettings || {}),
                        autoCalculateOvertime: checked
                      })}
                    />
                  ) : (
                    <Badge variant={facility.shiftManagementSettings?.autoCalculateOvertime ? "default" : "secondary"}>
                      {facility.shiftManagementSettings?.autoCalculateOvertime ? "Enabled" : "Disabled"}
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="staffing">
          <Card>
            <CardHeader>
              <CardTitle>Staffing Targets & Custom Rules</CardTitle>
              <CardDescription>Define staffing requirements and facility-specific rules</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Staffing Targets */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Staffing Targets by Shift</h3>
                <p className="text-sm text-gray-600 mb-4">Configure minimum staffing requirements for each shift type</p>
                {isEditing ? (
                  <Textarea
                    value={JSON.stringify(editedFacility.staffingTargets || {}, null, 2)}
                    onChange={(e) => {
                      try {
                        const parsed = JSON.parse(e.target.value);
                        handleFieldChange('staffingTargets', parsed);
                      } catch (err) {
                        // Invalid JSON, ignore
                      }
                    }}
                    rows={6}
                    placeholder='{\n  "dayShift": { "RN": 2, "CNA": 4 },\n  "nightShift": { "RN": 1, "CNA": 2 }\n}'
                  />
                ) : (
                  <pre className="bg-gray-50 p-3 rounded-md text-sm">
                    {JSON.stringify(facility.staffingTargets || {}, null, 2)}
                  </pre>
                )}
              </div>

              {/* Custom Rules */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Custom Rules</h3>
                <p className="text-sm text-gray-600 mb-4">Facility-specific rules for float pool, overtime, and attendance</p>
                {isEditing ? (
                  <Textarea
                    value={JSON.stringify(editedFacility.customRules || {}, null, 2)}
                    onChange={(e) => {
                      try {
                        const parsed = JSON.parse(e.target.value);
                        handleFieldChange('customRules', parsed);
                      } catch (err) {
                        // Invalid JSON, ignore
                      }
                    }}
                    rows={8}
                    placeholder='{\n  "floatPoolRules": {},\n  "overtimeRules": {},\n  "attendanceRules": {},\n  "requiredDocuments": ["BLS", "TB Test"]\n}'
                  />
                ) : (
                  <pre className="bg-gray-50 p-3 rounded-md text-sm">
                    {JSON.stringify(facility.customRules || {}, null, 2)}
                  </pre>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <PermissionGuard requiredPermissions={["manage_facility_settings"]}>
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