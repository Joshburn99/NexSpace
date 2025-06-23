import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import ShiftCalendarCell from './ShiftCalendarCell';
import ShiftDetailModal from './ShiftDetailModal';
import { useShiftManagement } from '../hooks/useShiftManagement';
import { mockFacilities } from '../data';
import { addDays, formatDate } from '../utils';

const ShiftCalendar: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedShift, setSelectedShift] = useState<string | null>(null);
  
  const {
    getShiftWithStaffing,
    getShiftsForDate,
    assignWorker,
    unassignWorker,
    getDashboardStats
  } = useShiftManagement();

  // Get current week dates
  const weekDates = useMemo(() => {
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day; // Adjust to Sunday
    startOfWeek.setDate(diff);
    
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      return date.toISOString().split('T')[0];
    });
  }, [currentDate]);

  // Get shifts for each day of the week
  const weeklyShifts = useMemo(() => {
    return weekDates.map(date => ({
      date,
      shifts: getShiftsForDate(date)
    }));
  }, [weekDates, getShiftsForDate]);

  const selectedShiftData = useMemo(() => {
    if (!selectedShift) return null;
    return getShiftWithStaffing(selectedShift);
  }, [selectedShift, getShiftWithStaffing]);

  const selectedFacility = useMemo(() => {
    if (!selectedShiftData?.shift) return null;
    return mockFacilities.find(f => f.id === selectedShiftData.shift.facilityId) || null;
  }, [selectedShiftData]);

  const dashboardStats = getDashboardStats;

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7));
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
      console.error('Failed to assign worker:', error);
      // In a real app, you'd show a toast notification here
    }
  };

  const handleUnassignWorker = async (shiftId: string, workerId: string) => {
    try {
      await unassignWorker(shiftId, workerId);
    } catch (error) {
      console.error('Failed to unassign worker:', error);
      // In a real app, you'd show a toast notification here
    }
  };

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return (
    <div className="space-y-6">
      {/* Dashboard Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Shifts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats.totalShifts}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Open Shifts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {dashboardStats.openShifts}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Fill Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {dashboardStats.fillRate}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {dashboardStats.pendingRequests}
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
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateWeek('prev')}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateWeek('next')}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-4">
            {/* Day Headers */}
            {dayNames.map((dayName, index) => {
              const date = weekDates[index];
              const isToday = date === new Date().toISOString().split('T')[0];
              
              return (
                <div key={dayName} className="text-center">
                  <div className={`font-medium ${isToday ? 'text-blue-600' : 'text-muted-foreground'}`}>
                    {dayName}
                  </div>
                  <div className={`text-lg font-bold ${isToday ? 'text-blue-600' : ''}`}>
                    {new Date(date).getDate()}
                  </div>
                </div>
              );
            })}

            {/* Calendar Cells with Shifts */}
            {weeklyShifts.map(({ date, shifts }) => {
              const isToday = date === new Date().toISOString().split('T')[0];
              
              return (
                <div
                  key={date}
                  className={`min-h-[200px] border rounded-lg p-2 space-y-2 ${
                    isToday ? 'bg-blue-50 border-blue-200' : 'bg-gray-50'
                  }`}
                >
                  {shifts.length === 0 ? (
                    <div className="text-center text-muted-foreground text-sm py-8">
                      No shifts scheduled
                    </div>
                  ) : (
                    shifts.map(shiftData => {
                      if (!shiftData) return null;
                      
                      return (
                        <ShiftCalendarCell
                          key={shiftData.shift.id}
                          shift={shiftData.shift}
                          assignedWorkers={shiftData.assignedWorkers}
                          requestedWorkers={shiftData.requestedWorkers}
                          onShiftClick={() => handleShiftClick(shiftData.shift.id)}
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