import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type ClockAction = "in" | "out" | "break_start" | "break_end";

export interface TimeClock {
  id: number;
  userId: number;
  userName: string;
  userRole: string;
  facilityId: number;
  facilityName: string;
  timestamp: string;
  action: ClockAction;
  location?: string;
  notes?: string;
  shiftId?: number;
  ipAddress?: string;
  deviceId?: string;
}

export interface TimeClockSummary {
  userId: number;
  userName: string;
  date: string;
  clockIn?: string;
  clockOut?: string;
  breakStart?: string;
  breakEnd?: string;
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
  breakMinutes: number;
  status: "present" | "absent" | "late" | "early_out" | "active";
}

interface TimeClockContextType {
  timeClocks: TimeClock[];
  summaries: TimeClockSummary[];
  isLoading: boolean;
  clockIn: (userId: number, shiftId?: number, notes?: string) => void;
  clockOut: (userId: number, notes?: string) => void;
  startBreak: (userId: number, notes?: string) => void;
  endBreak: (userId: number, notes?: string) => void;
  getActiveUsers: () => TimeClock[];
  getUserClockHistory: (userId: number, days?: number) => TimeClock[];
}

const TimeClockContext = createContext<TimeClockContextType | null>(null);

// Sample time clock data for 100-bed facility
const sampleTimeClocks: TimeClock[] = [
  // Today's active clocks
  {
    id: 1,
    userId: 1,
    userName: "Sarah Johnson",
    userRole: "RN",
    facilityId: 1,
    facilityName: "Sunrise Senior Living",
    timestamp: "2025-06-19T06:45:00Z",
    action: "in",
    location: "Main Entrance",
    shiftId: 1,
    ipAddress: "192.168.1.100",
    deviceId: "tablet-001"
  },
  {
    id: 2,
    userId: 2,
    userName: "Michael Chen",
    userRole: "CNA",
    facilityId: 1,
    facilityName: "Sunrise Senior Living",
    timestamp: "2025-06-19T06:55:00Z",
    action: "in",
    location: "Staff Entrance",
    shiftId: 2,
    ipAddress: "192.168.1.101",
    deviceId: "tablet-002"
  },
  {
    id: 3,
    userId: 3,
    userName: "Emily Rodriguez",
    userRole: "LPN",
    facilityId: 1,
    facilityName: "Sunrise Senior Living",
    timestamp: "2025-06-19T07:00:00Z",
    action: "in",
    location: "Main Entrance",
    shiftId: 3,
    ipAddress: "192.168.1.102",
    deviceId: "tablet-001"
  },
  {
    id: 4,
    userId: 4,
    userName: "David Thompson",
    userRole: "PT",
    facilityId: 1,
    facilityName: "Sunrise Senior Living",
    timestamp: "2025-06-19T08:00:00Z",
    action: "in",
    location: "Therapy Wing",
    shiftId: 4,
    ipAddress: "192.168.1.103",
    deviceId: "tablet-003"
  },
  {
    id: 5,
    userId: 5,
    userName: "Lisa Wang",
    userRole: "OT",
    facilityId: 1,
    facilityName: "Sunrise Senior Living",
    timestamp: "2025-06-19T08:30:00Z",
    action: "in",
    location: "Therapy Wing",
    shiftId: 5,
    ipAddress: "192.168.1.104",
    deviceId: "tablet-003"
  },
  // Break activities
  {
    id: 6,
    userId: 1,
    userName: "Sarah Johnson",
    userRole: "RN",
    facilityId: 1,
    facilityName: "Sunrise Senior Living",
    timestamp: "2025-06-19T10:30:00Z",
    action: "break_start",
    location: "Break Room",
    ipAddress: "192.168.1.100",
    deviceId: "tablet-001"
  },
  {
    id: 7,
    userId: 1,
    userName: "Sarah Johnson",
    userRole: "RN",
    facilityId: 1,
    facilityName: "Sunrise Senior Living",
    timestamp: "2025-06-19T10:45:00Z",
    action: "break_end",
    location: "Break Room",
    ipAddress: "192.168.1.100",
    deviceId: "tablet-001"
  },
  // Yesterday's completed shifts
  {
    id: 8,
    userId: 6,
    userName: "Robert Kim",
    userRole: "RN",
    facilityId: 1,
    facilityName: "Sunrise Senior Living",
    timestamp: "2025-06-18T06:00:00Z",
    action: "in",
    location: "Main Entrance",
    shiftId: 6,
    ipAddress: "192.168.1.105",
    deviceId: "tablet-001"
  },
  {
    id: 9,
    userId: 6,
    userName: "Robert Kim",
    userRole: "RN",
    facilityId: 1,
    facilityName: "Sunrise Senior Living",
    timestamp: "2025-06-18T18:15:00Z",
    action: "out",
    location: "Main Entrance",
    notes: "End of shift",
    ipAddress: "192.168.1.105",
    deviceId: "tablet-001"
  },
  {
    id: 10,
    userId: 7,
    userName: "Amanda Foster",
    userRole: "CNA",
    facilityId: 1,
    facilityName: "Sunrise Senior Living",
    timestamp: "2025-06-18T14:00:00Z",
    action: "in",
    location: "Staff Entrance",
    shiftId: 7,
    ipAddress: "192.168.1.106",
    deviceId: "tablet-002"
  },
  {
    id: 11,
    userId: 7,
    userName: "Amanda Foster",
    userRole: "CNA",
    facilityId: 1,
    facilityName: "Sunrise Senior Living",
    timestamp: "2025-06-18T22:05:00Z",
    action: "out",
    location: "Staff Entrance",
    notes: "End of evening shift",
    ipAddress: "192.168.1.106",
    deviceId: "tablet-002"
  }
];

// Generate time clock summaries
const generateSummaries = (clocks: TimeClock[]): TimeClockSummary[] => {
  const summaryMap = new Map<string, TimeClockSummary>();
  
  clocks.forEach(clock => {
    const date = clock.timestamp.split('T')[0];
    const key = `${clock.userId}-${date}`;
    
    if (!summaryMap.has(key)) {
      summaryMap.set(key, {
        userId: clock.userId,
        userName: clock.userName,
        date,
        totalHours: 0,
        regularHours: 0,
        overtimeHours: 0,
        breakMinutes: 0,
        status: "absent"
      });
    }
    
    const summary = summaryMap.get(key)!;
    
    switch (clock.action) {
      case "in":
        summary.clockIn = clock.timestamp;
        summary.status = "present";
        break;
      case "out":
        summary.clockOut = clock.timestamp;
        break;
      case "break_start":
        summary.breakStart = clock.timestamp;
        break;
      case "break_end":
        summary.breakEnd = clock.timestamp;
        break;
    }
  });

  // Calculate hours for completed shifts
  Array.from(summaryMap.values()).forEach(summary => {
    if (summary.clockIn && summary.clockOut) {
      const clockInTime = new Date(summary.clockIn).getTime();
      const clockOutTime = new Date(summary.clockOut).getTime();
      const totalMs = clockOutTime - clockInTime;
      
      // Calculate break time
      let breakMs = 0;
      if (summary.breakStart && summary.breakEnd) {
        const breakStartTime = new Date(summary.breakStart).getTime();
        const breakEndTime = new Date(summary.breakEnd).getTime();
        breakMs = breakEndTime - breakStartTime;
        summary.breakMinutes = breakMs / (1000 * 60);
      }
      
      const workMs = totalMs - breakMs;
      summary.totalHours = workMs / (1000 * 60 * 60);
      summary.regularHours = Math.min(summary.totalHours, 8);
      summary.overtimeHours = Math.max(summary.totalHours - 8, 0);
    } else if (summary.clockIn) {
      summary.status = "active";
    }
  });

  return Array.from(summaryMap.values()).sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );
};

export const TimeClockProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [timeClocks, setTimeClocks] = useState<TimeClock[]>(sampleTimeClocks);
  const [summaries, setSummaries] = useState<TimeClockSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setSummaries(generateSummaries(timeClocks));
  }, [timeClocks]);

  const clockIn = (userId: number, shiftId?: number, notes?: string) => {
    const newClock: TimeClock = {
      id: timeClocks.length + 1,
      userId,
      userName: `User ${userId}`,
      userRole: "Staff",
      facilityId: 1,
      facilityName: "Sunrise Senior Living",
      timestamp: new Date().toISOString(),
      action: "in",
      location: "Main Entrance",
      shiftId,
      notes,
      ipAddress: "192.168.1.100",
      deviceId: "tablet-001"
    };
    
    setTimeClocks(prev => [...prev, newClock]);
  };

  const clockOut = (userId: number, notes?: string) => {
    const newClock: TimeClock = {
      id: timeClocks.length + 1,
      userId,
      userName: `User ${userId}`,
      userRole: "Staff",
      facilityId: 1,
      facilityName: "Sunrise Senior Living",
      timestamp: new Date().toISOString(),
      action: "out",
      location: "Main Entrance",
      notes,
      ipAddress: "192.168.1.100",
      deviceId: "tablet-001"
    };
    
    setTimeClocks(prev => [...prev, newClock]);
  };

  const startBreak = (userId: number, notes?: string) => {
    const newClock: TimeClock = {
      id: timeClocks.length + 1,
      userId,
      userName: `User ${userId}`,
      userRole: "Staff",
      facilityId: 1,
      facilityName: "Sunrise Senior Living",
      timestamp: new Date().toISOString(),
      action: "break_start",
      location: "Break Room",
      notes,
      ipAddress: "192.168.1.100",
      deviceId: "tablet-001"
    };
    
    setTimeClocks(prev => [...prev, newClock]);
  };

  const endBreak = (userId: number, notes?: string) => {
    const newClock: TimeClock = {
      id: timeClocks.length + 1,
      userId,
      userName: `User ${userId}`,
      userRole: "Staff",
      facilityId: 1,
      facilityName: "Sunrise Senior Living",
      timestamp: new Date().toISOString(),
      action: "break_end",
      location: "Break Room",
      notes,
      ipAddress: "192.168.1.100",
      deviceId: "tablet-001"
    };
    
    setTimeClocks(prev => [...prev, newClock]);
  };

  const getActiveUsers = (): TimeClock[] => {
    const today = new Date().toISOString().split('T')[0];
    const todayClocks = timeClocks.filter(clock => 
      clock.timestamp.startsWith(today)
    );
    
    const activeUsers: TimeClock[] = [];
    const userLastAction = new Map<number, TimeClock>();
    
    todayClocks.forEach(clock => {
      const lastAction = userLastAction.get(clock.userId);
      if (!lastAction || new Date(clock.timestamp) > new Date(lastAction.timestamp)) {
        userLastAction.set(clock.userId, clock);
      }
    });
    
    userLastAction.forEach(lastClock => {
      if (lastClock.action === "in" || lastClock.action === "break_end") {
        activeUsers.push(lastClock);
      }
    });
    
    return activeUsers;
  };

  const getUserClockHistory = (userId: number, days: number = 7): TimeClock[] => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return timeClocks
      .filter(clock => 
        clock.userId === userId && 
        new Date(clock.timestamp) >= cutoffDate
      )
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  };

  const value: TimeClockContextType = {
    timeClocks,
    summaries,
    isLoading,
    clockIn,
    clockOut,
    startBreak,
    endBreak,
    getActiveUsers,
    getUserClockHistory
  };

  return (
    <TimeClockContext.Provider value={value}>
      {children}
    </TimeClockContext.Provider>
  );
};

export const useTimeClock = (): TimeClockContextType => {
  const context = useContext(TimeClockContext);
  if (!context) {
    throw new Error('useTimeClock must be used within a TimeClockProvider');
  }
  return context;
};