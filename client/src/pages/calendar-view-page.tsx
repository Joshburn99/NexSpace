import { useState } from "react";
import { Calendar, ChevronLeft, ChevronRight, Filter, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useQuery } from "@tanstack/react-query";

import { getQueryFn } from "@/lib/queryClient";

type ViewType = "daily" | "weekly" | "monthly";

export default function CalendarViewPage() {
  const { user, impersonatedUser } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewType, setViewType] = useState<ViewType>("weekly");
  const [selectedUnit, setSelectedUnit] = useState("all");

  const currentUser = impersonatedUser || user;
  const canPostShifts = currentUser?.role === 'manager' || currentUser?.role === 'admin';

  const { data: shifts = [] } = useQuery({
    queryKey: ["/api/shifts"],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!user,
  });

  const units = ["all", "ICU", "Med-Surg", "Memory Care", "Rehabilitation"];
  const specialtyColors = {
    RN: "bg-blue-100 text-blue-800 border-blue-200",
    LPN: "bg-green-100 text-green-800 border-green-200",
    CNA: "bg-purple-100 text-purple-800 border-purple-200",
    PT: "bg-orange-100 text-orange-800 border-orange-200",
  };

  const getSpecialtyFromRequirements = (requirements: string[] = []) => {
    if (requirements.includes("RN")) return "RN";
    if (requirements.includes("LPN")) return "LPN";
    if (requirements.includes("CNA")) return "CNA";
    if (requirements.includes("PT")) return "PT";
    return "RN"; // default
  };

  const getStatusColor = (status: string, assignedCount: number, requiredCount: number) => {
    if (status === "open") return "bg-red-100 text-red-800 border-red-200";
    if (status === "filled" && assignedCount >= requiredCount)
      return "bg-green-100 text-green-800 border-green-200";
    if (assignedCount < requiredCount) return "bg-yellow-100 text-yellow-800 border-yellow-200";
    return "bg-gray-100 text-gray-800 border-gray-200";
  };

  const getDateRange = () => {
    const start = new Date(currentDate);
    const end = new Date(currentDate);

    switch (viewType) {
      case "daily":
        return { start, end };
      case "weekly":
        start.setDate(start.getDate() - start.getDay());
        end.setDate(start.getDate() + 6);
        return { start, end };
      case "monthly":
        start.setDate(1);
        end.setMonth(end.getMonth() + 1, 0);
        return { start, end };
    }
  };

  const navigateDate = (direction: "prev" | "next") => {
    const newDate = new Date(currentDate);
    switch (viewType) {
      case "daily":
        newDate.setDate(newDate.getDate() + (direction === "next" ? 1 : -1));
        break;
      case "weekly":
        newDate.setDate(newDate.getDate() + (direction === "next" ? 7 : -7));
        break;
      case "monthly":
        newDate.setMonth(newDate.getMonth() + (direction === "next" ? 1 : -1));
        break;
    }
    setCurrentDate(newDate);
  };

  const formatDateHeader = () => {
    const { start, end } = getDateRange();
    switch (viewType) {
      case "daily":
        return currentDate.toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });
      case "weekly":
        return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
      case "monthly":
        return currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    }
  };

  const renderCalendarContent = () => {
    const { start, end } = getDateRange();

    if (viewType === "weekly") {
      return (
        <div className="grid grid-cols-7 gap-1">
          {/* Days header */}
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="p-3 text-center font-medium text-gray-600 border-b">
              {day}
            </div>
          ))}

          {/* Week days */}
          {Array.from({ length: 7 }, (_, i) => {
            const dayDate = new Date(start);
            dayDate.setDate(start.getDate() + i);
            const dayShifts = (shifts as any[]).filter((shift: any) => {
              const shiftDate = new Date(shift.startTime);
              return shiftDate.toDateString() === dayDate.toDateString();
            });

            return (
              <div key={i} className="min-h-[120px] p-2 border border-gray-200">
                <div className="font-medium text-sm mb-2">{dayDate.getDate()}</div>
                <div className="space-y-1">
                  {dayShifts.slice(0, 3).map((shift: any, idx: number) => {
                    const specialty = getSpecialtyFromRequirements(shift.specialRequirements);
                    const assignedCount = shift.assignedStaffIds?.length || 0;
                    const statusColor = getStatusColor(
                      shift.status,
                      assignedCount,
                      shift.requiredStaff
                    );
                    const specialtyColor =
                      specialtyColors[specialty as keyof typeof specialtyColors];

                    return (
                      <div
                        key={idx}
                        className={`text-xs p-1 rounded border ${specialtyColor} truncate`}
                      >
                        <div className="font-medium">
                          {specialty} - {shift.department}
                        </div>
                        <div className={`text-xs px-1 rounded ${statusColor} mt-1`}>
                          {assignedCount}/{shift.requiredStaff} {shift.shiftType}
                        </div>
                      </div>
                    );
                  })}
                  {dayShifts.length > 3 && (
                    <div className="text-xs text-gray-500">+{dayShifts.length - 3} more</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    if (viewType === "daily") {
      const dayShifts = (shifts as any[]).filter((shift: any) => {
        const shiftDate = new Date(shift.startTime);
        return shiftDate.toDateString() === currentDate.toDateString();
      });

      return (
        <div className="space-y-4">
          {/* Time slots */}
          {Array.from({ length: 24 }, (_, hour) => (
            <div key={hour} className="flex border-b border-gray-100">
              <div className="w-16 py-2 text-sm text-gray-500">
                {hour.toString().padStart(2, "0")}:00
              </div>
              <div className="flex-1 p-2 min-h-[60px]">
                {dayShifts
                  .filter((shift: any) => {
                    const shiftStart = new Date(shift.startTime);
                    return shiftStart.getHours() === hour;
                  })
                  .map((shift: any, idx: number) => (
                    <div key={idx} className="mb-1 p-2 rounded bg-blue-100 text-blue-800 text-sm">
                      <div className="font-medium">
                        {shift.role} - {shift.unit}
                      </div>
                      <div className="text-xs">
                        {shift.startTime} - {shift.endTime}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (viewType === "monthly") {
      const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      const startCalendar = new Date(firstDay);
      startCalendar.setDate(startCalendar.getDate() - firstDay.getDay());

      const calendarDays = [];
      for (let i = 0; i < 42; i++) {
        const day = new Date(startCalendar);
        day.setDate(startCalendar.getDate() + i);
        calendarDays.push(day);
      }

      return (
        <div className="grid grid-cols-7 gap-1">
          {/* Days header */}
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="p-3 text-center font-medium text-gray-600 border-b">
              {day}
            </div>
          ))}

          {/* Calendar days */}
          {calendarDays.map((day, i) => {
            const isCurrentMonth = day.getMonth() === currentDate.getMonth();
            const dayShifts = (shifts as any[]).filter((shift: any) => {
              const shiftDate = new Date(shift.startTime);
              return shiftDate.toDateString() === day.toDateString();
            });

            return (
              <div
                key={i}
                className={`min-h-[100px] p-2 border border-gray-200 ${
                  !isCurrentMonth ? "bg-gray-50 text-gray-400" : ""
                }`}
              >
                <div className="font-medium text-sm mb-1">{day.getDate()}</div>
                <div className="space-y-1">
                  {dayShifts.slice(0, 2).map((shift: any, idx: number) => {
                    const specialty = getSpecialtyFromRequirements(shift.specialRequirements);
                    const assignedCount = shift.assignedStaffIds?.length || 0;
                    const statusColor = getStatusColor(
                      shift.status,
                      assignedCount,
                      shift.requiredStaff
                    );
                    const specialtyColor =
                      specialtyColors[specialty as keyof typeof specialtyColors];

                    return (
                      <div
                        key={idx}
                        className={`text-xs p-1 rounded border ${specialtyColor} truncate`}
                      >
                        <div className="font-medium">
                          {specialty} - {shift.department}
                        </div>
                        <div className={`text-xs px-1 rounded ${statusColor} mt-1`}>
                          {assignedCount}/{shift.requiredStaff} {shift.shiftType}
                        </div>
                      </div>
                    );
                  })}
                  {dayShifts.length > 2 && (
                    <div className="text-xs text-gray-500">+{dayShifts.length - 2} more</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      );
    }
  };

  return (
    <div className="p-6">
      <div className="p-6">
        {/* Header Controls */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            {/* View Type Selector */}
            <div className="flex border rounded-lg p-1">
              {(["daily", "weekly", "monthly"] as ViewType[]).map((type) => (
                <Button
                  key={type}
                  variant={viewType === type ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewType(type)}
                  className="capitalize"
                >
                  {type}
                </Button>
              ))}
            </div>

            {/* Unit Filter */}
            <Select value={selectedUnit} onValueChange={setSelectedUnit}>
              <SelectTrigger className="w-40">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {units.map((unit) => (
                  <SelectItem key={unit} value={unit}>
                    {unit === "all" ? "All Units" : unit}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {canPostShifts && (
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Shift
            </Button>
          )}
        </div>

        {/* Specialty Color Legend */}
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-gray-700">Specialty Color Coding:</div>
            <div className="flex gap-4 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-blue-100 border border-blue-200"></div>
                <span>RN (Registered Nurse)</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-green-100 border border-green-200"></div>
                <span>LPN (Licensed Practical Nurse)</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-purple-100 border border-purple-200"></div>
                <span>CNA (Certified Nursing Assistant)</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-orange-100 border border-orange-200"></div>
                <span>PT (Physical Therapist)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Calendar Navigation */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="outline" size="sm" onClick={() => navigateDate("prev")}>
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <h2 className="text-xl font-semibold">{formatDateHeader()}</h2>

          <Button variant="outline" size="sm" onClick={() => navigateDate("next")}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Calendar Content */}
        <Card>
          <CardContent className="p-0">{renderCalendarContent()}</CardContent>
        </Card>

        {/* Legend */}
        <div className="mt-6 flex items-center space-x-6">
          <div className="text-sm text-gray-600">Specialty Color Code:</div>
          {Object.entries(specialtyColors).map(([specialty, className]) => (
            <div key={specialty} className="flex items-center space-x-2">
              <Badge className={className}>{specialty}</Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
