import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useStaff } from "@/contexts/StaffContext";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  User,
  Shield,
  LogOut,
  Users,
  Eye,
  AlertTriangle,
  Building,
  UserCheck,
  Home,
  ArrowLeft
} from "lucide-react";
import { User as SelectUser } from "@shared/schema";
import { useLocation, Link } from "wouter";

export default function AdminImpersonationPage() {
  const { user, startImpersonation, quitImpersonation, impersonatedUser, originalUser } = useAuth();
  const { staff, isLoading } = useStaff();
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [facilitySearchTerm, setFacilitySearchTerm] = useState("");
  const [facilityRoleFilter, setFacilityRoleFilter] = useState<string>("all");

  // Fetch facility users
  const { data: facilityUsers = [], isLoading: isLoadingFacilityUsers } = useQuery({
    queryKey: ["/api/facility-users"],
  });

  // Convert staff members to User type for impersonation
  const staffAsUsers: SelectUser[] = staff.map(s => ({
    id: s.id,
    username: `${s.firstName.toLowerCase()}${s.lastName.toLowerCase()}`,
    email: s.email,
    password: '', // Not needed for impersonation
    firstName: s.firstName,
    lastName: s.lastName,
    role: s.role,
    avatar: s.avatar || null,
    isActive: s.compliant,
    facilityId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));

  const filteredUsers = staffAsUsers.filter(u => {
    const matchesSearch = u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (u.firstName + " " + u.lastName).toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    
    // Don't show the current user in the list
    const isNotCurrentUser = u.id !== (impersonatedUser?.id || user?.id);
    
    return matchesSearch && matchesRole && isNotCurrentUser;
  });

  const handleImpersonate = async (targetUser: SelectUser) => {
    await startImpersonation(targetUser);
    // Navigate to appropriate dashboard based on role
    switch (targetUser.role) {
      case 'clinician':
        navigate('/clinician-dashboard');
        break;
      case 'employee':
        navigate('/employee-dashboard');
        break;
      case 'contractor':
        navigate('/contractor-dashboard');
        break;
      case 'manager':
        navigate('/dashboard');
        break;
      default:
        navigate('/dashboard');
    }
  };

  const handleImpersonateFacilityUser = async (targetUser: any) => {
    // Convert facility user to impersonation format
    const impersonationUser = {
      id: targetUser.id,
      username: targetUser.username,
      email: targetUser.email,
      firstName: targetUser.firstName,
      lastName: targetUser.lastName,
      role: targetUser.role,
      avatar: targetUser.avatar,
      isActive: targetUser.isActive,
      facilityId: targetUser.primaryFacilityId,
      createdAt: targetUser.createdAt,
      updatedAt: targetUser.updatedAt,
      userType: 'facility_user' // Mark as facility user
    };
    
    await startImpersonation(impersonationUser);
    // Navigate to facility dashboard
    navigate('/dashboard');
  };

  const handleQuitImpersonation = () => {
    quitImpersonation();
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role.toLowerCase()) {
      case "admin":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "manager":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      case "clinician":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "employee":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "contractor":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-4 mb-4">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <Home className="h-4 w-4" />
              Dashboard
            </Button>
          </Link>
          <Link href="/admin/users">
            <Button variant="ghost" size="sm" className="gap-2">
              <UserCheck className="h-4 w-4" />
              Facility Users
            </Button>
          </Link>
        </div>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              User Impersonation
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Impersonate staff members and facility users to test functionality and provide support
            </p>
          </div>
        
          {impersonatedUser && (
            <div className="flex items-center gap-4">
              <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 px-3 py-1">
                <Eye className="h-4 w-4 mr-2" />
                Viewing as: {impersonatedUser.firstName} {impersonatedUser.lastName} ({impersonatedUser.username})
            </Badge>
            <Button onClick={handleQuitImpersonation} variant="outline" className="bg-red-50 hover:bg-red-100">
              <LogOut className="h-4 w-4 mr-2" />
              Quit Impersonation
            </Button>
            </div>
          )}
        </div>
      </div>

      {/* Current Status */}
      {impersonatedUser && originalUser && (
        <Card className="border-orange-200 bg-orange-50 dark:bg-orange-900/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
                  You are currently impersonating <strong>{impersonatedUser.username}</strong>
                </p>
                <p className="text-xs text-orange-600 dark:text-orange-300">
                  Original user: {originalUser.username} ({originalUser.email})
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabbed Interface for Staff and Facility Users */}
      <Tabs defaultValue="staff" className="space-y-4">
        <TabsList>
          <TabsTrigger value="staff" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Staff Members
          </TabsTrigger>
          <TabsTrigger value="facility-users" className="flex items-center gap-2">
            <Building className="h-4 w-4" />
            Facility Users
          </TabsTrigger>
        </TabsList>

        {/* Staff Members Tab */}
        <TabsContent value="staff">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Staff Members ({filteredUsers.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-6">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by username, email, or name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="clinician">Clinician</SelectItem>
                    <SelectItem value="employee">Employee</SelectItem>
                    <SelectItem value="contractor">Contractor</SelectItem>
                  </SelectContent>
                </Select>
              </div>

          {/* Users List */}
          <div className="space-y-3">
            {isLoading ? (
              <div className="text-center py-8 text-gray-500">
                Loading users...
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No users found matching your criteria
              </div>
            ) : (
              filteredUsers.map((targetUser) => (
                <div
                  key={targetUser.id}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-blue-600 text-white">
                        {targetUser.firstName?.[0]}{targetUser.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {targetUser.firstName} {targetUser.lastName}
                        </h3>
                        <Badge className={getRoleBadgeColor(targetUser.role)}>
                          {targetUser.role}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        @{targetUser.username} • {targetUser.email}
                      </div>
                      {targetUser.facilityId && (
                        <div className="text-xs text-gray-400 dark:text-gray-500">
                          Facility ID: {targetUser.facilityId}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {!targetUser.isActive && (
                      <Badge variant="outline" className="text-red-600 border-red-200">
                        Inactive
                      </Badge>
                    )}
                    
                    <Button
                      onClick={() => handleImpersonate(targetUser)}
                      disabled={!targetUser.isActive}
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                    >
                      <User className="h-4 w-4 mr-2" />
                      Impersonate
                    </Button>
                  </div>
                </div>
              ))
            )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Facility Users Tab */}
        <TabsContent value="facility-users">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Facility Users ({facilityUsers.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-6">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search facility users..."
                    value={facilitySearchTerm}
                    onChange={(e) => setFacilitySearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={facilityRoleFilter} onValueChange={setFacilityRoleFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="facility_admin">Facility Admin</SelectItem>
                    <SelectItem value="scheduling_coordinator">Scheduling Coordinator</SelectItem>
                    <SelectItem value="hr_manager">HR Manager</SelectItem>
                    <SelectItem value="corporate">Corporate</SelectItem>
                    <SelectItem value="regional_director">Regional Director</SelectItem>
                    <SelectItem value="billing">Billing</SelectItem>
                    <SelectItem value="supervisor">Supervisor</SelectItem>
                    <SelectItem value="director_of_nursing">Director of Nursing</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Facility Users List */}
              <div className="space-y-3">
                {isLoadingFacilityUsers ? (
                  <div className="text-center py-8 text-gray-500">
                    Loading facility users...
                  </div>
                ) : facilityUsers.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No facility users found. Use "Setup Sample Data" in the Facility Users page to create sample users.
                  </div>
                ) : (
                  facilityUsers
                    .filter((user: any) => {
                      const searchMatch = facilitySearchTerm === "" || 
                        user.firstName?.toLowerCase().includes(facilitySearchTerm.toLowerCase()) ||
                        user.lastName?.toLowerCase().includes(facilitySearchTerm.toLowerCase()) ||
                        user.email?.toLowerCase().includes(facilitySearchTerm.toLowerCase()) ||
                        user.username?.toLowerCase().includes(facilitySearchTerm.toLowerCase());
                      
                      const roleMatch = facilityRoleFilter === "all" || user.role === facilityRoleFilter;
                      
                      return searchMatch && roleMatch;
                    })
                    .map((facilityUser: any) => (
                      <div
                        key={facilityUser.id}
                        className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-green-600 text-white">
                              {facilityUser.firstName?.[0]}{facilityUser.lastName?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium text-gray-900 dark:text-white">
                                {facilityUser.firstName} {facilityUser.lastName}
                              </h3>
                              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                {facilityUser.role?.replace('_', ' ')}
                              </Badge>
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              @{facilityUser.username} • {facilityUser.email}
                            </div>
                            <div className="text-xs text-gray-400 dark:text-gray-500">
                              {facilityUser.title} • {facilityUser.department}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {!facilityUser.isActive && (
                            <Badge variant="outline" className="text-red-600 border-red-200">
                              Inactive
                            </Badge>
                          )}
                          
                          <Button
                            onClick={() => handleImpersonateFacilityUser(facilityUser)}
                            disabled={!facilityUser.isActive}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 disabled:opacity-50"
                          >
                            <Building className="h-4 w-4 mr-2" />
                            Impersonate
                          </Button>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Security Notice */}
      <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                Security Notice
              </h4>
              <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                <li>• Impersonation sessions are logged for security purposes</li>
                <li>• Only use impersonation for legitimate support and testing purposes</li>
                <li>• Your original session will be restored when you quit impersonation</li>
                <li>• Impersonation state persists across browser refreshes</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}