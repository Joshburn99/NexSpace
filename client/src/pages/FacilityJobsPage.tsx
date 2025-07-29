import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Briefcase, Plus, Edit, Trash2, Calendar, CheckCircle, XCircle, Clock, Users, UserPlus } from "lucide-react";
import type { JobPosting } from "@shared/schema/job";

interface JobApplication {
  id: number;
  jobPostingId: number;
  staffId: number;
  status: string;
  appliedAt: string;
  coverLetter?: string;
  resumeUrl?: string;
  jobPosting?: JobPosting;
  staff?: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    specialty: string;
  };
}

interface InterviewSchedule {
  jobApplicationId: number;
  scheduledStart: string;
  scheduledEnd: string;
  meetingUrl?: string;
  notes?: string;
}

export default function FacilityJobsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showInterviewModal, setShowInterviewModal] = useState(false);
  const [selectedPosting, setSelectedPosting] = useState<JobPosting | null>(null);
  const [selectedApplication, setSelectedApplication] = useState<JobApplication | null>(null);
  const [activeTab, setActiveTab] = useState("postings");

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    requirements: "",
    scheduleType: "Full-time",
    payRate: "",
    status: "active",
  });

  const [interviewData, setInterviewData] = useState({
    scheduledStart: "",
    scheduledEnd: "",
    meetingUrl: "",
    notes: "",
  });

  // Fetch job postings for this facility
  const { data: myPostings = [], isLoading: isLoadingPostings } = useQuery<JobPosting[]>({
    queryKey: ["/api/job-postings", user?.facilityId],
    queryFn: async () => {
      if (!user?.facilityId) return [];
      const response = await fetch(`/api/job-postings?facilityId=${user.facilityId}`);
      if (!response.ok) throw new Error("Failed to fetch postings");
      return response.json();
    },
    enabled: !!user?.facilityId,
  });

  // Fetch applications for all facility postings
  const { data: applications = [], isLoading: isLoadingApplications } = useQuery<JobApplication[]>({
    queryKey: ["/api/job-applications/facility", user?.facilityId],
    queryFn: async () => {
      if (!user?.facilityId) return [];
      const response = await fetch(`/api/job-applications?facilityId=${user.facilityId}`);
      if (!response.ok) throw new Error("Failed to fetch applications");
      return response.json();
    },
    enabled: !!user?.facilityId,
  });

  // Create job posting mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await apiRequest("POST", "/api/job-postings", {
        ...data,
        facilityId: user?.facilityId,
        payRate: parseFloat(data.payRate),
        requirements: data.requirements ? { requirements: data.requirements.split("\n") } : {},
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Job posting created successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/job-postings"] });
      setShowCreateModal(false);
      resetForm();
    },
    onError: (error) => {
      toast({
        title: "Failed to create posting",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update job posting mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: typeof formData }) => {
      const response = await apiRequest("PATCH", `/api/job-postings/${id}`, {
        ...data,
        payRate: parseFloat(data.payRate),
        requirements: data.requirements ? { requirements: data.requirements.split("\n") } : {},
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Job posting updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/job-postings"] });
      setShowEditModal(false);
      resetForm();
    },
    onError: (error) => {
      toast({
        title: "Failed to update posting",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete job posting mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/job-postings/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Job posting deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/job-postings"] });
    },
    onError: (error) => {
      toast({
        title: "Failed to delete posting",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update application status mutation
  const updateApplicationMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const response = await apiRequest("PATCH", `/api/job-applications/${id}`, { status });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Application status updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/job-applications"] });
    },
    onError: (error) => {
      toast({
        title: "Failed to update application",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Schedule interview mutation
  const scheduleInterviewMutation = useMutation({
    mutationFn: async (data: InterviewSchedule) => {
      const response = await apiRequest("POST", "/api/interviews", data);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Interview scheduled successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/job-applications"] });
      setShowInterviewModal(false);
      setInterviewData({
        scheduledStart: "",
        scheduledEnd: "",
        meetingUrl: "",
        notes: "",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to schedule interview",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      requirements: "",
      scheduleType: "Full-time",
      payRate: "",
      status: "active",
    });
    setSelectedPosting(null);
  };

  const handleEdit = (posting: JobPosting) => {
    setSelectedPosting(posting);
    setFormData({
      title: posting.title,
      description: posting.description,
      requirements: Array.isArray(posting.requirements) ? posting.requirements.join("\n") : 
        (posting.requirements && typeof posting.requirements === 'object') ? Object.entries(posting.requirements).map(([k, v]) => `${k}: ${v}`).join("\n") : "",
      scheduleType: posting.scheduleType,
      payRate: posting.payRate.toString(),
      status: posting.status,
    });
    setShowEditModal(true);
  };

  const handleScheduleInterview = (application: JobApplication) => {
    setSelectedApplication(application);
    setShowInterviewModal(true);
  };

  const handleInterviewSubmit = () => {
    if (!selectedApplication) return;
    scheduleInterviewMutation.mutate({
      jobApplicationId: selectedApplication.id,
      ...interviewData,
    });
  };

  // Group applications by job posting
  const applicationsByPosting = applications.reduce((acc, app) => {
    const postingId = app.jobPostingId;
    if (!acc[postingId]) {
      acc[postingId] = [];
    }
    acc[postingId].push(app);
    return acc;
  }, {} as Record<number, JobApplication[]>);

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Job Management</h1>
        <p className="text-muted-foreground">Manage your facility's job postings and applications</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="postings">My Postings</TabsTrigger>
          <TabsTrigger value="applications">Applications</TabsTrigger>
        </TabsList>

        <TabsContent value="postings" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Job Postings</CardTitle>
                <CardDescription>Manage your facility's open positions</CardDescription>
              </div>
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Posting
              </Button>
            </CardHeader>
            <CardContent>
              {isLoadingPostings ? (
                <div className="text-center py-8">Loading postings...</div>
              ) : myPostings.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No job postings yet. Create your first posting to start hiring.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Schedule Type</TableHead>
                      <TableHead>Pay Rate</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Posted</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {myPostings.map((posting) => (
                      <TableRow key={posting.id}>
                        <TableCell className="font-medium">{posting.title}</TableCell>
                        <TableCell>{posting.scheduleType}</TableCell>
                        <TableCell>${Number(posting.payRate).toFixed(2)}/hr</TableCell>
                        <TableCell>
                          <span
                            className={`px-2 py-1 rounded text-xs ${
                              posting.status === "active"
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {posting.status}
                          </span>
                        </TableCell>
                        <TableCell>
                          {posting.createdAt ? new Date(posting.createdAt).toLocaleDateString() : "N/A"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => handleEdit(posting)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => deleteMutation.mutate(posting.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="applications" className="space-y-4">
          {isLoadingApplications ? (
            <div className="text-center py-8">Loading applications...</div>
          ) : Object.keys(applicationsByPosting).length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">No applications received yet.</p>
            </Card>
          ) : (
            Object.entries(applicationsByPosting).map(([postingId, apps]) => {
              const posting = myPostings.find((p) => p.id === parseInt(postingId));
              return (
                <Card key={postingId}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Briefcase className="h-5 w-5" />
                      {posting?.title || "Position"}
                    </CardTitle>
                    <CardDescription>
                      {apps.length} application{apps.length !== 1 ? "s" : ""} received
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Applicant</TableHead>
                          <TableHead>Specialty</TableHead>
                          <TableHead>Applied On</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {apps.map((application) => (
                          <TableRow 
                            key={application.id}
                            className={application.status === "hired" ? "bg-green-50 dark:bg-green-900/20" : ""}
                          >
                            <TableCell className="font-medium">
                              {application.staff?.firstName} {application.staff?.lastName}
                            </TableCell>
                            <TableCell>{application.staff?.specialty}</TableCell>
                            <TableCell>{new Date(application.appliedAt).toLocaleDateString()}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {application.status === "pending" && <Clock className="h-4 w-4 text-yellow-500" />}
                                {application.status === "reviewed" && <Clock className="h-4 w-4 text-blue-500" />}
                                {application.status === "interview_completed" && <Users className="h-4 w-4 text-purple-500" />}
                                {application.status === "hired" && <CheckCircle className="h-4 w-4 text-green-500" />}
                                {application.status === "rejected" && <XCircle className="h-4 w-4 text-red-500" />}
                                <span className="capitalize">{application.status.replace('_', ' ')}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                {application.status === "pending" && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => updateApplicationMutation.mutate({ id: application.id, status: "reviewed" })}
                                    >
                                      Accept
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => updateApplicationMutation.mutate({ id: application.id, status: "rejected" })}
                                    >
                                      Reject
                                    </Button>
                                  </>
                                )}
                                {application.status === "reviewed" && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleScheduleInterview(application)}
                                  >
                                    <Calendar className="h-4 w-4 mr-2" />
                                    Schedule Interview
                                  </Button>
                                )}
                                {application.status === "interview_completed" && (
                                  <Button
                                    size="sm"
                                    variant="default"
                                    onClick={() => updateApplicationMutation.mutate({ id: application.id, status: "hired" })}
                                  >
                                    <UserPlus className="h-4 w-4 mr-2" />
                                    Hire
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>

      {/* Create/Edit Modal */}
      <Dialog open={showCreateModal || showEditModal} onOpenChange={(open) => {
        if (!open) {
          setShowCreateModal(false);
          setShowEditModal(false);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{showEditModal ? "Edit Job Posting" : "Create Job Posting"}</DialogTitle>
            <DialogDescription>
              {showEditModal ? "Update the details of your job posting" : "Fill in the details for your new job posting"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Job Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Registered Nurse - ICU"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the role and responsibilities..."
                rows={4}
              />
            </div>
            <div>
              <Label htmlFor="requirements">Requirements (one per line)</Label>
              <Textarea
                id="requirements"
                value={formData.requirements}
                onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                placeholder="Valid RN license&#10;2+ years ICU experience&#10;BLS certification"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="schedule">Schedule Type</Label>
                <Select
                  value={formData.scheduleType}
                  onValueChange={(value) => setFormData({ ...formData, scheduleType: value })}
                >
                  <SelectTrigger id="schedule">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Full-time">Full-time</SelectItem>
                    <SelectItem value="Part-time">Part-time</SelectItem>
                    <SelectItem value="Per Diem">Per Diem</SelectItem>
                    <SelectItem value="Contract">Contract</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="payRate">Hourly Rate ($)</Label>
                <Input
                  id="payRate"
                  type="number"
                  step="0.01"
                  value={formData.payRate}
                  onChange={(e) => setFormData({ ...formData, payRate: e.target.value })}
                  placeholder="45.00"
                />
              </div>
            </div>
            {showEditModal && (
              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="filled">Filled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateModal(false);
                setShowEditModal(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (showEditModal && selectedPosting) {
                  updateMutation.mutate({ id: selectedPosting.id, data: formData });
                } else {
                  createMutation.mutate(formData);
                }
              }}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {showEditModal ? "Update" : "Create"} Posting
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Interview Modal */}
      <Dialog open={showInterviewModal} onOpenChange={setShowInterviewModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Interview</DialogTitle>
            <DialogDescription>
              Schedule an interview with {selectedApplication?.staff?.firstName} {selectedApplication?.staff?.lastName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="start">Start Date & Time</Label>
              <Input
                id="start"
                type="datetime-local"
                value={interviewData.scheduledStart}
                onChange={(e) => setInterviewData({ ...interviewData, scheduledStart: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="end">End Date & Time</Label>
              <Input
                id="end"
                type="datetime-local"
                value={interviewData.scheduledEnd}
                onChange={(e) => setInterviewData({ ...interviewData, scheduledEnd: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="meetingUrl">Meeting URL (optional)</Label>
              <Input
                id="meetingUrl"
                type="url"
                value={interviewData.meetingUrl}
                onChange={(e) => setInterviewData({ ...interviewData, meetingUrl: e.target.value })}
                placeholder="https://zoom.us/j/..."
              />
            </div>
            <div>
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                value={interviewData.notes}
                onChange={(e) => setInterviewData({ ...interviewData, notes: e.target.value })}
                placeholder="Interview notes or instructions..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInterviewModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleInterviewSubmit}
              disabled={scheduleInterviewMutation.isPending || !interviewData.scheduledStart || !interviewData.scheduledEnd}
            >
              Schedule Interview
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}