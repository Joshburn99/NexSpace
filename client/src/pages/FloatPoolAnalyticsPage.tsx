import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, DollarSign, Users, Clock, Target, Download } from 'lucide-react';
import { useFacilityPermissions } from '@/hooks/use-facility-permissions';

interface FloatPoolSaving {
  id: number;
  department: string;
  month: string;
  staffingNeed: number;
  floatPoolUsed: number;
  agencyAlternative: number;
  floatPoolCost: number;
  agencyCost: number;
  savings: number;
  savingsPercentage: number;
  utilizationRate: number;
  avgHourlyRate: number;
  totalHours: number;
}

export default function FloatPoolAnalyticsPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [dateRange, setDateRange] = useState('quarter');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const { hasPermission } = useFacilityPermissions();

  const { data: floatPoolData, isLoading } = useQuery<FloatPoolSaving[]>({
    queryKey: ['/api/float-pool-analytics', dateRange, departmentFilter],
    initialData: [
      {
        id: 1,
        department: 'ICU',
        month: '2025-07',
        staffingNeed: 45,
        floatPoolUsed: 32,
        agencyAlternative: 13,
        floatPoolCost: 86400,
        agencyCost: 124800,
        savings: 38400,
        savingsPercentage: 30.8,
        utilizationRate: 71.1,
        avgHourlyRate: 45.00,
        totalHours: 1920
      },
      {
        id: 2,
        department: 'Emergency',
        month: '2025-07',
        staffingNeed: 38,
        floatPoolUsed: 28,
        agencyAlternative: 10,
        floatPoolCost: 75600,
        agencyCost: 96000,
        savings: 20400,
        savingsPercentage: 21.3,
        utilizationRate: 73.7,
        avgHourlyRate: 42.00,
        totalHours: 1800
      },
      {
        id: 3,
        department: 'Med-Surg',
        month: '2025-07',
        staffingNeed: 52,
        floatPoolUsed: 38,
        agencyAlternative: 14,
        floatPoolCost: 91200,
        agencyCost: 134400,
        savings: 43200,
        savingsPercentage: 32.1,
        utilizationRate: 73.1,
        avgHourlyRate: 38.00,
        totalHours: 2400
      },
      {
        id: 4,
        department: 'Surgery',
        month: '2025-07',
        staffingNeed: 24,
        floatPoolUsed: 18,
        agencyAlternative: 6,
        floatPoolCost: 50400,
        agencyCost: 67200,
        savings: 16800,
        savingsPercentage: 25.0,
        utilizationRate: 75.0,
        avgHourlyRate: 42.00,
        totalHours: 1200
      }
    ]
  });

  if (!hasPermission('view_float_pool_savings')) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-gray-600">You don't have permission to view float pool savings analytics.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const filteredData = floatPoolData?.filter(record => {
    const matchesDepartment = departmentFilter === 'all' || record.department === departmentFilter;
    return matchesDepartment;
  }) || [];

  const totalSavings = filteredData.reduce((sum, r) => sum + r.savings, 0);
  const totalFloatPoolCost = filteredData.reduce((sum, r) => sum + r.floatPoolCost, 0);
  const totalAgencyCost = filteredData.reduce((sum, r) => sum + r.agencyCost, 0);
  const avgUtilization = filteredData.length > 0 ? filteredData.reduce((sum, r) => sum + r.utilizationRate, 0) / filteredData.length : 0;
  const totalHours = filteredData.reduce((sum, r) => sum + r.totalHours, 0);

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <TrendingUp className="h-8 w-8" />
            Float Pool Savings Analytics
          </h1>
          <p className="text-gray-600 mt-2">Analyze cost savings from float pool utilization</p>
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
          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              <SelectItem value="ICU">ICU</SelectItem>
              <SelectItem value="Emergency">Emergency</SelectItem>
              <SelectItem value="Med-Surg">Med-Surg</SelectItem>
              <SelectItem value="Surgery">Surgery</SelectItem>
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
          <TabsTrigger value="departments">By Department</TabsTrigger>
          <TabsTrigger value="analysis">Cost Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Savings</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">${totalSavings.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">
                  {totalAgencyCost > 0 ? ((totalSavings / totalAgencyCost) * 100).toFixed(1) : 0}% vs agency costs
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Float Pool Cost</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${totalFloatPoolCost.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">
                  ${totalHours > 0 ? (totalFloatPoolCost / totalHours).toFixed(2) : 0} per hour
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Utilization Rate</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{avgUtilization.toFixed(1)}%</div>
                <div className="text-xs text-muted-foreground">
                  Average across departments
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
                <div className="text-xs text-muted-foreground">
                  Float pool hours worked
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Cost Comparison Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-6 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">${totalFloatPoolCost.toLocaleString()}</div>
                  <div className="text-sm text-gray-600">Float Pool Cost</div>
                  <div className="text-xs text-gray-500 mt-1">Internal staffing</div>
                </div>
                <div className="text-center p-6 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">${totalAgencyCost.toLocaleString()}</div>
                  <div className="text-sm text-gray-600">Agency Alternative</div>
                  <div className="text-xs text-gray-500 mt-1">External staffing</div>
                </div>
                <div className="text-center p-6 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">${totalSavings.toLocaleString()}</div>
                  <div className="text-sm text-gray-600">Total Savings</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {totalAgencyCost > 0 ? ((totalSavings / totalAgencyCost) * 100).toFixed(1) : 0}% reduction
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="departments" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredData.map((record) => (
              <Card key={record.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{record.department}</CardTitle>
                    <Badge variant="outline">
                      {record.utilizationRate.toFixed(1)}% utilized
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-gray-600">Staffing Need</div>
                        <div className="text-lg font-semibold">{record.staffingNeed}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Float Pool Used</div>
                        <div className="text-lg font-semibold">{record.floatPoolUsed}</div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Cost Comparison</span>
                        <span className="text-sm text-green-600 font-medium">
                          ${record.savings.toLocaleString()} saved
                        </span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>Float Pool:</span>
                          <span>${record.floatPoolCost.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Agency Alternative:</span>
                          <span>${record.agencyCost.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t">
                      <div className="text-xs text-gray-600">
                        {record.totalHours.toLocaleString()} hours • ${record.avgHourlyRate}/hr avg
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Savings by Department</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {filteredData.map((record) => (
                    <div key={record.id}>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{record.department}</span>
                        <span className="text-sm text-gray-600">${record.savings.toLocaleString()}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                        <div 
                          className="bg-green-600 h-2 rounded-full" 
                          style={{ width: `${(record.savings / totalSavings) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Utilization Efficiency</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {filteredData.map((record) => (
                    <div key={record.id}>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{record.department}</span>
                        <span className="text-sm text-gray-600">{record.utilizationRate.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                        <div 
                          className={`h-2 rounded-full ${
                            record.utilizationRate >= 80 ? 'bg-green-600' : 
                            record.utilizationRate >= 60 ? 'bg-yellow-600' : 'bg-red-600'
                          }`}
                          style={{ width: `${record.utilizationRate}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>ROI Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-xl font-bold text-blue-600">
                    {totalAgencyCost > 0 ? ((totalSavings / totalAgencyCost) * 100).toFixed(1) : 0}%
                  </div>
                  <div className="text-sm text-gray-600">Cost Reduction</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-xl font-bold text-green-600">
                    ${totalHours > 0 ? (totalSavings / totalHours).toFixed(2) : 0}
                  </div>
                  <div className="text-sm text-gray-600">Savings per Hour</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-xl font-bold text-purple-600">
                    {filteredData.reduce((sum, r) => sum + r.floatPoolUsed, 0)}
                  </div>
                  <div className="text-sm text-gray-600">Float Pool Shifts</div>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <div className="text-xl font-bold text-orange-600">
                    {filteredData.reduce((sum, r) => sum + r.agencyAlternative, 0)}
                  </div>
                  <div className="text-sm text-gray-600">Agency Shifts Avoided</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}