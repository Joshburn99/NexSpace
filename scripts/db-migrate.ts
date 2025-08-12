#!/usr/bin/env tsx
import dotenv from "dotenv";
dotenv.config();

import { db } from "../server/db";
import { sql } from "drizzle-orm";
import fs from "fs";
import path from "path";

async function runMigrations() {
  console.log("🚀 Running database migrations...");
  
  try {
    // Get all migration files
    const migrationsDir = path.join(process.cwd(), "migrations");
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith(".sql"))
      .sort();
    
    console.log(`Found ${migrationFiles.length} migration file(s)`);
    
    for (const file of migrationFiles) {
      console.log(`\n📝 Running migration: ${file}`);
      const migrationPath = path.join(migrationsDir, file);
      const migrationSQL = fs.readFileSync(migrationPath, "utf-8");
      
      // Execute the migration
      await db.execute(sql.raw(migrationSQL));
      console.log(`✅ Migration ${file} completed`);
    }
    
    console.log("\n✨ All migrations completed successfully!");
    
  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    process.exit(1);
  }
}

// Run migrations
runMigrations().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});