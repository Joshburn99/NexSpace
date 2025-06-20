import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";

export type WorkLog = {
  id: string;
  userId: string;
  clockIn: string;
  clockOut: string;
  breakDuration: number; // in minutes
  rate: number;           // per hour
  earnings: number;
  notes?: string;
  supervisorName?: string;
  supervisorSignature?: string;
  adjustedTimes?: boolean; // flag to indicate if times were manually adjusted
};

type TimeClockContextType = {
  currentIn: string | null;
  logs: WorkLog[];
  clockIn: () => void;
  clockOut: (workLogData: {
    clockInTime: string;
    clockOutTime: string;
    breakDuration: number;
    notes?: string;
    supervisorName?: string;
    supervisorSignature?: string;
  }) => void;
};

const TimeClockContext = createContext<TimeClockContextType | null>(null);

export const TimeClockProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user: currentUser } = useAuth();
  const [currentIn, setCurrentIn] = useState<string | null>(null);
  const [logs, setLogs] = useState<WorkLog[]>([]);

  // Load saved state from localStorage
  useEffect(() => {
    const savedCurrentIn = localStorage.getItem('nexspace-current-clock-in');
    const savedLogs = localStorage.getItem('nexspace-work-logs');
    
    if (savedCurrentIn) {
      setCurrentIn(savedCurrentIn);
    }
    
    if (savedLogs) {
      try {
        setLogs(JSON.parse(savedLogs));
      } catch (error) {
        console.error('Error parsing saved work logs:', error);
      }
    }
  }, []);

  // Save state to localStorage
  useEffect(() => {
    if (currentIn) {
      localStorage.setItem('nexspace-current-clock-in', currentIn);
    } else {
      localStorage.removeItem('nexspace-current-clock-in');
    }
  }, [currentIn]);

  useEffect(() => {
    localStorage.setItem('nexspace-work-logs', JSON.stringify(logs));
  }, [logs]);

  const clockIn = () => {
    setCurrentIn(new Date().toISOString());
  };

  const clockOut = (workLogData: {
    clockInTime: string;
    clockOutTime: string;
    breakDuration: number;
    notes?: string;
    supervisorName?: string;
    supervisorSignature?: string;
  }) => {
    if (!currentIn || !currentUser) return;
    
    const start = new Date(workLogData.clockInTime).getTime();
    const end = new Date(workLogData.clockOutTime).getTime();
    const totalHours = (end - start) / 3600000;
    const workHours = totalHours - (workLogData.breakDuration / 60);
    const rate = (currentUser as any).rate ?? 25;
    const earnings = parseFloat((workHours * rate).toFixed(2));
    
    // Check if times were adjusted from original
    const originalClockIn = new Date(currentIn);
    const adjustedClockIn = new Date(workLogData.clockInTime);
    const adjustedTimes = Math.abs(originalClockIn.getTime() - adjustedClockIn.getTime()) > 60000; // 1 minute tolerance
    
    const newLog: WorkLog = {
      id: Date.now().toString(),
      userId: currentUser.id.toString(),
      clockIn: workLogData.clockInTime,
      clockOut: workLogData.clockOutTime,
      breakDuration: workLogData.breakDuration,
      rate,
      earnings,
      notes: workLogData.notes,
      supervisorName: workLogData.supervisorName,
      supervisorSignature: workLogData.supervisorSignature,
      adjustedTimes
    };
    
    setLogs(prev => [newLog, ...prev]);
    setCurrentIn(null);
  };

  const value: TimeClockContextType = {
    currentIn,
    logs,
    clockIn,
    clockOut
  };

  return (
    <TimeClockContext.Provider value={value}>
      {children}
    </TimeClockContext.Provider>
  );
};

export const useTimeClocks = () => {
  const ctx = useContext(TimeClockContext);
  if (!ctx) throw new Error('Must be inside TimeClockProvider');
  return ctx;
};