// Shift Templates API Routes
import { Router } from "express";
import { db } from "../db";
import { shifts, facilities } from "@shared/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { requireAuth } from "./auth.routes";
import { z } from "zod";
import { format, addDays, parseISO } from "date-fns";

// Define shift templates table for queries - matching actual database
const shiftTemplates = "shift_templates";

const router = Router();

// GET /api/shift-templates - List all shift templates
router.get("/api/shift-templates", requireAuth, async (req: any, res) => {
  try {
    const { facilityId, isActive } = req.query;
    
    let query = `
      SELECT 
        st.id,
        st.name,
        st.facility_id,
        st.facility_name,
        st.department,
        st.specialty as role_required,
        st.start_time,
        st.end_time,
        st.min_staff as required_staff,
        st.max_staff,
        st.shift_type,
        st.days_of_week,
        st.is_active,
        st.hourly_rate as rate,
        st.notes as description,
        st.created_at,
        st.updated_at,
        f.name as facility_name_join,
        f.timezone
      FROM shift_templates st
      LEFT JOIN facilities f ON st.facility_id = f.id
      WHERE 1=1
    `;
    
    const params = [];
    if (facilityId) {
      query += ` AND st.facility_id = $${params.length + 1}`;
      params.push(parseInt(facilityId));
    }
    if (isActive !== undefined) {
      query += ` AND st.is_active = $${params.length + 1}`;
      params.push(isActive === 'true');
    }
    
    query += ` ORDER BY st.facility_id, st.start_time`;
    
    const templates = await db.execute(sql.raw(query, params));

    const result = templates.rows.map((row: any) => ({
      id: row.id,
      facilityId: row.facility_id,
      facilityName: row.facility_name_join || row.facility_name || 'Unknown',
      roleRequired: row.role_required,
      startTime: row.start_time,
      endTime: row.end_time,
      timezone: row.timezone || 'America/New_York',
      rrule: row.days_of_week ? `FREQ=WEEKLY;BYDAY=${row.days_of_week.join(',')}` : null,
      startsOn: null,
      endsOn: null,
      isActive: row.is_active,
      requiredStaff: row.required_staff || 1,
      department: row.department,
      description: row.description,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));

    res.json(result);
  } catch (error) {
    console.error("Failed to fetch shift templates:", error);
    res.status(500).json({ error: "Failed to fetch shift templates" });
  }
});

// POST /api/shift-templates - Create a new shift template
router.post("/api/shift-templates", requireAuth, async (req: any, res) => {
  try {
    const validatedData = req.body;
    
    // Insert using raw SQL since we don't have the shiftTemplates table defined in schema
    const result = await db.execute(sql`
      INSERT INTO shift_templates (
        name, facility_id, facility_name, department, specialty,
        start_time, end_time, min_staff, max_staff, shift_type,
        days_of_week, is_active, hourly_rate, notes, created_at, updated_at
      ) VALUES (
        ${validatedData.name}, ${validatedData.facilityId}, ${validatedData.facilityName},
        ${validatedData.department}, ${validatedData.specialty}, ${validatedData.startTime},
        ${validatedData.endTime}, ${validatedData.minStaff || 1}, ${validatedData.maxStaff || 5},
        ${validatedData.shiftType || 'regular'}, ${JSON.stringify(validatedData.daysOfWeek || [])},
        ${validatedData.isActive !== false}, ${validatedData.hourlyRate || 60},
        ${validatedData.notes || ''}, NOW(), NOW()
      ) RETURNING *
    `);
    
    const newTemplate = result.rows[0];

    res.status(201).json(newTemplate);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid template data", details: error.errors });
    }
    console.error("Failed to create shift template:", error);
    res.status(500).json({ error: "Failed to create shift template" });
  }
});

// PATCH /api/shift-templates/:id - Update a shift template
router.patch("/api/shift-templates/:id", requireAuth, async (req: any, res) => {
  try {
    const templateId = parseInt(req.params.id);
    const updates = req.body;
    
    // Update using raw SQL
    const updateFields = [];
    const params = [];
    let paramIndex = 1;
    
    Object.entries(updates).forEach(([key, value]) => {
      if (key !== 'id') {
        updateFields.push(`${key} = $${paramIndex}`);
        params.push(value);
        paramIndex++;
      }
    });
    
    if (updateFields.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }
    
    updateFields.push(`updated_at = NOW()`);
    params.push(templateId);
    
    const result = await db.execute(sql.raw(`
      UPDATE shift_templates
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `, params));
    
    const updatedTemplate = result.rows[0];

    if (!updatedTemplate) {
      return res.status(404).json({ error: "Template not found" });
    }

    res.json(updatedTemplate);
  } catch (error) {
    console.error("Failed to update shift template:", error);
    res.status(500).json({ error: "Failed to update shift template" });
  }
});

// DELETE /api/shift-templates/:id - Delete a shift template
router.delete("/api/shift-templates/:id", requireAuth, async (req: any, res) => {
  try {
    const templateId = parseInt(req.params.id);
    
    await db.execute(sql`
      DELETE FROM shift_templates WHERE id = ${templateId}
    `);

    res.json({ message: "Template deleted successfully" });
  } catch (error) {
    console.error("Failed to delete shift template:", error);
    res.status(500).json({ error: "Failed to delete shift template" });
  }
});

// POST /api/shift-templates/apply - Apply templates to generate shifts
router.post("/api/shift-templates/apply", requireAuth, async (req: any, res) => {
  try {
    const { days = 21 } = req.body;
    const startDate = new Date();
    const endDate = addDays(startDate, days);
    
    console.log(`📅 Applying shift templates for ${days} days from ${format(startDate, 'yyyy-MM-dd')} to ${format(endDate, 'yyyy-MM-dd')}`);

    // Get all active templates
    const activeTemplates = await db
      .select()
      .from(shiftTemplates)
      .where(eq(shiftTemplates.isActive, true));

    console.log(`Found ${activeTemplates.length} active templates`);

    let created = 0;
    let skipped = 0;
    const shiftsToCreate = [];

    for (const template of activeTemplates) {
      // Get facility info
      const [facility] = await db
        .select()
        .from(facilities)
        .where(eq(facilities.id, template.facilityId))
        .limit(1);

      // Generate shifts for each day in range
      let currentDate = new Date(startDate);
      
      while (currentDate <= endDate) {
        const dateStr = format(currentDate, 'yyyy-MM-dd');
        
        // Check if template should apply on this date
        if (template.startsOn && currentDate < new Date(template.startsOn)) {
          currentDate = addDays(currentDate, 1);
          continue;
        }
        if (template.endsOn && currentDate > new Date(template.endsOn)) {
          break;
        }

        // Simple daily recurrence for now (can be enhanced with rrule parsing)
        // Check if shift already exists for this template and date
        const existingShift = await db
          .select()
          .from(shifts)
          .where(and(
            eq(shifts.facilityId, template.facilityId),
            eq(shifts.date, dateStr),
            eq(shifts.startTime, template.startTime),
            eq(shifts.specialty, template.roleRequired)
          ))
          .limit(1);

        if (existingShift.length > 0) {
          skipped++;
        } else {
          shiftsToCreate.push({
            facilityId: template.facilityId,
            facilityName: facility?.name || 'Unknown',
            date: dateStr,
            startTime: template.startTime,
            endTime: template.endTime,
            department: template.department || 'General',
            specialty: template.roleRequired,
            requiredStaff: template.requiredStaff || 1,
            assignedStaffIds: [],
            status: 'open',
            shiftType: 'regular',
            title: `${template.roleRequired} - ${facility?.name || 'Facility'}`,
            rate: template.rate?.toString() || '60',
            urgency: 'normal',
            description: template.description || `Shift from template #${template.id}`,
            createdById: req.user.id,
            createdAt: new Date(),
            updatedAt: new Date()
          });
          created++;
        }

        currentDate = addDays(currentDate, 1);
      }
    }

    // Insert all new shifts in batch
    if (shiftsToCreate.length > 0) {
      const batchSize = 100;
      for (let i = 0; i < shiftsToCreate.length; i += batchSize) {
        const batch = shiftsToCreate.slice(i, i + batchSize);
        await db.insert(shifts).values(batch);
      }
    }

    const result = {
      created,
      skipped,
      range: {
        start: format(startDate, 'yyyy-MM-dd'),
        end: format(endDate, 'yyyy-MM-dd')
      },
      message: `Successfully applied templates: ${created} shifts created, ${skipped} skipped (already exist)`
    };

    console.log('✅ Template application result:', result);
    res.json(result);
  } catch (error) {
    console.error("Failed to apply shift templates:", error);
    res.status(500).json({ error: "Failed to apply shift templates" });
  }
});

export default router;