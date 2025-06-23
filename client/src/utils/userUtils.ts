import type { User, UserFilters, Specialty } from '../types';

/**
 * Get user's full name
 * @param user - User object
 * @returns Full name string
 */
export const getUserFullName = (user: User): string => {
  return `${user.firstName} ${user.lastName}`;
};

/**
 * Filter users based on multiple criteria
 * @param users - Array of users to filter
 * @param filters - Filter criteria
 * @returns Filtered array of users
 */
export const filterUsers = (users: User[], filters: UserFilters): User[] => {
  return users.filter(user => {
    if (filters.role && user.role !== filters.role) return false;
    if (filters.specialty && user.specialty !== filters.specialty) return false;
    if (filters.facilityId && !user.facilityIds.includes(filters.facilityId)) return false;
    if (filters.isActive !== undefined && user.isActive !== filters.isActive) return false;
    return true;
  });
};

/**
 * Get users by specialty
 * @param users - Array of users to filter
 * @param specialty - Specialty to filter by
 * @returns Array of users with the specified specialty
 */
export const getUsersBySpecialty = (users: User[], specialty: Specialty): User[] => {
  return users.filter(user => user.specialty === specialty);
};

/**
 * Get users by facility
 * @param users - Array of users to filter
 * @param facilityId - Facility ID to filter by
 * @returns Array of users associated with the facility
 */
export const getUsersByFacility = (users: User[], facilityId: string): User[] => {
  return users.filter(user => user.facilityIds.includes(facilityId));
};

/**
 * Get active staff members only
 * @param users - Array of users to filter
 * @returns Array of active staff users
 */
export const getActiveStaff = (users: User[]): User[] => {
  return users.filter(user => user.isActive && user.role === 'staff');
};

/**
 * Group users by specialty
 * @param users - Array of users to group
 * @returns Object with specialties as keys and arrays of users as values
 */
export const groupUsersBySpecialty = (users: User[]): Record<string, User[]> => {
  return users.reduce((grouped, user) => {
    if (user.specialty) {
      if (!grouped[user.specialty]) {
        grouped[user.specialty] = [];
      }
      grouped[user.specialty].push(user);
    }
    return grouped;
  }, {} as Record<string, User[]>);
};

/**
 * Get user initials for avatar display
 * @param user - User object
 * @returns Initials string (e.g., "JD")
 */
export const getUserInitials = (user: User): string => {
  return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
};

/**
 * Check if user is authorized for a facility
 * @param user - User to check
 * @param facilityId - Facility ID to check against
 * @returns True if user is authorized for the facility
 */
export const isUserAuthorizedForFacility = (user: User, facilityId: string): boolean => {
  return user.facilityIds.includes(facilityId) || user.role === 'superuser';
};

/**
 * Get users with admin privileges
 * @param users - Array of users to filter
 * @returns Array of users with admin or superuser roles
 */
export const getAdminUsers = (users: User[]): User[] => {
  return users.filter(user => user.role === 'facility_admin' || user.role === 'superuser');
};

/**
 * Sort users alphabetically by last name, then first name
 * @param users - Array of users to sort
 * @returns Sorted array of users
 */
export const sortUsersByName = (users: User[]): User[] => {
  return [...users].sort((a, b) => {
    const lastNameCompare = a.lastName.localeCompare(b.lastName);
    if (lastNameCompare !== 0) return lastNameCompare;
    return a.firstName.localeCompare(b.firstName);
  });
};