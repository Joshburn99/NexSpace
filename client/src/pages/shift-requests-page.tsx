import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useFacilityPermissions } from "@/hooks/use-facility-permissions";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Clock,
  CheckCircle,
  XCircle,
  Settings,
  Star,
  MapPin,
  Calendar,
  User,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ShiftRequest {
  id: number;
  shiftId: number;
  staffId: number;
  staffName: string;
  staffType: "employee" | "contractor";
  position: string;
  unit: string;
  shiftDate: string;
  shiftTime: string;
  requestedAt: string;
  status: "pending" | "approved" | "denied";
  reliabilityScore: number;
  hoursUntilShift: number;
  isFavorite: boolean;
  reason?: string;
}

interface AutoAssignmentSettings {
  internal: {
    under24h: number;
    days1to3: number;
    days3to5: number;
    over5days: number;
  };
  contractors: {
    under24h: number;
    days1to3: number;
    days3to5: number;
    over5days: number;
  };
}

const mockShiftRequests: ShiftRequest[] = [
  {
    id: 1,
    shiftId: 101,
    staffId: 1,
    staffName: "Sarah Johnson",
    staffType: "employee",
    position: "RN",
    unit: "ICU",
    shiftDate: "2024-12-19",
    shiftTime: "7:00 AM - 7:00 PM",
    requestedAt: "2024-12-18 10:30 AM",
    status: "pending",
    reliabilityScore: 92,
    hoursUntilShift: 8,
    isFavorite: true,
  },
  {
    id: 2,
    shiftId: 102,
    staffId: 2,
    staffName: "Michael Chen",
    staffType: "contractor",
    position: "CNA",
    unit: "Med-Surg",
    shiftDate: "2024-12-20",
    shiftTime: "11:00 PM - 7:00 AM",
    requestedAt: "2024-12-17 3:45 PM",
    status: "pending",
    reliabilityScore: 85,
    hoursUntilShift: 36,
    isFavorite: false,
  },
  {
    id: 3,
    shiftId: 103,
    staffId: 3,
    staffName: "Emily Rodriguez",
    staffType: "employee",
    position: "LPN",
    unit: "Memory Care",
    shiftDate: "2024-12-21",
    shiftTime: "3:00 PM - 11:00 PM",
    requestedAt: "2024-12-16 9:15 AM",
    status: "approved",
    reliabilityScore: 96,
    hoursUntilShift: 60,
    isFavorite: true,
  },
  {
    id: 4,
    shiftId: 104,
    staffId: 4,
    staffName: "David Thompson",
    staffType: "contractor",
    position: "RN",
    unit: "Rehabilitation",
    shiftDate: "2024-12-19",
    shiftTime: "7:00 AM - 7:00 PM",
    requestedAt: "2024-12-14 2:20 PM",
    status: "pending",
    reliabilityScore: 78,
    hoursUntilShift: 8,
    isFavorite: false,
  },
];

export default function ShiftRequestsPage() {
  const { user } = useAuth();
  const { hasPermission } = useFacilityPermissions();
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [requests, setRequests] = useState(mockShiftRequests);
  const [selectedTab, setSelectedTab] = useState("pending");
  const [autoSettings, setAutoSettings] = useState<AutoAssignmentSettings>({
    internal: {
      under24h: 90,
      days1to3: 80,
      days3to5: 70,
      over5days: 60,
    },
    contractors: {
      under24h: 95,
      days1to3: 85,
      days3to5: 75,
      over5days: 65,
    },
  });

  if (!user) return null;

  const handleApproveRequest = (requestId: number) => {
    setRequests((prev) =>
      prev.map((req) => (req.id === requestId ? { ...req, status: "approved" as const } : req))
    );
  };

  const handleDenyRequest = (requestId: number) => {
    setRequests((prev) =>
      prev.map((req) => (req.id === requestId ? { ...req, status: "denied" as const } : req))
    );
  };

  const toggleFavorite = (requestId: number) => {
    setRequests((prev) =>
      prev.map((req) => (req.id === requestId ? { ...req, isFavorite: !req.isFavorite } : req))
    );
  };

  const getTimeFrameCategory = (hours: number) => {
    if (hours < 24) return "under24h";
    if (hours <= 72) return "days1to3";
    if (hours <= 120) return "days3to5";
    return "over5days";
  };

  const getAutoApprovalThreshold = (request: ShiftRequest) => {
    const category = getTimeFrameCategory(request.hoursUntilShift);
    return request.staffType === "employee"
      ? autoSettings.internal[category]
      : autoSettings.contractors[category];
  };

  const filteredRequests = requests.filter((req) => {
    if (selectedTab === "all") return true;
    return req.status === selectedTab;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "denied":
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getStaffTypeColor = (type: string) => {
    return type === "employee" ? "bg-blue-100 text-blue-800" : "bg-orange-100 text-orange-800";
  };

  return (
    <div className="p-6">
      <main className="overflow-x-hidden overflow-y-auto">
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Shift Requests</h2>
              <p className="text-sm text-gray-500">
                Manage shift requests and auto-assignment settings
              </p>
            </div>

            {hasPermission('manage_facility_settings' as any) && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button>
                    <Settings className="w-4 h-4 mr-2" />
                    Auto-Assignment Settings
                  </Button>
                </DialogTrigger>
              <DialogContent className="max-w-4xl">
                <DialogHeader>
                  <DialogTitle>Auto-Assignment Settings</DialogTitle>
                  <DialogDescription>
                    Configure reliability score thresholds for automatic shift assignments based on
                    request timing.
                  </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Internal Employees */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-blue-600">Internal Employees</CardTitle>
                      <CardDescription>Reliability score thresholds for employees</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label>&lt; 24 hours</Label>
                        <Select
                          value={autoSettings.internal.under24h.toString()}
                          onValueChange={(value) =>
                            setAutoSettings((prev) => ({
                              ...prev,
                              internal: { ...prev.internal, under24h: parseInt(value) },
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="95">95+ (Excellent)</SelectItem>
                            <SelectItem value="90">90+ (Very Good)</SelectItem>
                            <SelectItem value="80">80+ (Good)</SelectItem>
                            <SelectItem value="70">70+ (Fair)</SelectItem>
                            <SelectItem value="0">Anyone</SelectItem>
                            <SelectItem value="favorites">Favorites Only</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>1-3 days</Label>
                        <Select
                          value={autoSettings.internal.days1to3.toString()}
                          onValueChange={(value) =>
                            setAutoSettings((prev) => ({
                              ...prev,
                              internal: { ...prev.internal, days1to3: parseInt(value) },
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="95">95+ (Excellent)</SelectItem>
                            <SelectItem value="90">90+ (Very Good)</SelectItem>
                            <SelectItem value="80">80+ (Good)</SelectItem>
                            <SelectItem value="70">70+ (Fair)</SelectItem>
                            <SelectItem value="0">Anyone</SelectItem>
                            <SelectItem value="favorites">Favorites Only</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>3-5 days</Label>
                        <Select
                          value={autoSettings.internal.days3to5.toString()}
                          onValueChange={(value) =>
                            setAutoSettings((prev) => ({
                              ...prev,
                              internal: { ...prev.internal, days3to5: parseInt(value) },
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="95">95+ (Excellent)</SelectItem>
                            <SelectItem value="90">90+ (Very Good)</SelectItem>
                            <SelectItem value="80">80+ (Good)</SelectItem>
                            <SelectItem value="70">70+ (Fair)</SelectItem>
                            <SelectItem value="0">Anyone</SelectItem>
                            <SelectItem value="favorites">Favorites Only</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>&gt; 5 days</Label>
                        <Select
                          value={autoSettings.internal.over5days.toString()}
                          onValueChange={(value) =>
                            setAutoSettings((prev) => ({
                              ...prev,
                              internal: { ...prev.internal, over5days: parseInt(value) },
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="95">95+ (Excellent)</SelectItem>
                            <SelectItem value="90">90+ (Very Good)</SelectItem>
                            <SelectItem value="80">80+ (Good)</SelectItem>
                            <SelectItem value="70">70+ (Fair)</SelectItem>
                            <SelectItem value="0">Anyone</SelectItem>
                            <SelectItem value="favorites">Favorites Only</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Independent Contractors */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-orange-600">Independent Contractors</CardTitle>
                      <CardDescription>
                        Reliability score thresholds for contractors
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label>&lt; 24 hours</Label>
                        <Select
                          value={autoSettings.contractors.under24h.toString()}
                          onValueChange={(value) =>
                            setAutoSettings((prev) => ({
                              ...prev,
                              contractors: { ...prev.contractors, under24h: parseInt(value) },
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="95">95+ (Excellent)</SelectItem>
                            <SelectItem value="90">90+ (Very Good)</SelectItem>
                            <SelectItem value="80">80+ (Good)</SelectItem>
                            <SelectItem value="70">70+ (Fair)</SelectItem>
                            <SelectItem value="0">Anyone</SelectItem>
                            <SelectItem value="favorites">Favorites Only</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>1-3 days</Label>
                        <Select
                          value={autoSettings.contractors.days1to3.toString()}
                          onValueChange={(value) =>
                            setAutoSettings((prev) => ({
                              ...prev,
                              contractors: { ...prev.contractors, days1to3: parseInt(value) },
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="95">95+ (Excellent)</SelectItem>
                            <SelectItem value="90">90+ (Very Good)</SelectItem>
                            <SelectItem value="80">80+ (Good)</SelectItem>
                            <SelectItem value="70">70+ (Fair)</SelectItem>
                            <SelectItem value="0">Anyone</SelectItem>
                            <SelectItem value="favorites">Favorites Only</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>3-5 days</Label>
                        <Select
                          value={autoSettings.contractors.days3to5.toString()}
                          onValueChange={(value) =>
                            setAutoSettings((prev) => ({
                              ...prev,
                              contractors: { ...prev.contractors, days3to5: parseInt(value) },
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="95">95+ (Excellent)</SelectItem>
                            <SelectItem value="90">90+ (Very Good)</SelectItem>
                            <SelectItem value="80">80+ (Good)</SelectItem>
                            <SelectItem value="70">70+ (Fair)</SelectItem>
                            <SelectItem value="0">Anyone</SelectItem>
                            <SelectItem value="favorites">Favorites Only</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>&gt; 5 days</Label>
                        <Select
                          value={autoSettings.contractors.over5days.toString()}
                          onValueChange={(value) =>
                            setAutoSettings((prev) => ({
                              ...prev,
                              contractors: { ...prev.contractors, over5days: parseInt(value) },
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="95">95+ (Excellent)</SelectItem>
                            <SelectItem value="90">90+ (Very Good)</SelectItem>
                            <SelectItem value="80">80+ (Good)</SelectItem>
                            <SelectItem value="70">70+ (Fair)</SelectItem>
                            <SelectItem value="0">Anyone</SelectItem>
                            <SelectItem value="favorites">Favorites Only</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </DialogContent>
            </Dialog>
            )}
          </div>
        </header>

        <div className="p-6">
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="pending">
                Pending ({requests.filter((r) => r.status === "pending").length})
              </TabsTrigger>
              <TabsTrigger value="approved">
                Approved ({requests.filter((r) => r.status === "approved").length})
              </TabsTrigger>
              <TabsTrigger value="denied">
                Denied ({requests.filter((r) => r.status === "denied").length})
              </TabsTrigger>
              <TabsTrigger value="all">All Requests ({requests.length})</TabsTrigger>
            </TabsList>

            <TabsContent value={selectedTab} className="mt-6">
              <div className="grid gap-4">
                {filteredRequests.map((request) => (
                  <Card key={request.id} className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4">
                        <Avatar>
                          <AvatarFallback>
                            {request.staffName
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>

                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <h3 className="font-semibold">{request.staffName}</h3>
                            <Badge className={getStaffTypeColor(request.staffType)}>
                              {request.staffType === "employee" ? "Employee" : "Contractor"}
                            </Badge>
                            {request.isFavorite && (
                              <Star className="w-4 h-4 text-yellow-500 fill-current" />
                            )}
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                            <div className="flex items-center space-x-1">
                              <User className="w-4 h-4" />
                              <span>{request.position}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <MapPin className="w-4 h-4" />
                              <span>{request.unit}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Calendar className="w-4 h-4" />
                              <span>{request.shiftDate}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Clock className="w-4 h-4" />
                              <span>{request.shiftTime}</span>
                            </div>
                          </div>

                          <div className="flex items-center space-x-4 text-sm">
                            <div className="flex items-center space-x-1">
                              <span className="text-gray-500">Reliability Score:</span>
                              <Badge
                                variant={
                                  request.reliabilityScore >= 90
                                    ? "default"
                                    : request.reliabilityScore >= 80
                                      ? "secondary"
                                      : "destructive"
                                }
                              >
                                {request.reliabilityScore}%
                              </Badge>
                            </div>
                            <div className="flex items-center space-x-1">
                              <span className="text-gray-500">Requested:</span>
                              <span>{request.requestedAt}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <span className="text-gray-500">Hours until shift:</span>
                              <span
                                className={cn(
                                  request.hoursUntilShift < 24
                                    ? "text-red-600 font-medium"
                                    : "text-gray-900"
                                )}
                              >
                                {request.hoursUntilShift}h
                              </span>
                            </div>
                          </div>

                          {request.reliabilityScore >= getAutoApprovalThreshold(request) &&
                            request.status === "pending" && (
                              <div className="flex items-center space-x-1 text-green-600 text-sm">
                                <CheckCircle className="w-4 h-4" />
                                <span>Qualifies for auto-approval</span>
                              </div>
                            )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <div className="flex items-center space-x-1">
                          {getStatusIcon(request.status)}
                          <Badge
                            variant={
                              request.status === "approved"
                                ? "default"
                                : request.status === "denied"
                                  ? "destructive"
                                  : "secondary"
                            }
                          >
                            {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                          </Badge>
                        </div>

                        {request.status === "pending" && (
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              onClick={() => toggleFavorite(request.id)}
                              variant={request.isFavorite ? "default" : "outline"}
                            >
                              <Star
                                className={cn("w-4 h-4", request.isFavorite && "fill-current")}
                              />
                            </Button>
                            {hasPermission('approve_shift_requests' as any) && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => handleApproveRequest(request.id)}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  <CheckCircle className="w-4 h-4 mr-1" />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleDenyRequest(request.id)}
                                >
                                  <XCircle className="w-4 h-4 mr-1" />
                                  Deny
                                </Button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}

                {filteredRequests.length === 0 && (
                  <Card className="p-12 text-center">
                    <div className="text-gray-500">
                      <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                      <h3 className="text-lg font-medium mb-2">No requests found</h3>
                      <p>There are no shift requests in the {selectedTab} category.</p>
                    </div>
                  </Card>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
