import { Router } from "express";
import { requireAuth } from "./auth.routes";
import { storage } from "../storage";
import { db } from "../db";
import { eq, sql, and, inArray, or } from "drizzle-orm";
import { 
  shifts, 
  shiftRequests,
  shiftHistory,
  shiftTemplates,
  generatedShifts,
  insertShiftSchema,
  UserRole
} from "@shared/schema";
import { z } from "zod";
import { format } from "date-fns";
import { recommendationEngine } from "../recommendation-engine";
import type { RecommendationCriteria } from "../recommendation-engine";

const router = Router();

// Get shifts
router.get("/api/shifts", requireAuth, async (req: any, res) => {
  try {
    const { facilityId, date, status, staffId, startDate, endDate } = req.query;
    
    let shifts;
    if (req.user.role === UserRole.CONTRACTOR_1099 || req.user.role === UserRole.INTERNAL_EMPLOYEE) {
      shifts = await storage.getShiftsByStaff(req.user.id);
    } else if (facilityId || req.user.facilityId) {
      const targetFacilityId = facilityId ? parseInt(facilityId) : req.user.facilityId;
      shifts = await storage.getShiftsByFacility(targetFacilityId);
    } else {
      shifts = await storage.getShifts();
    }

    // Apply filters
    if (date) {
      shifts = shifts.filter(shift => shift.date === date);
    }
    if (status) {
      shifts = shifts.filter(shift => shift.status === status);
    }
    if (staffId) {
      shifts = shifts.filter(shift => 
        shift.assignedStaffIds?.includes(parseInt(staffId))
      );
    }
    if (startDate && endDate) {
      shifts = shifts.filter(shift => 
        shift.date >= startDate && shift.date <= endDate
      );
    }

    res.json(shifts);
  } catch (error) {
    console.error("Failed to fetch shifts:", error);
    res.status(500).json({ message: "Failed to fetch shifts" });
  }
});

// Get shift by ID
router.get("/api/shifts/:id", requireAuth, async (req, res) => {
  try {
    const shiftId = parseInt(req.params.id);
    const shift = await storage.getShift(shiftId);
    
    if (!shift) {
      return res.status(404).json({ message: "Shift not found" });
    }
    
    res.json(shift);
  } catch (error) {
    console.error("Failed to fetch shift:", error);
    res.status(500).json({ message: "Failed to fetch shift" });
  }
});

// Create shift
router.post("/api/shifts", requireAuth, async (req: any, res) => {
  try {
    const shiftData = insertShiftSchema.parse({
      ...req.body,
      facilityId: req.body.facilityId || req.user.facilityId,
      status: req.body.status || "open",
      assignedStaffIds: req.body.assignedStaffIds || [],
    });

    const shift = await storage.createShift(shiftData);
    
    // Check if shift should be auto-assigned
    if (shift.status === "open" && shift.assignedStaffIds.length === 0) {
      const criteria: RecommendationCriteria = {
        facilityId: shift.facilityId,
        specialty: shift.specialty,
        date: shift.date,
        shiftType: shift.startTime < "12:00" ? "morning" : shift.startTime < "17:00" ? "afternoon" : "night",
      };

      const recommendations = await recommendationEngine.getRecommendations(criteria);
      
      if (recommendations.length > 0) {
        // Auto-assign to the top recommendation
        const topRec = recommendations[0];
        const updatedShift = await storage.updateShift(shift.id, {
          assignedStaffIds: [topRec.staffId],
          status: "assigned",
        });
        
        // Create shift request record
        await storage.createShiftRequest({
          shiftId: shift.id,
          staffId: topRec.staffId,
          status: "accepted",
          respondedAt: new Date(),
        });

        return res.status(201).json({
          ...updatedShift,
          autoAssigned: true,
          assignedTo: topRec.staffName,
        });
      }
    }

    res.status(201).json(shift);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: "Invalid shift data", errors: error.errors });
    } else {
      console.error("Failed to create shift:", error);
      res.status(500).json({ message: "Failed to create shift" });
    }
  }
});

// Update shift
router.patch("/api/shifts/:id", requireAuth, async (req: any, res) => {
  try {
    const shiftId = parseInt(req.params.id);
    const updateData = req.body;

    // Record history if status is changing
    const existingShift = await storage.getShift(shiftId);
    if (existingShift && updateData.status && updateData.status !== existingShift.status) {
      await storage.createShiftHistory({
        shiftId,
        action: `Status changed from ${existingShift.status} to ${updateData.status}`,
        changedBy: req.user.id,
        changedAt: new Date(),
      });
    }

    const shift = await storage.updateShift(shiftId, updateData);
    
    if (!shift) {
      return res.status(404).json({ message: "Shift not found" });
    }
    
    res.json(shift);
  } catch (error) {
    console.error("Failed to update shift:", error);
    res.status(500).json({ message: "Failed to update shift" });
  }
});

// Delete shift
router.delete("/api/shifts/:id", requireAuth, async (req: any, res) => {
  try {
    const shiftId = parseInt(req.params.id);
    await storage.deleteShift(shiftId);
    res.status(204).send();
  } catch (error) {
    console.error("Failed to delete shift:", error);
    res.status(500).json({ message: "Failed to delete shift" });
  }
});

// Assign staff to shift
router.post("/api/shifts/:id/assign", requireAuth, async (req: any, res) => {
  try {
    const shiftId = parseInt(req.params.id);
    const { staffId } = req.body;

    const shift = await storage.getShift(shiftId);
    if (!shift) {
      return res.status(404).json({ message: "Shift not found" });
    }

    const currentStaffIds = shift.assignedStaffIds || [];
    if (currentStaffIds.includes(staffId)) {
      return res.status(400).json({ message: "Staff already assigned to this shift" });
    }

    const updatedShift = await storage.updateShift(shiftId, {
      assignedStaffIds: [...currentStaffIds, staffId],
      status: "assigned",
    });

    // Create shift request record
    await storage.createShiftRequest({
      shiftId,
      staffId,
      status: "accepted",
      respondedAt: new Date(),
    });

    // Record history
    await storage.createShiftHistory({
      shiftId,
      action: `Staff assigned: ${staffId}`,
      changedBy: req.user.id,
      changedAt: new Date(),
    });

    res.json(updatedShift);
  } catch (error) {
    console.error("Failed to assign staff:", error);
    res.status(500).json({ message: "Failed to assign staff to shift" });
  }
});

// Remove staff from shift
router.post("/api/shifts/:id/unassign", requireAuth, async (req: any, res) => {
  try {
    const shiftId = parseInt(req.params.id);
    const { staffId } = req.body;

    const shift = await storage.getShift(shiftId);
    if (!shift) {
      return res.status(404).json({ message: "Shift not found" });
    }

    const currentStaffIds = shift.assignedStaffIds || [];
    if (!currentStaffIds.includes(staffId)) {
      return res.status(400).json({ message: "Staff not assigned to this shift" });
    }

    const updatedStaffIds = currentStaffIds.filter(id => id !== staffId);
    const updatedShift = await storage.updateShift(shiftId, {
      assignedStaffIds: updatedStaffIds,
      status: updatedStaffIds.length === 0 ? "open" : "assigned",
    });

    // Update shift request record
    const requests = await storage.getShiftRequests(shiftId);
    const request = requests.find(r => r.staffId === staffId);
    if (request) {
      await storage.updateShiftRequest(request.id, {
        status: "cancelled",
      });
    }

    // Record history
    await storage.createShiftHistory({
      shiftId,
      action: `Staff removed: ${staffId}`,
      changedBy: req.user.id,
      changedAt: new Date(),
    });

    res.json(updatedShift);
  } catch (error) {
    console.error("Failed to unassign staff:", error);
    res.status(500).json({ message: "Failed to remove staff from shift" });
  }
});

// Get shift requests
router.get("/api/shifts/:id/requests", requireAuth, async (req, res) => {
  try {
    const shiftId = parseInt(req.params.id);
    const requests = await storage.getShiftRequests(shiftId);
    res.json(requests);
  } catch (error) {
    console.error("Failed to fetch shift requests:", error);
    res.status(500).json({ message: "Failed to fetch shift requests" });
  }
});

// Get shift history
router.get("/api/shifts/:id/history", requireAuth, async (req, res) => {
  try {
    const shiftId = parseInt(req.params.id);
    const history = await storage.getShiftHistory(shiftId);
    res.json(history);
  } catch (error) {
    console.error("Failed to fetch shift history:", error);
    res.status(500).json({ message: "Failed to fetch shift history" });
  }
});

// Get shift templates
router.get("/api/shift-templates", requireAuth, async (req: any, res) => {
  try {
    const facilityId = req.query.facilityId || req.user.facilityId;
    const templates = await storage.getShiftTemplatesByFacility(facilityId);
    res.json(templates);
  } catch (error) {
    console.error("Failed to fetch shift templates:", error);
    res.status(500).json({ message: "Failed to fetch shift templates" });
  }
});

// Create shift template
router.post("/api/shift-templates", requireAuth, async (req: any, res) => {
  try {
    const templateData = {
      ...req.body,
      facilityId: req.body.facilityId || req.user.facilityId,
    };

    const template = await storage.createShiftTemplate(templateData);
    res.status(201).json(template);
  } catch (error) {
    console.error("Failed to create shift template:", error);
    res.status(500).json({ message: "Failed to create shift template" });
  }
});

// Generate shifts from template
router.post("/api/shift-templates/:id/generate", requireAuth, async (req: any, res) => {
  try {
    const templateId = parseInt(req.params.id);
    const { startDate, endDate } = req.body;

    const template = await storage.getShiftTemplate(templateId);
    if (!template) {
      return res.status(404).json({ message: "Template not found" });
    }

    const shifts = [];
    const currentDate = new Date(startDate);
    const end = new Date(endDate);

    while (currentDate <= end) {
      const dayOfWeek = format(currentDate, "EEEE").toLowerCase();
      
      if (template.daysOfWeek.includes(dayOfWeek)) {
        const shiftData = {
          facilityId: template.facilityId,
          title: template.title,
          description: template.description,
          specialty: template.specialty,
          department: template.department,
          date: format(currentDate, "yyyy-MM-dd"),
          startTime: template.startTime,
          endTime: template.endTime,
          requiredStaff: template.requiredStaff,
          rate: template.rate,
          status: "open",
          assignedStaffIds: [],
        };

        const shift = await storage.createShift(shiftData);
        shifts.push(shift);

        // Record generation
        await storage.createGeneratedShift({
          templateId,
          shiftId: shift.id,
          generatedAt: new Date(),
        });
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    res.json({
      message: `Generated ${shifts.length} shifts`,
      shifts,
    });
  } catch (error) {
    console.error("Failed to generate shifts:", error);
    res.status(500).json({ message: "Failed to generate shifts from template" });
  }
});

export default router;