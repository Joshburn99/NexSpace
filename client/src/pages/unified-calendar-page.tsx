import { useState } from "react";
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useShifts } from '@/contexts/ShiftContext';
import { useDashboard } from '@/contexts/DashboardContext';
import { useAuth } from '@/hooks/use-auth';
import { useStaff } from '@/contexts/StaffContext';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ShiftDetailsModal } from "@/components/ShiftDetailsModal";
import { CreateShiftModal } from "@/components/CreateShiftModal";
import {
  Calendar,
  Clock,
  Users,
  Building,
  Filter,
  Plus,
  DollarSign,
  MapPin,
  CheckCircle,
} from "lucide-react";

export default function UnifiedCalendarPage() {
  const { openShifts, requestedShifts, bookedShifts, requestShift } = useShifts();
  const { totalShiftsToday, openCount, requestedCount, bookedCount } = useDashboard();
  const { user, impersonatedUser } = useAuth();
  const { getStaffById } = useStaff();
  const [selectedShiftId, setSelectedShiftId] = useState<number | null>(null);
  const [selectedShift, setSelectedShift] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isShiftDetailsOpen, setIsShiftDetailsOpen] = useState(false);
  const [isShiftRequestOpen, setIsShiftRequestOpen] = useState(false);
  const [isCreateShiftOpen, setIsCreateShiftOpen] = useState(false);
  const [requestNote, setRequestNote] = useState('');

  const currentUser = impersonatedUser || user;
  const canPostShifts = currentUser?.role === 'manager' || currentUser?.role === 'admin';
  
  // Get current user's specialty from staff data
  const staffMember = currentUser ? getStaffById(currentUser.id) : null;
  const userSpecialty = staffMember?.specialty;

  // Filter shifts based on user specialty (for employees/contractors)
  const filteredOpenShifts = canPostShifts ? openShifts : 
    openShifts.filter(shift => {
      const shiftRequirements = shift.requirements || ['General'];
      return !userSpecialty || shiftRequirements.includes(userSpecialty) || shiftRequirements.includes('General');
    });

  const filteredRequestedShifts = canPostShifts ? requestedShifts :
    requestedShifts.filter(shift => shift.requestedBy === currentUser?.id);

  const filteredBookedShifts = canPostShifts ? bookedShifts :
    bookedShifts.filter(shift => shift.assignedTo === currentUser?.id);

  // Convert shifts to FullCalendar events with better visuals
  const events = [
    ...filteredOpenShifts.map(shift => ({
      id: `open-${shift.id}`,
      title: `🟦 ${shift.title}`,
      start: `${shift.date}T${shift.startTime || '07:00'}`,
      end: `${shift.date}T${shift.endTime || '19:00'}`,
      backgroundColor: '#3B82F6',
      borderColor: '#1D4ED8',
      textColor: '#FFFFFF',
      classNames: ['shift-open'],
      extendedProps: {
        type: 'open',
        shift: {
          ...shift,
          hourlyRate: shift.hourlyRate || 35,
          department: shift.department || 'General',
          requirements: shift.requirements || []
        },
      }
    })),
    ...filteredRequestedShifts.map(shift => ({
      id: `requested-${shift.id}`,
      title: `🟨 ${shift.title}`,
      start: `${shift.date}T${shift.startTime || '07:00'}`,
      end: `${shift.date}T${shift.endTime || '19:00'}`,
      backgroundColor: '#F59E0B',
      borderColor: '#D97706',
      textColor: '#FFFFFF',
      classNames: ['shift-requested'],
      extendedProps: {
        type: 'requested',
        shift: {
          ...shift,
          hourlyRate: shift.hourlyRate || 35,
          department: shift.department || 'General',
          requirements: shift.requirements || []
        },
      }
    })),
    ...filteredBookedShifts.map(shift => ({
      id: `booked-${shift.id}`,
      title: `🟩 ${shift.title}`,
      start: `${shift.date}T${shift.startTime || '07:00'}`,
      end: `${shift.date}T${shift.endTime || '19:00'}`,
      backgroundColor: '#10B981',
      borderColor: '#059669',
      textColor: '#FFFFFF',
      classNames: ['shift-booked'],
      extendedProps: {
        type: 'booked',
        shift: {
          ...shift,
          hourlyRate: shift.hourlyRate || 35,
          department: shift.department || 'General',
          requirements: shift.requirements || []
        },
      }
    }))
  ];

  const handleEventClick = (info: any) => {
    const shift = info.event.extendedProps.shift;
    const shiftType = info.event.extendedProps.type;
    
    setSelectedShift(shift);
    
    // Workers can only request open shifts
    if (!canPostShifts && shiftType === 'open') {
      setIsShiftRequestOpen(true);
    } else {
      setSelectedShiftId(shift.id);
      setIsShiftDetailsOpen(true);
    }
  };

  const handleDateClick = (info: any) => {
    if (canPostShifts) {
      setSelectedDate(info.dateStr);
      setIsCreateShiftOpen(true);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {canPostShifts ? 'Schedule Management' : 'My Schedule'}
        </h1>
        {canPostShifts && (
          <Button 
            className="bg-blue-600 hover:bg-blue-700"
            onClick={() => setIsCreateShiftOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Shift
          </Button>
        )}
      </div>

      {/* Dashboard Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Today
              </span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {totalShiftsToday}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">shifts scheduled</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Building className="h-5 w-5 text-gray-600" />
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Open Shifts
              </span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {filteredOpenShifts.length}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {canPostShifts ? 'need coverage' : 'available for you'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-600" />
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Requested
              </span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {filteredRequestedShifts.length}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {canPostShifts ? 'pending assignment' : 'my requests'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Booked
              </span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {filteredBookedShifts.length}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {canPostShifts ? 'fully staffed' : 'my shifts'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Legend */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">🟦 Open Shifts (Click to request)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-orange-500 rounded"></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">🟨 My Requests</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">🟩 Confirmed Shifts</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Shift Calendar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            events={events}
            eventClick={handleEventClick}
            dateClick={handleDateClick}
            height="auto"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'timeGridWeek,dayGridMonth'
            }}
            slotMinTime="06:00:00"
            slotMaxTime="22:00:00"
            allDaySlot={false}
            eventDisplay="block"
            eventMinHeight={50}
            eventClassNames={(arg) => {
              const type = arg.event.extendedProps.type;
              return [
                'cursor-pointer',
                'hover:opacity-80',
                type === 'requested' ? 'hover:ring-2 hover:ring-orange-300' : ''
              ];
            }}
            eventDidMount={(info) => {
              const type = info.event.extendedProps.type;
              info.el.title = `Click to view ${info.event.title} details`;
              if (type === 'requested') {
                info.el.style.cursor = 'pointer';
              }
            }}
          />
        </CardContent>
      </Card>

      {/* Shift Details Modal */}
      <ShiftDetailsModal
        shiftId={selectedShiftId}
        isOpen={isShiftDetailsOpen}
        onClose={() => {
          setIsShiftDetailsOpen(false);
          setSelectedShiftId(null);
        }}
      />

      {/* Create Shift Modal */}
      <CreateShiftModal
        date={selectedDate}
        isOpen={isCreateShiftOpen}
        onClose={() => {
          setIsCreateShiftOpen(false);
          setSelectedDate(null);
        }}
      />

      {/* Shift Request Modal for Workers */}
      <Dialog open={isShiftRequestOpen} onOpenChange={setIsShiftRequestOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-blue-600" />
              Request Shift
            </DialogTitle>
          </DialogHeader>
          
          {selectedShift && (
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h3 className="font-semibold text-blue-900 mb-2">{selectedShift.title}</h3>
                
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    <span>{selectedShift.date}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-blue-600" />
                    <span>{selectedShift.startTime || '7:00 AM'} - {selectedShift.endTime || '7:00 PM'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-blue-600" />
                    <span>{selectedShift.department}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-green-600" />
                    <span className="font-semibold text-green-700">${selectedShift.hourlyRate || 35}/hr</span>
                  </div>
                </div>

                {selectedShift.requirements && selectedShift.requirements.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs text-gray-600 mb-1">Requirements:</p>
                    <div className="flex flex-wrap gap-1">
                      {selectedShift.requirements.map((req: string, index: number) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {req}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <Label htmlFor="request-note">Note (Optional)</Label>
                  <Textarea
                    id="request-note"
                    value={requestNote}
                    onChange={(e) => setRequestNote(e.target.value)}
                    placeholder="Add any relevant information about your availability or qualifications..."
                    className="resize-none"
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={() => {
                    if (selectedShift && currentUser) {
                      // Submit shift request
                      requestShift?.(selectedShift.id);
                      setIsShiftRequestOpen(false);
                      setRequestNote('');
                    }
                  }}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  Request This Shift
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsShiftRequestOpen(false);
                    setRequestNote('');
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}