import { db } from "./server/db";
import {
  users,
  facilityUsers,
  facilityUserFacilityAssociations,
  staff,
  teams,
  teamMembers,
  facilities,
} from "@shared/schema";
import { eq, sql, and, or, isNull, notInArray, inArray } from "drizzle-orm";

interface AuditResults {
  orphanedFacilityUsers: any[];
  staffWithoutFacility: any[];
  duplicateEmails: any[];
  facilityUsersWithoutAssociations: any[];
  inconsistentAssociations: any[];
}

async function runSimpleDataAudit(): Promise<AuditResults> {
  console.log("🔍 Starting NexSpace Simple Data Consistency Audit...\n");
  
  const results: AuditResults = {
    orphanedFacilityUsers: [],
    staffWithoutFacility: [],
    duplicateEmails: [],
    facilityUsersWithoutAssociations: [],
    inconsistentAssociations: [],
  };

  // 1. Get all facility users
  console.log("1️⃣ Fetching facility users...");
  const facilityUsersData = await db.select({
    id: facilityUsers.id,
    email: facilityUsers.email,
    firstName: facilityUsers.firstName,
    lastName: facilityUsers.lastName,
    role: facilityUsers.role,
    primaryFacilityId: facilityUsers.primaryFacilityId,
    associatedFacilityIds: facilityUsers.associatedFacilityIds,
  }).from(facilityUsers);
  console.log(`   Found ${facilityUsersData.length} facility users`);

  // 2. Get facility associations from junction table
  console.log("2️⃣ Fetching facility associations...");
  const associations = await db.select({
    facilityUserId: facilityUserFacilityAssociations.facilityUserId,
    facilityId: facilityUserFacilityAssociations.facilityId,
  }).from(facilityUserFacilityAssociations);
  console.log(`   Found ${associations.length} associations`);

  // 3. Check for facility users without associations
  console.log("3️⃣ Checking for facility users without any associations...");
  const associationsByUser = new Map<number, number[]>();
  associations.forEach(a => {
    if (!associationsByUser.has(a.facilityUserId)) {
      associationsByUser.set(a.facilityUserId, []);
    }
    associationsByUser.get(a.facilityUserId)!.push(a.facilityId);
  });

  facilityUsersData.forEach(fu => {
    const tableAssociations = associationsByUser.get(fu.id) || [];
    const fieldAssociations = (fu.associatedFacilityIds as number[]) || [];
    
    // Check if no associations in junction table
    if (tableAssociations.length === 0) {
      results.facilityUsersWithoutAssociations.push({
        id: fu.id,
        email: fu.email,
        name: `${fu.firstName} ${fu.lastName}`,
        role: fu.role,
        primaryFacilityId: fu.primaryFacilityId,
        associatedFacilityIds: fieldAssociations,
      });
    }
    
    // Check for mismatches between table and field
    if (tableAssociations.length !== fieldAssociations.length ||
        !tableAssociations.every(id => fieldAssociations.includes(id))) {
      results.inconsistentAssociations.push({
        id: fu.id,
        email: fu.email,
        inJunctionTable: tableAssociations,
        inUserField: fieldAssociations,
      });
    }
  });

  // 4. Check staff without facility
  console.log("4️⃣ Checking staff without facility associations...");
  const allStaff = await db.select({
    id: staff.id,
    name: staff.name,
    email: staff.email,
    associatedFacilities: staff.associatedFacilities,
    specialty: staff.specialty,
  }).from(staff);
  
  results.staffWithoutFacility = allStaff.filter(s => 
    !s.associatedFacilities || (Array.isArray(s.associatedFacilities) && s.associatedFacilities.length === 0)
  );
  console.log(`   Found ${results.staffWithoutFacility.length} staff without facility`);

  // 5. Check for duplicate emails
  console.log("5️⃣ Checking for duplicate emails across tables...");
  const emailMap = new Map<string, any[]>();
  
  // Check users table
  const allUsers = await db.select({
    id: users.id,
    email: users.email,
    role: users.role,
  }).from(users);
  
  allUsers.forEach(u => {
    const email = u.email.toLowerCase();
    if (!emailMap.has(email)) emailMap.set(email, []);
    emailMap.get(email)!.push({ table: 'users', ...u });
  });
  
  // Check facility_users
  facilityUsersData.forEach(fu => {
    const email = fu.email.toLowerCase();
    if (!emailMap.has(email)) emailMap.set(email, []);
    emailMap.get(email)!.push({ table: 'facility_users', ...fu });
  });
  
  // Check staff
  allStaff.forEach(s => {
    const email = s.email.toLowerCase();
    if (!emailMap.has(email)) emailMap.set(email, []);
    emailMap.get(email)!.push({ table: 'staff', ...s });
  });
  
  // Find duplicates
  emailMap.forEach((records, email) => {
    if (records.length > 1) {
      results.duplicateEmails.push({
        email,
        occurrences: records,
      });
    }
  });

  return results;
}

// Generate migration SQL
function generateMigrationSQL(results: AuditResults): string {
  let sql = "-- NexSpace Data Consistency Migration\n";
  sql += "-- Generated on: " + new Date().toISOString() + "\n\n";
  
  // Fix facility users without associations
  if (results.facilityUsersWithoutAssociations.length > 0) {
    sql += "-- Create associations for facility users based on their primary facility\n";
    results.facilityUsersWithoutAssociations.forEach(user => {
      if (user.primaryFacilityId) {
        sql += `INSERT INTO facility_user_facility_associations (facility_user_id, facility_id) VALUES (${user.id}, ${user.primaryFacilityId});\n`;
      }
    });
    sql += "\n";
  }
  
  // Fix staff without facilities
  if (results.staffWithoutFacility.length > 0) {
    sql += "-- Assign default facility to staff members\n";
    results.staffWithoutFacility.forEach(s => {
      sql += `UPDATE staff SET associated_facilities = '[1]'::jsonb WHERE id = ${s.id};\n`;
    });
    sql += "\n";
  }
  
  // Sync inconsistent associations
  if (results.inconsistentAssociations.length > 0) {
    sql += "-- Sync facility associations from user field to junction table\n";
    results.inconsistentAssociations.forEach(item => {
      // Clear existing associations
      sql += `DELETE FROM facility_user_facility_associations WHERE facility_user_id = ${item.id};\n`;
      // Insert from field
      item.inUserField.forEach((facilityId: number) => {
        sql += `INSERT INTO facility_user_facility_associations (facility_user_id, facility_id) VALUES (${item.id}, ${facilityId});\n`;
      });
    });
    sql += "\n";
  }
  
  return sql;
}

// Main execution
async function main() {
  try {
    const results = await runSimpleDataAudit();
    
    console.log("\n📊 AUDIT SUMMARY");
    console.log("================");
    console.log(`Facility users without associations: ${results.facilityUsersWithoutAssociations.length}`);
    console.log(`Staff without primary facility: ${results.staffWithoutFacility.length}`);
    console.log(`Duplicate emails: ${results.duplicateEmails.length}`);
    console.log(`Inconsistent associations: ${results.inconsistentAssociations.length}`);
    
    if (results.facilityUsersWithoutAssociations.length > 0) {
      console.log("\n🚨 FACILITY USERS WITHOUT ASSOCIATIONS:");
      results.facilityUsersWithoutAssociations.forEach(u => {
        console.log(`   - ${u.name} (${u.email}) - Role: ${u.role}, Primary Facility: ${u.primaryFacilityId}`);
      });
    }
    
    if (results.staffWithoutFacility.length > 0) {
      console.log("\n⚠️  STAFF WITHOUT PRIMARY FACILITY:");
      results.staffWithoutFacility.forEach(s => {
        console.log(`   - ${s.name} (${s.email}) - Specialty: ${s.specialty}`);
      });
    }
    
    if (results.duplicateEmails.length > 0) {
      console.log("\n❗ DUPLICATE EMAILS:");
      results.duplicateEmails.forEach(dup => {
        console.log(`   - ${dup.email}:`);
        dup.occurrences.forEach((o: any) => {
          console.log(`     • ${o.table}: ID ${o.id}`);
        });
      });
    }
    
    if (results.inconsistentAssociations.length > 0) {
      console.log("\n⚡ INCONSISTENT ASSOCIATIONS:");
      results.inconsistentAssociations.forEach(item => {
        console.log(`   - User ${item.id} (${item.email}):`);
        console.log(`     Junction table: [${item.inJunctionTable.join(', ')}]`);
        console.log(`     User field: [${item.inUserField.join(', ')}]`);
      });
    }
    
    // Generate migration SQL
    const migrationSQL = generateMigrationSQL(results);
    console.log("\n📝 MIGRATION SQL:");
    console.log(migrationSQL);
    
    // Save reports
    const fs = await import("fs/promises");
    await fs.writeFile(
      "simple-audit-results.json",
      JSON.stringify(results, null, 2)
    );
    await fs.writeFile("simple-migration.sql", migrationSQL);
    
    console.log("\n✅ Audit complete!");
    console.log("   Results saved to: simple-audit-results.json");
    console.log("   Migration SQL saved to: simple-migration.sql");
    
  } catch (error) {
    console.error("❌ Error running audit:", error);
  } finally {
    process.exit(0);
  }
}

main();