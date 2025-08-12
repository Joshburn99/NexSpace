-- NexSpace Database Migration 001: Schema Cleanup and Data Preservation
-- This migration preserves all existing data while adding missing core data

BEGIN;

-- Step 1: Ensure permissions table has required permissions
INSERT INTO permissions (name, description, category) VALUES
  ('dashboard.view', 'View dashboard', 'Dashboard'),
  ('dashboard.analytics', 'View analytics dashboard', 'Dashboard'),
  ('facilities.view', 'View facilities', 'Facilities'),
  ('facilities.create', 'Create facilities', 'Facilities'),
  ('facilities.edit', 'Edit facilities', 'Facilities'),
  ('facilities.delete', 'Delete facilities', 'Facilities'),
  ('staff.view', 'View staff', 'Staff'),
  ('staff.create', 'Create staff', 'Staff'),
  ('staff.edit', 'Edit staff', 'Staff'),
  ('staff.delete', 'Delete staff', 'Staff'),
  ('shifts.view', 'View shifts', 'Shifts'),
  ('shifts.create', 'Create shifts', 'Shifts'),
  ('shifts.edit', 'Edit shifts', 'Shifts'),
  ('shifts.delete', 'Delete shifts', 'Shifts'),
  ('shifts.assign', 'Assign staff to shifts', 'Shifts'),
  ('settings.view', 'View settings', 'Settings'),
  ('settings.edit', 'Edit settings', 'Settings'),
  ('audit.view', 'View audit logs', 'Audit'),
  ('reports.view', 'View reports', 'Reports'),
  ('reports.generate', 'Generate reports', 'Reports'),
  ('billing.view', 'View billing', 'Billing'),
  ('billing.manage', 'Manage billing', 'Billing'),
  ('users.view', 'View users', 'Users'),
  ('users.manage', 'Manage users', 'Users'),
  ('impersonate', 'Impersonate users', 'Admin'),
  ('teams.view', 'View teams', 'Teams'),
  ('teams.manage', 'Manage teams', 'Teams')
ON CONFLICT (name) DO NOTHING;

-- Step 2: Setup role permissions for super_admin
DELETE FROM role_permissions WHERE role = 'super_admin';
INSERT INTO role_permissions (role, permission_id)
SELECT 'super_admin', id FROM permissions;

-- Step 3: Setup role permissions for admin
DELETE FROM role_permissions WHERE role = 'admin';
INSERT INTO role_permissions (role, permission_id)
SELECT 'admin', id FROM permissions
WHERE name NOT IN ('impersonate', 'users.manage');

-- Step 4: Setup role permissions for facility_manager
DELETE FROM role_permissions WHERE role = 'facility_manager';
INSERT INTO role_permissions (role, permission_id)
SELECT 'facility_manager', id FROM permissions
WHERE name IN (
  'dashboard.view', 
  'facilities.view', 'facilities.edit',
  'staff.view', 'staff.create', 'staff.edit',
  'shifts.view', 'shifts.create', 'shifts.edit', 'shifts.assign',
  'reports.view', 
  'billing.view',
  'teams.view'
);

-- Step 5: Setup role permissions for internal_employee
DELETE FROM role_permissions WHERE role = 'internal_employee';
INSERT INTO role_permissions (role, permission_id)
SELECT 'internal_employee', id FROM permissions
WHERE name IN (
  'dashboard.view',
  'shifts.view',
  'staff.view'
);

-- Step 6: Setup role permissions for contractor_1099
DELETE FROM role_permissions WHERE role = 'contractor_1099';
INSERT INTO role_permissions (role, permission_id)
SELECT 'contractor_1099', id FROM permissions
WHERE name IN (
  'dashboard.view',
  'shifts.view'
);

-- Step 7: Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_facilities_is_active ON facilities(is_active);
CREATE INDEX IF NOT EXISTS idx_staff_is_active ON staff(is_active);
CREATE INDEX IF NOT EXISTS idx_shifts_status ON shifts(status);
CREATE INDEX IF NOT EXISTS idx_shifts_date ON shifts(date);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- Step 8: Add missing columns if they don't exist
DO $$ 
BEGIN
  -- Add phone column to users if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'phone') THEN
    ALTER TABLE users ADD COLUMN phone text;
  END IF;
  
  -- Add department column to users if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'department') THEN
    ALTER TABLE users ADD COLUMN department text;
  END IF;
  
  -- Add bio column to users if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'bio') THEN
    ALTER TABLE users ADD COLUMN bio text;
  END IF;
END $$;

COMMIT;