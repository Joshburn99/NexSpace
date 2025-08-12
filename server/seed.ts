import { db } from "./db";
import {
  users,
  facilities,
  staff,
  shifts,
  facilityRates,
  facilitySettings,
  permissions,
  rolePermissions,
} from "../shared/schema";
import bcrypt from "bcryptjs";
import { sql } from "drizzle-orm";

async function seed() {
  console.log("🌱 Starting database seed...");

  try {
    // Clear existing data (in reverse dependency order)
    console.log("🧹 Clearing existing data...");
    await db.delete(shifts);
    await db.delete(staff);
    await db.delete(facilityRates);
    await db.delete(facilitySettings);
    await db.delete(facilities);
    await db.delete(rolePermissions);
    await db.delete(permissions);
    await db.delete(users);

    // Create admin user
    console.log("👤 Creating admin user...");
    const hashedPassword = await bcrypt.hash("admin123", 10);
    const [adminUser] = await db
      .insert(users)
      .values({
        username: "joshburn",
        email: "admin@nexspace.com",
        password: hashedPassword,
        role: "super_admin",
        isActive: true,
        profileCompleted: true,
        onboardingStep: "completed",
      })
      .returning();

    console.log("✅ Admin user created:");
    console.log("   Username: joshburn");
    console.log("   Password: admin123");
    console.log("   Role: super_admin");

    // Create sample facilities
    console.log("🏥 Creating sample facilities...");
    const facilitiesData = [
      {
        name: "Central Medical Center",
        type: "hospital" as const,
        beds: 250,
        address: "123 Main St, New York, NY 10001",
        phone: "(212) 555-0100",
        email: "contact@centralmedical.com",
        status: "active" as const,
        taxId: "12-3456789",
        npiNumber: "1234567890",
      },
      {
        name: "Riverside Care Facility",
        type: "nursing_home" as const,
        beds: 120,
        address: "456 River Rd, Brooklyn, NY 11201",
        phone: "(718) 555-0200",
        email: "info@riversidecare.com",
        status: "active" as const,
        taxId: "98-7654321",
        npiNumber: "9876543210",
      },
      {
        name: "Sunset Rehabilitation Center",
        type: "rehabilitation" as const,
        beds: 80,
        address: "789 Sunset Blvd, Queens, NY 11101",
        phone: "(718) 555-0300",
        email: "admin@sunsetrehab.com",
        status: "active" as const,
        taxId: "45-1234567",
        npiNumber: "4567890123",
      },
    ];

    const insertedFacilities = await db
      .insert(facilities)
      .values(facilitiesData)
      .returning();

    // Create facility rates and settings for each facility
    for (const facility of insertedFacilities) {
      await db.insert(facilityRates).values({
        facilityId: facility.id,
        baseHourlyRate: 35.0,
        overtimeRate: 52.5,
        weekendRate: 42.0,
        holidayRate: 70.0,
        nightDifferential: 5.0,
        specialtyRates: {
          "Registered Nurse": 45.0,
          "Licensed Practical Nurse": 32.0,
          "Certified Nursing Assistant": 20.0,
          "Physical Therapist": 55.0,
        },
        floatPoolMargins: {
          "Registered Nurse": 15.0,
          "Licensed Practical Nurse": 10.0,
          "Certified Nursing Assistant": 8.0,
        },
        effectiveDate: new Date(),
      });

      await db.insert(facilitySettings).values({
        facilityId: facility.id,
        shiftDuration: 8,
        overtimeThreshold: 40,
        requiresCredentialVerification: true,
        autoApproveShifts: false,
        allowSelfScheduling: true,
        maxConsecutiveShifts: 5,
        minHoursBetweenShifts: 8,
        enableFloatPool: true,
        workflowAutomation: {
          autoApproveShifts: false,
          autoNotifyManagers: true,
          autoGenerateInvoices: false,
          requireManagerApproval: true,
          enableOvertimeAlerts: true,
          autoAssignBySpecialty: true,
        },
      });
    }

    // Create sample staff members
    console.log("👥 Creating sample staff members...");
    const staffData = [
      {
        firstName: "Sarah",
        lastName: "Johnson",
        email: "sarah.johnson@example.com",
        phone: "(555) 123-4567",
        role: "internal_employee" as const,
        specialty: "Registered Nurse",
        licenseNumber: "RN123456",
        hourlyRate: 45.0,
        isActive: true,
        facilityId: insertedFacilities[0].id,
      },
      {
        firstName: "Michael",
        lastName: "Chen",
        email: "michael.chen@example.com",
        phone: "(555) 234-5678",
        role: "contractor_1099" as const,
        specialty: "Physical Therapist",
        licenseNumber: "PT789012",
        hourlyRate: 55.0,
        isActive: true,
        facilityId: insertedFacilities[0].id,
      },
      {
        firstName: "Emily",
        lastName: "Rodriguez",
        email: "emily.rodriguez@example.com",
        phone: "(555) 345-6789",
        role: "internal_employee" as const,
        specialty: "Licensed Practical Nurse",
        licenseNumber: "LPN456789",
        hourlyRate: 32.0,
        isActive: true,
        facilityId: insertedFacilities[1].id,
      },
      {
        firstName: "David",
        lastName: "Thompson",
        email: "david.thompson@example.com",
        phone: "(555) 456-7890",
        role: "internal_employee" as const,
        specialty: "Certified Nursing Assistant",
        licenseNumber: "CNA789456",
        hourlyRate: 20.0,
        isActive: true,
        facilityId: insertedFacilities[1].id,
      },
      {
        firstName: "Jessica",
        lastName: "Williams",
        email: "jessica.williams@example.com",
        phone: "(555) 567-8901",
        role: "contractor_1099" as const,
        specialty: "Registered Nurse",
        licenseNumber: "RN987654",
        hourlyRate: 48.0,
        isActive: true,
        facilityId: insertedFacilities[2].id,
      },
    ];

    const insertedStaff = await db.insert(staff).values(staffData).returning();

    // Create sample shifts
    console.log("📅 Creating sample shifts...");
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const shiftsData = [
      {
        facilityId: insertedFacilities[0].id,
        department: "Emergency",
        shiftType: "day" as const,
        startTime: new Date(tomorrow.setHours(7, 0, 0, 0)),
        endTime: new Date(tomorrow.setHours(15, 0, 0, 0)),
        requiredStaff: 3,
        requiredSpecialty: "Registered Nurse",
        hourlyRate: 45.0,
        status: "open" as const,
        urgent: true,
      },
      {
        facilityId: insertedFacilities[0].id,
        department: "ICU",
        shiftType: "night" as const,
        startTime: new Date(tomorrow.setHours(19, 0, 0, 0)),
        endTime: new Date(new Date(tomorrow).setDate(tomorrow.getDate() + 1)),
        requiredStaff: 2,
        requiredSpecialty: "Registered Nurse",
        hourlyRate: 50.0,
        status: "open" as const,
        urgent: false,
      },
      {
        facilityId: insertedFacilities[1].id,
        department: "General Ward",
        shiftType: "day" as const,
        startTime: new Date(nextWeek.setHours(7, 0, 0, 0)),
        endTime: new Date(nextWeek.setHours(15, 0, 0, 0)),
        requiredStaff: 4,
        requiredSpecialty: "Licensed Practical Nurse",
        hourlyRate: 32.0,
        status: "open" as const,
        urgent: false,
      },
      {
        facilityId: insertedFacilities[1].id,
        department: "Rehabilitation",
        shiftType: "evening" as const,
        startTime: new Date(nextWeek.setHours(15, 0, 0, 0)),
        endTime: new Date(nextWeek.setHours(23, 0, 0, 0)),
        requiredStaff: 1,
        requiredSpecialty: "Physical Therapist",
        hourlyRate: 55.0,
        status: "filled" as const,
        urgent: false,
        assignedStaffId: insertedStaff[1].id,
      },
      {
        facilityId: insertedFacilities[2].id,
        department: "Memory Care",
        shiftType: "day" as const,
        startTime: new Date(tomorrow.setHours(7, 0, 0, 0)),
        endTime: new Date(tomorrow.setHours(15, 0, 0, 0)),
        requiredStaff: 2,
        requiredSpecialty: "Certified Nursing Assistant",
        hourlyRate: 20.0,
        status: "open" as const,
        urgent: true,
      },
    ];

    await db.insert(shifts).values(shiftsData);

    // Create permissions
    console.log("🔐 Creating permissions...");
    const permissionsData = [
      { name: "dashboard.view", description: "View dashboard" },
      { name: "facilities.view", description: "View facilities" },
      { name: "facilities.create", description: "Create facilities" },
      { name: "facilities.edit", description: "Edit facilities" },
      { name: "facilities.delete", description: "Delete facilities" },
      { name: "staff.view", description: "View staff" },
      { name: "staff.create", description: "Create staff" },
      { name: "staff.edit", description: "Edit staff" },
      { name: "staff.delete", description: "Delete staff" },
      { name: "shifts.view", description: "View shifts" },
      { name: "shifts.create", description: "Create shifts" },
      { name: "shifts.edit", description: "Edit shifts" },
      { name: "shifts.delete", description: "Delete shifts" },
      { name: "shifts.assign", description: "Assign shifts" },
      { name: "analytics.view", description: "View analytics" },
      { name: "settings.view", description: "View settings" },
      { name: "settings.edit", description: "Edit settings" },
      { name: "users.view", description: "View users" },
      { name: "users.create", description: "Create users" },
      { name: "users.edit", description: "Edit users" },
      { name: "users.delete", description: "Delete users" },
      { name: "audit.view", description: "View audit logs" },
    ];

    await db.insert(permissions).values(permissionsData);

    console.log("✅ Database seeded successfully!");
    console.log("");
    console.log("📋 Summary:");
    console.log(`   - 1 admin user created`);
    console.log(`   - ${insertedFacilities.length} facilities created`);
    console.log(`   - ${insertedStaff.length} staff members created`);
    console.log(`   - ${shiftsData.length} shifts created`);
    console.log(`   - ${permissionsData.length} permissions created`);
    console.log("");
    console.log("🔑 Login credentials:");
    console.log("   Username: joshburn");
    console.log("   Password: admin123");
    console.log("");
  } catch (error) {
    console.error("❌ Seed failed:", error);
    throw error;
  } finally {
    await sql`SELECT 1`; // Keep connection alive for cleanup
  }
}

// Run seed if called directly
if (require.main === module) {
  seed()
    .then(() => {
      console.log("✨ Seed completed!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Seed error:", error);
      process.exit(1);
    });
}

export default seed;