import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Plus, Edit, UserMinus, UserPlus, Shield, Clock, Mail, Phone, MapPin, Calendar, Users, Building2, MessageSquare, Star } from 'lucide-react';
import { useFacilityPermissions } from '@/hooks/use-facility-permissions';
import { PermissionGuard } from '@/components/PermissionGuard';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { FacilityUserCard } from '@/components/FacilityUserCard';
import { FacilityUserEditForm } from '@/components/FacilityUserEditForm';
import { StaffFacilityAssociationDialog } from '@/components/StaffFacilityAssociationDialog';

interface Staff {
  id: number;
  name: string;
  email: string;
  phone?: string;
  specialty: string;
  employmentType: string;
  isActive: boolean;
  department: string;
  location?: string;
  reliabilityScore?: number;
  hourlyRate?: number;
  profilePhoto?: string;
  bio?: string;
  certifications?: string[];
  totalWorkedShifts?: number;
  associatedFacilities?: number[];
  
  // Additional profile fields for the second screenshot
  experience?: string;
  rating?: number;
  totalShifts?: number;
  languages?: string[];
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
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const { hasPermission } = useFacilityPermissions();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

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
      member.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSpecialty = filterSpecialty === 'all' || member.specialty === filterSpecialty;
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'active' && member.isActive) ||
      (filterStatus === 'inactive' && !member.isActive);

    return matchesSearch && matchesSpecialty && matchesStatus;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredStaff.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedStaff = filteredStaff.slice(startIndex, endIndex);

  // Employment type colors
  const getEmploymentTypeColor = (type: string) => {
    switch (type) {
      case 'full_time':
        return 'bg-green-100 text-green-800';
      case 'part_time':
        return 'bg-blue-100 text-blue-800';
      case 'contract':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Format employment type for display
  const formatEmploymentType = (type: string) => {
    switch (type) {
      case 'full_time':
        return 'Full-time';
      case 'part_time':
        return 'Part-time';
      case 'contract':
        return 'Contract';
      default:
        return type;
    }
  };

  // Handle message button click
  const handleMessageClick = (staffMember: Staff) => {
    // Navigate to messages page with staff member preselected
    navigate(`/messages?recipient=${staffMember.id}&name=${encodeURIComponent(staffMember.name)}`);
  };

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

          {/* Staff List */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Staff Members ({filteredStaff.length})</CardTitle>
                <Select value={itemsPerPage.toString()} onValueChange={(value) => {
                  setItemsPerPage(Number(value));
                  setCurrentPage(1);
                }}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="25">25 per page</SelectItem>
                    <SelectItem value="50">50 per page</SelectItem>
                    <SelectItem value="100">100 per page</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {paginatedStaff.length > 0 ? (
                <div className="space-y-4">
                  {paginatedStaff.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-center space-x-4">
                        {/* Avatar */}
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={member.profilePhoto} />
                          <AvatarFallback>
                            {member.name?.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        
                        {/* Name and Specialty */}
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h3 className="font-semibold text-lg">{member.name}</h3>
                          </div>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className="text-sm text-gray-600">{member.specialty}</span>
                            <span className="text-gray-400">•</span>
                            <span className="text-sm text-gray-600">{member.department}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Location */}
                      <div className="hidden md:flex items-center space-x-2">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600">{member.location || 'Portland, OR'}</span>
                      </div>
                      
                      {/* Employment Type Badge */}
                      <div className="flex items-center space-x-2">
                        <Badge className={getEmploymentTypeColor(member.employmentType)}>
                          {formatEmploymentType(member.employmentType)}
                        </Badge>
                      </div>
                      
                      {/* Reliability Score */}
                      <div className="flex items-center space-x-2">
                        <Badge variant="secondary" className="bg-gray-100 text-gray-800">
                          <Star className="h-3 w-3 mr-1" />
                          {member.reliabilityScore ? `${member.reliabilityScore}/5` : '4.8/5'}
                        </Badge>
                      </div>
                      
                      {/* Actions */}
                      <div className="flex items-center space-x-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleMessageClick(member)}
                          className="flex items-center space-x-1"
                        >
                          <MessageSquare className="h-4 w-4" />
                          <span>Message</span>
                        </Button>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="ghost">
                              <Users className="h-4 w-4" />
                              <span className="ml-1">View Profile</span>
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl">
                            <DialogHeader>
                              <DialogTitle className="flex items-center space-x-4">
                                <Avatar className="h-16 w-16">
                                  <AvatarImage src={member.profilePhoto} />
                                  <AvatarFallback>
                                    {member.name?.split(' ').map(n => n[0]).join('')}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <h2 className="text-2xl font-bold">{member.name}</h2>
                                  <p className="text-gray-600">{member.specialty}</p>
                                </div>
                                <Button size="sm" variant="outline" className="ml-auto">
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </Button>
                              </DialogTitle>
                            </DialogHeader>
                            
                            <div className="mt-6">
                              <Tabs defaultValue="overview" className="w-full">
                                <TabsList className="grid w-full grid-cols-5">
                                  <TabsTrigger value="overview">Overview</TabsTrigger>
                                  <TabsTrigger value="experience">Experience</TabsTrigger>
                                  <TabsTrigger value="documents">Documents</TabsTrigger>
                                  <TabsTrigger value="activity">Activity</TabsTrigger>
                                  <TabsTrigger value="settings">Settings</TabsTrigger>
                                </TabsList>
                                
                                <TabsContent value="overview" className="space-y-6">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Contact Information */}
                                    <div className="space-y-4">
                                      <h3 className="font-semibold text-lg">Contact Information</h3>
                                      <div className="space-y-3">
                                        <div className="flex items-center space-x-3">
                                          <Mail className="h-4 w-4 text-gray-400" />
                                          <span>{member.email}</span>
                                        </div>
                                        <div className="flex items-center space-x-3">
                                          <Phone className="h-4 w-4 text-gray-400" />
                                          <span>{member.phone || '(555) 123-4567'}</span>
                                        </div>
                                        <div className="flex items-center space-x-3">
                                          <MapPin className="h-4 w-4 text-gray-400" />
                                          <span>{member.location || 'Portland, OR'}</span>
                                        </div>
                                      </div>
                                    </div>
                                    
                                    {/* Bio */}
                                    <div className="space-y-4">
                                      <h3 className="font-semibold text-lg">Bio</h3>
                                      <p className="text-gray-600">
                                        {member.bio || `Experienced ${member.specialty} with expertise in patient care.`}
                                      </p>
                                      <div className="space-y-2">
                                        <h4 className="font-medium">Links</h4>
                                        <div className="text-sm text-gray-500">No links available</div>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {/* Professional Details */}
                                  <div className="space-y-4">
                                    <h3 className="font-semibold text-lg">Professional Details</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                      <div>
                                        <label className="text-sm font-medium text-gray-500">Experience:</label>
                                        <p className="text-lg">{member.experience || '8 years'}</p>
                                      </div>
                                      <div>
                                        <label className="text-sm font-medium text-gray-500">Hourly Rate:</label>
                                        <p className="text-lg">${member.hourlyRate || '42'}/hour</p>
                                      </div>
                                      <div>
                                        <label className="text-sm font-medium text-gray-500">Rating:</label>
                                        <div className="flex items-center space-x-1">
                                          <Star className="h-4 w-4 text-yellow-400" />
                                          <span className="text-lg">{member.rating || member.reliabilityScore || '4.8'}/5</span>
                                        </div>
                                      </div>
                                      <div>
                                        <label className="text-sm font-medium text-gray-500">Total Shifts:</label>
                                        <p className="text-lg">{member.totalShifts || member.totalWorkedShifts || '156'}</p>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {/* Certifications */}
                                  <div className="space-y-4">
                                    <h3 className="font-semibold text-lg">Certifications</h3>
                                    <div className="flex flex-wrap gap-2">
                                      {member.certifications?.length ? (
                                        member.certifications.map((cert, idx) => (
                                          <Badge key={idx} variant="outline" className="px-3 py-1">
                                            <Shield className="h-3 w-3 mr-1" />
                                            {cert}
                                          </Badge>
                                        ))
                                      ) : (
                                        <>
                                          <Badge variant="outline" className="px-3 py-1">
                                            <Shield className="h-3 w-3 mr-1" />
                                            LPN
                                          </Badge>
                                          <Badge variant="outline" className="px-3 py-1">
                                            <Shield className="h-3 w-3 mr-1" />
                                            BLS
                                          </Badge>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                  
                                  {/* Skills */}
                                  <div className="space-y-4">
                                    <h3 className="font-semibold text-lg">Skills</h3>
                                    <div className="text-gray-600">
                                      Skills information not available
                                    </div>
                                  </div>
                                </TabsContent>
                                
                                <TabsContent value="experience" className="space-y-6">
                                  <div className="text-center text-gray-500 py-8">
                                    Experience details coming soon
                                  </div>
                                </TabsContent>
                                
                                <TabsContent value="documents" className="space-y-6">
                                  <div className="text-center text-gray-500 py-8">
                                    Document management coming soon
                                  </div>
                                </TabsContent>
                                
                                <TabsContent value="activity" className="space-y-6">
                                  <div className="text-center text-gray-500 py-8">
                                    Activity history coming soon
                                  </div>
                                </TabsContent>
                                
                                <TabsContent value="settings" className="space-y-6">
                                  <div className="text-center text-gray-500 py-8">
                                    Settings coming soon
                                  </div>
                                </TabsContent>
                              </Tabs>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No staff members found matching your criteria</p>
                </div>
              )}
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t">
                  <div className="text-sm text-gray-600">
                    Showing {startIndex + 1} to {Math.min(endIndex, filteredStaff.length)} of {filteredStaff.length} results
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-gray-600">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
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