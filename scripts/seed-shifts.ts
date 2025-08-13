#!/usr/bin/env tsx
// Seed shifts for testing the calendar
import { db } from "../server/db";
import { shifts, facilities } from "../shared/schema";
import { format, addDays, addHours } from "date-fns";

async function seedShifts() {
  try {
    console.log("🌱 Seeding shifts for calendar testing...");

    // Get facilities
    const allFacilities = await db.select().from(facilities).limit(5);
    
    if (allFacilities.length === 0) {
      console.error("❌ No facilities found. Please seed facilities first.");
      return;
    }

    const startDate = new Date("2025-08-01");
    const endDate = new Date("2025-09-30");
    const shiftsToCreate = [];
    
    // Create shifts for each facility
    for (const facility of allFacilities) {
      let currentDate = startDate;
      
      while (currentDate <= endDate) {
        // Morning shift (7 AM - 3 PM)
        shiftsToCreate.push({
          facilityId: facility.id,
          facilityName: facility.name,
          date: format(currentDate, "yyyy-MM-dd"),
          startTime: "07:00",
          endTime: "15:00",
          department: "General",
          specialty: "Registered Nurse",
          requiredStaff: 2,
          assignedStaffIds: [],
          status: "open",
          shiftType: "regular",
          title: `Morning Shift - ${facility.name}`,
          rate: "65",
          urgency: "normal",
          description: "Morning nursing shift",
          createdById: 1,
        });

        // Evening shift (3 PM - 11 PM)
        shiftsToCreate.push({
          facilityId: facility.id,
          facilityName: facility.name,
          date: format(currentDate, "yyyy-MM-dd"),
          startTime: "15:00",
          endTime: "23:00",
          department: "General",
          specialty: "Licensed Practical Nurse",
          requiredStaff: 1,
          assignedStaffIds: [],
          status: "open",
          shiftType: "regular",
          title: `Evening Shift - ${facility.name}`,
          rate: "55",
          urgency: "normal",
          description: "Evening nursing shift",
          createdById: 1,
        });

        // Night shift (11 PM - 7 AM) - every other day
        if (currentDate.getDay() % 2 === 0) {
          shiftsToCreate.push({
            facilityId: facility.id,
            facilityName: facility.name,
            date: format(currentDate, "yyyy-MM-dd"),
            startTime: "23:00",
            endTime: "07:00",
            department: "Emergency",
            specialty: "Certified Nursing Assistant",
            requiredStaff: 3,
            assignedStaffIds: [],
            status: "open",
            shiftType: "night",
            title: `Night Shift - ${facility.name}`,
            rate: "75",
            urgency: "urgent",
            description: "Night emergency shift",
            createdById: 1,
          });
        }

        currentDate = addDays(currentDate, 1);
      }
    }

    console.log(`📝 Creating ${shiftsToCreate.length} shifts...`);
    
    // Insert in batches
    const batchSize = 100;
    for (let i = 0; i < shiftsToCreate.length; i += batchSize) {
      const batch = shiftsToCreate.slice(i, i + batchSize);
      await db.insert(shifts).values(batch);
      console.log(`✅ Inserted batch ${Math.floor(i / batchSize) + 1}`);
    }

    console.log(`✅ Successfully created ${shiftsToCreate.length} shifts`);
    
    // Verify
    const count = await db.select({ count: shifts.id }).from(shifts);
    console.log(`📊 Total shifts in database: ${count.length}`);
    
  } catch (error) {
    console.error("❌ Error seeding shifts:", error);
    throw error;
  }
}

// Run if executed directly
seedShifts()
  .then(() => {
    console.log("✅ Seeding complete");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  });

export { seedShifts };