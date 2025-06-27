import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Settings, Users, Calendar, DollarSign, AlertTriangle, Clock, Building, BarChart3, Shield, Bell, Workflow, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FacilityProfile {
  id: number;
  name: string;
  facilityType: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  email: string;
  isActive: boolean;
  
  // Enhanced operational data
  dashboardConfig?: any;
  kpiTargets?: any;
  alertThresholds?: any;
  standardShiftTimes?: any;
  minimumStaffingLevels?: any;
  hourlyRateRanges?: any;
  attendancePolicies?: any;
  timeClockSettings?: any;
  departmentStructure?: any;
  approvalWorkflows?: any;
  notificationSettings?: any;
  automationRules?: any;
  preferredAgencies?: any;
  jobPostingTemplates?: any;
  recruitmentSettings?: any;
  referralProgram?: any;
  emergencyContactHierarchy?: any;
  contingencyPlans?: any;
}

export default function ComprehensiveFacilityManagement() {
  const [selectedFacilityId, setSelectedFacilityId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all facilities
  const { data: facilities = [], isLoading: facilitiesLoading } = useQuery({
    queryKey: ["/api/facilities"],
  });

  // Fetch selected facility profile
  const { data: selectedFacility, isLoading: facilityLoading } = useQuery({
    queryKey: ["/api/facilities", selectedFacilityId],
    enabled: !!selectedFacilityId,
  });

  // Update facility mutation
  const updateFacilityMutation = useMutation({
    mutationFn: async (updateData: Partial<FacilityProfile>) => {
      const response = await fetch(`/api/facilities/${selectedFacilityId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/facilities"] });
      toast({ title: "Facility updated successfully" });
    },
  });

  const handleFacilityUpdate = (section: string, data: any) => {
    updateFacilityMutation.mutate({ [section]: data });
  };

  if (facilitiesLoading) {
    return <div className="p-6">Loading facilities...</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Facility Management</h1>
          <p className="text-muted-foreground">
            Comprehensive facility profile management - single source of truth for all operations
          </p>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Facility Selector Sidebar */}
        <div className="col-span-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Select Facility
              </CardTitle>
              <CardDescription>Choose a facility to manage</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {facilities.map((facility: any) => (
                <Button
                  key={facility.id}
                  variant={selectedFacilityId === facility.id ? "default" : "outline"}
                  className="w-full justify-start"
                  onClick={() => setSelectedFacilityId(facility.id)}
                >
                  <div className="text-left">
                    <div className="font-medium">{facility.name}</div>
                    <div className="text-xs text-muted-foreground">{facility.facilityType}</div>
                  </div>
                </Button>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Main Facility Profile Management */}
        <div className="col-span-9">
          {!selectedFacilityId ? (
            <Card>
              <CardContent className="flex items-center justify-center h-64">
                <div className="text-center">
                  <Building className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium">Select a Facility</h3>
                  <p className="text-muted-foreground">Choose a facility from the sidebar to manage its profile</p>
                </div>
              </CardContent>
            </Card>
          ) : facilityLoading ? (
            <div>Loading facility profile...</div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="operations">Operations</TabsTrigger>
                <TabsTrigger value="staffing">Staffing</TabsTrigger>
                <TabsTrigger value="financial">Financial</TabsTrigger>
                <TabsTrigger value="compliance">Compliance</TabsTrigger>
                <TabsTrigger value="integration">Integration</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      Basic Information
                    </CardTitle>
                    <CardDescription>Core facility details and contact information</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Facility Name</Label>
                        <Input value={selectedFacility?.name || ""} />
                      </div>
                      <div>
                        <Label>Facility Type</Label>
                        <Select value={selectedFacility?.facilityType || ""}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="hospital">Hospital</SelectItem>
                            <SelectItem value="nursing_home">Nursing Home</SelectItem>
                            <SelectItem value="assisted_living">Assisted Living</SelectItem>
                            <SelectItem value="rehab_center">Rehabilitation Center</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Phone</Label>
                        <Input value={selectedFacility?.phone || ""} />
                      </div>
                      <div>
                        <Label>Email</Label>
                        <Input value={selectedFacility?.email || ""} />
                      </div>
                    </div>
                    <div>
                      <Label>Address</Label>
                      <Textarea value={`${selectedFacility?.address || ""}\n${selectedFacility?.city || ""}, ${selectedFacility?.state || ""} ${selectedFacility?.zipCode || ""}`} />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Dashboard Configuration
                    </CardTitle>
                    <CardDescription>Customize dashboard layout and KPI targets</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label>Staffing Ratio Target</Label>
                        <Input 
                          type="number" 
                          step="0.01" 
                          value={selectedFacility?.kpiTargets?.staffingRatio || "0.95"} 
                        />
                      </div>
                      <div>
                        <Label>Overtime Percentage Limit</Label>
                        <Input 
                          type="number" 
                          step="0.01" 
                          value={selectedFacility?.kpiTargets?.overtimePercentage || "0.15"} 
                        />
                      </div>
                      <div>
                        <Label>Shift Fill Rate Target</Label>
                        <Input 
                          type="number" 
                          step="0.01" 
                          value={selectedFacility?.kpiTargets?.shiftFillRate || "0.98"} 
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Operations Tab */}
              <TabsContent value="operations" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Standard Shift Times
                    </CardTitle>
                    <CardDescription>Define standard shift patterns for this facility</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label>Day Shift</Label>
                        <div className="flex gap-2">
                          <Input placeholder="Start Time" value="07:00" />
                          <Input placeholder="End Time" value="19:00" />
                        </div>
                      </div>
                      <div>
                        <Label>Evening Shift</Label>
                        <div className="flex gap-2">
                          <Input placeholder="Start Time" value="15:00" />
                          <Input placeholder="End Time" value="23:00" />
                        </div>
                      </div>
                      <div>
                        <Label>Night Shift</Label>
                        <div className="flex gap-2">
                          <Input placeholder="Start Time" value="23:00" />
                          <Input placeholder="End Time" value="07:00" />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Workflow className="h-5 w-5" />
                      Approval Workflows
                    </CardTitle>
                    <CardDescription>Configure approval processes for various operations</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Shift Creation Approval</Label>
                          <p className="text-sm text-muted-foreground">Require approval for new shift posts</p>
                        </div>
                        <Switch defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Time Off Requests</Label>
                          <p className="text-sm text-muted-foreground">Enable manager approval for time off</p>
                        </div>
                        <Switch defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Overtime Authorization</Label>
                          <p className="text-sm text-muted-foreground">Require approval for overtime shifts</p>
                        </div>
                        <Switch defaultChecked />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Staffing Tab */}
              <TabsContent value="staffing" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Minimum Staffing Levels
                    </CardTitle>
                    <CardDescription>Set minimum staffing requirements by specialty</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Registered Nurse (RN)</Label>
                        <Input type="number" value="2" />
                      </div>
                      <div>
                        <Label>Licensed Practical Nurse (LPN)</Label>
                        <Input type="number" value="1" />
                      </div>
                      <div>
                        <Label>Certified Nursing Assistant (CNA)</Label>
                        <Input type="number" value="3" />
                      </div>
                      <div>
                        <Label>Medical Assistant (MA)</Label>
                        <Input type="number" value="1" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5" />
                      Float Pool Management
                    </CardTitle>
                    <CardDescription>Configure cross-training and float pool settings</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Enable Float Pool</Label>
                        <p className="text-sm text-muted-foreground">Allow staff to work across departments</p>
                      </div>
                      <Switch />
                    </div>
                    <div>
                      <Label>Cross-Training Requirements</Label>
                      <Textarea placeholder="Define requirements for staff to work in multiple departments..." />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Financial Tab */}
              <TabsContent value="financial" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      Hourly Rate Ranges
                    </CardTitle>
                    <CardDescription>Define pay ranges by specialty and experience</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-4">
                        <Label>Specialty</Label>
                        <Label>Minimum Rate</Label>
                        <Label>Maximum Rate</Label>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <Input value="Registered Nurse" disabled />
                        <Input type="number" value="35" />
                        <Input type="number" value="65" />
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <Input value="Licensed Practical Nurse" disabled />
                        <Input type="number" value="25" />
                        <Input type="number" value="40" />
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <Input value="Certified Nursing Assistant" disabled />
                        <Input type="number" value="18" />
                        <Input type="number" value="28" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Budget Allocations</CardTitle>
                    <CardDescription>Department-wise budget distribution</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Monthly Staffing Budget</Label>
                        <Input type="number" placeholder="Enter amount" />
                      </div>
                      <div>
                        <Label>Overtime Budget Limit</Label>
                        <Input type="number" placeholder="Percentage of total budget" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Compliance Tab */}
              <TabsContent value="compliance" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      Required Certifications
                    </CardTitle>
                    <CardDescription>Manage certification requirements by role</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div>
                        <Label>Universal Requirements</Label>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <Badge variant="secondary">CPR Certification</Badge>
                          <Badge variant="secondary">HIPAA Training</Badge>
                          <Badge variant="secondary">Background Check</Badge>
                        </div>
                      </div>
                      <div>
                        <Label>Role-Specific Requirements</Label>
                        <Textarea placeholder="Define additional requirements by role..." />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Audit Schedule</CardTitle>
                    <CardDescription>Internal and external audit planning</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Next Internal Audit</Label>
                        <Input type="date" />
                      </div>
                      <div>
                        <Label>Last External Audit</Label>
                        <Input type="date" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Integration Tab */}
              <TabsContent value="integration" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Bell className="h-5 w-5" />
                      Notification Settings
                    </CardTitle>
                    <CardDescription>Configure alerts and notifications</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Low Staffing Alerts</Label>
                          <p className="text-sm text-muted-foreground">Alert when staffing falls below minimums</p>
                        </div>
                        <Switch defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Overtime Threshold Alerts</Label>
                          <p className="text-sm text-muted-foreground">Alert when overtime exceeds limits</p>
                        </div>
                        <Switch defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Certification Expiry Alerts</Label>
                          <p className="text-sm text-muted-foreground">Alert before certifications expire</p>
                        </div>
                        <Switch defaultChecked />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5" />
                      System Integrations
                    </CardTitle>
                    <CardDescription>Connected systems and data sources</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Payroll Integration</Label>
                          <p className="text-sm text-muted-foreground">Sync with payroll provider</p>
                        </div>
                        <Badge variant="outline">Connected</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>HRIS Integration</Label>
                          <p className="text-sm text-muted-foreground">Human Resources Information System</p>
                        </div>
                        <Badge variant="secondary">Not Connected</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>EMR Integration</Label>
                          <p className="text-sm text-muted-foreground">Electronic Medical Records</p>
                        </div>
                        <Badge variant="secondary">Not Connected</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </div>
  );
}