# Facility User Tables Audit Report

## Executive Summary
After a comprehensive analysis of the NexSpace database schema and codebase, I've identified several facility user-related tables that appear to be unused or redundant. The system has evolved to store most facility user data directly in the `facilityUsers` table using JSONB fields, making several normalized tables obsolete.

## Current Facility User Tables

### 1. **facilityUsers** ✅ ACTIVELY USED
- **Status**: Core table - Keep
- **Usage**: Primary table for facility user accounts
- **Contains**: username, email, password, firstName, lastName, role, permissions (JSONB), associatedFacilityIds (JSONB)
- **Active References**: Used throughout authentication, routes, and unified-data-service

### 2. **facilityUserPermissions** ❌ UNUSED
- **Status**: Can be removed
- **Intended Purpose**: Store granular permissions per user/facility combination
- **Current Reality**: Permissions are stored in the `permissions` JSONB column of `facilityUsers` table
- **Code References**: 
  - Defined in schema but NO active queries found
  - No INSERT, UPDATE, DELETE, or SELECT operations
  - Referenced only in migration snapshots
- **Recommendation**: Remove this table - functionality replaced by JSONB permissions field

### 3. **facilityUserFacilityAssociations** ⚠️ MINIMAL USE
- **Status**: Can be removed with minor refactoring
- **Intended Purpose**: Many-to-many relationship between users and facilities
- **Current Reality**: Facility associations stored in `associatedFacilityIds` JSONB array in `facilityUsers`
- **Code References**:
  - Used only in sample data setup (`/api/facility-users/setup-sample-data`)
  - One DELETE operation to clear before inserting sample data
  - No production queries or business logic uses this table
- **Recommendation**: Remove after updating sample data setup to not use it

### 4. **facilityUserTeamMemberships** ⚠️ MINIMAL USE  
- **Status**: Can be removed with refactoring
- **Intended Purpose**: Track which teams facility users belong to
- **Current Reality**: Limited to one query in unified-data-service.ts
- **Code References**:
  - Single SELECT query in `getFacilityUsersWithAssociations()`
  - Used to populate `teamMemberships` array in response
  - Could be replaced with team associations in JSONB
- **Recommendation**: Migrate team memberships to JSONB field in facilityUsers

### 5. **facilityUserRoleTemplates** ✅ ACTIVELY USED
- **Status**: Keep - actively used
- **Purpose**: Define permission templates for different roles
- **Usage**: Used in facility-user-roles-setup.ts to manage role permissions
- **Active References**: 
  - Setup script creates/updates templates
  - Used by `getFacilityUserRoleTemplate` in storage layer
- **Recommendation**: Keep this table

### 6. **facilityUserActivityLog** ✅ ACTIVELY USED
- **Status**: Keep - needed for audit trail
- **Purpose**: Track facility user actions for compliance
- **Usage**: Logging user activities
- **Recommendation**: Keep for audit requirements

## Data Currently Stored Redundantly

The `facilityUsers` table already contains:
- `permissions`: JSONB array storing all user permissions
- `associatedFacilityIds`: JSONB array storing facility associations  
- `primaryFacilityId`: Direct reference to primary facility
- `role`: User's role (used to determine permissions)

This makes the normalized tables redundant since:
1. Permissions are role-based and stored directly
2. Facility associations are stored in JSONB
3. No complex queries require the normalized structure

## Migration Impact Analysis

### Tables Safe to Remove:
1. **facilityUserPermissions** - Zero production usage
2. **facilityUserFacilityAssociations** - Only used in sample data setup
3. **facilityUserTeamMemberships** - Single query that can be refactored

### Required Code Changes:
1. Update `unified-data-service.ts` to remove team membership query
2. Update sample data setup to not use association table
3. Remove table definitions from schema.ts
4. Create migration to drop unused tables

### No Breaking Changes Expected:
- All production functionality uses JSONB fields
- Authentication/authorization unaffected
- API responses can maintain same structure

## Recommended Architecture

Consolidate to 3 tables:
```
facilityUsers (main table with JSONB for associations/permissions)
facilityUserRoleTemplates (permission templates)  
facilityUserActivityLog (audit trail)
```

## Benefits of Consolidation

1. **Simpler Queries**: No complex joins needed
2. **Better Performance**: Fewer table lookups
3. **Easier Maintenance**: Less schema complexity
4. **Flexible Evolution**: JSONB allows schema changes without migrations
5. **Consistent Pattern**: Matches how the system actually works today

## Implementation Steps

1. **Phase 1**: Remove `facilityUserPermissions` (no code changes needed)
2. **Phase 2**: Update sample data setup, then remove `facilityUserFacilityAssociations`  
3. **Phase 3**: Add `teamMemberships` JSONB field, migrate data, remove `facilityUserTeamMemberships`
4. **Phase 4**: Run migration to DROP tables from database
5. **Phase 5**: Update schema.ts to remove table definitions

## SQL Migration Script

```sql
-- Phase 1: Drop unused permissions table
DROP TABLE IF EXISTS facility_user_permissions;

-- Phase 2: Drop associations table (after code update)
DROP TABLE IF EXISTS facility_user_facility_associations;

-- Phase 3: Add team memberships to main table
ALTER TABLE facility_users 
ADD COLUMN IF NOT EXISTS team_memberships JSONB DEFAULT '[]';

-- Migrate existing team membership data
UPDATE facility_users fu
SET team_memberships = (
  SELECT COALESCE(json_agg(json_build_object(
    'teamId', tm.team_id,
    'role', tm.role
  )), '[]'::json)
  FROM facility_user_team_memberships tm
  WHERE tm.facility_user_id = fu.id
);

-- Phase 4: Drop team memberships table
DROP TABLE IF EXISTS facility_user_team_memberships;
```

## Conclusion

The facility user data model has evolved from a normalized structure to a more document-oriented approach using JSONB. Three tables (`facilityUserPermissions`, `facilityUserFacilityAssociations`, `facilityUserTeamMemberships`) can be safely removed with minimal code changes, simplifying the schema while maintaining all functionality.