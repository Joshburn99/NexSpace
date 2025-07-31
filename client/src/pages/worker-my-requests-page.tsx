import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Clock,
  MapPin,
  DollarSign,
  Building2,
  Calendar,
  X,
  AlertCircle,
  Loader2,
  Info,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";

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
  const queryClient = useQueryClient();
  const [confirmWithdrawId, setConfirmWithdrawId] = useState<number | null>(null);
  const [withdrawReason, setWithdrawReason] = useState("");

  // Fetch worker's shift requests - only unassigned requests by this worker
  const { data: myRequests = [], isLoading } = useQuery({
    queryKey: ["/api/shift-requests", user?.id],
    enabled: !!user?.id,
  });

  // Withdraw shift request mutation
  const withdrawRequestMutation = useMutation({
    mutationFn: async ({ requestId, reason }: { requestId: number; reason: string }) => {
      const response = await apiRequest("POST", `/api/shift-requests/${requestId}/withdraw`, {
        reason,
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to withdraw request");
      }
      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/shift-requests"] });
      toast({
        title: "Request Withdrawn",
        description: "Your shift request has been withdrawn successfully.",
      });
      setConfirmWithdrawId(null);
      setWithdrawReason("");
    },
    onError: (error: any) => {

      toast({
        title: "Withdrawal Failed",
        description: error.message || "Failed to withdraw shift request. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Filter to only show requests by current worker that are still unassigned
  const workerRequests = (myRequests as ShiftRequest[]).filter(
    (request: ShiftRequest) =>
      request.requestedBy === user?.id && ["requested", "pending"].includes(request.status)
  );

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "critical":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      case "high":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300";
      case "medium":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      default:
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "approved":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "declined":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-64"></div>
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => (
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
          <p className="text-gray-600 dark:text-gray-400 mt-2 flex items-center gap-1">
            Your pending shift requests
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-3 w-3 text-gray-400" />
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs">
                <p className="text-sm font-medium mb-1">Request Status Guide:</p>
                <ul className="text-xs space-y-1">
                  <li>
                    <span className="font-medium text-yellow-600">Pending:</span> Awaiting facility
                    review
                  </li>
                  <li>
                    <span className="font-medium text-green-600">Approved:</span> You've been
                    assigned to the shift
                  </li>
                  <li>
                    <span className="font-medium text-red-600">Declined:</span> Request was not
                    approved
                  </li>
                  <li>
                    <span className="font-medium text-gray-600">Withdrawn:</span> You cancelled the
                    request
                  </li>
                </ul>
                <p className="text-xs mt-2 text-gray-500">
                  You can withdraw pending requests at any time
                </p>
              </TooltipContent>
            </Tooltip>
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
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Department
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{request.department}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Specialty
                    </p>
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
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Description
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {request.description}
                    </p>
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  {request.status === "requested" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setConfirmWithdrawId(request.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                      disabled={withdrawRequestMutation.isPending}
                    >
                      {withdrawRequestMutation.isPending && confirmWithdrawId === request.id ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          Withdrawing...
                        </>
                      ) : (
                        <>
                          <X className="h-4 w-4 mr-1" />
                          Cancel Request
                        </>
                      )}
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

      {/* Withdrawal Confirmation Dialog */}
      <Dialog
        open={confirmWithdrawId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmWithdrawId(null);
            setWithdrawReason("");
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Withdraw Shift Request</DialogTitle>
            <DialogDescription>
              Are you sure you want to withdraw this shift request? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-4">
            {/* Find the request being withdrawn */}
            {confirmWithdrawId && workerRequests.find((r) => r.id === confirmWithdrawId) && (
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                <p className="font-medium text-sm mb-1">
                  {workerRequests.find((r) => r.id === confirmWithdrawId)?.title}
                </p>
                <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3 w-3" />
                    {workerRequests.find((r) => r.id === confirmWithdrawId)?.date}
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    {workerRequests.find((r) => r.id === confirmWithdrawId)?.startTime} -
                    {workerRequests.find((r) => r.id === confirmWithdrawId)?.endTime}
                  </div>
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="withdraw-reason">
                Reason for withdrawal (optional)
                <span className="text-xs text-gray-500 ml-2">
                  Let the facility know why you're withdrawing
                </span>
              </Label>
              <textarea
                id="withdraw-reason"
                value={withdrawReason}
                onChange={(e) => setWithdrawReason(e.target.value)}
                placeholder="e.g., Schedule conflict, family emergency, etc."
                className="w-full mt-2 p-3 border rounded-lg resize-none h-20 text-sm"
              />
            </div>

            <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5" />
                <div className="text-sm text-amber-700 dark:text-amber-300">
                  <p className="font-medium mb-1">What happens next:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>Your request will be removed from the pending list</li>
                    <li>The shift will remain open for other workers</li>
                    <li>The facility will be notified of your withdrawal</li>
                    <li>You can request this shift again if needed</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="destructive"
              onClick={() => {
                if (confirmWithdrawId) {
                  withdrawRequestMutation.mutate({
                    requestId: confirmWithdrawId,
                    reason: withdrawReason,
                  });
                }
              }}
              disabled={withdrawRequestMutation.isPending}
              className="flex-1"
            >
              {withdrawRequestMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Withdrawing...
                </>
              ) : (
                <>
                  <X className="h-4 w-4 mr-2" />
                  Confirm Withdrawal
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setConfirmWithdrawId(null);
                setWithdrawReason("");
              }}
              disabled={withdrawRequestMutation.isPending}
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
