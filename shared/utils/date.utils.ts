// Date and Time Utilities
// Common date/time functions to reduce code duplication

import { format, parse, addDays, subDays, startOfWeek, endOfWeek, isAfter, isBefore, differenceInHours } from 'date-fns';

// Format date for display
export const formatDate = (date: Date | string, formatStr: string = 'MMM dd, yyyy'): string => {
  return format(new Date(date), formatStr);
};

// Format time for display
export const formatTime = (time: string, format24Hour: boolean = false): string => {
  if (!time) return '';
  const [hour, minute] = time.split(':');
  const hourNum = parseInt(hour);
  
  if (format24Hour) {
    return `${hour}:${minute}`;
  }
  
  const period = hourNum >= 12 ? 'PM' : 'AM';
  const displayHour = hourNum === 0 ? 12 : hourNum > 12 ? hourNum - 12 : hourNum;
  return `${displayHour}:${minute} ${period}`;
};

// Convert 12-hour time to 24-hour format
export const to24HourFormat = (time12: string): string => {
  const [time, period] = time12.split(' ');
  const [hours, minutes] = time.split(':');
  let hour = parseInt(hours);
  
  if (period === 'PM' && hour !== 12) hour += 12;
  if (period === 'AM' && hour === 12) hour = 0;
  
  return `${hour.toString().padStart(2, '0')}:${minutes}`;
};

// Calculate shift duration in hours
export const calculateShiftDuration = (startTime: string, endTime: string): number => {
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  
  let duration = (endHour - startHour) + (endMin - startMin) / 60;
  
  // Handle overnight shifts
  if (duration < 0) {
    duration += 24;
  }
  
  return duration;
};

// Get week range
export const getWeekRange = (date: Date = new Date()) => {
  return {
    start: startOfWeek(date, { weekStartsOn: 0 }),
    end: endOfWeek(date, { weekStartsOn: 0 }),
  };
};

// Check if date is in past
export const isDateInPast = (date: Date | string): boolean => {
  return isBefore(new Date(date), new Date());
};

// Check if date is in future
export const isDateInFuture = (date: Date | string): boolean => {
  return isAfter(new Date(date), new Date());
};

// Get date range for period
export const getDateRangeForPeriod = (period: 'today' | 'week' | 'month' | 'quarter' | 'year') => {
  const now = new Date();
  let start: Date;
  let end: Date = now;
  
  switch (period) {
    case 'today':
      start = new Date(now.setHours(0, 0, 0, 0));
      end = new Date(now.setHours(23, 59, 59, 999));
      break;
    case 'week':
      start = startOfWeek(now);
      break;
    case 'month':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'quarter':
      const quarter = Math.floor(now.getMonth() / 3);
      start = new Date(now.getFullYear(), quarter * 3, 1);
      break;
    case 'year':
      start = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      start = now;
  }
  
  return { start, end };
};

// Format date for API
export const formatDateForAPI = (date: Date | string): string => {
  return format(new Date(date), 'yyyy-MM-dd');
};

// Format datetime for API
export const formatDateTimeForAPI = (date: Date | string): string => {
  return new Date(date).toISOString();
};

// Get shift time slot
export const getShiftTimeSlot = (time: string): 'morning' | 'afternoon' | 'evening' | 'night' => {
  const hour = parseInt(time.split(':')[0]);
  
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 22) return 'evening';
  return 'night';
};

// Add business days
export const addBusinessDays = (date: Date, days: number): Date => {
  let result = new Date(date);
  let daysAdded = 0;
  
  while (daysAdded < days) {
    result = addDays(result, 1);
    const dayOfWeek = result.getDay();
    
    // Skip weekends
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      daysAdded++;
    }
  }
  
  return result;
};

// Get time slots for scheduling
export const getTimeSlots = (interval: number = 30): string[] => {
  const slots: string[] = [];
  
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += interval) {
      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      slots.push(time);
    }
  }
  
  return slots;
};

// Calculate age from date of birth
export const calculateAge = (dateOfBirth: Date | string): number => {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
};