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
};

type TimeClockContextType = {
  currentIn: string | null;
  logs: WorkLog[];
  clockIn: () => void;
  clockOut: (breakMin: number) => void;
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

  const clockOut = (breakDuration: number) => {
    if (!currentIn || !currentUser) return;
    
    const out = new Date().toISOString();
    const start = new Date(currentIn).getTime();
    const end = new Date(out).getTime();
    const hours = (end - start) / 3600000 - (breakDuration / 60);
    const rate = (currentUser as any).rate ?? 25; // Default rate if not set
    const earnings = parseFloat((hours * rate).toFixed(2));
    
    const newLog: WorkLog = {
      id: Date.now().toString(),
      userId: currentUser.id.toString(),
      clockIn: currentIn,
      clockOut: out,
      breakDuration,
      rate,
      earnings
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