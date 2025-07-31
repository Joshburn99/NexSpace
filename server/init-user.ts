import { db } from "./db";
import { users } from "@shared/schema";
import { hashPassword } from "./auth";
import { UserRole } from "@shared/schema";

export async function createSuperUser() {
  try {
    // Check if Joshburn already exists
    const existingUser = await db.select().from(users).where({ username: "joshburn" }).limit(1);

    if (existingUser.length > 0) {
      return;
    }

    // Create Joshburn superuser
    const hashedPassword = await hashPassword("password123");

    await db.insert(users).values({
      username: "joshburn",
      email: "joshburn@nexspace.com",
      password: hashedPassword,
      firstName: "Josh",
      lastName: "Burn",
      role: UserRole.SUPER_ADMIN,
      isActive: true,
    });

  } catch (error) {

  }
}
