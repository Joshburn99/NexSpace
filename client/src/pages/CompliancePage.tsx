import React, { useState } from 'react';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/hooks/use-auth';
import { useFacilityPermissions } from '@/hooks/use-facility-permissions';
import { PermissionGuard } from '@/components/PermissionGuard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Shield,
  FileText,
  Upload,
  CheckCircle,
  AlertCircle,
  Clock,
  Download,
  Eye,
  Edit,
  Calendar,
  Users,
  Search,
  Filter,
  Plus,
  ChevronRight,
  AlertTriangle,
  FileCheck
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Mock data for staff credentials
const mockStaffCredentials = [
  {
    id: 1,
    staffName: 'Sarah Johnson',
    staffId: 1,
    department: 'ICU',
    credentials: [
      { type: 'RN License', expiryDate: '2025-08-15', status: 'active', documentUrl: '/docs/rn-license-sarah.pdf' },
      { type: 'BLS Certification', expiryDate: '2025-02-28', status: 'warning', documentUrl: '/docs/bls-sarah.pdf' },
      { type: 'ACLS Certification', expiryDate: '2024-12-31', status: 'expired', documentUrl: '/docs/acls-sarah.pdf' }
    ]
  },
  {
    id: 2,
    staffName: 'Michael Chen',
    staffId: 2,
    department: 'Med-Surg',
    credentials: [
      { type: 'LPN License', expiryDate: '2025-10-20', status: 'active', documentUrl: '/docs/lpn-license-michael.pdf' },
      { type: 'BLS Certification', expiryDate: '2025-06-15', status: 'active', documentUrl: '/docs/bls-michael.pdf' }
    ]
  },
  {
    id: 3,
    staffName: 'Emma Rodriguez',
    staffId: 3,
    department: 'Emergency',
    credentials: [
      { type: 'MD License', expiryDate: '2026-01-15', status: 'active', documentUrl: '/docs/md-license-emma.pdf' },
      { type: 'DEA Registration', expiryDate: '2025-03-31', status: 'warning', documentUrl: '/docs/dea-emma.pdf' },
      { type: 'Board Certification', expiryDate: '2027-05-20', status: 'active', documentUrl: '/docs/board-cert-emma.pdf' }
    ]
  }
];

// Mock data for facility compliance documents
const mockFacilityDocuments = [
  {
    id: 1,
    name: 'Emergency Preparedness Plan',
    category: 'Policy',
    lastUpdated: '2025-01-15',
    nextReview: '2025-07-15',
    status: 'active',
    uploadedBy: 'John Doe',
    documentUrl: '/docs/emergency-plan.pdf'
  },
  {
    id: 2,
    name: 'Infection Control Policy',
    category: 'Policy',
    lastUpdated: '2024-11-20',
    nextReview: '2025-02-20',
    status: 'warning',
    uploadedBy: 'Jane Smith',
    documentUrl: '/docs/infection-control.pdf'
  },
  {
    id: 3,
    name: 'State License Certificate',
    category: 'License',
    lastUpdated: '2024-08-01',
    nextReview: '2025-08-01',
    status: 'active',
    uploadedBy: 'Admin User',
    documentUrl: '/docs/state-license.pdf'
  },
  {
    id: 4,
    name: 'Fire Safety Inspection Report',
    category: 'Inspection',
    lastUpdated: '2024-12-10',
    nextReview: '2025-06-10',
    status: 'active',
    uploadedBy: 'Mike Johnson',
    documentUrl: '/docs/fire-safety.pdf'
  }
];

// Mock data for training compliance
const mockTrainingCompliance = [
  { name: 'HIPAA Training', completionRate: 92, required: 100, dueDate: '2025-03-01' },
  { name: 'Fire Safety Training', completionRate: 78, required: 100, dueDate: '2025-02-15' },
  { name: 'CPR Certification', completionRate: 85, required: 100, dueDate: '2025-04-30' },
  { name: 'Infection Control', completionRate: 95, required: 100, dueDate: '2025-05-15' }
];

export default function CompliancePage() {
  const { user } = useAuth();
  const { hasPermission } = useFacilityPermissions();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedCredentialStatus, setSelectedCredentialStatus] = useState('all');
  const [selectedTab, setSelectedTab] = useState('overview');

  // Filter credentials based on search and filters
  const filteredCredentials = mockStaffCredentials.filter(staff => {
    const matchesSearch = staff.staffName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = selectedDepartment === 'all' || staff.department === selectedDepartment;
    return matchesSearch && matchesDepartment;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-50';
      case 'warning': return 'text-yellow-600 bg-yellow-50';
      case 'expired': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="h-4 w-4" />;
      case 'warning': return <Clock className="h-4 w-4" />;
      case 'expired': return <AlertCircle className="h-4 w-4" />;
      default: return null;
    }
  };

  return (
    <Layout>
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Compliance Management</h1>
          <p className="text-gray-600">
            Manage staff credentials, facility documents, and regulatory compliance
          </p>
        </div>

        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="credentials">Staff Credentials</TabsTrigger>
            <TabsTrigger value="documents">Facility Documents</TabsTrigger>
            <TabsTrigger value="training">Training Compliance</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Overall Compliance</CardTitle>
                  <Shield className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">87%</div>
                  <p className="text-xs text-muted-foreground">-3% from last month</p>
                  <Progress value={87} className="mt-2" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Expiring Credentials</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">12</div>
                  <p className="text-xs text-muted-foreground">Within 30 days</p>
                  <div className="mt-2 flex gap-2">
                    <Badge variant="destructive">5 Critical</Badge>
                    <Badge variant="secondary">7 Warning</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Documents</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">42</div>
                  <p className="text-xs text-muted-foreground">Total documents</p>
                  <div className="mt-2 flex gap-2">
                    <Badge variant="default">38 Current</Badge>
                    <Badge variant="secondary">4 Review</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Training Completion</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">88%</div>
                  <p className="text-xs text-muted-foreground">Average completion rate</p>
                  <Progress value={88} className="mt-2" />
                </CardContent>
              </Card>
            </div>

            {/* Priority Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Priority Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg bg-red-50 border-red-200">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                    <div>
                      <p className="font-medium">5 Expired Credentials</p>
                      <p className="text-sm text-gray-600">Immediate action required</p>
                    </div>
                  </div>
                  <Button size="sm" variant="destructive">Review Now</Button>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg bg-yellow-50 border-yellow-200">
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-yellow-600" />
                    <div>
                      <p className="font-medium">7 Credentials Expiring Soon</p>
                      <p className="text-sm text-gray-600">Within 30 days</p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline">View List</Button>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileCheck className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-medium">2 Documents Need Review</p>
                      <p className="text-sm text-gray-600">Policy updates required</p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline">Review Documents</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Staff Credentials Tab */}
          <TabsContent value="credentials" className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between gap-4">
              <div className="flex flex-1 gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search staff by name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All Departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    <SelectItem value="ICU">ICU</SelectItem>
                    <SelectItem value="Med-Surg">Med-Surg</SelectItem>
                    <SelectItem value="Emergency">Emergency</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <PermissionGuard permission="upload_documents">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Credential
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Upload Staff Credential</DialogTitle>
                      <DialogDescription>
                        Upload a new credential document for a staff member
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <div>
                        <Label>Staff Member</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Select staff member" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">Sarah Johnson</SelectItem>
                            <SelectItem value="2">Michael Chen</SelectItem>
                            <SelectItem value="3">Emma Rodriguez</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Credential Type</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Select credential type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="license">Professional License</SelectItem>
                            <SelectItem value="cert">Certification</SelectItem>
                            <SelectItem value="training">Training Certificate</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Expiry Date</Label>
                        <Input type="date" />
                      </div>
                      <div>
                        <Label>Document</Label>
                        <Input type="file" accept=".pdf,.jpg,.png" />
                      </div>
                      <Button className="w-full">Upload Credential</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </PermissionGuard>
            </div>

            {/* Staff Credentials List */}
            <div className="space-y-4">
              {filteredCredentials.map((staff) => (
                <Card key={staff.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{staff.staffName}</CardTitle>
                        <p className="text-sm text-gray-600">{staff.department}</p>
                      </div>
                      <Badge variant="outline">{staff.credentials.length} Credentials</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {staff.credentials.map((cred, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${getStatusColor(cred.status)}`}>
                              {getStatusIcon(cred.status)}
                            </div>
                            <div>
                              <p className="font-medium">{cred.type}</p>
                              <p className="text-sm text-gray-600">
                                Expires: {new Date(cred.expiryDate).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <PermissionGuard permission="view_staff_credentials">
                              <Button size="sm" variant="ghost">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </PermissionGuard>
                            <PermissionGuard permission="edit_staff_credentials">
                              <Button size="sm" variant="ghost">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </PermissionGuard>
                            <Button size="sm" variant="ghost">
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Facility Documents Tab */}
          <TabsContent value="documents" className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Facility Regulatory Documents</h3>
              <PermissionGuard permission="upload_documents">
                <Button>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Document
                </Button>
              </PermissionGuard>
            </div>

            <div className="grid gap-4">
              {mockFacilityDocuments.map((doc) => (
                <Card key={doc.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-lg ${getStatusColor(doc.status)}`}>
                          <FileText className="h-6 w-6" />
                        </div>
                        <div>
                          <h4 className="font-medium">{doc.name}</h4>
                          <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                            <span>Category: {doc.category}</span>
                            <span>•</span>
                            <span>Updated: {new Date(doc.lastUpdated).toLocaleDateString()}</span>
                            <span>•</span>
                            <span>Next Review: {new Date(doc.nextReview).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="ghost">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <PermissionGuard permission="manage_compliance">
                          <Button size="sm" variant="ghost">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </PermissionGuard>
                        <Button size="sm" variant="ghost">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Training Compliance Tab */}
          <TabsContent value="training" className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Training Compliance Overview</h3>
              <PermissionGuard permission="manage_compliance">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Schedule Training
                </Button>
              </PermissionGuard>
            </div>

            <div className="grid gap-4">
              {mockTrainingCompliance.map((training, idx) => (
                <Card key={idx}>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{training.name}</h4>
                          <p className="text-sm text-gray-600">Due by {new Date(training.dueDate).toLocaleDateString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold">{training.completionRate}%</p>
                          <p className="text-sm text-gray-600">{training.required - training.completionRate * training.required / 100} staff remaining</p>
                        </div>
                      </div>
                      <div>
                        <Progress value={training.completionRate} className="h-3" />
                      </div>
                      <div className="flex justify-between items-center">
                        <Badge variant={training.completionRate >= 90 ? "default" : training.completionRate >= 70 ? "secondary" : "destructive"}>
                          {training.completionRate >= 90 ? "On Track" : training.completionRate >= 70 ? "Needs Attention" : "Critical"}
                        </Badge>
                        <PermissionGuard permission="manage_compliance">
                          <Button size="sm" variant="outline">
                            <Users className="h-4 w-4 mr-2" />
                            View Details
                          </Button>
                        </PermissionGuard>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}