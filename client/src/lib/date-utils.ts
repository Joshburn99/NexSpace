import { format, parseISO, isValid, formatDistanceToNow, startOfDay, endOfDay, isAfter, isBefore, isWithinInterval } from 'date-fns';

/**
 * Centralized date/time utility functions
 * Handles timezone normalization and consistent formatting
 */

export const DATE_FORMATS = {
  SHORT: 'MMM d',
  MEDIUM: 'MMM d, yyyy',
  LONG: 'EEEE, MMMM d, yyyy',
  TIME: 'h:mm a',
  DATETIME: 'MMM d, yyyy h:mm a',
  ISO: 'yyyy-MM-dd',
  FULL_ISO: "yyyy-MM-dd'T'HH:mm:ss.SSSxxx",
} as const;

/**
 * Parse a date string or Date object safely
 */
export function parseDate(dateInput: string | Date | null | undefined): Date | null {
  if (!dateInput) return null;
  
  if (dateInput instanceof Date) {
    return isValid(dateInput) ? dateInput : null;
  }
  
  try {
    const parsed = parseISO(dateInput);
    return isValid(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Format a date with timezone consideration
 * Always displays in user's local timezone
 */
export function formatDate(
  dateInput: string | Date | null | undefined,
  formatStr: keyof typeof DATE_FORMATS | string = 'MEDIUM'
): string {
  const date = parseDate(dateInput);
  if (!date) return 'Invalid date';
  
  const formatPattern = DATE_FORMATS[formatStr as keyof typeof DATE_FORMATS] || formatStr;
  
  try {
    return format(date, formatPattern);
  } catch {
    return 'Invalid date';
  }
}

/**
 * Format time only with AM/PM
 */
export function formatTime(dateInput: string | Date | null | undefined): string {
  return formatDate(dateInput, 'TIME');
}

/**
 * Format date and time together
 */
export function formatDateTime(dateInput: string | Date | null | undefined): string {
  return formatDate(dateInput, 'DATETIME');
}

/**
 * Format relative time (e.g., "2 hours ago", "in 3 days")
 */
export function formatRelativeTime(dateInput: string | Date | null | undefined): string {
  const date = parseDate(dateInput);
  if (!date) return 'Unknown time';
  
  try {
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return 'Unknown time';
  }
}

/**
 * Get timezone info for display
 */
export function getTimezoneInfo(): { abbreviation: string; offset: string; full: string } {
  const date = new Date();
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  // Get timezone abbreviation
  const abbreviation = date.toLocaleTimeString('en-us', { timeZoneName: 'short' })
    .split(' ')[2] || 'Local';
  
  // Get offset
  const offset = date.toLocaleTimeString('en-us', { timeZoneName: 'longOffset' })
    .split(' ')[2] || '+0:00';
  
  return {
    abbreviation,
    offset,
    full: timeZone,
  };
}

/**
 * Create date range filter helpers
 */
export function createDateRange(start: Date, end: Date) {
  return {
    start: startOfDay(start),
    end: endOfDay(end),
  };
}

export function isDateInRange(
  dateInput: string | Date | null | undefined,
  range: { start: Date; end: Date }
): boolean {
  const date = parseDate(dateInput);
  if (!date) return false;
  
  return isWithinInterval(date, range);
}

/**
 * Common date range presets
 */
export const DATE_RANGE_PRESETS = {
  today: () => {
    const now = new Date();
    return createDateRange(now, now);
  },
  
  thisWeek: () => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    return createDateRange(startOfWeek, endOfWeek);
  },
  
  thisMonth: () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return createDateRange(start, end);
  },
  
  next7Days: () => {
    const now = new Date();
    const end = new Date(now);
    end.setDate(now.getDate() + 7);
    return createDateRange(now, end);
  },
  
  next30Days: () => {
    const now = new Date();
    const end = new Date(now);
    end.setDate(now.getDate() + 30);
    return createDateRange(now, end);
  },
} as const;

/**
 * Format duration between two dates
 */
export function formatDuration(
  start: string | Date | null | undefined,
  end: string | Date | null | undefined
): string {
  const startDate = parseDate(start);
  const endDate = parseDate(end);
  
  if (!startDate || !endDate) return 'Unknown duration';
  
  const diffMs = endDate.getTime() - startDate.getTime();
  const diffHours = Math.round(diffMs / (1000 * 60 * 60) * 10) / 10;
  
  if (diffHours < 1) {
    const diffMinutes = Math.round(diffMs / (1000 * 60));
    return `${diffMinutes}m`;
  }
  
  return `${diffHours}h`;
}

/**
 * Check if a shift time conflicts with another
 */
export function hasTimeConflict(
  shift1: { startTime: string | Date; endTime: string | Date },
  shift2: { startTime: string | Date; endTime: string | Date }
): boolean {
  const start1 = parseDate(shift1.startTime);
  const end1 = parseDate(shift1.endTime);
  const start2 = parseDate(shift2.startTime);
  const end2 = parseDate(shift2.endTime);
  
  if (!start1 || !end1 || !start2 || !end2) return false;
  
  return (
    (isAfter(start1, start2) && isBefore(start1, end2)) ||
    (isAfter(start2, start1) && isBefore(start2, end1)) ||
    (start1.getTime() === start2.getTime()) ||
    (end1.getTime() === end2.getTime())
  );
}