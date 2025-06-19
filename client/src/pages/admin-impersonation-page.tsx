import { useState } from "react";
import { Users, Eye, ArrowLeft, Shield, UserCheck, Building } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { UserRole } from "@shared/schema";

const mockUsers = [
  {
    id: 1,
    firstName: "Joshua",
    lastName: "Burnett",
    email: "joshua.burnett@nexspace.com",
    role: UserRole.SUPER_ADMIN,
    facility: "NexSpace HQ",
    lastActive: "2025-06-17T20:00:00Z",
    status: "active"
  },
  {
    id: 2,
    firstName: "Sarah",
    lastName: "Johnson",
    email: "sarah.johnson@sunrisesenior.com",
    role: UserRole.FACILITY_MANAGER,
    facility: "Sunrise Senior Living",
    lastActive: "2025-06-17T18:30:00Z",
    status: "active"
  },
  {
    id: 3,
    firstName: "Michael",
    lastName: "Chen",
    email: "michael.chen@goldenyears.com",
    role: UserRole.CLIENT_ADMINISTRATOR,
    facility: "Golden Years Care Center",
    lastActive: "2025-06-17T16:45:00Z",
    status: "active"
  },
  {
    id: 4,
    firstName: "Emily",
    lastName: "Rodriguez",
    email: "emily.rodriguez@nexspace.com",
    role: UserRole.INTERNAL_EMPLOYEE,
    facility: "Harmony Health Center",
    lastActive: "2025-06-17T19:15:00Z",
    status: "active"
  },
  {
    id: 5,
    firstName: "David",
    lastName: "Thompson",
    email: "david.thompson@contractor.com",
    role: UserRole.CONTRACTOR_1099,
    facility: "Multiple Facilities",
    lastActive: "2025-06-17T17:20:00Z",
    status: "active"
  }
];

export default function AdminImpersonationPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState<typeof mockUsers[0] | null>(null);

  const getRoleColor = (role: string) => {
    switch (role) {
      case UserRole.SUPER_ADMIN: return "bg-purple-100 text-purple-800";
      case UserRole.CLIENT_ADMINISTRATOR: return "bg-blue-100 text-blue-800";
      case UserRole.FACILITY_MANAGER: return "bg-green-100 text-green-800";
      case UserRole.INTERNAL_EMPLOYEE: return "bg-yellow-100 text-yellow-800";
      case UserRole.CONTRACTOR_1099: return "bg-orange-100 text-orange-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getRoleDisplay = (role: string) => {
    switch (role) {
      case UserRole.SUPER_ADMIN: return "Super Admin";
      case UserRole.CLIENT_ADMINISTRATOR: return "Client Administrator";
      case UserRole.FACILITY_MANAGER: return "Facility Manager";
      case UserRole.INTERNAL_EMPLOYEE: return "Internal Employee";
      case UserRole.CONTRACTOR_1099: return "1099 Contractor";
      default: return role;
    }
  };

  const filteredUsers = mockUsers.filter(u => {
    const matchesSearch = searchTerm === "" || 
      `${u.firstName} ${u.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.facility.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleImpersonate = (targetUser: typeof mockUsers[0]) => {
    setSelectedUser(targetUser);
    toast({
      title: "Impersonation Started",
      description: `Now viewing the platform as ${targetUser.firstName} ${targetUser.lastName} (${getRoleDisplay(targetUser.role)})`
    });
  };

  const stopImpersonation = () => {
    setSelectedUser(null);
    toast({
      title: "Impersonation Ended",
      description: "Returned to your Super Admin view"
    });
  };

  if (user?.role !== UserRole.SUPER_ADMIN) {
    return (
      <div className="flex-1 flex items-center justify-center">
          <Card className="w-96">
            <CardContent className="pt-6 text-center">
              <Shield className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-lg font-semibold mb-2">Access Denied</h2>
              <p className="text-gray-600 dark:text-gray-300">
                This feature is only available to Super Administrators.
              </p>
            </CardContent>
          </Card>
        </div>
    );
  }

  return (
    <div className="p-6">
          {selectedUser && (
            <div className="mb-6 p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Eye className="w-5 h-5 text-purple-600" />
                  <div>
                    <p className="font-medium text-purple-900 dark:text-purple-100">
                      Impersonating: {selectedUser.firstName} {selectedUser.lastName}
                    </p>
                    <p className="text-sm text-purple-700 dark:text-purple-300">
                      {getRoleDisplay(selectedUser.role)} • {selectedUser.facility}
                    </p>
                  </div>
                </div>
                <Button onClick={stopImpersonation} variant="outline" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Stop Impersonation
                </Button>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {selectedUser ? "Impersonation View" : "User Impersonation"}
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                {selectedUser 
                  ? "You are viewing the platform as another user. Use the navigation to see their experience."
                  : "Select a user to impersonate and preview their platform experience"
                }
              </p>
            </div>
            {selectedUser && (
              <div className="flex gap-2">
                <Button variant="outline">
                  View Dashboard
                </Button>
                <Button>
                  Generate Demo Report
                </Button>
              </div>
            )}
          </div>

          {!selectedUser && (
            <>
              {/* Filters */}
              <Card className="mb-6">
                <CardContent className="pt-6">
                  <div className="flex flex-wrap gap-4">
                    <div className="flex-1 min-w-64">
                      <Input
                        placeholder="Search by name, email, or facility..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    <Select value={roleFilter} onValueChange={setRoleFilter}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Filter by role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Roles</SelectItem>
                        <SelectItem value={UserRole.SUPER_ADMIN}>Super Admin</SelectItem>
                        <SelectItem value={UserRole.CLIENT_ADMINISTRATOR}>Client Administrator</SelectItem>
                        <SelectItem value={UserRole.FACILITY_MANAGER}>Facility Manager</SelectItem>
                        <SelectItem value={UserRole.INTERNAL_EMPLOYEE}>Internal Employee</SelectItem>
                        <SelectItem value={UserRole.CONTRACTOR_1099}>1099 Contractor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* User List */}
              <div className="grid grid-cols-1 gap-4">
                {filteredUsers.map((targetUser) => (
                  <Card key={targetUser.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <Avatar className="w-12 h-12">
                            <AvatarFallback>
                              {targetUser.firstName[0]}{targetUser.lastName[0]}
                            </AvatarFallback>
                          </Avatar>
                          
                          <div>
                            <h3 className="font-semibold text-lg">
                              {targetUser.firstName} {targetUser.lastName}
                            </h3>
                            <p className="text-gray-600 dark:text-gray-300">{targetUser.email}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Building className="w-3 h-3 text-gray-500" />
                              <span className="text-sm text-gray-500">{targetUser.facility}</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-center">
                          <Badge className={getRoleColor(targetUser.role)}>
                            {getRoleDisplay(targetUser.role)}
                          </Badge>
                          <p className="text-xs text-gray-500 mt-1">
                            Last active: {new Date(targetUser.lastActive).toLocaleString()}
                          </p>
                        </div>

                        <div className="flex gap-2">
                          <Button 
                            onClick={() => handleImpersonate(targetUser)}
                            disabled={targetUser.id === user?.id}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            {targetUser.id === user?.id ? "Current User" : "Impersonate"}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {filteredUsers.length === 0 && (
                <div className="text-center py-8">
                  <UserCheck className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No users found
                  </h3>
                  <p className="text-gray-500">
                    Try adjusting your search criteria or filters
                  </p>
                </div>
              )}
            </>
          )}

          {selectedUser && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>User Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Full Name</p>
                      <p className="font-semibold">{selectedUser.firstName} {selectedUser.lastName}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Email</p>
                      <p className="font-semibold">{selectedUser.email}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Role</p>
                      <Badge className={getRoleColor(selectedUser.role)}>
                        {getRoleDisplay(selectedUser.role)}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Facility</p>
                      <p className="font-semibold">{selectedUser.facility}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Available Actions</CardTitle>
                  <CardDescription>
                    Test functionality available to this user role
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Button variant="outline" className="w-full justify-start">
                      View Dashboard
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      Access Scheduling
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      Check Permissions
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      Test Workflows
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Demo Scenarios</CardTitle>
                  <CardDescription>
                    Common user scenarios to test
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Button variant="outline" className="w-full justify-start">
                      Create New Shift
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      Submit Invoice
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      View Reports
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      Manage Staff
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}