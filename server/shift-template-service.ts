import { db } from "./db";
import { shiftTemplates, generatedShifts, shifts } from "@shared/schema";
import { eq, and, gte, lte, inArray, sql } from "drizzle-orm";
import type { ShiftTemplate, GeneratedShift, InsertGeneratedShift } from "@shared/schema";

export interface GenerateShiftsOptions {
  templateId: number;
  startDate: Date;
  endDate: Date;
  skipExisting?: boolean;
  preserveAssigned?: boolean;
}

export interface UpdateTemplateOptions {
  templateId: number;
  updates: Partial<ShiftTemplate>;
  regenerateFuture?: boolean;
}

export class ShiftTemplateService {
  /**
   * Generate shifts from a template for a date range
   * Prevents duplicates by checking existing shifts
   */
  async generateShiftsFromTemplate(options: GenerateShiftsOptions): Promise<GeneratedShift[]> {
    const {
      templateId,
      startDate,
      endDate,
      skipExisting = true,
      preserveAssigned = true,
    } = options;

    // Get the template
    const [template] = await db
      .select()
      .from(shiftTemplates)
      .where(eq(shiftTemplates.id, templateId));

    if (!template || !template.isActive) {
      throw new Error("Template not found or inactive");
    }

    // Get existing shifts for this template in the date range
    const existingShifts = await db
      .select()
      .from(generatedShifts)
      .where(
        and(
          eq(generatedShifts.templateId, templateId),
          gte(generatedShifts.date, startDate.toISOString().split("T")[0]),
          lte(generatedShifts.date, endDate.toISOString().split("T")[0])
        )
      );

    const existingDates = new Set(existingShifts.map((s) => s.date));
    const shiftsToCreate: InsertGeneratedShift[] = [];

    // Generate shifts for each day in range
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();
      const dateStr = currentDate.toISOString().split("T")[0];

      // Check if this day is in the template's schedule
      if (template.daysOfWeek.includes(dayOfWeek)) {
        // Skip if we already have shifts for this date and skipExisting is true
        if (skipExisting && existingDates.has(dateStr)) {
          currentDate.setDate(currentDate.getDate() + 1);
          continue;
        }

        // Generate the required number of shifts for this day
        const shiftsNeeded = template.minStaff || 1;
        for (let i = 0; i < shiftsNeeded; i++) {
          // Create a unique deterministic ID to prevent duplicates
          const uniqueId = `${templateId}-${dateStr}-${i}`;

          // Check if this specific shift already exists
          const existingShift = existingShifts.find(
            (s) => s.date === dateStr && s.shiftPosition === i
          );

          if (!existingShift) {
            shiftsToCreate.push({
              templateId: template.id,
              title: template.name,
              department: template.department,
              specialty: template.specialty,
              facilityId: template.facilityId,
              facilityName: template.facilityName,
              date: dateStr,
              startTime: template.startTime,
              endTime: template.endTime,
              requiredStaff: template.minStaff,
              hourlyRate: template.hourlyRate,
              status: "open",
              urgency: "medium",
              description: `Generated from template: ${template.name}`,
              assignedStaffIds: [],
              shiftPosition: i, // Track which position this is (0, 1, 2, etc.)
              uniqueId: uniqueId,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }
        }
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Insert new shifts
    if (shiftsToCreate.length > 0) {
      const insertedShifts = await db
        .insert(generatedShifts)
        .values(shiftsToCreate)
        .onConflictDoNothing() // Prevent duplicates if unique constraint exists
        .returning();

      // Update template's generated shift count
      await db
        .update(shiftTemplates)
        .set({
          generatedShiftsCount: sql`${shiftTemplates.generatedShiftsCount} + ${insertedShifts.length}`,
          updatedAt: new Date(),
        })
        .where(eq(shiftTemplates.id, templateId));

      return insertedShifts;
    }

    return [];
  }

  /**
   * Update a template and optionally regenerate future shifts
   * Preserves past shifts and assigned future shifts
   */
  async updateTemplate(options: UpdateTemplateOptions): Promise<ShiftTemplate> {
    const { templateId, updates, regenerateFuture = true } = options;

    // Update the template
    const [updatedTemplate] = await db
      .update(shiftTemplates)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(shiftTemplates.id, templateId))
      .returning();

    if (!updatedTemplate) {
      throw new Error("Template not found");
    }

    // If requested, regenerate future unassigned shifts
    if (regenerateFuture) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Delete future unassigned shifts
      await db
        .delete(generatedShifts)
        .where(
          and(
            eq(generatedShifts.templateId, templateId),
            gte(generatedShifts.date, today.toISOString().split("T")[0]),
            eq(generatedShifts.status, "open"),
            sql`${generatedShifts.assignedStaffIds} = '[]'::jsonb`
          )
        );

      // Regenerate shifts for the next 30 days
      const endDate = new Date(today);
      endDate.setDate(today.getDate() + 30);

      await this.generateShiftsFromTemplate({
        templateId,
        startDate: today,
        endDate: endDate,
        skipExisting: true,
        preserveAssigned: true,
      });
    }

    return updatedTemplate;
  }

  /**
   * Check for and fix duplicate shifts
   * Returns the number of duplicates removed
   */
  async removeDuplicateShifts(templateId?: number): Promise<number> {
    // Find duplicates based on template, date, and position
    const duplicatesQuery = db
      .select({
        templateId: generatedShifts.templateId,
        date: generatedShifts.date,
        shiftPosition: generatedShifts.shiftPosition,
        count: sql<number>`count(*)`,
        keepId: sql<number>`min(${generatedShifts.id})`,
      })
      .from(generatedShifts)
      .groupBy(generatedShifts.templateId, generatedShifts.date, generatedShifts.shiftPosition)
      .having(sql`count(*) > 1`);

    if (templateId) {
      duplicatesQuery.where(eq(generatedShifts.templateId, templateId));
    }

    const duplicates = await duplicatesQuery;

    let totalDeleted = 0;
    for (const dup of duplicates) {
      // Delete all but the oldest shift
      const deleted = await db
        .delete(generatedShifts)
        .where(
          and(
            eq(generatedShifts.templateId, dup.templateId),
            eq(generatedShifts.date, dup.date),
            eq(generatedShifts.shiftPosition, dup.shiftPosition),
            sql`${generatedShifts.id} != ${dup.keepId}`
          )
        );

      totalDeleted += (dup.count as number) - 1;
    }

    return totalDeleted;
  }

  /**
   * Validate shift timing and fix any issues
   */
  async validateShiftTiming(templateId: number): Promise<{ fixed: number; issues: string[] }> {
    const issues: string[] = [];
    let fixed = 0;

    // Get all shifts for this template
    const templateShifts = await db
      .select()
      .from(generatedShifts)
      .where(eq(generatedShifts.templateId, templateId));

    // Get the template
    const [template] = await db
      .select()
      .from(shiftTemplates)
      .where(eq(shiftTemplates.id, templateId));

    if (!template) {
      throw new Error("Template not found");
    }

    for (const shift of templateShifts) {
      const shiftDate = new Date(shift.date);
      const dayOfWeek = shiftDate.getDay();

      // Check if shift is on wrong day
      if (!template.daysOfWeek.includes(dayOfWeek)) {
        issues.push(`Shift on ${shift.date} is on wrong day of week`);

        // Delete the incorrectly scheduled shift
        await db.delete(generatedShifts).where(eq(generatedShifts.id, shift.id));
        fixed++;
      }

      // Check if times match template
      if (shift.startTime !== template.startTime || shift.endTime !== template.endTime) {
        issues.push(`Shift on ${shift.date} has incorrect times`);

        // Update to correct times
        await db
          .update(generatedShifts)
          .set({
            startTime: template.startTime,
            endTime: template.endTime,
            updatedAt: new Date(),
          })
          .where(eq(generatedShifts.id, shift.id));
        fixed++;
      }
    }

    return { fixed, issues };
  }

  /**
   * Get upcoming shifts that need to be generated
   */
  async getShiftsToGenerate(
    daysAhead: number = 30
  ): Promise<{ template: ShiftTemplate; dates: string[] }[]> {
    const templates = await db
      .select()
      .from(shiftTemplates)
      .where(eq(shiftTemplates.isActive, true));

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + daysAhead);

    const result: { template: ShiftTemplate; dates: string[] }[] = [];

    for (const template of templates) {
      const existingShifts = await db
        .select()
        .from(generatedShifts)
        .where(
          and(
            eq(generatedShifts.templateId, template.id),
            gte(generatedShifts.date, today.toISOString().split("T")[0]),
            lte(generatedShifts.date, endDate.toISOString().split("T")[0])
          )
        );

      const existingDates = new Set(existingShifts.map((s) => s.date));
      const missingDates: string[] = [];

      const currentDate = new Date(today);
      while (currentDate <= endDate) {
        const dayOfWeek = currentDate.getDay();
        const dateStr = currentDate.toISOString().split("T")[0];

        if (template.daysOfWeek.includes(dayOfWeek) && !existingDates.has(dateStr)) {
          missingDates.push(dateStr);
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }

      if (missingDates.length > 0) {
        result.push({ template, dates: missingDates });
      }
    }

    return result;
  }
}

// Export singleton instance
export const shiftTemplateService = new ShiftTemplateService();
