import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Plus, Edit, UserMinus, UserPlus, Shield, Clock, Mail, Phone, MapPin, Calendar } from 'lucide-react';
import { useFacilityPermissions } from '@/hooks/use-facility-permissions';
import { PermissionGuard } from '@/components/PermissionGuard';

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
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedSpecialty, setSelectedSpecialty] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);

  const { hasPermission } = useFacilityPermissions();

  // Fetch staff data
  const { data: staff = [], isLoading } = useQuery({
    queryKey: ['/api/staff'],
    enabled: hasPermission('view_staff'),
  });

  // Fetch credentials data
  const { data: credentials = [] } = useQuery({
    queryKey: ['/api/staff/credentials'],
    enabled: hasPermission('view_staff_credentials'),
  });

  // Filter staff based on search and filters
  const filteredStaff = staff.filter((member: Staff) => {
    const matchesSearch = `${member.firstName} ${member.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = selectedDepartment === 'all' || member.department === selectedDepartment;
    const matchesSpecialty = selectedSpecialty === 'all' || member.specialty === selectedSpecialty;
    const matchesStatus = selectedStatus === 'all' || 
                         (selectedStatus === 'active' && member.isActive) ||
                         (selectedStatus === 'inactive' && !member.isActive);
    
    return matchesSearch && matchesDepartment && matchesSpecialty && matchesStatus;
  });

  // Get unique departments and specialties for filters
  const departments = [...new Set(staff.map((member: Staff) => member.department))];
  const specialties = [...new Set(staff.map((member: Staff) => member.specialty))];

  // Check if user has permission to view staff directory at all
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading staff directory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff Directory</h1>
          <p className="text-gray-600">Manage your facility's workforce</p>
        </div>
        <div className="flex items-center gap-3">
          <PermissionGuard requiredPermissions={['view_staff_credentials']}>
            <Button
              variant="outline"
              onClick={() => setShowCredentials(true)}
              className="flex items-center gap-2"
            >
              <Shield className="h-4 w-4" />
              Credentials
            </Button>
          </PermissionGuard>
          <PermissionGuard requiredPermissions={['create_staff']}>
            <Button
              onClick={() => setShowAddStaff(true)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Staff
            </Button>
          </PermissionGuard>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Search & Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search staff..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger>
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedSpecialty} onValueChange={setSelectedSpecialty}>
              <SelectTrigger>
                <SelectValue placeholder="Specialty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Specialties</SelectItem>
                {specialties.map((spec) => (
                  <SelectItem key={spec} value={spec}>{spec}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              onClick={() => {
                setSearchTerm('');
                setSelectedDepartment('all');
                setSelectedSpecialty('all');
                setSelectedStatus('all');
              }}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Staff Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredStaff.map((member: Staff) => (
          <Card key={member.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={member.avatar} />
                    <AvatarFallback>
                      {member.firstName.charAt(0)}{member.lastName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg">
                      {member.firstName} {member.lastName}
                    </CardTitle>
                    <CardDescription>{member.specialty}</CardDescription>
                  </div>
                </div>
                <Badge variant={member.isActive ? "default" : "secondary"}>
                  {member.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail className="h-4 w-4" />
                  {member.email}
                </div>
                {member.phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="h-4 w-4" />
                    {member.phone}
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="h-4 w-4" />
                  {member.department}
                </div>
                {member.lastShift && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="h-4 w-4" />
                    Last shift: {new Date(member.lastShift).toLocaleDateString()}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedStaff(member)}
                  className="flex-1"
                >
                  View Profile
                </Button>
                <PermissionGuard requiredPermissions={['edit_staff']}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-1"
                  >
                    <Edit className="h-3 w-3" />
                    Edit
                  </Button>
                </PermissionGuard>
                <PermissionGuard requiredPermissions={['deactivate_staff']}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-1"
                  >
                    {member.isActive ? (
                      <UserMinus className="h-3 w-3" />
                    ) : (
                      <UserPlus className="h-3 w-3" />
                    )}
                  </Button>
                </PermissionGuard>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredStaff.length === 0 && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Search className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No staff found</h3>
              <p className="text-gray-600">Try adjusting your search or filters</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Staff Profile Modal */}
      <Dialog open={!!selectedStaff} onOpenChange={() => setSelectedStaff(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Staff Profile</DialogTitle>
          </DialogHeader>
          {selectedStaff && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={selectedStaff.avatar} />
                  <AvatarFallback className="text-lg">
                    {selectedStaff.firstName.charAt(0)}{selectedStaff.lastName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-xl font-bold">
                    {selectedStaff.firstName} {selectedStaff.lastName}
                  </h2>
                  <p className="text-gray-600">{selectedStaff.specialty}</p>
                  <Badge variant={selectedStaff.isActive ? "default" : "secondary"}>
                    {selectedStaff.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>

              <Tabs defaultValue="details" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="credentials">Credentials</TabsTrigger>
                  <TabsTrigger value="schedule">Schedule</TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Email</label>
                      <p className="text-sm text-gray-900">{selectedStaff.email}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Phone</label>
                      <p className="text-sm text-gray-900">{selectedStaff.phone || 'Not provided'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Department</label>
                      <p className="text-sm text-gray-900">{selectedStaff.department}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Employment Type</label>
                      <p className="text-sm text-gray-900">{selectedStaff.employmentType}</p>
                    </div>
                    {selectedStaff.hireDate && (
                      <div>
                        <label className="text-sm font-medium text-gray-700">Hire Date</label>
                        <p className="text-sm text-gray-900">
                          {new Date(selectedStaff.hireDate).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="credentials">
                  <PermissionGuard
                    requiredPermissions={['view_staff_credentials']}
                    fallback={
                      <div className="text-center py-8">
                        <Shield className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                        <p className="text-gray-600">You don't have permission to view credentials</p>
                      </div>
                    }
                  >
                    <div className="space-y-4">
                      {credentials
                        .filter((cred: StaffCredential) => cred.staffId === selectedStaff.id)
                        .map((credential: StaffCredential) => (
                          <div key={credential.id} className="border rounded-lg p-4">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium">{credential.type}</h4>
                              <Badge variant={credential.status === 'active' ? 'default' : 'destructive'}>
                                {credential.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                              {credential.number} • Issued by {credential.issuedBy}
                            </p>
                            <p className="text-sm text-gray-600">
                              Expires: {new Date(credential.expiryDate).toLocaleDateString()}
                            </p>
                          </div>
                        ))}
                    </div>
                  </PermissionGuard>
                </TabsContent>

                <TabsContent value="schedule">
                  <div className="text-center py-8">
                    <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-gray-600">Schedule information coming soon</p>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Staff Modal */}
      <Dialog open={showAddStaff} onOpenChange={setShowAddStaff}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Staff Member</DialogTitle>
          </DialogHeader>
          <div className="text-center py-8">
            <Plus className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-600">Add staff functionality coming soon</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Credentials Modal */}
      <Dialog open={showCredentials} onOpenChange={setShowCredentials}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Staff Credentials Overview</DialogTitle>
          </DialogHeader>
          <div className="text-center py-8">
            <Shield className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-600">Credentials management coming soon</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}