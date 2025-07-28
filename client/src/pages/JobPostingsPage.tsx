import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Building,
  MapPin,
  Clock,
  DollarSign,
  Search,
  Filter,
  Plus,
  Users,
  Calendar,
} from "lucide-react";
import { useFacilityPermissions } from "@/hooks/use-facility-permissions";
import { Link } from "wouter";

interface JobPosting {
  id: number;
  title: string;
  department: string;
  location: string;
  employmentType: string;
  payRate: string;
  experience: string;
  postedDate: string;
  applicants: number;
  status: "active" | "paused" | "closed";
  description: string;
  requirements: string[];
  benefits: string[];
}

export default function JobPostingsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const { hasPermission } = useFacilityPermissions();

  const { data: jobPostings, isLoading } = useQuery<JobPosting[]>({
    queryKey: ["/api/job-postings"],
    initialData: [
      {
        id: 1,
        title: "Registered Nurse - ICU",
        department: "Intensive Care",
        location: "General Hospital",
        employmentType: "Full-time",
        payRate: "$35-45/hour",
        experience: "2+ years",
        postedDate: "2025-07-10",
        applicants: 12,
        status: "active",
        description: "Seeking experienced ICU nurse for day shift position",
        requirements: ["BSN degree", "ICU experience", "BLS certification"],
        benefits: ["Health insurance", "Paid time off", "Continuing education"],
      },
      {
        id: 2,
        title: "Licensed Practical Nurse - Med/Surg",
        department: "Medical/Surgical",
        location: "General Hospital",
        employmentType: "Part-time",
        payRate: "$28-32/hour",
        experience: "1+ years",
        postedDate: "2025-07-08",
        applicants: 8,
        status: "active",
        description: "Part-time LPN position for medical/surgical unit",
        requirements: ["LPN license", "Med/Surg experience", "CPR certification"],
        benefits: ["Flexible schedule", "Health insurance", "Professional development"],
      },
      {
        id: 3,
        title: "Certified Nursing Assistant - Emergency",
        department: "Emergency",
        location: "General Hospital",
        employmentType: "Per Diem",
        payRate: "$20-25/hour",
        experience: "Entry level",
        postedDate: "2025-07-05",
        applicants: 5,
        status: "paused",
        description: "Per diem CNA position in fast-paced emergency department",
        requirements: ["CNA certification", "Strong communication skills", "Physical stamina"],
        benefits: ["Flexible scheduling", "Experience in emergency care", "Competitive pay"],
      },
    ],
  });

  const filteredPostings =
    jobPostings?.filter((posting) => {
      const matchesSearch =
        posting.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        posting.department.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDepartment =
        departmentFilter === "all" || posting.department === departmentFilter;
      const matchesStatus = statusFilter === "all" || posting.status === statusFilter;

      return matchesSearch && matchesDepartment && matchesStatus;
    }) || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "paused":
        return "bg-yellow-100 text-yellow-800";
      case "closed":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (!hasPermission("view_job_openings")) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-gray-600">You don't have permission to view job postings.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Building className="h-8 w-8" />
            Job Postings
          </h1>
          <p className="text-gray-600 mt-2">View and manage current job openings</p>
        </div>
        {hasPermission("manage_job_openings") && (
          <Link href="/create-job-posting">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create New Posting
            </Button>
          </Link>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search job postings..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder="Filter by department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            <SelectItem value="Intensive Care">Intensive Care</SelectItem>
            <SelectItem value="Medical/Surgical">Medical/Surgical</SelectItem>
            <SelectItem value="Emergency">Emergency</SelectItem>
            <SelectItem value="Pediatrics">Pediatrics</SelectItem>
            <SelectItem value="Operating Room">Operating Room</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full md:w-32">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, index) => (
            <Card key={index} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPostings.map((posting) => (
            <Card key={posting.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{posting.title}</CardTitle>
                    <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                      <MapPin className="h-3 w-3" />
                      {posting.location}
                    </p>
                  </div>
                  <Badge className={getStatusColor(posting.status)}>{posting.status}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Building className="h-3 w-3" />
                      {posting.department}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {posting.employmentType}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1 font-medium text-green-600">
                      <DollarSign className="h-3 w-3" />
                      {posting.payRate}
                    </div>
                    <div className="flex items-center gap-1 text-gray-600">
                      <Users className="h-3 w-3" />
                      {posting.applicants} applicants
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <Calendar className="h-3 w-3" />
                    Posted {new Date(posting.postedDate).toLocaleDateString()}
                  </div>

                  <p className="text-sm text-gray-700 line-clamp-2">{posting.description}</p>

                  <div className="flex flex-wrap gap-1">
                    {posting.requirements.slice(0, 2).map((req, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {req}
                      </Badge>
                    ))}
                    {posting.requirements.length > 2 && (
                      <Badge variant="outline" className="text-xs">
                        +{posting.requirements.length - 2} more
                      </Badge>
                    )}
                  </div>

                  <div className="pt-2 border-t">
                    <Button variant="outline" className="w-full">
                      View Details
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {filteredPostings.length === 0 && !isLoading && (
        <Card>
          <CardContent className="p-12 text-center">
            <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No job postings found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || departmentFilter !== "all" || statusFilter !== "all"
                ? "Try adjusting your search or filters"
                : "No job postings have been created yet"}
            </p>
            {hasPermission("manage_job_openings") && (
              <Link href="/create-job-posting">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Posting
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
