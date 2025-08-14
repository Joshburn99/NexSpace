import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AlertTriangle, UserCheck, Calendar, Clock } from "lucide-react";
import { type Shift } from "@shared/schema";

export function TodaysSchedule() {
  const { user } = useAuth();

  const { data: shifts = [], isLoading } = useQuery<Shift[]>({
    queryKey: ["/api/shifts"],
    enabled: !!user?.facilityId,
  });

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getShiftStatusColor = (shift: Shift) => {
    switch (shift.status) {
      case "filled":
        return "bg-green-50 border-green-200";
      case "open":
        return "bg-red-50 border-red-200";
      case "cancelled":
        return "bg-gray-50 border-gray-200";
      default:
        return "bg-gray-50 border-gray-200";
    }
  };

  const getShiftStatusBadge = (shift: Shift) => {
    switch (shift.status) {
      case "filled":
        return <Badge className="bg-green-100 text-green-800">Covered</Badge>;
      case "open":
        return <Badge variant="destructive">Urgent</Badge>;
      case "cancelled":
        return <Badge variant="secondary">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{shift.status}</Badge>;
    }
  };

  const getShiftIcon = (shift: Shift) => {
    if (shift.status === "filled") {
      return <UserCheck className="h-6 w-6 text-green-600" />;
    }
    return <AlertTriangle className="h-6 w-6 text-red-600" />;
  };

  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">Today's Schedule</CardTitle>
            <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg animate-pulse"
              >
                <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-24"></div>
                </div>
                <div className="h-6 w-16 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-900">Today's Schedule</CardTitle>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">{today}</span>
            <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">
              View Full Calendar
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {shifts.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No shifts scheduled</h3>
            <p className="text-gray-500">There are no shifts scheduled for today.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {shifts.map((shift) => (
              <div
                key={shift.id}
                className={`flex items-center space-x-4 p-4 rounded-lg border transition-colors ${getShiftStatusColor(shift)}`}
              >
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm">
                    {getShiftIcon(shift)}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {shift.shiftType === "day"
                          ? "Day Shift"
                          : shift.shiftType === "night"
                            ? "Night Shift"
                            : "Weekend Shift"}{" "}
                        - {shift.department}
                      </p>
                      <p className="text-sm text-gray-500">
                        <Clock className="inline h-3 w-3 mr-1" />
                        {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
                      </p>
                    </div>
                    <div className="flex items-center space-x-3">
                      {getShiftStatusBadge(shift)}
                      {shift.status === "filled" && shift.assignedStaffIds && (
                        <div className="flex -space-x-2">
                          {shift.assignedStaffIds.slice(0, 3).map((staffId, index) => (
                            <Avatar key={staffId} className="w-8 h-8 border-2 border-white">
                              <AvatarFallback className="text-xs">U{staffId}</AvatarFallback>
                            </Avatar>
                          ))}
                          {shift.assignedStaffIds.length > 3 && (
                            <div className="w-8 h-8 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-xs text-gray-600">
                              +{shift.assignedStaffIds.length - 3}
                            </div>
                          )}
                        </div>
                      )}
                      {shift.status === "open" && (
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                          Fill Shift
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
