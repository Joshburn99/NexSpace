import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Clock, MapPin, DollarSign, User, AlertCircle, Star, Building } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";

interface WorkerShift {
  id: number;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  department: string;
  specialty: string;
  facilityId: number;
  facilityName: string;
  status: "open" | "requested" | "confirmed" | "completed" | "cancelled";
  rate: number;
  urgency: "low" | "medium" | "high" | "critical";
  description: string;
  assignedStaffId?: number;
}

export default function MySchedulePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedShift, setSelectedShift] = useState<WorkerShift | null>(null);
  const [activeView, setActiveView] = useState('dayGridMonth');
  const [activeTab, setActiveTab] = useState('calendar');

  // Fetch worker's assigned shifts from Enhanced Schedule data
  const { data: myShifts = [], isLoading } = useQuery({
    queryKey: ["/api/shifts/my-shifts"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/shifts/my-shifts");
      return await response.json();
    }
  });

  // Fetch shift history for worker
  const { data: shiftHistory = [] } = useQuery({
    queryKey: ["/api/shifts/history", user?.id],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/shifts/history/${user?.id}`);
      return await response.json();
    },
    enabled: !!user?.id
  });

  // Request shift mutation
  const requestShiftMutation = useMutation({
    mutationFn: async (shiftId: number) => {
      const response = await apiRequest("POST", "/api/shifts/request", { shiftId });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shifts/my-shifts"] });
      toast({
        title: "Shift Requested",
        description: "Your shift request has been submitted successfully."
      });
    },
    onError: () => {
      toast({
        title: "Request Failed",
        description: "Failed to request shift. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Separate shifts by status
  const upcomingShifts = myShifts.filter((shift: WorkerShift) => 
    shift.status === "confirmed" && new Date(shift.date) >= new Date()
  );
  
  const requestedShifts = myShifts.filter((shift: WorkerShift) => 
    shift.status === "requested"
  );
  
  const completedShifts = [...shiftHistory, ...myShifts.filter((shift: WorkerShift) => 
    shift.status === "completed" || new Date(shift.date) < new Date()
  )];

  // Create calendar events from worker's shifts
  const calendarEvents = [
    ...upcomingShifts.map((s: any) => ({ 
      id: s.id.toString(), 
      title: `${s.title} - ${s.facilityName}`, 
      date: s.date, 
      color: 'green',
      extendedProps: { shift: s, status: 'confirmed' }
    })),
    ...requestedShifts.map((s: any) => ({ 
      id: s.id.toString(), 
      title: `Pending: ${s.title}`, 
      date: s.date, 
      color: 'orange',
      extendedProps: { shift: s, status: 'requested' }
    })),
    ...completedShifts.map(s => ({
      id: s.id.toString(),
      title: `Completed: ${s.title}`,
      date: s.date,
      color: 'blue',
      extendedProps: { shift: s, status: 'completed' }
    }))
  ];

  const handleEventClick = (info: any) => {
    setSelectedShift(info.event.extendedProps.shift);
  };

  const formatTime = (time: string) => {
    try {
      const [hours, minutes] = time.split(':');
      const date = new Date();
      date.setHours(parseInt(hours), parseInt(minutes));
      return format(date, 'h:mm a');
    } catch {
      return time;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'MMM d, yyyy');
    } catch {
      return dateString;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge variant="secondary" className="bg-gray-100 text-gray-800">Available</Badge>;
      case 'requested':
        return <Badge variant="default" className="bg-yellow-100 text-yellow-800">Requested</Badge>;
      case 'booked':
        return <Badge variant="default" className="bg-green-100 text-green-800">Scheduled</Badge>;
      case 'history':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800">Completed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical':
        return 'text-red-600';
      case 'high':
        return 'text-orange-600';
      case 'medium':
        return 'text-yellow-600';
      case 'low':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2">Loading schedule...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Schedule</h1>
          <p className="text-gray-600 dark:text-gray-400">View your upcoming and past shifts</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={activeView === 'dayGridMonth' ? 'default' : 'outline'}
            onClick={() => setActiveView('dayGridMonth')}
            size="sm"
          >
            Month
          </Button>
          <Button
            variant={activeView === 'timeGridWeek' ? 'default' : 'outline'}
            onClick={() => setActiveView('timeGridWeek')}
            size="sm"
          >
            Week
          </Button>
          <Button
            variant={activeView === 'timeGridDay' ? 'default' : 'outline'}
            onClick={() => setActiveView('timeGridDay')}
            size="sm"
          >
            Day
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Available Shifts</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{open.length}</p>
              </div>
              <Calendar className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Requested</p>
                <p className="text-2xl font-bold text-yellow-600">{requestedShifts.length}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Scheduled</p>
                <p className="text-2xl font-bold text-green-600">{upcomingShifts.length}</p>
              </div>
              <User className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Completed</p>
                <p className="text-2xl font-bold text-blue-600">{completedShifts.length}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Calendar */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Schedule Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gray-500 rounded"></div>
              <span>Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-500 rounded"></div>
              <span>Requested</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span>Scheduled</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <span>Completed</span>
            </div>
          </div>
          
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView={activeView}
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: ''
            }}
            events={calendarEvents}
            eventClick={handleEventClick}
            height="auto"
            dayMaxEvents={3}
            moreLinkClick="popover"
            eventDisplay="block"
            displayEventTime={true}
            slotMinTime="06:00:00"
            slotMaxTime="24:00:00"
            allDaySlot={false}
          />
        </CardContent>
      </Card>

      {/* Shift Details Dialog */}
      <Dialog open={!!selectedShift} onOpenChange={() => setSelectedShift(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedShift?.title}</DialogTitle>
          </DialogHeader>
          
          {selectedShift && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                {getStatusBadge(selectedShift.status)}
                <span className={`text-sm font-medium ${getUrgencyColor(selectedShift.urgency)}`}>
                  {selectedShift.urgency.toUpperCase()} Priority
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <span>{selectedShift.facilityName}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span>{selectedShift.date}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span>{selectedShift.startTime} - {selectedShift.endTime}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="h-4 w-4 text-gray-400" />
                  <span>${selectedShift.rate}/hour</span>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-sm mb-2">Department</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">{selectedShift.department}</p>
              </div>

              <div>
                <h4 className="font-medium text-sm mb-2">Specialty</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">{selectedShift.specialty}</p>
              </div>

              {selectedShift.description && (
                <div>
                  <h4 className="font-medium text-sm mb-2">Description</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{selectedShift.description}</p>
                </div>
              )}

              {selectedShift.status === 'open' && (
                <div className="pt-4 border-t">
                  <Button 
                    onClick={() => {
                      // Request shift functionality would go here
                      toast({ title: "Shift requested successfully" });
                      setSelectedShift(null);
                    }}
                    className="w-full"
                  >
                    Request This Shift
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}