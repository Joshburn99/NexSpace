import React, { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { useStaff } from "@/contexts/StaffContext";
import { useSession } from "@/contexts/SessionContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Users,
  Plus,
  Search,
  Filter,
  Edit,
  Star,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Building,
  Award,
  FileText,
  Camera,
  Upload,
  Linkedin,
  ExternalLink,
  Heart,
  MessageCircle,
  MessageSquare,
  Share2,
  Briefcase,
  GraduationCap,
  Clock,
  DollarSign,
  ArrowLeft,
  Home,
  UserPlus,
  Settings,
  Building2,
  X,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useRBAC, PermissionAction, PermissionGate } from "@/hooks/use-rbac";

interface StaffMember {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  profileImage?: string;
  specialty: string;
  certifications: string[];
  yearsExperience: number;
  hourlyRate: number;
  location: string;
  workerType: "internal_employee" | "contractor_1099" | "agency_staff" | "float_pool";
  employmentType: "full_time" | "part_time" | "contract";
  role?: string;
  status: "active" | "inactive" | "pending" | "suspended";
  rating: number;
  reliabilityScore: number;
  totalShifts: number;
  bio?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  skills: string[];
  availability: string[];
  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
  };
  workHistory: Array<{
    facility: string;
    position: string;
    startDate: string;
    endDate?: string;
    description: string;
  }>;
  education: Array<{
    institution: string;
    degree: string;
    graduationYear: number;
    gpa?: number;
  }>;
  documents: Array<{
    type: string;
    name: string;
    uploadDate: string;
    expirationDate?: string;
    verified: boolean;
  }>;
  socialStats: {
    profileViews: number;
    shiftsCompleted: number;
    ratings: number;
    endorsements: number;
  };
}

interface StaffPost {
  id: number;
  authorId: number;
  authorName: string;
  authorImage?: string;
  content: string;
  type: "achievement" | "certification" | "shift_completion" | "general";
  timestamp: string;
  likes: number;
  comments: number;
  hasLiked: boolean;
  attachments?: Array<{
    type: "image" | "document";
    url: string;
    name: string;
  }>;
}

const workerTypeLabels = {
  "Full-time Employee": "Full-time Employee",
  "Part-time Employee": "Part-time Employee",
  "Contract Worker": "Contract Worker",
  "Per Diem": "Per Diem",
};

const statusColors = {
  active: "bg-green-500",
  inactive: "bg-gray-500",
  pending: "bg-yellow-500",
  suspended: "bg-red-500",
};

// Employment type color functions
const getEmploymentTypeColor = (employmentType: string) => {
  switch (employmentType) {
    case "Full-time Employee":
      return "bg-green-500 text-white";
    case "Part-time Employee":
      return "bg-blue-500 text-white";
    case "Contract Worker":
      return "bg-purple-500 text-white";
    case "Per Diem":
      return "bg-orange-500 text-white";
    default:
      return "bg-gray-500 text-white";
  }
};

const formatEmploymentType = (employmentType: string) => {
  return employmentType || "Staff";
};

// Specialties list for filtering
const specialties = [
  "RN",
  "LPN",
  "CNA",
  "PT",
  "OT",
  "RT",
  "MD",
  "NP",
  "PA",
  "CST",
  "PharmTech",
  "LabTech",
  "RadTech",
  "Dietitian",
  "Social Worker",
  "Case Manager",
  "Unit Secretary",
  "Environmental Services",
  "Security",
  "Transport",
];

function EnhancedStaffPageContent() {
  const { toast } = useToast();
  const { startImpersonation, sessionState } = useSession();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedWorkerType, setSelectedWorkerType] = useState("all");
  const [selectedSpecialty, setSelectedSpecialty] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [showAddStaffDialog, setShowAddStaffDialog] = useState(false);
  const [profileEditMode, setProfileEditMode] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [showFacilitySearch, setShowFacilitySearch] = useState(false);
  const [facilitySearchTerm, setFacilitySearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [, navigate] = useLocation();
  const { hasPermission } = useRBAC();

  // Bulk action state
  const [selectedStaffIds, setSelectedStaffIds] = useState<number[]>([]);
  const [showBulkEditDialog, setShowBulkEditDialog] = useState(false);
  const [bulkEditField, setBulkEditField] = useState<"role" | "specialty" | "status">("role");
  const [bulkEditValue, setBulkEditValue] = useState("");

  // Message button functionality
  const handleMessageClick = (staff: StaffMember) => {
    navigate(
      `/messages?staff=${staff.id}&name=${encodeURIComponent(staff.firstName + " " + staff.lastName)}`
    );
  };

  const {
    data: staffMembers = [],
    isLoading,
    error,
  } = useQuery<StaffMember[]>({
    queryKey: ["/api/staff"],
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    select: (data) => {
      // Ensure data is always an array
      if (Array.isArray(data)) {
        return data;
      }
      console.error("Staff API returned non-array data:", data);
      return [];
    },
  });

  // Handle profile URL parameter with error handling
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const profileId = urlParams.get("profile");

      if (profileId && Array.isArray(staffMembers) && staffMembers.length > 0) {
        const staffMember = staffMembers.find((s) => s?.id === parseInt(profileId));
        if (staffMember) {
          setSelectedStaff(staffMember);
          // Clean up URL parameter
          const newUrl = window.location.pathname;
          window.history.replaceState({}, "", newUrl);
        }
      }
    } catch (error) {
      console.error("Error handling profile URL parameter:", error);
    }
  }, [staffMembers]);

  const { data: staffPosts = [] } = useQuery<StaffPost[]>({
    queryKey: ["/api/staff/posts"],
  });

  // Fetch facilities for associations
  const { data: facilitiesData = [] } = useQuery({
    queryKey: ["/api/facilities"],
  });

  // Facility association mutations
  const addFacilityAssociation = useMutation({
    mutationFn: async ({ staffId, facilityId }: { staffId: number; facilityId: number }) => {
      return apiRequest("POST", `/api/staff/${staffId}/facilities`, { facilityId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff"] });
      setShowFacilitySearch(false);
      toast({
        title: "Success",
        description: "Facility association added successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add facility association",
        variant: "destructive",
      });
    },
  });

  const removeFacilityAssociation = useMutation({
    mutationFn: async ({ staffId, facilityId }: { staffId: number; facilityId: number }) => {
      return apiRequest("DELETE", `/api/staff/${staffId}/facilities/${facilityId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff"] });
      toast({
        title: "Success",
        description: "Facility association removed successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove facility association",
        variant: "destructive",
      });
    },
  });

  // Filter staff members with comprehensive null safety and exclude superusers
  const filteredStaff = React.useMemo(() => {
    if (!Array.isArray(staffMembers)) {
      console.error("staffMembers is not an array:", staffMembers);
      return [];
    }

    return staffMembers.filter((staff) => {
      if (!staff) return false;

      try {
        // Exclude superusers by email (server already filters most, but double-check)
        const superuserEmails = ["joshburn@nexspace.com", "brian.nangle@nexspace.com"];
        if (superuserEmails.includes(staff.email)) return false;

        // Exclude by role if present
        if (staff?.role === "super_admin" || staff?.role === "facility_manager") return false;

        const matchesSearch =
          searchTerm === "" ||
          `${staff.firstName || ""} ${staff.lastName || ""}`
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          (staff.email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
          (staff.specialty || "").toLowerCase().includes(searchTerm.toLowerCase());

        const matchesWorkerType =
          selectedWorkerType === "all" || staff.employmentType === selectedWorkerType;
        const matchesSpecialty =
          selectedSpecialty === "all" || staff.specialty === selectedSpecialty;
        const matchesStatus = selectedStatus === "all" || staff.status === selectedStatus;

        return matchesSearch && matchesWorkerType && matchesSpecialty && matchesStatus;
      } catch (error) {
        console.error("Error filtering staff member:", error, staff);
        return false;
      }
    });
  }, [staffMembers, searchTerm, selectedWorkerType, selectedSpecialty, selectedStatus]);

  // Pagination logic
  const totalPages = Math.ceil(filteredStaff.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedStaff = filteredStaff.slice(startIndex, endIndex);

  // Get unique values for filters with null safety
  const specialties = Array.from(
    new Set((staffMembers || []).map((s) => s?.specialty).filter(Boolean))
  );

  const createStaffMutation = useMutation({
    mutationFn: async (staffData: any) => {
      const response = await apiRequest("POST", "/api/staff", staffData);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create staff member");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff"] });
      setShowAddStaffDialog(false);
      toast({
        title: "Staff Member Added",
        description: "New staff member has been added successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error Creating Staff",
        description:
          error.message || "Failed to create staff member. Please check your data and try again.",
        variant: "destructive",
      });
    },
  });

  const updateStaffMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await apiRequest("PATCH", `/api/staff/${id}`, data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update staff profile");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff"] });
      setProfileEditMode(false);
      toast({
        title: "Profile Updated",
        description: "Staff profile has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error Updating Profile",
        description:
          error.message || "Failed to update profile. Please check your connection and try again.",
        variant: "destructive",
      });
    },
  });

  const uploadProfileImageMutation = useMutation({
    mutationFn: async ({ id, file }: { id: number; file: File }) => {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error("File size must be less than 5MB");
      }

      // Validate file type
      if (!file.type.startsWith("image/")) {
        throw new Error("Please upload a valid image file");
      }

      const formData = new FormData();
      formData.append("profileImage", file);
      const response = await apiRequest("POST", `/api/staff/${id}/profile-image`, formData);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to upload image");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff"] });
      toast({
        title: "Profile Image Updated",
        description: "Profile image has been uploaded successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error Uploading Image",
        description:
          error.message || "Failed to upload image. Please try again with a smaller file.",
        variant: "destructive",
      });
    },
  });

  const likePostMutation = useMutation({
    mutationFn: async (postId: number) => {
      const response = await apiRequest("POST", `/api/staff/posts/${postId}/like`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff/posts"] });
    },
  });

  // Bulk edit mutation
  const bulkEditStaffMutation = useMutation({
    mutationFn: async ({
      staffIds,
      field,
      value,
    }: {
      staffIds: number[];
      field: string;
      value: string;
    }) => {
      const response = await apiRequest("POST", "/api/staff/bulk-edit", {
        staffIds,
        field,
        value,
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to bulk edit staff");
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff"] });
      setSelectedStaffIds([]);
      setShowBulkEditDialog(false);
      setBulkEditValue("");
      toast({
        title: "Bulk Edit Success",
        description: `Successfully updated ${data.updated} staff members.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Bulk Edit Failed",
        description: error.message || "Failed to update staff members. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCreateStaff = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const staffData = {
      firstName: formData.get("firstName") as string,
      lastName: formData.get("lastName") as string,
      email: formData.get("email") as string,
      phone: formData.get("phone") as string,
      specialty: formData.get("specialty") as string,
      workerType: formData.get("workerType") as string,
      hourlyRate: parseFloat(formData.get("hourlyRate") as string),
      yearsExperience: parseInt(formData.get("yearsExperience") as string),
      location: formData.get("location") as string,
      certifications: (formData.get("certifications") as string)
        .split(",")
        .map((c) => c.trim())
        .filter((c) => c),
      status: "pending",
    };
    createStaffMutation.mutate(staffData);
  };

  const handleProfileImageUpload = (staffId: number, file: File) => {
    uploadProfileImageMutation.mutate({ id: staffId, file });
  };

  const handleUpdateProfile = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedStaff) return;

    const formData = new FormData(e.currentTarget);
    const updateData = {
      bio: formData.get("bio") as string,
      linkedinUrl: formData.get("linkedinUrl") as string,
      portfolioUrl: formData.get("portfolioUrl") as string,
      skills: (formData.get("skills") as string)
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s),
      availability: (formData.get("availability") as string)
        .split(",")
        .map((a) => a.trim())
        .filter((a) => a),
      hourlyRate: parseFloat(formData.get("hourlyRate") as string),
    };

    updateStaffMutation.mutate({ id: selectedStaff.id, data: updateData });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-500 mb-2">Failed to load staff data</p>
          <p className="text-sm text-muted-foreground">Please try refreshing the page</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4 md:space-y-6">
      <div>
        <div className="flex items-center gap-4 mb-4">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <Home className="h-4 w-4" />
              <span className="hidden md:inline">Dashboard</span>
            </Button>
          </Link>
        </div>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-3xl font-bold">Staff Management</h1>
            <p className="text-sm md:text-base text-muted-foreground hidden md:block">
              Comprehensive staff profiles and social features
            </p>
          </div>
          <Dialog open={showAddStaffDialog} onOpenChange={setShowAddStaffDialog}>
            <DialogTrigger asChild>
              <PermissionAction permission="create_staff" action="Add Staff Member" fallback={null}>
                <Button className="gap-2 min-h-[44px] touch-manipulation">
                  <UserPlus className="h-4 w-4" />
                  <span className="hidden md:inline">Add Staff Member</span>
                  <span className="md:hidden">Add Staff</span>
                </Button>
              </PermissionAction>
            </DialogTrigger>
            <DialogContent className="max-w-2xl w-[95vw] md:w-full max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-lg md:text-xl">Add New Staff Member</DialogTitle>
                <DialogDescription className="text-sm">
                  Create a profile for a new staff member
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateStaff} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name</Label>
                    <Input name="firstName" required />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input name="lastName" required />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input name="email" type="email" required />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input name="phone" type="tel" required />
                  </div>
                  <div>
                    <Label htmlFor="specialty">Specialty</Label>
                    <Select name="specialty" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select specialty" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="RN">RN (Registered Nurse)</SelectItem>
                        <SelectItem value="LPN">LPN (Licensed Practical Nurse)</SelectItem>
                        <SelectItem value="CNA">CNA (Certified Nursing Assistant)</SelectItem>
                        <SelectItem value="PT">PT (Physical Therapist)</SelectItem>
                        <SelectItem value="RT">RT (Respiratory Therapist)</SelectItem>
                        <SelectItem value="MD">MD (Medical Doctor)</SelectItem>
                        <SelectItem value="NP">NP (Nurse Practitioner)</SelectItem>
                        <SelectItem value="PA">PA (Physician Assistant)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="workerType">Worker Type</Label>
                    <Select name="workerType" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(workerTypeLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="hourlyRate">Hourly Rate</Label>
                    <Input name="hourlyRate" type="number" step="0.01" required />
                  </div>
                  <div>
                    <Label htmlFor="yearsExperience">Years Experience</Label>
                    <Input name="yearsExperience" type="number" required />
                  </div>
                  <div>
                    <Label htmlFor="location">Location</Label>
                    <Input name="location" required />
                  </div>
                </div>
                <div>
                  <Label htmlFor="certifications">Certifications (comma-separated)</Label>
                  <Input name="certifications" placeholder="BLS, ACLS, RN License" />
                </div>

                {/* Facility Associations - Only visible to superusers */}
                {sessionState?.user?.role === "super_admin" && (
                  <div>
                    <Label htmlFor="associatedFacilities">
                      Associated Facilities (for workers)
                    </Label>
                    <Select name="associatedFacilities">
                      <SelectTrigger>
                        <SelectValue placeholder="Select facilities" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Portland General Hospital</SelectItem>
                        <SelectItem value="2">OHSU Hospital</SelectItem>
                        <SelectItem value="1,2">Both Facilities</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-2">
                  {createStaffMutation.isError && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                      <p className="font-medium">Failed to add staff member</p>
                      <p className="text-xs mt-1">Please check all fields and try again.</p>
                    </div>
                  )}
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowAddStaffDialog(false)}
                      disabled={createStaffMutation.isPending}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createStaffMutation.isPending}>
                      {createStaffMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Adding Staff...
                        </>
                      ) : (
                        "Add Staff Member"
                      )}
                    </Button>
                  </div>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="directory" className="space-y-6">
        <TabsList>
          <TabsTrigger value="directory">All Staff</TabsTrigger>
          <TabsTrigger value="feed">Social Feed</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="directory" className="space-y-4 md:space-y-6">
          {/* Filters - Mobile Responsive */}
          <Card className="shadow-sm">
            <CardHeader className="p-4 md:p-6">
              <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                <Filter className="h-4 w-4 md:h-5 md:w-5" />
                Search & Filters
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 md:p-6 pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
                <div className="md:col-span-2 lg:col-span-1">
                  <Label htmlFor="search" className="text-sm">
                    Search
                  </Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="search"
                      placeholder="Search staff..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 min-h-[40px]"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="workerType" className="text-sm">
                    Worker Type
                  </Label>
                  <Select value={selectedWorkerType} onValueChange={setSelectedWorkerType}>
                    <SelectTrigger className="min-h-[40px]">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {Object.entries(workerTypeLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="specialty">Specialty</Label>
                  <Select value={selectedSpecialty} onValueChange={setSelectedSpecialty}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Specialties" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Specialties</SelectItem>
                      {specialties.map((specialty, idx) => (
                        <SelectItem key={`${specialty}-${idx}`} value={specialty}>
                          {specialty?.replace("_", " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Staff List */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <CardTitle>Staff Members ({filteredStaff.length})</CardTitle>
                  {/* Select all checkbox */}
                  {hasPermission("staff.edit") && (
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={
                          selectedStaffIds.length === paginatedStaff.length &&
                          paginatedStaff.length > 0
                        }
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedStaffIds(paginatedStaff.map((s) => s.id));
                          } else {
                            setSelectedStaffIds([]);
                          }
                        }}
                      />
                      <Label className="text-sm">Select All</Label>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {/* Bulk actions */}
                  {selectedStaffIds.length > 0 && hasPermission("staff.edit") && (
                    <PermissionAction permission="staff.edit">
                      <Button
                        onClick={() => setShowBulkEditDialog(true)}
                        variant="outline"
                        size="sm"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Bulk Edit ({selectedStaffIds.length})
                      </Button>
                    </PermissionAction>
                  )}
                  <Select
                    value={itemsPerPage.toString()}
                    onValueChange={(value) => setItemsPerPage(parseInt(value))}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-sm text-muted-foreground">per page</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {paginatedStaff.map((staff) => (
                  <div
                    key={staff.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={(e) => {
                      // Only open profile if not clicking on checkbox or action buttons
                      if (
                        !(e.target as HTMLElement).closest('input[type="checkbox"]') &&
                        !(e.target as HTMLElement).closest("button")
                      ) {
                        setSelectedStaff(staff);
                      }
                    }}
                  >
                    <div className="flex items-center space-x-4">
                      {/* Individual checkbox */}
                      {hasPermission("staff.edit") && (
                        <Checkbox
                          checked={selectedStaffIds.includes(staff.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedStaffIds([...selectedStaffIds, staff.id]);
                            } else {
                              setSelectedStaffIds(selectedStaffIds.filter((id) => id !== staff.id));
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                      )}
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={staff.profileImage} />
                        <AvatarFallback>
                          {staff.firstName?.[0] || ""}
                          {staff.lastName?.[0] || ""}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium">
                          {staff.firstName} {staff.lastName}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {staff.specialty?.replace("_", " ") || "N/A"} •{" "}
                          {staff.department || "N/A"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">{staff.location}</div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Badge className={getEmploymentTypeColor(staff.employmentType)}>
                          {formatEmploymentType(staff.employmentType)}
                        </Badge>
                      </div>

                      <div className="flex items-center text-sm">
                        <Badge variant="secondary" className="bg-gray-100 text-gray-800">
                          <Star className="h-3 w-3 mr-1" />
                          {staff.reliabilityScore ? `${staff.reliabilityScore}/5` : "4.8/5"}
                        </Badge>
                      </div>

                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMessageClick(staff);
                        }}
                        variant="outline"
                        size="sm"
                      >
                        <MessageSquare className="h-3 w-3 mr-1" />
                        Message
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Showing {startIndex + 1} to {Math.min(endIndex, filteredStaff.length)} of{" "}
                    {filteredStaff.length} staff
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <div className="flex items-center space-x-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <Button
                          key={page}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          className="w-8 h-8 p-0"
                        >
                          {page}
                        </Button>
                      ))}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="feed" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              {staffPosts.map((post) => (
                <Card key={post.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={post.authorImage} />
                        <AvatarFallback>
                          {post.authorName
                            ?.split(" ")
                            .map((n) => n?.[0] || "")
                            .join("") || ""}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h4 className="font-medium">{post.authorName}</h4>
                        <p className="text-sm text-muted-foreground">
                          {new Date(post.timestamp).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant="outline">{post.type?.replace("_", " ") || "N/A"}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p>{post.content}</p>

                    {post.attachments && post.attachments.length > 0 && (
                      <div className="grid grid-cols-2 gap-2">
                        {post.attachments.map((attachment, i) => (
                          <div key={i} className="border rounded-md p-2">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4" />
                              <span className="text-sm truncate">{attachment.name}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="flex items-center space-x-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`gap-2 ${post.hasLiked ? "text-red-500" : ""}`}
                          onClick={() => likePostMutation.mutate(post.id)}
                        >
                          <Heart className={`h-4 w-4 ${post.hasLiked ? "fill-current" : ""}`} />
                          {post.likes}
                        </Button>
                        <Button variant="ghost" size="sm" className="gap-2">
                          <MessageCircle className="h-4 w-4" />
                          {post.comments}
                        </Button>
                        <Button variant="ghost" size="sm" className="gap-2">
                          <Share2 className="h-4 w-4" />
                          Share
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Top Performers</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(filteredStaff || [])
                    .filter((staff) => staff && typeof staff.rating === "number")
                    .sort((a, b) => (b?.rating || 0) - (a?.rating || 0))
                    .slice(0, 5)
                    .map((staff) => (
                      <div key={staff?.id || Math.random()} className="flex items-center space-x-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={staff?.profileImage} />
                          <AvatarFallback className="text-xs">
                            {staff?.firstName?.[0] || ""}
                            {staff?.lastName?.[0] || ""}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {staff?.firstName || ""} {staff?.lastName || ""}
                          </p>
                          <div className="flex items-center">
                            <Star className="h-3 w-3 text-yellow-500 mr-1" />
                            <span className="text-xs text-muted-foreground">
                              {staff?.rating || 0}/5
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Certifications</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(staffPosts || [])
                    .filter((post) => post && post.type === "certification")
                    .slice(0, 3)
                    .map((post) => (
                      <div key={post?.id || Math.random()} className="text-sm">
                        <p className="font-medium">{post?.authorName || "Unknown"}</p>
                        <p className="text-muted-foreground">{post?.content || ""}</p>
                      </div>
                    ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-500" />
                  <div>
                    <p className="text-sm font-medium">Total Staff</p>
                    <p className="text-2xl font-bold">{staffMembers.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-green-500" />
                  <div>
                    <p className="text-sm font-medium">Active Staff</p>
                    <p className="text-2xl font-bold">
                      {staffMembers.filter((s) => s.status === "active").length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-purple-500" />
                  <div>
                    <p className="text-sm font-medium">Contract Workers</p>
                    <p className="text-2xl font-bold">
                      {staffMembers.filter((s) => s.employmentType === "contract").length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-yellow-500" />
                  <div>
                    <p className="text-sm font-medium">Avg Rating</p>
                    <p className="text-2xl font-bold">
                      {staffMembers && staffMembers.length > 0
                        ? (
                            staffMembers.reduce((sum, s) => sum + (s?.rating || 0), 0) /
                            staffMembers.length
                          ).toFixed(1)
                        : "0.0"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Staff Profile Dialog */}
      {selectedStaff && (
        <Dialog open={!!selectedStaff} onOpenChange={() => setSelectedStaff(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={selectedStaff.profileImage} />
                      <AvatarFallback>
                        {selectedStaff.firstName?.[0] || ""}
                        {selectedStaff.lastName?.[0] || ""}
                      </AvatarFallback>
                    </Avatar>
                    <Button
                      size="sm"
                      variant="outline"
                      className="absolute -bottom-2 -right-2 h-6 w-6 p-0"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Camera className="h-3 w-3" />
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleProfileImageUpload(selectedStaff.id, file);
                        }
                      }}
                    />
                  </div>
                  <div>
                    <DialogTitle className="text-2xl">
                      {selectedStaff.firstName} {selectedStaff.lastName}
                    </DialogTitle>
                    <DialogDescription className="text-base">
                      {selectedStaff.specialty?.replace("_", " ") || "N/A"} •{" "}
                      {workerTypeLabels[selectedStaff.workerType]}
                    </DialogDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <PermissionAction
                    permission="update_staff"
                    action="Edit Staff Profile"
                    fallback={null}
                  >
                    <Button
                      variant={profileEditMode ? "default" : "outline"}
                      onClick={() => setProfileEditMode(!profileEditMode)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      {profileEditMode ? "Save" : "Edit"}
                    </Button>
                  </PermissionAction>
                </div>
              </div>
            </DialogHeader>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="experience">Experience</TabsTrigger>
                <TabsTrigger value="documents">Documents</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                {profileEditMode ? (
                  <form onSubmit={handleUpdateProfile} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="bio">Bio</Label>
                        <Textarea
                          name="bio"
                          defaultValue={selectedStaff.bio}
                          placeholder="Tell us about yourself..."
                        />
                      </div>
                      <div>
                        <Label htmlFor="skills">Skills (comma-separated)</Label>
                        <Textarea
                          name="skills"
                          defaultValue={selectedStaff.skills?.join(", ")}
                          placeholder="Critical care, IV therapy, wound care..."
                        />
                      </div>
                      <div>
                        <Label htmlFor="linkedinUrl">LinkedIn URL</Label>
                        <Input
                          name="linkedinUrl"
                          defaultValue={selectedStaff.linkedinUrl}
                          placeholder="https://linkedin.com/in/username"
                        />
                      </div>
                      <div>
                        <Label htmlFor="portfolioUrl">Portfolio URL</Label>
                        <Input
                          name="portfolioUrl"
                          defaultValue={selectedStaff.portfolioUrl}
                          placeholder="https://portfolio.com"
                        />
                      </div>
                      <div>
                        <Label htmlFor="hourlyRate">Hourly Rate</Label>
                        <Input
                          name="hourlyRate"
                          type="number"
                          step="0.01"
                          defaultValue={selectedStaff.hourlyRate}
                        />
                      </div>
                      <div>
                        <Label htmlFor="availability">Availability</Label>
                        <Input
                          name="availability"
                          defaultValue={selectedStaff.availability?.join(", ")}
                          placeholder="Monday, Tuesday, Weekends..."
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Button type="submit" disabled={updateStaffMutation.isPending}>
                        {updateStaffMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Updating Profile...
                          </>
                        ) : (
                          "Update Profile"
                        )}
                      </Button>
                      {updateStaffMutation.isError && (
                        <p className="text-sm text-red-500">
                          Failed to update profile. Please try again.
                        </p>
                      )}
                    </div>
                  </form>
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <h3 className="font-medium mb-2">Contact Information</h3>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4 text-muted-foreground" />
                              {selectedStaff.email}
                            </div>
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-muted-foreground" />
                              {selectedStaff.phone}
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                              {selectedStaff.location}
                            </div>
                          </div>
                        </div>

                        <div>
                          <h3 className="font-medium mb-2">Professional Details</h3>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span>Experience:</span>
                              <span>{selectedStaff.yearsExperience} years</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span>Hourly Rate:</span>
                              <span>${selectedStaff.hourlyRate}/hour</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span>Rating:</span>
                              <div className="flex items-center gap-1">
                                <Star className="h-4 w-4 text-yellow-500" />
                                {selectedStaff.rating}/5
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <span>Total Shifts:</span>
                              <span>{selectedStaff.totalShifts}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <h3 className="font-medium mb-2">Bio</h3>
                          <p className="text-sm text-muted-foreground">
                            {selectedStaff.bio || "No bio provided yet."}
                          </p>
                        </div>

                        <div>
                          <h3 className="font-medium mb-2">Links</h3>
                          <div className="space-y-2">
                            {selectedStaff.linkedinUrl && (
                              <a
                                href={selectedStaff.linkedinUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-blue-600 hover:underline"
                              >
                                <Linkedin className="h-4 w-4" />
                                LinkedIn Profile
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                            {selectedStaff.portfolioUrl && (
                              <a
                                href={selectedStaff.portfolioUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-blue-600 hover:underline"
                              >
                                <ExternalLink className="h-4 w-4" />
                                Portfolio
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-medium mb-2">Certifications</h3>
                      <div className="flex flex-wrap gap-2">
                        {(selectedStaff.certifications || []).map((cert, i) => (
                          <Badge key={i} variant="secondary">
                            <Award className="h-3 w-3 mr-1" />
                            {cert}
                          </Badge>
                        ))}
                        {(!selectedStaff.certifications ||
                          selectedStaff.certifications.length === 0) && (
                          <span className="text-sm text-muted-foreground">
                            No certifications listed
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      <h3 className="font-medium mb-2">Skills</h3>
                      <div className="flex flex-wrap gap-2">
                        {(selectedStaff.skills || []).map((skill, i) => (
                          <Badge key={i} variant="outline">
                            {skill}
                          </Badge>
                        ))}
                        {(!selectedStaff.skills || selectedStaff.skills.length === 0) && (
                          <span className="text-sm text-muted-foreground">No skills listed</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="experience" className="space-y-6">
                <div>
                  <h3 className="font-medium mb-4">Work History</h3>
                  <div className="space-y-4">
                    {(selectedStaff.workHistory || []).map((work, i) => (
                      <Card key={i}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-medium">
                                {work?.position || "Unknown Position"}
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                {work?.facility || "Unknown Facility"}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {work?.startDate || "Unknown"} - {work?.endDate || "Present"}
                              </p>
                            </div>
                          </div>
                          {work?.description && <p className="text-sm mt-2">{work.description}</p>}
                        </CardContent>
                      </Card>
                    ))}
                    {(!selectedStaff.workHistory || selectedStaff.workHistory.length === 0) && (
                      <p className="text-muted-foreground">No work history available.</p>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="font-medium mb-4">Education</h3>
                  <div className="space-y-4">
                    {(selectedStaff.education || []).map((edu, i) => (
                      <Card key={i}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-medium">{edu?.degree || "Unknown Degree"}</h4>
                              <p className="text-sm text-muted-foreground">
                                {edu?.institution || "Unknown Institution"}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Graduated {edu?.graduationYear || "Unknown"}
                                {edu?.gpa && ` • GPA: ${edu.gpa}`}
                              </p>
                            </div>
                            <GraduationCap className="h-5 w-5 text-muted-foreground" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    {(!selectedStaff.education || selectedStaff.education.length === 0) && (
                      <p className="text-muted-foreground">No education history available.</p>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="documents" className="space-y-6">
                <div className="space-y-4">
                  {(selectedStaff.documents || []).map((doc, i) => (
                    <Card key={i}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <FileText className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <h4 className="font-medium">{doc?.name || "Unknown Document"}</h4>
                              <p className="text-sm text-muted-foreground">
                                {doc?.type || "Unknown Type"} • Uploaded{" "}
                                {doc?.uploadDate
                                  ? new Date(doc.uploadDate).toLocaleDateString()
                                  : "Unknown"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {doc?.verified && (
                              <Badge variant="default" className="bg-green-500">
                                Verified
                              </Badge>
                            )}
                            {doc?.expirationDate && (
                              <Badge variant="outline">
                                Expires {new Date(doc.expirationDate).toLocaleDateString()}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {(!selectedStaff.documents || selectedStaff.documents.length === 0) && (
                    <p className="text-muted-foreground">No documents uploaded.</p>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="activity" className="space-y-6">
                <div className="grid grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold">
                        {selectedStaff.socialStats?.profileViews || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">Profile Views</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold">
                        {selectedStaff.socialStats?.shiftsCompleted || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">Shifts Completed</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold">
                        {selectedStaff.socialStats?.ratings || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">Reviews</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold">
                        {selectedStaff.socialStats?.endorsements || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">Endorsements</div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="settings" className="space-y-6">
                <div className="space-y-6">
                  <div>
                    <Label>Account Status</Label>
                    <Select defaultValue={selectedStaff.status}>
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Facility Associations - Only for workers */}
                  {sessionState?.user?.role === "super_admin" && (
                    <div className="space-y-4 border-t pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-base font-semibold">Facility Associations</Label>
                          <p className="text-sm text-muted-foreground">
                            Manage which facilities this worker can accept shifts from
                          </p>
                        </div>
                        <Button
                          onClick={() => setShowFacilitySearch(true)}
                          size="sm"
                          className="flex items-center gap-2"
                        >
                          <Plus className="h-4 w-4" />
                          Add Facility
                        </Button>
                      </div>

                      {/* Current Facility Associations */}
                      <div className="space-y-2">
                        {(selectedStaff as any).associatedFacilities?.length > 0 ? (
                          (selectedStaff as any).associatedFacilities.map((facilityId: number) => {
                            const facility = (facilitiesData as any)?.find(
                              (f: any) => f.id === facilityId
                            );
                            return (
                              <div
                                key={facilityId}
                                className="flex items-center justify-between p-3 border rounded-lg"
                              >
                                <div className="flex items-center gap-3">
                                  <Building2 className="h-4 w-4 text-blue-600" />
                                  <div>
                                    <div className="font-medium">
                                      {facility?.name || `Facility ${facilityId}`}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                      {facility?.address || "No address available"}
                                    </div>
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    removeFacilityAssociation.mutate({
                                      staffId: selectedStaff.id,
                                      facilityId,
                                    })
                                  }
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            );
                          })
                        ) : (
                          <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                            <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p>No facility associations</p>
                            <p className="text-sm">
                              Add facilities to allow this worker to see their shifts
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      )}

      {/* Facility Search Dialog */}
      {showFacilitySearch && selectedStaff && (
        <Dialog open={showFacilitySearch} onOpenChange={setShowFacilitySearch}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add Facility Association</DialogTitle>
              <DialogDescription>
                Select facilities to associate with {selectedStaff.firstName}{" "}
                {selectedStaff.lastName}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search facilities by name, location, or type..."
                  value={facilitySearchTerm}
                  onChange={(e) => setFacilitySearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Facility List */}
              <div className="max-h-96 overflow-y-auto space-y-2">
                {(facilitiesData as any)
                  ?.filter((facility: any) => {
                    const searchLower = facilitySearchTerm.toLowerCase();
                    return (
                      !searchLower ||
                      facility.name?.toLowerCase().includes(searchLower) ||
                      facility.address?.toLowerCase().includes(searchLower) ||
                      facility.type?.toLowerCase().includes(searchLower)
                    );
                  })
                  .map((facility: any) => {
                    const isAlreadyAssociated = (
                      selectedStaff as any
                    ).associatedFacilities?.includes(facility.id);
                    return (
                      <div
                        key={facility.id}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                          isAlreadyAssociated
                            ? "bg-muted border-muted opacity-50"
                            : "hover:bg-muted/50 border-border"
                        }`}
                        onClick={() => {
                          if (!isAlreadyAssociated) {
                            addFacilityAssociation.mutate({
                              staffId: selectedStaff.id,
                              facilityId: facility.id,
                            });
                          }
                        }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-blue-600" />
                              <div className="font-medium">{facility.name}</div>
                              {isAlreadyAssociated && (
                                <Badge variant="secondary" className="text-xs">
                                  Already Associated
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground mt-1">
                              {facility.address}
                            </div>
                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                              <span>Type: {facility.type || "Hospital"}</span>
                              {facility.bedCount && <span>Beds: {facility.bedCount}</span>}
                              {facility.rating && (
                                <div className="flex items-center gap-1">
                                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                  <span>{facility.rating}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          {!isAlreadyAssociated && (
                            <Button size="sm" variant="outline">
                              Add
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}

                {(facilitiesData as any)?.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No facilities available</p>
                    <p className="text-sm">Add facilities in Facility Management first</p>
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Bulk Edit Dialog */}
      <Dialog open={showBulkEditDialog} onOpenChange={setShowBulkEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Bulk Edit Staff Members</DialogTitle>
            <DialogDescription>
              Update {selectedStaffIds.length} selected staff members
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-4">
            <div>
              <Label htmlFor="bulk-edit-field">Field to Update</Label>
              <Select
                value={bulkEditField}
                onValueChange={(value: "role" | "specialty" | "status") => setBulkEditField(value)}
              >
                <SelectTrigger id="bulk-edit-field">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="role">Role</SelectItem>
                  <SelectItem value="specialty">Specialty</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="bulk-edit-value">New Value</Label>
              {bulkEditField === "status" ? (
                <Select value={bulkEditValue} onValueChange={setBulkEditValue}>
                  <SelectTrigger id="bulk-edit-value">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              ) : bulkEditField === "specialty" ? (
                <Select value={bulkEditValue} onValueChange={setBulkEditValue}>
                  <SelectTrigger id="bulk-edit-value">
                    <SelectValue placeholder="Select specialty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RN">RN (Registered Nurse)</SelectItem>
                    <SelectItem value="LPN">LPN (Licensed Practical Nurse)</SelectItem>
                    <SelectItem value="CNA">CNA (Certified Nursing Assistant)</SelectItem>
                    <SelectItem value="PT">PT (Physical Therapist)</SelectItem>
                    <SelectItem value="OT">OT (Occupational Therapist)</SelectItem>
                    <SelectItem value="RT">RT (Respiratory Therapist)</SelectItem>
                    <SelectItem value="MD">MD (Medical Doctor)</SelectItem>
                    <SelectItem value="NP">NP (Nurse Practitioner)</SelectItem>
                    <SelectItem value="PA">PA (Physician Assistant)</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id="bulk-edit-value"
                  value={bulkEditValue}
                  onChange={(e) => setBulkEditValue(e.target.value)}
                  placeholder="Enter new role"
                />
              )}
            </div>

            <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5" />
                <div className="text-sm text-amber-700 dark:text-amber-300">
                  <p className="font-medium mb-1">This will update:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>{selectedStaffIds.length} staff members</li>
                    <li>
                      All selected staff will have their {bulkEditField} changed to "
                      {bulkEditValue || "the selected value"}"
                    </li>
                    <li>This action cannot be undone</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={() =>
                bulkEditStaffMutation.mutate({
                  staffIds: selectedStaffIds,
                  field: bulkEditField,
                  value: bulkEditValue,
                })
              }
              disabled={bulkEditStaffMutation.isPending || !bulkEditValue}
              className="flex-1"
            >
              {bulkEditStaffMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Edit className="h-4 w-4 mr-2" />
                  Update {selectedStaffIds.length} Staff
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowBulkEditDialog(false);
                setBulkEditValue("");
              }}
              disabled={bulkEditStaffMutation.isPending}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function EnhancedStaffPage() {
  return (
    <ErrorBoundary
      fallback={
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-red-500 mb-2">Something went wrong with the staff page</p>
            <p className="text-sm text-muted-foreground">Please refresh the page to try again</p>
          </div>
        </div>
      }
      onError={(error, errorInfo) => {
        console.error("EnhancedStaffPage Error:", error, errorInfo);
      }}
    >
      <EnhancedStaffPageContent />
    </ErrorBoundary>
  );
}
