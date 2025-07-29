import { useAuth } from "./use-auth";
import { User } from "@shared/schema";

/**
 * Hook to get the current user data
 * This will return the impersonated user when impersonating,
 * or the actual logged-in user when not impersonating
 */
export function useCurrentUser(): {
  user: User | null;
  isLoading: boolean;
  isImpersonating: boolean;
  originalUser: User | null;
} {
  const { user, isLoading, isImpersonating, originalUser } = useAuth();
  
  return {
    user, // This is already the correct user (impersonated or original)
    isLoading,
    isImpersonating,
    originalUser, // Only set when impersonating
  };
}

/**
 * Hook to get the current user's facility information
 * Handles both regular users and facility users during impersonation
 */
export function useCurrentUserFacilities() {
  const { user } = useCurrentUser();
  
  if (!user) return { facilities: [], primaryFacilityId: null };
  
  // Check if it's a facility user
  const facilityUser = user as any;
  if (facilityUser.associatedFacilityIds) {
    return {
      facilities: facilityUser.associatedFacilityIds || [],
      primaryFacilityId: facilityUser.primaryFacilityId || null,
    };
  }
  
  // For regular users or staff
  return {
    facilities: [],
    primaryFacilityId: null,
  };
}

/**
 * Hook to get the current user's permissions
 * This ensures permission checks work correctly during impersonation
 */
export function useCurrentUserPermissions() {
  const { user } = useCurrentUser();
  
  if (!user) return [];
  
  // Return permissions array if available
  return (user as any).permissions || [];
}