import { db } from "./db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { users, UserRole } from "@shared/schema";
import { hashPassword } from "./auth";

export async function createSuperUser() {
  try {
    // Check if joshburn already exists
    const existingUser = await db.select().from(users).where(eq(users.username, "joshburn")).limit(1);

    if (existingUser.length > 0) {
      console.log("✅ Superuser 'joshburn' already exists");
      return existingUser[0];
    }

    // Create joshburn superuser with bcrypt-hashed password
    const hashedPassword = await bcrypt.hash("admin123", 10);

    const [newUser] = await db.insert(users).values({
      username: "joshburn",
      email: "joshburn@nexspace.com",
      password: hashedPassword,
      firstName: "Josh",
      lastName: "Burn",
      role: UserRole.SUPER_ADMIN,
      isActive: true,
    }).returning();

    console.log("✅ Superuser 'joshburn' created successfully");
    console.log("   Username: joshburn");
    console.log("   Password: admin123");
    console.log("   Role: super_admin");
    
    return newUser;

  } catch (error) {
    console.error("❌ Error creating superuser:", error);
    throw error;
  }
}
