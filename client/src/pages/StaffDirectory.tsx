import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Plus, Edit, UserMinus, UserPlus, Shield, Clock, Mail, Phone, MapPin, Calendar, Users, Building2 } from 'lucide-react';
import { useFacilityPermissions } from '@/hooks/use-facility-permissions';
import { PermissionGuard } from '@/components/PermissionGuard';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { FacilityUserCard } from '@/components/FacilityUserCard';
import { FacilityUserEditForm } from '@/components/FacilityUserEditForm';
import { StaffFacilityAssociationDialog } from '@/components/StaffFacilityAssociationDialog';

interface Staff {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  specialty: string;
  employmentType: string;
  isActive: boolean;
  department: string;
  hireDate?: string;
  lastShift?: string;
  certifications?: string[];
  licenseExpiry?: string;
  avatar?: string;
  associatedFacilities?: number[];
}

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

interface Facility {
  id: number;
  name: string;
  type: string;
  address?: string;
  city?: string;
  state?: string;
}

interface StaffCardProps {
  staff: Staff;
  facilities: Facility[];
}

function StaffCard({ staff, facilities }: StaffCardProps) {
  const { hasPermission } = useFacilityPermissions();
  const [showFacilityDialog, setShowFacilityDialog] = useState(false);

  const associatedFacilities = staff.associatedFacilities || [];

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={staff.avatar} />
              <AvatarFallback>
                {staff.firstName?.[0] || ''}{staff.lastName?.[0] || ''}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg">
                {staff.firstName} {staff.lastName}
              </CardTitle>
              <CardDescription className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {staff.specialty} - {staff.department}
              </CardDescription>
            </div>
          </div>
          <Badge 
            variant={staff.isActive ? "default" : "secondary"}
            className={staff.isActive ? "bg-green-100 text-green-800" : ""}
          >
            {staff.isActive ? "Active" : "Inactive"}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <div className="space-y-2 text-sm">
          <div className="flex items-center text-gray-600">
            <Mail className="h-4 w-4 mr-2 text-gray-400" />
            {staff.email}
          </div>
          
          {staff.phone && (
            <div className="flex items-center text-gray-600">
              <Phone className="h-4 w-4 mr-2 text-gray-400" />
              {staff.phone}
            </div>
          )}
          
          <div className="flex items-center text-gray-600">
            <Calendar className="h-4 w-4 mr-2 text-gray-400" />
            {staff.employmentType?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Unknown'}
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <Badge variant="outline">
            {staff.specialty}
          </Badge>
          <Badge variant="outline">
            {staff.department}
          </Badge>
        </div>

        {/* Facility Associations */}
        <div className="space-y-2 pt-3 border-t">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-gray-400" />
              <span className="text-sm font-medium">Facility Associations</span>
            </div>
            {hasPermission('edit_staff' as any) && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowFacilityDialog(true)}
                className="h-7 px-2 text-xs"
              >
                <Plus className="h-3 w-3 mr-1" />
                Manage
              </Button>
            )}
          </div>
          
          {associatedFacilities.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {associatedFacilities.map(facilityId => {
                const facility = facilities.find(f => f.id === facilityId);
                if (!facility) return null;
                return (
                  <Badge key={facilityId} variant="secondary" className="text-xs">
                    {facility.name}
                  </Badge>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-gray-500">No facility associations</p>
          )}
        </div>

        {/* Credentials Section */}
        <PermissionGuard requiredPermissions={['view_staff_credentials' as any]}>
          <div className="flex items-center gap-2 pt-3 border-t">
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="w-full">
                  <Shield className="h-4 w-4 mr-2" />
                  View Credentials
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Staff Credentials - {staff.firstName} {staff.lastName}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  {staff.certifications && staff.certifications.length > 0 ? (
                    <div className="space-y-3">
                      {staff.certifications.map((cert, idx) => (
                        <div key={idx} className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <p className="font-medium">{cert}</p>
                            <p className="text-sm text-gray-600">Active</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="default">Valid</Badge>
                            {hasPermission('edit_staff_credentials' as any) && (
                              <Button size="sm" variant="ghost">
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                      {staff.licenseExpiry && (
                        <div className="flex items-center justify-between p-4 border rounded-lg bg-blue-50">
                          <div>
                            <p className="font-medium">{staff.specialty} License</p>
                            <p className="text-sm text-gray-600">
                              Expires: {new Date(staff.licenseExpiry).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="default">Valid</Badge>
                            {hasPermission('edit_staff_credentials' as any) && (
                              <Button size="sm" variant="ghost">
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-center text-gray-500 py-8">No credentials on file</p>
                  )}
                  {hasPermission('upload_documents' as any) && (
                    <Button className="w-full mt-4">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Credential
                    </Button>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </PermissionGuard>
      </CardContent>
      
      {/* Facility Association Dialog */}
      <StaffFacilityAssociationDialog
        isOpen={showFacilityDialog}
        onClose={() => setShowFacilityDialog(false)}
        staff={staff}
        facilities={facilities}
      />
    </Card>
  );
}

export default function StaffDirectory() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSpecialty, setFilterSpecialty] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [editingFacilityUser, setEditingFacilityUser] = useState<FacilityUser | null>(null);
  const { hasPermission } = useFacilityPermissions();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch facilities
  const { data: facilities = [], isLoading: facilitiesLoading } = useQuery<Facility[]>({
    queryKey: ['/api/facilities'],
  });

  // Separate queries for staff and facility users
  const { data: staff = [], isLoading: staffLoading, error: staffError } = useQuery<Staff[]>({
    queryKey: ['/api/staff'],
    enabled: hasPermission('view_staff' as any),
  });

  const { data: facilityUsers = [], isLoading: facilityUsersLoading } = useQuery<FacilityUser[]>({
    queryKey: ['/api/facility-users'],
  });

  // Update facility user mutation
  const updateFacilityUser = useMutation({
    mutationFn: async (userData: Partial<FacilityUser>) => {
      return apiRequest('PATCH', `/api/facility-users/${userData.id}`, userData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/facility-users'] });
      setEditingFacilityUser(null);
      toast({
        title: "Success",
        description: "Facility user updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update facility user",
        variant: "destructive",
      });
    },
  });

  // Filter functions
  const filteredStaff = staff.filter(member => {
    const matchesSearch = 
      member.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSpecialty = filterSpecialty === 'all' || member.specialty === filterSpecialty;
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'active' && member.isActive) ||
      (filterStatus === 'inactive' && !member.isActive);

    return matchesSearch && matchesSpecialty && matchesStatus;
  });

  const filteredFacilityUsers = facilityUsers.filter(user => {
    const matchesSearch = 
      user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'active' && user.isActive) ||
      (filterStatus === 'inactive' && !user.isActive);

    return matchesSearch && matchesStatus;
  });

  const specialties = [...new Set(staff.map(s => s.specialty).filter(Boolean))];

  // Check if user has permission to view staff directory
  if (!hasPermission('view_staff' as any)) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Access Restricted</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-gray-600">
              You don't have permission to view the staff directory.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (staffLoading || facilitiesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2">Loading staff directory...</p>
        </div>
      </div>
    );
  }

  if (staffError) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-red-600">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-gray-600">
              Failed to load staff directory. Please try again.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Staff Directory</h1>
        <p className="text-gray-600">Manage your healthcare staff and facility associations</p>
      </div>

      <Tabs defaultValue="staff" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="staff">Staff Members</TabsTrigger>
          <TabsTrigger value="facility-users">Facility Users</TabsTrigger>
        </TabsList>

        <TabsContent value="staff" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Filter Staff</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search staff..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={filterSpecialty} onValueChange={setFilterSpecialty}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Filter by specialty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Specialties</SelectItem>
                    {specialties.map(specialty => (
                      <SelectItem key={specialty} value={specialty}>
                        {specialty}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-full sm:w-32">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Staff Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStaff.length > 0 ? (
              filteredStaff.map((member) => (
                <StaffCard key={member.id} staff={member} facilities={facilities} />
              ))
            ) : (
              <div className="col-span-full text-center py-8">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No staff members found matching your criteria</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="facility-users" className="space-y-6">
          {/* Facility Users Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Filter Facility Users</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search facility users..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-full sm:w-32">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Facility Users Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredFacilityUsers.length > 0 ? (
              filteredFacilityUsers.map((user) => (
                <FacilityUserCard 
                  key={user.id} 
                  user={user} 
                  onEdit={setEditingFacilityUser}
                  facilities={facilities}
                />
              ))
            ) : (
              <div className="col-span-full text-center py-8">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No facility users found matching your criteria</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Facility User Dialog */}
      {editingFacilityUser && (
        <Dialog open={!!editingFacilityUser} onOpenChange={() => setEditingFacilityUser(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Facility User</DialogTitle>
            </DialogHeader>
            <FacilityUserEditForm
              user={editingFacilityUser}
              onSubmit={(data) => updateFacilityUser.mutate(data)}
              onCancel={() => setEditingFacilityUser(null)}
              isLoading={updateFacilityUser.isPending}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}