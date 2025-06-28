import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Users, Trash2, Edit, UserPlus, Search, Eye } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

// Team types
interface TeamMember {
  id: number;
  userId: number;
  role: string;
  joinedAt: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface TeamFacility {
  id: number;
  facilityId: number;
  assignedAt: string;
  name: string;
  city: string;
  state: string;
  facilityType: string;
}

interface Team {
  id: number;
  name: string;
  description?: string;
  leaderId?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  memberCount?: number;
  facilityCount?: number;
  members?: TeamMember[];
  facilities?: TeamFacility[];
}

interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

interface Facility {
  id: number;
  name: string;
  city: string;
  state: string;
}

// Form schemas
const teamSchema = z.object({
  name: z.string().min(1, "Team name is required"),
  description: z.string().optional(),
  leaderId: z.coerce.number().optional(),
});

const teamMemberSchema = z.object({
  userId: z.coerce.number(),
  role: z.string().default("member"),
});

const teamFacilitySchema = z.object({
  facilityId: z.coerce.number(),
});

type TeamForm = z.infer<typeof teamSchema>;
type TeamMemberForm = z.infer<typeof teamMemberSchema>;
type TeamFacilityForm = z.infer<typeof teamFacilitySchema>;

export default function AdminTeamsPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [showFacilityModal, setShowFacilityModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  // Fetch teams
  const { data: teams = [], isLoading: teamsLoading } = useQuery({
    queryKey: ["/api/teams"],
  });

  // Fetch users for team leader selection
  const { data: users = [] } = useQuery({
    queryKey: ["/api/users"],
  });

  // Fetch facilities for team assignment
  const { data: facilities = [] } = useQuery({
    queryKey: ["/api/facilities"],
  });

  // Create team mutation
  const createTeamMutation = useMutation({
    mutationFn: (data: TeamForm) => apiRequest("POST", "/api/teams", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      setShowCreateModal(false);
      toast({ title: "Success", description: "Team created successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create team", variant: "destructive" });
    },
  });

  // Add team member mutation
  const addMemberMutation = useMutation({
    mutationFn: ({ teamId, ...data }: TeamMemberForm & { teamId: number }) =>
      apiRequest("POST", `/api/teams/${teamId}/members`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      setShowMemberModal(false);
      toast({ title: "Success", description: "Team member added successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add team member", variant: "destructive" });
    },
  });

  // Add team facility mutation
  const addFacilityMutation = useMutation({
    mutationFn: ({ teamId, ...data }: TeamFacilityForm & { teamId: number }) =>
      apiRequest("POST", `/api/teams/${teamId}/facilities`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      setShowFacilityModal(false);
      toast({ title: "Success", description: "Facility assigned to team successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to assign facility to team", variant: "destructive" });
    },
  });

  // Remove team member mutation
  const removeMemberMutation = useMutation({
    mutationFn: ({ teamId, memberId }: { teamId: number; memberId: number }) =>
      apiRequest("DELETE", `/api/teams/${teamId}/members/${memberId}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      toast({ title: "Success", description: "Member removed from team successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to remove member from team", variant: "destructive" });
    },
  });

  // Remove team facility mutation
  const removeFacilityMutation = useMutation({
    mutationFn: ({ teamId, facilityId }: { teamId: number; facilityId: number }) =>
      apiRequest("DELETE", `/api/teams/${teamId}/facilities/${facilityId}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      toast({ title: "Success", description: "Facility removed from team successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to remove facility from team", variant: "destructive" });
    },
  });

  // Forms
  const teamForm = useForm<TeamForm>({
    resolver: zodResolver(teamSchema),
    defaultValues: {
      name: "",
      description: "",
      leaderId: undefined,
    },
  });

  const memberForm = useForm<TeamMemberForm>({
    resolver: zodResolver(teamMemberSchema),
    defaultValues: {
      userId: undefined,
      role: "member",
    },
  });

  const facilityForm = useForm<TeamFacilityForm>({
    resolver: zodResolver(teamFacilitySchema),
    defaultValues: {
      facilityId: undefined,
    },
  });

  const onCreateTeam = (data: TeamForm) => {
    createTeamMutation.mutate(data);
  };

  const onAddMember = (data: TeamMemberForm) => {
    if (selectedTeam) {
      addMemberMutation.mutate({ ...data, teamId: selectedTeam.id });
    }
  };

  const onAddFacility = (data: TeamFacilityForm) => {
    if (selectedTeam) {
      addFacilityMutation.mutate({ ...data, teamId: selectedTeam.id });
    }
  };

  if (teamsLoading) {
    return <div>Loading teams...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Team Management</h1>
          <p className="text-muted-foreground">
            Manage teams and their facility-user relationships
          </p>
        </div>
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Team
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Team</DialogTitle>
            </DialogHeader>
            <Form {...teamForm}>
              <form onSubmit={teamForm.handleSubmit(onCreateTeam)} className="space-y-4">
                <FormField
                  control={teamForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Team Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter team name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={teamForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Enter team description" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={teamForm.control}
                  name="leaderId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Team Leader (Optional)</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value?.toString()}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select team leader" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">No Leader</SelectItem>
                          {(users as User[]).map((user: User) => (
                            <SelectItem key={user.id} value={user.id.toString()}>
                              {user.firstName} {user.lastName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createTeamMutation.isPending}>
                    {createTeamMutation.isPending ? "Creating..." : "Create Team"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6">
        {(teams as Team[]).length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No teams found</h3>
              <p className="text-muted-foreground text-center mb-4">
                Get started by creating your first team to manage facility-user relationships.
              </p>
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Team
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {(teams as Team[]).map((team: Team) => (
              <Card key={team.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {team.name}
                        <Badge variant={team.isActive ? "default" : "secondary"}>
                          {team.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </CardTitle>
                      {team.description && (
                        <p className="text-muted-foreground mt-1">{team.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedTeam(team);
                          setShowMemberModal(true);
                        }}
                      >
                        <UserPlus className="w-4 h-4 mr-2" />
                        Add Member
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedTeam(team);
                          setShowFacilityModal(true);
                        }}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Facility
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-sm mb-6">
                    <div>
                      <span className="text-muted-foreground">Team ID:</span>
                      <p className="font-medium">#{team.id}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Members:</span>
                      <p className="font-medium">{team.memberCount || 0}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Facilities:</span>
                      <p className="font-medium">{team.facilityCount || 0}</p>
                    </div>
                  </div>

                  {/* Current Members */}
                  <div className="mb-6">
                    <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Team Members
                    </h4>
                    {team.members && team.members.length > 0 ? (
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {team.members.map((member) => (
                          <div key={member.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{member.firstName} {member.lastName}</span>
                                <Badge variant="outline">{member.role}</Badge>
                              </div>
                              <span className="text-sm text-muted-foreground">{member.email}</span>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => {
                                removeMemberMutation.mutate({ teamId: team.id, memberId: member.id });
                              }}
                              disabled={removeMemberMutation.isPending}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No members assigned</p>
                      </div>
                    )}
                  </div>

                  {/* Current Facilities */}
                  <div>
                    <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <Plus className="w-4 h-4" />
                      Assigned Facilities
                    </h4>
                    {team.facilities && team.facilities.length > 0 ? (
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {team.facilities.map((facility) => (
                          <div key={facility.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{facility.name}</span>
                                <Badge variant="outline">{facility.facilityType}</Badge>
                              </div>
                              <span className="text-sm text-muted-foreground">
                                {facility.city}, {facility.state}
                              </span>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => {
                                removeFacilityMutation.mutate({ teamId: team.id, facilityId: facility.facilityId });
                              }}
                              disabled={removeFacilityMutation.isPending}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Plus className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No facilities assigned</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add Member Modal */}
      <Dialog open={showMemberModal} onOpenChange={setShowMemberModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
          </DialogHeader>
          <Form {...memberForm}>
            <form onSubmit={memberForm.handleSubmit(onAddMember)} className="space-y-4">
              <FormField
                control={memberForm.control}
                name="userId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>User</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value?.toString()}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select user" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(users as User[]).map((user: User) => (
                          <SelectItem key={user.id} value={user.id.toString()}>
                            {user.firstName} {user.lastName} ({user.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={memberForm.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="member">Member</SelectItem>
                        <SelectItem value="coordinator">Coordinator</SelectItem>
                        <SelectItem value="leader">Leader</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setShowMemberModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={addMemberMutation.isPending}>
                  {addMemberMutation.isPending ? "Adding..." : "Add Member"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Add Facility Modal */}
      <Dialog open={showFacilityModal} onOpenChange={setShowFacilityModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Facility to Team</DialogTitle>
          </DialogHeader>
          <Form {...facilityForm}>
            <form onSubmit={facilityForm.handleSubmit(onAddFacility)} className="space-y-4">
              <FormField
                control={facilityForm.control}
                name="facilityId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Facility</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value?.toString()}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select facility" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(facilities as Facility[]).map((facility: Facility) => (
                          <SelectItem key={facility.id} value={facility.id.toString()}>
                            {facility.name} - {facility.city}, {facility.state}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setShowFacilityModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={addFacilityMutation.isPending}>
                  {addFacilityMutation.isPending ? "Assigning..." : "Assign Facility"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}