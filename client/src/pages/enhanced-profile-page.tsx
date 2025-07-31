import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useStaff } from "@/contexts/StaffContext";
import { useCredentialVerification } from "@/contexts/CredentialVerificationContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Award,
  CheckCircle,
  AlertTriangle,
  Edit,
  Save,
  X,
  Upload,
  FileText,
  Download,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function EnhancedProfilePage() {
  const { user } = useAuth();
  const { getStaffById, updateStaff } = useStaff();
  const { getVerifiedCredentials } = useCredentialVerification();

  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState({
    email: "",
    phone: "",
    firstName: "",
    lastName: "",
    bio: "",
    location: "",
    hourlyRate: "",
    experience: "",
    skills: [] as string[],
    certifications: [] as string[],
    resume: null as File | null,
    coverLetter: null as File | null,
    resumeUrl: "",
    coverLetterUrl: "",
    linkedIn: "",
    portfolio: "",
  });

  // Preset skill options for healthcare workers
  const availableSkills = [
    "Critical Care",
    "Patient Assessment",
    "IV Therapy",
    "Medication Administration",
    "Wound Care",
    "Emergency Response",
    "Patient Education",
    "Documentation",
    "Infection Control",
    "Pediatric Care",
    "Geriatric Care",
    "Mental Health",
    "Rehabilitation",
    "Surgical Assistance",
    "Cardiac Care",
    "Respiratory Care",
    "Dialysis",
    "Oncology",
    "Labor & Delivery",
    "Anesthesia",
    "Radiology",
    "Laboratory",
    "Pharmacy",
    "Physical Therapy",
    "Occupational Therapy",
    "Speech Therapy",
    "Case Management",
    "Quality Assurance",
    "Leadership",
    "Training & Education",
  ];

  const availableCertifications = [
    "RN (Registered Nurse)",
    "LPN (Licensed Practical Nurse)",
    "CNA (Certified Nursing Assistant)",
    "ACLS (Advanced Cardiac Life Support)",
    "BLS (Basic Life Support)",
    "CCRN (Critical Care Registered Nurse)",
    "CEN (Certified Emergency Nurse)",
    "PALS (Pediatric Advanced Life Support)",
    "NRP (Neonatal Resuscitation Program)",
    "TNCC (Trauma Nurse Core Course)",
    "OCN (Oncology Certified Nurse)",
    "CMSRN (Certified Medical-Surgical Registered Nurse)",
    "CNE (Certified Nurse Educator)",
    "CNOR (Certified Perioperative Nurse)",
    "CPN (Certified Pediatric Nurse)",
    "PMHN (Psychiatric-Mental Health Nurse)",
    "CPAN (Certified Post Anesthesia Nurse)",
    "CAPA (Certified Ambulatory Perianesthesia Nurse)",
  ];

  const staffMember = user ? getStaffById(user.id) : null;
  const verifiedCredentials = user ? getVerifiedCredentials(user.id) : [];

  useEffect(() => {
    if (staffMember) {
      setEditedProfile({
        email: staffMember.email,
        phone: staffMember.phone || "",
        firstName: staffMember.firstName,
        lastName: staffMember.lastName,
        bio: staffMember.bio || "",
        location: staffMember.location || "",
        hourlyRate: staffMember.hourlyRate?.toString() || "",
        experience: staffMember.experience || "",
        skills: staffMember.skills || [],
        certifications: staffMember.certifications || [],
        resume: null,
        coverLetter: null,
        resumeUrl: staffMember.resumeUrl || "",
        coverLetterUrl: staffMember.coverLetterUrl || "",
        linkedIn: staffMember.linkedIn || "",
        portfolio: staffMember.portfolio || "",
      });
    }
  }, [staffMember]);

  const handleSkillToggle = (skill: string) => {
    setEditedProfile((prev) => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter((s) => s !== skill)
        : [...prev.skills, skill],
    }));
  };

  const handleCertificationToggle = (cert: string) => {
    setEditedProfile((prev) => ({
      ...prev,
      certifications: prev.certifications.includes(cert)
        ? prev.certifications.filter((c) => c !== cert)
        : [...prev.certifications, cert],
    }));
  };

  const handleFileUpload = (file: File, type: "resume" | "coverLetter") => {
    if (type === "resume") {
      setEditedProfile((prev) => ({
        ...prev,
        resume: file,
        resumeUrl: URL.createObjectURL(file),
      }));
    } else {
      setEditedProfile((prev) => ({
        ...prev,
        coverLetter: file,
        coverLetterUrl: URL.createObjectURL(file),
      }));
    }
  };

  const handleSaveProfile = async () => {
    if (!staffMember || !user) return;

    try {
      const updates = {
        email: editedProfile.email,
        phone: editedProfile.phone,
        firstName: editedProfile.firstName,
        lastName: editedProfile.lastName,
        bio: editedProfile.bio,
        location: editedProfile.location,
        hourlyRate: parseFloat(editedProfile.hourlyRate) || staffMember.hourlyRate || 0,
        experience: editedProfile.experience,
        skills: editedProfile.skills,
        certifications: editedProfile.certifications,
        linkedIn: editedProfile.linkedIn,
        portfolio: editedProfile.portfolio,
      };

      await updateStaffMember(user.id, updates);
      setIsEditing(false);
    } catch (error) {

    }
  };

  const handleCancelEdit = () => {
    if (staffMember) {
      setEditedProfile({
        email: staffMember.email,
        phone: staffMember.phone || "",
        firstName: staffMember.firstName,
        lastName: staffMember.lastName,
        bio: staffMember.bio || "",
        location: staffMember.location || "",
        hourlyRate: staffMember.hourlyRate?.toString() || "",
        experience: staffMember.experience || "",
        skills: staffMember.skills || [],
        certifications: staffMember.certifications || [],
        resume: null,
        coverLetter: null,
        resumeUrl: staffMember.resumeUrl || "",
        coverLetterUrl: staffMember.coverLetterUrl || "",
        linkedIn: staffMember.linkedIn || "",
        portfolio: staffMember.portfolio || "",
      });
    }
    setIsEditing(false);
  };

  const getCredentialStatusBadge = (status: string) => {
    switch (status) {
      case "verified":
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Verified
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="outline" className="text-yellow-600">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case "expired":
        return (
          <Badge variant="destructive">
            <X className="w-3 h-3 mr-1" />
            Expired
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (!staffMember) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <User className="w-12 h-12 text-gray-400 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Profile Not Found
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-center">
              Unable to load your profile information. Please try refreshing the page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Profile</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage your professional information and job application details
          </p>
        </div>
        {!isEditing ? (
          <Button onClick={() => setIsEditing(true)} variant="outline">
            <Edit className="w-4 h-4 mr-2" />
            Edit Profile
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button onClick={handleSaveProfile} className="bg-green-600 hover:bg-green-700">
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
            <Button onClick={handleCancelEdit} variant="outline">
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
          </div>
        )}
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="experience">Experience</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Profile Header */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start space-x-6">
                <Avatar className="w-24 h-24">
                  <AvatarImage src={staffMember.avatar} />
                  <AvatarFallback className="text-xl">
                    {staffMember.firstName.charAt(0)}
                    {staffMember.lastName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h2 className="text-2xl font-bold">
                      {staffMember.firstName} {staffMember.lastName}
                    </h2>
                    <Badge variant="outline" className="ml-2">
                      {staffMember.specialty || "Healthcare Professional"}
                    </Badge>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 mb-1">
                    {staffMember.role.charAt(0).toUpperCase() + staffMember.role.slice(1)} •
                    Internal Employee
                  </p>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-500" />
                      <span>{staffMember.rating || 4.9}/5</span>
                    </div>
                    <span>•</span>
                    <span>{staffMember.yearsExperience || 8} years experience</span>
                    <span>•</span>
                    <span>${staffMember.hourlyRate || 45}/hour</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information and Bio */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-gray-400" />
                  {isEditing ? (
                    <Input
                      value={editedProfile.email}
                      onChange={(e) =>
                        setEditedProfile((prev) => ({ ...prev, email: e.target.value }))
                      }
                      placeholder="Email address"
                    />
                  ) : (
                    <span>{staffMember.email}</span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-gray-400" />
                  {isEditing ? (
                    <Input
                      value={editedProfile.phone}
                      onChange={(e) =>
                        setEditedProfile((prev) => ({ ...prev, phone: e.target.value }))
                      }
                      placeholder="Phone number"
                    />
                  ) : (
                    <span>{staffMember.phone || "(555) 123-4567"}</span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  {isEditing ? (
                    <Input
                      value={editedProfile.location}
                      onChange={(e) =>
                        setEditedProfile((prev) => ({ ...prev, location: e.target.value }))
                      }
                      placeholder="City, State"
                    />
                  ) : (
                    <span>{staffMember.location || "Chicago, IL"}</span>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Bio</CardTitle>
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <Textarea
                    value={editedProfile.bio}
                    onChange={(e) => setEditedProfile((prev) => ({ ...prev, bio: e.target.value }))}
                    placeholder="Write a brief professional summary highlighting your expertise and experience..."
                    rows={4}
                  />
                ) : (
                  <p className="text-gray-700 dark:text-gray-300">
                    {staffMember.bio ||
                      "Experienced ICU nurse with expertise in critical care and patient management."}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Professional Details */}
          <Card>
            <CardHeader>
              <CardTitle>Professional Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div>
                  <Label className="text-sm font-medium">Experience</Label>
                  {isEditing ? (
                    <Input
                      value={editedProfile.experience}
                      onChange={(e) =>
                        setEditedProfile((prev) => ({ ...prev, experience: e.target.value }))
                      }
                      placeholder="Years of experience"
                    />
                  ) : (
                    <p className="mt-1 font-semibold">{staffMember.experience || "8 years"}</p>
                  )}
                </div>
                <div>
                  <Label className="text-sm font-medium">Hourly Rate</Label>
                  {isEditing ? (
                    <Input
                      value={editedProfile.hourlyRate}
                      onChange={(e) =>
                        setEditedProfile((prev) => ({ ...prev, hourlyRate: e.target.value }))
                      }
                      placeholder="$45"
                    />
                  ) : (
                    <p className="mt-1 font-semibold">${staffMember.hourlyRate || 45}/hour</p>
                  )}
                </div>
                <div>
                  <Label className="text-sm font-medium">Rating</Label>
                  <div className="flex items-center gap-1 mt-1">
                    <Star className="w-4 h-4 text-yellow-500 fill-current" />
                    <span className="font-semibold">{staffMember.rating || 4.9}/5</span>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Total Shifts</Label>
                  <p className="mt-1 font-semibold">{staffMember.totalShifts || 156}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Skills Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Skills</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {(editedProfile.skills.length > 0
                  ? editedProfile.skills
                  : ["Critical Care", "Patient Assessment", "IV Therapy"]
                ).map((skill) => (
                  <Badge key={skill} variant="secondary">
                    {skill}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="experience" className="space-y-6">
          {/* Skills Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Skills & Expertise</CardTitle>
              <CardDescription>
                Select your skills from the healthcare professional categories below
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isEditing && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {availableSkills.map((skill) => (
                    <div key={skill} className="flex items-center space-x-2">
                      <Checkbox
                        id={skill}
                        checked={editedProfile.skills.includes(skill)}
                        onCheckedChange={() => handleSkillToggle(skill)}
                      />
                      <Label htmlFor={skill} className="text-sm font-normal cursor-pointer">
                        {skill}
                      </Label>
                    </div>
                  ))}
                </div>
              )}

              {!isEditing && (
                <div className="flex flex-wrap gap-2">
                  {(editedProfile.skills.length > 0
                    ? editedProfile.skills
                    : ["Critical Care", "Patient Assessment", "IV Therapy"]
                  ).map((skill) => (
                    <Badge key={skill} variant="secondary">
                      {skill}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Certifications Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Certifications</CardTitle>
              <CardDescription>Select your professional certifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isEditing && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {availableCertifications.map((cert) => (
                    <div key={cert} className="flex items-center space-x-2">
                      <Checkbox
                        id={cert}
                        checked={editedProfile.certifications.includes(cert)}
                        onCheckedChange={() => handleCertificationToggle(cert)}
                      />
                      <Label htmlFor={cert} className="text-sm font-normal cursor-pointer">
                        {cert}
                      </Label>
                    </div>
                  ))}
                </div>
              )}

              {!isEditing && (
                <div className="flex flex-wrap gap-2">
                  {(editedProfile.certifications.length > 0
                    ? editedProfile.certifications
                    : ["ACLS", "BLS", "CCRN"]
                  ).map((cert) => (
                    <Badge key={cert} variant="outline" className="flex items-center gap-1">
                      <Award className="w-3 h-3" />
                      {cert}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Professional Links */}
          <Card>
            <CardHeader>
              <CardTitle>Professional Links</CardTitle>
              <CardDescription>
                Add your professional social media and portfolio links
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="linkedIn">LinkedIn Profile</Label>
                {isEditing ? (
                  <Input
                    id="linkedIn"
                    value={editedProfile.linkedIn}
                    onChange={(e) =>
                      setEditedProfile((prev) => ({ ...prev, linkedIn: e.target.value }))
                    }
                    placeholder="https://linkedin.com/in/yourname"
                  />
                ) : (
                  <p className="mt-1 text-blue-600 hover:underline cursor-pointer">
                    {editedProfile.linkedIn || "Not provided"}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="portfolio">Portfolio/Website</Label>
                {isEditing ? (
                  <Input
                    id="portfolio"
                    value={editedProfile.portfolio}
                    onChange={(e) =>
                      setEditedProfile((prev) => ({ ...prev, portfolio: e.target.value }))
                    }
                    placeholder="https://yourportfolio.com"
                  />
                ) : (
                  <p className="mt-1 text-blue-600 hover:underline cursor-pointer">
                    {editedProfile.portfolio || "Not provided"}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="space-y-6">
          {/* Resume Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Resume
              </CardTitle>
              <CardDescription>Upload your current resume for job applications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isEditing ? (
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, "resume");
                    }}
                    className="hidden"
                    id="resume-upload"
                  />
                  <Label htmlFor="resume-upload" className="cursor-pointer">
                    <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-gray-500">PDF, DOC, DOCX up to 10MB</p>
                  </Label>
                  {editedProfile.resume && (
                    <p className="mt-2 text-sm text-green-600">
                      ✓ {editedProfile.resume.name} uploaded
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="font-medium">Resume.pdf</p>
                      <p className="text-sm text-gray-500">Ready for job applications</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Cover Letter Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Cover Letter
              </CardTitle>
              <CardDescription>Upload a cover letter template for job applications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isEditing ? (
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, "coverLetter");
                    }}
                    className="hidden"
                    id="cover-letter-upload"
                  />
                  <Label htmlFor="cover-letter-upload" className="cursor-pointer">
                    <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-gray-500">PDF, DOC, DOCX up to 10MB</p>
                  </Label>
                  {editedProfile.coverLetter && (
                    <p className="mt-2 text-sm text-green-600">
                      ✓ {editedProfile.coverLetter.name} uploaded
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="font-medium">Cover_Letter.pdf</p>
                      <p className="text-sm text-gray-500">Ready for job applications</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Job Application Ready Status */}
          <Card className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <div>
                  <h3 className="font-semibold text-green-800 dark:text-green-200">
                    Profile Complete - Ready for Job Applications
                  </h3>
                  <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                    Your profile, resume, and cover letter are ready. You can now apply for jobs on
                    the job board with one click.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-950">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="font-medium">Profile Updated</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Skills and certifications were updated
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 border-l-4 border-green-500 bg-green-50 dark:bg-green-950">
                  <FileText className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="font-medium">Documents Uploaded</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Resume and cover letter uploaded successfully
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Account Settings</CardTitle>
              <CardDescription>
                Manage your account preferences and privacy settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Email Notifications</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Receive emails about job matches and updates
                  </p>
                </div>
                <Checkbox defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Profile Visibility</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Make your profile visible to employers
                  </p>
                </div>
                <Checkbox defaultChecked />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
