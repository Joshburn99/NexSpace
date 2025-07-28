// Comprehensive backend tests for shift template save/edit/generation workflows
import { db } from "./db";
import { shiftTemplates, generatedShifts, facilities } from "@shared/schema";
import { eq } from "drizzle-orm";

interface TestShiftTemplate {
  name: string;
  department: string;
  specialty: string;
  facilityId: number;
  facilityName: string;
  minStaff: number;
  maxStaff: number;
  shiftType: string;
  startTime: string;
  endTime: string;
  daysOfWeek: number[];
  isActive: boolean;
  hourlyRate: number;
  daysPostedOut: number;
  notes?: string;
}

interface TestResult {
  success: boolean;
  message: string;
  data?: any;
  error?: any;
}

export class ShiftTemplateTestSuite {
  // Test 1: Create new shift template with enhanced facility integration
  async testCreateTemplate(): Promise<TestResult> {
    try {

      const testTemplate: TestShiftTemplate = {
        name: "Test ICU Day Shift",
        department: "ICU",
        specialty: "Registered Nurse",
        facilityId: 1,
        facilityName: "Portland General Hospital",
        minStaff: 2,
        maxStaff: 4,
        shiftType: "day",
        startTime: "07:00",
        endTime: "19:00",
        daysOfWeek: [1, 2, 3, 4, 5], // Mon-Fri
        isActive: true,
        hourlyRate: 45.0,
        daysPostedOut: 14,
        notes: "Test template for ICU coverage",
      };

      const [createdTemplate] = await db.insert(shiftTemplates).values(testTemplate).returning();

      if (!createdTemplate || !createdTemplate.id) {
        return {
          success: false,
          message: "Failed to create template - no ID returned",
        };
      }

      return {
        success: true,
        message: "Template created successfully",
        data: createdTemplate,
      };
    } catch (error) {
      console.error("❌ Template creation failed:", error);
      return {
        success: false,
        message: "Template creation failed",
        error: error,
      };
    }
  }

  // Test 2: Update existing template
  async testUpdateTemplate(templateId: number): Promise<TestResult> {
    try {

      const updates = {
        name: "Updated ICU Day Shift",
        hourlyRate: 48.0,
        maxStaff: 5,
        notes: "Updated template with enhanced facility data",
        updatedAt: new Date(),
      };

      const [updatedTemplate] = await db
        .update(shiftTemplates)
        .set(updates)
        .where(eq(shiftTemplates.id, templateId))
        .returning();

      if (!updatedTemplate) {
        return {
          success: false,
          message: "Template not found for update",
        };
      }

      return {
        success: true,
        message: "Template updated successfully",
        data: updatedTemplate,
      };
    } catch (error) {
      console.error(`❌ Template update failed:`, error);
      return {
        success: false,
        message: "Template update failed",
        error: error,
      };
    }
  }

  // Test 3: Generate shifts from template
  async testGenerateShiftsFromTemplate(templateId: number): Promise<TestResult> {
    try {

      // Get the template
      const [template] = await db
        .select()
        .from(shiftTemplates)
        .where(eq(shiftTemplates.id, templateId));

      if (!template) {
        return {
          success: false,
          message: "Template not found",
        };
      }

      // Generate shifts for the next 7 days
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(startDate.getDate() + 7);

      const generatedShiftsData = [];
      const currentDate = new Date(startDate);

      while (currentDate <= endDate) {
        const dayOfWeek = currentDate.getDay();

        if (template.daysOfWeek.includes(dayOfWeek)) {
          const shiftData = {
            templateId: template.id,
            title: template.name,
            department: template.department,
            specialty: template.specialty,
            facilityId: template.facilityId,
            facilityName: template.facilityName,
            date: currentDate.toISOString().split("T")[0],
            startTime: template.startTime,
            endTime: template.endTime,
            requiredStaff: template.minStaff,
            hourlyRate: template.hourlyRate,
            status: "open" as const,
            urgency: "medium" as const,
            description: `Generated from template: ${template.name}`,
            assignedStaffIds: [] as number[],
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          generatedShiftsData.push(shiftData);
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Insert generated shifts
      if (generatedShiftsData.length > 0) {
        const insertedShifts = await db
          .insert(generatedShifts)
          .values(generatedShiftsData)
          .returning();

        // Update template with generated shift count
        await db
          .update(shiftTemplates)
          .set({
            generatedShiftsCount: (template.generatedShiftsCount || 0) + insertedShifts.length,
            updatedAt: new Date(),
          })
          .where(eq(shiftTemplates.id, templateId));

        return {
          success: true,
          message: `Generated ${insertedShifts.length} shifts successfully`,
          data: insertedShifts,
        };
      } else {
        return {
          success: false,
          message: "No shifts generated - check days of week configuration",
        };
      }
    } catch (error) {
      console.error(`❌ Shift generation failed:`, error);
      return {
        success: false,
        message: "Shift generation failed",
        error: error,
      };
    }
  }

  // Test 4: Validate enhanced facility integration
  async testFacilityIntegration(): Promise<TestResult> {
    try {

      // Get templates with facility data
      const templatesWithFacilities = await db
        .select({
          template: shiftTemplates,
          facility: facilities,
        })
        .from(shiftTemplates)
        .leftJoin(facilities, eq(shiftTemplates.facilityId, facilities.id))
        .limit(5);

      if (templatesWithFacilities.length === 0) {
        return {
          success: false,
          message: "No templates found with facility data",
        };
      }

      // Validate facility data consistency
      let consistencyErrors = 0;
      for (const row of templatesWithFacilities) {
        if (row.facility && row.template.facilityName !== row.facility.name) {
          consistencyErrors++;
          console.warn(
            `⚠️ Facility name mismatch: Template "${row.template.facilityName}" vs Facility "${row.facility.name}"`
          );
        }
      }

      if (consistencyErrors > 0) {
        return {
          success: false,
          message: `Found ${consistencyErrors} facility data inconsistencies`,
        };
      }

        `✅ Facility integration validated for ${templatesWithFacilities.length} templates`
      );
      return {
        success: true,
        message: "Enhanced facility integration working correctly",
        data: templatesWithFacilities,
      };
    } catch (error) {
      console.error(`❌ Facility integration test failed:`, error);
      return {
        success: false,
        message: "Facility integration test failed",
        error: error,
      };
    }
  }

  // Test 5: Template deletion with cascading
  async testDeleteTemplate(templateId: number): Promise<TestResult> {
    try {

      // Count associated generated shifts before deletion
      const shiftsToDelete = await db
        .select()
        .from(generatedShifts)
        .where(eq(generatedShifts.templateId, templateId));

      // Delete associated generated shifts first
      await db.delete(generatedShifts).where(eq(generatedShifts.templateId, templateId));

      // Delete the template
      const deletedTemplate = await db
        .delete(shiftTemplates)
        .where(eq(shiftTemplates.id, templateId))
        .returning();

      if (deletedTemplate.length === 0) {
        return {
          success: false,
          message: "Template not found for deletion",
        };
      }

      return {
        success: true,
        message: `Template and ${shiftsToDelete.length} associated shifts deleted successfully`,
        data: { deletedTemplate: deletedTemplate[0], deletedShifts: shiftsToDelete.length },
      };
    } catch (error) {
      console.error(`❌ Template deletion failed:`, error);
      return {
        success: false,
        message: "Template deletion failed",
        error: error,
      };
    }
  }

  // Run comprehensive test suite
  async runAllTests(): Promise<void> {

    const results: TestResult[] = [];
    let templateId: number | null = null;

    // Test 1: Create template
    const createResult = await this.testCreateTemplate();
    results.push(createResult);
    if (createResult.success && createResult.data) {
      templateId = createResult.data.id;
    }

    if (templateId) {
      // Test 2: Update template
      const updateResult = await this.testUpdateTemplate(templateId);
      results.push(updateResult);

      // Test 3: Generate shifts
      const generateResult = await this.testGenerateShiftsFromTemplate(templateId);
      results.push(generateResult);

      // Test 4: Facility integration
      const facilityResult = await this.testFacilityIntegration();
      results.push(facilityResult);

      // Test 5: Delete template (cleanup)
      const deleteResult = await this.testDeleteTemplate(templateId);
      results.push(deleteResult);
    }

    // Summary
    const passed = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;


    if (failed > 0) {
      results.forEach((result, index) => {
        if (!result.success) {
          if (result.error) {
          }
        }
      });
    }

  }
}

// Export test runner function
export async function runShiftTemplateTests(): Promise<void> {
  const testSuite = new ShiftTemplateTestSuite();
  await testSuite.runAllTests();
}

// Run tests if called directly
if (require.main === module) {
  runShiftTemplateTests().catch(console.error);
}
