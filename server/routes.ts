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
  shifts,
  generatedShifts,
  shiftTemplates,
  facilities,
  users,
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
          id: `shift-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
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

  // WebSocket setup
  const server = createServer(app);
  const wss = new WebSocketServer({ server });

  wss.on("connection", (ws: WebSocket) => {
    console.log("Client connected");
    ws.on("close", () => {
      console.log("Client disconnected");
    });
  });

  return server;
}