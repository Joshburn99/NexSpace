import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { SidebarNav } from "@/components/ui/sidebar-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, MapPin, Clock, DollarSign, Plus, Briefcase } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertJobSchema, insertJobApplicationSchema, type Job, UserRole } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const jobApplicationFormSchema = insertJobApplicationSchema.extend({
  coverLetter: z.string().min(50, "Cover letter must be at least 50 characters"),
});

const jobFormSchema = insertJobSchema.extend({
  requirements: z.string().transform(val => val.split('\n').filter(r => r.trim())),
});

export default function JobBoard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [sidebarExpanded, setSidebarExpanded] = useState(false);

  // Fetch jobs
  const { data: jobs = [], isLoading } = useQuery<Job[]>({
    queryKey: ["/api/jobs"],
  });

  // Job application mutation
  const applyMutation = useMutation({
    mutationFn: async ({ jobId, data }: { jobId: number; data: any }) => {
      const res = await apiRequest("POST", `/api/jobs/${jobId}/apply`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Application Submitted",
        description: "Your job application has been submitted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
    },
  });

  // Job creation mutation
  const createJobMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/jobs", data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Job Posted",
        description: "Your job posting has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
    },
  });

  const applicationForm = useForm({
    resolver: zodResolver(jobApplicationFormSchema),
    defaultValues: {
      jobId: 0,
      applicantId: user?.id || 0,
      coverLetter: "",
      resume: "",
    },
  });

  const jobForm = useForm({
    resolver: zodResolver(jobFormSchema),
    defaultValues: {
      title: "",
      description: "",
      department: "",
      payRateMin: "0",
      payRateMax: "0",
      jobType: "full-time",
      requirements: "",
    },
  });

  const handleApply = (jobId: number, data: any) => {
    applyMutation.mutate({ jobId, data: { ...data, jobId } });
  };

  const handleCreateJob = (data: any) => {
    createJobMutation.mutate(data);
  };

  // Filter jobs
  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         job.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = selectedDepartment === "all" || job.department === selectedDepartment;
    return matchesSearch && matchesDepartment;
  });

  const canPostJobs = user?.role === UserRole.FACILITY_MANAGER || 
                     user?.role === UserRole.CLIENT_ADMINISTRATOR || 
                     user?.role === UserRole.SUPER_ADMIN;

  if (!user) return null;

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <SidebarNav 
        user={user} 
        expanded={sidebarExpanded}
        onToggle={() => setSidebarExpanded(!sidebarExpanded)}
      />

      {/* Main Content */}
      <main className="flex-1 overflow-x-hidden overflow-y-auto">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Job Board</h1>
              <p className="text-sm text-gray-500">
                Discover healthcare opportunities and connect with top facilities
              </p>
            </div>
            
            {canPostJobs && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Post New Job
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Post New Job</DialogTitle>
                    <DialogDescription>
                      Create a new job posting to attract qualified healthcare professionals.
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...jobForm}>
                    <form onSubmit={jobForm.handleSubmit(handleCreateJob)} className="space-y-4">
                      <FormField
                        control={jobForm.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Job Title</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., Registered Nurse - ICU" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={jobForm.control}
                        name="department"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Department</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select department" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="ICU">ICU</SelectItem>
                                <SelectItem value="Emergency">Emergency</SelectItem>
                                <SelectItem value="Medical/Surgical">Medical/Surgical</SelectItem>
                                <SelectItem value="Pediatrics">Pediatrics</SelectItem>
                                <SelectItem value="Oncology">Oncology</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={jobForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Job Description</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Describe the role, responsibilities, and requirements..."
                                className="min-h-[100px]"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={jobForm.control}
                          name="payRateMin"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Min Pay Rate ($/hour)</FormLabel>
                              <FormControl>
                                <Input type="number" placeholder="45" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={jobForm.control}
                          name="payRateMax"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Max Pay Rate ($/hour)</FormLabel>
                              <FormControl>
                                <Input type="number" placeholder="65" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={jobForm.control}
                        name="jobType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Job Type</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="full-time">Full-time</SelectItem>
                                <SelectItem value="part-time">Part-time</SelectItem>
                                <SelectItem value="contract">Contract</SelectItem>
                                <SelectItem value="temporary">Temporary</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={jobForm.control}
                        name="requirements"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Requirements (one per line)</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="BSN required&#10;2+ years ICU experience&#10;BLS certification"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex justify-end space-x-2">
                        <Button type="button" variant="outline" onClick={() => jobForm.reset()}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={createJobMutation.isPending}>
                          {createJobMutation.isPending ? "Posting..." : "Post Job"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </header>

        {/* Content */}
        <div className="p-6">
          {/* Search and Filters */}
          <div className="mb-6 flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search jobs by title, description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                <SelectItem value="ICU">ICU</SelectItem>
                <SelectItem value="Emergency">Emergency</SelectItem>
                <SelectItem value="Medical/Surgical">Medical/Surgical</SelectItem>
                <SelectItem value="Pediatrics">Pediatrics</SelectItem>
                <SelectItem value="Oncology">Oncology</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Job Listings */}
          {isLoading ? (
            <div className="grid gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
                    <div className="h-16 bg-gray-200 rounded mb-4"></div>
                    <div className="flex justify-between items-center">
                      <div className="h-8 bg-gray-200 rounded w-24"></div>
                      <div className="h-8 bg-gray-200 rounded w-20"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredJobs.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No jobs found</h3>
                    <p className="text-gray-500">
                      {searchTerm || selectedDepartment !== "all" 
                        ? "Try adjusting your search criteria" 
                        : "Check back later for new opportunities"}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                filteredJobs.map((job) => (
                  <Card key={job.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 mb-1">
                            {job.title}
                          </h3>
                          <p className="text-sm text-gray-500 mb-2">
                            Posted {new Date(job.createdAt!).toLocaleDateString()}
                          </p>
                          
                          <div className="flex flex-wrap gap-4 mb-3 text-sm text-gray-600">
                            {job.department && (
                              <div className="flex items-center">
                                <MapPin className="h-4 w-4 mr-1" />
                                {job.department}
                              </div>
                            )}
                            <div className="flex items-center">
                              <Clock className="h-4 w-4 mr-1" />
                              {job.jobType}
                            </div>
                            {job.payRateMin && job.payRateMax && (
                              <div className="flex items-center">
                                <DollarSign className="h-4 w-4 mr-1" />
                                ${job.payRateMin}-${job.payRateMax}/hour
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <Badge variant={job.isActive ? "default" : "secondary"}>
                          {job.isActive ? "Active" : "Closed"}
                        </Badge>
                      </div>

                      {job.description && (
                        <p className="text-gray-700 mb-4 line-clamp-3">
                          {job.description}
                        </p>
                      )}

                      {job.requirements && job.requirements.length > 0 && (
                        <div className="mb-4">
                          <h4 className="text-sm font-medium text-gray-900 mb-2">Requirements:</h4>
                          <ul className="text-sm text-gray-600 space-y-1">
                            {job.requirements.slice(0, 3).map((req, index) => (
                              <li key={index} className="flex items-start">
                                <span className="w-1 h-1 bg-gray-400 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                                {req}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="flex justify-between items-center">
                        <div className="text-sm text-gray-500">
                          {/* Application count would go here */}
                        </div>
                        
                        {job.isActive && (user?.role === UserRole.INTERNAL_EMPLOYEE || user?.role === UserRole.CONTRACTOR_1099) && (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                onClick={() => applicationForm.setValue("jobId", job.id)}
                                className="bg-blue-600 hover:bg-blue-700"
                              >
                                Apply Now
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Apply for {job.title}</DialogTitle>
                                <DialogDescription>
                                  Submit your application with a cover letter.
                                </DialogDescription>
                              </DialogHeader>
                              <Form {...applicationForm}>
                                <form onSubmit={applicationForm.handleSubmit((data) => handleApply(job.id, data))} className="space-y-4">
                                  <FormField
                                    control={applicationForm.control}
                                    name="coverLetter"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Cover Letter</FormLabel>
                                        <FormControl>
                                          <Textarea 
                                            placeholder="Explain why you're interested in this position and what qualifications you bring..."
                                            className="min-h-[120px]"
                                            {...field} 
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />

                                  <FormField
                                    control={applicationForm.control}
                                    name="resume"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Resume URL (optional)</FormLabel>
                                        <FormControl>
                                          <Input 
                                            placeholder="https://example.com/resume.pdf"
                                            {...field} 
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />

                                  <div className="flex justify-end space-x-2">
                                    <Button type="button" variant="outline">
                                      Cancel
                                    </Button>
                                    <Button type="submit" disabled={applyMutation.isPending}>
                                      {applyMutation.isPending ? "Submitting..." : "Submit Application"}
                                    </Button>
                                  </div>
                                </form>
                              </Form>
                            </DialogContent>
                          </Dialog>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
