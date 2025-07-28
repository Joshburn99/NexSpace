import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Users, Plus, Edit, Trash2, Search, ArrowLeft, Home, UserCheck, UserX, Settings, Shield, Database } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { UserRole } from "@shared/schema";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { useRBAC, PermissionAction } from "@/hooks/use-rbac";

export default function AdminUserManagementPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isPermissionsDialogOpen, setIsPermissionsDialogOpen] = useState(false);
  const [editingPermissions, setEditingPermissions] = useState<any>(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["/api/facility-users"],
  });

  const createUserMutation = useMutation({
    mutationFn: async (userData: any) => {
      const response = await apiRequest("POST", "/api/facility-users", userData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/facility-users"] });
      setIsCreateDialogOpen(false);
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, ...userData }: any) => {
      const response = await apiRequest("PATCH", `/api/facility-users/${id}`, userData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/facility-users"] });
      setSelectedUser(null);
    },
  });

  const deactivateUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await apiRequest("PATCH", `/api/facility-users/${userId}/deactivate`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/facility-users"] });
    },
  });

  // Permission sets for facility users
  const permissionSets = {
    view_facility_profile: { name: "View Facility Profile", description: "View facility information" },
    edit_facility_profile: { name: "Edit Facility Profile", description: "Edit facility settings" },
    create_shifts: { name: "Create Shifts", description: "Create new shifts" },
    edit_shifts: { name: "Edit Shifts", description: "Modify existing shifts" },
    delete_shifts: { name: "Delete Shifts", description: "Remove shifts" },
    approve_shift_requests: { name: "Approve Shift Requests", description: "Approve shift requests" },
    onboard_staff: { name: "Onboard Staff", description: "Onboard new staff members" },
    offboard_staff: { name: "Offboard Staff", description: "Offboard staff members" },
    view_rates: { name: "View Rates", description: "View billing rates" },
    edit_rates: { name: "Edit Rates", description: "Modify billing rates" },
    premium_shift_multiplier_1_0: { name: "Premium 1.0x", description: "Standard rate multiplier" },
    premium_shift_multiplier_1_1: { name: "Premium 1.1x", description: "110% rate multiplier" },
    premium_shift_multiplier_1_2: { name: "Premium 1.2x", description: "120% rate multiplier" },
    premium_shift_multiplier_1_3: { name: "Premium 1.3x", description: "130% rate multiplier" },
    premium_shift_multiplier_1_4: { name: "Premium 1.4x", description: "140% rate multiplier" },
    premium_shift_multiplier_1_5: { name: "Premium 1.5x", description: "150% rate multiplier" },
    premium_shift_multiplier_1_6: { name: "Premium 1.6x", description: "160% rate multiplier" },
    view_timesheets: { name: "View Timesheets", description: "View employee timesheets" },
    export_timesheets: { name: "Export Timesheets", description: "Export timesheet data" },
    approve_timesheets: { name: "Approve Timesheets", description: "Approve timesheets" },
    approve_payroll: { name: "Approve Payroll", description: "Approve payroll processing" },
    access_analytics: { name: "Access Analytics", description: "View analytics and insights" },
    access_reports: { name: "Access Reports", description: "Generate and view reports" },
    manage_users_and_team: { name: "Manage Users & Team", description: "Manage team members" },
    manage_job_openings: { name: "Manage Job Openings", description: "Create and manage job postings" },
    view_job_openings: { name: "View Job Openings", description: "View job postings" }
  };

  const rolePermissions = {
    facility_admin: [
      "view_facility_profile", "edit_facility_profile", "create_shifts", "edit_shifts", 
      "delete_shifts", "approve_shift_requests", "onboard_staff", "offboard_staff",
      "view_rates", "edit_rates", "premium_shift_multiplier_1_0", "premium_shift_multiplier_1_1", 
      "premium_shift_multiplier_1_2", "premium_shift_multiplier_1_3", "premium_shift_multiplier_1_4", 
      "premium_shift_multiplier_1_5", "premium_shift_multiplier_1_6", "view_timesheets", 
      "export_timesheets", "approve_timesheets", "approve_payroll", "access_analytics", 
      "access_reports", "manage_users_and_team", "manage_job_openings", "view_job_openings"
    ],
    scheduling_coordinator: [
      "view_facility_profile", "create_shifts", "edit_shifts", "delete_shifts", 
      "approve_shift_requests", "premium_shift_multiplier_1_0", "premium_shift_multiplier_1_1", 
      "premium_shift_multiplier_1_2", "view_timesheets", "access_reports", 
      "manage_job_openings", "view_job_openings"
    ],
    hr_manager: [
      "view_facility_profile", "onboard_staff", "offboard_staff", "view_rates", 
      "view_timesheets", "export_timesheets", "approve_timesheets", "access_analytics", 
      "access_reports", "manage_users_and_team", "manage_job_openings", "view_job_openings"
    ],
    corporate: [
      "view_facility_profile", "edit_facility_profile", "view_rates", "edit_rates", 
      "premium_shift_multiplier_1_0", "premium_shift_multiplier_1_1", "premium_shift_multiplier_1_2", 
      "premium_shift_multiplier_1_3", "premium_shift_multiplier_1_4", "premium_shift_multiplier_1_5", 
      "premium_shift_multiplier_1_6", "view_timesheets", "export_timesheets", "approve_timesheets", 
      "approve_payroll", "access_analytics", "access_reports", "manage_users_and_team"
    ],
    regional_director: [
      "view_facility_profile", "edit_facility_profile", "approve_shift_requests", 
      "view_rates", "edit_rates", "premium_shift_multiplier_1_0", "premium_shift_multiplier_1_1", 
      "premium_shift_multiplier_1_2", "premium_shift_multiplier_1_3", "premium_shift_multiplier_1_4", 
      "premium_shift_multiplier_1_5", "premium_shift_multiplier_1_6", "view_timesheets", 
      "export_timesheets", "approve_payroll", "access_analytics", "access_reports", 
      "manage_users_and_team"
    ],
    billing: [
      "view_facility_profile", "view_rates", "view_timesheets", "export_timesheets", 
      "approve_timesheets", "approve_payroll", "access_reports"
    ],
    supervisor: [
      "view_facility_profile", "create_shifts", "edit_shifts", "approve_shift_requests", 
      "premium_shift_multiplier_1_0", "premium_shift_multiplier_1_1", "view_timesheets", 
      "approve_timesheets", "access_reports", "view_job_openings"
    ],
    director_of_nursing: [
      "view_facility_profile", "edit_facility_profile", "create_shifts", "edit_shifts", 
      "delete_shifts", "approve_shift_requests", "onboard_staff", "offboard_staff", 
      "view_rates", "premium_shift_multiplier_1_0", "premium_shift_multiplier_1_1", 
      "premium_shift_multiplier_1_2", "premium_shift_multiplier_1_3", "view_timesheets", 
      "export_timesheets", "approve_timesheets", "access_analytics", "access_reports", 
      "manage_job_openings", "view_job_openings"
    ]
  };

  const filteredUsers = (users as any[]).filter((user: any) => {
    const matchesSearch =
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = selectedRole === "all" || user.role === selectedRole;
    return matchesSearch && matchesRole;
  });

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "super_admin":
        return "destructive";
      case "admin":
        return "default";
      case "facility_manager":
        return "secondary";
      case "employee":
        return "outline";
      case "contractor":
        return "outline";
      default:
        return "outline";
    }
  };

  const updateUserPermissions = useMutation({
    mutationFn: async ({ userId, permissions }: { userId: number; permissions: string[] }) => {
      const response = await apiRequest("PATCH", `/api/facility-users/${userId}/permissions`, { permissions });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/facility-users"] });
      setIsPermissionsDialogOpen(false);
      setEditingPermissions(null);
    },
  });

  const handleEditPermissions = (user: any) => {
    setEditingPermissions({
      ...user,
      permissions: user.permissions || (rolePermissions as any)[user.role] || []
    });
    setIsPermissionsDialogOpen(true);
  };

  const handleSavePermissions = () => {
    if (editingPermissions) {
      updateUserPermissions.mutate({
        userId: editingPermissions.id,
        permissions: editingPermissions.permissions
      });
    }
  };

  const togglePermission = (permission: string) => {
    if (!editingPermissions) return;
    
    setEditingPermissions({
      ...editingPermissions,
      permissions: editingPermissions.permissions.includes(permission)
        ? editingPermissions.permissions.filter((p: string) => p !== permission)
        : [...editingPermissions.permissions, permission]
    });
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const userData = {
      username: formData.get("username"),
      email: formData.get("email"),
      firstName: formData.get("firstName"),
      lastName: formData.get("lastName"),
      role: formData.get("role"),
      password: formData.get("password"),
    };
    createUserMutation.mutate(userData);
  };

  const handleUpdateUser = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const userData = {
      id: selectedUser.id,
      username: formData.get("username"),
      email: formData.get("email"),
      firstName: formData.get("firstName"),
      lastName: formData.get("lastName"),
      role: formData.get("role"),
    };
    updateUserMutation.mutate(userData);
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-4 mb-4">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <Home className="h-4 w-4" />
              Dashboard
            </Button>
          </Link>
          <Link href="/admin/impersonation">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Admin
            </Button>
          </Link>
        </div>
        <h1 className="text-3xl font-bold">Facility Users</h1>
        <p className="text-muted-foreground">
          Manage facility user accounts, roles, and permissions for healthcare facilities
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users by name, email, or username..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Select value={selectedRole} onValueChange={setSelectedRole}>
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
        <Button 
          variant="outline" 
          onClick={async () => {
            try {
              const response = await apiRequest("POST", "/api/setup-facility-users", {});
              const result = await response.json();
              console.log('Sample users created:', result);
              queryClient.invalidateQueries({ queryKey: ["/api/facility-users"] });
            } catch (error) {
              console.error('Failed to create sample users:', error);
            }
          }}
          className="gap-2"
        >
          <Settings className="h-4 w-4" />
          Setup Sample Data
        </Button>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <PermissionAction action="manage_users">
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Create User
              </Button>
            </PermissionAction>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" name="firstName" required />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" name="lastName" required />
                </div>
              </div>
              <div>
                <Label htmlFor="username">Username</Label>
                <Input id="username" name="username" required />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" required />
              </div>
              <div>
                <Label htmlFor="role">Role</Label>
                <Select name="role" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">Employee</SelectItem>
                    <SelectItem value="contractor">Contractor</SelectItem>
                    <SelectItem value="facility_manager">Facility Manager</SelectItem>
                    <SelectItem value="admin">Administrator</SelectItem>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input id="password" name="password" type="password" required />
              </div>
              <Button type="submit" disabled={createUserMutation.isPending}>
                {createUserMutation.isPending ? "Creating..." : "Create User"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Users ({filteredUsers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading users...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Title/Department</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Facility/Team</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user: any) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      {`${user.firstName} ${user.lastName}`}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {user.title && <div className="font-medium">{user.title}</div>}
                        {user.department && <div className="text-sm text-muted-foreground">{user.department}</div>}
                      </div>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(user.role)}>
                        {user.role.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {user.teamMemberships && user.teamMemberships.length > 0
                          ? user.teamMemberships.map((tm: any) => tm.teamName).join(', ')
                          : user.associatedFacilityIds && user.associatedFacilityIds.length > 1 
                            ? `Multiple Facilities (${user.associatedFacilityIds.length})`
                            : user.facilityName || `Facility ${user.primaryFacilityId || user.facilityId}`
                        }
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.isActive ? "default" : "secondary"}>
                        {user.isActive ? (
                          <>
                            <UserCheck className="h-3 w-3 mr-1" /> Active
                          </>
                        ) : (
                          <>
                            <UserX className="h-3 w-3 mr-1" /> Inactive
                          </>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <PermissionAction action="manage_users">
                          <Button size="sm" variant="outline" onClick={() => setSelectedUser(user)}>
                            <Edit className="h-3 w-3" />
                          </Button>
                        </PermissionAction>
                        <PermissionAction action="manage_users">
                          <Button size="sm" variant="outline" onClick={() => handleEditPermissions(user)}>
                            <Shield className="h-3 w-3" />
                          </Button>
                        </PermissionAction>
                        {user.isActive && (
                          <PermissionAction action="manage_users">
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => deactivateUserMutation.mutate(user.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </PermissionAction>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {selectedUser && (
        <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="editFirstName">First Name</Label>
                  <Input
                    id="editFirstName"
                    name="firstName"
                    defaultValue={selectedUser.firstName}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="editLastName">Last Name</Label>
                  <Input
                    id="editLastName"
                    name="lastName"
                    defaultValue={selectedUser.lastName}
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="editUsername">Username</Label>
                <Input
                  id="editUsername"
                  name="username"
                  defaultValue={selectedUser.username}
                  required
                />
              </div>
              <div>
                <Label htmlFor="editEmail">Email</Label>
                <Input
                  id="editEmail"
                  name="email"
                  type="email"
                  defaultValue={selectedUser.email}
                  required
                />
              </div>
              <div>
                <Label htmlFor="editRole">Role</Label>
                <Select name="role" defaultValue={selectedUser.role} required>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">Employee</SelectItem>
                    <SelectItem value="contractor">Contractor</SelectItem>
                    <SelectItem value="facility_manager">Facility Manager</SelectItem>
                    <SelectItem value="admin">Administrator</SelectItem>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={updateUserMutation.isPending}>
                {updateUserMutation.isPending ? "Updating..." : "Update User"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Permissions Editing Dialog */}
      {editingPermissions && (
        <Dialog open={isPermissionsDialogOpen} onOpenChange={() => setIsPermissionsDialogOpen(false)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Edit Permissions - {editingPermissions.name || `${editingPermissions.firstName} ${editingPermissions.lastName}`}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <Badge variant={getRoleBadgeVariant(editingPermissions.role)}>
                  {editingPermissions.role}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Current role-based permissions can be customized below
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-3">
                  <h4 className="font-medium">Permission Categories</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(permissionSets).map(([key, permission]) => (
                      <div key={key} className="flex items-start space-x-3 p-3 border rounded-lg">
                        <Checkbox
                          id={key}
                          checked={editingPermissions.permissions.includes(key)}
                          onCheckedChange={() => togglePermission(key)}
                        />
                        <div className="flex-1 min-w-0">
                          <Label htmlFor={key} className="text-sm font-medium cursor-pointer">
                            {permission.name}
                          </Label>
                          <p className="text-xs text-muted-foreground mt-1">
                            {permission.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <Separator />

              <div className="flex justify-between">
                <div className="text-sm text-muted-foreground">
                  {editingPermissions.permissions.length} of {Object.keys(permissionSets).length} permissions selected
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsPermissionsDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSavePermissions}
                    disabled={updateUserPermissions.isPending}
                  >
                    {updateUserPermissions.isPending ? "Saving..." : "Save Permissions"}
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
