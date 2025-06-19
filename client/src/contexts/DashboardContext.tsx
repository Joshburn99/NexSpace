import React, { createContext, useContext, ReactNode } from 'react';
import { useShifts } from '@/contexts/ShiftContext';
import { useTimeClock } from '@/contexts/TimeClockContext';

export interface DashboardData {
  totalShiftsToday: number;
  openCount: number;
  requestedCount: number;
  bookedCount: number;
  totalHoursToday: number;
  activeStaff: number;
  pendingRequests: number;
  completedShiftsToday: number;
}

const DashboardContext = createContext<DashboardData | null>(null);

export const DashboardProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { openShifts, requestedShifts, bookedShifts, completedShifts } = useShifts();
  const { timeClocks, summaries } = useTimeClock();
  
  const today = new Date().toISOString().slice(0, 10);
  
  // Filter shifts for today
  const todayOpenShifts = openShifts.filter(shift => shift.date && shift.date.startsWith(today));
  const todayRequestedShifts = requestedShifts.filter(shift => shift.date && shift.date.startsWith(today));
  const todayBookedShifts = bookedShifts.filter(shift => shift.date && shift.date.startsWith(today));
  const todayCompletedShifts = completedShifts.filter(shift => shift.date && shift.date.startsWith(today));
  
  // Calculate total hours from time clock data
  const todayTimeClocks = timeClocks.filter(tc => tc.createdAt && tc.createdAt.startsWith(today));
  const totalHoursToday = todayTimeClocks.reduce((sum, tc) => sum + (tc.regularHours || 0) + (tc.overtimeHours || 0), 0);
  
  // Count active staff (currently clocked in)
  const activeStaff = timeClocks.filter(tc => tc.clockOutTime === null).length;
  
  const dashboardData: DashboardData = {
    totalShiftsToday: todayOpenShifts.length + todayRequestedShifts.length + todayBookedShifts.length,
    openCount: todayOpenShifts.length,
    requestedCount: todayRequestedShifts.length,
    bookedCount: todayBookedShifts.length,
    totalHoursToday,
    activeStaff,
    pendingRequests: requestedShifts.length,
    completedShiftsToday: todayCompletedShifts.length,
  };

  return (
    <DashboardContext.Provider value={dashboardData}>
      {children}
    </DashboardContext.Provider>
  );
};

export const useDashboard = (): DashboardData => {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
};