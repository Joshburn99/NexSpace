#!/usr/bin/env tsx

/**
 * CLI Script to Re-seed Superuser
 * 
 * Usage:
 *   npx tsx scripts/seed-superuser.ts
 *   npm run seed:superuser (if script is added to package.json)
 * 
 * This script creates or recreates the superuser account:
 *   Username: joshburn
 *   Password: admin123
 *   Role: super_admin
 */

import { db } from "../server/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { users, UserRole } from "../shared/schema";

async function seedSuperuser() {
  console.log("🔐 NexSpace Superuser Seeding Script");
  console.log("=====================================");
  
  try {
    // Check if superuser already exists
    const existingUser = await db.select().from(users)
      .where(eq(users.username, "joshburn"))
      .limit(1);

    if (existingUser.length > 0) {
      console.log("⚠️  Superuser 'joshburn' already exists");
      console.log("   Do you want to reset the password? (Ctrl+C to cancel)");
      
      // Delete existing user
      await db.delete(users).where(eq(users.username, "joshburn"));
      console.log("🗑️  Existing superuser deleted");
    }

    // Create new superuser with bcrypt-hashed password
    // Use environment variable for admin password or a secure default
const adminPassword = process.env.ADMIN_PASSWORD || "NexSpace2025!Secure";
const hashedPassword = await bcrypt.hash(adminPassword, 10);
    
    const [newUser] = await db.insert(users).values({
      username: "joshburn",
      email: "joshburn@nexspace.com", 
      password: hashedPassword,
      firstName: "Josh",
      lastName: "Burn",
      role: UserRole.SUPER_ADMIN,
      isActive: true,
      onboardingCompleted: true,
      onboardingStep: 4,
    }).returning();

    console.log("✅ Superuser created successfully!");
    console.log("=====================================");
    console.log(`   👤 Username: ${newUser.username}`);
    console.log("   🔑 Password: admin123");
    console.log(`   🛡️  Role: ${newUser.role}`);
    console.log(`   📧 Email: ${newUser.email}`);
    console.log(`   🆔 ID: ${newUser.id}`);
    console.log("=====================================");
    console.log("🚀 You can now log in to NexSpace!");
    
    process.exit(0);
    
  } catch (error) {
    console.error("❌ Error seeding superuser:", error);
    process.exit(1);
  }
}

// Run the script
seedSuperuser();