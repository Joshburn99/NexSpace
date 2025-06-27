import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { z } from "zod";
import {
  insertJobSchema,
  insertShiftSchema,
  insertShiftTemplateSchema,
  insertGeneratedShiftSchema,
  insertFacilitySchema,
  shifts,
  generatedShifts,
  shiftTemplates,
  facilities,
  users,
  staff,
} from "@shared/schema";
import { db } from "./db";
import { eq, sql } from "drizzle-orm";
import { UnifiedDataService } from "./unified-data-service";

export function registerRoutes(app: Express): Server {
  // Setup authentication routes
  setupAuth(app);

  // Helper functions
  const requireAuth = (req: any, res: any, next: any) => {
    if (req.user) {
      next();
    } else {
      res.status(401).json({ message: "Authentication required" });
    }
  };

  // Initialize unified data service
  const unifiedDataService = new UnifiedDataService();

  // Enhanced shifts endpoint - using database as single source of truth
  app.get("/api/shifts", async (req, res) => {
    try {
      // Get generated shifts from templates
      const dbGeneratedShifts = await db.select({
        id: generatedShifts.id,
        title: generatedShifts.title,
        facilityId: generatedShifts.facilityId,
        facilityName: generatedShifts.facilityName,
        department: generatedShifts.department,
        specialty: generatedShifts.specialty,
        date: generatedShifts.date,
        startTime: generatedShifts.startTime,
        endTime: generatedShifts.endTime,
        rate: generatedShifts.rate,
        status: generatedShifts.status,
        urgency: generatedShifts.urgency,
        requiredWorkers: generatedShifts.requiredWorkers,
        minStaff: generatedShifts.minStaff,
        maxStaff: generatedShifts.maxStaff,
        totalHours: generatedShifts.totalHours,
        templateId: generatedShifts.templateId,
        createdAt: generatedShifts.createdAt,
        updatedAt: generatedShifts.updatedAt,
      }).from(generatedShifts);

      // Get manually created shifts from main shifts table
      const dbMainShifts = await db.select({
        id: shifts.id,
        title: shifts.title,
        facilityId: shifts.facilityId,
        facilityName: sql<string>`${facilities.name}`.as('facilityName'),
        department: shifts.department,
        specialty: shifts.specialty,
        date: shifts.date,
        startTime: shifts.startTime,
        endTime: shifts.endTime,
        rate: shifts.rate,
        status: shifts.status,
        urgency: shifts.urgency,
        requiredStaff: shifts.requiredStaff,
        createdAt: shifts.createdAt,
        updatedAt: shifts.updatedAt,
      }).from(shifts)
        .leftJoin(facilities, eq(shifts.facilityId, facilities.id));

      // Format generated shifts with assignment data
      const formattedGeneratedShifts = dbGeneratedShifts.map(shift => {
        // Calculate assignment info
        const requiredWorkers = shift.requiredWorkers || 1;
        const totalPositions = requiredWorkers;
        const assignedCount = 0; // TODO: Add assignment logic when available
        const status = assignedCount >= requiredWorkers ? 'filled' : (assignedCount > 0 ? 'partial' : 'requesting');

        return {
          id: shift.id,
          title: shift.title,
          specialty: shift.specialty,
          facilityName: shift.facilityName,
          department: shift.department,
          date: shift.date,
          startTime: shift.startTime,
          endTime: shift.endTime,
          rate: parseFloat(shift.rate),
          status,
          urgency: shift.urgency,
          requiredWorkers,
          totalPositions,
          assignedWorkerIds: [],
          assignedWorkerNames: [],
          templateId: shift.templateId,
          createdFromTemplate: true,
        };
      });

      // Format main shifts with assignment data
      const formattedMainShifts = dbMainShifts.map(shift => {
        const requiredWorkers = shift.requiredStaff || 1;
        const totalPositions = requiredWorkers;
        const assignedCount = 0; // TODO: Add assignment logic when available
        const status = assignedCount >= requiredWorkers ? 'filled' : (assignedCount > 0 ? 'partial' : 'requesting');

        return {
          id: shift.id,
          title: shift.title,
          specialty: shift.specialty,
          facilityName: shift.facilityName,
          department: shift.department,
          date: shift.date,
          startTime: shift.startTime,
          endTime: shift.endTime,
          rate: parseFloat(shift.rate),
          status,
          urgency: shift.urgency,
          requiredWorkers,
          totalPositions,
          assignedWorkerIds: [],
          assignedWorkerNames: [],
          templateId: null,
          createdFromTemplate: false,
        };
      });

      // Combine all shifts
      const allShifts = [...formattedGeneratedShifts, ...formattedMainShifts];

      res.json(allShifts);
    } catch (error) {
      console.error("Error fetching shifts:", error);
      res.status(500).json({ message: "Failed to fetch shifts" });
    }
  });

  // Create new shift (for Add Shift button)
  app.post("/api/shifts", async (req, res) => {
    try {
      const shiftData = insertShiftSchema.parse(req.body);
      
      const [newShift] = await db
        .insert(shifts)
        .values({
          ...shiftData,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      res.status(201).json(newShift);
    } catch (error) {
      console.error("Error creating shift:", error);
      res.status(500).json({ message: "Failed to create shift" });
    }
  });

  // Comprehensive Facility Management API - Central Source of Truth
  
  // Get all facilities with full operational data
  app.get("/api/facilities", async (req, res) => {
    try {
      const facilitiesData = await db.select().from(facilities);
      res.json(facilitiesData);
    } catch (error) {
      console.error("Error fetching facilities:", error);
      res.status(500).json({ message: "Failed to fetch facilities" });
    }
  });

  // Get single facility with complete profile
  app.get("/api/facilities/:id", async (req, res) => {
    try {
      const facilityId = parseInt(req.params.id);
      const [facility] = await db
        .select()
        .from(facilities)
        .where(eq(facilities.id, facilityId));

      if (!facility) {
        return res.status(404).json({ message: "Facility not found" });
      }

      res.json(facility);
    } catch (error) {
      console.error("Error fetching facility:", error);
      res.status(500).json({ message: "Failed to fetch facility" });
    }
  });

  // Create new facility with comprehensive operational setup
  app.post("/api/facilities", async (req, res) => {
    try {
      const facilityData = insertFacilitySchema.parse(req.body);
      
      // Set default operational configurations for new facility
      const defaultConfig = {
        // Default dashboard configuration
        dashboardConfig: {
          modules: ["shifts", "staff", "analytics", "alerts"],
          layout: "standard",
          refreshInterval: 30
        },
        
        // Default KPI targets
        kpiTargets: {
          staffingRatio: 0.95,
          overtimePercentage: 0.15,
          shiftFillRate: 0.98,
          avgResponseTime: 30
        },
        
        // Default alert thresholds
        alertThresholds: {
          lowStaffing: 0.8,
          highOvertime: 0.25,
          criticalShifts: 1
        },
        
        // Default shift times
        standardShiftTimes: {
          day: { start: "07:00", end: "19:00" },
          evening: { start: "15:00", end: "23:00" },
          night: { start: "23:00", end: "07:00" }
        },
        
        // Default minimum staffing levels
        minimumStaffingLevels: {
          "Registered Nurse": 2,
          "Licensed Practical Nurse": 1,
          "Certified Nursing Assistant": 3
        },
        
        // Default hourly rate ranges
        hourlyRateRanges: {
          "Registered Nurse": { min: 35, max: 65 },
          "Licensed Practical Nurse": { min: 25, max: 40 },
          "Certified Nursing Assistant": { min: 18, max: 28 }
        },
        
        // Default attendance policies
        attendancePolicies: {
          tardyGracePeriod: 10,
          maxConsecutiveAbsences: 3,
          requireCallIn: 2
        },
        
        // Default time clock settings
        timeClockSettings: {
          roundingRules: "15min",
          breakDuration: 30,
          requireBreakOut: true
        }
      };

      const [newFacility] = await db
        .insert(facilities)
        .values({
          ...facilityData,
          ...defaultConfig
        })
        .returning();

      res.status(201).json(newFacility);
    } catch (error) {
      console.error("Error creating facility:", error);
      res.status(500).json({ message: "Failed to create facility" });
    }
  });

  // Update facility operational data
  app.put("/api/facilities/:id", async (req, res) => {
    try {
      const facilityId = parseInt(req.params.id);
      const updateData = insertFacilitySchema.partial().parse(req.body);

      const [updatedFacility] = await db
        .update(facilities)
        .set({
          ...updateData,
          updatedAt: new Date()
        })
        .where(eq(facilities.id, facilityId))
        .returning();

      if (!updatedFacility) {
        return res.status(404).json({ message: "Facility not found" });
      }

      res.json(updatedFacility);
    } catch (error) {
      console.error("Error updating facility:", error);
      res.status(500).json({ message: "Failed to update facility" });
    }
  });

  // Get facility operational dashboard data
  app.get("/api/facilities/:id/dashboard", async (req, res) => {
    try {
      const facilityId = parseInt(req.params.id);
      
      // Get facility basic info
      const [facility] = await db
        .select({
          id: facilities.id,
          name: facilities.name,
          facilityType: facilities.facilityType,
          dashboardConfig: facilities.dashboardConfig,
          kpiTargets: facilities.kpiTargets,
          alertThresholds: facilities.alertThresholds
        })
        .from(facilities)
        .where(eq(facilities.id, facilityId));

      if (!facility) {
        return res.status(404).json({ message: "Facility not found" });
      }

      // Get shift statistics for the facility
      const shiftStats = await db
        .select({
          total: sql<number>`count(*)`,
          filled: sql<number>`count(*) filter (where status = 'filled')`,
          open: sql<number>`count(*) filter (where status = 'open')`
        })
        .from(generatedShifts)
        .where(eq(generatedShifts.facilityId, facilityId));

      // Get staff count for the facility
      const staffStats = await db
        .select({
          total: sql<number>`count(*)`,
          active: sql<number>`count(*) filter (where availability_status = 'available')`
        })
        .from(staff)
        .where(eq(staff.userId, facilityId)); // Assuming staff is linked to facility

      const dashboardData = {
        facility,
        stats: {
          shifts: shiftStats[0] || { total: 0, filled: 0, open: 0 },
          staff: staffStats[0] || { total: 0, active: 0 }
        },
        kpis: {
          staffingRatio: staffStats[0]?.active / (staffStats[0]?.total || 1),
          shiftFillRate: shiftStats[0]?.filled / (shiftStats[0]?.total || 1)
        }
      };

      res.json(dashboardData);
    } catch (error) {
      console.error("Error fetching facility dashboard:", error);
      res.status(500).json({ message: "Failed to fetch facility dashboard" });
    }
  });

  // Get facility staff management data
  app.get("/api/facilities/:id/staff", async (req, res) => {
    try {
      const facilityId = parseInt(req.params.id);
      
      const facilityStaff = await db
        .select()
        .from(staff)
        .where(eq(staff.userId, facilityId)); // Adjust relationship as needed

      res.json(facilityStaff);
    } catch (error) {
      console.error("Error fetching facility staff:", error);
      res.status(500).json({ message: "Failed to fetch facility staff" });
    }
  });

  // Get facility shift analytics
  app.get("/api/facilities/:id/analytics", async (req, res) => {
    try {
      const facilityId = parseInt(req.params.id);
      const { startDate, endDate } = req.query;

      // Build analytics data specific to this facility
      const shiftsAnalytics = await db
        .select({
          date: generatedShifts.date,
          department: generatedShifts.department,
          specialty: generatedShifts.specialty,
          status: generatedShifts.status,
          rate: generatedShifts.rate
        })
        .from(generatedShifts)
        .where(eq(generatedShifts.facilityId, facilityId));

      res.json(shiftsAnalytics);
    } catch (error) {
      console.error("Error fetching facility analytics:", error);
      res.status(500).json({ message: "Failed to fetch facility analytics" });
    }
  });

  // Shift Templates API endpoints
  
  // Get all shift templates
  app.get("/api/shift-templates", async (req, res) => {
    try {
      const templates = await db.select({
        id: shiftTemplates.id,
        name: shiftTemplates.name,
        department: shiftTemplates.department,
        specialty: shiftTemplates.specialty,
        facilityId: shiftTemplates.facilityId,
        facilityName: shiftTemplates.facilityName,
        buildingId: shiftTemplates.buildingId,
        buildingName: shiftTemplates.buildingName,
        shiftType: shiftTemplates.shiftType,
        startTime: shiftTemplates.startTime,
        endTime: shiftTemplates.endTime,
        daysOfWeek: shiftTemplates.daysOfWeek,
        hourlyRate: shiftTemplates.hourlyRate,
        minStaff: shiftTemplates.minStaff,
        maxStaff: shiftTemplates.maxStaff,
        notes: shiftTemplates.notes,
        daysPostedOut: shiftTemplates.daysPostedOut,
        isActive: shiftTemplates.isActive,
        generatedShiftsCount: shiftTemplates.generatedShiftsCount,
        createdAt: shiftTemplates.createdAt,
        updatedAt: shiftTemplates.updatedAt,
      }).from(shiftTemplates);

      // Add generated shifts count for each template
      const templatesWithCounts = await Promise.all(
        templates.map(async (template) => {
          const shiftsCount = await db
            .select({ count: sql<number>`count(*)` })
            .from(generatedShifts)
            .where(eq(generatedShifts.templateId, template.id));
          
          return {
            ...template,
            generatedShiftsCount: shiftsCount[0]?.count || 0,
          };
        })
      );

      res.json(templatesWithCounts);
    } catch (error) {
      console.error("Error fetching shift templates:", error);
      res.status(500).json({ message: "Failed to fetch shift templates" });
    }
  });

  // Create new shift template
  app.post("/api/shift-templates", async (req, res) => {
    try {
      const templateData = insertShiftTemplateSchema.parse(req.body);
      
      // Create the template
      const [newTemplate] = await db
        .insert(shiftTemplates)
        .values({
          ...templateData,
          daysOfWeek: Array.isArray(templateData.daysOfWeek) 
            ? templateData.daysOfWeek 
            : [templateData.daysOfWeek],
        })
        .returning();

      // Generate initial shifts if template is active
      if (newTemplate.isActive) {
        await generateShiftsFromTemplate(newTemplate);
      }

      res.status(201).json(newTemplate);
    } catch (error) {
      console.error("Error creating shift template:", error);
      res.status(500).json({ message: "Failed to create shift template" });
    }
  });

  // Update shift template
  app.put("/api/shift-templates/:id", async (req, res) => {
    try {
      const templateId = parseInt(req.params.id);
      const updateData = insertShiftTemplateSchema.partial().parse(req.body);
      
      console.log('=== TEMPLATE UPDATE DEBUG ===');
      console.log('Template ID:', templateId);
      console.log('Update data received:', JSON.stringify(updateData, null, 2));

      // Update the template
      const [updatedTemplate] = await db
        .update(shiftTemplates)
        .set({
          ...updateData,
          daysOfWeek: Array.isArray(updateData.daysOfWeek) 
            ? updateData.daysOfWeek 
            : updateData.daysOfWeek ? [updateData.daysOfWeek] : undefined,
          updatedAt: new Date(),
        })
        .where(eq(shiftTemplates.id, templateId))
        .returning();

      if (!updatedTemplate) {
        return res.status(404).json({ message: "Template not found" });
      }

      console.log('Updated template in DB:', JSON.stringify(updatedTemplate, null, 2));

      // Regenerate shifts only if template is active
      if (updatedTemplate.isActive) {
        console.log('Template is active, regenerating shifts...');
        await regenerateShiftsFromTemplate(updatedTemplate);
      } else {
        console.log('Template is inactive, skipping shift regeneration');
      }

      res.json(updatedTemplate);
    } catch (error) {
      console.error("Error updating shift template:", error);
      res.status(500).json({ message: "Failed to update shift template" });
    }
  });

  // Update template status (activate/deactivate)
  app.patch("/api/shift-templates/:id/status", async (req, res) => {
    try {
      const templateId = parseInt(req.params.id);
      const { isActive } = req.body;

      const [updatedTemplate] = await db
        .update(shiftTemplates)
        .set({ isActive, updatedAt: new Date() })
        .where(eq(shiftTemplates.id, templateId))
        .returning();

      if (!updatedTemplate) {
        return res.status(404).json({ message: "Template not found" });
      }

      if (isActive) {
        // When activating, generate new shifts
        await generateShiftsFromTemplate(updatedTemplate);
      }
      // When deactivating, we DON'T delete existing shifts - they remain in the calendar

      res.json(updatedTemplate);
    } catch (error) {
      console.error("Error updating template status:", error);
      res.status(500).json({ message: "Failed to update template status" });
    }
  });

  // Regenerate shifts from template
  app.post("/api/shift-templates/:id/regenerate", async (req, res) => {
    try {
      const templateId = parseInt(req.params.id);
      
      const [template] = await db
        .select()
        .from(shiftTemplates)
        .where(eq(shiftTemplates.id, templateId));

      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }

      if (!template.isActive) {
        return res.status(400).json({ message: "Cannot regenerate shifts for inactive template" });
      }

      await regenerateShiftsFromTemplate(template);
      
      res.json({ message: "Shifts regenerated successfully" });
    } catch (error) {
      console.error("Error regenerating shifts:", error);
      res.status(500).json({ message: "Failed to regenerate shifts" });
    }
  });

  // Delete shift template
  app.delete("/api/shift-templates/:id", async (req, res) => {
    try {
      const templateId = parseInt(req.params.id);

      // Delete associated generated shifts first
      await db.delete(generatedShifts).where(eq(generatedShifts.templateId, templateId));

      // Delete the template
      const [deletedTemplate] = await db
        .delete(shiftTemplates)
        .where(eq(shiftTemplates.id, templateId))
        .returning();

      if (!deletedTemplate) {
        return res.status(404).json({ message: "Template not found" });
      }

      res.json({ message: "Template deleted successfully" });
    } catch (error) {
      console.error("Error deleting shift template:", error);
      res.status(500).json({ message: "Failed to delete shift template" });
    }
  });

  // Helper functions for shift generation
  async function generateShiftsFromTemplate(template: any) {
    try {
      const daysPostedOut = template.daysPostedOut || 30;
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(startDate.getDate() + daysPostedOut);

      const shifts = [];
      const currentDate = new Date(startDate);

      while (currentDate <= endDate) {
        const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        
        if (template.daysOfWeek && template.daysOfWeek.includes(dayNames[dayOfWeek])) {
          const shiftId = `${template.id}-${currentDate.toISOString().split('T')[0]}-${Date.now()}`;
          
          shifts.push({
            id: shiftId,
            title: template.name,
            facilityId: template.facilityId,
            facilityName: template.facilityName,
            department: template.department,
            specialty: template.specialty,
            shiftType: template.shiftType,
            date: currentDate.toISOString().split('T')[0],
            startTime: template.startTime,
            endTime: template.endTime,
            rate: template.hourlyRate.toString(),
            status: 'open',
            urgency: 'medium',
            requiredWorkers: template.maxStaff || 1,
            minStaff: template.minStaff || 1,
            maxStaff: template.maxStaff || 1,
            templateId: template.id,
            createdFromTemplate: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }

      if (shifts.length > 0) {
        await db.insert(generatedShifts).values(shifts);
        console.log(`Generated ${shifts.length} shifts from template ${template.id}`);
      }
    } catch (error) {
      console.error("Error generating shifts from template:", error);
      throw error;
    }
  }

  async function regenerateShiftsFromTemplate(template: any) {
    try {
      // Delete existing generated shifts for this template
      await db.delete(generatedShifts).where(eq(generatedShifts.templateId, template.id));
      
      // Generate new shifts
      await generateShiftsFromTemplate(template);
      console.log(`Regenerated shifts for template ${template.id}`);
    } catch (error) {
      console.error("Error regenerating shifts from template:", error);
      throw error;
    }
  }

  // Temporarily disable WebSocket setup to resolve connection issues
  const server = createServer(app);
  
  // Note: WebSocket functionality disabled due to connection conflicts
  // TODO: Re-enable WebSocket connections after resolving Vite dev server conflicts
  
  return server;
}