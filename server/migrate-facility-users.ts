import { db } from "./db";
import { users, facilityUsers } from "@shared/schema";
import { eq, inArray, sql } from "drizzle-orm";

async function migrateFacilityUsers() {

  try {
    // First, get all facility user roles from the users table
    const facilityUserRoles = [
      "facility_administrator",
      "scheduling_coordinator",
      "hr_manager",
      "billing",
      "supervisor",
      "director_of_nursing",
      "viewer",
      "corporate",
      "regional_director",
      "facility_admin",
    ];

    // Get all users with facility roles
    const facilityUsersToMigrate = await db
      .select()
      .from(users)
      .where(inArray(users.role, facilityUserRoles));

    // Check for existing emails in facility_users to avoid duplicates
    const existingFacilityUsers = await db
      .select({ email: facilityUsers.email })
      .from(facilityUsers);

    const existingEmails = new Set(existingFacilityUsers.map((u) => u.email));

    // Migrate each user
    for (const user of facilityUsersToMigrate) {
      if (existingEmails.has(user.email)) {
        continue;
      }

      // Determine primary facility and associated facilities
      let primaryFacilityId = user.facilityId;
      let associatedFacilityIds = [];

      if (user.associatedFacilities && Array.isArray(user.associatedFacilities)) {
        associatedFacilityIds = user.associatedFacilities;
      } else if (user.facilityId) {
        associatedFacilityIds = [user.facilityId];
      }

      // Map role if needed
      let mappedRole = user.role;
      if (user.role === "facility_admin") {
        mappedRole = "facility_administrator";
      }

      // Insert into facility_users table
      await db.insert(facilityUsers).values({
        username: user.username || user.email.split("@")[0],
        email: user.email,
        password: user.password,
        firstName: user.firstName,
        lastName: user.lastName,
        role: mappedRole,
        avatar: user.avatar,
        isActive: user.isActive,
        primaryFacilityId: primaryFacilityId,
        associatedFacilityIds: associatedFacilityIds,
        phone: user.phone,
        createdAt: user.createdAt || new Date(),
        updatedAt: user.updatedAt || new Date(),
        // Set default permissions based on role
        permissions: getDefaultPermissionsForRole(mappedRole),
      });

    }

    // Delete migrated users from users table
    const migratedEmails = facilityUsersToMigrate
      .filter((u) => !existingEmails.has(u.email))
      .map((u) => u.email);

    if (migratedEmails.length > 0) {
      await db.delete(users).where(inArray(users.email, migratedEmails));

    }

  } catch (error) {

    throw error;
  }
}

function getDefaultPermissionsForRole(role: string): string[] {
  const permissionMap: Record<string, string[]> = {
    facility_administrator: [
      "view_facility_profile",
      "edit_facility_profile",
      "view_schedule",
      "manage_schedule",
      "view_staff",
      "manage_staff",
      "view_billing",
      "manage_billing",
      "view_compliance",
      "manage_compliance",
      "view_analytics",
      "manage_teams",
      "approve_timesheets",
      "manage_shift_templates",
      "manage_jobs",
      "view_staff_credentials",
      "edit_staff_credentials",
      "manage_credentials",
      "manage_users_and_teams",
      "set_shift_multipliers",
    ],
    scheduling_coordinator: [
      "view_schedule",
      "manage_schedule",
      "view_staff",
      "manage_shift_templates",
      "view_analytics",
    ],
    hr_manager: [
      "view_staff",
      "manage_staff",
      "view_compliance",
      "manage_compliance",
      "view_staff_credentials",
      "edit_staff_credentials",
      "manage_credentials",
      "manage_jobs",
    ],
    billing: ["view_billing", "manage_billing", "view_analytics", "approve_timesheets"],
    supervisor: ["view_schedule", "view_staff", "approve_timesheets"],
    director_of_nursing: [
      "view_schedule",
      "manage_schedule",
      "view_staff",
      "manage_staff",
      "view_compliance",
      "manage_compliance",
      "view_analytics",
    ],
    viewer: ["view_facility_profile", "view_schedule", "view_staff"],
    corporate: [
      "view_facility_profile",
      "view_schedule",
      "view_staff",
      "view_billing",
      "view_compliance",
      "view_analytics",
    ],
    regional_director: [
      "view_facility_profile",
      "edit_facility_profile",
      "view_schedule",
      "view_staff",
      "view_billing",
      "view_compliance",
      "view_analytics",
      "manage_teams",
    ],
  };

  return permissionMap[role] || ["view_facility_profile"];
}

// Run the migration
migrateFacilityUsers()
  .then(() => process.exit(0))
  .catch((error) => {

    process.exit(1);
  });
