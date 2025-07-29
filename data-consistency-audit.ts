import { db } from "./server/db";
import {
  users,
  facilityUsers,
  facilityUserFacilityAssociations,
  staff,
  teams,
  teamMembers,
  facilities,
  teamFacilities,
} from "@shared/schema";
import { eq, sql, and, or, isNull, notInArray, inArray } from "drizzle-orm";

interface AuditReport {
  totalIssues: number;
  issues: {
    type: string;
    severity: "critical" | "warning" | "info";
    count: number;
    details: any[];
  }[];
  recommendations: string[];
}

async function runDataConsistencyAudit(): Promise<AuditReport> {
  console.log("🔍 Starting NexSpace Data Consistency Audit...\n");
  
  const report: AuditReport = {
    totalIssues: 0,
    issues: [],
    recommendations: [],
  };

  // 1. Check facility users without facility associations
  console.log("1️⃣ Checking facility users without facility associations...");
  const facilityUsersData = await db.select().from(facilityUsers);
  const facilityAssociations = await db.select().from(facilityUserFacilityAssociations);
  
  const associationMap = new Map<number, number[]>();
  facilityAssociations.forEach(assoc => {
    if (!associationMap.has(assoc.facilityUserId)) {
      associationMap.set(assoc.facilityUserId, []);
    }
    associationMap.get(assoc.facilityUserId)!.push(assoc.facilityId);
  });
  
  const orphanedFacilityUsers = facilityUsersData.filter(fu => 
    !associationMap.has(fu.id) || associationMap.get(fu.id)!.length === 0
  );
  
  if (orphanedFacilityUsers.length > 0) {
    report.issues.push({
      type: "Orphaned Facility Users",
      severity: "critical",
      count: orphanedFacilityUsers.length,
      details: orphanedFacilityUsers.map(u => ({
        id: u.id,
        email: u.email,
        name: `${u.firstName} ${u.lastName}`,
        role: u.role,
      })),
    });
    report.totalIssues += orphanedFacilityUsers.length;
  }

  // 2. Check for invalid facility associations (pointing to non-existent facilities)
  console.log("2️⃣ Checking for invalid facility associations...");
  const allFacilities = await db.select().from(facilities);
  const facilityIds = new Set(allFacilities.map(f => f.id));
  
  const invalidAssociations = facilityAssociations.filter(assoc => 
    !facilityIds.has(assoc.facilityId)
  );
  
  if (invalidAssociations.length > 0) {
    report.issues.push({
      type: "Invalid Facility Associations",
      severity: "critical",
      count: invalidAssociations.length,
      details: invalidAssociations.map(a => ({
        userId: a.facilityUserId,
        invalidFacilityId: a.facilityId,
      })),
    });
    report.totalIssues += invalidAssociations.length;
  }

  // 3. Check staff without primary facility assignments
  console.log("3️⃣ Checking staff without primary facility assignments...");
  const allStaff = await db.select().from(staff);
  const staffWithoutFacility = allStaff.filter(s => 
    !s.primaryFacilityId || s.primaryFacilityId === 0
  );
  
  if (staffWithoutFacility.length > 0) {
    report.issues.push({
      type: "Staff Without Primary Facility",
      severity: "warning",
      count: staffWithoutFacility.length,
      details: staffWithoutFacility.map(s => ({
        id: s.id,
        name: s.name,
        email: s.email,
        specialty: s.specialty,
        employmentType: s.employmentType,
      })),
    });
    report.totalIssues += staffWithoutFacility.length;
  }

  // 4. Check for duplicate emails across different user tables
  console.log("4️⃣ Checking for duplicate emails across user tables...");
  const allUsers = await db.select().from(users);
  const emailMap = new Map<string, { tables: string[], details: any[] }>();
  
  // Check users table
  allUsers.forEach(u => {
    const email = u.email.toLowerCase();
    if (!emailMap.has(email)) {
      emailMap.set(email, { tables: [], details: [] });
    }
    emailMap.get(email)!.tables.push('users');
    emailMap.get(email)!.details.push({ table: 'users', id: u.id, role: u.role });
  });
  
  // Check facility_users table
  facilityUsersData.forEach(fu => {
    const email = fu.email.toLowerCase();
    if (!emailMap.has(email)) {
      emailMap.set(email, { tables: [], details: [] });
    }
    emailMap.get(email)!.tables.push('facility_users');
    emailMap.get(email)!.details.push({ table: 'facility_users', id: fu.id, role: fu.role });
  });
  
  // Check staff table
  allStaff.forEach(s => {
    const email = s.email.toLowerCase();
    if (!emailMap.has(email)) {
      emailMap.set(email, { tables: [], details: [] });
    }
    emailMap.get(email)!.tables.push('staff');
    emailMap.get(email)!.details.push({ table: 'staff', id: s.id, specialty: s.specialty });
  });
  
  const duplicateEmails = Array.from(emailMap.entries())
    .filter(([email, data]) => data.details.length > 1)
    .map(([email, data]) => ({ email, ...data }));
  
  if (duplicateEmails.length > 0) {
    report.issues.push({
      type: "Duplicate Emails Across Tables",
      severity: "critical",
      count: duplicateEmails.length,
      details: duplicateEmails,
    });
    report.totalIssues += duplicateEmails.length;
  }

  // 5. Check team consistency
  console.log("5️⃣ Checking team consistency...");
  const allTeams = await db.select().from(teams);
  const teamMembersData = await db.select().from(teamMembers);
  const teamFacilitiesData = await db.select().from(teamFacilities);
  
  // Check for teams without facilities
  const teamFacilityMap = new Map<number, number[]>();
  teamFacilitiesData.forEach(tf => {
    if (!teamFacilityMap.has(tf.teamId)) {
      teamFacilityMap.set(tf.teamId, []);
    }
    teamFacilityMap.get(tf.teamId)!.push(tf.facilityId);
  });
  
  const teamsWithoutFacilities = allTeams.filter(t => 
    !teamFacilityMap.has(t.id) || teamFacilityMap.get(t.id)!.length === 0
  );
  
  if (teamsWithoutFacilities.length > 0) {
    report.issues.push({
      type: "Teams Without Facility Assignments",
      severity: "warning",
      count: teamsWithoutFacilities.length,
      details: teamsWithoutFacilities.map(t => ({
        id: t.id,
        name: t.name,
        description: t.description,
      })),
    });
    report.totalIssues += teamsWithoutFacilities.length;
  }

  // 6. Check for invalid associatedFacilityIds in facility_users table
  console.log("6️⃣ Checking facility users' associatedFacilityIds field...");
  const facilityUsersWithInvalidIds = facilityUsersData.filter(fu => {
    if (!fu.associatedFacilityIds || fu.associatedFacilityIds.length === 0) return false;
    return fu.associatedFacilityIds.some(id => !facilityIds.has(id));
  });
  
  if (facilityUsersWithInvalidIds.length > 0) {
    report.issues.push({
      type: "Facility Users with Invalid associatedFacilityIds",
      severity: "warning",
      count: facilityUsersWithInvalidIds.length,
      details: facilityUsersWithInvalidIds.map(fu => ({
        id: fu.id,
        email: fu.email,
        invalidIds: fu.associatedFacilityIds?.filter(id => !facilityIds.has(id)),
      })),
    });
    report.totalIssues += facilityUsersWithInvalidIds.length;
  }

  // 7. Check for mismatched associations
  console.log("7️⃣ Checking for mismatched facility associations...");
  const mismatchedAssociations = facilityUsersData.filter(fu => {
    const tableAssociations = associationMap.get(fu.id) || [];
    const fieldAssociations = fu.associatedFacilityIds || [];
    
    if (tableAssociations.length !== fieldAssociations.length) return true;
    
    const tableSet = new Set(tableAssociations);
    return fieldAssociations.some(id => !tableSet.has(id));
  });
  
  if (mismatchedAssociations.length > 0) {
    report.issues.push({
      type: "Mismatched Facility Associations",
      severity: "critical",
      count: mismatchedAssociations.length,
      details: mismatchedAssociations.map(fu => ({
        id: fu.id,
        email: fu.email,
        inTable: associationMap.get(fu.id) || [],
        inField: fu.associatedFacilityIds || [],
      })),
    });
    report.totalIssues += mismatchedAssociations.length;
  }

  // Generate recommendations
  if (orphanedFacilityUsers.length > 0) {
    report.recommendations.push(
      "Create facility associations for orphaned facility users based on their role and location"
    );
  }
  
  if (invalidAssociations.length > 0) {
    report.recommendations.push(
      "Remove invalid facility associations pointing to non-existent facilities"
    );
  }
  
  if (staffWithoutFacility.length > 0) {
    report.recommendations.push(
      "Assign primary facilities to staff members based on their work history or default to facility 1"
    );
  }
  
  if (duplicateEmails.length > 0) {
    report.recommendations.push(
      "Merge or deactivate duplicate email accounts across different user tables"
    );
  }
  
  if (mismatchedAssociations.length > 0) {
    report.recommendations.push(
      "Sync facility associations between the junction table and the user field"
    );
  }

  return report;
}

// Generate migration SQL
function generateMigrationSQL(report: AuditReport): string {
  let sql = "-- NexSpace Data Consistency Migration\n";
  sql += "-- Generated on: " + new Date().toISOString() + "\n\n";
  
  // Fix orphaned facility users
  const orphanedUsers = report.issues.find(i => i.type === "Orphaned Facility Users");
  if (orphanedUsers) {
    sql += "-- Fix orphaned facility users by assigning them to facility 1\n";
    orphanedUsers.details.forEach((user: any) => {
      sql += `INSERT INTO facility_user_facility_associations (facility_user_id, facility_id) VALUES (${user.id}, 1);\n`;
    });
    sql += "\n";
  }
  
  // Remove invalid associations
  const invalidAssocs = report.issues.find(i => i.type === "Invalid Facility Associations");
  if (invalidAssocs) {
    sql += "-- Remove invalid facility associations\n";
    invalidAssocs.details.forEach((assoc: any) => {
      sql += `DELETE FROM facility_user_facility_associations WHERE facility_user_id = ${assoc.userId} AND facility_id = ${assoc.invalidFacilityId};\n`;
    });
    sql += "\n";
  }
  
  // Fix staff without facilities
  const staffNoFacility = report.issues.find(i => i.type === "Staff Without Primary Facility");
  if (staffNoFacility) {
    sql += "-- Assign primary facility to staff members\n";
    staffNoFacility.details.forEach((staff: any) => {
      sql += `UPDATE staff SET primary_facility_id = 1 WHERE id = ${staff.id};\n`;
    });
    sql += "\n";
  }
  
  return sql;
}

// Main execution
async function main() {
  try {
    const report = await runDataConsistencyAudit();
    
    console.log("\n📊 AUDIT REPORT SUMMARY");
    console.log("======================");
    console.log(`Total Issues Found: ${report.totalIssues}`);
    console.log(`Critical Issues: ${report.issues.filter(i => i.severity === "critical").length}`);
    console.log(`Warnings: ${report.issues.filter(i => i.severity === "warning").length}`);
    
    console.log("\n🔍 DETAILED FINDINGS:");
    report.issues.forEach(issue => {
      console.log(`\n${issue.severity.toUpperCase()}: ${issue.type} (${issue.count} issues)`);
      console.log("Details:", JSON.stringify(issue.details, null, 2));
    });
    
    console.log("\n💡 RECOMMENDATIONS:");
    report.recommendations.forEach((rec, idx) => {
      console.log(`${idx + 1}. ${rec}`);
    });
    
    // Generate migration SQL
    const migrationSQL = generateMigrationSQL(report);
    console.log("\n📝 MIGRATION SQL:");
    console.log(migrationSQL);
    
    // Save report to file
    const fs = await import("fs/promises");
    await fs.writeFile(
      "data-consistency-audit-report.json",
      JSON.stringify(report, null, 2)
    );
    await fs.writeFile("data-consistency-migration.sql", migrationSQL);
    
    console.log("\n✅ Audit complete! Report saved to data-consistency-audit-report.json");
    console.log("   Migration SQL saved to data-consistency-migration.sql");
    
  } catch (error) {
    console.error("❌ Error running audit:", error);
  } finally {
    process.exit(0);
  }
}

main();