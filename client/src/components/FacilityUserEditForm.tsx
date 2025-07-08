import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface FacilityUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: string;
  specialty?: string;
  associatedFacilities: number[];
  avatar?: string;
  facilityId?: number;
  isActive: boolean;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface FacilityUserEditFormProps {
  user: FacilityUser;
  onSave: (userData: Partial<FacilityUser>) => void;
  onCancel: () => void;
}

export function FacilityUserEditForm({ user, onSave, onCancel }: FacilityUserEditFormProps) {
  const [formData, setFormData] = useState({
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
    specialty: user.specialty || '',
    isActive: user.isActive,
    facilityId: user.facilityId || ''
  });

  const roleOptions = [
    { value: 'facility_administrator', label: 'Facility Administrator' },
    { value: 'scheduling_coordinator', label: 'Scheduling Coordinator' },
    { value: 'hr_manager', label: 'HR Manager' },
    { value: 'billing', label: 'Billing' },
    { value: 'supervisor', label: 'Supervisor' },
    { value: 'director_of_nursing', label: 'Director of Nursing' },
    { value: 'viewer', label: 'Viewer' },
    { value: 'corporate', label: 'Corporate' },
    { value: 'regional_director', label: 'Regional Director' }
  ];

  const facilityOptions = [
    { value: 1, label: 'General Hospital' },
    { value: 2, label: 'Sunset Nursing Home' },
    { value: 3, label: 'Care Medical Center' }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: user.id,
      ...formData,
      facilityId: formData.facilityId ? parseInt(formData.facilityId as string) : undefined
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>
            Edit the user's basic profile information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                required
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              required
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Role & Permissions</CardTitle>
          <CardDescription>
            Configure the user's role and access level
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select value={formData.role} onValueChange={(value) => setFormData(prev => ({ ...prev, role: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {roleOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="specialty">Specialty (Optional)</Label>
            <Input
              id="specialty"
              value={formData.specialty}
              onChange={(e) => setFormData(prev => ({ ...prev, specialty: e.target.value }))}
              placeholder="e.g., RN, LPN, CNA"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="facility">Primary Facility</Label>
            <Select 
              value={formData.facilityId?.toString() || 'none'} 
              onValueChange={(value) => setFormData(prev => ({ 
                ...prev, 
                facilityId: value === 'none' ? '' : value 
              }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select facility" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Primary Facility</SelectItem>
                {facilityOptions.map(option => (
                  <SelectItem key={option.value} value={option.value.toString()}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account Status</CardTitle>
          <CardDescription>
            Manage the user's account activation status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="isActive">Account Active</Label>
              <p className="text-sm text-muted-foreground">
                Inactive users cannot log in to the system
              </p>
            </div>
            <Switch
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current Facility Associations</CardTitle>
          <CardDescription>
            Facilities this user has access to
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {user.associatedFacilities.length > 0 ? (
              user.associatedFacilities.map((facilityId) => {
                const facility = facilityOptions.find(f => f.value === facilityId);
                return (
                  <Badge key={facilityId} variant="outline">
                    {facility?.label || `Facility ${facilityId}`}
                  </Badge>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground">
                No facility associations configured
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Separator />

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          Save Changes
        </Button>
      </div>
    </form>
  );
}