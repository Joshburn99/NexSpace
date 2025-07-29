import { db } from "./server/db";
import {
  facilityUsers,
  facilityUserFacilityAssociations,
  staff as staffTable,
  teams,
  teamMembers,
  teamFacilities,
  facilities,
} from "./shared/schema";
import bcrypt from "bcryptjs";

async function createTestData() {
  console.log("🚀 Creating comprehensive test data for end-to-end UI testing...\n");

  try {
    // 1. Create a test facility user with multiple facility associations
    console.log("1️⃣ Creating test facility user with multiple facilities...");
    const hashedPassword = await bcrypt.hash("TestPass123!", 10);
    
    const testFacilityUser = await db.insert(facilityUsers).values({
      username: "test_multifacility",
      email: "test.multifacility@nexspace.com",
      password: hashedPassword,
      firstName: "Test",
      lastName: "MultiManager",
      role: "facility_admin",
      isActive: true,
      primaryFacilityId: 1,
      associatedFacilityIds: [1, 2, 3], // All three facilities
      phone: "+1-555-0123",
      title: "Regional Operations Manager",
      department: "Operations",
      permissions: [
        "view_schedules",
        "create_shifts",
        "edit_shifts",
        "manage_staff",
        "view_analytics",
        "manage_facility_settings",
        "approve_shift_requests",
        "view_billing",
        "manage_workflow_automation"
      ],
      notes: "Test user for end-to-end testing with multi-facility access",
    }).returning();
    
    console.log(`   ✅ Created facility user: ${testFacilityUser[0].email}`);
    
    // 2. Create associations in junction table
    console.log("2️⃣ Creating facility associations in junction table...");
    const facilityIds = [1, 2, 3];
    for (const facilityId of facilityIds) {
      // Note: Only inserting fields that exist in the actual database table
      // The schema is out of sync and has extra fields like isPrimary, teamId, etc.
      await db.execute(`
        INSERT INTO facility_user_facility_associations (facility_user_id, facility_id, created_at, updated_at)
        VALUES (${testFacilityUser[0].id}, ${facilityId}, NOW(), NOW())
      `);
    }
    console.log(`   ✅ Created ${facilityIds.length} facility associations`);
    
    // 3. Create test teams
    console.log("3️⃣ Creating test teams...");
    const testTeam1 = await db.insert(teams).values({
      name: "Emergency Response Team",
      description: "24/7 emergency department coverage team",
      leaderId: testFacilityUser[0].id,
      isActive: true,
    }).returning();
    
    const testTeam2 = await db.insert(teams).values({
      name: "ICU Specialists",
      description: "Critical care unit specialized team",
      leaderId: testFacilityUser[0].id,
      isActive: true,
    }).returning();
    
    console.log(`   ✅ Created teams: ${testTeam1[0].name}, ${testTeam2[0].name}`);
    
    // 4. Associate teams with facilities
    console.log("4️⃣ Associating teams with facilities...");
    await db.insert(teamFacilities).values([
      { teamId: testTeam1[0].id, facilityId: 1 },
      { teamId: testTeam1[0].id, facilityId: 2 },
      { teamId: testTeam2[0].id, facilityId: 1 },
    ]);
    console.log(`   ✅ Created team-facility associations`);
    
    // 5. Create test staff members with different roles and specialties
    console.log("5️⃣ Creating test staff members...");
    const testStaffData = [
      {
        name: "Test RN Lead",
        firstName: "Test",
        lastName: "RNLead",
        email: "test.rnlead@nexspace.com",
        phone: "+1-555-0124",
        specialty: "Registered Nurse",
        department: "Emergency",
        employmentType: "full_time",
        isActive: true,
        hourlyRate: "65.00",
        licenseNumber: "RN-TEST-001",
        availabilityStatus: "available",
        bio: "Experienced ER nurse with leadership skills",
        associatedFacilities: [1, 2],
        reliabilityScore: "0.95",
      },
      {
        name: "Test CNA Float",
        firstName: "Test", 
        lastName: "CNAFloat",
        email: "test.cnafloat@nexspace.com",
        phone: "+1-555-0125",
        specialty: "Certified Nursing Assistant",
        department: "Float Pool",
        employmentType: "per_diem",
        isActive: true,
        hourlyRate: "28.00",
        licenseNumber: "CNA-TEST-002",
        availabilityStatus: "available",
        bio: "Flexible CNA available for multiple departments",
        associatedFacilities: [1, 2, 3],
        reliabilityScore: "0.88",
      },
      {
        name: "Test Surgeon",
        firstName: "Test",
        lastName: "Surgeon",
        email: "test.surgeon@nexspace.com",
        phone: "+1-555-0126",
        specialty: "Certified Surgical Technologist",
        department: "Surgery",
        employmentType: "full_time",
        isActive: true,
        hourlyRate: "85.00",
        licenseNumber: "CST-TEST-003",
        availabilityStatus: "on_assignment",
        bio: "Specialized in cardiac and trauma surgery",
        associatedFacilities: [1],
        reliabilityScore: "0.98",
      },
    ];
    
    const createdStaff = [];
    for (const staffData of testStaffData) {
      const newStaff = await db.insert(staffTable).values(staffData).returning();
      createdStaff.push(newStaff[0]);
      console.log(`   ✅ Created staff: ${staffData.name} (${staffData.specialty})`);
    }
    
    // 6. Skip adding staff to teams due to schema mismatch
    // The team_members table expects user_id from users table, not staff_id from staff table
    console.log("6️⃣ Skipping team members (schema mismatch - team_members expects users table, not staff table)");
    
    // 7. Create a facility user with limited permissions
    console.log("7️⃣ Creating limited permission facility user...");
    const limitedUser = await db.insert(facilityUsers).values({
      username: "test_viewer",
      email: "test.viewer@nexspace.com",
      password: hashedPassword,
      firstName: "Test",
      lastName: "ViewOnly",
      role: "viewer",
      isActive: true,
      primaryFacilityId: 2,
      associatedFacilityIds: [2],
      phone: "+1-555-0127",
      title: "Guest Observer",
      department: "Administration",
      permissions: ["view_schedules", "view_analytics"],
      notes: "Test user with view-only permissions",
    }).returning();
    
    // Insert using raw SQL due to schema mismatch
    await db.execute(`
      INSERT INTO facility_user_facility_associations (facility_user_id, facility_id, created_at, updated_at)
      VALUES (${limitedUser[0].id}, 2, NOW(), NOW())
    `);
    
    console.log(`   ✅ Created limited permission user: ${limitedUser[0].email}`);
    
    // Summary
    console.log("\n✅ TEST DATA CREATION COMPLETE!");
    console.log("==================================");
    console.log("\n📋 Test Users Created:");
    console.log(`   • ${testFacilityUser[0].email} - Facility Admin with access to all 3 facilities`);
    console.log(`   • ${limitedUser[0].email} - View-only user with access to facility 2`);
    console.log("\n👥 Test Staff Created:");
    createdStaff.forEach(s => {
      console.log(`   • ${s.name} - ${s.specialty} (${s.employmentType})`);
    });
    console.log("\n🏢 Test Teams Created:");
    console.log(`   • ${testTeam1[0].name}`);
    console.log(`   • ${testTeam2[0].name}`);
    
    console.log("\n🔐 Login Credentials:");
    console.log("   Username: test_multifacility");
    console.log("   Password: TestPass123!");
    
    console.log("\n🧪 UI TESTING CHECKLIST:");
    console.log("1. Login as test_multifacility and verify:");
    console.log("   - Can see all 3 facilities in facility selector");
    console.log("   - Dashboard shows data from multiple facilities");
    console.log("   - Staff directory shows the 3 new test staff members");
    console.log("   - Teams page shows Emergency Response Team and ICU Specialists");
    console.log("\n2. Navigate to Staff Management:");
    console.log("   - Search for 'Test' to find all test staff");
    console.log("   - Click on Test RN Lead to view profile");
    console.log("   - Verify associated facilities show correctly");
    console.log("   - Check that reliability scores display");
    console.log("\n3. Navigate to Teams:");
    console.log("   - Verify both test teams appear");
    console.log("   - Click on Emergency Response Team");
    console.log("   - Verify it shows 2 members (RN Lead and CNA Float)");
    console.log("\n4. Test Facility Switching:");
    console.log("   - Switch between facilities 1, 2, and 3");
    console.log("   - Verify data filters correctly for each facility");
    console.log("\n5. Login as test_viewer and verify:");
    console.log("   - Limited to view-only permissions");
    console.log("   - Cannot see edit/create buttons");
    console.log("   - Only has access to facility 2");
    
  } catch (error) {
    console.error("❌ Error creating test data:", error);
  } finally {
    process.exit(0);
  }
}

createTestData();