import { storage } from "./storage";
import { db } from "./db";
import { facilityUserRoleTemplates } from "../shared/schema";
import { eq, and } from "drizzle-orm";

// Facility User Role Templates with permissions
const FACILITY_USER_ROLE_TEMPLATES = {
  facility_admin: {
    name: "Facility Administrator",
    description: "Full administrative access to facility operations",
    permissions: [
      "view_schedules",
      "create_shifts",
      "edit_shifts",
      "delete_shifts",
      "assign_staff",
      "approve_shift_requests",
      "view_staff",
      "create_staff",
      "edit_staff",
      "deactivate_staff",
      "view_staff_credentials",
      "edit_staff_credentials",
      "manage_credentials",
      "view_billing",
      "manage_billing",
      "view_rates",
      "edit_rates",
      "approve_invoices",
      "view_facility_profile",
      "edit_facility_profile",
      "manage_facility_settings",
      "manage_facility_users",
      "view_reports",
      "export_data",
      "view_analytics",
      "view_audit_logs",
      "view_compliance",
      "manage_compliance",
      "upload_documents",
    ],
  },
  scheduling_coordinator: {
    name: "Scheduling Coordinator",
    description: "Manages scheduling and shift assignments",
    permissions: [
      "view_schedules",
      "create_shifts",
      "edit_shifts",
      "assign_staff",
      "approve_shift_requests",
      "view_staff",
      "view_reports",
    ],
  },
  hr_manager: {
    name: "HR Manager",
    description: "Manages staff and compliance",
    permissions: [
      "view_staff",
      "create_staff",
      "edit_staff",
      "deactivate_staff",
      "view_staff_credentials",
      "edit_staff_credentials",
      "manage_credentials",
      "view_compliance",
      "manage_compliance",
      "upload_documents",
      "view_reports",
      "export_data",
    ],
  },
  corporate: {
    name: "Corporate",
    description: "Corporate oversight and reporting",
    permissions: [
      "view_schedules",
      "create_shifts",
      "edit_shifts",
      "assign_staff",
      "view_staff",
      "view_reports",
      "view_analytics",
    ],
  },
  regional_director: {
    name: "Regional Director",
    description: "Regional management and oversight",
    permissions: [
      "view_schedules",
      "create_shifts",
      "edit_shifts",
      "assign_staff",
      "view_staff",
      "view_reports",
      "view_analytics",
    ],
  },
  billing: {
    name: "Billing Manager",
    description: "Financial and billing management",
    permissions: [
      "view_billing",
      "manage_billing",
      "view_rates",
      "edit_rates",
      "approve_invoices",
      "view_reports",
      "export_data",
      "view_analytics",
    ],
  },
  supervisor: {
    name: "Supervisor",
    description: "Supervises staff and operations",
    permissions: ["view_schedules", "assign_staff", "view_staff", "view_reports"],
  },
  director_of_nursing: {
    name: "Director of Nursing",
    description: "Nursing department leadership",
    permissions: [
      "view_schedules",
      "create_shifts",
      "edit_shifts",
      "assign_staff",
      "approve_shift_requests",
      "view_staff",
      "create_staff",
      "edit_staff",
      "view_staff_credentials",
      "edit_staff_credentials",
      "manage_credentials",
      "view_reports",
      "view_analytics",
      "view_compliance",
      "manage_compliance",
    ],
  },
  viewer: {
    name: "Viewer",
    description: "Read-only access to basic information",
    permissions: [
      "view_schedules",
      "view_staff",
      "view_facility_profile",
      "view_billing",
      "view_reports",
    ],
  },
};

export async function setupFacilityUserRoleTemplates() {

  try {
    // Insert or update role templates
    for (const [role, template] of Object.entries(FACILITY_USER_ROLE_TEMPLATES)) {
      // Check if template already exists
      const existing = await db
        .select()
        .from(facilityUserRoleTemplates)
        .where(
          and(
            eq(facilityUserRoleTemplates.role, role),
            eq(facilityUserRoleTemplates.isActive, true)
          )
        );

      if (existing.length === 0) {
        // Create new template
        await db.insert(facilityUserRoleTemplates).values({
          name: template.name,
          description: template.description,
          role: role,
          permissions: template.permissions,
          isDefault: true,
          isActive: true,
          createdById: 1, // Super admin
          facilityId: null, // System-wide template
        });
      } else {
        // Update existing template permissions
        await db
          .update(facilityUserRoleTemplates)
          .set({
            permissions: template.permissions,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(facilityUserRoleTemplates.role, role),
              eq(facilityUserRoleTemplates.isActive, true)
            )
          );
      }
    }

  } catch (error) {
    console.error("Error setting up facility user role templates:", error);
  }
}
