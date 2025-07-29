# Facility User Schema Analysis & Consolidation Proposal

## Current Schema Analysis

### 1. Data Redundancy Issues Identified

#### A. Facility Associations (Stored in 3 places)
- **facilityUsers table**: 
  - `primaryFacilityId` (single facility)
  - `associatedFacilityIds` (JSONB array)
- **facilityUserFacilityAssociations table**: 
  - Separate many-to-many relationship table
  - Also stores `isPrimary`, `teamId`, `facilitySpecificPermissions`
- **Problem**: Same data in multiple locations, unclear which is source of truth

#### B. Permissions (Stored in 3 places)
- **facilityUsers table**: 
  - `permissions` (JSONB array - global permissions)
  - `customPermissions` (JSONB object)
- **facilityUserPermissions table**: 
  - Granular per-facility permissions with metadata
  - Tracks who granted, when, constraints, expiration
- **facilityUserFacilityAssociations table**: 
  - `facilitySpecificPermissions` (JSONB array)
- **Problem**: Permission data scattered, difficult to determine effective permissions

#### C. Team Associations
- **facilityUserFacilityAssociations**: Has `teamId`
- **facilityUserTeamMemberships**: Separate table for team membership
- **Problem**: Team association data in two places

## Proposed Consolidation Strategy

### Option 1: Simplified Single-Table Design (Recommended)

Consolidate most data into the `facilityUsers` table with improved JSONB structures:

```sql
-- Enhanced facilityUsers table
facilityUsers:
  - id, username, email, password, firstName, lastName
  - role, avatar, isActive
  - phone, title, department
  
  -- Replace multiple facility fields with single JSONB
  - facilityAssociations: JSONB
    [{
      facilityId: 1,
      isPrimary: true,
      teamId: 5,
      permissions: ["view_schedules", "create_shifts"],
      assignedBy: 10,
      assignedAt: "2025-01-01",
      constraints: { departments: ["ICU"], maxShifts: 50 },
      expiresAt: null
    }]
  
  -- Global permissions (apply to all facilities)
  - globalPermissions: JSONB ["manage_users", "view_analytics"]
  
  -- Account management fields (unchanged)
  - lastLogin, loginCount, passwordResetRequired, etc.

-- Keep only these supporting tables:
facilityUserRoleTemplates (unchanged - useful for role setup)
facilityUserActivityLog (unchanged - needed for audit trail)

-- Remove these tables:
- facilityUserPermissions ❌
- facilityUserFacilityAssociations ❌ 
- facilityUserTeamMemberships ❌
```

### Option 2: Normalized Design with Clear Boundaries

Keep tables but with clearer separation of concerns:

```sql
-- Core user data only
facilityUsers:
  - Basic user info only (no facility/permission data)

-- Single source for facility associations
facilityUserFacilityAssociations:
  - All facility relationships
  - Includes team assignments
  - Remove facilitySpecificPermissions

-- Single source for permissions
facilityUserPermissions:
  - All permissions (global and facility-specific)
  - Add scope field: "global" or facility ID
  - Remove permissions from other tables
```

## Implementation Benefits

### Option 1 Benefits (Recommended):
1. **Simpler queries** - One table join for most operations
2. **Clear data ownership** - All user data in one place
3. **Better performance** - Fewer joins, indexed JSONB
4. **Easier maintenance** - Less complexity
5. **Flexible** - JSONB allows schema evolution

### Migration Strategy

1. **Phase 1: Schema Update**
   - Add new JSONB columns to facilityUsers
   - Create migration script to consolidate data

2. **Phase 2: Data Migration**
   ```sql
   -- Example migration for facility associations
   UPDATE facility_users fu
   SET facility_associations = (
     SELECT jsonb_agg(
       jsonb_build_object(
         'facilityId', fa.facility_id,
         'isPrimary', fa.is_primary,
         'teamId', fa.team_id,
         'permissions', COALESCE(
           (SELECT array_agg(p.permission)
            FROM facility_user_permissions p
            WHERE p.user_id = fu.id 
            AND p.facility_id = fa.facility_id),
           '{}'::text[]
         ),
         'assignedBy', fa.assigned_by_id,
         'assignedAt', fa.assigned_at
       )
     )
     FROM facility_user_facility_associations fa
     WHERE fa.user_id = fu.id
   );
   ```

3. **Phase 3: Code Updates**
   - Update storage methods to use new structure
   - Simplify permission checking logic
   - Update API endpoints

4. **Phase 4: Cleanup**
   - Drop redundant tables after verification
   - Update indexes for JSONB queries

## Query Examples with New Structure

```typescript
// Get user with all facility permissions
const userWithPermissions = await db
  .select()
  .from(facilityUsers)
  .where(eq(facilityUsers.id, userId));

// Check if user has permission at specific facility
const hasPermission = user.facilityAssociations
  .find(fa => fa.facilityId === facilityId)
  ?.permissions.includes('create_shifts');

// Get all users at a facility
const facilityUsers = await db
  .select()
  .from(facilityUsers)
  .where(
    sql`facility_associations @> '[{"facilityId": ${facilityId}}]'`
  );
```

## Summary

The proposed consolidation (Option 1) would:
- Reduce 6 tables to 3
- Eliminate data duplication
- Simplify permission management
- Improve query performance
- Maintain audit capabilities
- Provide clearer data model