import { useState } from 'react';
import {
  DollarSign,
  FileText,
  Calendar,
  User,
  Download,
  Eye,
  Check,
  X,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/hooks/use-auth';
import { SidebarNav } from '@/components/ui/sidebar-nav';

const mockInvoices = [
  {
    id: 'INV-2025-001',
    contractorName: 'Sarah Johnson',
    facility: 'Sunrise Senior Living',
    period: '2025-06-01 to 2025-06-15',
    hoursWorked: 84,
    hourlyRate: 45,
    totalAmount: 3780,
    status: 'pending',
    submittedDate: '2025-06-16T10:00:00Z',
    approvedDate: null,
    paidDate: null,
    notes: 'Includes overtime for emergency coverage',
  },
  {
    id: 'INV-2025-002',
    contractorName: 'Michael Chen',
    facility: 'Golden Years Care Center',
    period: '2025-06-01 to 2025-06-15',
    hoursWorked: 72,
    hourlyRate: 32,
    totalAmount: 2304,
    status: 'approved',
    submittedDate: '2025-06-16T14:30:00Z',
    approvedDate: '2025-06-17T09:15:00Z',
    paidDate: null,
    notes: null,
  },
  {
    id: 'INV-2025-003',
    contractorName: 'Emily Rodriguez',
    facility: 'Harmony Health Center',
    period: '2025-05-16 to 2025-05-31',
    hoursWorked: 88,
    hourlyRate: 22,
    totalAmount: 1936,
    status: 'paid',
    submittedDate: '2025-06-01T08:00:00Z',
    approvedDate: '2025-06-02T11:30:00Z',
    paidDate: '2025-06-05T16:45:00Z',
    notes: 'Bi-weekly payment processed',
  },
  {
    id: 'INV-2025-004',
    contractorName: 'David Thompson',
    facility: 'Rehabilitation Center East',
    period: '2025-06-01 to 2025-06-15',
    hoursWorked: 64,
    hourlyRate: 55,
    totalAmount: 3520,
    status: 'rejected',
    submittedDate: '2025-06-16T16:20:00Z',
    approvedDate: null,
    paidDate: null,
    notes:
      'Missing required documentation - resubmit with timesheet signatures',
  },
];

export default function InvoicesPage() {
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState('all');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-blue-100 text-blue-800';
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Calendar className="w-4 h-4" />;
      case 'approved':
        return <Check className="w-4 h-4" />;
      case 'paid':
        return <DollarSign className="w-4 h-4" />;
      case 'rejected':
        return <X className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const filteredInvoices =
    statusFilter === 'all'
      ? mockInvoices
      : mockInvoices.filter(invoice => invoice.status === statusFilter);

  const totalPending = mockInvoices
    .filter(inv => inv.status === 'pending')
    .reduce((sum, inv) => sum + inv.totalAmount, 0);

  const totalApproved = mockInvoices
    .filter(inv => inv.status === 'approved')
    .reduce((sum, inv) => sum + inv.totalAmount, 0);

  const totalPaid = mockInvoices
    .filter(inv => inv.status === 'paid')
    .reduce((sum, inv) => sum + inv.totalAmount, 0);

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <SidebarNav user={user!} />
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Invoices
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Manage contractor invoices and payments
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Button variant="outline">Auto-Approval Settings</Button>
              <Button>Create Invoice</Button>
            </div>
          </div>

          {/* Invoice Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                      Total Invoices
                    </p>
                    <p className="text-2xl font-bold">{mockInvoices.length}</p>
                  </div>
                  <FileText className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                      Pending
                    </p>
                    <p className="text-2xl font-bold text-yellow-600">
                      ${totalPending.toLocaleString()}
                    </p>
                  </div>
                  <Calendar className="w-8 h-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                      Approved
                    </p>
                    <p className="text-2xl font-bold text-blue-600">
                      ${totalApproved.toLocaleString()}
                    </p>
                  </div>
                  <Check className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                      Paid
                    </p>
                    <p className="text-2xl font-bold text-green-600">
                      ${totalPaid.toLocaleString()}
                    </p>
                  </div>
                  <DollarSign className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Invoices</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  Showing {filteredInvoices.length} of {mockInvoices.length}{' '}
                  invoices
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Invoices List */}
          <div className="space-y-4">
            {filteredInvoices.map(invoice => (
              <Card
                key={invoice.id}
                className="hover:shadow-md transition-shadow"
              >
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-1">
                      <div>
                        <h3 className="font-semibold text-lg">{invoice.id}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <User className="w-4 h-4 text-gray-500" />
                          <span className="text-gray-600 dark:text-gray-300">
                            {invoice.contractorName}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          {getStatusIcon(invoice.status)}
                          <Badge className={getStatusColor(invoice.status)}>
                            {invoice.status.charAt(0).toUpperCase() +
                              invoice.status.slice(1)}
                          </Badge>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="text-sm">
                          <span className="font-medium">Facility:</span>{' '}
                          {invoice.facility}
                        </div>
                        <div className="text-sm">
                          <span className="font-medium">Period:</span>{' '}
                          {invoice.period}
                        </div>
                        <div className="text-sm">
                          <span className="font-medium">Hours:</span>{' '}
                          {invoice.hoursWorked}h @ ${invoice.hourlyRate}/hr
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="text-sm">
                          <span className="font-medium">Submitted:</span>{' '}
                          {new Date(invoice.submittedDate).toLocaleDateString()}
                        </div>
                        {invoice.approvedDate && (
                          <div className="text-sm">
                            <span className="font-medium">Approved:</span>{' '}
                            {new Date(
                              invoice.approvedDate,
                            ).toLocaleDateString()}
                          </div>
                        )}
                        {invoice.paidDate && (
                          <div className="text-sm">
                            <span className="font-medium">Paid:</span>{' '}
                            {new Date(invoice.paidDate).toLocaleDateString()}
                          </div>
                        )}
                      </div>

                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">
                          ${invoice.totalAmount.toLocaleString()}
                        </div>
                        {invoice.notes && (
                          <div className="text-xs text-gray-500 mt-2 max-w-48">
                            {invoice.notes}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 ml-4">
                      <Button variant="outline" size="sm">
                        <Eye className="w-4 h-4 mr-2" />
                        View
                      </Button>
                      <Button variant="outline" size="sm">
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                      {invoice.status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Check className="w-4 h-4 mr-2" />
                            Approve
                          </Button>
                          <Button variant="destructive" size="sm">
                            <X className="w-4 h-4 mr-2" />
                            Reject
                          </Button>
                        </>
                      )}
                      {invoice.status === 'approved' && (
                        <Button size="sm">
                          <DollarSign className="w-4 h-4 mr-2" />
                          Process Payment
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredInvoices.length === 0 && (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No invoices found
              </h3>
              <p className="text-gray-500">
                {statusFilter === 'all'
                  ? 'No invoices have been submitted yet'
                  : `No ${statusFilter} invoices found`}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
