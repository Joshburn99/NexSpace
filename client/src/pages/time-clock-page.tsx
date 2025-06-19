import { useState, useEffect } from "react";
import { Clock, Play, Square, Calendar, MapPin, User } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { useTimeClock } from "@/contexts/TimeClockContext";
  {
    id: 1,
    employeeName: "Sarah Johnson",
    position: "Registered Nurse",
    facility: "Sunrise Senior Living",
    clockIn: "2025-06-17T06:00:00Z",
    clockOut: "2025-06-17T18:15:00Z",
    totalHours: 12.25,
    status: "completed",
    notes: "Extra 15 minutes for patient handoff",
  },
  {
    id: 2,
    employeeName: "Michael Chen",
    position: "Licensed Practical Nurse",
    facility: "Golden Years Care Center",
    clockIn: "2025-06-17T18:00:00Z",
    clockOut: null,
    totalHours: 0,
    status: "clocked_in",
    notes: null,
  },
  {
    id: 3,
    employeeName: "Emily Rodriguez",
    position: "Certified Nursing Assistant",
    facility: "Harmony Health Center",
    clockIn: "2025-06-17T14:00:00Z",
    clockOut: "2025-06-17T22:30:00Z",
    totalHours: 8.5,
    status: "completed",
    notes: "Stayed late to assist with incident report",
  },
];

export default function TimeClockPage() {
  const { user } = useAuth();
  const { timeClocks, summaries, getActiveUsers, clockIn, clockOut, startBreak, endBreak, isLoading } = useTimeClock();
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const activeUsers = getActiveUsers();
  const currentUserEntry = activeUsers.find(
    (entry) => entry.userName.includes(user?.firstName || "")
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "clocked_in":
        return "bg-green-100 text-green-800";
      case "completed":
        return "bg-blue-100 text-blue-800";
      case "missed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDuration = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  const getCurrentShiftHours = () => {
    if (currentUserEntry) {
      const start = new Date(currentUserEntry.clockIn);
      const now = new Date();
      const hours = (now.getTime() - start.getTime()) / (1000 * 60 * 60);
      return hours;
    }
    return 0;
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-end mb-6">
        <div className="text-right">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {currentTime.toLocaleTimeString()}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-300">
            {currentTime.toLocaleDateString()}
          </div>
        </div>
      </div>

      {/* Clock In/Out Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Quick Clock In/Out
            </CardTitle>
            <CardDescription>Manage your work time for today</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {currentUserEntry ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    Currently clocked in
                  </span>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                  <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">Started at</div>
                  <div className="font-semibold">
                    {new Date(currentUserEntry.clockIn).toLocaleTimeString()}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                    Current session: {formatDuration(getCurrentShiftHours())}
                  </div>
                </div>
                <Button className="w-full" variant="destructive">
                  <Square className="w-4 h-4 mr-2" />
                  Clock Out
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-center py-4">
                  <Clock className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600 dark:text-gray-300">Ready to start your shift</p>
                </div>
                <Button className="w-full">
                  <Play className="w-4 h-4 mr-2" />
                  Clock In
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Today's Summary</CardTitle>
            <CardDescription>
              Your time tracking for {currentTime.toLocaleDateString()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {currentUserEntry ? formatDuration(getCurrentShiftHours()) : "0h 0m"}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">Hours Worked</div>
                </div>
                <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    ${currentUserEntry ? (getCurrentShiftHours() * 45).toFixed(0) : "0"}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">Earnings</div>
                </div>
              </div>

              {currentUserEntry && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Facility:</span>
                    <span className="font-medium">{currentUserEntry.facility}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Position:</span>
                    <span className="font-medium">{currentUserEntry.position}</span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Time Entries */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Time Entries</CardTitle>
          <CardDescription>View and manage your recent work sessions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockTimeEntries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center space-x-4">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback>
                      {entry.employeeName
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>

                  <div className="space-y-1">
                    <div className="font-medium">{entry.employeeName}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">{entry.position}</div>
                    <div className="flex items-center text-sm text-gray-500">
                      <MapPin className="w-3 h-3 mr-1" />
                      {entry.facility}
                    </div>
                  </div>
                </div>

                <div className="text-center">
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    {new Date(entry.clockIn).toLocaleDateString()}
                  </div>
                  <div className="font-medium">
                    {new Date(entry.clockIn).toLocaleTimeString()} -
                    {entry.clockOut ? new Date(entry.clockOut).toLocaleTimeString() : " Active"}
                  </div>
                  {entry.totalHours > 0 && (
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      {formatDuration(entry.totalHours)}
                    </div>
                  )}
                </div>

                <div className="text-right space-y-2">
                  <Badge className={getStatusColor(entry.status)}>
                    {entry.status === "clocked_in" ? "Active" : "Completed"}
                  </Badge>
                  {entry.notes && (
                    <div className="text-xs text-gray-500 max-w-32">{entry.notes}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
