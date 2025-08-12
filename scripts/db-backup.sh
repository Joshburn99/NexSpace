#!/bin/bash

# Database Backup Script for NexSpace
# Creates timestamped backups with schema and data

set -e

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '#' | awk '/=/ {print $1}')
fi

# Configuration
BACKUP_DIR="backups/database"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="nexspace_backup_${TIMESTAMP}.sql"
SCHEMA_FILE="nexspace_schema_${TIMESTAMP}.sql"
DATA_FILE="nexspace_data_${TIMESTAMP}.sql"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo "🔄 Starting database backup..."
echo "Timestamp: $TIMESTAMP"
echo "Backup directory: $BACKUP_DIR"

# Extract database connection details from DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL not found in environment"
    exit 1
fi

# Parse DATABASE_URL (format: postgres://user:pass@host:port/dbname)
DB_URL_REGEX="postgres://([^:]+):([^@]+)@([^:]+):([^/]+)/(.+)"
if [[ $DATABASE_URL =~ $DB_URL_REGEX ]]; then
    DB_USER="${BASH_REMATCH[1]}"
    DB_PASS="${BASH_REMATCH[2]}"
    DB_HOST="${BASH_REMATCH[3]}"
    DB_PORT="${BASH_REMATCH[4]}"
    DB_NAME="${BASH_REMATCH[5]}"
else
    echo "❌ ERROR: Invalid DATABASE_URL format"
    exit 1
fi

# Set PostgreSQL password
export PGPASSWORD="$DB_PASS"

echo "📊 Database: $DB_NAME"
echo "🏠 Host: $DB_HOST:$DB_PORT"
echo "👤 User: $DB_USER"

# Function to create backups
create_backup() {
    local backup_type=$1
    local output_file=$2
    local extra_args=$3
    
    echo "Creating $backup_type backup..."
    
    if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" $extra_args > "$BACKUP_DIR/$output_file"; then
        echo "✅ $backup_type backup created: $output_file"
        echo "📁 Size: $(du -h "$BACKUP_DIR/$output_file" | cut -f1)"
    else
        echo "❌ ERROR: Failed to create $backup_type backup"
        return 1
    fi
}

# Create full backup (schema + data)
create_backup "Full" "$BACKUP_FILE" "--verbose --no-owner --no-privileges"

# Create schema-only backup
create_backup "Schema-only" "$SCHEMA_FILE" "--schema-only --verbose --no-owner --no-privileges"

# Create data-only backup
create_backup "Data-only" "$DATA_FILE" "--data-only --verbose --no-owner --no-privileges"

# Create backup metadata
cat > "$BACKUP_DIR/backup_${TIMESTAMP}.json" << EOF
{
  "timestamp": "$TIMESTAMP",
  "date": "$(date -Iseconds)",
  "database": "$DB_NAME",
  "host": "$DB_HOST",
  "port": "$DB_PORT",
  "user": "$DB_USER",
  "files": {
    "full_backup": "$BACKUP_FILE",
    "schema_only": "$SCHEMA_FILE",
    "data_only": "$DATA_FILE"
  },
  "git_commit": "$(git rev-parse HEAD 2>/dev/null || echo 'unknown')",
  "git_branch": "$(git branch --show-current 2>/dev/null || echo 'unknown')"
}
EOF

echo "📝 Backup metadata created: backup_${TIMESTAMP}.json"

# Clean up old backups (keep last 10)
echo "🧹 Cleaning up old backups (keeping last 10)..."
cd "$BACKUP_DIR"
ls -t nexspace_backup_*.sql 2>/dev/null | tail -n +11 | xargs -r rm
ls -t nexspace_schema_*.sql 2>/dev/null | tail -n +11 | xargs -r rm
ls -t nexspace_data_*.sql 2>/dev/null | tail -n +11 | xargs -r rm
ls -t backup_*.json 2>/dev/null | tail -n +11 | xargs -r rm

echo ""
echo "✅ Database backup completed successfully!"
echo "📁 Backup files:"
echo "   - Full: $BACKUP_DIR/$BACKUP_FILE"
echo "   - Schema: $BACKUP_DIR/$SCHEMA_FILE"
echo "   - Data: $BACKUP_DIR/$DATA_FILE"
echo "   - Metadata: $BACKUP_DIR/backup_${TIMESTAMP}.json"
echo ""
echo "💡 To restore this backup, run:"
echo "   ./scripts/db-restore.sh $TIMESTAMP"

# Unset password
unset PGPASSWORD