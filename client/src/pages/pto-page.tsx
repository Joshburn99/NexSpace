import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { usePTO } from "@/contexts/PTOContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, Clock, CheckCircle, XCircle, AlertCircle, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export default function PTOPage() {
  const { user } = useAuth();
  const { 
    getEmployeeBalance, 
    getEmployeeRequests, 
    getPendingRequests,
    submitPTORequest,
    reviewPTORequest 
  } = usePTO();
  
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false);
  const [requestType, setRequestType] = useState<string>("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [isEmergency, setIsEmergency] = useState(false);

  const userBalance = user ? getEmployeeBalance(user.id.toString()) : null;
  const userRequests = user ? getEmployeeRequests(user.id.toString()) : [];
  const pendingRequests = getPendingRequests();
  const isManager = user?.role === 'manager' || user?.role === 'admin';

  const calculateDays = (start: string, end: string): number => {
    if (!start || !end) return 0;
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  const handleSubmitRequest = () => {
    if (!user || !requestType || !startDate || !endDate) return;

    const totalDays = calculateDays(startDate, endDate);
    
    submitPTORequest({
      employeeId: user.id.toString(),
      employeeName: `${user.firstName} ${user.lastName}`,
      requestType: requestType as any,
      startDate,
      endDate,
      totalDays,
      reason,
      isEmergency
    });

    // Reset form
    setRequestType("");
    setStartDate("");
    setEndDate("");
    setReason("");
    setIsEmergency(false);
    setIsSubmitDialogOpen(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-yellow-600"><AlertCircle className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'approved':
        return <Badge variant="outline" className="text-green-600"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'denied':
        return <Badge variant="outline" className="text-red-600"><XCircle className="w-3 h-3 mr-1" />Denied</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Time Off</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your paid time off requests</p>
        </div>
        {!isManager && (
          <Dialog open={isSubmitDialogOpen} onOpenChange={setIsSubmitDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Request Time Off
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Request Time Off</DialogTitle>
                <DialogDescription>
                  Submit a new PTO request for approval
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="request-type">Request Type</Label>
                  <Select value={requestType} onValueChange={setRequestType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select request type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vacation">Vacation</SelectItem>
                      <SelectItem value="sick">Sick Leave</SelectItem>
                      <SelectItem value="personal">Personal</SelectItem>
                      <SelectItem value="family">Family</SelectItem>
                      <SelectItem value="bereavement">Bereavement</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="start-date">Start Date</Label>
                    <Input
                      id="start-date"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="end-date">End Date</Label>
                    <Input
                      id="end-date"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>

                {startDate && endDate && (
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Total days: {calculateDays(startDate, endDate)}
                  </div>
                )}

                <div>
                  <Label htmlFor="reason">Reason (Optional)</Label>
                  <Textarea
                    id="reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Provide details about your time off request..."
                    rows={3}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="emergency"
                    checked={isEmergency}
                    onChange={(e) => setIsEmergency(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="emergency" className="text-sm">This is an emergency request</Label>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button onClick={handleSubmitRequest} className="flex-1">
                    Submit Request
                  </Button>
                  <Button variant="outline" onClick={() => setIsSubmitDialogOpen(false)} className="flex-1">
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Tabs defaultValue={isManager ? "pending" : "balance"} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          {!isManager && <TabsTrigger value="balance">My Balance</TabsTrigger>}
          <TabsTrigger value={isManager ? "pending" : "requests"}>
            {isManager ? "Pending Requests" : "My Requests"}
          </TabsTrigger>
          {isManager && <TabsTrigger value="all">All Requests</TabsTrigger>}
        </TabsList>

        {!isManager && (
          <TabsContent value="balance" className="space-y-6">
            {userBalance && (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Vacation</CardTitle>
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{userBalance.vacationAvailable}</div>
                    <p className="text-xs text-muted-foreground">
                      {userBalance.vacationUsed} used this year
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Sick Leave</CardTitle>
                    <AlertCircle className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{userBalance.sickAvailable}</div>
                    <p className="text-xs text-muted-foreground">
                      {userBalance.sickUsed} used this year
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Personal</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{userBalance.personalAvailable}</div>
                    <p className="text-xs text-muted-foreground">
                      {userBalance.personalUsed} used this year
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Earned</CardTitle>
                    <CheckCircle className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{userBalance.totalEarned}</div>
                    <p className="text-xs text-muted-foreground">
                      {userBalance.carryOver} carried over
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        )}

        <TabsContent value={isManager ? "pending" : "requests"} className="space-y-4">
          {isManager ? (
            <>
              <h2 className="text-xl font-semibold">Pending Approval</h2>
              {pendingRequests.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center">
                    <p className="text-gray-500 dark:text-gray-400">No pending requests</p>
                  </CardContent>
                </Card>
              ) : (
                pendingRequests.map((request) => (
                  <Card key={request.id}>
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{request.employeeName}</h3>
                            {request.isEmergency && (
                              <Badge variant="destructive" className="text-xs">Emergency</Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {request.requestType.charAt(0).toUpperCase() + request.requestType.slice(1)}
                          </p>
                          <p className="text-sm">
                            {formatDate(request.startDate)} - {formatDate(request.endDate)} 
                            <span className="text-gray-500 ml-2">({request.totalDays} days)</span>
                          </p>
                          {request.reason && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                              "{request.reason}"
                            </p>
                          )}
                          <p className="text-xs text-gray-500">
                            Requested: {formatDate(request.requestedAt)}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => reviewPTORequest(request.id, 'approved', 'Approved by manager', user?.firstName + ' ' + user?.lastName)}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-600 hover:bg-red-50"
                            onClick={() => reviewPTORequest(request.id, 'denied', 'Denied by manager', user?.firstName + ' ' + user?.lastName)}
                          >
                            Deny
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </>
          ) : (
            <>
              <h2 className="text-xl font-semibold">My Requests</h2>
              {userRequests.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center">
                    <p className="text-gray-500 dark:text-gray-400">No time off requests</p>
                  </CardContent>
                </Card>
              ) : (
                userRequests.map((request) => (
                  <Card key={request.id}>
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">
                              {request.requestType.charAt(0).toUpperCase() + request.requestType.slice(1)}
                            </h3>
                            {getStatusBadge(request.status)}
                            {request.isEmergency && (
                              <Badge variant="destructive" className="text-xs">Emergency</Badge>
                            )}
                          </div>
                          <p className="text-sm">
                            {formatDate(request.startDate)} - {formatDate(request.endDate)} 
                            <span className="text-gray-500 ml-2">({request.totalDays} days)</span>
                          </p>
                          {request.reason && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                              "{request.reason}"
                            </p>
                          )}
                          <p className="text-xs text-gray-500">
                            Requested: {formatDate(request.requestedAt)}
                          </p>
                          {request.reviewedAt && (
                            <div className="text-xs text-gray-500 border-t pt-2 mt-2">
                              <p>Reviewed by {request.reviewedBy} on {formatDate(request.reviewedAt)}</p>
                              {request.reviewNotes && (
                                <p className="italic">"{request.reviewNotes}"</p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </>
          )}
        </TabsContent>

        {isManager && (
          <TabsContent value="all" className="space-y-4">
            <h2 className="text-xl font-semibold">All Requests</h2>
            {/* Implementation for all requests view for managers */}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}