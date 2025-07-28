import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useRBAC, PermissionGate } from "@/hooks/use-rbac";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/queryClient";
import { SystemRole, ROLE_METADATA } from "@shared/rbac";
import { Search, Shield, Edit, UserCheck, Users } from "lucide-react";

interface User {
  id: number;
  email: string;
  name: string;
  role: SystemRole;
  facilityName?: string;
  facilityId?: number;
  createdAt: string;
  lastLogin?: string;
  status: 'active' | 'inactive';
}

export default function RoleManagementPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { hasPermission } = useRBAC();
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<SystemRole | "all">("all");
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newRole, setNewRole] = useState<SystemRole>("viewer");

  // Check if user has permission to manage roles
  if (!hasPermission('system.manage_permissions')) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center">
              <Shield className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h2 className="text-lg font-semibold mb-2">Access Denied</h2>
              <p className="text-gray-600">
                You don't have permission to manage user roles. Contact your administrator for access.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fetch all users
  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ['/api/admin/users'],
  });

  // Update user role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: number; role: SystemRole }) => {
      return apiRequest(`/api/admin/users/${userId}/role`, 'PATCH', { role });
    },
    onSuccess: () => {
      toast({
        title: "Role Updated",
        description: "User role has been successfully updated.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      setEditingUser(null);
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update user role.",
        variant: "destructive",
      });
    },
  });

  // Filter users based on search and role
  const filteredUsers = users?.filter((user: User) => {
    const matchesSearch = 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    return matchesSearch && matchesRole;
  }) || [];

  // Role stats
  const roleStats = users?.reduce((acc: Record<SystemRole, number>, user: User) => {
    acc[user.role] = (acc[user.role] || 0) + 1;
    return acc;
  }, {} as Record<SystemRole, number>) || {};

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-3 mb-2">
            <Shield className="h-8 w-8 text-primary" />
            Role Management
          </h1>
          <p className="text-gray-600">
            Manage user roles and permissions across the platform
          </p>
        </div>

        {/* Role Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
          {Object.entries(ROLE_METADATA).map(([role, metadata]) => (
            <Card key={role}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">{metadata.label}</p>
                    <p className="text-2xl font-bold">
                      {(roleStats as any)[role] || 0}
                    </p>
                  </div>
                  <div className={`p-3 rounded-full ${metadata.color}`}>
                    <Users className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={roleFilter} onValueChange={(value) => setRoleFilter(value as SystemRole | "all")}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {Object.entries(ROLE_METADATA).map(([role, metadata]) => (
                    <SelectItem key={role} value={role}>
                      <span className={`${metadata.color} px-2 py-1 rounded-md text-xs`}>
                        {metadata.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>Users ({filteredUsers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No users found matching your criteria
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Current Role</TableHead>
                      <TableHead>Facility</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Login</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{user.name}</p>
                            <p className="text-sm text-gray-500">{user.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={ROLE_METADATA[user.role]?.color || ''}>
                            {ROLE_METADATA[user.role]?.label || user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {user.facilityName || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
                            {user.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingUser(user);
                              setNewRole(user.role);
                            }}
                            disabled={user.role === 'super_admin' && !hasPermission('users.edit')}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit Role
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Role Dialog */}
        <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Change User Role</DialogTitle>
              <DialogDescription>
                Update the role for {editingUser?.name} ({editingUser?.email})
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label>New Role</Label>
              <Select value={newRole} onValueChange={(value) => setNewRole(value as SystemRole)}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_METADATA).map(([role, metadata]) => (
                    <SelectItem key={role} value={role}>
                      <div>
                        <p className="font-medium">{metadata.label}</p>
                        <p className="text-xs text-gray-500">{metadata.description}</p>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="mt-4 p-3 bg-yellow-50 rounded-md">
                <p className="text-sm text-yellow-800">
                  <strong>Warning:</strong> Changing user roles will immediately affect their access to platform features.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingUser(null)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (editingUser) {
                    updateRoleMutation.mutate({
                      userId: editingUser.id,
                      role: newRole,
                    });
                  }
                }}
                disabled={updateRoleMutation.isPending}
              >
                <UserCheck className="h-4 w-4 mr-2" />
                Update Role
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}