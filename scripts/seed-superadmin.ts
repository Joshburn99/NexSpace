#!/usr/bin/env tsx
/**
 * Seed script to create a super admin user for development
 * Usage: npm run seed:superadmin
 */

import { db } from "../server/db";
import { users } from "../shared/schema";
import { eq, or } from "drizzle-orm";
import bcrypt from "bcryptjs";

async function seedSuperAdmin() {
  console.log("🌱 Seeding super admin user...");

  try {
    // Check if super admin already exists
    const existingAdmin = await db
      .select()
      .from(users)
      .where(or(eq(users.username, "admin"), eq(users.role, "super_admin")))
      .limit(1);

    if (existingAdmin.length > 0) {
      console.log("✅ Super admin already exists");
      return;
    }

    // Get admin password from environment or use a secure default
    const adminPassword = process.env.SUPER_ADMIN_PASSWORD || "ChangeMe123!";
    
    if (adminPassword === "ChangeMe123!") {
      console.warn("⚠️  Using default password. Please set SUPER_ADMIN_PASSWORD in .env");
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    // Create super admin user
    const [superAdmin] = await db
      .insert(users)
      .values({
        username: "admin",
        email: "admin@nexspace.com",
        password: hashedPassword,
        firstName: "System",
        lastName: "Administrator",
        role: "super_admin",
        isActive: true,
        onboardingCompleted: true,
        onboardingStep: 4,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    console.log("✅ Super admin created successfully");
    console.log("📧 Email:", superAdmin.email);
    console.log("👤 Username:", superAdmin.username);
    console.log("🔑 Password:", adminPassword === "ChangeMe123!" ? "ChangeMe123! (please change this!)" : "[Set via SUPER_ADMIN_PASSWORD env var]");
    
  } catch (error) {
    console.error("❌ Error creating super admin:", error);
    process.exit(1);
  }

  process.exit(0);
}

// Run the seed
seedSuperAdmin();