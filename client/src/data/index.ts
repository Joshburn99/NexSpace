// Central export file for all mock data and data utilities

// Mock data exports
export { mockUsers, getUserById, getUsersByFacility, getUsersBySpecialty, getActiveStaff } from './users';
export { mockFacilities, getFacilityById, getFacilitiesByType, getActiveFacilities, getFacilitiesByBedCount } from './facilities';
export { mockShifts, getShiftById, getShiftsByFacility, getShiftsBySpecialty, getShiftsByStatus, getOpenShifts } from './shifts';
export { mockAssignments, getAssignmentById, getAssignmentsByUser, getAssignmentsByShift, getAssignmentsByStatus, getPendingAssignments, getConfirmedAssignments } from './assignments';

// Re-export all types for convenience
export type * from '../types';

// Combined data service functions
import { mockUsers } from './users';
import { mockFacilities } from './facilities';
import { mockShifts } from './shifts';
import { mockAssignments } from './assignments';
import type { User, Facility, Shift, Assignment, ShiftWithDetails } from '../types';

/**
 * Get shifts with enhanced details including facility and worker information
 * @param shifts - Array of shifts (optional, defaults to mockShifts)
 * @returns Array of shifts with facility and worker details
 */
export const getShiftsWithDetails = (shifts: Shift[] = mockShifts): ShiftWithDetails[] => {
  return shifts.map(shift => {
    const facility = mockFacilities.find(f => f.id === shift.facilityId);
    const assignedWorkers = mockUsers.filter(user => shift.assignedWorkerIds.includes(user.id));
    
    return {
      ...shift,
      facility: facility!,
      assignedWorkers
    };
  });
};

/**
 * Get comprehensive dashboard data
 * @returns Object with all key metrics and data for dashboard display
 */
export const getDashboardData = () => {
  const totalShifts = mockShifts.length;
  const openShifts = mockShifts.filter(shift => shift.status === 'open').length;
  const filledShifts = mockShifts.filter(shift => shift.assignedWorkerIds.length >= shift.requiredWorkers).length;
  const totalStaff = mockUsers.filter(user => user.role === 'staff' && user.isActive).length;
  const activeFacilities = mockFacilities.filter(facility => facility.isActive).length;
  const pendingAssignments = mockAssignments.filter(assignment => assignment.status === 'pending').length;

  return {
    shifts: {
      total: totalShifts,
      open: openShifts,
      filled: filledShifts,
      fillRate: totalShifts > 0 ? Math.round((filledShifts / totalShifts) * 100) : 0
    },
    Staff: {
      total: totalStaff,
      available: totalStaff // This would be calculated based on current shift assignments
    },
    facilities: {
      active: activeFacilities,
      total: mockFacilities.length
    },
    assignments: {
      pending: pendingAssignments,
      total: mockAssignments.length
    }
  };
};

/**
 * Search across all data types
 * @param searchTerm - Term to search for
 * @returns Object with search results from all data types
 */
export const globalSearch = (searchTerm: string) => {
  const lowerTerm = searchTerm.toLowerCase();
  
  const users = mockUsers.filter(user => 
    `${user.firstName} ${user.lastName}`.toLowerCase().includes(lowerTerm) ||
    user.email.toLowerCase().includes(lowerTerm) ||
    (user.specialty && user.specialty.toLowerCase().includes(lowerTerm))
  );

  const facilities = mockFacilities.filter(facility =>
    facility.name.toLowerCase().includes(lowerTerm) ||
    facility.city.toLowerCase().includes(lowerTerm) ||
    facility.state.toLowerCase().includes(lowerTerm)
  );

  const shifts = mockShifts.filter(shift =>
    shift.title.toLowerCase().includes(lowerTerm) ||
    shift.specialty.toLowerCase().includes(lowerTerm) ||
    (shift.description && shift.description.toLowerCase().includes(lowerTerm))
  );

  return {
    users,
    facilities,
    shifts,
    totalResults: users.length + facilities.length + shifts.length
  };
};