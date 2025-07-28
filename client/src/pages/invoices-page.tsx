import { useState } from "react";
import { DollarSign, FileText, Calendar, User, Download, Eye, Check, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { SidebarNav } from "@/components/ui/sidebar-nav";
import { useInvoices } from "@/contexts/InvoiceContext";

export default function InvoicesPage() {
  const { user } = useAuth();
  const {
    invoices,
    paymentSummary,
    getInvoicesByStatus,
    getOverdueInvoices,
    getPendingInvoices,
    updateInvoiceStatus,
    isLoading,
  } = useInvoices();
  const [statusFilter, setStatusFilter] = useState("all");

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "sent":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "paid":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "overdue":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "cancelled":
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Calendar className="w-4 h-4" />;
      case "sent":
        return <FileText className="w-4 h-4" />;
      case "paid":
        return <Check className="w-4 h-4" />;
      case "overdue":
        return <X className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const filteredInvoices =
    statusFilter === "all" ? invoices : getInvoicesByStatus(statusFilter as any);

  const pendingInvoices = getPendingInvoices();
  const overdueInvoices = getOverdueInvoices();

  if (isLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Invoices</h1>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <FileText className="h-4 w-4 mr-2" />
          New Invoice
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Invoices
              </span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {paymentSummary.totalInvoices}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                ${paymentSummary.totalAmount.toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Paid</span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                ${paymentSummary.paidAmount.toLocaleString()}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {Math.round(paymentSummary.paymentRate)}% payment rate
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-yellow-600" />
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending</span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                ${paymentSummary.pendingAmount.toLocaleString()}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {pendingInvoices.length} invoices
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <X className="h-5 w-5 text-red-600" />
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Overdue</span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                ${paymentSummary.overdueAmount.toLocaleString()}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {overdueInvoices.length} invoices
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Invoices</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Invoices List */}
      <Card>
        <CardHeader>
          <CardTitle>Invoice List</CardTitle>
          <CardDescription>Manage and track all invoices</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredInvoices.map((invoice) => (
              <div
                key={invoice.id}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(invoice.status)}
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {invoice.invoiceNumber}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {invoice.userName} • {invoice.facilityName}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <Badge className={getStatusColor(invoice.status)}>
                      {invoice.status.toUpperCase()}
                    </Badge>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {new Date(invoice.issueDate).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="font-semibold text-gray-900 dark:text-white">
                      ${invoice.totalAmount.toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Due: {new Date(invoice.dueDate).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
