import { useState } from "react";
import { Calendar, Download, Filter, TrendingUp, Clock, Users, DollarSign, AlertTriangle, FileText, Home } from "lucide-react";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

interface OvertimeRecord {
  id: string;
  employeeName: string;
  employeeId: string;
  position: string;
  unit: string;
  regularHours: number;
  overtimeHours: number;
  doubleTimeHours: number;
  regularRate: number;
  overtimeRate: number;
  doubleTimeRate: number;
  totalPay: number;
  weekEnding: Date;
  approvedBy: string;
  status: 'pending' | 'approved' | 'disputed';
  type: 'employee' | 'contractor';
}

interface WeeklySummary {
  week: string;
  totalRegularHours: number;
  totalOvertimeHours: number;
  totalDoubleTimeHours: number;
  totalCost: number;
  employeeCount: number;
}

// Mock data
const mockOvertimeRecords: OvertimeRecord[] = [
  {
    id: '1', employeeName: 'Sarah Johnson', employeeId: 'EMP001', position: 'RN', unit: 'ICU',
    regularHours: 40, overtimeHours: 12, doubleTimeHours: 0, regularRate: 35, overtimeRate: 52.5, doubleTimeRate: 70,
    totalPay: 2030, weekEnding: new Date(2025, 5, 15), approvedBy: 'Manager Smith', status: 'approved', type: 'employee'
  },
  {
    id: '2', employeeName: 'Michael Chen', employeeId: 'CON001', position: 'CNA', unit: 'Med-Surg',
    regularHours: 40, overtimeHours: 16, doubleTimeHours: 4, regularRate: 18, overtimeRate: 27, doubleTimeRate: 36,
    totalPay: 1444, weekEnding: new Date(2025, 5, 15), approvedBy: 'Supervisor Lee', status: 'approved', type: 'contractor'
  },
  {
    id: '3', employeeName: 'Emily Rodriguez', employeeId: 'EMP002', position: 'LPN', unit: 'Memory Care',
    regularHours: 40, overtimeHours: 8, doubleTimeHours: 0, regularRate: 28, overtimeRate: 42, doubleTimeRate: 56,
    totalPay: 1456, weekEnding: new Date(2025, 5, 15), approvedBy: 'Director Johnson', status: 'pending', type: 'employee'
  },
  {
    id: '4', employeeName: 'David Park', employeeId: 'CON002', position: 'PT', unit: 'Rehabilitation',
    regularHours: 32, overtimeHours: 12, doubleTimeHours: 0, regularRate: 42, overtimeRate: 63, doubleTimeRate: 84,
    totalPay: 2100, weekEnding: new Date(2025, 5, 15), approvedBy: 'Manager Davis', status: 'approved', type: 'contractor'
  },
  {
    id: '5', employeeName: 'Lisa Wang', employeeId: 'EMP003', position: 'RN', unit: 'ICU',
    regularHours: 40, overtimeHours: 20, doubleTimeHours: 8, regularRate: 38, overtimeRate: 57, doubleTimeRate: 76,
    totalPay: 3288, weekEnding: new Date(2025, 5, 8), approvedBy: 'Manager Smith', status: 'approved', type: 'employee'
  },
  {
    id: '6', employeeName: 'James Miller', employeeId: 'EMP004', position: 'CNA', unit: 'Med-Surg',
    regularHours: 40, overtimeHours: 6, doubleTimeHours: 0, regularRate: 20, overtimeRate: 30, doubleTimeRate: 40,
    totalPay: 980, weekEnding: new Date(2025, 5, 8), approvedBy: 'Supervisor Lee', status: 'disputed', type: 'employee'
  }
];

const getWeeklySummaries = (records: OvertimeRecord[]): WeeklySummary[] => {
  const summaries = new Map<string, WeeklySummary>();
  
  records.forEach(record => {
    const weekKey = record.weekEnding.toISOString().split('T')[0];
    const existing = summaries.get(weekKey);
    
    if (existing) {
      existing.totalRegularHours += record.regularHours;
      existing.totalOvertimeHours += record.overtimeHours;
      existing.totalDoubleTimeHours += record.doubleTimeHours;
      existing.totalCost += record.totalPay;
      existing.employeeCount += 1;
    } else {
      summaries.set(weekKey, {
        week: record.weekEnding.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        totalRegularHours: record.regularHours,
        totalOvertimeHours: record.overtimeHours,
        totalDoubleTimeHours: record.doubleTimeHours,
        totalCost: record.totalPay,
        employeeCount: 1
      });
    }
  });
  
  return Array.from(summaries.values());
};

export default function OvertimeReportPage() {
  const { user } = useAuth();
  const [records] = useState<OvertimeRecord[]>(mockOvertimeRecords);
  const [selectedUnit, setSelectedUnit] = useState<string>('all');
  const [selectedPosition, setSelectedPosition] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('last30days');

  if (!user) return null;

  const filteredRecords = records.filter(record => {
    return (selectedUnit === 'all' || record.unit === selectedUnit) &&
           (selectedPosition === 'all' || record.position === selectedPosition) &&
           (selectedStatus === 'all' || record.status === selectedStatus);
  });

  const weeklySummaries = getWeeklySummaries(filteredRecords);
  
  const totalStats = {
    totalOvertimeHours: filteredRecords.reduce((sum, r) => sum + r.overtimeHours, 0),
    totalDoubleTimeHours: filteredRecords.reduce((sum, r) => sum + r.doubleTimeHours, 0),
    totalCost: filteredRecords.reduce((sum, r) => sum + r.totalPay, 0),
    averageOvertimePerEmployee: filteredRecords.length > 0 ? 
      filteredRecords.reduce((sum, r) => sum + r.overtimeHours, 0) / filteredRecords.length : 0
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'disputed': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeColor = (type: string) => {
    return type === 'employee' ? 'text-blue-600' : 'text-orange-600';
  };

  const handleExportReport = () => {
    const csvData = filteredRecords.map(record => ({
      'Employee Name': record.employeeName,
      'Employee ID': record.employeeId,
      'Position': record.position,
      'Unit': record.unit,
      'Regular Hours': record.regularHours,
      'Overtime Hours': record.overtimeHours,
      'Double Time Hours': record.doubleTimeHours,
      'Total Pay': `$${record.totalPay.toFixed(2)}`,
      'Week Ending': record.weekEnding.toLocaleDateString(),
      'Status': record.status,
      'Type': record.type
    }));

    const csvContent = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `overtime-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleGenerateSummary = () => {
    const summaryData = {
      totalOvertimeHours: totalStats.totalOvertimeHours,
      totalDoubleTimeHours: totalStats.totalDoubleTimeHours,
      totalCost: totalStats.totalCost,
      affectedEmployees: totalStats.affectedEmployees,
      dateRange: dateRange,
      generatedOn: new Date().toLocaleDateString()
    };

    const summaryText = `
OVERTIME SUMMARY REPORT
Generated: ${summaryData.generatedOn}
Period: ${summaryData.dateRange}

TOTALS:
- Overtime Hours: ${summaryData.totalOvertimeHours}
- Double Time Hours: ${summaryData.totalDoubleTimeHours} 
- Total Cost: $${summaryData.totalCost.toFixed(2)}
- Affected Employees: ${summaryData.affectedEmployees}

RECOMMENDATIONS:
- Consider staffing adjustments to reduce overtime
- Review high overtime departments for process improvements
- Implement predictive scheduling to optimize coverage
    `.trim();

    const blob = new Blob([summaryText], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `overtime-summary-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-white border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="outline" size="sm">
                  <Home className="h-4 w-4 mr-2" />
                  Home
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Overtime Reports</h1>
                <p className="text-gray-600">Track and analyze overtime costs across all units</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button variant="outline" onClick={() => handleExportReport()}>
                <Download className="w-4 h-4 mr-2" />
                Export Report
              </Button>
              <Button onClick={() => handleGenerateSummary()}>
                <FileText className="w-4 h-4 mr-2" />
                Generate Summary
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {/* Filters */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Select value={selectedUnit} onValueChange={setSelectedUnit}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Units" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Units</SelectItem>
                  <SelectItem value="ICU">ICU</SelectItem>
                  <SelectItem value="Med-Surg">Med-Surg</SelectItem>
                  <SelectItem value="Memory Care">Memory Care</SelectItem>
                  <SelectItem value="Rehabilitation">Rehabilitation</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedPosition} onValueChange={setSelectedPosition}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Positions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Positions</SelectItem>
                  <SelectItem value="RN">RN</SelectItem>
                  <SelectItem value="LPN">LPN</SelectItem>
                  <SelectItem value="CNA">CNA</SelectItem>
                  <SelectItem value="PT">PT</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="disputed">Disputed</SelectItem>
                </SelectContent>
              </Select>

              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="last7days">Last 7 Days</SelectItem>
                  <SelectItem value="last30days">Last 30 Days</SelectItem>
                  <SelectItem value="last90days">Last 90 Days</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Overtime Hours</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalStats.totalOvertimeHours}</div>
                <p className="text-xs text-muted-foreground">
                  +12% from last period
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Double Time Hours</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalStats.totalDoubleTimeHours}</div>
                <p className="text-xs text-muted-foreground">
                  +8% from last period
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Overtime Cost</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${totalStats.totalCost.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  +15% from last period
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg OT per Employee</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalStats.averageOvertimePerEmployee.toFixed(1)}h</div>
                <p className="text-xs text-muted-foreground">
                  +5% from last period
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Weekly Summary */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Weekly Overtime Summary</CardTitle>
              <CardDescription>Overtime trends by week</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {weeklySummaries.map((summary, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div>
                        <div className="font-medium">Week ending {summary.week}</div>
                        <div className="text-sm text-gray-500">{summary.employeeCount} employees</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-6 text-sm">
                      <div className="text-center">
                        <div className="font-medium">{summary.totalOvertimeHours}h</div>
                        <div className="text-gray-500">Overtime</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium">{summary.totalDoubleTimeHours}h</div>
                        <div className="text-gray-500">Double Time</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium">${summary.totalCost.toLocaleString()}</div>
                        <div className="text-gray-500">Total Cost</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Detailed Records */}
          <Card>
            <CardHeader>
              <CardTitle>Overtime Records</CardTitle>
              <CardDescription>Detailed breakdown of overtime by employee</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredRecords.map((record) => (
                  <div key={record.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center space-x-4">
                      <div>
                        <div className="font-medium">{record.employeeName}</div>
                        <div className="text-sm text-gray-500">
                          <span className={getTypeColor(record.type)}>{record.type === 'employee' ? 'Employee' : 'Contractor'}</span>
                          {' • '} {record.position} - {record.unit}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-6 text-sm">
                      <div className="text-center">
                        <div className="font-medium">{record.regularHours}h</div>
                        <div className="text-gray-500">Regular</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium">{record.overtimeHours}h</div>
                        <div className="text-gray-500">Overtime</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium">{record.doubleTimeHours}h</div>
                        <div className="text-gray-500">Double Time</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium">${record.totalPay.toLocaleString()}</div>
                        <div className="text-gray-500">Total Pay</div>
                      </div>
                      <div className="text-center">
                        <Badge className={cn("text-xs", getStatusColor(record.status))}>
                          {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                        </Badge>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-gray-500">
                          Week ending {record.weekEnding.toLocaleDateString()}
                        </div>
                        <div className="text-xs text-gray-500">
                          Approved by {record.approvedBy}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}