-- Migration to clean up unused user-related tables
-- Created: July 29, 2025

-- Step 1: Add missing columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS department TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT;

-- Step 2: Backup data before dropping tables (optional - for safety)
-- You can export these tables if needed before running the drops

-- Step 3: Drop unused and redundant tables
DROP TABLE IF EXISTS facility_user_permissions CASCADE;
DROP TABLE IF EXISTS facility_user_facility_associations CASCADE;
DROP TABLE IF EXISTS facility_user_teams CASCADE;
DROP TABLE IF EXISTS user_dashboard_widgets CASCADE;

-- Note: These tables contained the following record counts:
-- facility_user_permissions: 152 records (unused legacy data)
-- facility_user_facility_associations: 4 records (data duplicated in JSONB)
-- facility_user_teams: 0 records (empty duplicate table)
-- user_dashboard_widgets: 0 records (completely unused)

-- Step 4: Verify remaining tables
-- The following user-related tables should remain:
-- - users (authentication for super admins)
-- - facility_users (facility management users)
-- - staff (healthcare worker profiles)
-- - facility_user_role_templates (role permission templates)
-- - facility_user_team_memberships (consider removing in phase 2)
-- - facility_user_activity_log (audit trail)
-- - user_sessions (session management)