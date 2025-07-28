import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Users, UserPlus, Edit, Shield, Mail, Phone, Calendar, AlertCircle } from "lucide-react";
import { useFacilityPermissions } from "@/hooks/use-facility-permissions";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface FacilityUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: string;
  associatedFacilities: number[];
  permissions: string[];
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
  avatar?: string;
}

const FACILITY_ROLES = {
  facility_admin: "Facility Administrator",
  scheduling_manager: "Scheduling Coordinator",
  hr_manager: "HR Manager",
  billing_manager: "Billing Manager",
  supervisor: "Supervisor",
  director_of_nursing: "Director of Nursing",
  viewer: "Viewer",
};

const ROLE_PERMISSIONS = {
  facility_admin: [
    "view_schedules",
    "manage_schedules",
    "view_staff",
    "manage_staff",
    "view_billing",
    "manage_billing",
    "view_facility_profile",
    "edit_facility_profile",
    "manage_facility_settings",
    "manage_facility_users",
    "manage_permissions",
    "view_audit_logs",
    "view_compliance",
    "manage_compliance",
    "view_staff_credentials",
    "edit_staff_credentials",
    "upload_documents",
  ],
  scheduling_manager: ["view_schedules", "manage_schedules", "view_staff", "view_facility_profile"],
  hr_manager: [
    "view_staff",
    "manage_staff",
    "view_compliance",
    "manage_compliance",
    "view_staff_credentials",
    "edit_staff_credentials",
    "upload_documents",
    "view_facility_profile",
  ],
  billing_manager: ["view_billing", "manage_billing", "generate_invoices", "view_facility_profile"],
  supervisor: ["view_schedules", "view_staff", "view_facility_profile"],
  director_of_nursing: [
    "view_schedules",
    "manage_schedules",
    "view_staff",
    "view_compliance",
    "manage_compliance",
    "view_staff_credentials",
    "view_facility_profile",
  ],
  viewer: ["view_schedules", "view_staff", "view_facility_profile"],
};

export default function FacilityUsersManagementPage() {
  const [showAddUser, setShowAddUser] = useState(false);
  const [editingUser, setEditingUser] = useState<FacilityUser | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const { permissions, hasPermission, facilityId } = useFacilityPermissions();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: facilityUsers = [], isLoading } = useQuery<FacilityUser[]>({
    queryKey: ["/api/facility-users", "facility", facilityId],
    enabled: !!facilityId && hasPermission("manage_facility_users"),
  });

  const addUser = useMutation({
    mutationFn: async (userData: Partial<FacilityUser>) => {
      return apiRequest("POST", "/api/facility-users", {
        ...userData,
        associatedFacilities: [facilityId],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/facility-users"] });
      setShowAddUser(false);
      toast({
        title: "Success",
        description: "User added successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add user",
        variant: "destructive",
      });
    },
  });

  const updateUser = useMutation({
    mutationFn: async (userData: Partial<FacilityUser>) => {
      return apiRequest("PATCH", `/api/facility-users/${userData.id}`, userData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/facility-users"] });
      setEditingUser(null);
      toast({
        title: "Success",
        description: "User updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update user",
        variant: "destructive",
      });
    },
  });

  if (!hasPermission("manage_facility_users")) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-gray-600">You don't have permission to manage facility users.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleRoleChange = (role: string) => {
    setSelectedRole(role);
    setSelectedPermissions(ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS] || []);
  };

  const handlePermissionToggle = (permission: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(permission) ? prev.filter((p) => p !== permission) : [...prev, permission]
    );
  };

  const filteredUsers = facilityUsers.filter((user) =>
    user.associatedFacilities.includes(facilityId)
  );

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="h-8 w-8" />
            Facility Users
          </h1>
          <p className="text-gray-600 mt-2">Manage user access and permissions for your facility</p>
        </div>
        <Button onClick={() => setShowAddUser(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>

      <Alert className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Users added here will have access to your facility's data based on their assigned role and
          permissions. Only Facility Administrators can manage other users.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Current Users</CardTitle>
          <CardDescription>
            {filteredUsers.length} users with access to this facility
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8 text-gray-500">Loading users...</p>
          ) : filteredUsers.length === 0 ? (
            <p className="text-center py-8 text-gray-500">No users found for this facility</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={user.avatar} />
                          <AvatarFallback>
                            {user.firstName[0]}
                            {user.lastName[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">
                            {user.firstName} {user.lastName}
                          </p>
                          <p className="text-sm text-gray-600">{user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {FACILITY_ROLES[user.role as keyof typeof FACILITY_ROLES] || user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.isActive ? "default" : "secondary"}>
                        {user.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : "Never"}
                    </TableCell>
                    <TableCell className="text-right">
                      {hasPermission("manage_permissions") && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingUser(user);
                            setSelectedRole(user.role);
                            setSelectedPermissions(user.permissions);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add User Dialog */}
      <Dialog open={showAddUser} onOpenChange={setShowAddUser}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>
              Create a new user account with access to this facility
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>First Name</Label>
                <Input placeholder="John" />
              </div>
              <div className="space-y-2">
                <Label>Last Name</Label>
                <Input placeholder="Doe" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" placeholder="john.doe@facility.com" />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input placeholder="(555) 123-4567" />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={selectedRole} onValueChange={handleRoleChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(FACILITY_ROLES).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedRole && hasPermission("manage_permissions") && (
              <div className="space-y-2">
                <Label>Permissions</Label>
                <div className="border rounded-lg p-4 max-h-64 overflow-y-auto">
                  <div className="space-y-2">
                    {Object.entries({
                      view_schedules: "View Schedules",
                      manage_schedules: "Manage Schedules",
                      view_staff: "View Staff",
                      manage_staff: "Manage Staff",
                      view_billing: "View Billing",
                      manage_billing: "Manage Billing",
                      view_compliance: "View Compliance",
                      manage_compliance: "Manage Compliance",
                      view_staff_credentials: "View Staff Credentials",
                      edit_staff_credentials: "Edit Staff Credentials",
                      upload_documents: "Upload Documents",
                      view_facility_profile: "View Facility Profile",
                      edit_facility_profile: "Edit Facility Profile",
                      manage_facility_settings: "Manage Facility Settings",
                      view_audit_logs: "View Audit Logs",
                    }).map(([permission, label]) => (
                      <div key={permission} className="flex items-center space-x-2">
                        <Checkbox
                          checked={selectedPermissions.includes(permission)}
                          onCheckedChange={() => handlePermissionToggle(permission)}
                        />
                        <Label className="text-sm font-normal cursor-pointer">{label}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddUser(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                // Handle add user
                addUser.mutate({
                  firstName: "New",
                  lastName: "User",
                  email: "newuser@facility.com",
                  role: selectedRole,
                  permissions: selectedPermissions,
                  isActive: true,
                });
              }}
            >
              Add User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      {editingUser && (
        <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>Update user role and permissions</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={editingUser.avatar} />
                  <AvatarFallback>
                    {editingUser.firstName[0]}
                    {editingUser.lastName[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">
                    {editingUser.firstName} {editingUser.lastName}
                  </p>
                  <p className="text-sm text-gray-600">{editingUser.email}</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={selectedRole} onValueChange={handleRoleChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(FACILITY_ROLES).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {hasPermission("manage_permissions") && (
                <div className="space-y-2">
                  <Label>Permissions</Label>
                  <div className="border rounded-lg p-4 max-h-64 overflow-y-auto">
                    <div className="space-y-2">
                      {Object.entries({
                        view_schedules: "View Schedules",
                        manage_schedules: "Manage Schedules",
                        view_staff: "View Staff",
                        manage_staff: "Manage Staff",
                        view_billing: "View Billing",
                        manage_billing: "Manage Billing",
                        view_compliance: "View Compliance",
                        manage_compliance: "Manage Compliance",
                        view_staff_credentials: "View Staff Credentials",
                        edit_staff_credentials: "Edit Staff Credentials",
                        upload_documents: "Upload Documents",
                        view_facility_profile: "View Facility Profile",
                        edit_facility_profile: "Edit Facility Profile",
                        manage_facility_settings: "Manage Facility Settings",
                        view_audit_logs: "View Audit Logs",
                      }).map(([permission, label]) => (
                        <div key={permission} className="flex items-center space-x-2">
                          <Checkbox
                            checked={selectedPermissions.includes(permission)}
                            onCheckedChange={() => handlePermissionToggle(permission)}
                          />
                          <Label className="text-sm font-normal cursor-pointer">{label}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingUser(null)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  updateUser.mutate({
                    id: editingUser.id,
                    role: selectedRole,
                    permissions: selectedPermissions,
                  });
                }}
              >
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
