import bcrypt from 'bcryptjs';
import { db } from '../server/db';
import { users } from '../shared/schema';
import { sql } from 'drizzle-orm';

async function createAdmin() {
  try {
    const password = 'admin123';
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const result = await db.insert(users).values({
      username: 'super_admin',
      email: 'admin@nexspace.com',
      password: hashedPassword,
      role: 'super_admin',
      isActive: true,
      onboardingCompleted: true,
      firstName: 'Super',
      lastName: 'Admin'
    }).onConflictDoNothing();
    
    console.log('Admin user created successfully');
    
    // Verify creation
    const adminUser = await db.select().from(users).where(sql`username = 'super_admin'`);
    console.log('Admin user details:', adminUser);
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  }
}

createAdmin();