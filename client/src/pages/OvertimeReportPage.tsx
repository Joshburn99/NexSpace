import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Users,
  Search,
  Download,
} from "lucide-react";
import { useFacilityPermissions } from "@/hooks/use-facility-permissions";

interface OvertimeRecord {
  id: number;
  staffId: number;
  staffName: string;
  specialty: string;
  department: string;
  week: string;
  regularHours: number;
  overtimeHours: number;
  totalHours: number;
  regularRate: number;
  overtimeRate: number;
  regularPay: number;
  overtimePay: number;
  totalPay: number;
  approvalStatus: "pending" | "approved" | "rejected";
  approvedBy?: string;
  notes?: string;
}

export default function OvertimeReportPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateRange, setDateRange] = useState("month");
  const { hasPermission } = useFacilityPermissions();

  const { data: overtimeData, isLoading } = useQuery<OvertimeRecord[]>({
    queryKey: ["/api/overtime-reports", dateRange, departmentFilter],
    initialData: [
      {
        id: 1,
        staffId: 1,
        staffName: "Sarah Johnson",
        specialty: "Registered Nurse",
        department: "ICU",
        week: "2025-07-07",
        regularHours: 40,
        overtimeHours: 8,
        totalHours: 48,
        regularRate: 35.0,
        overtimeRate: 52.5,
        regularPay: 1400.0,
        overtimePay: 420.0,
        totalPay: 1820.0,
        approvalStatus: "approved",
        approvedBy: "Manager Smith",
        notes: "Critical patient care coverage",
      },
      {
        id: 2,
        staffId: 2,
        staffName: "Michael Chen",
        specialty: "Licensed Practical Nurse",
        department: "Emergency",
        week: "2025-07-07",
        regularHours: 40,
        overtimeHours: 12,
        totalHours: 52,
        regularRate: 28.0,
        overtimeRate: 42.0,
        regularPay: 1120.0,
        overtimePay: 504.0,
        totalPay: 1624.0,
        approvalStatus: "pending",
        notes: "Emergency department shortage",
      },
      {
        id: 3,
        staffId: 3,
        staffName: "Emily Rodriguez",
        specialty: "Certified Nursing Assistant",
        department: "Med-Surg",
        week: "2025-07-07",
        regularHours: 40,
        overtimeHours: 4,
        totalHours: 44,
        regularRate: 18.0,
        overtimeRate: 27.0,
        regularPay: 720.0,
        overtimePay: 108.0,
        totalPay: 828.0,
        approvalStatus: "approved",
        approvedBy: "Manager Johnson",
        notes: "Voluntary overtime for patient care",
      },
      {
        id: 4,
        staffId: 4,
        staffName: "David Wilson",
        specialty: "Respiratory Therapist",
        department: "ICU",
        week: "2025-07-07",
        regularHours: 40,
        overtimeHours: 16,
        totalHours: 56,
        regularRate: 32.0,
        overtimeRate: 48.0,
        regularPay: 1280.0,
        overtimePay: 768.0,
        totalPay: 2048.0,
        approvalStatus: "rejected",
        notes: "Exceeded maximum overtime threshold",
      },
    ],
  });

  if (!hasPermission("view_overtime_reports")) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-gray-600">You don't have permission to view overtime reports.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const filteredOvertime =
    overtimeData?.filter((record) => {
      const matchesSearch =
        record.staffName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.specialty.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.department.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDepartment =
        departmentFilter === "all" || record.department === departmentFilter;
      const matchesStatus = statusFilter === "all" || record.approvalStatus === statusFilter;

      return matchesSearch && matchesDepartment && matchesStatus;
    }) || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const totalOvertimeHours = overtimeData?.reduce((sum, r) => sum + r.overtimeHours, 0) || 0;
  const totalOvertimePay = overtimeData?.reduce((sum, r) => sum + r.overtimePay, 0) || 0;
  const avgOvertimeHours = overtimeData?.length ? totalOvertimeHours / overtimeData.length : 0;
  const pendingApprovals = overtimeData?.filter((r) => r.approvalStatus === "pending").length || 0;

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Clock className="h-8 w-8" />
            Overtime Reports
          </h1>
          <p className="text-gray-600 mt-2">Monitor and analyze overtime hours and costs</p>
        </div>
        <div className="flex gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="records">Overtime Records</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total OT Hours</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalOvertimeHours.toFixed(1)}</div>
                <div className="text-xs text-muted-foreground">
                  {avgOvertimeHours.toFixed(1)} avg per employee
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total OT Cost</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${totalOvertimePay.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">
                  ${overtimeData?.length ? (totalOvertimePay / overtimeData.length).toFixed(0) : 0}{" "}
                  avg per employee
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pendingApprovals}</div>
                <div className="text-xs text-muted-foreground">Requires manager approval</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">OT Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(
                    (totalOvertimeHours /
                      (overtimeData?.reduce((sum, r) => sum + r.totalHours, 0) || 1)) *
                    100
                  ).toFixed(1)}
                  %
                </div>
                <div className="text-xs text-muted-foreground">Of total hours worked</div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="records" className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search staff..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                <SelectItem value="ICU">ICU</SelectItem>
                <SelectItem value="Emergency">Emergency</SelectItem>
                <SelectItem value="Med-Surg">Med-Surg</SelectItem>
                <SelectItem value="Surgery">Surgery</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            {filteredOvertime.map((record) => (
              <Card key={record.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        <div>
                          <div className="font-semibold">{record.staffName}</div>
                          <div className="text-sm text-gray-600">
                            {record.specialty} • {record.department}
                          </div>
                        </div>
                      </div>
                      <Badge className={getStatusColor(record.approvalStatus)}>
                        {record.approvalStatus}
                      </Badge>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        Week of {new Date(record.week).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-gray-600">
                        Regular: {record.regularHours}h | OT: {record.overtimeHours}h
                      </div>
                      <div className="text-xs text-gray-600">
                        Total Pay: ${record.totalPay.toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Regular Hours:</span> {record.regularHours}
                      <div className="text-xs text-gray-600">
                        ${record.regularRate}/hr = ${record.regularPay}
                      </div>
                    </div>
                    <div>
                      <span className="font-medium">Overtime Hours:</span> {record.overtimeHours}
                      <div className="text-xs text-gray-600">
                        ${record.overtimeRate}/hr = ${record.overtimePay}
                      </div>
                    </div>
                    <div>
                      <span className="font-medium">Total Hours:</span> {record.totalHours}
                      <div className="text-xs text-gray-600">
                        {((record.overtimeHours / record.totalHours) * 100).toFixed(1)}% overtime
                      </div>
                    </div>
                    <div>
                      <span className="font-medium">Total Pay:</span> $
                      {record.totalPay.toLocaleString()}
                      <div className="text-xs text-gray-600">
                        ${(record.totalPay / record.totalHours).toFixed(2)} avg/hr
                      </div>
                    </div>
                  </div>
                  {record.notes && (
                    <div className="mt-2 text-sm text-gray-600 border-t pt-2">
                      <span className="font-medium">Notes:</span> {record.notes}
                    </div>
                  )}
                  {record.approvedBy && (
                    <div className="mt-1 text-xs text-gray-600">
                      Approved by: {record.approvedBy}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredOvertime.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No overtime records found</h3>
                <p className="text-gray-600">
                  {searchTerm || departmentFilter !== "all" || statusFilter !== "all"
                    ? "Try adjusting your search or filters"
                    : "No overtime records available for the selected period"}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Overtime by Department</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">ICU</span>
                    <span className="text-sm text-gray-600">24h ($1,188)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: "60%" }}></div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Emergency</span>
                    <span className="text-sm text-gray-600">12h ($504)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-red-600 h-2 rounded-full" style={{ width: "30%" }}></div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Med-Surg</span>
                    <span className="text-sm text-gray-600">4h ($108)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-600 h-2 rounded-full" style={{ width: "10%" }}></div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cost Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                    <div>
                      <div className="text-sm font-medium">Regular Pay</div>
                      <div className="text-xs text-gray-600">Standard hourly rates</div>
                    </div>
                    <div className="text-lg font-bold text-blue-600">
                      ${overtimeData?.reduce((sum, r) => sum + r.regularPay, 0).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                    <div>
                      <div className="text-sm font-medium">Overtime Pay</div>
                      <div className="text-xs text-gray-600">1.5x multiplier</div>
                    </div>
                    <div className="text-lg font-bold text-orange-600">
                      ${totalOvertimePay.toLocaleString()}
                    </div>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <div>
                      <div className="text-sm font-medium">Total Payroll</div>
                      <div className="text-xs text-gray-600">All compensation</div>
                    </div>
                    <div className="text-lg font-bold text-green-600">
                      ${overtimeData?.reduce((sum, r) => sum + r.totalPay, 0).toLocaleString()}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
