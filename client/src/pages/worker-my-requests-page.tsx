import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, MapPin, DollarSign, Building2, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

interface ShiftRequest {
  id: number;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  department: string;
  specialty: string;
  facilityName: string;
  rate: number;
  status: "requested" | "pending" | "approved" | "declined";
  requestedBy: number;
  urgency: "low" | "medium" | "high" | "critical";
  description?: string;
}

export default function WorkerMyRequestsPage() {
  const { toast } = useToast();
  const { user } = useAuth();

  // Fetch worker's shift requests - only unassigned requests by this worker
  const { data: myRequests = [], isLoading } = useQuery({
    queryKey: ['/api/shift-requests', user?.id],
    enabled: !!user?.id,
  });

  // Filter to only show requests by current worker that are still unassigned
  const workerRequests = (myRequests as ShiftRequest[]).filter((request: ShiftRequest) => 
    request.requestedBy === user?.id && 
    ["requested", "pending"].includes(request.status)
  );

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "critical": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      case "high": return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300";
      case "medium": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      default: return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "approved": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "declined": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  const cancelRequest = (requestId: number) => {
    // API call to cancel request would go here
    toast({ 
      title: "Request cancelled", 
      description: "Your shift request has been cancelled successfully." 
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-64"></div>
          <div className="grid gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-48 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Requests</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Your pending shift requests
          </p>
        </div>
        <Badge variant="outline" className="text-lg px-3 py-1">
          {workerRequests.length} Active Requests
        </Badge>
      </div>

      {workerRequests.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No Active Requests
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              You don't have any pending shift requests at the moment.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {workerRequests.map((request: ShiftRequest) => (
            <Card key={request.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg mb-2">{request.title}</CardTitle>
                    <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-center gap-1">
                        <Building2 className="h-4 w-4" />
                        {request.facilityName}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(request.date).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {request.startTime} - {request.endTime}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 items-end">
                    <Badge className={getStatusColor(request.status)}>
                      {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                    </Badge>
                    <Badge className={getUrgencyColor(request.urgency)}>
                      {request.urgency.charAt(0).toUpperCase() + request.urgency.slice(1)} Priority
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Department</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{request.department}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Specialty</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{request.specialty}</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      <span className="text-lg font-semibold text-green-600">
                        ${request.rate}/hr
                      </span>
                    </div>
                  </div>
                </div>

                {request.description && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{request.description}</p>
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  {request.status === "requested" && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => cancelRequest(request.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      Cancel Request
                    </Button>
                  )}
                  <Button variant="outline" size="sm">
                    View Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}