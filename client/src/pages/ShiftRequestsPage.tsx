import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { CheckCircle, XCircle, Clock, User, Calendar, MapPin } from "lucide-react";
import { useCurrentUser } from "@/hooks/use-current-user";

interface ShiftRequest {
  request: {
    id: number;
    shiftId: number;
    staffId: number;
    message?: string;
    status: "pending" | "approved" | "rejected";
    createdAt: string;
    decidedAt?: string;
    decidedBy?: number;
  };
  shift: {
    id: number;
    title: string;
    date: string;
    startTime: string;
    endTime: string;
    department: string;
    specialty: string;
    facilityName?: string;
  };
  staff: {
    id: number;
    name: string;
    email: string;
    phone?: string;
    specialty: string;
  };
}

export default function ShiftRequestsPage() {
  const { user } = useCurrentUser();
  const { toast } = useToast();
  const [filterStatus, setFilterStatus] = useState<string>("pending");

  // Get facility ID (for facility managers)
  const facilityId = user?.primaryFacilityId || user?.facilityId || 1;

  // Fetch shift requests for facility
  const { data: requests = [], isLoading } = useQuery<ShiftRequest[]>({
    queryKey: ["/api/shift-requests/facility", facilityId, filterStatus],
    queryFn: async () => {
      const url = filterStatus 
        ? `/api/shift-requests/facility/${facilityId}?status=${filterStatus}`
        : `/api/shift-requests/facility/${facilityId}`;
      const response = await fetch(url, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch shift requests");
      return response.json();
    },
  });

  // Approve request mutation
  const approveMutation = useMutation({
    mutationFn: async (requestId: number) =>
      apiRequest(`/api/shift-requests/${requestId}/approve`, {
        method: "POST",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shift-requests"] });
      toast({
        title: "Request approved",
        description: "The shift has been assigned to the staff member.",
      });
    },
  });

  // Reject request mutation
  const rejectMutation = useMutation({
    mutationFn: async (requestId: number) =>
      apiRequest(`/api/shift-requests/${requestId}/reject`, {
        method: "POST",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shift-requests"] });
      toast({
        title: "Request rejected",
        description: "The shift request has been rejected.",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { color: string; icon: JSX.Element }> = {
      pending: { color: "bg-yellow-100 text-yellow-800", icon: <Clock className="w-4 h-4" /> },
      approved: { color: "bg-green-100 text-green-800", icon: <CheckCircle className="w-4 h-4" /> },
      rejected: { color: "bg-red-100 text-red-800", icon: <XCircle className="w-4 h-4" /> },
    };

    const variant = variants[status] || variants.pending;
    return (
      <Badge className={`${variant.color} flex items-center gap-1`}>
        {variant.icon}
        {status}
      </Badge>
    );
  };

  const pendingCount = requests.filter(r => r.request.status === "pending").length;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Shift Request Management</h1>
        {pendingCount > 0 && (
          <Badge variant="destructive" className="text-lg px-3 py-1">
            {pendingCount} Pending Requests
          </Badge>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {["all", "pending", "approved", "rejected"].map((status) => (
          <Button
            key={status}
            variant={filterStatus === status ? "default" : "outline"}
            onClick={() => setFilterStatus(status === "all" ? "" : status)}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
            {status === "pending" && pendingCount > 0 && (
              <span className="ml-2 bg-white/20 px-2 py-0.5 rounded-full text-xs">
                {pendingCount}
              </span>
            )}
          </Button>
        ))}
      </div>

      {/* Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle>Shift Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No shift requests found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Shift Details</TableHead>
                  <TableHead>Staff Member</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Request Date</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map(({ request, shift, staff }) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{shift.title}</div>
                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                          <MapPin className="w-3 h-3" />
                          {shift.department} - {shift.specialty}
                        </div>
                        {shift.facilityName && (
                          <div className="text-xs text-muted-foreground">
                            {shift.facilityName}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{staff.name}</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {staff.specialty}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {staff.email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">
                            {format(new Date(shift.date), "MMM dd, yyyy")}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {shift.startTime} - {shift.endTime}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {format(new Date(request.createdAt), "MMM dd, yyyy")}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(request.createdAt), "h:mm a")}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs truncate text-sm">
                        {request.message || "-"}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(request.status)}
                      {request.decidedAt && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {format(new Date(request.decidedAt), "MMM dd")}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {request.status === "pending" && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-600 hover:bg-green-50"
                            onClick={() => approveMutation.mutate(request.id)}
                            disabled={approveMutation.isPending}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:bg-red-50"
                            onClick={() => rejectMutation.mutate(request.id)}
                            disabled={rejectMutation.isPending}
                          >
                            Reject
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}