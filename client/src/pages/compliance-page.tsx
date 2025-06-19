import { useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  Shield,
  FileText,
  Download,
  Users,
  Clock,
  CheckCircle,
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/use-auth';
import { SidebarNav } from '@/components/ui/sidebar-nav';
import { useToast } from '@/hooks/use-toast';

const mockComplianceData = [
  {
    id: 1,
    employeeName: 'Sarah Johnson',
    position: 'Registered Nurse',
    department: 'ICU',
    credentialType: 'RN License',
    issueDate: '2023-01-15',
    expiryDate: '2025-01-15',
    daysUntilExpiry: 212,
    status: 'active',
    issuingAuthority: 'Florida Board of Nursing',
    licenseNumber: 'RN-FL-123456',
  },
  {
    id: 2,
    employeeName: 'Michael Chen',
    position: 'Licensed Practical Nurse',
    department: 'Memory Care',
    credentialType: 'CPR Certification',
    issueDate: '2024-03-10',
    expiryDate: '2025-03-10',
    daysUntilExpiry: 82,
    status: 'expiring_soon',
    issuingAuthority: 'American Heart Association',
    licenseNumber: 'CPR-AHA-789012',
  },
  {
    id: 3,
    employeeName: 'Emily Rodriguez',
    position: 'Certified Nursing Assistant',
    department: 'Assisted Living',
    credentialType: 'CNA License',
    issueDate: '2023-05-01',
    expiryDate: '2024-12-31',
    daysUntilExpiry: -17,
    status: 'expired',
    issuingAuthority: 'Florida Department of Health',
    licenseNumber: 'CNA-FL-345678',
  },
  {
    id: 4,
    employeeName: 'David Thompson',
    position: 'Physical Therapist',
    department: 'Rehabilitation',
    credentialType: 'PT License',
    issueDate: '2022-11-08',
    expiryDate: '2025-11-08',
    daysUntilExpiry: 510,
    status: 'active',
    issuingAuthority: 'Florida Board of Physical Therapy',
    licenseNumber: 'PT-FL-987654',
  },
  {
    id: 5,
    employeeName: 'Lisa Williams',
    position: 'Registered Nurse',
    department: 'Emergency',
    credentialType: 'BLS Certification',
    issueDate: '2024-06-01',
    expiryDate: '2025-06-01',
    daysUntilExpiry: 30,
    status: 'expiring_soon',
    issuingAuthority: 'American Heart Association',
    licenseNumber: 'BLS-AHA-456789',
  },
];

const complianceIssues = [
  {
    id: 1,
    type: 'Missing Documentation',
    description: '3 employees missing TB test results',
    severity: 'high',
    affectedCount: 3,
    dueDate: '2025-06-30',
  },
  {
    id: 2,
    type: 'Training Overdue',
    description: 'Annual safety training overdue for 5 staff members',
    severity: 'medium',
    affectedCount: 5,
    dueDate: '2025-07-15',
  },
  {
    id: 3,
    type: 'Background Check',
    description: 'Background check renewal needed for 2 contractors',
    severity: 'high',
    affectedCount: 2,
    dueDate: '2025-06-25',
  },
];

export default function CompliancePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [timeframe, setTimeframe] = useState('next_90_days');
  const [credentialType, setCredentialType] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'expiring_soon':
        return 'bg-yellow-100 text-yellow-800';
      case 'expired':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4" />;
      case 'expiring_soon':
        return <Clock className="w-4 h-4" />;
      case 'expired':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <Shield className="w-4 h-4" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredData = mockComplianceData.filter(record => {
    const matchesSearch =
      searchTerm === '' ||
      record.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.credentialType.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType =
      credentialType === 'all' || record.credentialType === credentialType;
    const matchesStatus =
      statusFilter === 'all' || record.status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  const credentialTypes = Array.from(
    new Set(mockComplianceData.map(record => record.credentialType)),
  );

  const activeCredentials = mockComplianceData.filter(
    c => c.status === 'active',
  ).length;
  const expiringSoon = mockComplianceData.filter(
    c => c.status === 'expiring_soon',
  ).length;
  const expired = mockComplianceData.filter(c => c.status === 'expired').length;
  const totalIssues = complianceIssues.length;

  const generateReport = (type: string) => {
    toast({
      title: `${type} report generated`,
      description:
        'Report has been generated and will be emailed to you shortly.',
    });
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <SidebarNav user={user!} />
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Compliance Tracking
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Monitor credentials, certifications, and compliance issues
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => generateReport('Weekly')}
              >
                <FileText className="w-4 h-4 mr-2" />
                Weekly Report
              </Button>
              <Button
                variant="outline"
                onClick={() => generateReport('Monthly')}
              >
                <Calendar className="w-4 h-4 mr-2" />
                Monthly Report
              </Button>
              <Button onClick={() => generateReport('Custom')}>
                <Download className="w-4 h-4 mr-2" />
                Export Data
              </Button>
            </div>
          </div>

          {/* Compliance Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                      Active Credentials
                    </p>
                    <p className="text-2xl font-bold text-green-600">
                      {activeCredentials}
                    </p>
                    <p className="text-xs text-gray-500">Up to date</p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                      Expiring Soon
                    </p>
                    <p className="text-2xl font-bold text-yellow-600">
                      {expiringSoon}
                    </p>
                    <p className="text-xs text-gray-500">Next 90 days</p>
                  </div>
                  <Clock className="w-8 h-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                      Expired
                    </p>
                    <p className="text-2xl font-bold text-red-600">{expired}</p>
                    <p className="text-xs text-gray-500">Needs renewal</p>
                  </div>
                  <AlertTriangle className="w-8 h-8 text-red-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                      Compliance Issues
                    </p>
                    <p className="text-2xl font-bold text-orange-600">
                      {totalIssues}
                    </p>
                    <p className="text-xs text-gray-500">Active issues</p>
                  </div>
                  <Shield className="w-8 h-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Compliance Issues Alert */}
          {complianceIssues.length > 0 && (
            <Card className="mb-6 border-red-200 bg-red-50 dark:bg-red-900/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-800 dark:text-red-200">
                  <AlertTriangle className="w-5 h-5" />
                  Active Compliance Issues
                </CardTitle>
                <CardDescription className="text-red-700 dark:text-red-300">
                  Issues requiring immediate attention
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {complianceIssues.map(issue => (
                    <div
                      key={issue.id}
                      className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <Badge className={getSeverityColor(issue.severity)}>
                            {issue.severity.toUpperCase()}
                          </Badge>
                          <h4 className="font-medium">{issue.type}</h4>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                          {issue.description}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {issue.affectedCount} staff affected • Due:{' '}
                          {new Date(issue.dueDate).toLocaleDateString()}
                        </p>
                      </div>
                      <Button variant="outline" size="sm">
                        Resolve
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-64">
                  <Input
                    placeholder="Search by employee name or credential type..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                </div>
                <Select value={timeframe} onValueChange={setTimeframe}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Time Period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="next_30_days">Next 30 Days</SelectItem>
                    <SelectItem value="next_90_days">Next 90 Days</SelectItem>
                    <SelectItem value="next_6_months">Next 6 Months</SelectItem>
                    <SelectItem value="all_active">All Active</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={credentialType}
                  onValueChange={setCredentialType}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Credential Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {credentialTypes.map(type => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="expiring_soon">Expiring Soon</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Credential Details */}
          <Card>
            <CardHeader>
              <CardTitle>Credential Details</CardTitle>
              <CardDescription>
                Detailed credential tracking for all staff (
                {filteredData.length} records)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredData.map(record => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center space-x-4">
                      <Avatar className="w-12 h-12">
                        <AvatarFallback>
                          {record.employeeName
                            .split(' ')
                            .map(n => n[0])
                            .join('')}
                        </AvatarFallback>
                      </Avatar>

                      <div>
                        <h4 className="font-medium">{record.employeeName}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          {record.position}
                        </p>
                        <p className="text-sm text-gray-500">
                          {record.department}
                        </p>
                      </div>
                    </div>

                    <div className="text-center">
                      <h4 className="font-medium">{record.credentialType}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {record.issuingAuthority}
                      </p>
                      <p className="text-sm text-gray-500">
                        {record.licenseNumber}
                      </p>
                    </div>

                    <div className="text-center">
                      <p className="text-sm">
                        <span className="font-medium">Issued:</span>{' '}
                        {new Date(record.issueDate).toLocaleDateString()}
                      </p>
                      <p className="text-sm">
                        <span className="font-medium">Expires:</span>{' '}
                        {new Date(record.expiryDate).toLocaleDateString()}
                      </p>
                      {record.daysUntilExpiry >= 0 ? (
                        <p
                          className={`text-sm ${record.daysUntilExpiry <= 90 ? 'text-yellow-600' : 'text-green-600'}`}
                        >
                          {record.daysUntilExpiry} days remaining
                        </p>
                      ) : (
                        <p className="text-sm text-red-600">
                          Expired {Math.abs(record.daysUntilExpiry)} days ago
                        </p>
                      )}
                    </div>

                    <div className="text-center">
                      <Badge className={getStatusColor(record.status)}>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(record.status)}
                          {record.status === 'expiring_soon'
                            ? 'Expiring Soon'
                            : record.status === 'expired'
                              ? 'Expired'
                              : record.status.charAt(0).toUpperCase() +
                                record.status.slice(1)}
                        </div>
                      </Badge>
                    </div>

                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                      {(record.status === 'expired' ||
                        record.status === 'expiring_soon') && (
                        <Button size="sm">Renew</Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {filteredData.length === 0 && (
                <div className="text-center py-8">
                  <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No credentials found
                  </h3>
                  <p className="text-gray-500">
                    Try adjusting your search criteria or filters
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
