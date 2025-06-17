import { useState } from "react";
import { Users, Phone, Mail, MapPin, Calendar, Badge as BadgeIcon, Search, Filter } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { SidebarNav } from "@/components/ui/sidebar-nav";

const mockStaff = [
  {
    id: 1,
    firstName: "Sarah",
    lastName: "Johnson",
    role: "Registered Nurse",
    email: "sarah.johnson@nexspace.com",
    phone: "(555) 123-4567",
    status: "active",
    facility: "Sunrise Senior Living",
    department: "Medical",
    hireDate: "2023-01-15",
    lastShift: "2025-06-17",
    certifications: ["RN License", "CPR", "BLS"],
    hourlyRate: 45,
    hoursWorked: 1824,
    avatar: null
  },
  {
    id: 2,
    firstName: "Michael",
    lastName: "Chen",
    role: "Licensed Practical Nurse",
    email: "michael.chen@nexspace.com",
    phone: "(555) 234-5678",
    status: "active",
    facility: "Golden Years Care Center",
    department: "Memory Care",
    hireDate: "2023-03-22",
    lastShift: "2025-06-16",
    certifications: ["LPN License", "Memory Care Cert"],
    hourlyRate: 32,
    hoursWorked: 1456,
    avatar: null
  },
  {
    id: 3,
    firstName: "Emily",
    lastName: "Rodriguez",
    role: "Certified Nursing Assistant",
    email: "emily.rodriguez@nexspace.com",
    phone: "(555) 345-6789",
    status: "active",
    facility: "Harmony Health Center",
    department: "Assisted Living",
    hireDate: "2023-05-10",
    lastShift: "2025-06-17",
    certifications: ["CNA License", "Medication Admin"],
    hourlyRate: 22,
    hoursWorked: 1632,
    avatar: null
  },
  {
    id: 4,
    firstName: "David",
    lastName: "Thompson",
    role: "Physical Therapist",
    email: "david.thompson@nexspace.com",
    phone: "(555) 456-7890",
    status: "on_leave",
    facility: "Rehabilitation Center East",
    department: "Rehabilitation",
    hireDate: "2022-11-08",
    lastShift: "2025-06-10",
    certifications: ["PT License", "Geriatric Specialist"],
    hourlyRate: 55,
    hoursWorked: 2104,
    avatar: null
  },
  {
    id: 5,
    firstName: "Lisa",
    lastName: "Williams",
    role: "Registered Nurse",
    email: "lisa.williams@nexspace.com",
    phone: "(555) 567-8901",
    status: "inactive",
    facility: "Sunrise Senior Living",
    department: "ICU",
    hireDate: "2022-08-14",
    lastShift: "2025-05-28",
    certifications: ["RN License", "ACLS", "Critical Care"],
    hourlyRate: 48,
    hoursWorked: 2856,
    avatar: null
  }
];

export default function StaffPage() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-800";
      case "on_leave": return "bg-yellow-100 text-yellow-800";
      case "inactive": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active": return "Active";
      case "on_leave": return "On Leave";
      case "inactive": return "Inactive";
      default: return status;
    }
  };

  const filteredStaff = mockStaff.filter(staff => {
    const matchesSearch = searchTerm === "" || 
      `${staff.firstName} ${staff.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      staff.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      staff.role.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || staff.status === statusFilter;
    const matchesRole = roleFilter === "all" || staff.role === roleFilter;
    
    return matchesSearch && matchesStatus && matchesRole;
  });

  const uniqueRoles = Array.from(new Set(mockStaff.map(staff => staff.role)));

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <SidebarNav user={user!} />
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Staff Management</h1>
              <p className="text-gray-600 dark:text-gray-300">Manage all staff members and their information</p>
            </div>
            <Button>Add New Staff</Button>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-64">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search staff by name, email, or role..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="on_leave">On Leave</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    {uniqueRoles.map(role => (
                      <SelectItem key={role} value={role}>{role}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Staff Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Staff</p>
                    <p className="text-2xl font-bold">{mockStaff.length}</p>
                  </div>
                  <Users className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Active</p>
                    <p className="text-2xl font-bold text-green-600">
                      {mockStaff.filter(s => s.status === 'active').length}
                    </p>
                  </div>
                  <BadgeIcon className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">On Leave</p>
                    <p className="text-2xl font-bold text-yellow-600">
                      {mockStaff.filter(s => s.status === 'on_leave').length}
                    </p>
                  </div>
                  <Calendar className="w-8 h-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Avg Hours</p>
                    <p className="text-2xl font-bold">
                      {Math.round(mockStaff.reduce((acc, s) => acc + s.hoursWorked, 0) / mockStaff.length)}
                    </p>
                  </div>
                  <Users className="w-8 h-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Staff List */}
          <div className="grid grid-cols-1 gap-4">
            {filteredStaff.map((staff) => (
              <Card key={staff.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={staff.avatar || undefined} />
                        <AvatarFallback>
                          {staff.firstName[0]}{staff.lastName[0]}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <h3 className="font-semibold text-lg">
                            {staff.firstName} {staff.lastName}
                          </h3>
                          <p className="text-gray-600 dark:text-gray-300">{staff.role}</p>
                          <Badge className={getStatusColor(staff.status)}>
                            {getStatusLabel(staff.status)}
                          </Badge>
                        </div>
                        
                        <div className="space-y-1">
                          <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                            <Mail className="w-4 h-4 mr-2" />
                            {staff.email}
                          </div>
                          <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                            <Phone className="w-4 h-4 mr-2" />
                            {staff.phone}
                          </div>
                          <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                            <MapPin className="w-4 h-4 mr-2" />
                            {staff.facility}
                          </div>
                        </div>
                        
                        <div className="space-y-1">
                          <div className="text-sm">
                            <span className="font-medium">Department:</span> {staff.department}
                          </div>
                          <div className="text-sm">
                            <span className="font-medium">Hire Date:</span> {new Date(staff.hireDate).toLocaleDateString()}
                          </div>
                          <div className="text-sm">
                            <span className="font-medium">Hours Worked:</span> {staff.hoursWorked.toLocaleString()}
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="text-sm">
                            <span className="font-medium">Rate:</span> ${staff.hourlyRate}/hr
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {staff.certifications.slice(0, 2).map((cert, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {cert}
                              </Badge>
                            ))}
                            {staff.certifications.length > 2 && (
                              <Badge variant="secondary" className="text-xs">
                                +{staff.certifications.length - 2} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 ml-4">
                      <Button variant="outline" size="sm">View</Button>
                      <Button variant="outline" size="sm">Edit</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredStaff.length === 0 && (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No staff found
              </h3>
              <p className="text-gray-500">
                Try adjusting your search criteria or filters
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}