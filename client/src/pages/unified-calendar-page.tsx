import { useState } from "react";
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useShifts } from '@/contexts/ShiftContext';
import { useDashboard } from '@/contexts/DashboardContext';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShiftDetailsModal } from "@/components/ShiftDetailsModal";
import { CreateShiftModal } from "@/components/CreateShiftModal";
import {
  Calendar,
  Clock,
  Users,
  Building,
  Filter,
  Plus,
} from "lucide-react";

export default function UnifiedCalendarPage() {
  const { openShifts, requestedShifts, bookedShifts } = useShifts();
  const { totalShiftsToday, openCount, requestedCount, bookedCount } = useDashboard();
  const [selectedShiftId, setSelectedShiftId] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isShiftDetailsOpen, setIsShiftDetailsOpen] = useState(false);
  const [isCreateShiftOpen, setIsCreateShiftOpen] = useState(false);

  // Convert shifts to FullCalendar events
  const events = [
    ...openShifts.map(shift => ({
      id: `open-${shift.id}`,
      title: `Open: ${shift.title}`,
      date: shift.date,
      color: '#6B7280', // gray
      extendedProps: {
        type: 'open',
        shift,
      }
    })),
    ...requestedShifts.map(shift => ({
      id: `requested-${shift.id}`,
      title: `Requested: ${shift.title}`,
      date: shift.date,
      color: '#F59E0B', // orange
      extendedProps: {
        type: 'requested',
        shift,
      }
    })),
    ...bookedShifts.map(shift => ({
      id: `booked-${shift.id}`,
      title: `Booked: ${shift.title}`,
      date: shift.date,
      color: '#10B981', // green
      extendedProps: {
        type: 'booked',
        shift,
      }
    }))
  ];

  const handleEventClick = (info: any) => {
    const { type, shift } = info.event.extendedProps;
    
    if (type === 'requested') {
      setSelectedShiftId(shift.id);
      setIsAssignModalOpen(true);
    }
  };

  const handleDateClick = (info: any) => {
    // Could add new shift creation functionality here
    console.log('Date clicked:', info.dateStr);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Unified Calendar
        </h1>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          New Shift
        </Button>
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
                {openCount}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">need coverage</p>
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
                {requestedCount}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">pending assignment</p>
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
                {bookedCount}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">fully staffed</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Legend */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gray-500 rounded"></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">Open Shifts</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-orange-500 rounded"></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Requested (Click to assign)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">Booked</span>
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
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            events={events}
            eventClick={handleEventClick}
            dateClick={handleDateClick}
            height="auto"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,dayGridWeek'
            }}
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
              if (type === 'requested') {
                info.el.title = 'Click to assign staff to this shift';
              }
            }}
          />
        </CardContent>
      </Card>

      {/* Assign Staff Modal */}
      <AssignStaffModal
        shiftId={selectedShiftId}
        isOpen={isAssignModalOpen}
        onClose={() => {
          setIsAssignModalOpen(false);
          setSelectedShiftId(null);
        }}
      />
    </div>
  );
}