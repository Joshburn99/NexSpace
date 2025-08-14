import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  DollarSign,
  MapPin,
  MoreHorizontal,
  Stethoscope,
  UserRound,
  Briefcase,
} from "lucide-react";
import { type Job } from "@/types";

export function JobBoardPreview() {
  const { data: jobs = [], isLoading } = useQuery<Job[]>({
    queryKey: ["/api/jobs"],
    select: (data) => data.slice(0, 3), // Only show first 3 jobs
  });

  const formatPayRate = (min?: string, max?: string) => {
    if (!min || !max) return "Competitive";
    return `$${min}-${max}/hour`;
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return "Just posted";
    if (diffInHours < 24) return `${diffInHours} hours ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} days ago`;
  };

  const getDepartmentIcon = (department: string) => {
    switch (department?.toLowerCase()) {
      case "icu":
      case "emergency":
        return <Stethoscope className="h-5 w-5 text-blue-600" />;
      case "surgery":
      case "or":
        return <UserRound className="h-5 w-5 text-purple-600" />;
      default:
        return <Briefcase className="h-5 w-5 text-gray-600" />;
    }
  };

  const getDepartmentColor = (department: string) => {
    switch (department?.toLowerCase()) {
      case "icu":
        return "bg-blue-100";
      case "emergency":
        return "bg-red-100";
      case "surgery":
      case "or":
        return "bg-purple-100";
      default:
        return "bg-gray-100";
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">Recent Job Postings</CardTitle>
            <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg animate-pulse"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-32"></div>
                    <div className="h-3 bg-gray-200 rounded w-24"></div>
                    <div className="h-3 bg-gray-200 rounded w-40"></div>
                  </div>
                </div>
                <div className="h-6 w-20 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-900">Recent Job Postings</CardTitle>
          <Link href="/jobs">
            <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">
              View All Jobs
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {jobs.length === 0 ? (
          <div className="text-center py-8">
            <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No job postings</h3>
            <p className="text-gray-500">There are no active job postings at the moment.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors cursor-pointer group"
              >
                <div className="flex items-center space-x-4">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${getDepartmentColor(job.department || "")}`}
                  >
                    {getDepartmentIcon(job.department || "")}
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 group-hover:text-blue-700 transition-colors">
                      {job.title}
                    </h4>
                    <p className="text-sm text-gray-500">
                      {job.department} • Posted {formatTimeAgo(job.createdAt!)}
                    </p>
                    <div className="flex items-center space-x-4 mt-1">
                      <span className="text-xs text-gray-500 flex items-center">
                        <DollarSign className="h-3 w-3 mr-1" />
                        {formatPayRate(job.payRateMin || undefined, job.payRateMax || undefined)}
                      </span>
                      <span className="text-xs text-gray-500 flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {job.jobType.charAt(0).toUpperCase() + job.jobType.slice(1)}
                      </span>
                      {job.department && (
                        <span className="text-xs text-gray-500 flex items-center">
                          <MapPin className="h-3 w-3 mr-1" />
                          {job.department}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge className="bg-green-100 text-green-800">
                    {/* This would show actual application count from the API */}
                    Active
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
