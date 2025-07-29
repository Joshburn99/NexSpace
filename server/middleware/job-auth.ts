import { Request, Response, NextFunction } from "express";

// Middleware to ensure user is a facility user or super admin
export const requireFacilityOrSuperAdmin = (req: any, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }

  if (req.user.role !== "super_admin" && !req.user.facilityId) {
    return res.status(403).json({ message: "Only facility users and super admins can access this resource" });
  }

  next();
};

// Middleware to ensure user owns the resource or is super admin
export const requireOwnerOrSuperAdmin = (resourceOwnerId: number) => {
  return (req: any, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (req.user.role !== "super_admin" && req.user.id !== resourceOwnerId) {
      return res.status(403).json({ message: "You can only access your own resources" });
    }

    next();
  };
};

// Middleware to ensure facility user can only access their facility's resources
export const requireFacilityAccess = (facilityId: number) => {
  return (req: any, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (req.user.role !== "super_admin" && req.user.facilityId !== facilityId) {
      return res.status(403).json({ message: "You can only access resources from your facility" });
    }

    next();
  };
};

// Middleware for job application access
export const requireApplicationAccess = async (req: any, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }

  // Super admins have full access
  if (req.user.role === "super_admin") {
    return next();
  }

  // Will be used in the route handler to check specific application access
  next();
};