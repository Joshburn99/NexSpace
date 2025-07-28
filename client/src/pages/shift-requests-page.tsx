import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useRBAC, PermissionAction, PermissionGate } from '@/hooks/use-rbac';
import { 
  Clock, 
  MapPin, 
  User, 
  Check, 
  X, 
  Search,
  Calendar,
  DollarSign,
  AlertCircle,
  Loader2,
  CheckSquare,
  XSquare,
  UserCheck
} from 'lucide-react';

interface ShiftRequest {
  id: number;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  department: string;
  specialty: string;
  facilityName: string;
  facilityId: number;
  rate: number;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'approved' | 'denied';
  requestedBy: {
    id: number;
    name: string;
    email: string;
    specialty: string;
  };
  requestedAt: string;
  description?: string;
}

export default function ShiftRequestsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('pending');
  const [confirmApproveId, setConfirmApproveId] = useState<number | null>(null);
  const [confirmDenyId, setConfirmDenyId] = useState<number | null>(null);
  const [denyReason, setDenyReason] = useState('');
  const [selectedRequests, setSelectedRequests] = useState<number[]>([]);
  const [showBulkApproveDialog, setShowBulkApproveDialog] = useState(false);
  const [showBulkDenyDialog, setShowBulkDenyDialog] = useState(false);
  const [bulkDenyReason, setBulkDenyReason] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { hasPermission } = useRBAC();

  // Fetch shift requests
  const { data: requests = [], isLoading } = useQuery<ShiftRequest[]>({
    queryKey: ['/api/shift-requests'],
  });

  // Approve request mutation
  const approveRequestMutation = useMutation({
    mutationFn: async (requestId: number) => {
      const response = await apiRequest('POST', `/api/shift-requests/${requestId}/approve`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to approve request');
      }
      return response.json();
    },
    onSuccess: (data, requestId) => {
      queryClient.invalidateQueries({ queryKey: ['/api/shift-requests'] });
      toast({
        title: 'Request Approved',
        description: 'The shift request has been approved and shift created successfully.',
      });
    },
    onError: (error: any) => {
      console.error('Approval error:', error);
      toast({
        title: 'Approval Failed',
        description: error.message || 'Failed to approve the request. Please check your connection and try again.',
        variant: 'destructive',
      });
    },
  });

  // Deny request mutation
  const denyRequestMutation = useMutation({
    mutationFn: async (requestId: number) => {
      const response = await apiRequest('POST', `/api/shift-requests/${requestId}/deny`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to deny request');
      }
      return response.json();
    },
    onSuccess: (data, requestId) => {
      queryClient.invalidateQueries({ queryKey: ['/api/shift-requests'] });
      toast({
        title: 'Request Denied',
        description: 'The shift request has been denied and requester notified.',
      });
    },
    onError: (error: any) => {
      console.error('Denial error:', error);
      toast({
        title: 'Denial Failed',
        description: error.message || 'Failed to deny the request. Please check your connection and try again.',
        variant: 'destructive',
      });
    },
  });

  // Bulk approve mutation
  const bulkApproveMutation = useMutation({
    mutationFn: async (requestIds: number[]) => {
      const response = await apiRequest('POST', '/api/shift-requests/bulk-approve', { requestIds });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to bulk approve requests');
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/shift-requests'] });
      setSelectedRequests([]);
      setShowBulkApproveDialog(false);
      toast({
        title: 'Bulk Approval Success',
        description: `Successfully approved ${data.approved} shift requests.`,
      });
    },
    onError: (error: any) => {
      console.error('Bulk approval error:', error);
      toast({
        title: 'Bulk Approval Failed',
        description: error.message || 'Failed to bulk approve requests. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Bulk deny mutation
  const bulkDenyMutation = useMutation({
    mutationFn: async ({ requestIds, reason }: { requestIds: number[]; reason?: string }) => {
      const response = await apiRequest('POST', '/api/shift-requests/bulk-deny', { requestIds, reason });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to bulk deny requests');
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/shift-requests'] });
      setSelectedRequests([]);
      setShowBulkDenyDialog(false);
      setBulkDenyReason('');
      toast({
        title: 'Bulk Denial Success',
        description: `Successfully denied ${data.denied} shift requests.`,
      });
    },
    onError: (error: any) => {
      console.error('Bulk denial error:', error);
      toast({
        title: 'Bulk Denial Failed',
        description: error.message || 'Failed to bulk deny requests. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Filter requests based on search and status
  const filteredRequests = requests.filter(request => {
    const matchesSearch = request.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.facilityName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.requestedBy.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = activeTab === 'all' || request.status === activeTab;
    return matchesSearch && matchesStatus;
  });

  // Selection handlers
  const toggleSelectAll = () => {
    const pendingRequests = filteredRequests.filter(r => r.status === 'pending');
    if (selectedRequests.length === pendingRequests.length) {
      setSelectedRequests([]);
    } else {
      setSelectedRequests(pendingRequests.map(r => r.id));
    }
  };

  const toggleSelectRequest = (requestId: number) => {
    setSelectedRequests(prev => 
      prev.includes(requestId) 
        ? prev.filter(id => id !== requestId)
        : [...prev, requestId]
    );
  };

  const handleBulkApprove = () => {
    if (selectedRequests.length === 0) return;
    setShowBulkApproveDialog(true);
  };

  const handleBulkDeny = () => {
    if (selectedRequests.length === 0) return;
    setShowBulkDenyDialog(true);
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical': return 'destructive';
      case 'high': return 'default';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'default';
      case 'denied': return 'destructive';
      case 'pending': return 'secondary';
      default: return 'outline';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading shift requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              Shift Requests
              {requests.filter(r => r.status === 'pending').length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {requests.filter(r => r.status === 'pending').length} Pending
                </Badge>
              )}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2 flex items-center gap-1">
              Review and manage shift requests from your staff
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-3 w-3 text-gray-400" />
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs">
                  <p className="text-sm font-medium mb-1">Request Management Tips:</p>
                  <ul className="text-xs space-y-1">
                    <li>• Review worker qualifications before approving</li>
                    <li>• Consider reliability scores and ratings</li>
                    <li>• Approve requests promptly to secure staff</li>
                    <li>• Provide reasons when denying to help workers improve</li>
                    <li>• Check for conflicts before assigning shifts</li>
                  </ul>
                </TooltipContent>
              </Tooltip>
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Last updated</p>
            <p className="text-xs text-gray-400">{new Date().toLocaleTimeString()}</p>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search requests..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          {/* Bulk actions */}
          {activeTab === 'pending' && filteredRequests.length > 0 && hasPermission('shifts.approve_requests') && (
            <div className="flex gap-2">
              <PermissionAction permission="shifts.approve_requests">
                <Button
                  onClick={handleBulkApprove}
                  disabled={selectedRequests.length === 0}
                  variant="default"
                  size="sm"
                >
                  <CheckSquare className="h-4 w-4 mr-2" />
                  Bulk Approve ({selectedRequests.length})
                </Button>
              </PermissionAction>
              <PermissionAction permission="shifts.approve_requests">
                <Button
                  onClick={handleBulkDeny}
                  disabled={selectedRequests.length === 0}
                  variant="destructive"
                  size="sm"
                >
                  <XSquare className="h-4 w-4 mr-2" />
                  Bulk Deny ({selectedRequests.length})
                </Button>
              </PermissionAction>
            </div>
          )}
        </div>
      </div>

      {/* Request Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="denied">Denied</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {/* Select all checkbox for pending requests */}
          {activeTab === 'pending' && filteredRequests.length > 0 && hasPermission('shifts.approve_requests') && (
            <div className="flex items-center space-x-2 pb-2">
              <Checkbox
                checked={selectedRequests.length === filteredRequests.filter(r => r.status === 'pending').length}
                onCheckedChange={toggleSelectAll}
              />
              <Label className="text-sm font-medium">
                Select All ({filteredRequests.filter(r => r.status === 'pending').length} pending requests)
              </Label>
            </div>
          )}

          {filteredRequests.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <AlertCircle className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  No shift requests found
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-center">
                  {searchTerm 
                    ? "No requests match your search criteria."
                    : `No ${activeTab === 'all' ? '' : activeTab} shift requests at this time.`
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredRequests.map((request) => (
                <Card key={request.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {/* Add checkbox for pending requests */}
                        {request.status === 'pending' && hasPermission('shifts.approve_requests') && (
                          <Checkbox
                            checked={selectedRequests.includes(request.id)}
                            onCheckedChange={() => toggleSelectRequest(request.id)}
                          />
                        )}
                        <CardTitle className="text-lg">{request.title}</CardTitle>
                        <Badge variant={getUrgencyColor(request.urgency)}>
                          {request.urgency}
                        </Badge>
                        <Badge variant={getStatusColor(request.status)}>
                          {request.status}
                        </Badge>
                      </div>
                      {request.status === 'pending' && (
                        <div className="flex space-x-2">
                          <PermissionAction
                            permission="approve_shift_requests"
                            action="Approve Shift Request"
                            fallback={null}
                          >
                            <Button
                              size="sm"
                              onClick={() => setConfirmApproveId(request.id)}
                              disabled={approveRequestMutation.isPending || denyRequestMutation.isPending}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              {approveRequestMutation.isPending && confirmApproveId === request.id ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                  Approving...
                                </>
                              ) : (
                                <>
                                  <Check className="h-4 w-4 mr-1" />
                                  Approve
                                </>
                              )}
                            </Button>
                          </PermissionAction>
                          <PermissionAction
                            permission="deny_shift_requests"
                            action="Deny Shift Request"
                            fallback={null}
                          >
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => setConfirmDenyId(request.id)}
                              disabled={denyRequestMutation.isPending || approveRequestMutation.isPending}
                            >
                              {denyRequestMutation.isPending && confirmDenyId === request.id ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                  Denying...
                                </>
                              ) : (
                                <>
                                  <X className="h-4 w-4 mr-1" />
                                  Deny
                                </>
                              )}
                            </Button>
                          </PermissionAction>
                        </div>
                      )}
                    </div>
                    <CardDescription>
                      Requested by {request.requestedBy.name} • {request.requestedBy.specialty}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">{request.date}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">{request.startTime} - {request.endTime}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <DollarSign className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">${request.rate}/hour</span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">{request.facilityName}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">{request.department}</span>
                      </div>
                    </div>

                    {request.description && (
                      <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          {request.description}
                        </p>
                      </div>
                    )}

                    <div className="mt-4 text-xs text-gray-500">
                      Requested on {new Date(request.requestedAt).toLocaleDateString()}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Approve Confirmation Dialog */}
      <Dialog
        open={confirmApproveId !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmApproveId(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Shift Request Approval</DialogTitle>
            <DialogDescription>
              Are you sure you want to approve this shift request? This will:
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 my-4">
            <div className="flex items-start gap-2">
              <Check className="h-4 w-4 text-green-600 mt-0.5" />
              <p className="text-sm">Assign the worker to this shift</p>
            </div>
            <div className="flex items-start gap-2">
              <Check className="h-4 w-4 text-green-600 mt-0.5" />
              <p className="text-sm">Update the shift status to filled</p>
            </div>
            <div className="flex items-start gap-2">
              <Check className="h-4 w-4 text-green-600 mt-0.5" />
              <p className="text-sm">Notify the worker of the approval</p>
            </div>
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
              <p className="text-sm text-amber-700 dark:text-amber-300">
                This action cannot be undone without manually removing the assignment
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={() => {
                if (confirmApproveId) {
                  approveRequestMutation.mutate(confirmApproveId);
                  setConfirmApproveId(null);
                }
              }}
              disabled={approveRequestMutation.isPending}
              className="flex-1"
            >
              {approveRequestMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Approving...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Confirm Approval
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => setConfirmApproveId(null)}
              disabled={approveRequestMutation.isPending}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Deny Confirmation Dialog */}
      <Dialog
        open={confirmDenyId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmDenyId(null);
            setDenyReason('');
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Shift Request Denial</DialogTitle>
            <DialogDescription>
              Are you sure you want to deny this shift request? The worker will be notified.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 my-4">
            <div>
              <Label htmlFor="deny-reason">
                Reason for denial (optional)
                <span className="text-xs text-gray-500 ml-2">
                  Help the worker understand why their request was denied
                </span>
              </Label>
              <textarea
                id="deny-reason"
                value={denyReason}
                onChange={(e) => setDenyReason(e.target.value)}
                placeholder="e.g., Shift has been filled, does not meet specialty requirements, etc."
                className="w-full mt-2 p-3 border rounded-lg resize-none h-20 text-sm"
              />
            </div>

            <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5" />
                <div className="text-sm text-amber-700 dark:text-amber-300">
                  <p className="font-medium mb-1">This will:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>Mark the request as denied</li>
                    <li>Notify the worker via the messaging system</li>
                    <li>Keep the shift open for other workers</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="destructive"
              onClick={() => {
                if (confirmDenyId) {
                  denyRequestMutation.mutate({
                    requestId: confirmDenyId,
                    reason: denyReason
                  });
                  setConfirmDenyId(null);
                  setDenyReason('');
                }
              }}
              disabled={denyRequestMutation.isPending}
              className="flex-1"
            >
              {denyRequestMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Denying...
                </>
              ) : (
                <>
                  <X className="h-4 w-4 mr-2" />
                  Confirm Denial
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setConfirmDenyId(null);
                setDenyReason('');
              }}
              disabled={denyRequestMutation.isPending}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Approve Confirmation Dialog */}
      <Dialog
        open={showBulkApproveDialog}
        onOpenChange={setShowBulkApproveDialog}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Bulk Approve Shift Requests</DialogTitle>
            <DialogDescription>
              Are you sure you want to approve {selectedRequests.length} shift requests?
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 my-4">
            <div className="flex items-start gap-2">
              <Check className="h-4 w-4 text-green-600 mt-0.5" />
              <p className="text-sm">All selected workers will be assigned to their requested shifts</p>
            </div>
            <div className="flex items-start gap-2">
              <Check className="h-4 w-4 text-green-600 mt-0.5" />
              <p className="text-sm">Shift statuses will be updated to filled</p>
            </div>
            <div className="flex items-start gap-2">
              <Check className="h-4 w-4 text-green-600 mt-0.5" />
              <p className="text-sm">Workers will receive approval notifications</p>
            </div>
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
              <p className="text-sm text-amber-700 dark:text-amber-300">
                This action will process all {selectedRequests.length} requests at once
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={() => bulkApproveMutation.mutate(selectedRequests)}
              disabled={bulkApproveMutation.isPending}
              className="flex-1"
            >
              {bulkApproveMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckSquare className="h-4 w-4 mr-2" />
                  Approve All ({selectedRequests.length})
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowBulkApproveDialog(false)}
              disabled={bulkApproveMutation.isPending}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Deny Confirmation Dialog */}
      <Dialog
        open={showBulkDenyDialog}
        onOpenChange={(open) => {
          if (!open) {
            setShowBulkDenyDialog(false);
            setBulkDenyReason('');
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Bulk Deny Shift Requests</DialogTitle>
            <DialogDescription>
              Are you sure you want to deny {selectedRequests.length} shift requests?
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 my-4">
            <div>
              <Label htmlFor="bulk-deny-reason">
                Reason for denial (optional)
                <span className="text-xs text-gray-500 ml-2">
                  This reason will be sent to all selected workers
                </span>
              </Label>
              <textarea
                id="bulk-deny-reason"
                value={bulkDenyReason}
                onChange={(e) => setBulkDenyReason(e.target.value)}
                placeholder="e.g., Shifts have been filled, scheduling conflicts, etc."
                className="w-full mt-2 p-3 border rounded-lg resize-none h-20 text-sm"
              />
            </div>

            <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5" />
                <div className="text-sm text-amber-700 dark:text-amber-300">
                  <p className="font-medium mb-1">This will:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>Mark all {selectedRequests.length} requests as denied</li>
                    <li>Notify all workers via the messaging system</li>
                    <li>Keep the shifts open for other workers</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="destructive"
              onClick={() => bulkDenyMutation.mutate({ requestIds: selectedRequests, reason: bulkDenyReason })}
              disabled={bulkDenyMutation.isPending}
              className="flex-1"
            >
              {bulkDenyMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <XSquare className="h-4 w-4 mr-2" />
                  Deny All ({selectedRequests.length})
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowBulkDenyDialog(false);
                setBulkDenyReason('');
              }}
              disabled={bulkDenyMutation.isPending}
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