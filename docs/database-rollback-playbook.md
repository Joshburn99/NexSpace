# Database Rollback Playbook

## Overview
This playbook provides step-by-step procedures for safely rolling back database changes in the NexSpace application when migrations fail or data corruption occurs.

## Prerequisites
- PostgreSQL client tools installed
- Access to DATABASE_URL environment variable
- Backup files available in `backups/database/` directory
- Admin access to the database server

## 6-Step Emergency Rollback Checklist

### ✅ Step 1: Assess the Situation
**Time Estimate: 2-3 minutes**

```bash
# Check current database status
psql $DATABASE_URL -c "\dt"  # List tables
psql $DATABASE_URL -c "SELECT count(*) FROM users;"  # Test data access
```

**Decision Points:**
- [ ] Can you connect to the database?
- [ ] Are critical tables present?
- [ ] Is data accessible?
- [ ] What was the last successful operation?

**If database is completely inaccessible:** Go to Step 2
**If data is corrupted but accessible:** Go to Step 3
**If migration failed mid-way:** Go to Step 4

### ✅ Step 2: Create Emergency Backup (If Possible)
**Time Estimate: 3-5 minutes**

```bash
# Create emergency backup if database is accessible
./scripts/db-backup.sh

# If backup script fails, try manual backup
pg_dump $DATABASE_URL > "emergency_backup_$(date +%Y%m%d_%H%M%S).sql"
```

**Checklist:**
- [ ] Emergency backup created successfully
- [ ] Backup file size is reasonable (not 0 bytes)
- [ ] Note the backup timestamp for recovery logs

### ✅ Step 3: Stop Application Services
**Time Estimate: 1-2 minutes**

```bash
# Stop the application to prevent further writes
pkill -f "npm run dev" || kill -9 $(lsof -t -i:5000) || true

# Verify no processes are writing to database
lsof -i :5432  # Check for active database connections
```

**Checklist:**
- [ ] Application server stopped
- [ ] No active database connections from app
- [ ] Users notified of maintenance (if production)

### ✅ Step 4: Identify and Execute Rollback Strategy
**Time Estimate: 5-10 minutes**

#### Option A: Restore from Recent Backup
```bash
# List available backups
ls -la backups/database/nexspace_backup_*.sql

# Restore from most recent stable backup
./scripts/db-restore.sh <TIMESTAMP> --force

# Example:
# ./scripts/db-restore.sh 20250812_143022 --force
```

#### Option B: Schema-Only Rollback (Data Preserved)
```bash
# If only schema changes failed, restore schema only
./scripts/db-restore.sh <TIMESTAMP> --force --schema-only

# Then re-run migrations
npm run db:push
```

#### Option C: Manual Migration Rollback
```bash
# For Drizzle migrations, check migration status
npm run db:check

# If specific migration failed, may need manual SQL fixes
psql $DATABASE_URL -f rollback_migration.sql
```

**Checklist:**
- [ ] Rollback strategy selected based on failure type
- [ ] Rollback executed without errors
- [ ] Database structure verified post-rollback

### ✅ Step 5: Verify Database Integrity
**Time Estimate: 3-5 minutes**

```bash
# Run comprehensive verification
./scripts/db-verify.sh  # If you create this script

# Or manual verification
psql $DATABASE_URL << EOF
-- Check table counts
SELECT 
  schemaname,
  tablename,
  n_tup_ins as inserts,
  n_tup_upd as updates,
  n_tup_del as deletes
FROM pg_stat_user_tables;

-- Check critical data
SELECT count(*) as user_count FROM users;
SELECT count(*) as facility_count FROM facilities;
SELECT count(*) as staff_count FROM staff;
SELECT count(*) as shift_count FROM shifts;

-- Check for any constraint violations
SELECT conname, conrelid::regclass
FROM pg_constraint 
WHERE NOT convalidated;
EOF
```

**Verification Checklist:**
- [ ] All expected tables present
- [ ] Row counts match expectations
- [ ] No constraint violations
- [ ] Sample queries return expected results
- [ ] Foreign key relationships intact

### ✅ Step 6: Restart Services and Monitor
**Time Estimate: 2-3 minutes**

```bash
# Restart the application
npm run dev

# Monitor logs for errors
tail -f logs/application.log  # If you have logging

# Test critical functionality
curl -f http://localhost:5000/health || echo "Health check failed"
curl -f http://localhost:5000/api/users/me || echo "API test failed"
```

**Final Verification:**
- [ ] Application starts without errors
- [ ] Health checks pass
- [ ] Critical API endpoints respond
- [ ] Users can log in successfully
- [ ] No error alerts in monitoring systems

## Recovery Commands Reference

### Quick Commands
```bash
# Emergency backup
./scripts/db-backup.sh

# Emergency restore (latest backup)
LATEST=$(ls -t backups/database/nexspace_backup_*.sql | head -1 | sed 's/.*nexspace_backup_\(.*\)\.sql/\1/')
./scripts/db-restore.sh $LATEST --force

# Database reset (nuclear option)
./scripts/db-reset.sh --force

# Check database status
psql $DATABASE_URL -c "\l"  # List databases
psql $DATABASE_URL -c "\dt" # List tables
```

### Migration-Specific Commands
```bash
# Check migration status
npm run db:check

# Push schema changes
npm run db:push

# Generate migration (if needed)
npm run db:generate

# View migration history
ls -la migrations/
```

## Common Rollback Scenarios

### Scenario 1: Migration Failed Mid-Execution
1. Check what migration was running: `npm run db:check`
2. Look for partial tables or constraints
3. Restore from backup taken before migration
4. Fix migration file and re-run

### Scenario 2: Data Corruption After Deployment
1. Immediately stop application
2. Identify extent of corruption
3. Restore from latest stable backup
4. Replay critical transactions if necessary

### Scenario 3: Schema Change Broke Application
1. Determine if data is still intact
2. If yes: restore schema only
3. If no: full restore from backup
4. Test application compatibility

### Scenario 4: Performance Degradation After Migration
1. Check if indexes were dropped
2. Look for missing constraints
3. Compare schema with backup
4. Restore if performance is critical

## Prevention Best Practices

1. **Always backup before migrations**
   ```bash
   ./scripts/db-backup.sh && npm run db:push
   ```

2. **Test migrations on copy first**
   ```bash
   # Create test database
   createdb nexspace_test
   # Test migration there first
   ```

3. **Use transactions for manual changes**
   ```sql
   BEGIN;
   -- Your changes here
   -- Test queries
   COMMIT; -- or ROLLBACK;
   ```

4. **Monitor key metrics**
   - Table row counts
   - Query performance
   - Constraint violations
   - Application error rates

## Emergency Contacts

- **Database Admin**: [Your DBA contact]
- **DevOps Team**: [Your DevOps contact] 
- **Application Owner**: [Your App owner contact]

## Post-Incident Steps

1. Document what went wrong
2. Update rollback procedures if needed
3. Improve migration testing process
4. Schedule post-mortem meeting
5. Update monitoring and alerting

---

**Last Updated**: August 12, 2025  
**Version**: 1.0  
**Reviewed By**: DevOps Team