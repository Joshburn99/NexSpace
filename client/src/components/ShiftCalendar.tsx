import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Loader2 } from "lucide-react";
import ShiftCalendarCell from "./ShiftCalendarCell";
import ShiftDetailModal from "./ShiftDetailModal";
import { useShiftsWithAssignments } from "../hooks/useShiftsWithAssignments";
import { addDays, formatDate } from "../utils";
import { useQuery } from "@tanstack/react-query";

const ShiftCalendar: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedShift, setSelectedShift] = useState<string | null>(null);

  const {
    getShiftWithStaffing,
    getShiftsForDate,
    assignWorker,
    unassignWorker,
    getDashboardStats,
    isLoading,
  } = useShiftsWithAssignments();

  // Fetch facilities data
  const { data: facilities = [] } = useQuery({
    queryKey: ["/api/facilities"],
    queryFn: async () => {
      const response = await fetch("/api/facilities", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch facilities");
      return response.json();
    },
  });

  // Get current week dates
  const weekDates = useMemo(() => {
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day; // Adjust to Sunday
    startOfWeek.setDate(diff);

    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      return date.toISOString().split("T")[0];
    });
  }, [currentDate]);

  // Get shifts for each day of the week
  const weeklyShifts = useMemo(() => {
    return weekDates.map((date) => ({
      date,
      shifts: getShiftsForDate(date),
    }));
  }, [weekDates, getShiftsForDate]);

  const selectedShiftData = useMemo(() => {
    if (!selectedShift) return null;
    return getShiftWithStaffing(selectedShift);
  }, [selectedShift, getShiftWithStaffing]);

  const selectedFacility = useMemo(() => {
    if (!selectedShiftData?.shift) return null;
    return facilities.find((f: any) => f.id === selectedShiftData.shift.facilityId) || null;
  }, [selectedShiftData, facilities]);

  const dashboardStats = getDashboardStats;

  const navigateWeek = (direction: "prev" | "next") => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + (direction === "next" ? 7 : -7));
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const handleShiftClick = (shiftId: string) => {
    setSelectedShift(shiftId);
  };

  const handleCloseModal = () => {
    setSelectedShift(null);
  };

  const handleAssignWorker = async (shiftId: string, workerId: string) => {
    try {
      await assignWorker(shiftId, workerId);
    } catch (error) {

      // In a real app, you'd show a toast notification here
    }
  };

  const handleUnassignWorker = async (shiftId: string, workerId: string) => {
    try {
      await unassignWorker(shiftId, workerId);
    } catch (error) {

      // In a real app, you'd show a toast notification here
    }
  };

  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Loading shift calendar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Dashboard Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Staff
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{dashboardStats.activeStaff || 0}</div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Open Shifts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {dashboardStats.openShifts || 0}
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Compliance Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {dashboardStats.complianceRate || 0}%
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Monthly Hours
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {Math.round(dashboardStats.monthlyHours || 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Calendar Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                Shift Calendar
              </h2>
              <div className="text-sm text-muted-foreground">
                Week of {formatDate(weekDates[0])}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={goToToday} size="sm">
                Today
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigateWeek("prev")}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigateWeek("next")}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Calendar Grid - Mobile Responsive */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 md:gap-4">
            {/* Day Headers - Hidden on mobile, shown on larger screens */}
            <div className="hidden lg:contents">
              {dayNames.map((dayName, index) => {
                const date = weekDates[index];
                const isToday = date === new Date().toISOString().split("T")[0];

                return (
                  <div key={dayName} className="text-center">
                    <div
                      className={`font-medium ${isToday ? "text-primary" : "text-muted-foreground"}`}
                    >
                      {dayName}
                    </div>
                    <div className={`text-lg font-bold ${isToday ? "text-primary" : ""}`}>
                      {new Date(date).getDate()}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Calendar Cells with Shifts */}
            {weeklyShifts.map(({ date, shifts }, dayIndex) => {
              const isToday = date === new Date().toISOString().split("T")[0];
              const dayName = dayNames[dayIndex];

              return (
                <div
                  key={date}
                  className={`min-h-[150px] md:min-h-[200px] border rounded-lg p-2 space-y-2 ${
                    isToday ? "bg-primary/5 border-primary/20" : "bg-muted/30"
                  }`}
                >
                  {/* Mobile day header */}
                  <div className="lg:hidden text-center mb-2">
                    <div
                      className={`font-medium text-sm ${isToday ? "text-primary" : "text-muted-foreground"}`}
                    >
                      {dayName}
                    </div>
                    <div className={`text-base font-bold ${isToday ? "text-primary" : ""}`}>
                      {new Date(date).getDate()}
                    </div>
                  </div>

                  {shifts.length === 0 ? (
                    <div className="text-center text-muted-foreground text-sm py-4 md:py-8">
                      No shifts scheduled
                    </div>
                  ) : (
                    shifts.map((shiftData, shiftIndex) => {
                      if (!shiftData) return null;

                      return (
                        <ShiftCalendarCell
                          key={`shift-${shiftData.shift.id}-${date}-${shiftIndex}`}
                          shift={shiftData.shift}
                          assignedWorkers={shiftData.assignedWorkers}
                          requestedWorkers={shiftData.requestedWorkers}
                          onShiftClick={() => handleShiftClick(shiftData.shift.id.toString())}
                          className="w-full"
                        />
                      );
                    })
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Shift Detail Modal */}
      <ShiftDetailModal
        isOpen={!!selectedShift}
        onClose={handleCloseModal}
        shift={selectedShiftData?.shift || null}
        facility={selectedFacility}
        assignedWorkers={selectedShiftData?.assignedWorkers || []}
        requestedWorkers={selectedShiftData?.requestedWorkers || []}
        onAssignWorker={handleAssignWorker}
        onUnassignWorker={handleUnassignWorker}
      />
    </div>
  );
};

export default ShiftCalendar;
