# Facility User Schema Migration Implementation Plan

## Step-by-Step Migration Guide

### Step 1: Create New Schema

```typescript
// shared/schema.ts - Updated facilityUsers table
export const facilityUsers = pgTable("facility_users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  role: text("role").notNull(),
  avatar: text("avatar"),
  isActive: boolean("is_active").default(true),
  
  // Contact & Profile
  phone: text("phone"),
  title: text("title"),
  department: text("department"),
  
  // NEW: Consolidated facility associations with permissions
  facilityAssociations: jsonb("facility_associations").$type<Array<{
    facilityId: number;
    isPrimary: boolean;
    teamId?: number;
    permissions: string[];
    assignedBy?: number;
    assignedAt?: string;
    constraints?: {
      departments?: string[];
      maxShifts?: number;
      expiresAt?: string;
    };
  }>>().default([]),
  
  // NEW: Global permissions (apply across all facilities)
  globalPermissions: jsonb("global_permissions").$type<string[]>().default([]),
  
  // Account Management (unchanged)
  lastLogin: timestamp("last_login"),
  loginCount: integer("login_count").default(0),
  passwordResetRequired: boolean("password_reset_required").default(false),
  twoFactorEnabled: boolean("two_factor_enabled").default(false),
  
  // Audit (unchanged)
  createdById: integer("created_by_id"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
```

### Step 2: Migration Script

```typescript
// server/migrate-facility-user-schema.ts
import { db } from "./db";
import { facilityUsers, facilityUserPermissions, facilityUserFacilityAssociations } from "@shared/schema";

export async function consolidateFacilityUserData() {
  console.log("Starting facility user data consolidation...");
  
  try {
    // Get all facility users
    const users = await db.select().from(facilityUsers);
    
    for (const user of users) {
      // Build consolidated facility associations
      const associations = await db
        .select()
        .from(facilityUserFacilityAssociations)
        .where(eq(facilityUserFacilityAssociations.userId, user.id));
      
      const consolidatedAssociations = await Promise.all(
        associations.map(async (assoc) => {
          // Get permissions for this facility
          const permissions = await db
            .select()
            .from(facilityUserPermissions)
            .where(
              and(
                eq(facilityUserPermissions.userId, user.id),
                eq(facilityUserPermissions.facilityId, assoc.facilityId),
                eq(facilityUserPermissions.isActive, true)
              )
            );
          
          return {
            facilityId: assoc.facilityId,
            isPrimary: assoc.isPrimary || false,
            teamId: assoc.teamId,
            permissions: permissions.map(p => p.permission),
            assignedBy: assoc.assignedById,
            assignedAt: assoc.assignedAt?.toISOString(),
            constraints: permissions[0]?.constraints || undefined,
          };
        })
      );
      
      // Handle users with primaryFacilityId but no associations
      if (user.primaryFacilityId && !consolidatedAssociations.find(a => a.facilityId === user.primaryFacilityId)) {
        consolidatedAssociations.push({
          facilityId: user.primaryFacilityId,
          isPrimary: true,
          permissions: user.permissions || [],
          assignedAt: new Date().toISOString(),
        });
      }
      
      // Extract global permissions (permissions without facility constraint)
      const globalPerms = await db
        .select()
        .from(facilityUserPermissions)
        .where(
          and(
            eq(facilityUserPermissions.userId, user.id),
            isNull(facilityUserPermissions.facilityId)
          )
        );
      
      // Update user with consolidated data
      await db
        .update(facilityUsers)
        .set({
          facilityAssociations: consolidatedAssociations,
          globalPermissions: globalPerms.map(p => p.permission),
          updatedAt: new Date(),
        })
        .where(eq(facilityUsers.id, user.id));
    }
    
    console.log("✅ Data consolidation complete!");
    
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  }
}
```

### Step 3: Update Storage Methods

```typescript
// server/storage.ts - Updated methods
class DatabaseStorage implements IStorage {
  // Get effective permissions for a user at a facility
  async getFacilityUserPermissions(userId: number, facilityId: number): Promise<string[]> {
    const user = await this.getFacilityUser(userId);
    if (!user) return [];
    
    // Get facility-specific permissions
    const facilityAssoc = user.facilityAssociations?.find(
      (fa) => fa.facilityId === facilityId
    );
    
    // Combine global and facility-specific permissions
    const permissions = new Set([
      ...(user.globalPermissions || []),
      ...(facilityAssoc?.permissions || []),
    ]);
    
    return Array.from(permissions);
  }
  
  // Add facility association
  async addFacilityAssociation(
    userId: number,
    facilityId: number,
    data: {
      isPrimary?: boolean;
      teamId?: number;
      permissions?: string[];
      assignedBy: number;
    }
  ): Promise<void> {
    const user = await this.getFacilityUser(userId);
    if (!user) throw new Error("User not found");
    
    const associations = user.facilityAssociations || [];
    
    // Check if association already exists
    const existingIndex = associations.findIndex(
      (fa) => fa.facilityId === facilityId
    );
    
    if (existingIndex >= 0) {
      // Update existing
      associations[existingIndex] = {
        ...associations[existingIndex],
        ...data,
        assignedAt: new Date().toISOString(),
      };
    } else {
      // Add new
      associations.push({
        facilityId,
        isPrimary: data.isPrimary || false,
        teamId: data.teamId,
        permissions: data.permissions || [],
        assignedBy: data.assignedBy,
        assignedAt: new Date().toISOString(),
      });
    }
    
    await db
      .update(facilityUsers)
      .set({ facilityAssociations: associations })
      .where(eq(facilityUsers.id, userId));
  }
}
```

### Step 4: Update API Endpoints

```typescript
// server/routes.ts - Updated permission checking
app.get("/api/facility-users/:id/permissions/:facilityId", async (req, res) => {
  const userId = parseInt(req.params.id);
  const facilityId = parseInt(req.params.facilityId);
  
  const permissions = await storage.getFacilityUserPermissions(userId, facilityId);
  res.json({ permissions });
});
```

### Step 5: Cleanup Old Tables

After verifying the migration:

```sql
-- Drop redundant tables (after thorough testing!)
DROP TABLE facility_user_permissions;
DROP TABLE facility_user_facility_associations;
DROP TABLE facility_user_team_memberships;

-- Remove old columns from facility_users
ALTER TABLE facility_users 
DROP COLUMN primary_facility_id,
DROP COLUMN associated_facility_ids,
DROP COLUMN permissions,
DROP COLUMN custom_permissions;
```

## Benefits Achieved

1. **Reduced Complexity**: 6 tables → 3 tables
2. **Single Source of Truth**: All user-facility-permission data in one place
3. **Better Performance**: Fewer joins required
4. **Clearer Logic**: Permission calculation simplified
5. **Maintained Flexibility**: JSONB allows future extensions