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
    } else {
      // Add some sample logs for testing scrolling functionality
      const sampleLogs: WorkLog[] = [
        {
          id: '1',
          userId: '3',
          clockIn: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
          clockOut: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
          breakDuration: 30,
          rate: 25,
          earnings: 162.50,
          notes: 'Completed patient rounds and medication administration',
          supervisorName: 'Dr. Sarah Johnson',
          supervisorSignature: 'Dr. Sarah Johnson',
          adjustedTimes: false
        },
        {
          id: '2',
          userId: '3',
          clockIn: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          clockOut: new Date(Date.now() - 16 * 60 * 60 * 1000).toISOString(),
          breakDuration: 45,
          rate: 25,
          earnings: 181.25,
          notes: 'Emergency shift - handled multiple critical patients',
          adjustedTimes: true
        },
        {
          id: '3',
          userId: '3',
          clockIn: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
          clockOut: new Date(Date.now() - 40 * 60 * 60 * 1000).toISOString(),
          breakDuration: 0,
          rate: 25,
          earnings: 200.00,
          supervisorName: 'Nurse Manager Lisa',
          supervisorSignature: 'Lisa Rodriguez'
        },
        {
          id: '4',
          userId: '3',
          clockIn: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
          clockOut: new Date(Date.now() - 66 * 60 * 60 * 1000).toISOString(),
          breakDuration: 15,
          rate: 25,
          earnings: 143.75,
          notes: 'Training session with new equipment'
        },
        {
          id: '5',
          userId: '3',
          clockIn: new Date(Date.now() - 96 * 60 * 60 * 1000).toISOString(),
          clockOut: new Date(Date.now() - 88 * 60 * 60 * 1000).toISOString(),
          breakDuration: 30,
          rate: 25,
          earnings: 175.00,
          notes: 'Weekend shift with overtime approval',
          supervisorName: 'Head Nurse Patricia',
          supervisorSignature: 'Patricia Williams',
          adjustedTimes: true
        }
      ];
      setLogs(sampleLogs);
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