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
  Building,
  DollarSign,
  Clock,
  TrendingUp,
  AlertTriangle,
  Search,
  Download,
} from "lucide-react";
import { useFacilityPermissions } from "@/hooks/use-facility-permissions";

interface AgencyUsage {
  id: number;
  agencyName: string;
  department: string;
  specialty: string;
  month: string;
  shiftsAssigned: number;
  hoursWorked: number;
  hourlyRate: number;
  totalCost: number;
  avgShiftLength: number;
  utilizationRate: number;
  performanceRating: number;
  contractType: "per_diem" | "temporary" | "travel" | "permanent";
  lastUsed: string;
  notes?: string;
}

export default function AgencyUsagePage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [agencyFilter, setAgencyFilter] = useState("all");
  const [dateRange, setDateRange] = useState("quarter");
  const { hasPermission } = useFacilityPermissions();

  const { data: agencyData, isLoading } = useQuery<AgencyUsage[]>({
    queryKey: ["/api/agency-usage", dateRange, departmentFilter, agencyFilter],
    initialData: [
      {
        id: 1,
        agencyName: "MedStaff Solutions",
        department: "ICU",
        specialty: "Registered Nurse",
        month: "2025-07",
        shiftsAssigned: 24,
        hoursWorked: 288,
        hourlyRate: 65.0,
        totalCost: 18720,
        avgShiftLength: 12,
        utilizationRate: 92.3,
        performanceRating: 4.8,
        contractType: "travel",
        lastUsed: "2025-07-14",
        notes: "Excellent ICU experience, high patient satisfaction",
      },
      {
        id: 2,
        agencyName: "Healthcare Heroes",
        department: "Emergency",
        specialty: "Registered Nurse",
        month: "2025-07",
        shiftsAssigned: 18,
        hoursWorked: 216,
        hourlyRate: 58.0,
        totalCost: 12528,
        avgShiftLength: 12,
        utilizationRate: 88.9,
        performanceRating: 4.5,
        contractType: "per_diem",
        lastUsed: "2025-07-13",
        notes: "Reliable emergency coverage, quick response times",
      },
      {
        id: 3,
        agencyName: "FlexCare Staffing",
        department: "Med-Surg",
        specialty: "Licensed Practical Nurse",
        month: "2025-07",
        shiftsAssigned: 32,
        hoursWorked: 384,
        hourlyRate: 42.0,
        totalCost: 16128,
        avgShiftLength: 12,
        utilizationRate: 85.7,
        performanceRating: 4.2,
        contractType: "temporary",
        lastUsed: "2025-07-12",
        notes: "Good coverage for med-surg floor, some training needed",
      },
      {
        id: 4,
        agencyName: "Premier Nursing",
        department: "Surgery",
        specialty: "Surgical Technologist",
        month: "2025-07",
        shiftsAssigned: 16,
        hoursWorked: 128,
        hourlyRate: 48.0,
        totalCost: 6144,
        avgShiftLength: 8,
        utilizationRate: 100.0,
        performanceRating: 4.9,
        contractType: "per_diem",
        lastUsed: "2025-07-14",
        notes: "Highly skilled surgical tech, excellent OR efficiency",
      },
      {
        id: 5,
        agencyName: "TempCare Solutions",
        department: "ICU",
        specialty: "Respiratory Therapist",
        month: "2025-07",
        shiftsAssigned: 12,
        hoursWorked: 144,
        hourlyRate: 52.0,
        totalCost: 7488,
        avgShiftLength: 12,
        utilizationRate: 75.0,
        performanceRating: 3.8,
        contractType: "temporary",
        lastUsed: "2025-07-11",
        notes: "Adequate performance, some documentation issues",
      },
    ],
  });

  if (!hasPermission("view_agency_usage")) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-gray-600">
              You don't have permission to view agency usage analytics.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const filteredData =
    agencyData?.filter((record) => {
      const matchesSearch =
        record.agencyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.specialty.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.department.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDepartment =
        departmentFilter === "all" || record.department === departmentFilter;
      const matchesAgency = agencyFilter === "all" || record.agencyName === agencyFilter;

      return matchesSearch && matchesDepartment && matchesAgency;
    }) || [];

  const getContractColor = (contractType: string) => {
    switch (contractType) {
      case "per_diem":
        return "bg-blue-100 text-blue-800";
      case "temporary":
        return "bg-yellow-100 text-yellow-800";
      case "travel":
        return "bg-green-100 text-green-800";
      case "permanent":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPerformanceColor = (rating: number) => {
    if (rating >= 4.5) return "text-green-600";
    if (rating >= 4.0) return "text-yellow-600";
    if (rating >= 3.5) return "text-orange-600";
    return "text-red-600";
  };

  const totalCost = filteredData.reduce((sum, r) => sum + r.totalCost, 0);
  const totalHours = filteredData.reduce((sum, r) => sum + r.hoursWorked, 0);
  const totalShifts = filteredData.reduce((sum, r) => sum + r.shiftsAssigned, 0);
  const avgHourlyRate = totalHours > 0 ? totalCost / totalHours : 0;
  const avgPerformance =
    filteredData.length > 0
      ? filteredData.reduce((sum, r) => sum + r.performanceRating, 0) / filteredData.length
      : 0;

  const uniqueAgencies = [...new Set(agencyData?.map((r) => r.agencyName) || [])];

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Building className="h-8 w-8" />
            Agency Usage Analytics
          </h1>
          <p className="text-gray-600 mt-2">
            Monitor agency staffing usage, costs, and performance
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
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
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="agencies">By Agency</TabsTrigger>
          <TabsTrigger value="departments">By Department</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${totalCost.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">
                  ${avgHourlyRate.toFixed(2)} avg/hour
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalHours.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">{totalShifts} shifts assigned</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Agencies</CardTitle>
                <Building className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{uniqueAgencies.length}</div>
                <div className="text-xs text-muted-foreground">Partner agencies</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Performance</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${getPerformanceColor(avgPerformance)}`}>
                  {avgPerformance.toFixed(1)}
                </div>
                <div className="text-xs text-muted-foreground">Out of 5.0 rating</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Utilization</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {filteredData.length > 0
                    ? (
                        filteredData.reduce((sum, r) => sum + r.utilizationRate, 0) /
                        filteredData.length
                      ).toFixed(1)
                    : 0}
                  %
                </div>
                <div className="text-xs text-muted-foreground">Average utilization</div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="agencies" className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search agencies..."
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredData.map((record) => (
              <Card key={record.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{record.agencyName}</CardTitle>
                      <p className="text-sm text-gray-600">{record.specialty}</p>
                      <p className="text-xs text-gray-500">{record.department}</p>
                    </div>
                    <Badge className={getContractColor(record.contractType)}>
                      {record.contractType.replace("_", " ")}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="font-medium">Shifts:</span> {record.shiftsAssigned}
                      </div>
                      <div>
                        <span className="font-medium">Hours:</span> {record.hoursWorked}
                      </div>
                      <div>
                        <span className="font-medium">Rate:</span> ${record.hourlyRate}/hr
                      </div>
                      <div>
                        <span className="font-medium">Cost:</span> $
                        {record.totalCost.toLocaleString()}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="text-sm">
                        <span className="font-medium">Performance:</span>
                        <span className={`ml-1 ${getPerformanceColor(record.performanceRating)}`}>
                          {record.performanceRating.toFixed(1)}/5.0
                        </span>
                      </div>
                      <div className="text-sm">
                        <span className="font-medium">Utilization:</span>
                        <span className="ml-1">{record.utilizationRate.toFixed(1)}%</span>
                      </div>
                    </div>

                    <div className="text-xs text-gray-600 border-t pt-2">
                      <div>Last Used: {new Date(record.lastUsed).toLocaleDateString()}</div>
                      <div>Avg Shift: {record.avgShiftLength}h</div>
                    </div>

                    {record.notes && (
                      <div className="text-xs text-gray-700 bg-gray-50 p-2 rounded">
                        {record.notes}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="departments" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {["ICU", "Emergency", "Med-Surg", "Surgery"].map((dept) => {
              const deptData = filteredData.filter((r) => r.department === dept);
              const deptCost = deptData.reduce((sum, r) => sum + r.totalCost, 0);
              const deptHours = deptData.reduce((sum, r) => sum + r.hoursWorked, 0);
              const deptShifts = deptData.reduce((sum, r) => sum + r.shiftsAssigned, 0);
              const deptAvgRate = deptHours > 0 ? deptCost / deptHours : 0;

              return (
                <Card key={dept}>
                  <CardHeader>
                    <CardTitle>{dept}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm text-gray-600">Total Cost</div>
                          <div className="text-xl font-semibold">${deptCost.toLocaleString()}</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-600">Hours</div>
                          <div className="text-xl font-semibold">{deptHours}</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-600">Shifts</div>
                          <div className="text-xl font-semibold">{deptShifts}</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-600">Avg Rate</div>
                          <div className="text-xl font-semibold">${deptAvgRate.toFixed(2)}</div>
                        </div>
                      </div>
                      <div className="text-xs text-gray-600">{deptData.length} agencies used</div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance Ratings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {filteredData
                    .sort((a, b) => b.performanceRating - a.performanceRating)
                    .map((record) => (
                      <div key={record.id} className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-sm">{record.agencyName}</div>
                          <div className="text-xs text-gray-600">{record.specialty}</div>
                        </div>
                        <div className="text-right">
                          <div
                            className={`font-semibold ${getPerformanceColor(record.performanceRating)}`}
                          >
                            {record.performanceRating.toFixed(1)}
                          </div>
                          <div className="text-xs text-gray-600">
                            {record.shiftsAssigned} shifts
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cost Efficiency</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {filteredData
                    .sort((a, b) => a.hourlyRate - b.hourlyRate)
                    .map((record) => (
                      <div key={record.id} className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-sm">{record.agencyName}</div>
                          <div className="text-xs text-gray-600">{record.specialty}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">${record.hourlyRate}</div>
                          <div className="text-xs text-gray-600">
                            {record.utilizationRate.toFixed(1)}% util
                          </div>
                        </div>
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
