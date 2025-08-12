#!/usr/bin/env tsx
import dotenv from "dotenv";
dotenv.config();

import readline from "readline";
import { db } from "../server/db";
import { sql } from "drizzle-orm";
import { execSync } from "child_process";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function resetDatabase() {
  console.log("\n⚠️  WARNING: Database Reset");
  console.log("============================");
  console.log("This will:");
  console.log("1. Drop ALL tables in the database");
  console.log("2. Recreate the schema from scratch");
  console.log("3. Run all migrations");
  console.log("4. Run the seed script");
  console.log("\n❗ ALL DATA WILL BE LOST!");
  
  const answer = await question("\nAre you ABSOLUTELY SURE? Type 'YES' to confirm: ");
  
  if (answer !== "YES") {
    console.log("\n✅ Database reset cancelled.");
    rl.close();
    process.exit(0);
  }
  
  const finalConfirm = await question("\n🔴 FINAL CONFIRMATION - Type the database name to proceed: ");
  
  if (!finalConfirm || finalConfirm.trim() === "") {
    console.log("\n✅ Database reset cancelled.");
    rl.close();
    process.exit(0);
  }
  
  console.log("\n🔥 Starting database reset...");
  
  try {
    // 1. Drop all tables
    console.log("\n📤 Dropping all tables...");
    const tables = await db.execute(sql`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public'
    `);
    
    for (const table of tables.rows) {
      const tableName = (table as any).tablename;
      console.log(`  Dropping table: ${tableName}`);
      await db.execute(sql.raw(`DROP TABLE IF EXISTS "${tableName}" CASCADE`));
    }
    
    // 2. Run Drizzle push to recreate schema
    console.log("\n📥 Recreating database schema...");
    execSync("npm run db:push", { stdio: "inherit" });
    
    // 3. Run migrations
    console.log("\n🔄 Running migrations...");
    execSync("npm run db:migrate", { stdio: "inherit" });
    
    // 4. Run seed
    console.log("\n🌱 Seeding database...");
    execSync("npm run db:seed", { stdio: "inherit" });
    
    console.log("\n✨ Database reset completed successfully!");
    
  } catch (error) {
    console.error("\n❌ Database reset failed:", error);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run reset
resetDatabase().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});