import { useState, useRef, useEffect } from "react";
import {
  Calendar,
  Clock,
  Users,
  MapPin,
  Filter,
  Plus,
  ChevronLeft,
  ChevronRight,
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
import { useAuth } from "@/hooks/use-auth";

import { useToast } from "@/hooks/use-toast";
import { UserRole } from "@shared/schema";
import { hasPermission } from "@/lib/permissions";

interface Shift {
  id: string;
  title: string;
  start: Date;
  end: Date;
  department: string;
  position: string;
  requiredStaff: number;
  assignedStaff: string[];
  hourlyRate: number;
  status: "open" | "filled" | "urgent" | "cancelled";
  facilityId: number;
  createdBy: string;
  requirements?: string[];
}

interface Staff {
  id: string;
  name: string;
  position: string;
  department: string;
  hourlyRate: number;
  skills: string[];
  availability: "available" | "unavailable" | "limited";
  color: string;
}

const mockShifts: Shift[] = [
  {
    id: "1",
    title: "RN - ICU Day Shift",
    start: new Date(2025, 5, 18, 7, 0),
    end: new Date(2025, 5, 18, 19, 0),
    department: "ICU",
    position: "RN",
    requiredStaff: 2,
    assignedStaff: ["sarah-johnson"],
    hourlyRate: 45,
    status: "open",
    facilityId: 1,
    createdBy: "facility-manager",
    requirements: ["BLS", "ACLS"],
  },
  {
    id: "2",
    title: "CNA - Med/Surg Night",
    start: new Date(2025, 5, 18, 19, 0),
    end: new Date(2025, 5, 19, 7, 0),
    department: "Med/Surg",
    position: "CNA",
    requiredStaff: 3,
    assignedStaff: ["john-doe", "jane-smith"],
    hourlyRate: 28,
    status: "open",
    facilityId: 1,
    createdBy: "charge-nurse",
  },
  {
    id: "3",
    title: "LPN - Emergency",
    start: new Date(2025, 5, 19, 7, 0),
    end: new Date(2025, 5, 19, 19, 0),
    department: "Emergency",
    position: "LPN",
    requiredStaff: 1,
    assignedStaff: [],
    hourlyRate: 32,
    status: "urgent",
    facilityId: 1,
    createdBy: "department-head",
  },
];

const mockStaff: Staff[] = [
  {
    id: "sarah-johnson",
    name: "Sarah Johnson",
    position: "RN",
    department: "ICU",
    hourlyRate: 45,
    skills: ["BLS", "ACLS", "Critical Care"],
    availability: "available",
    color: "#3B82F6",
  },
  {
    id: "john-doe",
    name: "John Doe",
    position: "CNA",
    department: "Med/Surg",
    hourlyRate: 28,
    skills: ["BLS", "Patient Care"],
    availability: "available",
    color: "#10B981",
  },
  {
    id: "jane-smith",
    name: "Jane Smith",
    position: "CNA",
    department: "Med/Surg",
    hourlyRate: 26,
    skills: ["BLS"],
    availability: "limited",
    color: "#F59E0B",
  },
  {
    id: "mike-wilson",
    name: "Mike Wilson",
    position: "LPN",
    department: "Emergency",
    hourlyRate: 32,
    skills: ["BLS", "ACLS", "Trauma"],
    availability: "available",
    color: "#8B5CF6",
  },
];

export default function AdvancedSchedulingPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"week" | "day" | "month">("week");
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [draggedItem, setDraggedItem] = useState<Staff | Shift | null>(null);
  const [shifts, setShifts] = useState<Shift[]>(mockShifts);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

  // Permission checks
  const canCreateShifts = hasPermission(user?.role || UserRole.CONTRACTOR_1099, "create_shifts");
  const canEditShifts = hasPermission(user?.role || UserRole.CONTRACTOR_1099, "edit_shifts");
  const canAssignStaff = hasPermission(user?.role || UserRole.CONTRACTOR_1099, "assign_staff");
  const canViewAllShifts = hasPermission(user?.role || UserRole.CONTRACTOR_1099, "view_all_shifts");

  const getWeekDays = (date: Date) => {
    const week = [];
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay());

    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      week.push(day);
    }
    return week;
  };

  const getTimeSlots = () => {
    const slots = [];
    for (let hour = 0; hour < 24; hour++) {
      slots.push(hour);
    }
    return slots;
  };

  const getShiftsForDay = (date: Date) => {
    return shifts.filter((shift) => {
      const shiftDate = new Date(shift.start);
      return shiftDate.toDateString() === date.toDateString();
    });
  };

  const getShiftPosition = (shift: Shift) => {
    const startHour = shift.start.getHours();
    const endHour = shift.end.getHours();
    const duration = endHour - startHour;

    return {
      top: `${(startHour / 24) * 100}%`,
      height: `${(duration / 24) * 100}%`,
    };
  };

  const handleDragStart = (e: React.DragEvent, item: Staff | Shift) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, targetDate: Date, targetHour: number) => {
    e.preventDefault();

    if (!draggedItem || !canEditShifts) {
      toast({
        title: "Permission denied",
        description: "You don't have permission to modify shifts.",
        variant: "destructive",
      });
      return;
    }

    // Handle staff assignment to existing shift
    if ("name" in draggedItem) {
      const staffMember = draggedItem as Staff;
      const targetShift = getShiftsForDay(targetDate).find((shift) => {
        const shiftHour = shift.start.getHours();
        return targetHour >= shiftHour && targetHour < shift.end.getHours();
      });

      if (targetShift && canAssignStaff) {
        if (!targetShift.assignedStaff.includes(staffMember.id)) {
          setShifts((prev) =>
            prev.map((shift) =>
              shift.id === targetShift.id
                ? { ...shift, assignedStaff: [...shift.assignedStaff, staffMember.id] }
                : shift
            )
          );

          toast({
            title: "Staff assigned",
            description: `${staffMember.name} assigned to ${targetShift.title}`,
          });
        }
      }
    }

    // Handle shift creation/modification
    else if ("title" in draggedItem) {
      const shift = draggedItem as Shift;
      const newStart = new Date(targetDate);
      newStart.setHours(targetHour, 0, 0, 0);
      const newEnd = new Date(newStart);
      newEnd.setHours(targetHour + (shift.end.getHours() - shift.start.getHours()));

      setShifts((prev) =>
        prev.map((s) => (s.id === shift.id ? { ...s, start: newStart, end: newEnd } : s))
      );

      toast({
        title: "Shift moved",
        description: `${shift.title} moved to ${targetDate.toLocaleDateString()}`,
      });
    }

    setDraggedItem(null);
  };

  const handleCreateShift = (date: Date, hour: number) => {
    if (!canCreateShifts) {
      toast({
        title: "Permission denied",
        description: "You don't have permission to create shifts.",
        variant: "destructive",
      });
      return;
    }

    const newShift: Shift = {
      id: `shift-${Date.now()}`,
      title: "New Shift",
      start: new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour),
      end: new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour + 8),
      department: "General",
      position: "RN",
      requiredStaff: 1,
      assignedStaff: [],
      hourlyRate: 35,
      status: "open",
      facilityId: 1,
      createdBy: user?.id?.toString() || "unknown",
    };

    setShifts((prev) => [...prev, newShift]);
    setSelectedShift(newShift);

    toast({
      title: "Shift created",
      description: "New shift created. Click to edit details.",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "bg-blue-100 border-blue-300 text-blue-800";
      case "filled":
        return "bg-green-100 border-green-300 text-green-800";
      case "urgent":
        return "bg-red-100 border-red-300 text-red-800";
      case "cancelled":
        return "bg-gray-100 border-gray-300 text-gray-800";
      default:
        return "bg-gray-100 border-gray-300 text-gray-800";
    }
  };

  const navigateWeek = (direction: "prev" | "next") => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + (direction === "next" ? 7 : -7));
    setCurrentDate(newDate);
  };

  const weekDays = getWeekDays(currentDate);
  const timeSlots = getTimeSlots();

  return (
    <div className="p-6">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Advanced Scheduling
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Drag-and-drop shift management with role-based permissions
            </p>
          </div>
          <div className="flex gap-2">
            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                <SelectItem value="ICU">ICU</SelectItem>
                <SelectItem value="Med/Surg">Med/Surg</SelectItem>
                <SelectItem value="Emergency">Emergency</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={viewMode}
              onValueChange={(value: "week" | "day" | "month") => setViewMode(value)}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Day</SelectItem>
                <SelectItem value="week">Week</SelectItem>
                <SelectItem value="month">Month</SelectItem>
              </SelectContent>
            </Select>
            {canCreateShifts && (
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Quick Shift
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Available Staff Panel */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Available Staff
                </CardTitle>
                <CardDescription>Drag staff to assign to shifts</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {mockStaff
                    .filter(
                      (staff) =>
                        selectedDepartment === "all" || staff.department === selectedDepartment
                    )
                    .map((staff) => (
                      <div
                        key={staff.id}
                        draggable={canAssignStaff}
                        onDragStart={(e) => handleDragStart(e, staff)}
                        className={`p-3 rounded-lg border cursor-move transition-all hover:shadow-md ${
                          canAssignStaff ? "cursor-move" : "cursor-not-allowed opacity-50"
                        }`}
                        style={{ borderColor: staff.color }}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm">{staff.name}</p>
                            <p className="text-xs text-gray-600 dark:text-gray-300">
                              {staff.position}
                            </p>
                          </div>
                          <Badge
                            className={
                              staff.availability === "available"
                                ? "bg-green-100 text-green-800"
                                : staff.availability === "limited"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-red-100 text-red-800"
                            }
                          >
                            {staff.availability}
                          </Badge>
                        </div>
                        <div className="mt-2">
                          <p className="text-xs text-gray-500">${staff.hourlyRate}/hr</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {staff.skills.slice(0, 2).map((skill) => (
                              <Badge key={skill} variant="secondary" className="text-xs">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Calendar View */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Button variant="outline" size="sm" onClick={() => navigateWeek("prev")}>
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <h3 className="text-lg font-semibold">
                      {currentDate.toLocaleDateString("en-US", {
                        month: "long",
                        year: "numeric",
                        day: "numeric",
                      })}
                    </h3>
                    <Button variant="outline" size="sm" onClick={() => navigateWeek("next")}>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
                    Today
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div ref={calendarRef} className="overflow-x-auto">
                  <div className="min-w-[800px]">
                    {/* Week View */}
                    {viewMode === "week" && (
                      <div className="grid grid-cols-8 gap-1">
                        {/* Time column */}
                        <div className="col-span-1">
                          <div className="h-12 border-b"></div>
                          {timeSlots.map((hour) => (
                            <div
                              key={hour}
                              className="h-16 border-b flex items-center justify-center text-xs text-gray-500"
                            >
                              {hour === 0
                                ? "12 AM"
                                : hour < 12
                                  ? `${hour} AM`
                                  : hour === 12
                                    ? "12 PM"
                                    : `${hour - 12} PM`}
                            </div>
                          ))}
                        </div>

                        {/* Day columns */}
                        {weekDays.map((day, dayIndex) => (
                          <div key={dayIndex} className="col-span-1">
                            {/* Day header */}
                            <div className="h-12 border-b p-2 text-center">
                              <div className="text-sm font-medium">
                                {day.toLocaleDateString("en-US", { weekday: "short" })}
                              </div>
                              <div className="text-lg font-bold">{day.getDate()}</div>
                            </div>

                            {/* Time slots */}
                            <div className="relative">
                              {timeSlots.map((hour) => (
                                <div
                                  key={hour}
                                  className="h-16 border-b border-r hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer relative"
                                  onDragOver={handleDragOver}
                                  onDrop={(e) => handleDrop(e, day, hour)}
                                  onDoubleClick={() => handleCreateShift(day, hour)}
                                >
                                  {/* Render shifts for this time slot */}
                                  {getShiftsForDay(day)
                                    .filter((shift) => {
                                      const shiftStart = shift.start.getHours();
                                      const shiftEnd = shift.end.getHours();
                                      return hour >= shiftStart && hour < shiftEnd;
                                    })
                                    .map((shift) => {
                                      if (hour !== shift.start.getHours()) return null;

                                      const position = getShiftPosition(shift);
                                      return (
                                        <div
                                          key={shift.id}
                                          draggable={canEditShifts}
                                          onDragStart={(e) => handleDragStart(e, shift)}
                                          onClick={() => setSelectedShift(shift)}
                                          className={`absolute left-1 right-1 rounded p-1 text-xs cursor-pointer border ${getStatusColor(shift.status)} ${
                                            canEditShifts ? "cursor-move" : "cursor-pointer"
                                          }`}
                                          style={{
                                            top: 0,
                                            height: `${(shift.end.getHours() - shift.start.getHours()) * 64}px`,
                                          }}
                                        >
                                          <div className="font-medium truncate">{shift.title}</div>
                                          <div className="text-xs opacity-75">{shift.position}</div>
                                          <div className="text-xs opacity-75">
                                            {shift.assignedStaff.length}/{shift.requiredStaff} staff
                                          </div>
                                        </div>
                                      );
                                    })}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Shift Details Modal */}
        {selectedShift && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-96 max-h-[80vh] overflow-y-auto">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{selectedShift.title}</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedShift(null)}>
                    ×
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium">Department</p>
                    <p>{selectedShift.department}</p>
                  </div>
                  <div>
                    <p className="font-medium">Position</p>
                    <p>{selectedShift.position}</p>
                  </div>
                  <div>
                    <p className="font-medium">Start Time</p>
                    <p>{selectedShift.start.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="font-medium">End Time</p>
                    <p>{selectedShift.end.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="font-medium">Hourly Rate</p>
                    <p>${selectedShift.hourlyRate}</p>
                  </div>
                  <div>
                    <p className="font-medium">Status</p>
                    <Badge className={getStatusColor(selectedShift.status)}>
                      {selectedShift.status}
                    </Badge>
                  </div>
                </div>

                <div>
                  <p className="font-medium mb-2">
                    Assigned Staff ({selectedShift.assignedStaff.length}/
                    {selectedShift.requiredStaff})
                  </p>
                  <div className="space-y-2">
                    {selectedShift.assignedStaff.map((staffId) => {
                      const staff = mockStaff.find((s) => s.id === staffId);
                      return staff ? (
                        <div
                          key={staffId}
                          className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded"
                        >
                          <span className="text-sm">
                            {staff.name} - {staff.position}
                          </span>
                          {canAssignStaff && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setShifts((prev) =>
                                  prev.map((shift) =>
                                    shift.id === selectedShift.id
                                      ? {
                                          ...shift,
                                          assignedStaff: shift.assignedStaff.filter(
                                            (id) => id !== staffId
                                          ),
                                        }
                                      : shift
                                  )
                                );
                                setSelectedShift({
                                  ...selectedShift,
                                  assignedStaff: selectedShift.assignedStaff.filter(
                                    (id) => id !== staffId
                                  ),
                                });
                              }}
                            >
                              Remove
                            </Button>
                          )}
                        </div>
                      ) : null;
                    })}
                    {selectedShift.assignedStaff.length === 0 && (
                      <p className="text-sm text-gray-500">No staff assigned</p>
                    )}
                  </div>
                </div>

                {selectedShift.requirements && (
                  <div>
                    <p className="font-medium mb-2">Requirements</p>
                    <div className="flex flex-wrap gap-1">
                      {selectedShift.requirements.map((req) => (
                        <Badge key={req} variant="secondary" className="text-xs">
                          {req}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  {canEditShifts && (
                    <Button variant="outline" className="flex-1">
                      Edit Shift
                    </Button>
                  )}
                  <Button variant="outline" className="flex-1">
                    Duplicate
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
