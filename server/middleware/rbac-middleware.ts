/**
 * Comprehensive RBAC middleware for NexSpace
 * Enforces role-based access control and facility-based data filtering
 */

import { Request, Response, NextFunction } from "express";
import { db } from "../db";
import { eq, inArray, and } from "drizzle-orm";
import { facilities, staff, shifts } from "@shared/schema";

export interface AuthenticatedRequest extends Request {
  user?: any;
  facilityFilter?: number[] | null;
  allowedFacilities?: number[];
}

/**
 * Ensures user is authenticated
 */
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
}

/**
 * Ensures user has specific permission
 */
export function requirePermission(permission: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    // Super admin bypass
    if (req.user.role === "super_admin") {
      return next();
    }

    // Check user permissions
    const userPermissions = req.user.permissions || [];
    if (!userPermissions.includes(permission)) {
      return res.status(403).json({ 
        message: "Permission denied",
        required: permission,
        userPermissions 
      });
    }

    next();
  };
}

/**
 * Ensures user has one of the specified roles
 */
export function requireRole(...roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: "Access denied",
        requiredRoles: roles,
        userRole: req.user.role 
      });
    }

    next();
  };
}

/**
 * Sets up facility filtering based on user role and associations
 * This middleware should be used before any data fetching
 */
export function setupFacilityFilter(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }

  // Super admin sees all facilities
  if (req.user.role === "super_admin") {
    req.facilityFilter = null; // null means no filtering
    req.allowedFacilities = []; // empty array means all facilities
    return next();
  }

  // Get user's allowed facilities
  const associatedFacilities = req.user.associatedFacilityIds || 
                              req.user.associatedFacilities || 
                              [];
  const primaryFacility = req.user.facilityId || req.user.primaryFacilityId;

  // Combine all facility access
  const allowedFacilities: number[] = [...associatedFacilities];
  if (primaryFacility && !allowedFacilities.includes(primaryFacility)) {
    allowedFacilities.push(primaryFacility);
  }

  // If user has no facility access, deny request
  if (allowedFacilities.length === 0) {
    return res.status(403).json({ 
      message: "No facility access",
      details: "User is not associated with any facilities" 
    });
  }

  req.facilityFilter = allowedFacilities;
  req.allowedFacilities = allowedFacilities;
  next();
}

/**
 * Validates that requested facility ID is in user's allowed facilities
 */
export function validateFacilityAccess(paramName: string = "facilityId") {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // Super admin bypass
    if (req.user?.role === "super_admin") {
      return next();
    }

    // Get facility ID from params or query
    const facilityId = req.params[paramName] || req.query[paramName];
    if (!facilityId) {
      return next(); // No facility specified, let endpoint handle it
    }

    const requestedFacilityId = parseInt(facilityId as string);
    
    // Check if user has access to this facility
    const allowedFacilities = req.allowedFacilities || [];
    if (allowedFacilities.length > 0 && !allowedFacilities.includes(requestedFacilityId)) {
      return res.status(403).json({ 
        message: "Access denied to facility",
        requestedFacility: requestedFacilityId,
        allowedFacilities 
      });
    }

    next();
  };
}

/**
 * Validates that a resource belongs to user's allowed facilities
 * Use this for endpoints that fetch individual resources by ID
 */
export function validateResourceFacilityAccess(resourceType: "staff" | "shift" | "facility") {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // Super admin bypass
    if (req.user?.role === "super_admin") {
      return next();
    }

    const resourceId = parseInt(req.params.id);
    if (!resourceId) {
      return res.status(400).json({ message: "Resource ID required" });
    }

    const allowedFacilities = req.allowedFacilities || [];
    if (allowedFacilities.length === 0) {
      return res.status(403).json({ message: "No facility access" });
    }

    try {
      let hasAccess = false;

      switch (resourceType) {
        case "staff":
          const [staffMember] = await db
            .select({ facilityId: staff.primaryFacilityId })
            .from(staff)
            .where(eq(staff.id, resourceId))
            .limit(1);
          
          if (staffMember && staffMember.facilityId) {
            hasAccess = allowedFacilities.includes(staffMember.facilityId);
          }
          break;

        case "shift":
          const [shift] = await db
            .select({ facilityId: shifts.facilityId })
            .from(shifts)
            .where(eq(shifts.id, resourceId))
            .limit(1);
          
          if (shift) {
            hasAccess = allowedFacilities.includes(shift.facilityId);
          }
          break;

        case "facility":
          hasAccess = allowedFacilities.includes(resourceId);
          break;
      }

      if (!hasAccess) {
        return res.status(403).json({ 
          message: `Access denied to ${resourceType}`,
          resourceId,
          allowedFacilities 
        });
      }

      next();
    } catch (error) {
      console.error(`Error validating ${resourceType} access:`, error);
      res.status(500).json({ message: "Failed to validate access" });
    }
  };
}

/**
 * Filters query results by user's allowed facilities
 * Use this as a utility function in your route handlers
 */
export function filterByFacilities<T extends { facilityId?: number | null; primaryFacilityId?: number | null }>(
  items: T[],
  allowedFacilities: number[] | null
): T[] {
  // If null (super admin), return all items
  if (allowedFacilities === null) {
    return items;
  }

  // Filter items by allowed facilities
  return items.filter(item => {
    const facilityId = item.facilityId || item.primaryFacilityId;
    return facilityId && allowedFacilities.includes(facilityId);
  });
}

/**
 * Audit logging middleware
 * Logs all data access for compliance
 */
export function auditLog(action: string, resourceType: string) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const originalSend = res.send;
    const startTime = Date.now();

    res.send = function(data: any) {
      res.send = originalSend;
      
      // Log the audit event
      const auditEntry = {
        userId: req.user?.id,
        userRole: req.user?.role,
        action,
        resourceType,
        resourceId: req.params.id,
        facilityFilter: req.facilityFilter,
        method: req.method,
        path: req.path,
        query: req.query,
        statusCode: res.statusCode,
        duration: Date.now() - startTime,
        timestamp: new Date(),
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      };

      // In production, this would write to audit log table
      console.log('[AUDIT]', JSON.stringify(auditEntry));

      return res.send(data);
    };

    next();
  };
}

/**
 * Combined middleware for common patterns
 */
export const requireAuthWithFacilityFilter = [
  requireAuth,
  setupFacilityFilter
];

export const requireFacilityManager = [
  requireAuth,
  setupFacilityFilter,
  requireRole(
    "super_admin",
    "facility_admin",
    "facility_administrator",
    "scheduling_coordinator",
    "hr_manager",
    "billing_manager",
    "supervisor",
    "director_of_nursing"
  )
];

export const requireStaffManagement = [
  requireAuth,
  setupFacilityFilter,
  requirePermission("manage_staff")
];