/**
 * Role-based dashboard routing utilities for NexSpace
 * 
 * This module provides explicit role-to-dashboard mapping to ensure:
 * - SEO consistency: Each role has a dedicated landing page with proper meta tags
 * - Analytics accuracy: Role-specific landing page tracking for user behavior insights
 * - Deep-link parity: Impersonated users land on the same page as direct logins
 * - Security enforcement: Role-based access control with immediate routing
 * - User experience: Consistent navigation patterns regardless of entry method
 */

import type { SystemRole } from "@shared/rbac";

/**
 * Maps each system role to its appropriate dashboard route
 * 
 * @param role - The user's system role from the Role enum
 * @returns The dashboard path for the given role
 * @throws Error if the role is not recognized
 */
export function getDashboardPathByRole(role: SystemRole): string {
  const roleDashboardMap: Record<SystemRole, string> = {
    // Super admin gets full system oversight
    super_admin: "/admin",
    
    // Facility-level management roles
    facility_admin: "/facility",
    scheduling_coordinator: "/facility", 
    hr_manager: "/facility",
    billing_manager: "/facility",
    supervisor: "/facility",
    director_of_nursing: "/facility",
    
    // Corporate and regional oversight
    corporate: "/admin",
    regional_director: "/facility",
    
    // Healthcare workers and read-only users
    staff: "/staff",
    viewer: "/staff"
  };

  const dashboardPath = roleDashboardMap[role];
  
  if (!dashboardPath) {
    throw new Error(`Unknown role: ${role}. Unable to determine dashboard route.`);
  }
  
  return dashboardPath;
}

/**
 * Validates if a user with the given role should have access to a specific route
 * 
 * @param userRole - The user's system role
 * @param currentPath - The current route path
 * @returns True if the user should have access to this route
 */
export function validateRoleRouteAccess(userRole: SystemRole, currentPath: string): boolean {
  const allowedBasePaths: Record<SystemRole, string[]> = {
    super_admin: ["/admin", "/facility", "/staff"], // Full access
    facility_admin: ["/facility"],
    scheduling_coordinator: ["/facility"],
    hr_manager: ["/facility"],
    billing_manager: ["/facility"],
    supervisor: ["/facility"],
    director_of_nursing: ["/facility"],
    corporate: ["/admin", "/facility"], // Multi-facility oversight
    regional_director: ["/facility"],
    staff: ["/staff"],
    viewer: ["/staff"]
  };

  const allowedPaths = allowedBasePaths[userRole] || [];
  return allowedPaths.some(basePath => currentPath.startsWith(basePath));
}

/**
 * Gets the appropriate fallback route when a user tries to access an unauthorized path
 * 
 * @param userRole - The user's system role
 * @returns The fallback dashboard path for unauthorized access attempts
 */
export function getUnauthorizedFallbackRoute(userRole: SystemRole): string {
  return getDashboardPathByRole(userRole);
}