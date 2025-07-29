-- Add impersonation tracking to audit logs
ALTER TABLE audit_logs 
ADD COLUMN IF NOT EXISTS original_user_id INTEGER,
ADD COLUMN IF NOT EXISTS is_impersonated BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS impersonation_context JSONB;

-- Add comments for clarity
COMMENT ON COLUMN audit_logs.original_user_id IS 'ID of the super admin who initiated impersonation';
COMMENT ON COLUMN audit_logs.is_impersonated IS 'Whether this action was performed during impersonation';
COMMENT ON COLUMN audit_logs.impersonation_context IS 'Additional context about the impersonation (userType, etc)';
