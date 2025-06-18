import { useState } from "react";
import { Calendar, Clock, Users, MapPin } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { getQueryFn } from "@/lib/queryClient";

export default function SchedulingPage() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());

  const { data: shifts = [] } = useQuery({
    queryKey: ["/api/shifts"],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!user,
  });

  const { data: openShifts = [] } = useQuery({
    queryKey: ["/api/shifts/open"],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!user,
  });

  const todayShifts = (shifts as any[]).filter((shift: any) => {
    const shiftDate = new Date(shift.startTime);
    return shiftDate.toDateString() === selectedDate.toDateString();
  });

  return (
    <Layout>
      <div className="p-6">
        <div className="flex items-center justify-end mb-6">
          <Button>
            <Calendar className="w-4 h-4 mr-2" />
            Create Shift
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Calendar View */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Schedule Calendar
                </CardTitle>
                <CardDescription>
                  View and manage shifts by date
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-2 mb-4">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="text-center text-sm font-medium text-gray-600 dark:text-gray-300 p-2">
                      {day}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {Array.from({ length: 35 }, (_, i) => {
                    const date = new Date();
                    date.setDate(date.getDate() - date.getDay() + i);
                    const isSelected = date.toDateString() === selectedDate.toDateString();
                    const isToday = date.toDateString() === new Date().toDateString();
                    
                    return (
                      <button
                        key={i}
                        onClick={() => setSelectedDate(date)}
                        className={`p-2 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${
                          isSelected ? 'bg-blue-500 text-white' : 
                          isToday ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300' : 
                          'text-gray-600 dark:text-gray-300'
                        }`}
                      >
                        {date.getDate()}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Today's Shifts */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Today's Shifts
                </CardTitle>
                <CardDescription>
                  {selectedDate.toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {todayShifts.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-sm">No shifts scheduled</p>
                ) : (
                  todayShifts.map((shift: any) => (
                    <div key={shift.id} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{shift.position}</span>
                        <Badge variant={shift.isAssigned ? "default" : "destructive"}>
                          {shift.isAssigned ? "Assigned" : "Open"}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(shift.startTime).toLocaleTimeString()} - 
                          {new Date(shift.endTime).toLocaleTimeString()}
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {shift.facility?.name || 'Facility'}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Open Shifts */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Open Shifts
              </CardTitle>
              <CardDescription>
                Shifts that need staff assignment
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(openShifts as any[]).map((shift: any) => (
                  <div key={shift.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium">{shift.position}</h3>
                      <Badge variant="destructive">Urgent</Badge>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                      <div>{new Date(shift.startTime).toLocaleDateString()}</div>
                      <div>
                        {new Date(shift.startTime).toLocaleTimeString()} - 
                        {new Date(shift.endTime).toLocaleTimeString()}
                      </div>
                      <div>{shift.facility?.name}</div>
                    </div>
                    <Button size="sm" className="w-full mt-3">
                      Assign Staff
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
    </Layout>
  );
}