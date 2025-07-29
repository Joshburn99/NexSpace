import { storage } from "./storage";
import { UserRole } from "@shared/schema";
import type { Permission, SystemRole } from "@shared/rbac";

/**
 * Enhanced Security Middleware for Role-Based Access Control
 * This file provides comprehensive authorization checks for the healthcare platform
 */

// Enhanced permission checking that works with both legacy and new RBAC system
export const requirePermission = (permission: string | Permission) => {
  return async (req: any, res: any, next: any) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    // Super admin always has access
    if (req.user.role === "super_admin" || req.user.role === UserRole.SUPER_ADMIN) {
      return next();
    }

    // Check permission using storage layer
    const hasPermission = await storage.hasPermission(req.user.role, permission);
    if (!hasPermission) {
      return res.status(403).json({
        message: "Insufficient permissions",
        required: permission,
        userRole: req.user.role,
      });
    }

    next();
  };
};

// Super admin only middleware
export const requireSuperAdmin = (req: any, res: any, next: any) => {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }

  if (req.user.role !== "super_admin" && req.user.role !== UserRole.SUPER_ADMIN) {
    return res.status(403).json({ message: "Super admin access required" });
  }

  next();
};

// Facility access control - ensures users can only access their associated facilities
export const requireFacilityAccess = (facilityIdParam: string = "facilityId") => {
  return async (req: any, res: any, next: any) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    // Super admin can access all facilities
    if (req.user.role === "super_admin" || req.user.role === UserRole.SUPER_ADMIN) {
      return next();
    }

    const requestedFacilityId = parseInt(
      req.params[facilityIdParam] || req.body[facilityIdParam] || req.query[facilityIdParam]
    );

    if (!requestedFacilityId) {
      return res.status(400).json({ message: "Facility ID required" });
    }

    // Check if user has access to this facility
    const userFacilityIds = req.user.associatedFacilityIds || req.user.associatedFacilities || [];
    const hasAccess =
      userFacilityIds.includes(requestedFacilityId) || req.user.facilityId === requestedFacilityId;

    if (!hasAccess) {
      return res.status(403).json({
        message: "Access denied to this facility",
        requestedFacility: requestedFacilityId,
        userFacilities: userFacilityIds,
      });
    }

    next();
  };
};

// Resource ownership validation - ensures users can only access their own data
export const requireResourceOwnership = (
  userIdParam: string = "userId",
  allowSuperAdmin: boolean = true
) => {
  return (req: any, res: any, next: any) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    // Super admin can access all resources (if allowed)
    if (
      allowSuperAdmin &&
      (req.user.role === "super_admin" || req.user.role === UserRole.SUPER_ADMIN)
    ) {
      return next();
    }

    const requestedUserId = parseInt(
      req.params[userIdParam] || req.body[userIdParam] || req.query[userIdParam]
    );

    if (!requestedUserId) {
      return res.status(400).json({ message: "User ID required" });
    }

    if (req.user.id !== requestedUserId) {
      return res.status(403).json({
        message: "Access denied - can only access your own resources",
        requestedUser: requestedUserId,
        currentUser: req.user.id,
      });
    }

    next();
  };
};

// Staff role validation - ensures only staff members can access staff endpoints
export const requireStaffRole = (req: any, res: any, next: any) => {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const staffRoles = ["internal_employee", "contractor_1099", "employee", "contractor"];
  const isStaff = staffRoles.includes(req.user.role) || req.user.role === "super_admin";

  if (!isStaff) {
    return res.status(403).json({
      message: "Staff access required",
      userRole: req.user.role,
    });
  }

  next();
};

// Facility user role validation
export const requireFacilityUser = (req: any, res: any, next: any) => {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const facilityRoles = [
    "facility_admin",
    "facility_administrator",
    "scheduling_coordinator",
    "hr_manager",
    "billing",
    "supervisor",
    "director_of_nursing",
    "corporate",
    "regional_director",
    "viewer",
  ];

  const isFacilityUser = facilityRoles.includes(req.user.role) || req.user.role === "super_admin";

  if (!isFacilityUser) {
    return res.status(403).json({
      message: "Facility user access required",
      userRole: req.user.role,
    });
  }

  next();
};

// Data filtering middleware - automatically filters data based on user's facility associations
export const applyDataFiltering = (req: any, res: any, next: any) => {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }

  // Add filtering context to request
  req.dataFilter = {
    userId: req.user.id,
    role: req.user.role,
    facilityIds:
      req.user.associatedFacilityIds ||
      req.user.associatedFacilities ||
      (req.user.facilityId ? [req.user.facilityId] : []),
    isSuperAdmin: req.user.role === "super_admin" || req.user.role === UserRole.SUPER_ADMIN,
  };

  next();
};

// Input validation middleware
export const validateInput = (schema: any) => {
  return (req: any, res: any, next: any) => {
    try {
      const result = schema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          message: "Invalid input data",
          errors: result.error.issues,
        });
      }
      req.validatedBody = result.data;
      next();
    } catch (error) {
      return res.status(400).json({
        message: "Validation error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };
};

// Rate limiting by user role
export const applyRateLimit = (req: any, res: any, next: any) => {
  // TODO: Implement proper rate limiting based on user role
  // Higher limits for admins, lower for regular users
  next();
};

// Audit trail middleware
export const auditLog = (action: string, resource: string) => {
  return async (req: any, res: any, next: any) => {
    const originalSend = res.json;

    res.json = function (data: any) {
      // Log successful operations
      if (res.statusCode < 400 && req.user) {
        // Check if this is an impersonated action
        const isImpersonated = !!(req.session as any).originalUser;
        const originalUserId = isImpersonated ? (req.session as any).originalUser.id : undefined;
        const impersonationContext = isImpersonated
          ? {
              userType: (req.session as any).impersonatedUserType || "user",
              originalEmail: (req.session as any).originalUser.email,
              impersonatedEmail: req.user.email,
            }
          : undefined;

        storage
          .createAuditLog(
            req.user.id,
            action,
            resource,
            data?.id || req.params?.id,
            req.body,
            data,
            req.ip,
            req.get("User-Agent"),
            originalUserId,
            isImpersonated,
            impersonationContext
          )
          .catch((error) => {
            console.error("Audit log failed:", error);
          });
      }
      return originalSend.call(this, data);
    };

    next();
  };
};

// Combined security middleware for common patterns
export const secureEndpoint = (
  permissions: string[] = [],
  options: {
    requireOwnership?: boolean;
    requireFacilityAccess?: boolean;
    auditAction?: string;
    auditResource?: string;
  } = {}
) => {
  const middleware = [];

  // Apply permissions
  if (permissions.length > 0) {
    permissions.forEach((permission) => {
      middleware.push(requirePermission(permission));
    });
  }

  // Apply ownership check
  if (options.requireOwnership) {
    middleware.push(requireResourceOwnership());
  }

  // Apply facility access check
  if (options.requireFacilityAccess) {
    middleware.push(requireFacilityAccess());
  }

  // Apply data filtering
  middleware.push(applyDataFiltering);

  // Apply audit logging
  if (options.auditAction && options.auditResource) {
    middleware.push(auditLog(options.auditAction, options.auditResource));
  }

  return middleware;
};
