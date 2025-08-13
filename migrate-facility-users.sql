-- Migration: Move facility-related users from users table to facility_users table
-- This is idempotent - safe to run multiple times

BEGIN;

-- Step 1: Insert facility users that don't already exist in facility_users
INSERT INTO facility_users (
    username,
    email,
    password,
    first_name,
    last_name,
    role,
    avatar,
    is_active,
    primary_facility_id,
    associated_facility_ids,
    phone,
    title,
    department,
    created_at,
    updated_at
)
SELECT 
    u.username,
    u.email,
    u.password,
    u.first_name,
    u.last_name,
    u.role,
    u.avatar,
    u.is_active,
    COALESCE(u.facility_id, 1) as primary_facility_id,  -- Default to facility 1 if null
    CASE 
        WHEN u.associated_facilities IS NOT NULL THEN u.associated_facilities
        WHEN u.facility_id IS NOT NULL THEN jsonb_build_array(u.facility_id)
        ELSE '[]'::jsonb
    END as associated_facility_ids,
    u.phone,
    COALESCE(u.department, u.role) as title,  -- Use role as title if department is null
    u.department,
    u.created_at,
    u.updated_at
FROM users u
WHERE u.role NOT IN ('super_admin', 'internal_admin')
  AND NOT EXISTS (
      SELECT 1 FROM facility_users fu 
      WHERE fu.email = u.email OR fu.username = u.username
  );

-- Step 2: Deactivate migrated users in the users table (soft delete)
UPDATE users 
SET is_active = false,
    updated_at = NOW()
WHERE role NOT IN ('super_admin', 'internal_admin')
  AND EXISTS (
      SELECT 1 FROM facility_users fu 
      WHERE fu.email = users.email OR fu.username = users.username
  );

-- Step 3: Add unique constraints if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'users_email_unique'
    ) THEN
        ALTER TABLE users ADD CONSTRAINT users_email_unique UNIQUE(email);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'users_username_unique'
    ) THEN
        ALTER TABLE users ADD CONSTRAINT users_username_unique UNIQUE(username);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'facility_users_email_unique'
    ) THEN
        ALTER TABLE facility_users ADD CONSTRAINT facility_users_email_unique UNIQUE(email);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'facility_users_username_unique'
    ) THEN
        ALTER TABLE facility_users ADD CONSTRAINT facility_users_username_unique UNIQUE(username);
    END IF;
END $$;

-- Step 4: Report migration results
SELECT 'Migration Summary:' as info;
SELECT 'Active superusers remaining in users table:' as info, COUNT(*) as count 
FROM users 
WHERE role IN ('super_admin', 'internal_admin') AND is_active = true;

SELECT 'Deactivated facility users in users table:' as info, COUNT(*) as count 
FROM users 
WHERE role NOT IN ('super_admin', 'internal_admin');

SELECT 'Total facility users:' as info, COUNT(*) as count 
FROM facility_users;

COMMIT;