import type { Shift, ShiftsBySpecialty, ShiftsByDate, User, Facility } from "../types";

/**
 * Get all shifts for a specific date
 * @param shifts - Array of shifts to filter
 * @param date - Date string in YYYY-MM-DD format
 * @returns Array of shifts for the specified date
 */
export const getShiftsForDate = (shifts: Shift[], date: string): Shift[] => {
  return shifts.filter((shift) => shift.date === date);
};

/**
 * Check if a shift is fully staffed
 * @param shift - Shift to check
 * @returns True if the shift has enough assigned workers
 */
export const isShiftFilled = (shift: Shift): boolean => {
  return shift.assignedWorkerIds.length >= shift.requiredWorkers;
};

/**
 * Group shifts by specialty
 * @param shifts - Array of shifts to group
 * @returns Object with specialties as keys and arrays of shifts as values
 */
export const groupShiftsBySpecialty = (shifts: Shift[]): ShiftsBySpecialty => {
  return shifts.reduce((grouped, shift) => {
    const specialty = shift.specialty;
    if (!grouped[specialty]) {
      grouped[specialty] = [];
    }
    grouped[specialty].push(shift);
    return grouped;
  }, {} as ShiftsBySpecialty);
};

/**
 * Group shifts by date
 * @param shifts - Array of shifts to group
 * @returns Object with dates as keys and arrays of shifts as values
 */
export const groupShiftsByDate = (shifts: Shift[]): ShiftsByDate => {
  return shifts.reduce((grouped, shift) => {
    const date = shift.date;
    if (!grouped[date]) {
      grouped[date] = [];
    }
    grouped[date].push(shift);
    return grouped;
  }, {} as ShiftsByDate);
};

/**
 * Get the staffing ratio for a shift (assigned/required)
 * @param shift - Shift to analyze
 * @returns Object with current, required, and ratio information
 */
export const getShiftStaffingRatio = (shift: Shift) => {
  const assigned = shift.assignedWorkerIds.length;
  const required = shift.requiredWorkers;
  return {
    assigned,
    required,
    ratio: `${assigned}/${required}`,
    percentage: required > 0 ? Math.round((assigned / required) * 100) : 0,
    isFullyStaffed: assigned >= required,
    needsStaff: required - assigned,
  };
};

/**
 * Get shifts that need staffing (not fully filled)
 * @param shifts - Array of shifts to filter
 * @returns Array of shifts that need additional staff
 */
export const getUnderStaffedShifts = (shifts: Shift[]): Shift[] => {
  return shifts.filter((shift) => !isShiftFilled(shift));
};

/**
 * Get shifts by status
 * @param shifts - Array of shifts to filter
 * @param status - Status to filter by
 * @returns Array of shifts with the specified status
 */
export const getShiftsByStatus = (shifts: Shift[], status: string): Shift[] => {
  return shifts.filter((shift) => shift.status === status);
};

/**
 * Get shifts for a specific facility
 * @param shifts - Array of shifts to filter
 * @param facilityId - Facility ID to filter by
 * @returns Array of shifts for the specified facility
 */
export const getShiftsByFacility = (shifts: Shift[], facilityId: string): Shift[] => {
  return shifts.filter((shift) => shift.facilityId === facilityId);
};

/**
 * Get shifts assigned to a specific worker
 * @param shifts - Array of shifts to filter
 * @param workerId - Worker ID to filter by
 * @returns Array of shifts assigned to the worker
 */
export const getShiftsByWorker = (shifts: Shift[], workerId: string): Shift[] => {
  return shifts.filter((shift) => shift.assignedWorkerIds.includes(workerId));
};

/**
 * Get shifts within a date range
 * @param shifts - Array of shifts to filter
 * @param startDate - Start date string (YYYY-MM-DD)
 * @param endDate - End date string (YYYY-MM-DD)
 * @returns Array of shifts within the date range
 */
export const getShiftsInDateRange = (
  shifts: Shift[],
  startDate: string,
  endDate: string
): Shift[] => {
  return shifts.filter((shift) => {
    return shift.date >= startDate && shift.date <= endDate;
  });
};

/**
 * Check if a worker is available for a shift (not already assigned to overlapping shifts)
 * @param shifts - All shifts to check against
 * @param targetShift - Shift to check availability for
 * @param workerId - Worker ID to check
 * @returns True if the worker is available for the target shift
 */
export const isWorkerAvailableForShift = (
  shifts: Shift[],
  targetShift: Shift,
  workerId: string
): boolean => {
  const workerShifts = getShiftsByWorker(shifts, workerId);
  const sameDate = workerShifts.filter((shift) => shift.date === targetShift.date);

  // Check for time overlaps
  return !sameDate.some((shift) => {
    if (shift.id === targetShift.id) return false; // Skip the same shift

    const shiftStart = parseInt(shift.startTime.replace(":", ""));
    const shiftEnd = parseInt(shift.endTime.replace(":", ""));
    const targetStart = parseInt(targetShift.startTime.replace(":", ""));
    const targetEnd = parseInt(targetShift.endTime.replace(":", ""));

    // Check for overlap
    return targetStart < shiftEnd && targetEnd > shiftStart;
  });
};

/**
 * Get available workers for a shift based on specialty and availability
 * @param users - Array of all users
 * @param shifts - Array of all shifts (to check conflicts)
 * @param targetShift - Shift to find workers for
 * @returns Array of available workers
 */
export const getAvailableWorkersForShift = (
  users: User[],
  shifts: Shift[],
  targetShift: Shift
): User[] => {
  return users.filter((user) => {
    // Must be active staff with matching specialty
    if (!user.isActive || user.role !== "staff" || user.specialty !== targetShift.specialty) {
      return false;
    }

    // Must be associated with the facility
    if (!user.facilityIds.includes(targetShift.facilityId)) {
      return false;
    }

    // Must not already be assigned to this shift
    if (targetShift.assignedWorkerIds.includes(user.id)) {
      return false;
    }

    // Must be available (no conflicting shifts)
    return isWorkerAvailableForShift(shifts, targetShift, user.id);
  });
};

/**
 * Calculate shift duration in hours
 * @param shift - Shift to calculate duration for
 * @returns Duration in hours (decimal)
 */
export const calculateShiftDuration = (shift: Shift): number => {
  const startHour = parseInt(shift.startTime.split(":")[0]);
  const startMinute = parseInt(shift.startTime.split(":")[1]);
  const endHour = parseInt(shift.endTime.split(":")[0]);
  const endMinute = parseInt(shift.endTime.split(":")[1]);

  let duration = endHour - startHour + (endMinute - startMinute) / 60;

  // Handle overnight shifts
  if (duration < 0) {
    duration += 24;
  }

  return Math.round(duration * 100) / 100; // Round to 2 decimal places
};

/**
 * Format shift time range for display
 * @param shift - Shift to format
 * @returns Formatted time string (e.g., "7:00 AM - 7:00 PM")
 */
export const formatShiftTime = (shift: Shift): string => {
  const formatTime = (time: string): string => {
    const [hour, minute] = time.split(":");
    const hourNum = parseInt(hour);
    const ampm = hourNum >= 12 ? "PM" : "AM";
    const displayHour = hourNum === 0 ? 12 : hourNum > 12 ? hourNum - 12 : hourNum;
    return `${displayHour}:${minute} ${ampm}`;
  };

  return `${formatTime(shift.startTime)} - ${formatTime(shift.endTime)}`;
};

/**
 * Sort shifts by date and time
 * @param shifts - Array of shifts to sort
 * @returns Sorted array of shifts
 */
export const sortShiftsByDateTime = (shifts: Shift[]): Shift[] => {
  return [...shifts].sort((a, b) => {
    if (a.date !== b.date) {
      return a.date.localeCompare(b.date);
    }
    return a.startTime.localeCompare(b.startTime);
  });
};
