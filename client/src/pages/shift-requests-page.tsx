import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
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
  Loader2
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
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  // Filter requests based on search and status
  const filteredRequests = requests.filter(request => {
    const matchesSearch = request.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.facilityName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.requestedBy.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = activeTab === 'all' || request.status === activeTab;
    return matchesSearch && matchesStatus;
  });

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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Shift Requests</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Review and manage shift requests from your staff
        </p>
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
                          <Button
                            size="sm"
                            onClick={() => approveRequestMutation.mutate(request.id)}
                            disabled={approveRequestMutation.isPending || denyRequestMutation.isPending}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            {approveRequestMutation.isPending ? (
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
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => denyRequestMutation.mutate(request.id)}
                            disabled={denyRequestMutation.isPending || approveRequestMutation.isPending}
                          >
                            {denyRequestMutation.isPending ? (
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
    </div>
  );
}