import { Router } from "express";
import { requireAuth } from "./auth.routes";
import { storage } from "../storage";
import { db } from "../db";
import { eq, sql, and, inArray, or } from "drizzle-orm";
import { 
  facilities, 
  facilityUsers, 
  facilityUserRoleTemplates,
  insertFacilitySchema 
} from "@shared/schema";
import { z } from "zod";

const router = Router();

// Get all facilities
router.get("/api/facilities", requireAuth, async (req, res) => {
  try {
    const facilities = await storage.getFacilities();
    res.json(facilities);
  } catch (error) {
    console.error("Failed to fetch facilities:", error);
    res.status(500).json({ message: "Failed to fetch facilities" });
  }
});

// Get facility by ID
router.get("/api/facilities/:id", requireAuth, async (req, res) => {
  try {
    const facilityId = parseInt(req.params.id);
    const facility = await storage.getFacility(facilityId);
    
    if (!facility) {
      return res.status(404).json({ message: "Facility not found" });
    }
    
    res.json(facility);
  } catch (error) {
    console.error("Failed to fetch facility:", error);
    res.status(500).json({ message: "Failed to fetch facility" });
  }
});

// Create new facility
router.post("/api/facilities", requireAuth, async (req: any, res) => {
  try {
    // Only super admins can create facilities
    if (req.user?.role !== "super_admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    const facilityData = insertFacilitySchema.parse(req.body);
    const facility = await storage.createFacility(facilityData);
    res.status(201).json(facility);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: "Invalid facility data", errors: error.errors });
    } else {
      console.error("Failed to create facility:", error);
      res.status(500).json({ message: "Failed to create facility" });
    }
  }
});

// Update facility
router.patch("/api/facilities/:id", requireAuth, async (req: any, res) => {
  try {
    const facilityId = parseInt(req.params.id);
    
    // Check permissions
    if (req.user?.role !== "super_admin" && req.user?.facilityId !== facilityId) {
      return res.status(403).json({ message: "Permission denied" });
    }

    const updateData = req.body;
    const facility = await storage.updateFacility(facilityId, updateData);
    
    if (!facility) {
      return res.status(404).json({ message: "Facility not found" });
    }
    
    res.json(facility);
  } catch (error) {
    console.error("Failed to update facility:", error);
    res.status(500).json({ message: "Failed to update facility" });
  }
});

// Delete facility
router.delete("/api/facilities/:id", requireAuth, async (req: any, res) => {
  try {
    // Only super admins can delete facilities
    if (req.user?.role !== "super_admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    const facilityId = parseInt(req.params.id);
    await storage.deleteFacility(facilityId);
    res.status(204).send();
  } catch (error) {
    console.error("Failed to delete facility:", error);
    res.status(500).json({ message: "Failed to delete facility" });
  }
});

// Get facility users
router.get("/api/facilities/:id/users", requireAuth, async (req: any, res) => {
  try {
    const facilityId = parseInt(req.params.id);
    
    // Check permissions
    if (req.user?.role !== "super_admin" && req.user?.facilityId !== facilityId) {
      return res.status(403).json({ message: "Permission denied" });
    }

    const users = await db
      .select()
      .from(facilityUsers)
      .where(
        or(
          eq(facilityUsers.primaryFacilityId, facilityId),
          sql`${facilityUsers.associatedFacilityIds}::jsonb @> ${JSON.stringify([facilityId])}`
        )
      );

    res.json(users);
  } catch (error) {
    console.error("Failed to fetch facility users:", error);
    res.status(500).json({ message: "Failed to fetch facility users" });
  }
});

// Get facility role templates
router.get("/api/facilities/:id/role-templates", requireAuth, async (req: any, res) => {
  try {
    const facilityId = parseInt(req.params.id);
    
    const templates = await db
      .select()
      .from(facilityUserRoleTemplates)
      .where(eq(facilityUserRoleTemplates.facilityId, facilityId));

    res.json(templates);
  } catch (error) {
    console.error("Failed to fetch role templates:", error);
    res.status(500).json({ message: "Failed to fetch role templates" });
  }
});

// Create facility role template
router.post("/api/facilities/:id/role-templates", requireAuth, async (req: any, res) => {
  try {
    const facilityId = parseInt(req.params.id);
    
    // Check permissions
    if (req.user?.role !== "super_admin" && 
        (!req.user?.permissions || !req.user.permissions.includes("manage_roles"))) {
      return res.status(403).json({ message: "Permission denied" });
    }

    const { name, permissions, description } = req.body;
    
    const [template] = await db
      .insert(facilityUserRoleTemplates)
      .values({
        facilityId,
        name,
        permissions,
        description,
        isSystemRole: false,
        isDefault: false,
      })
      .returning();

    res.status(201).json(template);
  } catch (error) {
    console.error("Failed to create role template:", error);
    res.status(500).json({ message: "Failed to create role template" });
  }
});

// Update facility role template
router.patch("/api/facilities/:id/role-templates/:templateId", requireAuth, async (req: any, res) => {
  try {
    const facilityId = parseInt(req.params.id);
    const templateId = parseInt(req.params.templateId);
    
    // Check permissions
    if (req.user?.role !== "super_admin" && 
        (!req.user?.permissions || !req.user.permissions.includes("manage_roles"))) {
      return res.status(403).json({ message: "Permission denied" });
    }

    const { name, permissions, description } = req.body;
    
    const [template] = await db
      .update(facilityUserRoleTemplates)
      .set({
        name,
        permissions,
        description,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(facilityUserRoleTemplates.id, templateId),
          eq(facilityUserRoleTemplates.facilityId, facilityId),
          eq(facilityUserRoleTemplates.isSystemRole, false)
        )
      )
      .returning();

    if (!template) {
      return res.status(404).json({ message: "Role template not found or is a system role" });
    }

    res.json(template);
  } catch (error) {
    console.error("Failed to update role template:", error);
    res.status(500).json({ message: "Failed to update role template" });
  }
});

// Delete facility role template
router.delete("/api/facilities/:id/role-templates/:templateId", requireAuth, async (req: any, res) => {
  try {
    const facilityId = parseInt(req.params.id);
    const templateId = parseInt(req.params.templateId);
    
    // Check permissions
    if (req.user?.role !== "super_admin" && 
        (!req.user?.permissions || !req.user.permissions.includes("manage_roles"))) {
      return res.status(403).json({ message: "Permission denied" });
    }

    await db
      .delete(facilityUserRoleTemplates)
      .where(
        and(
          eq(facilityUserRoleTemplates.id, templateId),
          eq(facilityUserRoleTemplates.facilityId, facilityId),
          eq(facilityUserRoleTemplates.isSystemRole, false)
        )
      );

    res.status(204).send();
  } catch (error) {
    console.error("Failed to delete role template:", error);
    res.status(500).json({ message: "Failed to delete role template" });
  }
});

export default router;