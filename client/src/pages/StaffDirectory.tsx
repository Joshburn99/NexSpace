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

interface StaffCardProps {
  staff: Staff;
}

function StaffCard({ staff }: StaffCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={staff.avatar} />
              <AvatarFallback>
                {staff.firstName[0]}{staff.lastName[0]}
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
            {staff.employmentType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
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
      </CardContent>
    </Card>
  );
}

interface StaffCredential {
  id: number;
  staffId: number;
  type: string;
  number: string;
  issuedBy: string;
  issuedDate: string;
  expiryDate: string;
  status: 'active' | 'expired' | 'pending';
  verified: boolean;
}

export default function StaffDirectory() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSpecialty, setFilterSpecialty] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [editingFacilityUser, setEditingFacilityUser] = useState<FacilityUser | null>(null);
  const { permissions, hasPermission } = useFacilityPermissions();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Separate queries for staff and facility users
  const { data: staff = [], isLoading: staffLoading } = useQuery<Staff[]>({
    queryKey: ['/api/staff'],
    enabled: hasPermission('view_staff'),
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
      member.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSpecialty = filterSpecialty === 'all' || member.specialty === filterSpecialty;
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'active' && member.isActive) ||
      (filterStatus === 'inactive' && !member.isActive);
    
    return matchesSearch && matchesSpecialty && matchesStatus;
  });

  const filteredFacilityUsers = facilityUsers.filter(user => {
    const matchesSearch = 
      user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'active' && user.isActive) ||
      (filterStatus === 'inactive' && !user.isActive);
    
    return matchesSearch && matchesStatus;
  });

  const specialties = [...new Set(staff.map(s => s.specialty))];

  // Check if user has permission to view staff directory
  if (!hasPermission('view_staff')) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Access Restricted
            </CardTitle>
            <CardDescription>
              You don't have permission to view the staff directory.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (staffLoading || facilityUsersLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading directory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Staff Directory</h1>
          <p className="text-muted-foreground">
            Manage healthcare staff and facility users
          </p>
        </div>
        
        <PermissionGuard requiredPermission="manage_staff">
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Staff Member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Staff Member</DialogTitle>
              </DialogHeader>
              <p className="text-muted-foreground">Staff creation form coming soon...</p>
            </DialogContent>
          </Dialog>
        </PermissionGuard>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search staff members and facility users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={filterSpecialty} onValueChange={setFilterSpecialty}>
          <SelectTrigger className="w-[180px]">
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
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabs for Staff vs Facility Users */}
      <Tabs defaultValue="all-staff" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="all-staff" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            All Staff ({staff.length})
          </TabsTrigger>
          <TabsTrigger value="facility-users" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Facility Users ({facilityUsers.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all-staff" className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Healthcare employees and contractors ({filteredStaff.length} shown)
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStaff.map((member) => (
              <StaffCard key={member.id} staff={member} />
            ))}
          </div>

          {filteredStaff.length === 0 && (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-semibold">No staff members found</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Try adjusting your search or filter criteria.
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="facility-users" className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Facility management users ({filteredFacilityUsers.length} shown)
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredFacilityUsers.map((user) => (
              <FacilityUserCard 
                key={user.id} 
                user={user} 
                onEdit={setEditingFacilityUser}
              />
            ))}
          </div>

          {filteredFacilityUsers.length === 0 && (
            <div className="text-center py-12">
              <Building2 className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-semibold">No facility users found</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Try adjusting your search or filter criteria.
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Facility User Edit Dialog */}
      <Dialog open={!!editingFacilityUser} onOpenChange={() => setEditingFacilityUser(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Facility User</DialogTitle>
          </DialogHeader>
          {editingFacilityUser && (
            <FacilityUserEditForm 
              user={editingFacilityUser}
              onSave={(userData) => updateFacilityUser.mutate(userData)}
              onCancel={() => setEditingFacilityUser(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
