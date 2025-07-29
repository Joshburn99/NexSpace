import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Briefcase, DollarSign, Calendar, MapPin, Search, Upload } from "lucide-react";
import type { JobPosting } from "@shared/schema/job";

export default function JobBoardPage() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [facilityFilter, setFacilityFilter] = useState("all");
  const [payRateFilter, setPayRateFilter] = useState("all");
  const [selectedJob, setSelectedJob] = useState<JobPosting | null>(null);
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeUrl, setResumeUrl] = useState<string>("");

  // Fetch job postings
  const { data: jobPostings = [], isLoading } = useQuery<JobPosting[]>({
    queryKey: ["/api/job-postings", "active"],
    queryFn: async () => {
      const response = await fetch("/api/job-postings?status=active");
      if (!response.ok) throw new Error("Failed to fetch job postings");
      return response.json();
    },
  });

  // Fetch facilities for filter
  const { data: facilities = [] } = useQuery<any[]>({
    queryKey: ["/api/facilities"],
  });

  // Apply for job mutation
  const applyMutation = useMutation({
    mutationFn: async (data: { jobPostingId: number; coverLetter: string; resumeUrl: string }) => {
      const response = await fetch("/api/job-applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to submit application");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Application submitted!",
        description: "Your application has been sent to the employer.",
      });
      setShowApplyForm(false);
      setSelectedJob(null);
      setCoverLetter("");
      setResumeFile(null);
      setResumeUrl("");
    },
    onError: (error: Error) => {
      toast({
        title: "Application failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Upload file mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error("Failed to upload file");
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setResumeUrl(data.url);
      toast({
        title: "Resume uploaded",
        description: "Your resume has been uploaded successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Upload failed",
        description: "Failed to upload resume. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Filter job postings
  const filteredJobs = jobPostings.filter((job) => {
    const matchesSearch = job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         job.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFacility = facilityFilter === "all" || job.facilityId.toString() === facilityFilter;
    const matchesPayRate = payRateFilter === "all" ||
      (payRateFilter === "under30" && Number(job.payRate) < 30) ||
      (payRateFilter === "30to50" && Number(job.payRate) >= 30 && Number(job.payRate) <= 50) ||
      (payRateFilter === "above50" && Number(job.payRate) > 50);
    
    return matchesSearch && matchesFacility && matchesPayRate;
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setResumeFile(file);
      uploadMutation.mutate(file);
    }
  };

  const handleApply = () => {
    if (!selectedJob || !coverLetter || !resumeUrl) {
      toast({
        title: "Missing information",
        description: "Please provide a cover letter and upload your resume.",
        variant: "destructive",
      });
      return;
    }

    applyMutation.mutate({
      jobPostingId: selectedJob.id,
      coverLetter,
      resumeUrl,
    });
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Job Board</h1>
        <p className="text-muted-foreground">Find your next opportunity in healthcare</p>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <Input
            type="text"
            placeholder="Search jobs by title or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="facility-filter">Facility</Label>
            <Select value={facilityFilter} onValueChange={setFacilityFilter}>
              <SelectTrigger id="facility-filter">
                <SelectValue placeholder="All facilities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All facilities</SelectItem>
                {facilities.map((facility) => (
                  <SelectItem key={facility.id} value={facility.id.toString()}>
                    {facility.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="pay-filter">Pay Rate</Label>
            <Select value={payRateFilter} onValueChange={setPayRateFilter}>
              <SelectTrigger id="pay-filter">
                <SelectValue placeholder="All pay rates" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All pay rates</SelectItem>
                <SelectItem value="under30">Under $30/hr</SelectItem>
                <SelectItem value="30to50">$30-50/hr</SelectItem>
                <SelectItem value="above50">Above $50/hr</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Job Cards Grid */}
      {isLoading ? (
        <div className="text-center py-8">Loading job postings...</div>
      ) : filteredJobs.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No job postings found matching your criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredJobs.map((job) => (
            <Card
              key={job.id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => setSelectedJob(job)}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  {job.title}
                </CardTitle>
                <CardDescription>{job.scheduleType}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {job.description}
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="h-4 w-4" />
                    ${Number(job.payRate).toFixed(2)}/hr
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4" />
                    Facility {job.facilityId}
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4" />
                    Posted {job.createdAt ? new Date(job.createdAt).toLocaleDateString() : 'Recently'}
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full">View Details</Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Job Details Modal */}
      <Dialog open={!!selectedJob && !showApplyForm} onOpenChange={(open) => !open && setSelectedJob(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl">{selectedJob?.title}</DialogTitle>
            <DialogDescription>{selectedJob?.scheduleType}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-sm">{selectedJob?.description}</p>
            </div>
            {selectedJob?.requirements && (
              <div>
                <h3 className="font-semibold mb-2">Requirements</h3>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {Object.entries(selectedJob.requirements).map(([key, value]) => (
                    <li key={key}>
                      <strong>{key}:</strong> {Array.isArray(value) ? value.join(", ") : value}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                <strong>${Number(selectedJob?.payRate).toFixed(2)}/hr</strong>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Posted {selectedJob?.createdAt ? new Date(selectedJob.createdAt).toLocaleDateString() : 'Recently'}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedJob(null)}>
              Close
            </Button>
            <Button onClick={() => setShowApplyForm(true)}>
              Apply Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Apply Form Modal */}
      <Dialog open={showApplyForm} onOpenChange={setShowApplyForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Apply for {selectedJob?.title}</DialogTitle>
            <DialogDescription>
              Submit your application for this position
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="cover-letter">Cover Letter</Label>
              <Textarea
                id="cover-letter"
                placeholder="Tell us why you're interested in this position..."
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
                rows={6}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="resume">Resume</Label>
              <div className="mt-1">
                <Input
                  id="resume"
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileChange}
                  className="cursor-pointer"
                />
                {uploadMutation.isPending && (
                  <p className="text-sm text-muted-foreground mt-2">Uploading resume...</p>
                )}
                {resumeUrl && (
                  <p className="text-sm text-green-600 mt-2">Resume uploaded successfully!</p>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApplyForm(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleApply}
              disabled={applyMutation.isPending || uploadMutation.isPending || !coverLetter || !resumeUrl}
            >
              {applyMutation.isPending ? "Submitting..." : "Submit Application"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}