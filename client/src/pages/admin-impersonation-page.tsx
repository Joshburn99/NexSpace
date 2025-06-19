import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useStaff } from "@/contexts/StaffContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  AlertTriangle
} from "lucide-react";
import { User as SelectUser } from "@shared/schema";
import { useLocation } from "wouter";

export default function AdminImpersonationPage() {
  const { user, startImpersonation, quitImpersonation, impersonatedUser, originalUser } = useAuth();
  const { staff, isLoading } = useStaff();
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");

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

  const handleImpersonate = (targetUser: SelectUser) => {
    startImpersonation(targetUser);
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            User Impersonation
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Impersonate users to test functionality and provide support
          </p>
        </div>
        
        {impersonatedUser && (
          <div className="flex items-center gap-4">
            <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 px-3 py-1">
              <Eye className="h-4 w-4 mr-2" />
              Impersonating: {impersonatedUser.username}
            </Badge>
            <Button onClick={handleQuitImpersonation} variant="outline" className="bg-red-50 hover:bg-red-100">
              <LogOut className="h-4 w-4 mr-2" />
              Quit Impersonation
            </Button>
          </div>
        )}
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

      {/* Search and Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Available Users
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