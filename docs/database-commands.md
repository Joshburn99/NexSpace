# Database Management Commands

## Available Commands

### 1. Database Backup
```bash
# Create backup with timestamp
./scripts/db-backup.sh

# Or using npm (when package.json is updated)
npm run db:backup
```

**What it does:**
- Creates full backup (schema + data)
- Creates schema-only backup
- Creates data-only backup
- Generates metadata file with git info
- Cleans up old backups (keeps last 10)
- Provides restore instructions

**Output files (in `backups/database/`):**
- `nexspace_backup_YYYYMMDD_HHMMSS.sql` - Full backup
- `nexspace_schema_YYYYMMDD_HHMMSS.sql` - Schema only
- `nexspace_data_YYYYMMDD_HHMMSS.sql` - Data only
- `backup_YYYYMMDD_HHMMSS.json` - Metadata

### 2. Database Restore
```bash
# Restore from specific timestamp
./scripts/db-restore.sh 20250812_143022

# Force restore without confirmation
./scripts/db-restore.sh 20250812_143022 --force

# Schema-only restore
./scripts/db-restore.sh 20250812_143022 --force --schema-only

# Data-only restore
./scripts/db-restore.sh 20250812_143022 --force --data-only

# Or using npm (when package.json is updated)
npm run db:restore 20250812_143022
```

**What it does:**
- Creates pre-restore backup
- Restores database from backup
- Offers to restore pre-restore backup if restoration fails
- Verifies restore completion
- Optionally runs migrations after restore

### 3. Database Reset
```bash
# Interactive reset with confirmation
./scripts/db-reset.sh

# Force reset without confirmation
./scripts/db-reset.sh --force

# Or using npm (when package.json is updated)
npm run db:reset
```

**What it does:**
- Creates backup before reset
- Drops and recreates database
- Runs migrations (`npm run db:push`)
- Seeds with test data:
  - 5 test facilities
  - 5 test users (admin, manager, staff)
  - 4 test staff profiles
  - 4 test shifts
- Verifies reset completion
- Provides test login credentials

## Test Data Included After Reset

### Test Users
- **admin@nexspace.com** - Super Admin
- **manager@pgh.org** - Facility Manager at Portland General
- **nurse@pgh.org** - Staff Nurse at Portland General  
- **doctor@ohsu.edu** - Staff Physician at OHSU
- **tech@legacyhealth.org** - Part-time Tech at Legacy Emanuel

### Test Facilities
- Portland General Hospital (450 beds)
- OHSU Hospital (576 beds)
- Legacy Emanuel Medical Center (368 beds)
- Providence Portland Medical Center (423 beds)
- Salem Health Hospital (454 beds)

### Test Shifts
- Day Shift - ICU (Portland General)
- Night Shift - ER (Portland General) - URGENT
- Weekend Coverage - Surgery (OHSU) - FILLED
- Float Pool - General (Legacy Emanuel)

## NPM Script Integration

To add these commands to `package.json`, include:

```json
{
  "scripts": {
    "db:backup": "./scripts/db-backup.sh",
    "db:restore": "./scripts/db-restore.sh",
    "db:reset": "./scripts/db-reset.sh --force"
  }
}
```

Then use:
```bash
npm run db:backup
npm run db:restore 20250812_143022
npm run db:reset
```

## Safety Features

### Automatic Backups
- `db-reset.sh` creates backup before reset
- `db-restore.sh` creates pre-restore backup
- All backups are timestamped and organized

### Confirmation Prompts
- Interactive confirmation for destructive operations
- `--force` flag bypasses confirmations for scripts
- Clear warnings about data loss

### Error Recovery
- Failed restores offer to restore pre-restore backup
- Detailed error messages with troubleshooting steps
- Verification checks after operations

### Backup Retention
- Automatically keeps last 10 backups
- Cleans up old files to prevent disk bloat
- Metadata files track git state and timestamps

## Troubleshooting

### Common Issues

1. **Permission Denied**
   ```bash
   chmod +x scripts/*.sh
   ```

2. **DATABASE_URL Not Found**
   ```bash
   # Ensure .env file exists and contains DATABASE_URL
   cp .env.example .env
   # Edit .env with your database URL
   ```

3. **PostgreSQL Tools Missing**
   ```bash
   # Install PostgreSQL client tools
   sudo apt-get install postgresql-client
   # Or on macOS
   brew install postgresql
   ```

4. **Connection Failed**
   - Check DATABASE_URL format: `postgres://user:pass@host:port/dbname`
   - Verify database server is running
   - Test connection: `psql $DATABASE_URL -c "\l"`

5. **Migration Failed After Restore**
   ```bash
   # Manually run migrations
   npm run db:push
   
   # Check migration status
   npm run db:check
   ```

### Manual Database Operations

```bash
# Connect to database
psql $DATABASE_URL

# List databases
psql $DATABASE_URL -c "\l"

# List tables
psql $DATABASE_URL -c "\dt"

# Check table counts
psql $DATABASE_URL -c "SELECT schemaname, tablename, n_tup_ins FROM pg_stat_user_tables;"

# Manual backup
pg_dump $DATABASE_URL > manual_backup.sql

# Manual restore
psql $DATABASE_URL < manual_backup.sql
```

## File Structure

```
backups/
├── database/
│   ├── nexspace_backup_20250812_143022.sql
│   ├── nexspace_schema_20250812_143022.sql
│   ├── nexspace_data_20250812_143022.sql
│   ├── backup_20250812_143022.json
│   └── ...
scripts/
├── db-backup.sh
├── db-restore.sh
└── db-reset.sh
docs/
├── database-commands.md
└── database-rollback-playbook.md
```

## Security Notes

- Scripts parse DATABASE_URL safely
- PGPASSWORD is unset after operations
- Backup files contain sensitive data - secure accordingly
- Test scripts on non-production databases first

---

**Last Updated**: August 12, 2025  
**Version**: 1.0