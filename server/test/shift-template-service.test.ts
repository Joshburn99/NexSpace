import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { db } from "../db";
import { shiftTemplates, generatedShifts } from "@shared/schema";
import { shiftTemplateService } from "../shift-template-service";
import { eq } from "drizzle-orm";

describe("ShiftTemplateService", () => {
  let testTemplateId: number;

  beforeEach(async () => {
    // Clean up any existing test data
    await db.delete(generatedShifts).where(eq(generatedShifts.templateId, 99999));
    await db.delete(shiftTemplates).where(eq(shiftTemplates.id, 99999));

    // Create a test template
    const [template] = await db
      .insert(shiftTemplates)
      .values({
        id: 99999,
        name: "Test Template",
        department: "Test Dept",
        specialty: "Test Specialty",
        facilityId: 1,
        facilityName: "Test Facility",
        minStaff: 2,
        maxStaff: 4,
        shiftType: "day",
        startTime: "08:00",
        endTime: "16:00",
        daysOfWeek: [1, 2, 3, 4, 5], // Mon-Fri
        isActive: true,
        hourlyRate: 25,
        daysPostedOut: 14,
      })
      .returning();

    testTemplateId = template.id;
  });

  afterEach(async () => {
    // Clean up test data
    await db.delete(generatedShifts).where(eq(generatedShifts.templateId, testTemplateId));
    await db.delete(shiftTemplates).where(eq(shiftTemplates.id, testTemplateId));
  });

  describe("generateShiftsFromTemplate", () => {
    it("should generate shifts for specified date range", async () => {
      const startDate = new Date("2025-02-01");
      const endDate = new Date("2025-02-07");

      const shifts = await shiftTemplateService.generateShiftsFromTemplate({
        templateId: testTemplateId,
        startDate,
        endDate,
      });

      // Should generate shifts for Mon-Fri (5 days) x 2 staff minimum = 10 shifts
      expect(shifts.length).toBe(10);

      // Verify shift properties
      const firstShift = shifts[0];
      expect(firstShift.templateId).toBe(testTemplateId);
      expect(firstShift.startTime).toBe("08:00");
      expect(firstShift.endTime).toBe("16:00");
      expect(firstShift.status).toBe("open");
    });

    it("should not create duplicate shifts when run twice", async () => {
      const startDate = new Date("2025-02-01");
      const endDate = new Date("2025-02-07");

      // Generate shifts first time
      const firstRun = await shiftTemplateService.generateShiftsFromTemplate({
        templateId: testTemplateId,
        startDate,
        endDate,
      });

      // Generate shifts second time
      const secondRun = await shiftTemplateService.generateShiftsFromTemplate({
        templateId: testTemplateId,
        startDate,
        endDate,
      });

      // Second run should not create any new shifts
      expect(secondRun.length).toBe(0);

      // Verify total shifts in database
      const totalShifts = await db
        .select()
        .from(generatedShifts)
        .where(eq(generatedShifts.templateId, testTemplateId));

      expect(totalShifts.length).toBe(firstRun.length);
    });

    it("should skip weekends when template specifies weekdays only", async () => {
      const startDate = new Date("2025-02-01"); // Saturday
      const endDate = new Date("2025-02-02"); // Sunday

      const shifts = await shiftTemplateService.generateShiftsFromTemplate({
        templateId: testTemplateId,
        startDate,
        endDate,
      });

      // Should not generate any shifts for weekend
      expect(shifts.length).toBe(0);
    });

    it("should generate correct number of positions based on minStaff", async () => {
      const startDate = new Date("2025-02-03"); // Monday
      const endDate = new Date("2025-02-03"); // Same day

      const shifts = await shiftTemplateService.generateShiftsFromTemplate({
        templateId: testTemplateId,
        startDate,
        endDate,
      });

      // Should generate 2 shifts (minStaff = 2)
      expect(shifts.length).toBe(2);

      // Check shift positions
      expect(shifts[0].shiftPosition).toBe(0);
      expect(shifts[1].shiftPosition).toBe(1);
    });
  });

  describe("updateTemplate", () => {
    it("should update template and regenerate future shifts", async () => {
      // Generate some initial shifts
      const today = new Date();
      const futureDate = new Date(today);
      futureDate.setDate(today.getDate() + 7);

      await shiftTemplateService.generateShiftsFromTemplate({
        templateId: testTemplateId,
        startDate: today,
        endDate: futureDate,
      });

      // Update template
      const updatedTemplate = await shiftTemplateService.updateTemplate({
        templateId: testTemplateId,
        updates: {
          hourlyRate: 30,
          minStaff: 3,
        },
        regenerateFuture: true,
      });

      expect(updatedTemplate.hourlyRate).toBe("30");
      expect(updatedTemplate.minStaff).toBe(3);

      // Verify future shifts were regenerated with new settings
      const futureShifts = await db
        .select()
        .from(generatedShifts)
        .where(eq(generatedShifts.templateId, testTemplateId));

      // All shifts should have the new hourly rate
      futureShifts.forEach((shift) => {
        expect(shift.hourlyRate).toBe("30");
      });
    });

    it("should preserve assigned shifts when regenerating", async () => {
      // Generate a shift
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const shifts = await shiftTemplateService.generateShiftsFromTemplate({
        templateId: testTemplateId,
        startDate: tomorrow,
        endDate: tomorrow,
      });

      // Assign staff to one shift
      await db
        .update(generatedShifts)
        .set({
          status: "filled",
          assignedStaffIds: [123],
        })
        .where(eq(generatedShifts.id, shifts[0].id));

      // Update template with regeneration
      await shiftTemplateService.updateTemplate({
        templateId: testTemplateId,
        updates: { hourlyRate: 35 },
        regenerateFuture: true,
      });

      // Check that assigned shift was preserved
      const [assignedShift] = await db
        .select()
        .from(generatedShifts)
        .where(eq(generatedShifts.id, shifts[0].id));

      expect(assignedShift).toBeDefined();
      expect(assignedShift.status).toBe("filled");
      expect(assignedShift.assignedStaffIds).toEqual([123]);
    });
  });

  describe("removeDuplicateShifts", () => {
    it("should remove duplicate shifts keeping the oldest", async () => {
      const date = "2025-02-10";

      // Create duplicate shifts manually
      await db.insert(generatedShifts).values([
        {
          uniqueId: `${testTemplateId}-${date}-0-dup1`,
          templateId: testTemplateId,
          title: "Duplicate 1",
          date,
          startTime: "08:00",
          endTime: "16:00",
          department: "Test",
          specialty: "Test",
          facilityId: 1,
          facilityName: "Test",
          shiftPosition: 0,
        },
        {
          uniqueId: `${testTemplateId}-${date}-0-dup2`,
          templateId: testTemplateId,
          title: "Duplicate 2",
          date,
          startTime: "08:00",
          endTime: "16:00",
          department: "Test",
          specialty: "Test",
          facilityId: 1,
          facilityName: "Test",
          shiftPosition: 0,
        },
      ]);

      const removedCount = await shiftTemplateService.removeDuplicateShifts(testTemplateId);

      expect(removedCount).toBe(1);

      // Verify only one shift remains
      const remainingShifts = await db
        .select()
        .from(generatedShifts)
        .where(eq(generatedShifts.templateId, testTemplateId));

      expect(remainingShifts.length).toBe(1);
    });
  });

  describe("validateShiftTiming", () => {
    it("should fix shifts on wrong days", async () => {
      // Create a shift on Sunday when template only allows Mon-Fri
      await db.insert(generatedShifts).values({
        uniqueId: `${testTemplateId}-2025-02-02-0`,
        templateId: testTemplateId,
        title: "Wrong Day Shift",
        date: "2025-02-02", // Sunday
        startTime: "08:00",
        endTime: "16:00",
        department: "Test",
        specialty: "Test",
        facilityId: 1,
        facilityName: "Test",
        shiftPosition: 0,
      });

      const result = await shiftTemplateService.validateShiftTiming(testTemplateId);

      expect(result.fixed).toBe(1);
      expect(result.issues.length).toBe(1);
      expect(result.issues[0]).toContain("wrong day of week");
    });

    it("should fix shifts with incorrect times", async () => {
      // Create a shift with wrong times
      await db.insert(generatedShifts).values({
        uniqueId: `${testTemplateId}-2025-02-03-0`,
        templateId: testTemplateId,
        title: "Wrong Time Shift",
        date: "2025-02-03", // Monday
        startTime: "09:00", // Wrong start time
        endTime: "17:00", // Wrong end time
        department: "Test",
        specialty: "Test",
        facilityId: 1,
        facilityName: "Test",
        shiftPosition: 0,
      });

      const result = await shiftTemplateService.validateShiftTiming(testTemplateId);

      expect(result.fixed).toBe(1);
      expect(result.issues.length).toBe(1);
      expect(result.issues[0]).toContain("incorrect times");

      // Verify times were fixed
      const [fixedShift] = await db
        .select()
        .from(generatedShifts)
        .where(eq(generatedShifts.templateId, testTemplateId));

      expect(fixedShift.startTime).toBe("08:00");
      expect(fixedShift.endTime).toBe("16:00");
    });
  });

  describe("getShiftsToGenerate", () => {
    it("should identify missing shifts", async () => {
      // Generate shifts for only first 3 days
      const startDate = new Date();
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 2);

      await shiftTemplateService.generateShiftsFromTemplate({
        templateId: testTemplateId,
        startDate,
        endDate,
      });

      // Check what shifts need to be generated for next 30 days
      const missing = await shiftTemplateService.getShiftsToGenerate(30);

      // Find our test template in results
      const testTemplateMissing = missing.find((m) => m.template.id === testTemplateId);

      expect(testTemplateMissing).toBeDefined();
      expect(testTemplateMissing!.dates.length).toBeGreaterThan(0);
    });
  });
});
