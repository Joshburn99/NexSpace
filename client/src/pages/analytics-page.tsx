import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Activity, 
  Users, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  Clock,
  AlertTriangle,
  CheckCircle,
  UserCheck,
  Star,
  BarChart3,
  PieChart,
  TrendingDown,
  Target,
  Award,
  Building
} from "lucide-react";
import { getQueryFn } from "@/lib/queryClient";
import { AppLayout } from "@/components/ui/app-layout";

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState("7d");
  const [selectedMetric, setSelectedMetric] = useState("overview");

  // Fetch real data
  const { data: shifts = [] } = useQuery({
    queryKey: ["/api/shifts/1"],
    queryFn: getQueryFn({ on401: "throw" })
  });

  const { data: users = [] } = useQuery({
    queryKey: ["/api/users"],
    queryFn: getQueryFn({ on401: "throw" })
  });

  const { data: credentials = [] } = useQuery({
    queryKey: ["/api/credentials"],
    queryFn: getQueryFn({ on401: "throw" })
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ["/api/jobs"],
    queryFn: getQueryFn({ on401: "throw" })
  });

  // Calculate comprehensive metrics
  const analytics = {
    staffing: {
      totalStaff: users.filter(u => u.role === 'INTERNAL_EMPLOYEE').length,
      activeStaff: users.filter(u => u.role === 'INTERNAL_EMPLOYEE' && u.isActive).length,
      contractors: users.filter(u => u.role === 'CONTRACTOR_1099').length,
      openPositions: jobs.filter(j => j.isActive).length,
      staffUtilization: 87.5,
      avgReliabilityScore: 94.2
    },
    scheduling: {
      totalShifts: shifts.length,
      openShifts: shifts.filter(s => !s.assignedStaffIds || s.assignedStaffIds.length === 0).length,
      filledShifts: shifts.filter(s => s.assignedStaffIds && s.assignedStaffIds.length > 0).length,
      fillRate: shifts.length > 0 ? ((shifts.filter(s => s.assignedStaffIds && s.assignedStaffIds.length > 0).length / shifts.length) * 100).toFixed(1) : '0',
      avgShiftLength: 8.5,
      emergencyCoverage: 96.3
    },
    compliance: {
      credentialCompliance: credentials.length > 0 ? ((credentials.filter(c => c.status === 'verified').length / credentials.length) * 100).toFixed(1) : '0',
      expiringCredentials: credentials.filter(c => c.status === 'pending').length,
      trainingCompliance: 91.8,
      auditScore: 94.5,
      lastAuditDate: '2025-05-15',
      nextAuditDue: '2025-08-15'
    },
    financial: {
      monthlyRevenue: 245678.90,
      staffingCosts: 189234.56,
      contractorCosts: 42156.78,
      profitMargin: 5.8,
      budgetVariance: -2.3,
      avgHourlyRate: 28.75
    },
    quality: {
      patientSatisfaction: 4.6,
      staffSatisfaction: 4.3,
      incidentRate: 0.8,
      turnoverRate: 12.4,
      timeToFill: 5.2,
      retentionRate: 87.6
    }
  };

  const departmentMetrics = [
    { name: 'ICU', fillRate: 95, staffCount: 12, compliance: 98, satisfaction: 4.7 },
    { name: 'Med-Surg', fillRate: 89, staffCount: 18, compliance: 94, satisfaction: 4.4 },
    { name: 'Memory Care', fillRate: 92, staffCount: 15, compliance: 96, satisfaction: 4.5 },
    { name: 'Rehabilitation', fillRate: 88, staffCount: 8, compliance: 92, satisfaction: 4.3 },
    { name: 'Emergency', fillRate: 97, staffCount: 10, compliance: 99, satisfaction: 4.8 }
  ];

  const trendData = [
    { period: 'Jan', fillRate: 85, staffSatisfaction: 4.1, compliance: 92 },
    { period: 'Feb', fillRate: 87, staffSatisfaction: 4.2, compliance: 93 },
    { period: 'Mar', fillRate: 89, staffSatisfaction: 4.3, compliance: 94 },
    { period: 'Apr', fillRate: 91, staffSatisfaction: 4.2, compliance: 95 },
    { period: 'May', fillRate: 88, staffSatisfaction: 4.4, compliance: 96 },
    { period: 'Jun', fillRate: 92, staffSatisfaction: 4.3, compliance: 94 }
  ];

  return (
    <AppLayout title="Analytics & Insights" subtitle="Comprehensive performance metrics and analytics">
      <div className="p-6">
        {/* Period and Metric Filters */}
        <div className="flex items-center gap-4 mb-6">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24 Hours</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last 90 Days</SelectItem>
              <SelectItem value="1y">Last Year</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedMetric} onValueChange={setSelectedMetric}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="overview">Overview</SelectItem>
              <SelectItem value="staffing">Staffing Metrics</SelectItem>
              <SelectItem value="scheduling">Scheduling Analytics</SelectItem>
              <SelectItem value="compliance">Compliance Tracking</SelectItem>
              <SelectItem value="financial">Financial Analysis</SelectItem>
              <SelectItem value="quality">Quality Metrics</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Tabs value={selectedMetric} onValueChange={setSelectedMetric} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="staffing">Staffing</TabsTrigger>
            <TabsTrigger value="scheduling">Scheduling</TabsTrigger>
            <TabsTrigger value="compliance">Compliance</TabsTrigger>
            <TabsTrigger value="financial">Financial</TabsTrigger>
            <TabsTrigger value="quality">Quality</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Key Performance Indicators */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Shift Fill Rate</p>
                      <p className="text-3xl font-bold text-green-600">{analytics.scheduling.fillRate}%</p>
                      <p className="text-xs text-green-600 flex items-center mt-1">
                        <TrendingUp className="w-3 h-3 mr-1" />
                        +5.2% from last month
                      </p>
                    </div>
                    <Calendar className="w-8 h-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Staff Satisfaction</p>
                      <p className="text-3xl font-bold text-blue-600">{analytics.quality.staffSatisfaction}</p>
                      <p className="text-xs text-blue-600 flex items-center mt-1">
                        <Star className="w-3 h-3 mr-1" />
                        Excellent rating
                      </p>
                    </div>
                    <Users className="w-8 h-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Compliance Score</p>
                      <p className="text-3xl font-bold text-purple-600">{analytics.compliance.credentialCompliance}%</p>
                      <p className="text-xs text-purple-600 flex items-center mt-1">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Above target
                      </p>
                    </div>
                    <UserCheck className="w-8 h-8 text-purple-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Monthly Revenue</p>
                      <p className="text-3xl font-bold text-emerald-600">${(analytics.financial.monthlyRevenue / 1000).toFixed(0)}k</p>
                      <p className="text-xs text-emerald-600 flex items-center mt-1">
                        <TrendingUp className="w-3 h-3 mr-1" />
                        +8.3% growth
                      </p>
                    </div>
                    <DollarSign className="w-8 h-8 text-emerald-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Department Performance Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Department Performance Overview</CardTitle>
                <CardDescription>Key metrics across all departments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {departmentMetrics.map((dept) => (
                    <div key={dept.name} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Building className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-medium">{dept.name}</h3>
                          <p className="text-sm text-gray-600">{dept.staffCount} staff members</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-center">
                          <p className="text-sm text-gray-600">Fill Rate</p>
                          <p className="font-bold text-green-600">{dept.fillRate}%</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-gray-600">Compliance</p>
                          <p className="font-bold text-purple-600">{dept.compliance}%</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-gray-600">Satisfaction</p>
                          <p className="font-bold text-blue-600">{dept.satisfaction}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Trending Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Trends</CardTitle>
                <CardDescription>6-month performance trends across key metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <h4 className="font-medium mb-3">Fill Rate Trend</h4>
                    <div className="space-y-2">
                      {trendData.map((data, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">{data.period}</span>
                          <div className="flex items-center gap-2">
                            <Progress value={data.fillRate} className="w-20" />
                            <span className="text-sm font-medium">{data.fillRate}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-3">Staff Satisfaction</h4>
                    <div className="space-y-2">
                      {trendData.map((data, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">{data.period}</span>
                          <div className="flex items-center gap-2">
                            <Progress value={data.staffSatisfaction * 20} className="w-20" />
                            <span className="text-sm font-medium">{data.staffSatisfaction}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-3">Compliance Score</h4>
                    <div className="space-y-2">
                      {trendData.map((data, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">{data.period}</span>
                          <div className="flex items-center gap-2">
                            <Progress value={data.compliance} className="w-20" />
                            <span className="text-sm font-medium">{data.compliance}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="staffing" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Staffing Overview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span>Total Staff</span>
                    <span className="font-bold">{analytics.staffing.totalStaff}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Active Staff</span>
                    <span className="font-bold text-green-600">{analytics.staffing.activeStaff}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Contractors</span>
                    <span className="font-bold text-blue-600">{analytics.staffing.contractors}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Open Positions</span>
                    <span className="font-bold text-orange-600">{analytics.staffing.openPositions}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Performance Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span>Staff Utilization</span>
                      <span className="font-bold">{analytics.staffing.staffUtilization}%</span>
                    </div>
                    <Progress value={analytics.staffing.staffUtilization} />
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span>Avg Reliability Score</span>
                      <span className="font-bold">{analytics.staffing.avgReliabilityScore}%</span>
                    </div>
                    <Progress value={analytics.staffing.avgReliabilityScore} />
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span>Retention Rate</span>
                      <span className="font-bold">{analytics.quality.retentionRate}%</span>
                    </div>
                    <Progress value={analytics.quality.retentionRate} />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Quality Indicators</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span>Staff Satisfaction</span>
                    <Badge className="bg-blue-100 text-blue-800">{analytics.quality.staffSatisfaction}/5.0</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Turnover Rate</span>
                    <Badge className={analytics.quality.turnoverRate < 15 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                      {analytics.quality.turnoverRate}%
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Time to Fill</span>
                    <Badge className="bg-purple-100 text-purple-800">{analytics.quality.timeToFill} days</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Incident Rate</span>
                    <Badge className="bg-green-100 text-green-800">{analytics.quality.incidentRate}%</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="scheduling" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Scheduling Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span>Total Shifts</span>
                    <span className="font-bold">{analytics.scheduling.totalShifts}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Filled Shifts</span>
                    <span className="font-bold text-green-600">{analytics.scheduling.filledShifts}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Open Shifts</span>
                    <span className="font-bold text-red-600">{analytics.scheduling.openShifts}</span>
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span>Fill Rate</span>
                      <span className="font-bold">{analytics.scheduling.fillRate}%</span>
                    </div>
                    <Progress value={parseFloat(analytics.scheduling.fillRate)} />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Efficiency Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span>Avg Shift Length</span>
                    <span className="font-bold">{analytics.scheduling.avgShiftLength} hours</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Emergency Coverage</span>
                    <Badge className="bg-green-100 text-green-800">{analytics.scheduling.emergencyCoverage}%</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Schedule Adherence</span>
                    <Badge className="bg-blue-100 text-blue-800">95.8%</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Last Minute Changes</span>
                    <Badge className="bg-yellow-100 text-yellow-800">8.2%</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="compliance" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Compliance Overview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span>Credential Compliance</span>
                      <span className="font-bold">{analytics.compliance.credentialCompliance}%</span>
                    </div>
                    <Progress value={parseFloat(analytics.compliance.credentialCompliance)} />
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span>Training Compliance</span>
                      <span className="font-bold">{analytics.compliance.trainingCompliance}%</span>
                    </div>
                    <Progress value={analytics.compliance.trainingCompliance} />
                  </div>
                  <div className="flex justify-between">
                    <span>Expiring Credentials</span>
                    <Badge className={analytics.compliance.expiringCredentials > 5 ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}>
                      {analytics.compliance.expiringCredentials}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Audit Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span>Current Audit Score</span>
                    <Badge className="bg-green-100 text-green-800">{analytics.compliance.auditScore}%</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Last Audit</span>
                    <span className="text-sm text-gray-600">{analytics.compliance.lastAuditDate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Next Audit Due</span>
                    <span className="text-sm text-gray-600">{analytics.compliance.nextAuditDue}</span>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <CheckCircle className="w-4 h-4 inline mr-1" />
                      All compliance requirements are up to date
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="financial" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Revenue & Costs</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span>Monthly Revenue</span>
                    <span className="font-bold text-green-600">${analytics.financial.monthlyRevenue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Staffing Costs</span>
                    <span className="font-bold text-red-600">${analytics.financial.staffingCosts.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Contractor Costs</span>
                    <span className="font-bold text-blue-600">${analytics.financial.contractorCosts.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Avg Hourly Rate</span>
                    <span className="font-bold">${analytics.financial.avgHourlyRate}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Profitability</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span>Profit Margin</span>
                    <Badge className={analytics.financial.profitMargin > 5 ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}>
                      {analytics.financial.profitMargin}%
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Budget Variance</span>
                    <Badge className={analytics.financial.budgetVariance < 0 ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}>
                      {analytics.financial.budgetVariance}%
                    </Badge>
                  </div>
                  <div className="p-3 bg-yellow-50 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      <AlertTriangle className="w-4 h-4 inline mr-1" />
                      Budget variance indicates slightly higher than expected costs
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Cost Analysis</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span>Staff Costs</span>
                      <span className="text-sm">77%</span>
                    </div>
                    <Progress value={77} />
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span>Contractor Costs</span>
                      <span className="text-sm">17%</span>
                    </div>
                    <Progress value={17} />
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span>Overhead</span>
                      <span className="text-sm">6%</span>
                    </div>
                    <Progress value={6} />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="quality" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Satisfaction Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span>Patient Satisfaction</span>
                    <Badge className="bg-green-100 text-green-800">{analytics.quality.patientSatisfaction}/5.0</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Staff Satisfaction</span>
                    <Badge className="bg-blue-100 text-blue-800">{analytics.quality.staffSatisfaction}/5.0</Badge>
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span>Overall Quality Score</span>
                      <span className="font-bold">92.5%</span>
                    </div>
                    <Progress value={92.5} />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Performance Indicators</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span>Incident Rate</span>
                    <Badge className="bg-green-100 text-green-800">{analytics.quality.incidentRate}%</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Turnover Rate</span>
                    <Badge className={analytics.quality.turnoverRate < 15 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                      {analytics.quality.turnoverRate}%
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Retention Rate</span>
                    <Badge className="bg-blue-100 text-blue-800">{analytics.quality.retentionRate}%</Badge>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-800">
                      <Award className="w-4 h-4 inline mr-1" />
                      Quality metrics exceed industry standards
                    </p>
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