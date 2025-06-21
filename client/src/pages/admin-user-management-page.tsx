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
import { Users, Plus, Edit, Trash2, Search, ArrowLeft, Home, UserCheck, UserX, Settings, Shield } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { UserRole } from "@shared/schema";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";

export default function AdminUserManagementPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isPermissionsDialogOpen, setIsPermissionsDialogOpen] = useState(false);
  const [editingPermissions, setEditingPermissions] = useState<any>(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["/api/admin/users"],
  });

  const createUserMutation = useMutation({
    mutationFn: async (userData: any) => {
      const response = await apiRequest("POST", "/api/admin/users", userData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setIsCreateDialogOpen(false);
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, ...userData }: any) => {
      const response = await apiRequest("PATCH", `/api/admin/users/${id}`, userData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setSelectedUser(null);
    },
  });

  const deactivateUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await apiRequest("PATCH", `/api/admin/users/${userId}`, { isActive: false });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
  });

  // Permission sets for different roles
  const permissionSets = {
    dashboard: { name: "Dashboard Access", description: "View main dashboard and analytics" },
    scheduling: { name: "Scheduling", description: "View and manage schedules" },
    staff: { name: "Staff Management", description: "Manage staff members" },
    facilities: { name: "Facility Management", description: "Manage facilities" },
    billing: { name: "Billing & Invoices", description: "Access billing information" },
    messaging: { name: "Messaging", description: "Send and receive messages" },
    reports: { name: "Reports & Analytics", description: "Generate and view reports" },
    admin: { name: "Admin Functions", description: "Administrative privileges" },
    impersonation: { name: "User Impersonation", description: "Impersonate other users" }
  };

  const rolePermissions = {
    super_admin: Object.keys(permissionSets),
    admin: ["dashboard", "scheduling", "staff", "facilities", "billing", "messaging", "reports"],
    facility_manager: ["dashboard", "scheduling", "staff", "messaging", "reports"],
    employee: ["dashboard", "scheduling", "messaging"],
    contractor: ["dashboard", "scheduling", "messaging"]
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
      const response = await apiRequest("PATCH", `/api/admin/users/${userId}/permissions`, { permissions });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setIsPermissionsDialogOpen(false);
      setEditingPermissions(null);
    },
  });

  const handleEditPermissions = (user: any) => {
    setEditingPermissions({
      ...user,
      permissions: (rolePermissions as any)[user.role] || []
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
        <h1 className="text-3xl font-bold">User Management</h1>
        <p className="text-muted-foreground">
          Manage user accounts, roles, and permissions across the platform
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
            <SelectItem value={UserRole.SUPER_ADMIN}>Super Admin</SelectItem>
            <SelectItem value={UserRole.CLIENT_ADMINISTRATOR}>Client Admin</SelectItem>
            <SelectItem value={UserRole.FACILITY_MANAGER}>Facility Manager</SelectItem>
            <SelectItem value={UserRole.INTERNAL_EMPLOYEE}>Internal Employee</SelectItem>
            <SelectItem value={UserRole.CONTRACTOR_1099}>Contractor</SelectItem>
          </SelectContent>
        </Select>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Create User
            </Button>
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
                    <SelectItem value={UserRole.CLINICIAN}>Clinician</SelectItem>
                    <SelectItem value={UserRole.CONTRACTOR}>Contractor</SelectItem>
                    <SelectItem value={UserRole.FACILITY_MANAGER}>Facility Manager</SelectItem>
                    <SelectItem value={UserRole.CLIENT_ADMINISTRATOR}>
                      Client Administrator
                    </SelectItem>
                    <SelectItem value={UserRole.SUPER_ADMIN}>Super Admin</SelectItem>
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
                  <TableHead>Username</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user: any) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      {user.name || `${user.firstName} ${user.lastName}`}
                    </TableCell>
                    <TableCell>{user.username}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(user.role)}>{user.role}</Badge>
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
                      <div className="flex flex-wrap gap-1">
                        {((rolePermissions as any)[user.role] || []).slice(0, 3).map((permission: string) => (
                          <Badge key={permission} variant="outline" className="text-xs">
                            {(permissionSets as any)[permission]?.name || permission}
                          </Badge>
                        ))}
                        {((rolePermissions as any)[user.role] || []).length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{((rolePermissions as any)[user.role] || []).length - 3} more
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => setSelectedUser(user)}>
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleEditPermissions(user)}>
                          <Shield className="h-3 w-3" />
                        </Button>
                        {user.isActive && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deactivateUserMutation.mutate(user.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
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
                    <SelectItem value={UserRole.CLINICIAN}>Clinician</SelectItem>
                    <SelectItem value={UserRole.CONTRACTOR}>Contractor</SelectItem>
                    <SelectItem value={UserRole.FACILITY_MANAGER}>Facility Manager</SelectItem>
                    <SelectItem value={UserRole.CLIENT_ADMINISTRATOR}>
                      Client Administrator
                    </SelectItem>
                    <SelectItem value={UserRole.SUPER_ADMIN}>Super Admin</SelectItem>
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
          <DialogContent className="max-w-2xl">
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
