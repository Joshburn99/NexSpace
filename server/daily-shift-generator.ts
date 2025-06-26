
import { db } from "./db";
import { shiftTemplates, generatedShifts } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

export class DailyShiftGenerator {
  static async generateDailyShifts() {
    try {
      console.log('[DAILY GENERATOR] Starting daily shift generation...');
      
      // Get all active templates
      const activeTemplates = await db
        .select()
        .from(shiftTemplates)
        .where(eq(shiftTemplates.isActive, true));

      let totalGenerated = 0;

      for (const template of activeTemplates) {
        const generated = await this.generateShiftsForTemplate(template);
        totalGenerated += generated;
      }

      console.log(`[DAILY GENERATOR] Generated ${totalGenerated} shifts from ${activeTemplates.length} active templates`);
      return totalGenerated;
    } catch (error) {
      console.error('[DAILY GENERATOR] Error in daily shift generation:', error);
      throw error;
    }
  }

  static async generateShiftsForTemplate(template: any): Promise<number> {
    try {
      const today = new Date();
      const daysToGenerate = template.daysPostedOut || 7;
      let generatedCount = 0;

      // Check what's the furthest date we have shifts for this template
      const latestShift = await db
        .select({ date: generatedShifts.date })
        .from(generatedShifts)
        .where(eq(generatedShifts.templateId, template.id))
        .orderBy(sql`${generatedShifts.date} DESC`)
        .limit(1);

      let startDate = new Date(today);
      
      // If we have existing shifts, start from the day after the latest shift
      if (latestShift.length > 0) {
        const latestDate = new Date(latestShift[0].date);
        startDate = new Date(latestDate);
        startDate.setDate(latestDate.getDate() + 1);
      }

      // Generate shifts for the required number of days ahead
      const endDate = new Date(today);
      endDate.setDate(today.getDate() + daysToGenerate);

      for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
        // Check if this day is in the template's days of week
        if (template.daysOfWeek.includes(date.getDay())) {
          // Generate shifts for min staff requirement
          for (let staffPosition = 0; staffPosition < template.minStaff; staffPosition++) {
            const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
            const shiftId = `${template.id}${dateStr}${staffPosition.toString().padStart(2, '0')}`;
            
            // Check if shift already exists
            const existingShift = await db
              .select()
              .from(generatedShifts)
              .where(eq(generatedShifts.id, shiftId))
              .limit(1);
            
            if (existingShift.length === 0) {
              const shiftData = {
                id: shiftId,
                templateId: template.id,
                title: template.name,
                date: date.toISOString().split('T')[0],
                startTime: template.startTime,
                endTime: template.endTime,
                department: template.department,
                specialty: template.specialty,
                facilityId: template.facilityId,
                facilityName: template.facilityName,
                buildingId: template.buildingId || '',
                buildingName: template.buildingName || '',
                status: 'open' as const,
                rate: template.hourlyRate,
                urgency: 'medium' as const,
                description: template.notes || `${template.department} shift - ${template.name}`,
                requiredWorkers: template.minStaff,
                minStaff: template.minStaff,
                maxStaff: template.maxStaff,
                totalHours: this.calculateShiftHours(template.startTime, template.endTime)
              };

              await db.insert(generatedShifts).values(shiftData);
              generatedCount++;
            }
          }
        }
      }

      // Update template's generated shifts count
      if (generatedCount > 0) {
        await db
          .update(shiftTemplates)
          .set({ 
            generatedShiftsCount: sql`${shiftTemplates.generatedShiftsCount} + ${generatedCount}`,
            updatedAt: new Date()
          })
          .where(eq(shiftTemplates.id, template.id));
      }

      console.log(`[DAILY GENERATOR] Generated ${generatedCount} shifts for template "${template.name}"`);
      return generatedCount;
    } catch (error) {
      console.error(`[DAILY GENERATOR] Error generating shifts for template ${template.id}:`, error);
      return 0;
    }
  }

  static calculateShiftHours(startTime: string, endTime: string): number {
    const start = new Date(`2000-01-01T${startTime}`);
    let end = new Date(`2000-01-01T${endTime}`);
    
    // Handle overnight shifts
    if (end <= start) {
      end.setDate(end.getDate() + 1);
    }
    
    const diffMs = end.getTime() - start.getTime();
    return Math.round(diffMs / (1000 * 60 * 60));
  }

  // Manual regeneration for a specific template
  static async regenerateTemplate(templateId: number): Promise<number> {
    try {
      const [template] = await db
        .select()
        .from(shiftTemplates)
        .where(eq(shiftTemplates.id, templateId));

      if (!template) {
        throw new Error('Template not found');
      }

      if (!template.isActive) {
        throw new Error('Cannot regenerate shifts from inactive template');
      }

      // Delete existing future shifts for this template (keep past/current shifts)
      const today = new Date().toISOString().split('T')[0];
      await db
        .delete(generatedShifts)
        .where(
          sql`${generatedShifts.templateId} = ${templateId} AND ${generatedShifts.date} >= ${today}`
        );

      // Generate new shifts
      return await this.generateShiftsForTemplate(template);
    } catch (error) {
      console.error(`[DAILY GENERATOR] Error regenerating template ${templateId}:`, error);
      throw error;
    }
  }
}
