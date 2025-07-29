# User Data Tables Comprehensive Report

## Executive Summary
The NexSpace platform currently has 15 user-related database tables with significant redundancy and inefficiency. Many tables store duplicate data or remain completely unused. This report analyzes each table, identifies usage patterns, and recommends consolidation strategies to streamline the data model.

## Current Database Statistics

| Table Name | Record Count | Status |
|------------|--------------|--------|
| facility_user_permissions | 152 | ❌ Unused (legacy data) |
| staff | 83 | ✅ Active |
| users | 36 | ✅ Active |
| facility_users | 21 | ✅ Active |
| facility_user_role_templates | 13 | ✅ Active |
| facility_user_team_memberships | 11 | ⚠️ Minimal use |
| facility_user_facility_associations | 4 | ❌ Redundant |
| facility_user_activity_log | 3 | ✅ Active |
| facility_user_teams | 0 | ❌ Empty/Unused |
| user_dashboard_widgets | 0 | ❌ Empty/Unused |
| user_sessions | 0 | ⚠️ May use file storage |

## Table Analysis

### 1. **facility_users** (PRIMARY USER TABLE) ✅ ACTIVELY USED
**Records:** 21 facility management users
**Current Columns:**
- `id`, `username`, `email`, `password` - Core authentication
- `first_name`, `last_name`, `role`, `avatar` - Basic profile
- `is_active`, `primary_facility_id` - Account status
- `associated_facility_ids` (JSONB) - Facility associations
- `phone`, `title`, `department` - Contact/role info
- `permissions` (JSONB) - User permissions array
- `custom_permissions` (JSONB) - Facility-specific permissions
- `last_login`, `login_count`, `password_reset_required`, `two_factor_enabled` - Security
- `created_by_id`, `notes` - Audit fields
- `created_at`, `updated_at` - Timestamps

**Purpose:** Main table for facility management users (administrators, schedulers, billing managers)
**Status:** KEEP - Core functionality depends on this table

### 2. **users** ✅ ACTIVELY USED
**Current Columns:**
- `id`, `username`, `email`, `password` - Core authentication
- `first_name`, `last_name`, `role`, `avatar` - Basic profile
- `is_active`, `facility_id` - Account status
- `specialty` - Worker specialty (for clinical users)
- `associated_facilities` (JSONB) - Facility associations
- `availability_status` - Current availability
- `dashboard_preferences` (JSONB) - UI customization
- `onboarding_completed`, `onboarding_step` - Onboarding tracking
- `calendar_feed_token` - Calendar sync
- `created_at`, `updated_at` - Timestamps

**Purpose:** Authentication for super admins and legacy users
**Status:** KEEP - Required for authentication system
**Issues:** Missing bio, phone, department fields that forms expect

### 3. **staff** ✅ ACTIVELY USED
**Current Columns:**
- 38 columns including personal info, licensing, certifications, addresses, performance metrics
- Comprehensive healthcare worker profile data
- `associated_facilities` (JSONB) - Facility associations
- Employment details, compliance tracking, availability

**Purpose:** Healthcare worker profiles and operational data
**Status:** KEEP - Core workforce management functionality

### 4. **facility_user_permissions** ❌ REDUNDANT/UNUSED
**Current Columns:**
- `id`, `user_id`, `facility_id`, `permission`
- `granted_by_id`, `granted_at`, `is_active`
- `constraints` (JSONB), `expires_at`, `notes`

**Purpose:** Granular per-facility permissions
**Status:** REMOVE - Zero production usage
**Reason:** Permissions stored in `facility_users.permissions` JSONB field

### 5. **facility_user_role_templates** ✅ ACTIVELY USED
**Current Columns:**
- `id`, `name`, `description`, `role`
- `permissions` (JSONB) - Permission arrays
- `is_default`, `is_active`, `created_by_id`, `facility_id`

**Purpose:** Permission templates for roles
**Status:** KEEP - Used for role-based permissions

### 6. **facility_user_facility_associations** ❌ REDUNDANT
**Current Columns:**
- `id`, `facility_user_id`, `facility_id`
- `created_at`, `updated_at`

**Purpose:** Many-to-many facility associations
**Status:** REMOVE - Only used in sample data setup
**Reason:** Associations stored in `facility_users.associated_facility_ids` JSONB

### 7. **facility_user_teams** ❌ REDUNDANT/DUPLICATE
**Current Columns:**
- `id`, `facility_user_id`, `team_id`, `role`
- `created_at`, `updated_at`

**Purpose:** Team associations
**Status:** REMOVE - Duplicates facility_user_team_memberships

### 8. **facility_user_team_memberships** ⚠️ MINIMAL USE
**Current Columns:**
- `id`, `facility_user_id`, `team_id`, `role`
- `created_at`, `updated_at`

**Purpose:** Team membership tracking
**Status:** CONSIDER REMOVING - Single query usage
**Alternative:** Add `team_memberships` JSONB to facility_users

### 9. **facility_user_activity_log** ✅ ACTIVELY USED
**Current Columns:**
- `id`, `user_id`, `facility_id`
- `action`, `resource`, `details` (JSONB)
- `ip_address`, `user_agent`, `timestamp`

**Purpose:** Audit trail for compliance
**Status:** KEEP - Required for security/compliance

### 10. **user_dashboard_widgets** ❌ APPEARS UNUSED
**Current Columns:**
- `id`, `user_id`
- `widget_configuration` (JSONB)
- `created_at`, `updated_at`

**Purpose:** Dashboard customization
**Status:** INVESTIGATE - No active code references found
**Note:** `users.dashboard_preferences` may serve this purpose

### 11. **user_sessions** ✅ ACTIVELY USED
**Current Columns:**
- `id`, `user_id`
- `session_data` (JSONB)
- `expires_at`, `created_at`, `updated_at`

**Purpose:** Session management
**Status:** KEEP - Core authentication infrastructure

### 12. **permissions** ✅ SYSTEM TABLE
**Purpose:** System permission definitions
**Status:** KEEP - Core permission system

### 13. **role_permissions** ✅ SYSTEM TABLE
**Purpose:** Role to permission mappings
**Status:** KEEP - Core permission system

### 14. **audit_logs** ✅ ACTIVELY USED
**Purpose:** General system audit trail
**Status:** KEEP - Required for compliance

## Key Findings

### 1. Data Duplication Issues
- **Email addresses** appear across 3 tables (users, facility_users, staff)
- **Facility associations** stored redundantly in both JSONB fields and junction tables
- **Permissions** stored in JSONB fields, making permission tables redundant

### 2. Unused/Redundant Tables
- `facility_user_permissions` - Zero production usage
- `facility_user_facility_associations` - Data duplicated in JSONB
- `facility_user_teams` - Duplicate of team_memberships table
- `user_dashboard_widgets` - Appears completely unused

### 3. Missing Fields
- **users table** missing: bio, phone, department (forms expect these)
- **facility_users table** has comprehensive fields but inconsistent with users table

## Recommendations

### Immediate Actions (No Breaking Changes)
1. **Remove unused tables:**
   - DROP `facility_user_permissions`
   - DROP `facility_user_facility_associations`
   - DROP `facility_user_teams`
   - DROP `user_dashboard_widgets` (after verification)

2. **Add missing columns to users table:**
   ```sql
   ALTER TABLE users 
   ADD COLUMN phone TEXT,
   ADD COLUMN department TEXT,
   ADD COLUMN bio TEXT;
   ```

### Medium-term Consolidation
1. **Merge team memberships into facility_users:**
   - Add `team_memberships` JSONB column to facility_users
   - Migrate data from facility_user_team_memberships
   - Remove the junction table

2. **Standardize user profile fields:**
   - Ensure users and facility_users have consistent basic fields
   - Consider creating a shared profile interface

### Long-term Architecture
1. **Consider unified user model:**
   - Single users table with type field
   - Role-specific data in JSONB columns
   - Reduces complexity and duplication

2. **Implement proper data constraints:**
   - Unique email across all user tables
   - Foreign key relationships where appropriate
   - Data validation at database level

## Benefits of Consolidation

1. **Performance:** Fewer joins, faster queries
2. **Maintainability:** Simpler schema, easier updates
3. **Data Integrity:** No duplicate/conflicting data
4. **Development Speed:** Clear data model, less confusion
5. **Storage Efficiency:** Eliminate redundant data

## Migration Path

### Phase 1: Clean up redundant tables (1 week)
- Remove unused tables
- Update code to not reference removed tables

### Phase 2: Add missing fields (1 day)
- Add phone, bio, department to users table
- Update forms to save to correct fields

### Phase 3: Consolidate associations (1 week)
- Migrate junction table data to JSONB
- Update queries to use JSONB fields

### Phase 4: Validate and optimize (ongoing)
- Monitor performance
- Ensure data consistency
- Document final schema