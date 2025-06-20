import { useState, useEffect } from "react";
import { Clock, Play, Square, Calendar, MapPin, User } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { useTimeClock } from "@/contexts/TimeClockContext";

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
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "on_break":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "clocked_out":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "missed":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const handleClockIn = () => {
    if (user) {
      clockIn(Number(user.id), user.firstName + " " + user.lastName, user.role);
    }
  };

  const handleClockOut = () => {
    if (user && currentUserEntry) {
      clockOut(currentUserEntry.id);
    }
  };

  const handleStartBreak = () => {
    if (user && currentUserEntry) {
      startBreak(currentUserEntry.id);
    }
  };

  const handleEndBreak = () => {
    if (user && currentUserEntry) {
      endBreak(currentUserEntry.id);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Time Clock</h1>
        <div className="text-right">
          <div className="text-3xl font-mono font-bold text-blue-600 dark:text-blue-400">
            {formatTime(currentTime)}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {currentTime.toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </div>
        </div>
      </div>

      {/* Current User Status */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
            <User className="h-5 w-5" />
            Your Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-12 w-12">
                <AvatarFallback className="bg-blue-600 text-white">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {user?.firstName} {user?.lastName}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{user?.role}</p>
                {currentUserEntry && (
                  <Badge className={getStatusColor(currentUserEntry.status)}>
                    {currentUserEntry.status.replace("_", " ").toUpperCase()}
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              {!currentUserEntry || currentUserEntry.status === "clocked_out" ? (
                <Button onClick={handleClockIn} className="bg-green-600 hover:bg-green-700">
                  <Play className="h-4 w-4 mr-2" />
                  Clock In
                </Button>
              ) : (
                <>
                  {currentUserEntry.status === "clocked_in" ? (
                    <>
                      <Button onClick={handleStartBreak} variant="outline">
                        Start Break
                      </Button>
                      <Button onClick={handleClockOut} className="bg-red-600 hover:bg-red-700">
                        <Square className="h-4 w-4 mr-2" />
                        Clock Out
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button onClick={handleEndBreak} className="bg-blue-600 hover:bg-blue-700">
                        End Break
                      </Button>
                      <Button onClick={handleClockOut} className="bg-red-600 hover:bg-red-700">
                        <Square className="h-4 w-4 mr-2" />
                        Clock Out
                      </Button>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
          {currentUserEntry && (
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-500 dark:text-gray-400">Clock In:</span>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {currentUserEntry.clockInTime ? new Date(currentUserEntry.clockInTime).toLocaleTimeString() : "N/A"}
                </p>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Total Hours:</span>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {(currentUserEntry.totalHours || 0).toFixed(2)}
                </p>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Break Time:</span>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {(currentUserEntry.breakDuration || 0).toFixed(2)}h
                </p>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Facility:</span>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {currentUserEntry.facilityName}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Daily Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Now</span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {activeUsers.length}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">staff members</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Today's Hours</span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {summaries && Array.isArray(summaries) ? (summaries[0]?.totalHoursToday || 0).toFixed(1) : "0.0"}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">total hours</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-purple-600" />
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Week's Hours</span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {summaries && Array.isArray(summaries) ? (summaries[0]?.totalHoursWeek || 0).toFixed(1) : "0.0"}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">this week</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-orange-600" />
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Overtime</span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {summaries.overtimeHours.toFixed(1)}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">overtime hours</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Time Entries */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Time Entries</CardTitle>
          <CardDescription>Latest clock-in/out activities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {timeClocks.slice(0, 10).map((entry) => (
              <div key={entry.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-blue-600 text-white text-sm">
                      {entry.userName.split(" ").map(n => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{entry.userName}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{entry.userRole}</p>
                  </div>
                </div>
                <div className="text-center">
                  <Badge className={getStatusColor(entry.status)}>
                    {entry.status.replace("_", " ").toUpperCase()}
                  </Badge>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {entry.facilityName}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900 dark:text-white">
                    {entry.totalHours.toFixed(2)}h
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {entry.clockInTime ? formatDate(entry.clockInTime) : "N/A"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}