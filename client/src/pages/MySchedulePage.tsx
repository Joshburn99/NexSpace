import React, { useState } from "react";
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar, Clock, MapPin, DollarSign, User, AlertCircle } from "lucide-react";
import { useShifts, type Shift } from "@/contexts/ShiftContext";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

export default function MySchedulePage() {
  const { user } = useAuth();
  const { open, requested, booked, history, requestShift, isLoading } = useShifts();
  const { toast } = useToast();
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);

  // Create calendar events from all shift categories
  const events = [
    ...open.map(s => ({ 
      id: s.id, 
      title: `Open: ${s.facilityName}`, 
      date: s.date, 
      color: 'gray',
      extendedProps: { shift: s, status: 'open' }
    })),
    ...requested.map(s => ({ 
      id: s.id, 
      title: `Requested`, 
      date: s.date, 
      color: 'orange',
      extendedProps: { shift: s, status: 'requested' }
    })),
    ...booked.map(s => ({ 
      id: s.id, 
      title: `Booked`, 
      date: s.date, 
      color: 'green',
      extendedProps: { shift: s, status: 'booked' }
    })),
    ...history.map(s => ({
      id: s.id,
      title: `Past: ${s.facilityName}`,
      date: s.date,
      color: 'blue',
      extendedProps: { shift: s, status: 'history' }
    }))
  ];

  const handleEventClick = (info: any) => {
    setSelectedShift(info.event.extendedProps.shift);
  };

  const handleShiftRequest = async (shiftId: number) => {
    if (!user) return;
    
    try {
      await requestShift(shiftId);
      toast({
        title: "Shift Requested",
        description: "Your shift request has been submitted successfully."
      });
      setSelectedShift(null);
    } catch (error) {
      toast({
        title: "Request Failed",
        description: "Failed to request shift. Please try again.",
        variant: "destructive"
      });
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
                <p className="text-2xl font-bold text-yellow-600">{requested.length}</p>
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
                <p className="text-2xl font-bold text-green-600">{booked.length}</p>
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
                <p className="text-2xl font-bold text-blue-600">{history.length}</p>
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

              {selectedShift.specialRequirements.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm mb-2">Requirements</h4>
                  <div className="flex flex-wrap gap-1">
                    {selectedShift.specialRequirements.map((req, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {req}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {selectedShift.status === 'open' && (
                <div className="pt-4 border-t">
                  <Button 
                    onClick={() => handleShiftRequest(selectedShift.id)}
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