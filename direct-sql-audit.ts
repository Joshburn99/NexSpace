import { db } from "./server/db";
import { facilityUsers } from "@shared/schema";
import { sql } from "drizzle-orm";

async function runDirectSQLAudit() {
  console.log("🔍 Starting NexSpace Direct SQL Data Consistency Audit...\n");
  
  try {
    // 1. Check facility users without associations
    console.log("1️⃣ Checking facility users without associations...");
    const facilityUsersData = await db.select().from(facilityUsers);
    console.log(`   Found ${facilityUsersData.length} facility users`);
    
    // Get associations count
    const associationsResult = await db.execute(sql`
      SELECT COUNT(*) as count FROM facility_user_facility_associations
    `);
    const associationsCount = associationsResult.rows[0].count;
    console.log(`   Found ${associationsCount} associations in junction table`);
    
    // 2. Check orphaned facility users (no associations in junction table)
    const orphanedUsers = await db.execute(sql`
      SELECT fu.id, fu.email, fu.first_name, fu.last_name, fu.role, fu.primary_facility_id, fu.associated_facility_ids
      FROM facility_users fu
      LEFT JOIN facility_user_facility_associations fufa ON fu.id = fufa.facility_user_id
      WHERE fufa.id IS NULL
    `);
    console.log(`\n🚨 ORPHANED FACILITY USERS: ${orphanedUsers.rows.length}`);
    
    if (orphanedUsers.rows.length > 0) {
      console.log("Details:");
      orphanedUsers.rows.forEach((user: any) => {
        console.log(`   - ${user.first_name} ${user.last_name} (${user.email})`);
        console.log(`     Role: ${user.role}, Primary Facility: ${user.primary_facility_id}`);
        console.log(`     Associated Facilities in field: ${JSON.stringify(user.associated_facility_ids)}`);
      });
    }
    
    // 3. Check staff without facility associations
    console.log("\n2️⃣ Checking staff without facility associations...");
    const staffWithoutFacilities = await db.execute(sql`
      SELECT id, name, email, specialty, associated_facilities
      FROM staff
      WHERE associated_facilities IS NULL 
         OR associated_facilities::text = '[]'
         OR jsonb_array_length(associated_facilities) = 0
    `);
    console.log(`\n⚠️  STAFF WITHOUT FACILITIES: ${staffWithoutFacilities.rows.length}`);
    
    if (staffWithoutFacilities.rows.length > 0) {
      console.log("Details (first 10):");
      staffWithoutFacilities.rows.slice(0, 10).forEach((staff: any) => {
        console.log(`   - ${staff.name} (${staff.email}) - ${staff.specialty}`);
      });
      if (staffWithoutFacilities.rows.length > 10) {
        console.log(`   ... and ${staffWithoutFacilities.rows.length - 10} more`);
      }
    }
    
    // 4. Check duplicate emails
    console.log("\n3️⃣ Checking for duplicate emails across tables...");
    const duplicateEmails = await db.execute(sql`
      WITH all_emails AS (
        SELECT email, 'users' as source FROM users
        UNION ALL
        SELECT email, 'facility_users' as source FROM facility_users
        UNION ALL
        SELECT email, 'staff' as source FROM staff
      )
      SELECT email, array_agg(DISTINCT source) as tables, COUNT(*) as count
      FROM all_emails
      GROUP BY email
      HAVING COUNT(*) > 1
    `);
    console.log(`\n❗ DUPLICATE EMAILS: ${duplicateEmails.rows.length}`);
    
    if (duplicateEmails.rows.length > 0) {
      console.log("Details:");
      duplicateEmails.rows.forEach((dup: any) => {
        console.log(`   - ${dup.email}: appears in ${dup.tables.join(', ')} (${dup.count} times)`);
      });
    }
    
    // 5. Check inconsistent facility associations
    console.log("\n4️⃣ Checking inconsistent facility associations...");
    const inconsistentAssociations = await db.execute(sql`
      SELECT 
        fu.id, 
        fu.email,
        fu.associated_facility_ids as field_facilities,
        array_agg(fufa.facility_id) as junction_facilities
      FROM facility_users fu
      LEFT JOIN facility_user_facility_associations fufa ON fu.id = fufa.facility_user_id
      GROUP BY fu.id, fu.email, fu.associated_facility_ids
      HAVING fu.associated_facility_ids::text != COALESCE(
        '[' || array_to_string(array_agg(fufa.facility_id), ',') || ']',
        '[]'
      )
    `);
    console.log(`\n⚡ INCONSISTENT ASSOCIATIONS: ${inconsistentAssociations.rows.length}`);
    
    if (inconsistentAssociations.rows.length > 0) {
      console.log("Details:");
      inconsistentAssociations.rows.forEach((item: any) => {
        console.log(`   - User ${item.id} (${item.email}):`);
        console.log(`     In field: ${JSON.stringify(item.field_facilities)}`);
        console.log(`     In junction: ${JSON.stringify(item.junction_facilities.filter((f: any) => f !== null))}`);
      });
    }
    
    // Generate summary and recommendations
    console.log("\n📊 SUMMARY");
    console.log("===========");
    console.log(`Total facility users: ${facilityUsersData.length}`);
    console.log(`Orphaned facility users: ${orphanedUsers.rows.length}`);
    console.log(`Staff without facilities: ${staffWithoutFacilities.rows.length}`);
    console.log(`Duplicate emails: ${duplicateEmails.rows.length}`);
    console.log(`Inconsistent associations: ${inconsistentAssociations.rows.length}`);
    
    // Generate migration SQL
    console.log("\n📝 MIGRATION SQL");
    console.log("================\n");
    
    let migrationSQL = "-- NexSpace Data Consistency Migration\n";
    migrationSQL += `-- Generated on: ${new Date().toISOString()}\n\n`;
    
    if (orphanedUsers.rows.length > 0) {
      migrationSQL += "-- Create associations for orphaned facility users\n";
      orphanedUsers.rows.forEach((user: any) => {
        if (user.primary_facility_id) {
          migrationSQL += `INSERT INTO facility_user_facility_associations (facility_user_id, facility_id) VALUES (${user.id}, ${user.primary_facility_id});\n`;
        }
        // Also add associations from the field
        if (user.associated_facility_ids && Array.isArray(user.associated_facility_ids)) {
          user.associated_facility_ids.forEach((facilityId: number) => {
            if (facilityId !== user.primary_facility_id) {
              migrationSQL += `INSERT INTO facility_user_facility_associations (facility_user_id, facility_id) VALUES (${user.id}, ${facilityId});\n`;
            }
          });
        }
      });
      migrationSQL += "\n";
    }
    
    if (staffWithoutFacilities.rows.length > 0) {
      migrationSQL += "-- Assign default facility to staff\n";
      staffWithoutFacilities.rows.forEach((staff: any) => {
        migrationSQL += `UPDATE staff SET associated_facilities = '[1]'::jsonb WHERE id = ${staff.id};\n`;
      });
      migrationSQL += "\n";
    }
    
    console.log(migrationSQL);
    
    // Save reports
    const fs = await import("fs/promises");
    await fs.writeFile("direct-sql-migration.sql", migrationSQL);
    console.log("\nMigration SQL saved to: direct-sql-migration.sql");
    
  } catch (error) {
    console.error("❌ Error running audit:", error);
  }
}

// Run the audit
runDirectSQLAudit().then(() => process.exit(0));