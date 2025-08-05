import { Router } from "express";
import { requireAuth } from "./auth.routes";
import { 
  setupFacilityFilter, 
  validateResourceFacilityAccess,
  requirePermission,
  auditLog,
  AuthenticatedRequest,
  filterByFacilities
} from "../middleware/rbac-middleware";
import { storage } from "../storage";
import { db } from "../db";
import { eq, sql, and, inArray, or, like } from "drizzle-orm";
import { 
  staff,
  credentials,
  insertStaffSchema,
  insertCredentialSchema,
  UserRole
} from "@shared/schema";
import { z } from "zod";

const router = Router();

// Get all staff (filtered by user's facilities)
router.get("/api/staff", 
  requireAuth,
  setupFacilityFilter,
  auditLog("list", "staff"),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { facilityId, specialty, isActive, search } = req.query;
      
      // If specific facility requested, validate access
      if (facilityId && req.facilityFilter !== null) {
        const requestedFacilityId = parseInt(facilityId as string);
        if (!req.facilityFilter.includes(requestedFacilityId)) {
          return res.status(403).json({ 
            message: "Access denied to facility",
            requestedFacility: requestedFacilityId,
            allowedFacilities: req.facilityFilter 
          });
        }
      }
      
      // Get all staff and filter by facilities
      const allStaff = await storage.getStaff();
      const accessibleStaff = filterByFacilities(allStaff, req.facilityFilter);

      // Apply additional filters
      let filteredStaff = accessibleStaff;
      
      if (facilityId) {
        filteredStaff = filteredStaff.filter(s => 
          s.primaryFacilityId === parseInt(facilityId as string)
        );
      }
      
      if (specialty) {
        filteredStaff = filteredStaff.filter(s => s.specialty === specialty);
      }
      
      if (isActive !== undefined) {
        filteredStaff = filteredStaff.filter(s => s.isActive === (isActive === 'true'));
      }
      
      if (search) {
        const searchLower = (search as string).toLowerCase();
        filteredStaff = filteredStaff.filter(s => 
          s.firstName?.toLowerCase().includes(searchLower) ||
          s.lastName?.toLowerCase().includes(searchLower) ||
          s.email.toLowerCase().includes(searchLower)
        );
      }

      res.json(filteredStaff);
    } catch (error) {
      console.error("Failed to fetch staff:", error);
      res.status(500).json({ message: "Failed to fetch staff" });
    }
  }
);

// Get staff by ID (with access validation)
router.get("/api/staff/:id", 
  requireAuth,
  setupFacilityFilter,
  validateResourceFacilityAccess("staff"),
  auditLog("view", "staff"),
  async (req: AuthenticatedRequest, res) => {
    try {
      const staffId = parseInt(req.params.id);
      const staffMember = await storage.getStaffMember(staffId);
      
      if (!staffMember) {
        return res.status(404).json({ message: "Staff member not found" });
      }
      
      res.json(staffMember);
    } catch (error) {
      console.error("Failed to fetch staff member:", error);
      res.status(500).json({ message: "Failed to fetch staff member" });
    }
  }
);

// Create staff member
router.post("/api/staff", requireAuth, async (req: any, res) => {
  try {
    // Check permissions
    if (!req.user?.permissions?.includes("manage_staff") && req.user?.role !== "super_admin") {
      return res.status(403).json({ message: "Permission denied" });
    }

    const staffData = insertStaffSchema.parse({
      ...req.body,
      primaryFacilityId: req.body.primaryFacilityId || req.user.facilityId,
    });

    const staffMember = await storage.createStaff(staffData);
    res.status(201).json(staffMember);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: "Invalid staff data", errors: error.errors });
    } else {
      console.error("Failed to create staff member:", error);
      res.status(500).json({ message: "Failed to create staff member" });
    }
  }
});

// Update staff member
router.patch("/api/staff/:id", requireAuth, async (req: any, res) => {
  try {
    const staffId = parseInt(req.params.id);
    
    // Check permissions
    if (!req.user?.permissions?.includes("manage_staff") && 
        req.user?.role !== "super_admin" && 
        req.user?.id !== staffId) {
      return res.status(403).json({ message: "Permission denied" });
    }

    const updateData = req.body;
    const staffMember = await storage.updateStaff(staffId, updateData);
    
    if (!staffMember) {
      return res.status(404).json({ message: "Staff member not found" });
    }
    
    res.json(staffMember);
  } catch (error) {
    console.error("Failed to update staff member:", error);
    res.status(500).json({ message: "Failed to update staff member" });
  }
});

// Delete staff member
router.delete("/api/staff/:id", requireAuth, async (req: any, res) => {
  try {
    // Check permissions
    if (!req.user?.permissions?.includes("manage_staff") && req.user?.role !== "super_admin") {
      return res.status(403).json({ message: "Permission denied" });
    }

    const staffId = parseInt(req.params.id);
    await storage.deleteStaff(staffId);
    res.status(204).send();
  } catch (error) {
    console.error("Failed to delete staff member:", error);
    res.status(500).json({ message: "Failed to delete staff member" });
  }
});

// Get staff credentials
router.get("/api/staff/:id/credentials", requireAuth, async (req: any, res) => {
  try {
    const staffId = parseInt(req.params.id);
    
    // Check permissions
    if (!req.user?.permissions?.includes("view_credentials") && 
        req.user?.role !== "super_admin" && 
        req.user?.id !== staffId) {
      return res.status(403).json({ message: "Permission denied" });
    }

    const credentials = await storage.getCredentialsByStaff(staffId);
    res.json(credentials);
  } catch (error) {
    console.error("Failed to fetch credentials:", error);
    res.status(500).json({ message: "Failed to fetch credentials" });
  }
});

// Add credential
router.post("/api/staff/:id/credentials", requireAuth, async (req: any, res) => {
  try {
    const staffId = parseInt(req.params.id);
    
    // Check permissions
    if (!req.user?.permissions?.includes("manage_credentials") && req.user?.role !== "super_admin") {
      return res.status(403).json({ message: "Permission denied" });
    }

    const credentialData = insertCredentialSchema.parse({
      ...req.body,
      staffId,
    });

    const credential = await storage.createCredential(credentialData);
    res.status(201).json(credential);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: "Invalid credential data", errors: error.errors });
    } else {
      console.error("Failed to create credential:", error);
      res.status(500).json({ message: "Failed to create credential" });
    }
  }
});

// Update credential
router.patch("/api/credentials/:id", requireAuth, async (req: any, res) => {
  try {
    const credentialId = parseInt(req.params.id);
    
    // Check permissions
    if (!req.user?.permissions?.includes("manage_credentials") && req.user?.role !== "super_admin") {
      return res.status(403).json({ message: "Permission denied" });
    }

    const updateData = req.body;
    const credential = await storage.updateCredential(credentialId, updateData);
    
    if (!credential) {
      return res.status(404).json({ message: "Credential not found" });
    }
    
    res.json(credential);
  } catch (error) {
    console.error("Failed to update credential:", error);
    res.status(500).json({ message: "Failed to update credential" });
  }
});

// Delete credential
router.delete("/api/credentials/:id", requireAuth, async (req: any, res) => {
  try {
    // Check permissions
    if (!req.user?.permissions?.includes("manage_credentials") && req.user?.role !== "super_admin") {
      return res.status(403).json({ message: "Permission denied" });
    }

    const credentialId = parseInt(req.params.id);
    await storage.deleteCredential(credentialId);
    res.status(204).send();
  } catch (error) {
    console.error("Failed to delete credential:", error);
    res.status(500).json({ message: "Failed to delete credential" });
  }
});

// Get staff availability
router.get("/api/staff/:id/availability", requireAuth, async (req, res) => {
  try {
    const staffId = parseInt(req.params.id);
    const { startDate, endDate } = req.query;
    
    // Get staff member's assigned shifts in the date range
    const shifts = await storage.getShiftsByStaff(staffId);
    const filteredShifts = shifts.filter(shift => {
      if (startDate && shift.date < startDate) return false;
      if (endDate && shift.date > endDate) return false;
      return true;
    });

    // Create availability map
    const availability: Record<string, boolean> = {};
    if (startDate && endDate) {
      const current = new Date(startDate as string);
      const end = new Date(endDate as string);
      
      while (current <= end) {
        const dateStr = current.toISOString().split('T')[0];
        availability[dateStr] = !filteredShifts.some(shift => shift.date === dateStr);
        current.setDate(current.getDate() + 1);
      }
    }

    res.json({
      staffId,
      availability,
      assignedShifts: filteredShifts,
    });
  } catch (error) {
    console.error("Failed to fetch staff availability:", error);
    res.status(500).json({ message: "Failed to fetch staff availability" });
  }
});

// Update staff availability status
router.patch("/api/staff/:id/availability-status", requireAuth, async (req: any, res) => {
  try {
    const staffId = parseInt(req.params.id);
    const { availabilityStatus, availabilityReason } = req.body;
    
    // Check permissions
    if (req.user?.id !== staffId && 
        !req.user?.permissions?.includes("manage_staff") && 
        req.user?.role !== "super_admin") {
      return res.status(403).json({ message: "Permission denied" });
    }

    const staff = await storage.updateStaff(staffId, {
      availabilityStatus,
      availabilityReason,
    });

    if (!staff) {
      return res.status(404).json({ message: "Staff member not found" });
    }

    res.json(staff);
  } catch (error) {
    console.error("Failed to update availability status:", error);
    res.status(500).json({ message: "Failed to update availability status" });
  }
});

export default router;