import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Calendar,
  Clock,
  Users,
  Building,
  MapPin,
  DollarSign,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  AlertCircle,
  UserCheck,
} from "lucide-react";
import { format, addDays, startOfWeek } from "date-fns";

interface FacilityShift {
  id: number;
  date: string;
  startTime: string;
  endTime: string;
  department: string;
  specialty: string;
  rate: number;
  status: "open" | "filled" | "urgent" | "cancelled";
  assignedStaffId?: number;
  assignedStaffName?: string;
  requirements: string[];
  facilityName: string;
  facilityId: number;
}

export default function FacilitySchedulePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedShift, setSelectedShift] = useState<FacilityShift | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [filterDepartment, setFilterDepartment] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  // Fetch facility shifts
  const { data: shifts = [], isLoading } = useQuery<FacilityShift[]>({
    queryKey: ["/api/facility-shifts", user?.facilityId],
  });

  // Fetch staff for assignments
  const { data: staff = [] } = useQuery({
    queryKey: ["/api/staff"],
  });

  // Filter shifts based on criteria
  const filteredShifts = shifts.filter((shift) => {
    const matchesDepartment = filterDepartment === "all" || shift.department === filterDepartment;
    const matchesStatus = filterStatus === "all" || shift.status === filterStatus;
    return matchesDepartment && matchesStatus;
  });

  // Get unique departments for filter
  const departments = Array.from(new Set(shifts.map((s) => s.department)));
  const statuses = ["open", "filled", "urgent", "cancelled"];

  // Group shifts by date for grid view
  const shiftsByDate = filteredShifts.reduce(
    (acc, shift) => {
      if (!acc[shift.date]) {
        acc[shift.date] = [];
      }
      acc[shift.date].push(shift);
      return acc;
    },
    {} as Record<string, FacilityShift[]>
  );

  // Generate date range for grid
  const startDate = startOfWeek(selectedDate);
  const dateRange = Array.from({ length: 7 }, (_, i) =>
    format(addDays(startDate, i), "yyyy-MM-dd")
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "bg-red-100 text-red-800 border-red-200";
      case "filled":
        return "bg-green-100 text-green-800 border-green-200";
      case "urgent":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "cancelled":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "open":
        return <AlertCircle className="h-3 w-3" />;
      case "filled":
        return <CheckCircle className="h-3 w-3" />;
      case "urgent":
        return <AlertCircle className="h-3 w-3" />;
      case "cancelled":
        return <Trash2 className="h-3 w-3" />;
      default:
        return <AlertCircle className="h-3 w-3" />;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Facility Schedule</h1>
          <p className="text-gray-600 dark:text-gray-300">
            Manage shifts and staffing for your facility
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setShowCreateModal(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Create Shift
          </Button>
          <div className="flex gap-1">
            <Button
              variant={viewMode === "grid" ? "default" : "outline"}
              onClick={() => setViewMode("grid")}
              size="sm"
            >
              Grid
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "outline"}
              onClick={() => setViewMode("list")}
              size="sm"
            >
              List
            </Button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div>
              <Label>Department</Label>
              <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {statuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Shifts</p>
                <p className="text-2xl font-bold">{filteredShifts.length}</p>
              </div>
              <Calendar className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Open Positions</p>
                <p className="text-2xl font-bold text-red-600">
                  {filteredShifts.filter((s) => s.status === "open").length}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Filled Positions</p>
                <p className="text-2xl font-bold text-green-600">
                  {filteredShifts.filter((s) => s.status === "filled").length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Staff Count</p>
                <p className="text-2xl font-bold">{(staff as any[]).length}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Schedule Content */}
      {viewMode === "grid" ? (
        <Card>
          <CardHeader>
            <CardTitle>Weekly Schedule Grid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-4">
              {dateRange.map((date) => (
                <div key={date} className="border rounded-lg p-3">
                  <div className="font-medium text-center mb-3">
                    {format(new Date(date), "EEE, MMM d")}
                  </div>
                  <div className="space-y-2">
                    {(shiftsByDate[date] || []).map((shift) => (
                      <div
                        key={shift.id}
                        className={`p-2 rounded border cursor-pointer hover:shadow-sm ${getStatusColor(shift.status)}`}
                        onClick={() => setSelectedShift(shift)}
                      >
                        <div className="flex items-center gap-1 mb-1">
                          {getStatusIcon(shift.status)}
                          <span className="text-xs font-medium">{shift.department}</span>
                        </div>
                        <div className="text-xs">
                          {shift.startTime} - {shift.endTime}
                        </div>
                        <div className="text-xs">{shift.specialty}</div>
                        <div className="text-xs font-medium">${shift.rate}/hr</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Shift List</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {filteredShifts.map((shift) => (
                <div
                  key={shift.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                  onClick={() => setSelectedShift(shift)}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(shift.status)}`}
                    >
                      {shift.status.toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium">
                        {shift.department} - {shift.specialty}
                      </div>
                      <div className="text-sm text-gray-500">
                        {shift.date} • {shift.startTime} - {shift.endTime}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">${shift.rate}/hour</div>
                    {shift.assignedStaffName && (
                      <div className="text-sm text-gray-500">{shift.assignedStaffName}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Shift Detail Modal */}
      <Dialog open={!!selectedShift} onOpenChange={() => setSelectedShift(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Shift Details</DialogTitle>
          </DialogHeader>
          {selectedShift && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Department</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedShift.department}</span>
                  </div>
                </div>
                <div>
                  <Label>Specialty</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <UserCheck className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedShift.specialty}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Date & Time</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {selectedShift.date} {selectedShift.startTime} - {selectedShift.endTime}
                    </span>
                  </div>
                </div>
                <div>
                  <Label>Rate</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span>${selectedShift.rate}/hour</span>
                  </div>
                </div>
              </div>

              <div>
                <Label>Status</Label>
                <div className="mt-1">
                  <Badge className={getStatusColor(selectedShift.status)}>
                    {selectedShift.status.charAt(0).toUpperCase() + selectedShift.status.slice(1)}
                  </Badge>
                </div>
              </div>

              {selectedShift.assignedStaffName && (
                <div>
                  <Label>Assigned Staff</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedShift.assignedStaffName}</span>
                  </div>
                </div>
              )}

              <div>
                <Label>Requirements</Label>
                <div className="mt-1 flex flex-wrap gap-1">
                  {selectedShift.requirements?.map((req: any, index: any) => (
                    <Badge key={index} variant="secondary">
                      {req}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
