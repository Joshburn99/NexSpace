import { db } from "./db.js";
import { users, staff } from "../shared/schema.js";
import { eq, or } from "drizzle-orm";

export async function migrateUsersToStaff() {
  console.log("Starting migration: Moving internal employees and contractors to staff table...");
  
  try {
    // First, get all users who are internal employees or contractors
    const usersToMigrate = await db
      .select()
      .from(users)
      .where(or(eq(users.role, "internal_employee"), eq(users.role, "contractor_1099")));

    console.log(`Found ${usersToMigrate.length} users to migrate to staff table`);

    // Insert each user into the staff table with mapped fields
    for (const user of usersToMigrate) {
      const staffData = {
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        phone: null, // Will need to be added separately if available
        specialty: user.specialty || "General",
        department: mapSpecialtyToDepartment(user.specialty || "General"),
        licenseNumber: null, // Will need to be added separately if available
        licenseExpiry: null,
        isActive: user.isActive ?? true,
        employmentType: user.role === "internal_employee" ? "full_time" : "contract",
        hourlyRate: null, // Will need to be set separately
        location: null,
        availabilityStatus: user.availabilityStatus || "available",
        profilePhoto: user.avatar,
        bio: null,
        certifications: [],
        languages: ["English"], // Default assumption
        userId: user.id, // Link back to user record temporarily for reference
        currentLocation: null,
        accountStatus: user.isActive ? "active" : "inactive",
        totalWorkedShifts: 0,
        reliabilityScore: "0.00",
        homeZipCode: null,
        homeAddress: null,
      };

      await db.insert(staff).values(staffData);
      console.log(`Migrated user ${user.firstName} ${user.lastName} (${user.email}) to staff table`);
    }

    // Now delete the migrated users from the users table
    const userIdsToDelete = usersToMigrate.map(u => u.id);
    
    if (userIdsToDelete.length > 0) {
      await db.delete(users).where(or(...userIdsToDelete.map(id => eq(users.id, id))));
      console.log(`Deleted ${userIdsToDelete.length} users from users table`);
    }

    // Update staff table to remove userId references (they should be independent now)
    await db.update(staff).set({ userId: null }).where(or(...userIdsToDelete.map(id => eq(staff.userId, id))));
    console.log("Cleared userId references in staff table");

    // Verify the migration
    const remainingUsers = await db.select().from(users);
    const totalStaff = await db.select().from(staff);
    
    console.log(`Migration complete!`);
    console.log(`Remaining users in users table: ${remainingUsers.length} (should only be super_admins and facility users)`);
    console.log(`Total staff records: ${totalStaff.length}`);
    
    // Show remaining users by role
    const usersByRole = remainingUsers.reduce((acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log("Remaining users by role:", usersByRole);
    
    return {
      migratedCount: usersToMigrate.length,
      remainingUsers: remainingUsers.length,
      totalStaff: totalStaff.length,
      usersByRole
    };

  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  }
}

function mapSpecialtyToDepartment(specialty: string): string {
  const departmentMap: Record<string, string> = {
    "RN": "Nursing",
    "LPN": "Nursing", 
    "CNA": "Nursing",
    "CST": "Surgery",
    "RT": "Respiratory Therapy",
    "PT": "Physical Therapy",
    "OT": "Occupational Therapy",
    "PharmTech": "Pharmacy",
    "LabTech": "Laboratory",
    "RadTech": "Radiology",
    "General": "General"
  };
  
  return departmentMap[specialty] || "General";
}

// Run the migration if this file is executed directly
if (process.argv[1] === import.meta.url) {
  migrateUsersToStaff()
    .then((result) => {
      console.log("Migration completed successfully:", result);
      process.exit(0);
    })
    .catch((error) => {
      console.error("Migration failed:", error);
      process.exit(1);
    });
}