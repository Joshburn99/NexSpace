import React, { createContext, useContext, ReactNode } from 'react';
import { useShifts } from '@/contexts/ShiftContext';
import { useTimeClocks } from '@/contexts/TimeClockContext';

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
  const { currentIn, logs } = useTimeClocks();
  
  const today = new Date().toISOString().slice(0, 10);
  
  // Filter shifts for today
  const todayOpenShifts = openShifts.filter(shift => shift.date && shift.date.startsWith(today));
  const todayRequestedShifts = requestedShifts.filter(shift => shift.date && shift.date.startsWith(today));
  const todayBookedShifts = bookedShifts.filter(shift => shift.date && shift.date.startsWith(today));
  const todayCompletedShifts = completedShifts.filter(shift => shift.date && shift.date.startsWith(today));
  
  // Calculate total hours from work logs for today
  const todayLogs = logs.filter(log => log.clockIn.startsWith(today));
  const totalHoursToday = todayLogs.reduce((sum: number, log) => {
    const hours = (new Date(log.clockOut).getTime() - new Date(log.clockIn).getTime()) / 3600000;
    return sum + hours;
  }, 0);
  
  // Count active staff (currently clocked in)
  const activeStaff = currentIn ? 1 : 0;
  
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