import { useState } from "react";
import { Building, Users, TrendingUp, AlertTriangle, Calendar, Plus, Settings, BarChart3 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { SidebarNav } from "@/components/ui/sidebar-nav";
import { useToast } from "@/hooks/use-toast";

const mockFacilities = [
  {
    id: 1,
    name: "Sunrise Senior Living",
    address: "123 Wellness Blvd, Healthcare City, HC 12345",
    phone: "(555) 123-4567",
    licenseNumber: "FL-12345",
    capacity: 120,
    currentCensus: 98,
    occupancyRate: 81.7,
    requiredStaffing: {
      day: { rn: 3, lpn: 4, cna: 8 },
      evening: { rn: 2, lpn: 3, cna: 6 },
      night: { rn: 1, lpn: 2, cna: 4 }
    },
    currentStaffing: {
      day: { rn: 2, lpn: 4, cna: 7 },
      evening: { rn: 2, lpn: 2, cna: 6 },
      night: { rn: 1, lpn: 1, cna: 3 }
    },
    avgDailyRate: 128.50,
    monthlyRevenue: 387600,
    status: "active"
  },
  {
    id: 2,
    name: "Golden Years Care Center",
    address: "456 Memory Lane, Healthcare City, HC 12346",
    phone: "(555) 234-5678",
    licenseNumber: "FL-12346",
    capacity: 80,
    currentCensus: 72,
    occupancyRate: 90.0,
    requiredStaffing: {
      day: { rn: 2, lpn: 3, cna: 6 },
      evening: { rn: 1, lpn: 2, cna: 4 },
      night: { rn: 1, lpn: 1, cna: 3 }
    },
    currentStaffing: {
      day: { rn: 2, lpn: 3, cna: 6 },
      evening: { rn: 1, lpn: 2, cna: 4 },
      night: { rn: 1, lpn: 1, cna: 2 }
    },
    avgDailyRate: 142.00,
    monthlyRevenue: 306240,
    status: "active"
  }
];

const censusProjections = [
  { month: "Jan", projected: 95, actual: 98 },
  { month: "Feb", projected: 100, actual: 102 },
  { month: "Mar", projected: 105, actual: 98 },
  { month: "Apr", projected: 102, actual: 101 },
  { month: "May", projected: 98, actual: 95 },
  { month: "Jun", projected: 100, actual: 98 }
];

export default function FacilityManagementPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedFacility, setSelectedFacility] = useState(mockFacilities[0]);
  const [activeTab, setActiveTab] = useState("overview");

  const calculateStaffingGap = (required: any, current: any) => {
    const gaps = {
      rn: Math.max(0, required.rn - current.rn),
      lpn: Math.max(0, required.lpn - current.lpn),
      cna: Math.max(0, required.cna - current.cna)
    };
    return gaps.rn + gaps.lpn + gaps.cna;
  };

  const getShiftGaps = (facility: any) => {
    return {
      day: calculateStaffingGap(facility.requiredStaffing.day, facility.currentStaffing.day),
      evening: calculateStaffingGap(facility.requiredStaffing.evening, facility.currentStaffing.evening),
      night: calculateStaffingGap(facility.requiredStaffing.night, facility.currentStaffing.night)
    };
  };

  const totalGaps = getShiftGaps(selectedFacility);
  const totalStaffingGap = totalGaps.day + totalGaps.evening + totalGaps.night;

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <SidebarNav user={user!} />
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Facility Management</h1>
              <p className="text-gray-600 dark:text-gray-300">Monitor census, staffing requirements, and facility operations</p>
            </div>
            <div className="flex gap-2">
              <Select value={selectedFacility.id.toString()} onValueChange={(value) => setSelectedFacility(mockFacilities.find(f => f.id === parseInt(value))!)}>
                <SelectTrigger className="w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {mockFacilities.map(facility => (
                    <SelectItem key={facility.id} value={facility.id.toString()}>
                      {facility.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Facility
              </Button>
            </div>
          </div>

          {/* Key Metrics Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Current Census</p>
                    <p className="text-2xl font-bold">{selectedFacility.currentCensus}</p>
                    <p className="text-xs text-gray-500">of {selectedFacility.capacity} capacity</p>
                  </div>
                  <Users className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Occupancy Rate</p>
                    <p className="text-2xl font-bold text-green-600">{selectedFacility.occupancyRate}%</p>
                    <p className="text-xs text-green-500">+2.3% this month</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Staffing Gaps</p>
                    <p className="text-2xl font-bold text-red-600">{totalStaffingGap}</p>
                    <p className="text-xs text-gray-500">open positions</p>
                  </div>
                  <AlertTriangle className="w-8 h-8 text-red-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Monthly Revenue</p>
                    <p className="text-2xl font-bold">${(selectedFacility.monthlyRevenue / 1000).toFixed(0)}K</p>
                    <p className="text-xs text-gray-500">${selectedFacility.avgDailyRate}/day avg</p>
                  </div>
                  <BarChart3 className="w-8 h-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="staffing">Staffing Matrix</TabsTrigger>
              <TabsTrigger value="census">Census Tracking</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Facility Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="font-medium">License Number</p>
                        <p className="text-gray-600">{selectedFacility.licenseNumber}</p>
                      </div>
                      <div>
                        <p className="font-medium">Phone</p>
                        <p className="text-gray-600">{selectedFacility.phone}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="font-medium">Address</p>
                        <p className="text-gray-600">{selectedFacility.address}</p>
                      </div>
                      <div>
                        <p className="font-medium">Total Capacity</p>
                        <p className="text-gray-600">{selectedFacility.capacity} beds</p>
                      </div>
                      <div>
                        <p className="font-medium">Status</p>
                        <Badge className="bg-green-100 text-green-800">Active</Badge>
                      </div>
                    </div>
                    <Button variant="outline" className="w-full">
                      <Settings className="w-4 h-4 mr-2" />
                      Edit Facility Details
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                    <CardDescription>Common facility management tasks</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button variant="outline" className="w-full justify-start">
                      <Users className="w-4 h-4 mr-2" />
                      Update Census Count
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Calendar className="w-4 h-4 mr-2" />
                      Create Shift Schedule
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Plus className="w-4 h-4 mr-2" />
                      Post Open Shifts
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <BarChart3 className="w-4 h-4 mr-2" />
                      Generate Reports
                    </Button>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Daily Staffing Requirements vs Actual</CardTitle>
                  <CardDescription>Real-time staffing coverage by shift</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {['day', 'evening', 'night'].map((shift) => (
                      <div key={shift} className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium capitalize">{shift} Shift</h4>
                          <Badge className={totalGaps[shift as keyof typeof totalGaps] > 0 ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}>
                            {totalGaps[shift as keyof typeof totalGaps] > 0 ? `${totalGaps[shift as keyof typeof totalGaps]} gaps` : "Fully staffed"}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          {['rn', 'lpn', 'cna'].map((role) => {
                            const required = selectedFacility.requiredStaffing[shift as keyof typeof selectedFacility.requiredStaffing][role as keyof typeof selectedFacility.requiredStaffing.day];
                            const current = selectedFacility.currentStaffing[shift as keyof typeof selectedFacility.currentStaffing][role as keyof typeof selectedFacility.currentStaffing.day];
                            const gap = Math.max(0, required - current);
                            
                            return (
                              <div key={role} className="p-3 border rounded-lg">
                                <p className="text-sm font-medium uppercase">{role}</p>
                                <p className="text-lg font-bold">
                                  {current}/{required}
                                </p>
                                {gap > 0 && (
                                  <p className="text-sm text-red-600">-{gap} needed</p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="staffing" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Staffing Matrix Configuration</CardTitle>
                  <CardDescription>Set required staffing levels based on census ratios</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="grid grid-cols-4 gap-4">
                      <div className="font-medium">Shift</div>
                      <div className="font-medium">RN Required</div>
                      <div className="font-medium">LPN Required</div>
                      <div className="font-medium">CNA Required</div>
                    </div>
                    {['day', 'evening', 'night'].map((shift) => (
                      <div key={shift} className="grid grid-cols-4 gap-4 items-center">
                        <div className="capitalize font-medium">{shift}</div>
                        <Input 
                          type="number" 
                          defaultValue={selectedFacility.requiredStaffing[shift as keyof typeof selectedFacility.requiredStaffing].rn}
                          className="w-20"
                        />
                        <Input 
                          type="number" 
                          defaultValue={selectedFacility.requiredStaffing[shift as keyof typeof selectedFacility.requiredStaffing].lpn}
                          className="w-20"
                        />
                        <Input 
                          type="number" 
                          defaultValue={selectedFacility.requiredStaffing[shift as keyof typeof selectedFacility.requiredStaffing].cna}
                          className="w-20"
                        />
                      </div>
                    ))}
                    <Button>Save Staffing Matrix</Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Census-Based Auto-Staffing</CardTitle>
                  <CardDescription>Automatically calculate staffing needs based on current census</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>RN Ratio (1:X residents)</Label>
                      <Input type="number" defaultValue="15" />
                    </div>
                    <div>
                      <Label>LPN Ratio (1:X residents)</Label>
                      <Input type="number" defaultValue="12" />
                    </div>
                    <div>
                      <Label>CNA Ratio (1:X residents)</Label>
                      <Input type="number" defaultValue="8" />
                    </div>
                  </div>
                  <Button variant="outline">Calculate Auto-Staffing</Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="census" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Census Tracking</CardTitle>
                    <CardDescription>Monitor resident count and projections</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Current Census</Label>
                        <Input type="number" defaultValue={selectedFacility.currentCensus} />
                      </div>
                      <div>
                        <Label>Admissions Today</Label>
                        <Input type="number" defaultValue="2" />
                      </div>
                      <div>
                        <Label>Discharges Today</Label>
                        <Input type="number" defaultValue="1" />
                      </div>
                      <div>
                        <Label>Planned Admissions</Label>
                        <Input type="number" defaultValue="3" />
                      </div>
                    </div>
                    <Button>Update Census</Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Census Projections</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {censusProjections.map((month) => (
                        <div key={month.month} className="flex items-center justify-between p-2 border rounded">
                          <span className="font-medium">{month.month}</span>
                          <div className="flex gap-4 text-sm">
                            <span>Projected: {month.projected}</span>
                            <span className={month.actual > month.projected ? "text-green-600" : "text-red-600"}>
                              Actual: {month.actual}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="settings" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Facility Settings</CardTitle>
                  <CardDescription>Configure facility-specific parameters</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Facility Name</Label>
                      <Input defaultValue={selectedFacility.name} />
                    </div>
                    <div>
                      <Label>License Number</Label>
                      <Input defaultValue={selectedFacility.licenseNumber} />
                    </div>
                    <div>
                      <Label>Phone Number</Label>
                      <Input defaultValue={selectedFacility.phone} />
                    </div>
                    <div>
                      <Label>Total Capacity</Label>
                      <Input type="number" defaultValue={selectedFacility.capacity} />
                    </div>
                  </div>
                  <div>
                    <Label>Address</Label>
                    <Textarea defaultValue={selectedFacility.address} />
                  </div>
                  <Button>Save Changes</Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}