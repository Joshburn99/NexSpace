import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useFacilityPermissions } from "@/hooks/use-facility-permissions";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  DollarSign,
  FileText,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Plus,
  Edit,
  Eye,
  Download,
  Loader2,
} from "lucide-react";

// Schema for invoice creation/editing
const invoiceSchema = z.object({
  facilityId: z.number(),
  invoiceNumber: z.string().min(1, "Invoice number is required"),
  amount: z.number().positive("Amount must be positive"),
  description: z.string().min(1, "Description is required"),
  dueDate: z.string().min(1, "Due date is required"),
  status: z.enum(["pending", "approved", "paid", "overdue"]),
  lineItems: z
    .array(
      z.object({
        description: z.string(),
        quantity: z.number(),
        rate: z.number(),
        amount: z.number(),
      })
    )
    .optional(),
});

type Invoice = {
  id: number;
  facilityId: number;
  invoiceNumber: string;
  amount: number;
  description: string;
  dueDate: string;
  status: "pending" | "approved" | "paid" | "overdue";
  createdAt: string;
  facilityName?: string;
  lineItems?: Array<{
    description: string;
    quantity: number;
    rate: number;
    amount: number;
  }>;
};

type BillingRate = {
  id: number;
  facilityId: number;
  specialty: string;
  position: string;
  payRate: number;
  billRate: number;
  contractType: string;
  effectiveDate: string;
};

export default function BillingDashboard() {
  const { permissions, hasPermission, facilityId } = useFacilityPermissions();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCreateInvoice, setShowCreateInvoice] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [showRatesDialog, setShowRatesDialog] = useState(false);
  const [editingRate, setEditingRate] = useState<BillingRate | null>(null);

  // Permission check - only users with billing permissions can access this page
  if (!hasPermission("view_billing")) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <DollarSign className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Restricted</h3>
              <p className="text-gray-600">
                You don't have permission to view billing information.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Query for invoices
  const { data: invoices = [], isLoading: invoicesLoading } = useQuery<Invoice[]>({
    queryKey: ["/api/billing/invoices", facilityId],
    enabled: !!facilityId,
  });

  // Query for billing rates
  const { data: billingRates = [], isLoading: ratesLoading } = useQuery<BillingRate[]>({
    queryKey: ["/api/billing/rates", facilityId],
    enabled: !!facilityId && hasPermission("view_rates"),
  });

  // Calculate billing summary
  const billingSummary = {
    totalOutstanding: invoices
      .filter((i) => i.status !== "paid")
      .reduce((sum, i) => sum + i.amount, 0),
    totalPaid: invoices.filter((i) => i.status === "paid").reduce((sum, i) => sum + i.amount, 0),
    pendingApproval: invoices.filter((i) => i.status === "pending").length,
    overdue: invoices.filter((i) => i.status === "overdue").length,
  };

  // Form for creating/editing invoices
  const form = useForm<z.infer<typeof invoiceSchema>>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      facilityId: facilityId || 0,
      invoiceNumber: "",
      amount: 0,
      description: "",
      dueDate: "",
      status: "pending",
      lineItems: [],
    },
  });

  // Mutation for creating/updating invoices
  const invoiceMutation = useMutation({
    mutationFn: async (data: z.infer<typeof invoiceSchema>) => {
      const endpoint = editingInvoice
        ? `/api/billing/invoices/${editingInvoice.id}`
        : "/api/billing/invoices";
      const method = editingInvoice ? "PATCH" : "POST";
      const response = await apiRequest(method, endpoint, data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          error.message || `Failed to ${editingInvoice ? "update" : "create"} invoice`
        );
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/billing/invoices"] });
      setShowCreateInvoice(false);
      setEditingInvoice(null);
      form.reset();
      toast({
        title: "Success",
        description: `Invoice ${editingInvoice ? "updated" : "created"} successfully`,
      });
    },
    onError: (error: any) => {

      toast({
        title: "Error",
        description:
          error.message ||
          `Failed to ${editingInvoice ? "update" : "create"} invoice. Please check your connection and try again.`,
        variant: "destructive",
      });
    },
  });

  // Mutation for approving invoices
  const approveMutation = useMutation({
    mutationFn: async (invoiceId: number) => {
      const response = await apiRequest("PATCH", `/api/billing/invoices/${invoiceId}/approve`, {});
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to approve invoice");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/billing/invoices"] });
      toast({
        title: "Success",
        description: "Invoice approved successfully",
      });
    },
    onError: (error: any) => {

      toast({
        title: "Error",
        description:
          error.message || "Failed to approve invoice. Please check your connection and try again.",
        variant: "destructive",
      });
    },
  });

  const handleCreateInvoice = (data: z.infer<typeof invoiceSchema>) => {
    invoiceMutation.mutate(data);
  };

  const handleApproveInvoice = (invoiceId: number) => {
    approveMutation.mutate(invoiceId);
  };

  const handleEditInvoice = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    form.reset({
      facilityId: invoice.facilityId,
      invoiceNumber: invoice.invoiceNumber,
      amount: invoice.amount,
      description: invoice.description,
      dueDate: invoice.dueDate,
      status: invoice.status,
      lineItems: invoice.lineItems || [],
    });
    setShowCreateInvoice(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-800";
      case "approved":
        return "bg-blue-100 text-blue-800";
      case "overdue":
        return "bg-red-100 text-red-800";
      default:
        return "bg-yellow-100 text-yellow-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "paid":
        return <CheckCircle className="h-4 w-4" />;
      case "approved":
        return <CheckCircle className="h-4 w-4" />;
      case "overdue":
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Billing Dashboard</h1>
          <p className="text-gray-600">Manage invoices, rates, and billing information</p>
        </div>

        {hasPermission("manage_billing") && (
          <div className="flex gap-2">
            <Button onClick={() => setShowCreateInvoice(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Invoice
            </Button>
            {hasPermission("view_rates") && (
              <Button variant="outline" onClick={() => setShowRatesDialog(true)}>
                <Eye className="h-4 w-4 mr-2" />
                View Rates
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Billing Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Outstanding</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${billingSummary.totalOutstanding.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Unpaid invoices</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${billingSummary.totalPaid.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Completed payments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{billingSummary.pendingApproval}</div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{billingSummary.overdue}</div>
            <p className="text-xs text-muted-foreground">Past due date</p>
          </CardContent>
        </Card>
      </div>

      {/* Invoices Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          {invoicesLoading ? (
            <div className="text-center py-8">Loading invoices...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                    <TableCell>{invoice.description}</TableCell>
                    <TableCell>${invoice.amount.toLocaleString()}</TableCell>
                    <TableCell>{new Date(invoice.dueDate).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(invoice.status)}>
                        {getStatusIcon(invoice.status)}
                        <span className="ml-1">{invoice.status}</span>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {hasPermission("manage_billing") && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditInvoice(invoice)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {hasPermission("approve_invoices") && invoice.status === "pending" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleApproveInvoice(invoice.id)}
                            disabled={approveMutation.isPending}
                          >
                            {approveMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <CheckCircle className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                        <Button variant="ghost" size="sm">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Invoice Dialog */}
      <Dialog open={showCreateInvoice} onOpenChange={setShowCreateInvoice}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingInvoice ? "Edit Invoice" : "Create New Invoice"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleCreateInvoice)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="invoiceNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Invoice Number</FormLabel>
                      <FormControl>
                        <Input placeholder="INV-001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Invoice description..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Due Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="approved">Approved</SelectItem>
                          <SelectItem value="paid">Paid</SelectItem>
                          <SelectItem value="overdue">Overdue</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowCreateInvoice(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={invoiceMutation.isPending}>
                  {invoiceMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {editingInvoice ? "Updating..." : "Creating..."}
                    </>
                  ) : (
                    `${editingInvoice ? "Update" : "Create"} Invoice`
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Rates Dialog */}
      {hasPermission("view_rates") && (
        <Dialog open={showRatesDialog} onOpenChange={setShowRatesDialog}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Billing & Pay Rates</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {hasPermission("edit_rates") && (
                <div className="flex justify-end">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Rate
                  </Button>
                </div>
              )}

              {ratesLoading ? (
                <div className="text-center py-8">Loading rates...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Specialty</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Pay Rate</TableHead>
                      <TableHead>Bill Rate</TableHead>
                      <TableHead>Contract Type</TableHead>
                      <TableHead>Effective Date</TableHead>
                      {hasPermission("edit_rates") && <TableHead>Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {billingRates.map((rate) => (
                      <TableRow key={rate.id}>
                        <TableCell>{rate.specialty}</TableCell>
                        <TableCell>{rate.position}</TableCell>
                        <TableCell>${rate.payRate}/hr</TableCell>
                        <TableCell>${rate.billRate}/hr</TableCell>
                        <TableCell>{rate.contractType}</TableCell>
                        <TableCell>{new Date(rate.effectiveDate).toLocaleDateString()}</TableCell>
                        {hasPermission("edit_rates") && (
                          <TableCell>
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
