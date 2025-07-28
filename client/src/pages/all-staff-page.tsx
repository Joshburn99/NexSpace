import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  Search,
  Filter,
  MessageSquare,
  FileText,
  Building2,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  Award,
  MapPin,
  Clock,
  Plus,
  Edit,
} from "lucide-react";

interface Staff {
  id: number;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  phone?: string;
  profilePhoto?: string;
  bio?: string;
  specialty: string;
  department: string;
  employmentType: string;
  hourlyRate?: number;
  isActive: boolean;
  availabilityStatus?: string;
  licenseNumber?: string;
  licenseExpiry?: string;
  certifications?: string[];
  languages?: string[];
  location?: string;
  reliabilityScore?: number;
  userId?: number;
  createdAt?: string;
  updatedAt?: string;
}

export default function AllStaffPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSpecialty, setFilterSpecialty] = useState("all");
  const [filterDepartment, setFilterDepartment] = useState("all");
  const [filterEmploymentType, setFilterEmploymentType] = useState("all");
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch staff data
  const { data: staff = [], isLoading, error } = useQuery<Staff[]>({
    queryKey: ["/api/staff"],
    retry: 3,
  });

  // Get unique values for filters
  const specialties = [...new Set(staff.map(s => s.specialty))].sort();
  const departments = [...new Set(staff.map(s => s.department))].sort();
  const employmentTypes = [...new Set(staff.map(s => s.employmentType))].sort();

  // Filter staff based on search and filters
  const filteredStaff = staff.filter(staffMember => {
    const matchesSearch = searchTerm === "" || 
      staffMember.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      staffMember.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      staffMember.specialty.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSpecialty = filterSpecialty === "all" || staffMember.specialty === filterSpecialty;
    const matchesDepartment = filterDepartment === "all" || staffMember.department === filterDepartment;
    const matchesEmploymentType = filterEmploymentType === "all" || staffMember.employmentType === filterEmploymentType;
    
    return matchesSearch && matchesSpecialty && matchesDepartment && matchesEmploymentType;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available": return "bg-green-100 text-green-800";
      case "on_assignment": return "bg-blue-100 text-blue-800";
      case "unavailable": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getEmploymentTypeColor = (type: string) => {
    switch (type) {
      case "full_time": return "bg-blue-100 text-blue-800";
      case "part_time": return "bg-purple-100 text-purple-800";
      case "contract": return "bg-orange-100 text-orange-800";
      case "per_diem": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading staff directory...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <Users className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-red-900 mb-2">Failed to Load Staff</h3>
            <p className="text-red-600 mb-4">Unable to fetch staff directory. Please try again.</p>
            <Button onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/staff"] })}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">All Staff</h1>
          <p className="text-gray-600 mt-1">
            Manage all staff members ({filteredStaff.length} of {staff.length})
          </p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Add Staff Member
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Search & Filter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name, email, or specialty..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterSpecialty} onValueChange={setFilterSpecialty}>
              <SelectTrigger>
                <SelectValue placeholder="All Specialties" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Specialties</SelectItem>
                {specialties.map(specialty => (
                  <SelectItem key={specialty} value={specialty}>{specialty}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterDepartment} onValueChange={setFilterDepartment}>
              <SelectTrigger>
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map(department => (
                  <SelectItem key={department} value={department}>{department}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterEmploymentType} onValueChange={setFilterEmploymentType}>
              <SelectTrigger>
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Employment Types</SelectItem>
                {employmentTypes.map(type => (
                  <SelectItem key={type} value={type}>
                    {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Staff Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredStaff.map((staffMember) => (
          <Card key={staffMember.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={staffMember.profilePhoto} alt={staffMember.name} />
                  <AvatarFallback>
                    {staffMember.firstName?.[0]}{staffMember.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{staffMember.name}</h3>
                  <p className="text-sm text-gray-600 truncate">{staffMember.specialty}</p>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="h-4 w-4 text-gray-400" />
                  <span>{staffMember.department}</span>
                </div>
                {staffMember.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span className="truncate">{staffMember.email}</span>
                  </div>
                )}
                {staffMember.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span>{staffMember.phone}</span>
                  </div>
                )}
                {staffMember.hourlyRate && (
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="h-4 w-4 text-gray-400" />
                    <span>${staffMember.hourlyRate}/hr</span>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                <Badge className={getStatusColor(staffMember.availabilityStatus || "available")}>
                  {staffMember.availabilityStatus?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) || "Available"}
                </Badge>
                <Badge className={getEmploymentTypeColor(staffMember.employmentType)}>
                  {staffMember.employmentType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </Badge>
                {staffMember.reliabilityScore && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Award className="h-3 w-3" />
                    {staffMember.reliabilityScore}%
                  </Badge>
                )}
              </div>

              <div className="flex gap-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="flex-1">
                      <FileText className="h-4 w-4 mr-1" />
                      View
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Staff Profile: {staffMember.name}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-16 w-16">
                          <AvatarImage src={staffMember.profilePhoto} alt={staffMember.name} />
                          <AvatarFallback>
                            {staffMember.firstName?.[0]}{staffMember.lastName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="text-xl font-semibold">{staffMember.name}</h3>
                          <p className="text-gray-600">{staffMember.specialty} • {staffMember.department}</p>
                        </div>
                      </div>
                      
                      {staffMember.bio && (
                        <div>
                          <h4 className="font-medium mb-2">About</h4>
                          <p className="text-gray-600">{staffMember.bio}</p>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-medium mb-2">Contact Information</h4>
                          <div className="space-y-1 text-sm">
                            <p><strong>Email:</strong> {staffMember.email}</p>
                            {staffMember.phone && <p><strong>Phone:</strong> {staffMember.phone}</p>}
                            {staffMember.location && <p><strong>Location:</strong> {staffMember.location}</p>}
                          </div>
                        </div>
                        <div>
                          <h4 className="font-medium mb-2">Professional Details</h4>
                          <div className="space-y-1 text-sm">
                            <p><strong>Employment:</strong> {staffMember.employmentType.replace('_', ' ')}</p>
                            {staffMember.hourlyRate && <p><strong>Rate:</strong> ${staffMember.hourlyRate}/hr</p>}
                            {staffMember.licenseNumber && <p><strong>License:</strong> {staffMember.licenseNumber}</p>}
                            {staffMember.reliabilityScore && <p><strong>Reliability:</strong> {staffMember.reliabilityScore}%</p>}
                          </div>
                        </div>
                      </div>

                      {staffMember.certifications && staffMember.certifications.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-2">Certifications</h4>
                          <div className="flex flex-wrap gap-2">
                            {staffMember.certifications.map((cert, index) => (
                              <Badge key={index} variant="secondary">{cert}</Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {staffMember.languages && staffMember.languages.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-2">Languages</h4>
                          <div className="flex flex-wrap gap-2">
                            {staffMember.languages.map((lang, index) => (
                              <Badge key={index} variant="outline">{lang}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
                <Button variant="outline" size="sm">
                  <MessageSquare className="h-4 w-4 mr-1" />
                  Message
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredStaff.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Staff Found</h3>
            <p className="text-gray-600 mb-4">
              No staff members match your current search and filter criteria.
            </p>
            <Button 
              variant="outline" 
              onClick={() => {
                setSearchTerm("");
                setFilterSpecialty("all");
                setFilterDepartment("all");
                setFilterEmploymentType("all");
              }}
            >
              Clear Filters
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}