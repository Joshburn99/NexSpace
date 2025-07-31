/**
 * Critical Fix: Template-based Shift Generation
 * Regenerates current and future shifts from active templates
 */

import { db } from "./db";
import { shiftTemplates, generatedShifts } from "../shared/schema";
import { eq, and, gte, lte } from "drizzle-orm";

interface GenerateShiftsResult {
  success: boolean;
  message: string;
  shiftsGenerated: number;
  templatesProcessed: number;
}

export async function regenerateAllActiveTemplateShifts(): Promise<GenerateShiftsResult> {
  try {

    // Get all active templates
    const activeTemplates = await db
      .select()
      .from(shiftTemplates)
      .where(eq(shiftTemplates.isActive, true));

    let totalShiftsGenerated = 0;
    let templatesProcessed = 0;

    for (const template of activeTemplates) {
      try {
        const shiftsGenerated = await generateShiftsForTemplate(template);
        totalShiftsGenerated += shiftsGenerated;
        templatesProcessed++;

      } catch (error) {

      }
    }

    return {
      success: true,
      message: `Successfully generated ${totalShiftsGenerated} shifts from ${templatesProcessed} active templates`,
      shiftsGenerated: totalShiftsGenerated,
      templatesProcessed
    };
  } catch (error) {

    return {
      success: false,
      message: `Failed to regenerate shifts: ${error}`,
      shiftsGenerated: 0,
      templatesProcessed: 0
    };
  }
}

async function generateShiftsForTemplate(template: any): Promise<number> {
  const today = new Date();
  const daysToGenerate = template.daysPostedOut || 30; // Generate 30 days in advance
  const endDate = new Date(today);
  endDate.setDate(today.getDate() + daysToGenerate);

  let shiftsGenerated = 0;
  const currentDate = new Date(today);

  while (currentDate <= endDate) {
    const dayOfWeek = currentDate.getDay();
    const dateStr = currentDate.toISOString().split("T")[0];

    // Check if this day is in the template's schedule
    if (template.daysOfWeek && template.daysOfWeek.includes(dayOfWeek)) {
      // Check if shifts already exist for this date
      const existingShifts = await db
        .select()
        .from(generatedShifts)
        .where(
          and(
            eq(generatedShifts.templateId, template.id),
            eq(generatedShifts.date, dateStr)
          )
        );

      // Generate the required number of shifts for this day
      const shiftsNeeded = template.minStaff || 1;
      const existingCount = existingShifts.length;
      
      for (let i = existingCount; i < shiftsNeeded; i++) {
        // Create unique ID for this shift  
        const uniqueId = `${template.id}-${dateStr}-${i}`;
        
        // Use actual database column names (snake_case)
        const shiftData = {
          id: uniqueId,
          template_id: template.id,
          title: template.name,
          date: dateStr,
          start_time: template.startTime,
          end_time: template.endTime,
          department: template.department,
          specialty: template.specialty,
          facility_id: template.facilityId,
          facility_name: template.facilityName || "Unknown Facility",
          building_id: template.buildingId || null,
          building_name: template.buildingName || null,
          status: "open",
          rate: template.hourlyRate || 40.0,
          urgency: "medium",
          description: template.notes || `${template.department} shift - ${template.name}`,
          required_workers: template.minStaff || 1,
          min_staff: template.minStaff || 1,
          max_staff: template.maxStaff || template.minStaff || 1,
          total_hours: calculateShiftHours(template.startTime, template.endTime),
          created_at: new Date(),
          updated_at: new Date(),
        };

        try {
          await db.insert(generatedShifts).values(shiftData).onConflictDoNothing();
          shiftsGenerated++;
        } catch (error) {

        }
      }
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Update the template's generated shifts count
  const totalCount = await db
    .select()
    .from(generatedShifts)
    .where(eq(generatedShifts.templateId, template.id));

  await db
    .update(shiftTemplates)
    .set({ 
      generatedShiftsCount: totalCount.length,
      updatedAt: new Date()
    })
    .where(eq(shiftTemplates.id, template.id));

  return shiftsGenerated;
}

function calculateShiftHours(startTime: string, endTime: string): number {
  const [startHour, startMin] = startTime.split(":").map(Number);
  const [endHour, endMin] = endTime.split(":").map(Number);

  let hours = endHour - startHour;
  let minutes = endMin - startMin;

  // Handle overnight shifts
  if (hours < 0) {
    hours += 24;
  }

  return hours + minutes / 60;
}