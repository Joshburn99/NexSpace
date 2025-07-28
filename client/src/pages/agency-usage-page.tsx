import { useState } from "react";
import {
  Upload,
  DollarSign,
  TrendingUp,
  Building,
  FileText,
  Users,
  PieChart,
  BarChart3,
} from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { useShifts } from "@/contexts/ShiftContext";
import { useToast } from "@/hooks/use-toast";

const mockAgencyData = [
  {
    id: 1,
    agencyName: "Premium Healthcare Staffing",
    specialty: "Registered Nurse",
    totalSpent: 125000,
    hoursWorked: 2080,
    averageRate: 60.1,
    marketRate: 52.0,
    costDifference: 8.1,
    invoicesCount: 24,
    lastInvoiceDate: "2025-06-15",
    contractorCount: 8,
    qualityRating: 4.2,
  },
  {
    id: 2,
    agencyName: "MedStaff Solutions",
    specialty: "Licensed Practical Nurse",
    totalSpent: 78000,
    hoursWorked: 2400,
    averageRate: 32.5,
    marketRate: 30.0,
    costDifference: 2.5,
    invoicesCount: 18,
    lastInvoiceDate: "2025-06-12",
    contractorCount: 6,
    qualityRating: 3.8,
  },
  {
    id: 3,
    agencyName: "Flex Care Professionals",
    specialty: "Certified Nursing Assistant",
    totalSpent: 45000,
    hoursWorked: 1950,
    averageRate: 23.08,
    marketRate: 22.0,
    costDifference: 1.08,
    invoicesCount: 15,
    lastInvoiceDate: "2025-06-10",
    contractorCount: 12,
    qualityRating: 4.0,
  },
  {
    id: 4,
    agencyName: "Elite Therapy Staff",
    specialty: "Physical Therapist",
    totalSpent: 89000,
    hoursWorked: 1280,
    averageRate: 69.53,
    marketRate: 65.0,
    costDifference: 4.53,
    invoicesCount: 12,
    lastInvoiceDate: "2025-06-08",
    contractorCount: 4,
    qualityRating: 4.5,
  },
];

const floatPoolData = [
  {
    id: 1,
    contractorName: "Internal Float Pool",
    specialty: "Multi-Certified",
    hoursWorked: 1560,
    averageRate: 38.5,
    totalCost: 60060,
    savingsVsAgency: 18240,
    utilizationRate: 85,
  },
  {
    id: 2,
    contractorName: "Cross-Trained Staff",
    specialty: "RN/LPN Flex",
    hoursWorked: 920,
    averageRate: 42.0,
    totalCost: 38640,
    savingsVsAgency: 12880,
    utilizationRate: 72,
  },
];

export default function AgencyUsagePage() {
  const { user } = useAuth();
  const { open, requested, booked, history } = useShifts();
  const { toast } = useToast();

  // Guard against unauthorized access
  if (user?.role === "employee" || user?.role === "contractor") {
    return null; // Hide facility data from employees and contractors
  }

  // Derive metrics from shift history
  const totalShifts = history.length;
  const openCount = open.length;
  const bookedCount = booked.length;

  const [timeframe, setTimeframe] = useState("last_90_days");
  const [specialty, setSpecialty] = useState("all");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const totalAgencySpend = mockAgencyData.reduce((sum, agency) => sum + agency.totalSpent, 0);
  const totalFloatPoolCost = floatPoolData.reduce((sum, pool) => sum + pool.totalCost, 0);
  const totalFloatPoolSavings = floatPoolData.reduce((sum, pool) => sum + pool.savingsVsAgency, 0);

  const averageAgencyRate =
    mockAgencyData.reduce((sum, agency) => sum + agency.averageRate, 0) / mockAgencyData.length;
  const averageMarketRate =
    mockAgencyData.reduce((sum, agency) => sum + agency.marketRate, 0) / mockAgencyData.length;
  const overMarketPercentage = (
    ((averageAgencyRate - averageMarketRate) / averageMarketRate) *
    100
  ).toFixed(1);

  const specialties = Array.from(new Set(mockAgencyData.map((agency) => agency.specialty)));

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      toast({
        title: "Invoice uploaded successfully",
        description: `${file.name} has been processed and added to the system.`,
      });
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-2">
          <Button variant="outline">
            <BarChart3 className="w-4 h-4 mr-2" />
            Generate Report
          </Button>
          <Button>
            <PieChart className="w-4 h-4 mr-2" />
            Cost Analysis
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  Total Agency Spend
                </p>
                <p className="text-2xl font-bold">${totalAgencySpend.toLocaleString()}</p>
                <p className="text-xs text-red-500">+12.5% vs last period</p>
              </div>
              <DollarSign className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  Float Pool Savings
                </p>
                <p className="text-2xl font-bold text-green-600">
                  ${totalFloatPoolSavings.toLocaleString()}
                </p>
                <p className="text-xs text-green-500">vs agency rates</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  Over Market Rate
                </p>
                <p className="text-2xl font-bold text-orange-600">{overMarketPercentage}%</p>
                <p className="text-xs text-gray-500">Avg vs market</p>
              </div>
              <Building className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  Active Agencies
                </p>
                <p className="text-2xl font-bold">{mockAgencyData.length}</p>
                <p className="text-xs text-gray-500">This period</p>
              </div>
              <Building className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Invoice Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Upload Agency Invoice
            </CardTitle>
            <CardDescription>Upload and process agency invoices for cost tracking</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                Drag and drop invoice files or click to browse
              </p>
              <input
                type="file"
                accept=".pdf,.xlsx,.csv"
                onChange={handleFileUpload}
                className="hidden"
                id="invoice-upload"
              />
              <label htmlFor="invoice-upload">
                <Button variant="outline" className="cursor-pointer">
                  Choose Files
                </Button>
              </label>
              {uploadedFile && (
                <p className="text-sm text-green-600 mt-2">Uploaded: {uploadedFile.name}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Select defaultValue="">
                <SelectTrigger>
                  <SelectValue placeholder="Agency" />
                </SelectTrigger>
                <SelectContent>
                  {mockAgencyData.map((agency) => (
                    <SelectItem key={agency.id} value={agency.agencyName}>
                      {agency.agencyName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select defaultValue="">
                <SelectTrigger>
                  <SelectValue placeholder="Specialty" />
                </SelectTrigger>
                <SelectContent>
                  {specialties.map((spec) => (
                    <SelectItem key={spec} value={spec}>
                      {spec}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full">
              <FileText className="w-4 h-4 mr-2" />
              Process Invoice
            </Button>
          </CardContent>
        </Card>

        {/* Float Pool Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Float Pool Performance
            </CardTitle>
            <CardDescription>Internal float pool cost savings vs agency rates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {floatPoolData.map((pool) => (
                <div key={pool.id} className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-medium">{pool.contractorName}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-300">{pool.specialty}</p>
                    </div>
                    <Badge className="bg-green-100 text-green-800">
                      {pool.utilizationRate}% utilized
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600 dark:text-gray-300">Hours Worked</p>
                      <p className="font-bold">{pool.hoursWorked.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-300">Avg Rate</p>
                      <p className="font-bold">${pool.averageRate}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-300">Savings</p>
                      <p className="font-bold text-green-600">
                        ${pool.savingsVsAgency.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Agency Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Agency Cost Breakdown</CardTitle>
          <CardDescription>Detailed analysis by agency and specialty</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockAgencyData.map((agency) => (
              <div
                key={agency.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:shadow-md transition-shadow"
              >
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{agency.agencyName}</h4>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{agency.specialty}</Badge>
                      <div className="flex items-center gap-1">
                        <span className="text-sm">⭐</span>
                        <span className="text-sm font-medium">{agency.qualityRating}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600 dark:text-gray-300">Total Spent</p>
                      <p className="font-bold">${agency.totalSpent.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-300">Hours</p>
                      <p className="font-bold">{agency.hoursWorked.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-300">Avg Rate</p>
                      <p className="font-bold">${agency.averageRate}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-300">Market Rate</p>
                      <p className="font-bold">${agency.marketRate}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-300">Difference</p>
                      <p
                        className={`font-bold ${agency.costDifference > 0 ? "text-red-600" : "text-green-600"}`}
                      >
                        {agency.costDifference > 0 ? "+" : ""}${agency.costDifference}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-300">Contractors</p>
                      <p className="font-bold">{agency.contractorCount}</p>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <div className="text-xs text-gray-500">
                      {agency.invoicesCount} invoices • Last:{" "}
                      {new Date(agency.lastInvoiceDate).toLocaleDateString()}
                    </div>
                    <div className="text-xs">
                      <span
                        className={`${agency.costDifference > 2 ? "text-red-600" : agency.costDifference < 0 ? "text-green-600" : "text-yellow-600"}`}
                      >
                        {agency.costDifference > 2
                          ? "High Cost"
                          : agency.costDifference < 0
                            ? "Below Market"
                            : "Market Rate"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 ml-4">
                  <Button variant="outline" size="sm">
                    View Details
                  </Button>
                  <Button variant="outline" size="sm">
                    Compare Rates
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h4 className="font-medium mb-2">Cost Optimization Recommendations</h4>
            <ul className="text-sm space-y-1">
              <li>• Increase float pool utilization by 15% to save an estimated $8,500/month</li>
              <li>• Negotiate Premium Healthcare Staffing rates - currently 15.6% above market</li>
              <li>• Consider expanding cross-training program for internal staff</li>
              <li>• Evaluate Elite Therapy Staff performance vs cost premium</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
