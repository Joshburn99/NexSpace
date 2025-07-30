#!/usr/bin/env node

/**
 * Development Diagnostics Script
 * Provides column introspection and sample data for the shifts table
 */

import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

async function runDiagnostics() {
  try {
    console.log("🔍 Database Diagnostics for 'shifts' table");
    console.log("=" .repeat(50));
    
    // Get table columns
    console.log("\n📋 Table Columns:");
    const columnsResult = await sql(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'shifts' 
      ORDER BY ordinal_position
    `);
    
    if (columnsResult.length === 0) {
      console.log("❌ No 'shifts' table found!");
      return;
    }
    
    columnsResult.forEach((col, idx) => {
      console.log(`  ${idx + 1}. ${col.column_name} (${col.data_type})`);
    });
    
    // Get row count
    console.log("\n📊 Row Count:");
    const countResult = await sql("SELECT COUNT(*) as count FROM shifts");
    console.log(`  Total rows: ${countResult[0].count}`);
    
    // Get sample data
    console.log("\n📄 Sample Data (first 3 rows):");
    const sampleResult = await sql(`
      SELECT id, title, department, specialty, facility_id, status, created_at 
      FROM shifts 
      ORDER BY created_at DESC 
      LIMIT 3
    `);
    
    if (sampleResult.length === 0) {
      console.log("  No sample data found");
    } else {
      sampleResult.forEach((row, idx) => {
        console.log(`  ${idx + 1}. ID: ${row.id}, Title: "${row.title}", Status: ${row.status}`);
        console.log(`     Dept: ${row.department}, Specialty: ${row.specialty}, Facility: ${row.facility_id}`);
        console.log(`     Created: ${row.created_at}`);
        console.log("");
      });
    }
    
    // Check for problematic columns that might be referenced incorrectly
    console.log("\n🔍 Column Name Analysis:");
    const allColumns = columnsResult.map(col => col.column_name);
    const commonMistakes = {
      'shift_position': allColumns.find(col => col.includes('position') || col.includes('role')),
      'shiftType': allColumns.find(col => col === 'shift_type'),
      'facilityId': allColumns.find(col => col === 'facility_id'),
      'startTime': allColumns.find(col => col === 'start_time'),
      'endTime': allColumns.find(col => col === 'end_time'),
      'requiredStaff': allColumns.find(col => col === 'required_staff'),
      'assignedStaffIds': allColumns.find(col => col === 'assigned_staff_ids'),
      'createdById': allColumns.find(col => col === 'created_by_id'),
    };
    
    Object.entries(commonMistakes).forEach(([incorrectName, correctName]) => {
      if (correctName) {
        console.log(`  ✅ ${incorrectName} → ${correctName}`);
      } else {
        console.log(`  ❌ ${incorrectName} → NOT FOUND`);
      }
    });
    
    console.log("\n✅ Diagnostics complete!");
    
  } catch (error) {
    console.error("❌ Diagnostics failed:", error);
    if (error?.stack) console.error(error.stack);
  } finally {
    process.exit(0);
  }
}

runDiagnostics();