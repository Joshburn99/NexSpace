#!/usr/bin/env tsx
import dotenv from "dotenv";
dotenv.config();

import { db } from "./db";
import { users, facilities, staff, shifts, permissions, rolePermissions } from "@shared/schema";
import bcrypt from "bcryptjs";
import { eq, sql } from "drizzle-orm";

const ADMIN_USERNAME = "joshburn";
const ADMIN_PASSWORD = "admin123";
const ADMIN_EMAIL = "joshburn99@icloud.com";

async function seed() {
  console.log("🌱 Starting database seed...");

  try {
    // 1. Create or update admin user
    console.log("Creating admin user...");
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
    
    // Check if user exists
    const existingUser = await db.select().from(users).where(eq(users.username, ADMIN_USERNAME)).limit(1);
    
    let adminUserId: number;
    if (existingUser.length > 0) {
      // Update existing user
      await db.update(users)
        .set({
          password: hashedPassword,
          role: "super_admin",
          email: ADMIN_EMAIL,
          firstName: "Josh",
          lastName: "Burn",
          isActive: true,
        })
        .where(eq(users.username, ADMIN_USERNAME));
      adminUserId = existingUser[0].id;
      console.log(`✅ Updated existing admin user: ${ADMIN_USERNAME}`);
    } else {
      // Create new user
      const [newUser] = await db.insert(users).values({
        username: ADMIN_USERNAME,
        email: ADMIN_EMAIL,
        password: hashedPassword,
        firstName: "Josh",
        lastName: "Burn",
        role: "super_admin",
        isActive: true,
      }).returning();
      adminUserId = newUser.id;
      console.log(`✅ Created new admin user: ${ADMIN_USERNAME}`);
    }

    // 2. Add sample facilities if none exist
    const facilityCount = await db.select({ count: sql<number>`count(*)` }).from(facilities);
    if (facilityCount[0].count === 0) {
      console.log("Creating sample facilities...");
      const sampleFacilities = [
        {
          name: "Riverside General Hospital",
          address: "123 Main Street",
          city: "New York",
          state: "NY",
          zipCode: "10001",
          phone: "212-555-0100",
          email: "admin@riverside.com",
          isActive: true,
          facilityType: "hospital",
          bedCount: 250,
        },
        {
          name: "Sunset Nursing Home",
          address: "456 Oak Avenue",
          city: "Los Angeles",
          state: "CA",
          zipCode: "90001",
          phone: "310-555-0200",
          email: "admin@sunset.com",
          isActive: true,
          facilityType: "nursing_home",
          bedCount: 120,
        },
        {
          name: "Mountain View Rehabilitation Center",
          address: "789 Pine Road",
          city: "Denver",
          state: "CO",
          zipCode: "80201",
          phone: "303-555-0300",
          email: "admin@mountainview.com",
          isActive: true,
          facilityType: "rehabilitation",
          bedCount: 80,
        },
      ];

      for (const facility of sampleFacilities) {
        await db.insert(facilities).values(facility).onConflictDoNothing();
      }
      console.log(`✅ Created ${sampleFacilities.length} sample facilities`);
    } else {
      console.log(`ℹ️  Facilities already exist (${facilityCount[0].count} found)`);
    }

    // 3. Add sample staff if none exist
    const staffCount = await db.select({ count: sql<number>`count(*)` }).from(staff);
    if (staffCount[0].count === 0) {
      console.log("Creating sample staff...");
      const sampleStaff = [
        {
          name: "Sarah Johnson",
          firstName: "Sarah",
          lastName: "Johnson",
          email: "sarah.j@example.com",
          phone: "555-0101",
          specialty: "Registered Nurse",
          department: "Medical",
          isActive: true,
          employmentType: "full_time",
          hourlyRate: "45.00",
          availabilityStatus: "available",
        },
        {
          name: "Michael Chen",
          firstName: "Michael",
          lastName: "Chen",
          email: "michael.c@example.com",
          phone: "555-0102",
          specialty: "LPN",
          department: "Surgical",
          isActive: true,
          employmentType: "part_time",
          hourlyRate: "35.00",
          availabilityStatus: "available",
        },
        {
          name: "Emily Davis",
          firstName: "Emily",
          lastName: "Davis",
          email: "emily.d@example.com",
          phone: "555-0103",
          specialty: "CNA",
          department: "Emergency",
          isActive: true,
          employmentType: "contractor",
          hourlyRate: "25.00",
          availabilityStatus: "available",
        },
        {
          name: "Robert Wilson",
          firstName: "Robert",
          lastName: "Wilson",
          email: "robert.w@example.com",
          phone: "555-0104",
          specialty: "Registered Nurse",
          department: "ICU",
          isActive: true,
          employmentType: "full_time",
          hourlyRate: "50.00",
          availabilityStatus: "available",
        },
        {
          name: "Lisa Anderson",
          firstName: "Lisa",
          lastName: "Anderson",
          email: "lisa.a@example.com",
          phone: "555-0105",
          specialty: "Physical Therapist",
          department: "Rehabilitation",
          isActive: true,
          employmentType: "full_time",
          hourlyRate: "55.00",
          availabilityStatus: "available",
        },
      ];

      for (const member of sampleStaff) {
        await db.insert(staff).values(member).onConflictDoNothing();
      }
      console.log(`✅ Created ${sampleStaff.length} sample staff members`);
    } else {
      console.log(`ℹ️  Staff already exist (${staffCount[0].count} found)`);
    }

    // 4. Add sample shifts
    const shiftCount = await db.select({ count: sql<number>`count(*)` }).from(shifts);
    if (shiftCount[0].count < 5) {
      console.log("Creating sample shifts...");
      
      // Get first facility
      const [firstFacility] = await db.select().from(facilities).limit(1);
      if (firstFacility) {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const sampleShifts = [
          {
            facilityId: firstFacility.id,
            facilityName: firstFacility.name,
            title: "Morning Shift - RN",
            department: "Medical",
            specialty: "Registered Nurse",
            date: tomorrow.toISOString().split('T')[0],
            startTime: "07:00:00",
            endTime: "15:00:00",
            status: "open",
            requiredStaff: 2,
            rate: "45.00",
            urgency: "normal",
            shiftType: "day",
          },
          {
            facilityId: firstFacility.id,
            facilityName: firstFacility.name,
            title: "Evening Shift - LPN",
            department: "Surgical",
            specialty: "LPN",
            date: tomorrow.toISOString().split('T')[0],
            startTime: "15:00:00",
            endTime: "23:00:00",
            status: "open",
            requiredStaff: 1,
            rate: "35.00",
            urgency: "normal",
            shiftType: "evening",
          },
          {
            facilityId: firstFacility.id,
            facilityName: firstFacility.name,
            title: "Night Shift - CNA",
            department: "Emergency",
            specialty: "CNA",
            date: tomorrow.toISOString().split('T')[0],
            startTime: "23:00:00",
            endTime: "07:00:00",
            status: "open",
            requiredStaff: 3,
            rate: "28.00",
            urgency: "urgent",
            shiftType: "night",
          },
        ];

        for (const shift of sampleShifts) {
          await db.insert(shifts).values(shift).onConflictDoNothing();
        }
        console.log(`✅ Created ${sampleShifts.length} sample shifts`);
      }
    } else {
      console.log(`ℹ️  Shifts already exist (${shiftCount[0].count} found)`);
    }

    // 5. Create permissions if they don't exist
    console.log("Setting up permissions...");
    const corePermissions = [
      { name: "dashboard.view", description: "View dashboard", category: "Dashboard" },
      { name: "dashboard.analytics", description: "View analytics", category: "Dashboard" },
      { name: "facilities.view", description: "View facilities", category: "Facilities" },
      { name: "facilities.create", description: "Create facilities", category: "Facilities" },
      { name: "facilities.edit", description: "Edit facilities", category: "Facilities" },
      { name: "facilities.delete", description: "Delete facilities", category: "Facilities" },
      { name: "staff.view", description: "View staff", category: "Staff" },
      { name: "staff.create", description: "Create staff", category: "Staff" },
      { name: "staff.edit", description: "Edit staff", category: "Staff" },
      { name: "staff.delete", description: "Delete staff", category: "Staff" },
      { name: "shifts.view", description: "View shifts", category: "Shifts" },
      { name: "shifts.create", description: "Create shifts", category: "Shifts" },
      { name: "shifts.edit", description: "Edit shifts", category: "Shifts" },
      { name: "shifts.delete", description: "Delete shifts", category: "Shifts" },
      { name: "shifts.assign", description: "Assign shifts", category: "Shifts" },
      { name: "settings.view", description: "View settings", category: "Settings" },
      { name: "settings.edit", description: "Edit settings", category: "Settings" },
      { name: "audit.view", description: "View audit logs", category: "Audit" },
      { name: "reports.view", description: "View reports", category: "Reports" },
      { name: "reports.generate", description: "Generate reports", category: "Reports" },
      { name: "billing.view", description: "View billing", category: "Billing" },
      { name: "billing.manage", description: "Manage billing", category: "Billing" },
      { name: "users.view", description: "View users", category: "Users" },
      { name: "users.manage", description: "Manage users", category: "Users" },
      { name: "impersonate", description: "Impersonate users", category: "Admin" },
      { name: "teams.view", description: "View teams", category: "Teams" },
      { name: "teams.manage", description: "Manage teams", category: "Teams" },
    ];

    for (const permission of corePermissions) {
      await db.insert(permissions).values(permission).onConflictDoNothing();
    }
    console.log(`✅ Created/verified ${corePermissions.length} permissions`);

    // 6. Setup role permissions for super_admin
    console.log("Setting up role permissions...");
    
    // Get all permission IDs
    const allPermissions = await db.select().from(permissions);
    
    // Clear existing super_admin permissions
    await db.delete(rolePermissions).where(eq(rolePermissions.role, "super_admin"));
    
    // Add all permissions to super_admin
    for (const permission of allPermissions) {
      await db.insert(rolePermissions).values({
        role: "super_admin",
        permissionId: permission.id,
      }).onConflictDoNothing();
    }
    console.log(`✅ Granted ${allPermissions.length} permissions to super_admin role`);

    console.log("\n✅ Database seed completed successfully!");
    console.log("\n📊 Database Summary:");
    console.log("====================");
    
    // Print summary
    const userCount = await db.select({ count: sql<number>`count(*)` }).from(users);
    const finalFacilityCount = await db.select({ count: sql<number>`count(*)` }).from(facilities);
    const finalStaffCount = await db.select({ count: sql<number>`count(*)` }).from(staff);
    const finalShiftCount = await db.select({ count: sql<number>`count(*)` }).from(shifts);
    const permissionCount = await db.select({ count: sql<number>`count(*)` }).from(permissions);
    const rolePermissionCount = await db.select({ count: sql<number>`count(*)` }).from(rolePermissions);
    
    console.log(`Users: ${userCount[0].count}`);
    console.log(`Facilities: ${finalFacilityCount[0].count}`);
    console.log(`Staff: ${finalStaffCount[0].count}`);
    console.log(`Shifts: ${finalShiftCount[0].count}`);
    console.log(`Permissions: ${permissionCount[0].count}`);
    console.log(`Role Permissions: ${rolePermissionCount[0].count}`);
    
    console.log("\n🔐 Admin Login:");
    console.log("===============");
    console.log(`Username: ${ADMIN_USERNAME}`);
    console.log(`Password: ${ADMIN_PASSWORD}`);
    console.log(`Role: super_admin`);
    
  } catch (error) {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  }
}

// Run the seed
seed().then(() => {
  console.log("\n✨ Seed completed! Exiting...");
  process.exit(0);
}).catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});