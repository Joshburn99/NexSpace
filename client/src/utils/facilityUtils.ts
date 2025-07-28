import type { Facility } from "../types";

/**
 * Get facility by ID
 * @param facilities - Array of facilities to search
 * @param id - Facility ID to find
 * @returns Facility object or undefined if not found
 */
export const getFacilityById = (facilities: Facility[], id: string): Facility | undefined => {
  return facilities.find((facility) => facility.id === id);
};

/**
 * Get facilities by type
 * @param facilities - Array of facilities to filter
 * @param facilityType - Type of facility to filter by
 * @returns Array of facilities matching the type
 */
export const getFacilitiesByType = (facilities: Facility[], facilityType: string): Facility[] => {
  return facilities.filter((facility) => facility.facilityType === facilityType);
};

/**
 * Get active facilities only
 * @param facilities - Array of facilities to filter
 * @returns Array of active facilities
 */
export const getActiveFacilities = (facilities: Facility[]): Facility[] => {
  return facilities.filter((facility) => facility.isActive);
};

/**
 * Filter facilities by bed count range
 * @param facilities - Array of facilities to filter
 * @param minBeds - Minimum bed count
 * @param maxBeds - Maximum bed count (optional)
 * @returns Array of facilities within the bed count range
 */
export const getFacilitiesByBedCount = (
  facilities: Facility[],
  minBeds: number,
  maxBeds?: number
): Facility[] => {
  return facilities.filter((facility) => {
    if (maxBeds) {
      return facility.bedCount >= minBeds && facility.bedCount <= maxBeds;
    }
    return facility.bedCount >= minBeds;
  });
};

/**
 * Sort facilities by name alphabetically
 * @param facilities - Array of facilities to sort
 * @returns Sorted array of facilities
 */
export const sortFacilitiesByName = (facilities: Facility[]): Facility[] => {
  return [...facilities].sort((a, b) => a.name.localeCompare(b.name));
};

/**
 * Sort facilities by bed count (largest first)
 * @param facilities - Array of facilities to sort
 * @returns Sorted array of facilities
 */
export const sortFacilitiesByBedCount = (facilities: Facility[]): Facility[] => {
  return [...facilities].sort((a, b) => b.bedCount - a.bedCount);
};

/**
 * Get facility address string for display
 * @param facility - Facility object
 * @returns Formatted address string
 */
export const getFacilityAddress = (facility: Facility): string => {
  return `${facility.address}, ${facility.city}, ${facility.state} ${facility.zipCode}`;
};

/**
 * Search facilities by name (case-insensitive)
 * @param facilities - Array of facilities to search
 * @param searchTerm - Search term to match against facility names
 * @returns Array of facilities matching the search term
 */
export const searchFacilitiesByName = (facilities: Facility[], searchTerm: string): Facility[] => {
  const lowerSearchTerm = searchTerm.toLowerCase();
  return facilities.filter((facility) => facility.name.toLowerCase().includes(lowerSearchTerm));
};

/**
 * Get facilities by state
 * @param facilities - Array of facilities to filter
 * @param state - State to filter by
 * @returns Array of facilities in the specified state
 */
export const getFacilitiesByState = (facilities: Facility[], state: string): Facility[] => {
  return facilities.filter((facility) => facility.state === state);
};

/**
 * Group facilities by type
 * @param facilities - Array of facilities to group
 * @returns Object with facility types as keys and arrays of facilities as values
 */
export const groupFacilitiesByType = (facilities: Facility[]): Record<string, Facility[]> => {
  return facilities.reduce(
    (grouped, facility) => {
      const type = facility.facilityType;
      if (!grouped[type]) {
        grouped[type] = [];
      }
      grouped[type].push(facility);
      return grouped;
    },
    {} as Record<string, Facility[]>
  );
};
