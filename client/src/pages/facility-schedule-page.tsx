import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Calendar,
  Clock,
  Users,
  Plus,
  Copy,
  Printer,
  Send,
  MessageCircle,
  AlertTriangle,
  CheckCircle,
  Filter,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  User,
  MapPin,
} from "lucide-react";
import { format, addDays, startOfWeek, endOfWeek, isSameDay, isToday } from "date-fns";

interface StaffMember {
  id: number;
  firstName: string;
  lastName: string;
  role: string;
  specialty: string;
  department: string;
  avatar?: string;
  status: "active" | "on_break" | "call_off" | "available";
}

interface ShiftAssignment {
  id: number;
  staffId: number;
  shiftId: number;
  date: string;
  startTime: string;
  endTime: string;
  status: "scheduled" | "open" | "requested" | "filled" | "call_off";
  department: string;
  specialty: string;
  notes?: string;
}

interface FacilityRequirements {
  department: string;
  requiredHours: number;
  budgetHours: number;
  currentHours: number;
  shortage: number;
  overage: number;
}

export default function FacilitySchedulePage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"day" | "week" | "2week">("week");
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [showRequests, setShowRequests] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [isAddShiftOpen, setIsAddShiftOpen] = useState(false);

  // Fetch staff members
  const { data: staffMembers = [] } = useQuery<StaffMember[]>({
    queryKey: ["/api/staff"],
  });

  // Fetch shift assignments
  const { data: shiftAssignments = [] } = useQuery<ShiftAssignment[]>({
    queryKey: ["/api/facility/shifts", format(selectedDate, "yyyy-MM-dd")],
  });

  // Fetch facility requirements
  const { data: facilityRequirements = [] } = useQuery<FacilityRequirements[]>({
    queryKey: ["/api/facility/requirements"],
  });

  // Generate date range based on view mode
  const getDateRange = () => {
    if (viewMode === "day") {
      return [selectedDate];
    } else if (viewMode === "week") {
      const start = startOfWeek(selectedDate);
      return Array.from({ length: 7 }, (_, i) => addDays(start, i));
    } else {
      const start = startOfWeek(selectedDate);
      return Array.from({ length: 14 }, (_, i) => addDays(start, i));
    }
  };

  const dateRange = getDateRange();
  const departments = ["All Departments", "ICU", "Emergency", "Medical-Surgical", "Operating Room"];
  const shiftTypes = ["Day", "Evening", "Night"];

  // Get shifts for specific date and staff
  const getShiftsForDateAndStaff = (date: Date, staffId: number) => {
    return shiftAssignments.filter(
      (shift) => shift.staffId === staffId && isSameDay(new Date(shift.date), date)
    );
  };

  // Get open shifts for date
  const getOpenShiftsForDate = (date: Date) => {
    return shiftAssignments.filter(
      (shift) => shift.status === "open" && isSameDay(new Date(shift.date), date)
    );
  };

  // Status color mapping
  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled":
        return "bg-green-100 text-green-800 border-green-200";
      case "open":
        return "bg-red-100 text-red-800 border-red-200";
      case "requested":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "call_off":
        return "bg-orange-100 text-orange-800 border-orange-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  // Add shift mutation
  const addShiftMutation = useMutation({
    mutationFn: async (shiftData: any) => {
      const response = await apiRequest("POST", "/api/facility/shifts", shiftData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/facility/shifts"] });
      setIsAddShiftOpen(false);
      toast({
        title: "Shift Added",
        description: "New shift has been added to the schedule.",
      });
    },
  });

  // Fill shift mutation
  const fillShiftMutation = useMutation({
    mutationFn: async ({ shiftId, staffId }: { shiftId: number; staffId: number }) => {
      const response = await apiRequest("POST", `/api/facility/shifts/${shiftId}/fill`, { staffId });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/facility/shifts"] });
      toast({
        title: "Shift Filled",
        description: "Shift has been successfully assigned.",
      });
    },
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Facility Schedule
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Manage daily staffing and shift assignments
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Copy className="h-4 w-4 mr-2" />
            Copy
          </Button>
          <Button variant="outline" size="sm">
            <Send className="h-4 w-4 mr-2" />
            Post
          </Button>
          <Button variant="outline" size="sm">
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button variant="outline" size="sm">
            <MessageCircle className="h-4 w-4 mr-2" />
            Requests
          </Button>
          <Dialog open={isAddShiftOpen} onOpenChange={setIsAddShiftOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Add Shift
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Shift</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Department</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.slice(1).map((dept) => (
                        <SelectItem key={dept} value={dept.toLowerCase()}>
                          {dept}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Shift Type</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select shift type" />
                    </SelectTrigger>
                    <SelectContent>
                      {shiftTypes.map((type) => (
                        <SelectItem key={type} value={type.toLowerCase()}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <Label>Start Time</Label>
                    <Input type="time" />
                  </div>
                  <div className="flex-1">
                    <Label>End Time</Label>
                    <Input type="time" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsAddShiftOpen(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button className="flex-1">Add Shift</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedDate(addDays(selectedDate, -7))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="font-medium min-w-[120px] text-center">
                  {format(selectedDate, "MMM dd - ")}
                  {format(addDays(selectedDate, viewMode === "day" ? 0 : viewMode === "week" ? 6 : 13), "MMM dd, yyyy")}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedDate(addDays(selectedDate, 7))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <Button
                variant={isToday(selectedDate) ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedDate(new Date())}
              >
                Today
              </Button>
              <Select value={viewMode} onValueChange={(value: "day" | "week" | "2week") => setViewMode(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Day View</SelectItem>
                  <SelectItem value="week">Week View</SelectItem>
                  <SelectItem value="2week">2-Week View</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept} value={dept === "All Departments" ? "all" : dept.toLowerCase()}>
                        {dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Badge variant="outline" className="bg-blue-50">
                <Users className="h-3 w-3 mr-1" />
                RN {shiftAssignments.filter(s => s.specialty === "Registered Nurse").length}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Schedule Grid */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <div className="min-w-[1000px]">
              {/* Header */}
              <div className="grid grid-cols-8 border-b">
                <div className="p-3 font-medium bg-gray-50 dark:bg-gray-800">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Staff
                  </div>
                </div>
                {dateRange.map((date, index) => (
                  <div
                    key={index}
                    className={`p-3 text-center font-medium ${
                      isToday(date) ? "bg-blue-50 text-blue-700" : "bg-gray-50 dark:bg-gray-800"
                    }`}
                  >
                    <div className="text-sm">{format(date, "EEE")}</div>
                    <div className="text-lg">{format(date, "d")}</div>
                  </div>
                ))}
              </div>

              {/* Day Shift Section */}
              <div className="border-b">
                <div className="grid grid-cols-8 bg-blue-50 dark:bg-blue-900/20">
                  <div className="p-2 font-medium flex items-center">
                    <Calendar className="h-4 w-4 mr-2" />
                    Day Shift
                  </div>
                  {dateRange.map((date, index) => (
                    <div key={index} className="p-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-xs">7a-7p</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Staff rows for day shift */}
                {staffMembers
                  .filter((staff) => selectedDepartment === "all" || staff.department.toLowerCase() === selectedDepartment)
                  .slice(0, 8)
                  .map((staff) => (
                    <div key={staff.id} className="grid grid-cols-8 border-b hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <div className="p-3 flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <User className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-medium text-sm">
                            {staff.firstName} {staff.lastName}
                          </div>
                          <div className="text-xs text-gray-500">{staff.specialty}</div>
                        </div>
                      </div>
                      {dateRange.map((date, dateIndex) => {
                        const shifts = getShiftsForDateAndStaff(date, staff.id);
                        return (
                          <div key={dateIndex} className="p-2 min-h-[60px]">
                            {shifts.map((shift) => (
                              <Badge
                                key={shift.id}
                                className={`${getStatusColor(shift.status)} text-xs mb-1 cursor-pointer`}
                                onClick={() => {
                                  if (shift.status === "open") {
                                    fillShiftMutation.mutate({ shiftId: shift.id, staffId: staff.id });
                                  }
                                }}
                              >
                                {shift.startTime}-{shift.endTime}
                              </Badge>
                            ))}
                            {getOpenShiftsForDate(date).length > 0 && (
                              <Badge className="bg-red-100 text-red-800 text-xs cursor-pointer">
                                Open
                              </Badge>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
              </div>

              {/* Evening Shift Section */}
              <div className="border-b">
                <div className="grid grid-cols-8 bg-orange-50 dark:bg-orange-900/20">
                  <div className="p-2 font-medium flex items-center">
                    <Clock className="h-4 w-4 mr-2" />
                    Evening Shift
                  </div>
                  {dateRange.map((date, index) => (
                    <div key={index} className="p-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                        <span className="text-xs">7p-7a</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Evening shift staff rows */}
                {staffMembers
                  .filter((staff) => selectedDepartment === "all" || staff.department.toLowerCase() === selectedDepartment)
                  .slice(8, 16)
                  .map((staff) => (
                    <div key={staff.id} className="grid grid-cols-8 border-b hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <div className="p-3 flex items-center gap-3">
                        <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                          <User className="h-4 w-4 text-orange-600" />
                        </div>
                        <div>
                          <div className="font-medium text-sm">
                            {staff.firstName} {staff.lastName}
                          </div>
                          <div className="text-xs text-gray-500">{staff.specialty}</div>
                        </div>
                      </div>
                      {dateRange.map((date, dateIndex) => {
                        const shifts = getShiftsForDateAndStaff(date, staff.id);
                        return (
                          <div key={dateIndex} className="p-2 min-h-[60px]">
                            {shifts.map((shift) => (
                              <Badge
                                key={shift.id}
                                className={`${getStatusColor(shift.status)} text-xs mb-1`}
                              >
                                {shift.startTime}-{shift.endTime}
                              </Badge>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Requirements Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {facilityRequirements.map((req, index) => (
          <Card key={index}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-sm">{req.department}</h3>
                {req.shortage > 0 ? (
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                ) : (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                )}
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Required Hrs:</span>
                  <span className="font-medium">{req.requiredHours}</span>
                </div>
                <div className="flex justify-between">
                  <span>Budget Hrs:</span>
                  <span className="font-medium">{req.budgetHours}</span>
                </div>
                <div className="flex justify-between">
                  <span>Current Hrs:</span>
                  <span className="font-medium">{req.currentHours}</span>
                </div>
                {req.shortage > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>Shortage:</span>
                    <span className="font-medium">{req.shortage}</span>
                  </div>
                )}
                {req.overage > 0 && (
                  <div className="flex justify-between text-orange-600">
                    <span>Overage:</span>
                    <span className="font-medium">{req.overage}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}