import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { 
  DollarSign, 
  Clock, 
  Users, 
  FileText, 
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Download,
  Eye,
  Settings,
  Calendar,
  CreditCard,
  Building,
  Activity,
  Plus
} from "lucide-react";
import { apiRequest, getQueryFn, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AppLayout } from "@/components/ui/app-layout";

interface Timesheet {
  id: number;
  userId: number;
  facilityId: number;
  payPeriodStart: string;
  payPeriodEnd: string;
  totalHours: string;
  regularHours: string;
  overtimeHours: string;
  grossPay: string;
  status: string;
  submittedAt?: string;
  approvedAt?: string;
  approvedBy?: number;
  processedAt?: string;
  notes?: string;
  createdAt: string;
}

interface Payment {
  id: number;
  timesheetId: number;
  userId: number;
  facilityId: number;
  grossAmount: string;
  federalTax: string;
  stateTax: string;
  socialSecurity: string;
  medicare: string;
  netAmount: string;
  paymentMethod: string;
  status: string;
  paymentDate?: string;
  createdAt: string;
}

interface PayrollEmployee {
  id: number;
  userId: number;
  facilityId: number;
  employeeType: string;
  hourlyRate?: string;
  salaryAmount?: string;
  overtimeRate?: string;
  isActive: boolean;
}

export default function PayrollPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState("overview");
  const [selectedFacility, setSelectedFacility] = useState("1");
  const [payPeriodStart, setPayPeriodStart] = useState("");
  const [payPeriodEnd, setPayPeriodEnd] = useState("");
  const [processingPayroll, setProcessingPayroll] = useState(false);

  // Queries
  const { data: timesheets = [], isLoading: loadingTimesheets } = useQuery({
    queryKey: ["/api/timesheets", selectedFacility],
    queryFn: getQueryFn({ on401: "throw" })
  });

  const { data: payments = [], isLoading: loadingPayments } = useQuery({
    queryKey: ["/api/payments", selectedFacility],
    queryFn: getQueryFn({ on401: "throw" })
  });

  const { data: payrollEmployees = [], isLoading: loadingEmployees } = useQuery({
    queryKey: ["/api/payroll/employees", selectedFacility],
    queryFn: getQueryFn({ on401: "throw" })
  });

  const { data: syncLogs = [] } = useQuery({
    queryKey: ["/api/payroll/sync-logs", selectedFacility],
    queryFn: getQueryFn({ on401: "throw" })
  });

  // Mutations
  const processPayrollMutation = useMutation({
    mutationFn: async (data: { facilityId: number; payPeriodStart: string; payPeriodEnd: string }) => {
      const res = await apiRequest("POST", "/api/payroll/process", data);
      return await res.json();
    },
    onSuccess: (result) => {
      toast({
        title: "Payroll Processing Complete",
        description: `Processed ${result.processedTimesheets} timesheets. Total payments: $${result.totalPayments.toFixed(2)}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/timesheets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
    },
    onError: () => {
      toast({
        title: "Payroll Processing Failed",
        description: "There was an error processing payroll. Please try again.",
        variant: "destructive",
      });
    },
  });

  const syncPayrollMutation = useMutation({
    mutationFn: async (data: { facilityId: number; syncType: string }) => {
      const res = await apiRequest("POST", "/api/payroll/sync", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Sync Complete",
        description: "Successfully synced with payroll provider",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/payroll/sync-logs"] });
    },
    onError: () => {
      toast({
        title: "Sync Failed",
        description: "Failed to sync with payroll provider",
        variant: "destructive",
      });
    },
  });

  const updateTimesheetStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await apiRequest("PUT", `/api/timesheets/${id}/status`, { status });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Status Updated",
        description: "Timesheet status has been updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/timesheets"] });
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Failed to update timesheet status",
        variant: "destructive",
      });
    },
  });

  const handleProcessPayroll = () => {
    if (!payPeriodStart || !payPeriodEnd) {
      toast({
        title: "Missing Information",
        description: "Please select both start and end dates for the pay period",
        variant: "destructive",
      });
      return;
    }

    setProcessingPayroll(true);
    processPayrollMutation.mutate({
      facilityId: parseInt(selectedFacility),
      payPeriodStart,
      payPeriodEnd
    });
    setTimeout(() => setProcessingPayroll(false), 3000);
  };

  const handleSyncPayroll = (syncType: string) => {
    syncPayrollMutation.mutate({
      facilityId: parseInt(selectedFacility),
      syncType
    });
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'submitted': return 'bg-blue-100 text-blue-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'processed': return 'bg-purple-100 text-purple-800';
      case 'paid': return 'bg-emerald-100 text-emerald-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const pendingTimesheets = timesheets.filter((t: Timesheet) => ['submitted', 'approved'].includes(t.status));
  const pendingPayments = payments.filter((p: Payment) => ['pending', 'processing'].includes(p.status));
  const totalPendingAmount = pendingPayments.reduce((sum, p) => sum + parseFloat(p.netAmount), 0);

  return (
    <AppLayout title="Payroll Management" subtitle="Automated payment processing and timesheet management">
      <div className="p-6">

        {/* Facility Filter */}
        <div className="mb-6">
          <Select value={selectedFacility} onValueChange={setSelectedFacility}>
            <SelectTrigger className="w-64">
              <Building className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Select Facility" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Sunshine Care Center</SelectItem>
              <SelectItem value="2">Maple Grove Facility</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending Timesheets</p>
                  <p className="text-3xl font-bold text-orange-600">{pendingTimesheets.length}</p>
                </div>
                <Clock className="w-8 h-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending Payments</p>
                  <p className="text-3xl font-bold text-blue-600">{pendingPayments.length}</p>
                </div>
                <CreditCard className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Amount Pending</p>
                  <p className="text-3xl font-bold text-green-600">${totalPendingAmount.toFixed(2)}</p>
                </div>
                <DollarSign className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Payroll Employees</p>
                  <p className="text-3xl font-bold text-purple-600">{payrollEmployees.length}</p>
                </div>
                <Users className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="timesheets">Timesheets</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="employees">Employees</TabsTrigger>
            <TabsTrigger value="processing">Processing</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-6">
            {/* Automated Processing Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Automated Payroll Processing
                </CardTitle>
                <CardDescription>
                  Process approved timesheets and generate payments automatically
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div>
                    <Label htmlFor="payPeriodStart">Pay Period Start</Label>
                    <Input
                      id="payPeriodStart"
                      type="date"
                      value={payPeriodStart}
                      onChange={(e) => setPayPeriodStart(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="payPeriodEnd">Pay Period End</Label>
                    <Input
                      id="payPeriodEnd"
                      type="date"
                      value={payPeriodEnd}
                      onChange={(e) => setPayPeriodEnd(e.target.value)}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button 
                      onClick={handleProcessPayroll}
                      disabled={processingPayroll || processPayrollMutation.isPending}
                      className="w-full"
                    >
                      {processingPayroll ? (
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <DollarSign className="w-4 h-4 mr-2" />
                      )}
                      Process Payroll
                    </Button>
                  </div>
                </div>

                {processingPayroll && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Processing payroll...</span>
                      <span>Calculating payments</span>
                    </div>
                    <Progress value={75} />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Provider Sync Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="w-5 h-5" />
                  Payroll Provider Sync
                </CardTitle>
                <CardDescription>
                  Synchronize data with external payroll providers
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-3">
                  <Button 
                    variant="outline" 
                    onClick={() => handleSyncPayroll('employee_sync')}
                    disabled={syncPayrollMutation.isPending}
                  >
                    Sync Employees
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => handleSyncPayroll('timesheet_sync')}
                    disabled={syncPayrollMutation.isPending}
                  >
                    Sync Timesheets
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => handleSyncPayroll('payment_sync')}
                    disabled={syncPayrollMutation.isPending}
                  >
                    Sync Payments
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Sync Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {syncLogs.slice(0, 5).map((log: any) => (
                    <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {log.status === 'success' ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-600" />
                        )}
                        <div>
                          <p className="font-medium">{log.syncType.replace('_', ' ').toUpperCase()}</p>
                          <p className="text-sm text-gray-600">
                            {log.recordsSucceeded}/{log.recordsProcessed} records processed
                          </p>
                        </div>
                      </div>
                      <Badge className={getStatusBadgeColor(log.status)}>
                        {log.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="timesheets" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Timesheet Management</CardTitle>
                <CardDescription>Review and approve employee timesheets</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingTimesheets ? (
                  <div className="flex items-center justify-center p-8">
                    <RefreshCw className="w-6 h-6 animate-spin" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Pay Period</TableHead>
                        <TableHead>Total Hours</TableHead>
                        <TableHead>Gross Pay</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {timesheets.map((timesheet: Timesheet) => (
                        <TableRow key={timesheet.id}>
                          <TableCell>User {timesheet.userId}</TableCell>
                          <TableCell>
                            {new Date(timesheet.payPeriodStart).toLocaleDateString()} - {new Date(timesheet.payPeriodEnd).toLocaleDateString()}
                          </TableCell>
                          <TableCell>{timesheet.totalHours}</TableCell>
                          <TableCell>${parseFloat(timesheet.grossPay || '0').toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge className={getStatusBadgeColor(timesheet.status)}>
                              {timesheet.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline">
                                <Eye className="w-4 h-4" />
                              </Button>
                              {timesheet.status === 'submitted' && (
                                <Button 
                                  size="sm" 
                                  onClick={() => updateTimesheetStatusMutation.mutate({ id: timesheet.id, status: 'approved' })}
                                >
                                  Approve
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Payment Management</CardTitle>
                <CardDescription>Track and manage employee payments</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingPayments ? (
                  <div className="flex items-center justify-center p-8">
                    <RefreshCw className="w-6 h-6 animate-spin" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Gross Amount</TableHead>
                        <TableHead>Deductions</TableHead>
                        <TableHead>Net Amount</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.map((payment: Payment) => {
                        const totalDeductions = parseFloat(payment.federalTax) + 
                                              parseFloat(payment.stateTax) + 
                                              parseFloat(payment.socialSecurity) + 
                                              parseFloat(payment.medicare);
                        return (
                          <TableRow key={payment.id}>
                            <TableCell>User {payment.userId}</TableCell>
                            <TableCell>${parseFloat(payment.grossAmount).toFixed(2)}</TableCell>
                            <TableCell>${totalDeductions.toFixed(2)}</TableCell>
                            <TableCell>${parseFloat(payment.netAmount).toFixed(2)}</TableCell>
                            <TableCell className="capitalize">{payment.paymentMethod.replace('_', ' ')}</TableCell>
                            <TableCell>
                              <Badge className={getStatusBadgeColor(payment.status)}>
                                {payment.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {payment.paymentDate ? new Date(payment.paymentDate).toLocaleDateString() : '-'}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="employees" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Payroll Employees</CardTitle>
                <CardDescription>Manage payroll configuration for employees</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingEmployees ? (
                  <div className="flex items-center justify-center p-8">
                    <RefreshCw className="w-6 h-6 animate-spin" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Hourly Rate</TableHead>
                        <TableHead>Overtime Rate</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payrollEmployees.map((employee: PayrollEmployee) => (
                        <TableRow key={employee.id}>
                          <TableCell>User {employee.userId}</TableCell>
                          <TableCell className="capitalize">{employee.employeeType}</TableCell>
                          <TableCell>${parseFloat(employee.hourlyRate || '0').toFixed(2)}</TableCell>
                          <TableCell>${parseFloat(employee.overtimeRate || '0').toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge className={employee.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                              {employee.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button size="sm" variant="outline">
                              <Settings className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="processing" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Processing Status</CardTitle>
                  <CardDescription>Real-time payroll processing information</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        Payroll processing runs automatically every bi-weekly period. 
                        Manual processing is available for corrections or off-cycle runs.
                      </AlertDescription>
                    </Alert>
                    
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-semibold mb-2">Next Scheduled Run</h4>
                      <p className="text-sm text-gray-600">Friday, June 28, 2025 at 2:00 AM</p>
                    </div>
                    
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-semibold mb-2">Last Successful Run</h4>
                      <p className="text-sm text-gray-600">Friday, June 14, 2025 at 2:00 AM</p>
                      <p className="text-sm text-green-600">✓ 47 timesheets processed successfully</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Integration Status</CardTitle>
                  <CardDescription>External payroll provider connections</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">ADP Workforce Now</p>
                        <p className="text-sm text-gray-600">Primary payroll provider</p>
                      </div>
                      <Badge className="bg-green-100 text-green-800">Connected</Badge>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">QuickBooks Payroll</p>
                        <p className="text-sm text-gray-600">Backup integration</p>
                      </div>
                      <Badge className="bg-yellow-100 text-yellow-800">Standby</Badge>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">Paychex Flex</p>
                        <p className="text-sm text-gray-600">Secondary option</p>
                      </div>
                      <Badge className="bg-gray-100 text-gray-800">Disconnected</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}