import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Plus, Eye, DollarSign, Calendar, Building, TrendingUp, ArrowLeft, Home, Check, X } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";

interface VendorInvoice {
  id: number;
  vendorName: string;
  vendorType: string;
  invoiceNumber: string;
  amount: number;
  status: string;
  dueDate: string;
  serviceDate: string;
  description: string;
  facilityId: number;
  facilityName: string;
  createdAt: string;
}

export default function VendorInvoicesPage() {
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedVendorType, setSelectedVendorType] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const { data: vendorInvoices = [], isLoading } = useQuery({
    queryKey: ["/api/vendor-invoices"],
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ["/api/vendors"],
  });

  const { data: facilities = [] } = useQuery({
    queryKey: ["/api/facilities"],
  });

  const createInvoiceMutation = useMutation({
    mutationFn: async (invoiceData: any) => {
      const response = await apiRequest("POST", "/api/vendor-invoices", invoiceData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendor-invoices"] });
      setIsCreateDialogOpen(false);
    },
  });

  const updateInvoiceStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const response = await apiRequest("PATCH", `/api/vendor-invoices/${id}`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendor-invoices"] });
    },
  });

  const filteredInvoices = vendorInvoices.filter((invoice: VendorInvoice) => {
    const matchesStatus = selectedStatus === "all" || invoice.status === selectedStatus;
    const matchesVendorType = selectedVendorType === "all" || invoice.vendorType === selectedVendorType;
    return matchesStatus && matchesVendorType;
  });

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "paid": return "default";
      case "approved": return "secondary";
      case "pending": return "outline";
      case "overdue": return "destructive";
      default: return "outline";
    }
  };

  const handleCreateInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const invoiceData = {
      vendorName: formData.get("vendorName"),
      vendorType: formData.get("vendorType"),
      invoiceNumber: formData.get("invoiceNumber"),
      amount: parseFloat(formData.get("amount") as string),
      dueDate: formData.get("dueDate"),
      serviceDate: formData.get("serviceDate"),
      description: formData.get("description"),
      facilityId: parseInt(formData.get("facilityId") as string),
      status: "pending",
    };
    createInvoiceMutation.mutate(invoiceData);
  };

  // Calculate summary statistics
  const totalAmount = filteredInvoices.reduce((sum: number, invoice: VendorInvoice) => sum + invoice.amount, 0);
  const paidAmount = filteredInvoices
    .filter((invoice: VendorInvoice) => invoice.status === "paid")
    .reduce((sum: number, invoice: VendorInvoice) => sum + invoice.amount, 0);
  const pendingAmount = filteredInvoices
    .filter((invoice: VendorInvoice) => invoice.status === "pending")
    .reduce((sum: number, invoice: VendorInvoice) => sum + invoice.amount, 0);

  // Vendor type analytics
  const vendorTypeStats = filteredInvoices.reduce((acc: any, invoice: VendorInvoice) => {
    if (!acc[invoice.vendorType]) {
      acc[invoice.vendorType] = { count: 0, amount: 0 };
    }
    acc[invoice.vendorType].count += 1;
    acc[invoice.vendorType].amount += invoice.amount;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-4 mb-4">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <Home className="h-4 w-4" />
              Dashboard
            </Button>
          </Link>
          <Link href="/invoices">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Professional Invoices
            </Button>
          </Link>
        </div>
        <h1 className="text-3xl font-bold">Vendor Invoices</h1>
        <p className="text-muted-foreground">
          Manage invoices from agencies, contractors, and other service providers
        </p>
      </div>

      <Tabs defaultValue="invoices" className="space-y-6">
        <TabsList>
          <TabsTrigger value="invoices">Invoice Management</TabsTrigger>
          <TabsTrigger value="analytics">Vendor Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-500" />
                  <div>
                    <p className="text-sm font-medium">Total Invoices</p>
                    <p className="text-2xl font-bold">{filteredInvoices.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-green-500" />
                  <div>
                    <p className="text-sm font-medium">Total Amount</p>
                    <p className="text-2xl font-bold">${totalAmount.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <div>
                    <p className="text-sm font-medium">Paid</p>
                    <p className="text-2xl font-bold">${paidAmount.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-orange-500" />
                  <div>
                    <p className="text-sm font-medium">Pending</p>
                    <p className="text-2xl font-bold">${pendingAmount.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedVendorType} onValueChange={setSelectedVendorType}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by vendor type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Vendor Types</SelectItem>
                <SelectItem value="staffing_agency">Staffing Agency</SelectItem>
                <SelectItem value="medical_supply">Medical Supply</SelectItem>
                <SelectItem value="equipment_rental">Equipment Rental</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="consulting">Consulting</SelectItem>
                <SelectItem value="it_services">IT Services</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex-1" />
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Invoice
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create Vendor Invoice</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateInvoice} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="vendorName">Vendor Name</Label>
                      <Input id="vendorName" name="vendorName" required />
                    </div>
                    <div>
                      <Label htmlFor="vendorType">Vendor Type</Label>
                      <Select name="vendorType" required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select vendor type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="staffing_agency">Staffing Agency</SelectItem>
                          <SelectItem value="medical_supply">Medical Supply</SelectItem>
                          <SelectItem value="equipment_rental">Equipment Rental</SelectItem>
                          <SelectItem value="maintenance">Maintenance</SelectItem>
                          <SelectItem value="consulting">Consulting</SelectItem>
                          <SelectItem value="it_services">IT Services</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="invoiceNumber">Invoice Number</Label>
                      <Input id="invoiceNumber" name="invoiceNumber" required />
                    </div>
                    <div>
                      <Label htmlFor="amount">Amount</Label>
                      <Input id="amount" name="amount" type="number" step="0.01" required />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="serviceDate">Service Date</Label>
                      <Input id="serviceDate" name="serviceDate" type="date" required />
                    </div>
                    <div>
                      <Label htmlFor="dueDate">Due Date</Label>
                      <Input id="dueDate" name="dueDate" type="date" required />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="facilityId">Facility</Label>
                    <Select name="facilityId" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select facility" />
                      </SelectTrigger>
                      <SelectContent>
                        {facilities.map((facility: any) => (
                          <SelectItem key={facility.id} value={facility.id.toString()}>
                            {facility.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Input id="description" name="description" />
                  </div>
                  <Button type="submit" disabled={createInvoiceMutation.isPending}>
                    {createInvoiceMutation.isPending ? "Creating..." : "Create Invoice"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Vendor Invoices ({filteredInvoices.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">Loading invoices...</div>
              ) : filteredInvoices.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No vendor invoices found</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Facility</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvoices.map((invoice: VendorInvoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{invoice.vendorName}</div>
                            <div className="text-sm text-muted-foreground">{invoice.description}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {invoice.vendorType.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>{invoice.facilityName}</TableCell>
                        <TableCell className="font-medium">${invoice.amount.toLocaleString()}</TableCell>
                        <TableCell>
                          {format(new Date(invoice.dueDate), "MMM dd, yyyy")}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(invoice.status)}>
                            {invoice.status.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline">
                              <Eye className="h-3 w-3" />
                            </Button>
                            {invoice.status === "pending" && (
                              <>
                                <Button 
                                  size="sm" 
                                  variant="default"
                                  onClick={() => updateInvoiceStatusMutation.mutate({ id: invoice.id, status: "approved" })}
                                >
                                  <Check className="h-3 w-3" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="destructive"
                                  onClick={() => updateInvoiceStatusMutation.mutate({ id: invoice.id, status: "rejected" })}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </>
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

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Vendor Type Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(vendorTypeStats).map(([type, stats]: [string, any]) => (
                    <div key={type} className="flex justify-between items-center">
                      <div>
                        <div className="font-medium">{type.replace('_', ' ').toUpperCase()}</div>
                        <div className="text-sm text-muted-foreground">{stats.count} invoices</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">${stats.amount.toLocaleString()}</div>
                        <div className="text-sm text-muted-foreground">
                          {((stats.amount / totalAmount) * 100).toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Top Vendors
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(
                    filteredInvoices.reduce((acc: any, invoice: VendorInvoice) => {
                      if (!acc[invoice.vendorName]) {
                        acc[invoice.vendorName] = { count: 0, amount: 0, type: invoice.vendorType };
                      }
                      acc[invoice.vendorName].count += 1;
                      acc[invoice.vendorName].amount += invoice.amount;
                      return acc;
                    }, {})
                  )
                    .sort(([, a]: [string, any], [, b]: [string, any]) => b.amount - a.amount)
                    .slice(0, 5)
                    .map(([vendor, stats]: [string, any]) => (
                      <div key={vendor} className="flex justify-between items-center">
                        <div>
                          <div className="font-medium">{vendor}</div>
                          <div className="text-sm text-muted-foreground">
                            {stats.type.replace('_', ' ')} • {stats.count} invoices
                          </div>
                        </div>
                        <div className="font-bold">${stats.amount.toLocaleString()}</div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}