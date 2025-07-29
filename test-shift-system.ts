/**
 * Comprehensive Shift System Test
 * Tests the entire shift workflow from templates to calendar display
 */

import { regenerateAllActiveTemplateShifts } from "./server/fix-shift-generation";
import { db } from "./server/db";
import { shiftTemplates, generatedShifts, shifts } from "./shared/schema";
import { eq } from "drizzle-orm";

async function testShiftSystem() {
  console.log("🔍 TESTING SHIFT SYSTEM COMPREHENSIVE AUDIT");
  console.log("=" * 60);

  try {
    // 1. Check active templates
    const activeTemplates = await db
      .select()
      .from(shiftTemplates)
      .where(eq(shiftTemplates.isActive, true));
    
    console.log(`📋 Active Templates: ${activeTemplates.length}`);
    activeTemplates.forEach(template => {
      console.log(`  - ${template.name} (${template.specialty}) - Facility ${template.facilityId}`);
      console.log(`    Days: ${JSON.stringify(template.daysOfWeek)} | Time: ${template.startTime}-${template.endTime}`);
      console.log(`    Staff: ${template.minStaff}-${template.maxStaff} | Generated: ${template.generatedShiftsCount || 0}`);
    });

    // 2. Check current database state
    const currentGeneratedShifts = await db.select().from(generatedShifts);
    const currentManualShifts = await db.select().from(shifts);
    
    console.log(`\n📊 Current Database State:`);
    console.log(`  Generated Shifts: ${currentGeneratedShifts.length}`);
    console.log(`  Manual Shifts: ${currentManualShifts.length}`);

    // 3. Run shift regeneration
    console.log(`\n🔧 Running Shift Regeneration...`);
    const result = await regenerateAllActiveTemplateShifts();
    
    console.log(`\n✅ Regeneration Result:`);
    console.log(`  Success: ${result.success}`);
    console.log(`  Message: ${result.message}`);
    console.log(`  Shifts Generated: ${result.shiftsGenerated}`);
    console.log(`  Templates Processed: ${result.templatesProcessed}`);

    // 4. Check updated database state
    const updatedGeneratedShifts = await db.select().from(generatedShifts);
    const recentShifts = updatedGeneratedShifts.filter(shift => {
      const shiftDate = new Date(shift.date);
      const today = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(today.getDate() + 30);
      return shiftDate >= today && shiftDate <= thirtyDaysFromNow;
    });

    console.log(`\n📈 Updated Database State:`);
    console.log(`  Total Generated Shifts: ${updatedGeneratedShifts.length}`);
    console.log(`  Recent/Future Shifts (next 30 days): ${recentShifts.length}`);

    // 5. Show sample of recent shifts
    console.log(`\n📅 Sample Recent Shifts:`);
    recentShifts.slice(0, 5).forEach(shift => {
      console.log(`  - ${shift.title} | ${shift.date} ${shift.startTime}-${shift.endTime}`);
      console.log(`    ${shift.specialty} at ${shift.facilityName} | Status: ${shift.status}`);
    });

    // 6. Group by facility for analysis
    const shiftsByFacility = recentShifts.reduce((acc, shift) => {
      const facilityId = shift.facilityId || 0;
      if (!acc[facilityId]) acc[facilityId] = [];
      acc[facilityId].push(shift);
      return acc;
    }, {} as Record<number, any[]>);

    console.log(`\n🏥 Shifts by Facility:`);
    Object.entries(shiftsByFacility).forEach(([facilityId, shifts]) => {
      const facilityName = shifts[0]?.facilityName || `Facility ${facilityId}`;
      console.log(`  ${facilityName}: ${shifts.length} shifts`);
    });

    console.log(`\n✅ SHIFT SYSTEM TEST COMPLETE`);
    console.log(`Calendar should now show ${recentShifts.length} shifts`);

  } catch (error) {
    console.error("❌ SHIFT SYSTEM TEST FAILED:", error);
  }
}

// Run the test
testShiftSystem().then(() => {
  console.log("\n🎯 Test completed. Check calendar for results.");
  process.exit(0);
}).catch(error => {
  console.error("Test failed:", error);
  process.exit(1);
});