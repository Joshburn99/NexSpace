import { useState } from "react";
import { Plus, Briefcase, MapPin, DollarSign, Clock, Users, Calendar, Settings } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { AppLayout } from "@/components/ui/app-layout";
import { useToast } from "@/hooks/use-toast";

const jobTypes = [
  { value: "full_time", label: "Full-Time" },
  { value: "part_time", label: "Part-Time" },
  { value: "per_diem", label: "Per Diem" },
  { value: "contract", label: "Contract" },
  { value: "travel", label: "Travel Assignment" },
  { value: "temp_to_perm", label: "Temp-to-Permanent" }
];

const specialties = [
  "Medical/Surgical", "ICU/Critical Care", "Emergency Department", "Operating Room",
  "Labor & Delivery", "NICU", "Pediatrics", "Oncology", "Telemetry", "Step Down",
  "Rehabilitation", "Long Term Care", "Assisted Living", "Memory Care", "Home Health",
  "Hospice", "Mental Health", "Substance Abuse", "Dialysis", "Ambulatory Surgery"
];

const positions = [
  "Registered Nurse (RN)", "Licensed Practical Nurse (LPN)", "Certified Nursing Assistant (CNA)",
  "Physical Therapist (PT)", "Occupational Therapist (OT)", "Speech Language Pathologist (SLP)",
  "Respiratory Therapist", "Medical Technologist", "Radiology Technician", "Pharmacy Technician",
  "Social Worker", "Case Manager", "Unit Manager", "Charge Nurse", "Clinical Supervisor"
];

const shiftTypes = [
  { value: "days", label: "Days (7a-7p)" },
  { value: "nights", label: "Nights (7p-7a)" },
  { value: "rotating", label: "Rotating" },
  { value: "weekends", label: "Weekends Only" },
  { value: "flexible", label: "Flexible" }
];

const benefits = [
  "Health Insurance", "Dental Insurance", "Vision Insurance", "Life Insurance",
  "401(k) with Match", "Paid Time Off", "Sick Leave", "Holiday Pay",
  "Tuition Reimbursement", "CEU Allowance", "License Reimbursement",
  "Malpractice Insurance", "Flexible Scheduling", "Employee Assistance Program",
  "Wellness Programs", "Free Parking", "Meal Vouchers", "Referral Bonuses"
];

export default function EnhancedJobPostingPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("basic");

  const [jobData, setJobData] = useState({
    title: "",
    position: "",
    specialty: "",
    department: "",
    jobType: "",
    shiftType: "",
    description: "",
    requirements: "",
    hourlyRateMin: "",
    hourlyRateMax: "",
    annualSalaryMin: "",
    annualSalaryMax: "",
    experienceRequired: "",
    educationRequired: "",
    licensesRequired: [],
    certifications: [],
    benefits: [],
    startDate: "",
    endDate: "",
    numberOfPositions: "1",
    urgency: "normal",
    remote: false,
    onSiteParking: false,
    mealProvided: false,
    uniformProvided: false,
    equipment: [],
    specialRequirements: "",
    applicationDeadline: "",
    contactPerson: "",
    contactEmail: "",
    contactPhone: "",
    internalNotes: ""
  });

  const handleInputChange = (field: string, value: any) => {
    setJobData(prev => ({ ...prev, [field]: value }));
  };

  const handleArrayToggle = (field: string, value: string) => {
    setJobData(prev => ({
      ...prev,
      [field]: prev[field as keyof typeof prev].includes(value)
        ? (prev[field as keyof typeof prev] as string[]).filter(item => item !== value)
        : [...(prev[field as keyof typeof prev] as string[]), value]
    }));
  };

  const handleSubmit = () => {
    toast({
      title: "Job posting created successfully",
      description: "Your job posting is now live and visible to qualified candidates."
    });
  };

  return (
    <AppLayout>
      <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Create Job Posting</h1>
              <p className="text-gray-600 dark:text-gray-300">Post detailed job openings with comprehensive requirements and benefits</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline">Save as Draft</Button>
              <Button onClick={handleSubmit}>
                <Plus className="w-4 h-4 mr-2" />
                Publish Job
              </Button>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="details">Job Details</TabsTrigger>
              <TabsTrigger value="compensation">Compensation</TabsTrigger>
              <TabsTrigger value="requirements">Requirements</TabsTrigger>
              <TabsTrigger value="benefits">Benefits & Perks</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Basic Job Information</CardTitle>
                  <CardDescription>Essential details about the position</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Job Title *</Label>
                      <Input
                        id="title"
                        value={jobData.title}
                        onChange={(e) => handleInputChange("title", e.target.value)}
                        placeholder="e.g. Registered Nurse - ICU"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="position">Position Type *</Label>
                      <Select value={jobData.position} onValueChange={(value) => handleInputChange("position", value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select position" />
                        </SelectTrigger>
                        <SelectContent>
                          {positions.map(position => (
                            <SelectItem key={position} value={position}>{position}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="specialty">Specialty *</Label>
                      <Select value={jobData.specialty} onValueChange={(value) => handleInputChange("specialty", value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select specialty" />
                        </SelectTrigger>
                        <SelectContent>
                          {specialties.map(specialty => (
                            <SelectItem key={specialty} value={specialty}>{specialty}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="department">Department</Label>
                      <Input
                        id="department"
                        value={jobData.department}
                        onChange={(e) => handleInputChange("department", e.target.value)}
                        placeholder="e.g. Intensive Care Unit"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="numberOfPositions">Number of Positions</Label>
                      <Input
                        id="numberOfPositions"
                        type="number"
                        value={jobData.numberOfPositions}
                        onChange={(e) => handleInputChange("numberOfPositions", e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="jobType">Employment Type *</Label>
                      <Select value={jobData.jobType} onValueChange={(value) => handleInputChange("jobType", value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select job type" />
                        </SelectTrigger>
                        <SelectContent>
                          {jobTypes.map(type => (
                            <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="shiftType">Shift Type *</Label>
                      <Select value={jobData.shiftType} onValueChange={(value) => handleInputChange("shiftType", value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select shift" />
                        </SelectTrigger>
                        <SelectContent>
                          {shiftTypes.map(shift => (
                            <SelectItem key={shift.value} value={shift.value}>{shift.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="urgency">Urgency Level</Label>
                    <Select value={jobData.urgency} onValueChange={(value) => handleInputChange("urgency", value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low - Fill within 30 days</SelectItem>
                        <SelectItem value="normal">Normal - Fill within 2 weeks</SelectItem>
                        <SelectItem value="high">High - Fill within 1 week</SelectItem>
                        <SelectItem value="urgent">Urgent - Fill ASAP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="details" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Job Description & Responsibilities</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="description">Job Description *</Label>
                    <Textarea
                      id="description"
                      value={jobData.description}
                      onChange={(e) => handleInputChange("description", e.target.value)}
                      placeholder="Provide a detailed description of the role, responsibilities, and work environment..."
                      className="h-32"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="specialRequirements">Special Requirements</Label>
                    <Textarea
                      id="specialRequirements"
                      value={jobData.specialRequirements}
                      onChange={(e) => handleInputChange("specialRequirements", e.target.value)}
                      placeholder="Any special requirements, physical demands, or unique aspects of the role..."
                      className="h-24"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="startDate">Start Date</Label>
                      <Input
                        id="startDate"
                        type="date"
                        value={jobData.startDate}
                        onChange={(e) => handleInputChange("startDate", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="endDate">End Date (if temporary)</Label>
                      <Input
                        id="endDate"
                        type="date"
                        value={jobData.endDate}
                        onChange={(e) => handleInputChange("endDate", e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="applicationDeadline">Application Deadline</Label>
                    <Input
                      id="applicationDeadline"
                      type="date"
                      value={jobData.applicationDeadline}
                      onChange={(e) => handleInputChange("applicationDeadline", e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="compensation" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Compensation Details</CardTitle>
                  <CardDescription>Set competitive pay rates and compensation structure</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="hourlyRateMin">Hourly Rate - Minimum</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                          id="hourlyRateMin"
                          type="number"
                          value={jobData.hourlyRateMin}
                          onChange={(e) => handleInputChange("hourlyRateMin", e.target.value)}
                          placeholder="25.00"
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="hourlyRateMax">Hourly Rate - Maximum</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                          id="hourlyRateMax"
                          type="number"
                          value={jobData.hourlyRateMax}
                          onChange={(e) => handleInputChange("hourlyRateMax", e.target.value)}
                          placeholder="35.00"
                          className="pl-10"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="annualSalaryMin">Annual Salary - Minimum</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                          id="annualSalaryMin"
                          type="number"
                          value={jobData.annualSalaryMin}
                          onChange={(e) => handleInputChange("annualSalaryMin", e.target.value)}
                          placeholder="52000"
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="annualSalaryMax">Annual Salary - Maximum</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                          id="annualSalaryMax"
                          type="number"
                          value={jobData.annualSalaryMax}
                          onChange={(e) => handleInputChange("annualSalaryMax", e.target.value)}
                          placeholder="72800"
                          className="pl-10"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <h4 className="font-medium mb-2">Additional Compensation Options</h4>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox />
                        <label className="text-sm">Shift Differentials Available</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox />
                        <label className="text-sm">Weekend Premium Pay</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox />
                        <label className="text-sm">Holiday Pay (Time and Half)</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox />
                        <label className="text-sm">Overtime Opportunities</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox />
                        <label className="text-sm">Sign-On Bonus</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox />
                        <label className="text-sm">Retention Bonus</label>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="requirements" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Qualifications & Requirements</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="experienceRequired">Experience Required</Label>
                      <Select value={jobData.experienceRequired} onValueChange={(value) => handleInputChange("experienceRequired", value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select experience level" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="entry">Entry Level (0-1 years)</SelectItem>
                          <SelectItem value="mid">Mid Level (2-5 years)</SelectItem>
                          <SelectItem value="senior">Senior Level (5+ years)</SelectItem>
                          <SelectItem value="expert">Expert Level (10+ years)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="educationRequired">Education Required</Label>
                      <Select value={jobData.educationRequired} onValueChange={(value) => handleInputChange("educationRequired", value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select education level" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="high_school">High School Diploma</SelectItem>
                          <SelectItem value="certificate">Certificate Program</SelectItem>
                          <SelectItem value="associate">Associate Degree</SelectItem>
                          <SelectItem value="bachelor">Bachelor's Degree</SelectItem>
                          <SelectItem value="master">Master's Degree</SelectItem>
                          <SelectItem value="doctoral">Doctoral Degree</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Required Licenses</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {["RN License", "LPN License", "CNA License", "Physical Therapy License", "Occupational Therapy License", "Speech Therapy License"].map(license => (
                        <div key={license} className="flex items-center space-x-2">
                          <Checkbox
                            checked={jobData.licensesRequired.includes(license)}
                            onCheckedChange={() => handleArrayToggle("licensesRequired", license)}
                          />
                          <label className="text-sm">{license}</label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Required Certifications</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {["BLS", "ACLS", "PALS", "NRP", "CPR", "TNCC", "CPI", "First Aid"].map(cert => (
                        <div key={cert} className="flex items-center space-x-2">
                          <Checkbox
                            checked={jobData.certifications.includes(cert)}
                            onCheckedChange={() => handleArrayToggle("certifications", cert)}
                          />
                          <label className="text-sm">{cert}</label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="requirements">Additional Requirements</Label>
                    <Textarea
                      id="requirements"
                      value={jobData.requirements}
                      onChange={(e) => handleInputChange("requirements", e.target.value)}
                      placeholder="List any additional requirements, skills, or qualifications..."
                      className="h-24"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="benefits" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Benefits & Perks</CardTitle>
                  <CardDescription>Highlight what makes this position attractive</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Available Benefits</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {benefits.map(benefit => (
                        <div key={benefit} className="flex items-center space-x-2">
                          <Checkbox
                            checked={jobData.benefits.includes(benefit)}
                            onCheckedChange={() => handleArrayToggle("benefits", benefit)}
                          />
                          <label className="text-sm">{benefit}</label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Workplace Amenities</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={jobData.onSiteParking}
                          onCheckedChange={(checked) => handleInputChange("onSiteParking", checked)}
                        />
                        <label className="text-sm">Free On-Site Parking</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={jobData.mealProvided}
                          onCheckedChange={(checked) => handleInputChange("mealProvided", checked)}
                        />
                        <label className="text-sm">Meals Provided</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={jobData.uniformProvided}
                          onCheckedChange={(checked) => handleInputChange("uniformProvided", checked)}
                        />
                        <label className="text-sm">Uniforms Provided</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={jobData.remote}
                          onCheckedChange={(checked) => handleInputChange("remote", checked)}
                        />
                        <label className="text-sm">Remote Work Options</label>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="contactPerson">Contact Person</Label>
                      <Input
                        id="contactPerson"
                        value={jobData.contactPerson}
                        onChange={(e) => handleInputChange("contactPerson", e.target.value)}
                        placeholder="Hiring Manager Name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contactEmail">Contact Email</Label>
                      <Input
                        id="contactEmail"
                        type="email"
                        value={jobData.contactEmail}
                        onChange={(e) => handleInputChange("contactEmail", e.target.value)}
                        placeholder="hiring@facility.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contactPhone">Contact Phone</Label>
                      <Input
                        id="contactPhone"
                        type="tel"
                        value={jobData.contactPhone}
                        onChange={(e) => handleInputChange("contactPhone", e.target.value)}
                        placeholder="(555) 123-4567"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="internalNotes">Internal Notes (Not visible to applicants)</Label>
                    <Textarea
                      id="internalNotes"
                      value={jobData.internalNotes}
                      onChange={(e) => handleInputChange("internalNotes", e.target.value)}
                      placeholder="Internal notes for hiring team..."
                      className="h-20"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Job Preview */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Job Posting Preview</CardTitle>
              <CardDescription>How your job posting will appear to candidates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-bold">{jobData.title || "Job Title"}</h3>
                    <p className="text-gray-600 dark:text-gray-300">{jobData.position || "Position Type"}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {jobData.specialty || "Specialty"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {jobData.shiftType || "Shift Type"}
                      </span>
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-4 h-4" />
                        {jobData.hourlyRateMin && jobData.hourlyRateMax 
                          ? `$${jobData.hourlyRateMin}-${jobData.hourlyRateMax}/hr`
                          : "Competitive Pay"}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {jobData.urgency === "urgent" && <Badge className="bg-red-100 text-red-800">Urgent</Badge>}
                    {jobData.urgency === "high" && <Badge className="bg-orange-100 text-orange-800">High Priority</Badge>}
                    <Badge className="bg-blue-100 text-blue-800">{jobData.jobType || "Job Type"}</Badge>
                  </div>
                </div>
                {jobData.description && (
                  <p className="text-gray-700 dark:text-gray-300">{jobData.description}</p>
                )}
                {jobData.benefits.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Benefits Include:</h4>
                    <div className="flex flex-wrap gap-1">
                      {jobData.benefits.slice(0, 5).map(benefit => (
                        <Badge key={benefit} variant="secondary" className="text-xs">{benefit}</Badge>
                      ))}
                      {jobData.benefits.length > 5 && (
                        <Badge variant="secondary" className="text-xs">+{jobData.benefits.length - 5} more</Badge>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}