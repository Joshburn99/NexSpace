import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { SidebarNav } from "@/components/ui/sidebar-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, MapPin, Clock, DollarSign, Plus, Briefcase, Users, Star, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { UserRole } from "@shared/schema";
import { hasPermission } from "@/lib/permissions";

interface JobPosting {
  id: number;
  title: string;
  description: string;
  department: string;
  payRateMin: number;
  payRateMax: number;
  jobType: 'full-time' | 'part-time' | 'contract';
  requirements: string[];
  isActive: boolean;
  applicationsCount: number;
  postedDate: string;
  urgency: 'low' | 'medium' | 'high';
}

interface JobApplication {
  id: number;
  jobId: number;
  applicantName: string;
  applicantEmail: string;
  status: 'pending' | 'reviewed' | 'accepted' | 'rejected';
  coverLetter: string;
  appliedAt: string;
  rating: number;
}

// Comprehensive job postings for 100-bed skilled nursing facility
const mockJobPostings: JobPosting[] = [
  {
    id: 1,
    title: 'Registered Nurse - ICU (Day Shift)',
    description: 'Join our award-winning 20-bed ICU providing critical care to our most vulnerable patients. We offer competitive compensation, excellent benefits, and opportunities for professional growth in a state-of-the-art facility.',
    department: 'Intensive Care Unit',
    payRateMin: 40,
    payRateMax: 48,
    jobType: 'full-time',
    requirements: ['Current FL RN License', 'ICU Experience (2+ years)', 'BLS & ACLS Certification', 'Critical Care Experience'],
    isActive: true,
    applicationsCount: 12,
    postedDate: '2024-12-15',
    urgency: 'high'
  },
  {
    id: 2,
    title: 'Licensed Practical Nurse - Med-Surg',
    description: 'Support our 35-bed Medical-Surgical unit providing comprehensive care to adult patients. Excellent opportunity for career advancement with mentorship programs and continuing education support.',
    department: 'Medical-Surgical',
    payRateMin: 24,
    payRateMax: 28,
    jobType: 'full-time',
    requirements: ['Current FL LPN License', 'Med-Surg Experience', 'Medication Administration Skills', 'Team-oriented'],
    isActive: true,
    applicationsCount: 8,
    postedDate: '2024-12-12',
    urgency: 'medium'
  },
  {
    id: 3,
    title: 'Certified Nursing Assistant - Memory Care',
    description: 'Provide compassionate care to residents in our specialized 25-bed Memory Care unit. Training provided for dementia-specific care approaches including validation therapy and person-centered care.',
    department: 'Memory Care',
    payRateMin: 16,
    payRateMax: 20,
    jobType: 'full-time',
    requirements: ['Current CNA Certification', 'Dementia Care Experience Preferred', 'Patience and Compassion', 'Physical Stamina'],
    isActive: true,
    applicationsCount: 15,
    postedDate: '2024-12-10',
    urgency: 'high'
  },
  {
    id: 4,
    title: 'Physical Therapist - Rehabilitation',
    description: 'Lead our 20-bed Rehabilitation unit helping patients regain independence. Modern equipment and collaborative team environment with focus on evidence-based practice and patient outcomes.',
    department: 'Rehabilitation',
    payRateMin: 35,
    payRateMax: 42,
    jobType: 'full-time',
    requirements: ['FL PT License', 'SNF Experience', 'Medicare/Medicaid Knowledge', 'Electronic Documentation'],
    isActive: true,
    applicationsCount: 5,
    postedDate: '2024-12-08',
    urgency: 'medium'
  },
  {
    id: 5,
    title: 'Travel Nurse - ICU (13-week Assignment)',
    description: 'Immediate opening for experienced ICU nurse. Competitive travel rates, housing stipend, and comprehensive benefits package. Join our team for a rewarding temporary assignment.',
    department: 'Intensive Care Unit',
    payRateMin: 55,
    payRateMax: 70,
    jobType: 'contract',
    requirements: ['Multi-state Compact License', 'ICU Experience (3+ years)', 'Travel Experience', 'Flexibility'],
    isActive: true,
    applicationsCount: 7,
    postedDate: '2024-12-16',
    urgency: 'high'
  },
  {
    id: 6,
    title: 'Weekend RN - Float Pool',
    description: 'Weekend position floating between all units. Premium weekend differential. Perfect for work-life balance while maintaining clinical skills across multiple specialties.',
    department: 'Float Pool',
    payRateMin: 45,
    payRateMax: 52,
    jobType: 'part-time',
    requirements: ['FL RN License', 'Multi-unit Experience', 'Adaptability', 'Weekend Availability'],
    isActive: true,
    applicationsCount: 3,
    postedDate: '2024-12-14',
    urgency: 'low'
  },
  {
    id: 7,
    title: 'Occupational Therapist - PRN',
    description: 'Per diem position providing occupational therapy services across all units. Flexible scheduling with competitive hourly rates for experienced therapists.',
    department: 'Rehabilitation',
    payRateMin: 38,
    payRateMax: 45,
    jobType: 'part-time',
    requirements: ['FL OT License', 'SNF Experience', 'ADL Assessment Skills', 'Documentation Proficiency'],
    isActive: true,
    applicationsCount: 2,
    postedDate: '2024-12-11',
    urgency: 'low'
  },
  {
    id: 8,
    title: 'Night Shift Supervisor - RN',
    description: 'Lead our night shift operations across all units. Supervisory experience required. Excellent opportunity for leadership development with management support.',
    department: 'Administration',
    payRateMin: 48,
    payRateMax: 55,
    jobType: 'full-time',
    requirements: ['FL RN License', 'Supervisory Experience (2+ years)', 'Leadership Skills', 'Night Shift Experience'],
    isActive: true,
    applicationsCount: 4,
    postedDate: '2024-12-13',
    urgency: 'high'
  }
];

const mockApplications: JobApplication[] = [
  {
    id: 1,
    jobId: 1,
    applicantName: 'Jennifer Smith',
    applicantEmail: 'jennifer.smith@email.com',
    status: 'pending',
    coverLetter: 'I am excited to apply for the ICU RN position. With 5 years of critical care experience...',
    appliedAt: '2024-12-17 09:30 AM',
    rating: 4.5
  },
  {
    id: 2,
    jobId: 1,
    applicantName: 'Robert Johnson',
    applicantEmail: 'robert.johnson@email.com',
    status: 'reviewed',
    coverLetter: 'As a seasoned ICU nurse with extensive experience in level 1 trauma centers...',
    appliedAt: '2024-12-16 02:15 PM',
    rating: 4.8
  },
  {
    id: 3,
    jobId: 3,
    applicantName: 'Maria Garcia',
    applicantEmail: 'maria.garcia@email.com',
    status: 'accepted',
    coverLetter: 'I have a passion for working with memory care residents and their families...',
    appliedAt: '2024-12-15 11:45 AM',
    rating: 4.9
  }
];

export default function EnhancedJobBoard() {
  const { user } = useAuth();
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [selectedJobType, setSelectedJobType] = useState<string>("all");
  const [jobPostings, setJobPostings] = useState<JobPosting[]>(mockJobPostings);
  const [applications, setApplications] = useState<JobApplication[]>(mockApplications);
  const [isCreateJobOpen, setIsCreateJobOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobPosting | null>(null);
  const [isApplicationDialogOpen, setIsApplicationDialogOpen] = useState(false);

  // New job form
  const [newJob, setNewJob] = useState({
    title: '',
    description: '',
    department: '',
    payRateMin: '',
    payRateMax: '',
    jobType: 'full-time' as const,
    requirements: ''
  });

  // Application form
  const [applicationForm, setApplicationForm] = useState({
    coverLetter: '',
    resume: ''
  });

  if (!user) return null;

  const canCreateJobs = hasPermission(user.role as UserRole, 'jobs.create');
  const canViewApplications = hasPermission(user.role as UserRole, 'jobs.view_applications');

  const filteredJobs = jobPostings.filter(job => {
    const matchesSearch = job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         job.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = selectedDepartment === 'all' || job.department === selectedDepartment;
    const matchesJobType = selectedJobType === 'all' || job.jobType === selectedJobType;
    
    return matchesSearch && matchesDepartment && matchesJobType && job.isActive;
  });

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getJobTypeColor = (jobType: string) => {
    switch (jobType) {
      case 'full-time': return 'bg-blue-100 text-blue-800';
      case 'part-time': return 'bg-purple-100 text-purple-800';
      case 'contract': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleCreateJob = () => {
    if (!newJob.title || !newJob.description || !newJob.department) {
      return;
    }

    const job: JobPosting = {
      id: jobPostings.length + 1,
      title: newJob.title,
      description: newJob.description,
      department: newJob.department,
      payRateMin: parseFloat(newJob.payRateMin) || 0,
      payRateMax: parseFloat(newJob.payRateMax) || 0,
      jobType: newJob.jobType,
      requirements: newJob.requirements.split('\n').filter(r => r.trim()),
      isActive: true,
      applicationsCount: 0,
      postedDate: new Date().toISOString().split('T')[0],
      urgency: 'medium'
    };

    setJobPostings(prev => [job, ...prev]);
    setIsCreateJobOpen(false);
    setNewJob({
      title: '',
      description: '',
      department: '',
      payRateMin: '',
      payRateMax: '',
      jobType: 'full-time',
      requirements: ''
    });
  };

  const handleApplyToJob = () => {
    if (!selectedJob || !applicationForm.coverLetter) {
      return;
    }

    const application: JobApplication = {
      id: applications.length + 1,
      jobId: selectedJob.id,
      applicantName: `${user.firstName} ${user.lastName}`,
      applicantEmail: user.email,
      status: 'pending',
      coverLetter: applicationForm.coverLetter,
      appliedAt: new Date().toLocaleString(),
      rating: 0
    };

    setApplications(prev => [application, ...prev]);
    setJobPostings(prev => prev.map(job => 
      job.id === selectedJob.id 
        ? { ...job, applicationsCount: job.applicationsCount + 1 }
        : job
    ));
    
    setIsApplicationDialogOpen(false);
    setApplicationForm({ coverLetter: '', resume: '' });
  };

  const departments = Array.from(new Set(jobPostings.map(job => job.department)));

  return (
    <div className="flex h-screen bg-gray-50">
      <SidebarNav 
        user={user} 
        expanded={sidebarExpanded}
        onToggle={() => setSidebarExpanded(!sidebarExpanded)}
      />

      <main className="flex-1 overflow-x-hidden overflow-y-auto">
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Hiring Center</h2>
              <p className="text-sm text-gray-500">
                Healthcare staffing opportunities at Willowbrook SNF
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              {canCreateJobs && (
                <Dialog open={isCreateJobOpen} onOpenChange={setIsCreateJobOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Post New Job
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Create Job Posting</DialogTitle>
                      <DialogDescription>
                        Post a new position for your facility
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <Label htmlFor="jobTitle">Job Title *</Label>
                        <Input
                          id="jobTitle"
                          value={newJob.title}
                          onChange={(e) => setNewJob(prev => ({ ...prev, title: e.target.value }))}
                          placeholder="e.g., Registered Nurse - ICU"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="department">Department *</Label>
                        <Select value={newJob.department} onValueChange={(value) => setNewJob(prev => ({ ...prev, department: value }))}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select department" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Intensive Care Unit">Intensive Care Unit</SelectItem>
                            <SelectItem value="Medical-Surgical">Medical-Surgical</SelectItem>
                            <SelectItem value="Memory Care">Memory Care</SelectItem>
                            <SelectItem value="Rehabilitation">Rehabilitation</SelectItem>
                            <SelectItem value="Administration">Administration</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label htmlFor="jobType">Job Type</Label>
                        <Select value={newJob.jobType} onValueChange={(value: 'full-time' | 'part-time' | 'contract') => setNewJob(prev => ({ ...prev, jobType: value }))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="full-time">Full-time</SelectItem>
                            <SelectItem value="part-time">Part-time</SelectItem>
                            <SelectItem value="contract">Contract</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label htmlFor="payMin">Min Pay Rate ($/hr)</Label>
                        <Input
                          id="payMin"
                          type="number"
                          value={newJob.payRateMin}
                          onChange={(e) => setNewJob(prev => ({ ...prev, payRateMin: e.target.value }))}
                          placeholder="25.00"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="payMax">Max Pay Rate ($/hr)</Label>
                        <Input
                          id="payMax"
                          type="number"
                          value={newJob.payRateMax}
                          onChange={(e) => setNewJob(prev => ({ ...prev, payRateMax: e.target.value }))}
                          placeholder="35.00"
                        />
                      </div>
                      
                      <div className="md:col-span-2">
                        <Label htmlFor="description">Job Description *</Label>
                        <Textarea
                          id="description"
                          value={newJob.description}
                          onChange={(e) => setNewJob(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Describe the position, responsibilities, and what makes this opportunity special..."
                          rows={4}
                        />
                      </div>
                      
                      <div className="md:col-span-2">
                        <Label htmlFor="requirements">Requirements (one per line)</Label>
                        <Textarea
                          id="requirements"
                          value={newJob.requirements}
                          onChange={(e) => setNewJob(prev => ({ ...prev, requirements: e.target.value }))}
                          placeholder="Current FL RN License&#10;ICU Experience (2+ years)&#10;BLS & ACLS Certification"
                          rows={4}
                        />
                      </div>
                    </div>
                    
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => setIsCreateJobOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreateJob}>
                        Post Job
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
        </header>

        <div className="p-6">
          {/* Search and Filters */}
          <div className="mb-6 flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <Input
                  type="text"
                  placeholder="Search positions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div>
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map(dept => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Select value={selectedJobType} onValueChange={setSelectedJobType}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="full-time">Full-time</SelectItem>
                  <SelectItem value="part-time">Part-time</SelectItem>
                  <SelectItem value="contract">Contract</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Job Listings */}
          <div className="grid gap-6">
            {filteredJobs.map((job) => (
              <Card key={job.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <CardTitle className="text-xl">{job.title}</CardTitle>
                        <Badge className={getJobTypeColor(job.jobType)}>
                          {job.jobType.charAt(0).toUpperCase() + job.jobType.slice(1)}
                        </Badge>
                        <Badge className={getUrgencyColor(job.urgency)}>
                          {job.urgency.charAt(0).toUpperCase() + job.urgency.slice(1)} Priority
                        </Badge>
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span className="flex items-center space-x-1">
                          <MapPin className="w-4 h-4" />
                          <span>{job.department}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <DollarSign className="w-4 h-4" />
                          <span>${job.payRateMin} - ${job.payRateMax}/hr</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <Clock className="w-4 h-4" />
                          <span>Posted {job.postedDate}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <Users className="w-4 h-4" />
                          <span>{job.applicationsCount} applicants</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <CardDescription className="mb-4 text-base">
                    {job.description}
                  </CardDescription>
                  
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-medium text-sm mb-2">Requirements:</h4>
                      <div className="flex flex-wrap gap-2">
                        {job.requirements.map((req, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {req}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between pt-4 border-t">
                      <div className="flex items-center space-x-2">
                        <Briefcase className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          Willowbrook Skilled Nursing & Rehabilitation
                        </span>
                      </div>
                      
                      <div className="flex space-x-2">
                        {canViewApplications && (
                          <Button variant="outline" size="sm">
                            <Eye className="w-4 h-4 mr-1" />
                            View Applications ({job.applicationsCount})
                          </Button>
                        )}
                        
                        <Dialog open={isApplicationDialogOpen} onOpenChange={setIsApplicationDialogOpen}>
                          <DialogTrigger asChild>
                            <Button 
                              size="sm"
                              onClick={() => setSelectedJob(job)}
                            >
                              Apply Now
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Apply for {selectedJob?.title}</DialogTitle>
                              <DialogDescription>
                                Submit your application for this position
                              </DialogDescription>
                            </DialogHeader>
                            
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="coverLetter">Cover Letter *</Label>
                                <Textarea
                                  id="coverLetter"
                                  value={applicationForm.coverLetter}
                                  onChange={(e) => setApplicationForm(prev => ({ ...prev, coverLetter: e.target.value }))}
                                  placeholder="Tell us why you're interested in this position and what makes you a great fit..."
                                  rows={6}
                                />
                              </div>
                              
                              <div>
                                <Label htmlFor="resume">Resume/CV</Label>
                                <Input
                                  id="resume"
                                  type="file"
                                  accept=".pdf,.doc,.docx"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      setApplicationForm(prev => ({ ...prev, resume: file.name }));
                                    }
                                  }}
                                />
                              </div>
                            </div>
                            
                            <div className="flex justify-end space-x-2">
                              <Button variant="outline" onClick={() => setIsApplicationDialogOpen(false)}>
                                Cancel
                              </Button>
                              <Button onClick={handleApplyToJob}>
                                Submit Application
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {filteredJobs.length === 0 && (
              <Card className="p-12 text-center">
                <div className="text-gray-500">
                  <Briefcase className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium mb-2">No positions found</h3>
                  <p>Try adjusting your search criteria or check back later for new opportunities.</p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}