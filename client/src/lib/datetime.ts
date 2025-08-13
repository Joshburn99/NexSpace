import { format, parseISO, isValid, differenceInMinutes, differenceInHours } from 'date-fns';
import { toZonedTime, fromZonedTime, formatInTimeZone } from 'date-fns-tz';

/**
 * Safely converts various date inputs to a Date object or null
 * Handles: Date objects, ISO strings, epoch milliseconds, null, undefined
 * Never throws - returns null if invalid
 */
export function toDateSafe(value: any): Date | null {
  if (!value) return null;
  
  try {
    // Already a valid Date object
    if (value instanceof Date) {
      return isValid(value) ? value : null;
    }
    
    // Handle ISO strings
    if (typeof value === 'string') {
      const parsed = parseISO(value);
      return isValid(parsed) ? parsed : null;
    }
    
    // Handle epoch milliseconds
    if (typeof value === 'number' && value > 0) {
      const date = new Date(value);
      return isValid(date) ? date : null;
    }
    
    // Try direct conversion as fallback
    const date = new Date(value);
    return isValid(date) ? date : null;
  } catch {
    return null;
  }
}

/**
 * Safely formats a date value using date-fns format
 * Returns fallback string if date is invalid
 */
export function safelyFormat(
  value: any, 
  formatStr: string = 'PPp',
  fallback: string = '—'
): string {
  const date = toDateSafe(value);
  if (!date) return fallback;
  
  try {
    return format(date, formatStr);
  } catch {
    return fallback;
  }
}

/**
 * Formats a date value with timezone support
 * Returns fallback if invalid
 */
export function safelyFormatInTimezone(
  value: any,
  timezone: string,
  formatStr: string = 'PPp',
  fallback: string = '—'
): string {
  const date = toDateSafe(value);
  if (!date) return fallback;
  
  try {
    return formatInTimeZone(date, timezone, formatStr);
  } catch {
    // Fallback to non-timezone format if timezone is invalid
    return safelyFormat(value, formatStr, fallback);
  }
}

/**
 * Formats a time range in compact format (e.g., "7a–3p" or "11p–7a")
 * Handles overnight shifts and timezone conversion
 */
export function formatRange(
  startValue: any,
  endValue: any,
  timezone?: string,
  fallback: string = '—'
): string {
  const start = toDateSafe(startValue);
  const end = toDateSafe(endValue);
  
  if (!start || !end) return fallback;
  
  try {
    // Convert to timezone if provided
    const startTime = timezone ? toZonedTime(start, timezone) : start;
    const endTime = timezone ? toZonedTime(end, timezone) : end;
    
    // Format times
    const startHour = startTime.getHours();
    const endHour = endTime.getHours();
    const startMinutes = startTime.getMinutes();
    const endMinutes = endTime.getMinutes();
    
    // Build time strings
    const formatTime = (hour: number, minutes: number): string => {
      const period = hour >= 12 ? 'p' : 'a';
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      const minuteStr = minutes > 0 ? `:${minutes.toString().padStart(2, '0')}` : '';
      return `${displayHour}${minuteStr}${period}`;
    };
    
    const startStr = formatTime(startHour, startMinutes);
    const endStr = formatTime(endHour, endMinutes);
    
    // Check if overnight (end is on different day)
    const isOvernight = endTime.getDate() !== startTime.getDate();
    
    return isOvernight ? `${startStr}–${endStr}+` : `${startStr}–${endStr}`;
  } catch {
    return fallback;
  }
}

/**
 * Formats a duration in human-readable format
 * e.g., "8 hours", "4h 30m", "30 minutes"
 */
export function formatDuration(
  startValue: any,
  endValue: any,
  fallback: string = '—'
): string {
  const start = toDateSafe(startValue);
  const end = toDateSafe(endValue);
  
  if (!start || !end) return fallback;
  
  try {
    const totalMinutes = Math.abs(differenceInMinutes(end, start));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    if (hours === 0) {
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    } else if (minutes === 0) {
      return `${hours} hour${hours !== 1 ? 's' : ''}`;
    } else {
      return `${hours}h ${minutes}m`;
    }
  } catch {
    return fallback;
  }
}

/**
 * Gets a short date label (e.g., "Today", "Tomorrow", "Mon 15")
 */
export function getDateLabel(value: any, fallback: string = '—'): string {
  const date = toDateSafe(value);
  if (!date) return fallback;
  
  try {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Check if today
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    }
    
    // Check if tomorrow
    if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    }
    
    // Otherwise return day and date
    return format(date, 'EEE d');
  } catch {
    return fallback;
  }
}

/**
 * Validates and normalizes a shift event object
 * Ensures all required fields are present with safe defaults
 */
export function normalizeShiftEvent(event: any): {
  id: number | string;
  facilityId: number;
  facilityName: string;
  role: string;
  specialty: string;
  status: 'open' | 'pending' | 'filled' | 'cancelled';
  startUtc: string | null;
  endUtc: string | null;
  timezone: string;
  requiredCount: number;
  filledCount: number;
  assignedStaffId?: number | null;
  assignedStaffName?: string | null;
  notes?: string;
  department?: string;
  rate?: number;
} {
  // Handle both naming conventions (start/end and startUtc/endUtc)
  const startDate = toDateSafe(event.startUtc || event.start);
  const endDate = toDateSafe(event.endUtc || event.end);
  
  // Determine status based on filled vs required
  let status: 'open' | 'pending' | 'filled' | 'cancelled' = event.status || 'open';
  if (!event.status) {
    const filled = event.assignedWorkerIds?.length || event.filledCount || 0;
    const required = event.requiredWorkers || event.requiredCount || 1;
    if (filled >= required) {
      status = 'filled';
    } else if (filled > 0) {
      status = 'pending';
    }
  }
  
  return {
    id: event.id || 0,
    facilityId: event.facilityId || 0,
    facilityName: event.facilityName || 'Unknown Facility',
    role: event.role || event.title || 'Unknown Role',
    specialty: event.specialty || event.role || event.title || 'General',
    status,
    startUtc: startDate?.toISOString() || null,
    endUtc: endDate?.toISOString() || null,
    timezone: event.timezone || 'America/New_York',
    requiredCount: event.requiredWorkers || event.requiredCount || 1,
    filledCount: event.assignedWorkerIds?.length || event.filledCount || 0,
    assignedStaffId: event.assignedStaffId || null,
    assignedStaffName: event.assignedStaffName || null,
    notes: event.notes,
    department: event.department,
    rate: event.rate
  };
}