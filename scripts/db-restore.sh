#!/bin/bash

# Database Restore Script for NexSpace
# Restores database from timestamped backups with safety checks

set -e

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '#' | awk '/=/ {print $1}')
fi

# Configuration
BACKUP_DIR="backups/database"

# Check if timestamp provided
if [ -z "$1" ]; then
    echo "❌ ERROR: Please provide a backup timestamp"
    echo ""
    echo "Usage: $0 <timestamp> [--force] [--schema-only] [--data-only]"
    echo ""
    echo "Available backups:"
    ls -la "$BACKUP_DIR"/nexspace_backup_*.sql 2>/dev/null | awk '{print $9}' | sed 's/.*nexspace_backup_\(.*\)\.sql/  \1/' || echo "  No backups found"
    exit 1
fi

TIMESTAMP=$1
FORCE_RESTORE=${2:-""}
RESTORE_TYPE=${3:-"full"}

BACKUP_FILE="nexspace_backup_${TIMESTAMP}.sql"
SCHEMA_FILE="nexspace_schema_${TIMESTAMP}.sql"
DATA_FILE="nexspace_data_${TIMESTAMP}.sql"
METADATA_FILE="backup_${TIMESTAMP}.json"

echo "🔄 Starting database restore..."
echo "Timestamp: $TIMESTAMP"
echo "Restore type: $RESTORE_TYPE"

# Check if backup files exist
if [ ! -f "$BACKUP_DIR/$BACKUP_FILE" ] && [ "$RESTORE_TYPE" = "full" ]; then
    echo "❌ ERROR: Backup file not found: $BACKUP_DIR/$BACKUP_FILE"
    exit 1
fi

if [ ! -f "$BACKUP_DIR/$SCHEMA_FILE" ] && [ "$RESTORE_TYPE" = "schema-only" ]; then
    echo "❌ ERROR: Schema backup file not found: $BACKUP_DIR/$SCHEMA_FILE"
    exit 1
fi

if [ ! -f "$BACKUP_DIR/$DATA_FILE" ] && [ "$RESTORE_TYPE" = "data-only" ]; then
    echo "❌ ERROR: Data backup file not found: $BACKUP_DIR/$DATA_FILE"
    exit 1
fi

# Extract database connection details
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL not found in environment"
    exit 1
fi

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

export PGPASSWORD="$DB_PASS"

echo "📊 Database: $DB_NAME"
echo "🏠 Host: $DB_HOST:$DB_PORT"
echo "👤 User: $DB_USER"

# Display backup metadata if available
if [ -f "$BACKUP_DIR/$METADATA_FILE" ]; then
    echo ""
    echo "📝 Backup Information:"
    echo "$(cat "$BACKUP_DIR/$METADATA_FILE" | jq -r '"Date: " + .date + "\nGit Commit: " + .git_commit + "\nGit Branch: " + .git_branch' 2>/dev/null || cat "$BACKUP_DIR/$METADATA_FILE")"
fi

# Safety confirmation
if [ "$FORCE_RESTORE" != "--force" ]; then
    echo ""
    echo "⚠️  WARNING: This will replace all data in the database '$DB_NAME'"
    echo "🏠 Host: $DB_HOST:$DB_PORT"
    echo ""
    read -p "Are you sure you want to continue? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        echo "❌ Restore cancelled by user"
        exit 0
    fi
fi

# Create a pre-restore backup
echo ""
echo "💾 Creating pre-restore backup..."
PRE_RESTORE_TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
PRE_RESTORE_FILE="nexspace_pre_restore_${PRE_RESTORE_TIMESTAMP}.sql"

if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" --verbose --no-owner --no-privileges > "$BACKUP_DIR/$PRE_RESTORE_FILE"; then
    echo "✅ Pre-restore backup created: $PRE_RESTORE_FILE"
else
    echo "⚠️  WARNING: Failed to create pre-restore backup, continuing anyway..."
fi

# Function to restore database
restore_database() {
    local restore_file=$1
    local restore_description=$2
    
    echo ""
    echo "🔄 Restoring $restore_description..."
    
    # For full restore, drop and recreate database
    if [ "$RESTORE_TYPE" = "full" ]; then
        echo "🗑️  Dropping existing database..."
        dropdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME" --if-exists
        
        echo "🆕 Creating new database..."
        createdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME"
    fi
    
    # Restore from backup
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$BACKUP_DIR/$restore_file" -v ON_ERROR_STOP=1; then
        echo "✅ $restore_description restored successfully"
    else
        echo "❌ ERROR: Failed to restore $restore_description"
        
        # If we have a pre-restore backup, offer to restore it
        if [ -f "$BACKUP_DIR/$PRE_RESTORE_FILE" ]; then
            echo ""
            read -p "🔄 Restore failed. Restore pre-restore backup? (yes/no): " restore_backup
            if [ "$restore_backup" = "yes" ]; then
                echo "🔄 Restoring pre-restore backup..."
                dropdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME" --if-exists
                createdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME"
                psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$BACKUP_DIR/$PRE_RESTORE_FILE"
                echo "✅ Pre-restore backup restored"
            fi
        fi
        
        exit 1
    fi
}

# Perform restore based on type
case "$RESTORE_TYPE" in
    "full")
        restore_database "$BACKUP_FILE" "full backup (schema + data)"
        ;;
    "schema-only")
        restore_database "$SCHEMA_FILE" "schema-only backup"
        ;;
    "data-only")
        restore_database "$DATA_FILE" "data-only backup"
        ;;
    *)
        echo "❌ ERROR: Invalid restore type: $RESTORE_TYPE"
        echo "Valid options: full, schema-only, data-only"
        exit 1
        ;;
esac

# Verify restore
echo ""
echo "🔍 Verifying restore..."
TABLE_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';" | xargs)
echo "📊 Found $TABLE_COUNT tables in restored database"

if [ "$TABLE_COUNT" -gt 0 ]; then
    echo "✅ Database restore completed successfully!"
    
    # Run database migrations if needed
    echo ""
    read -p "🔄 Run database migrations after restore? (yes/no): " run_migrations
    if [ "$run_migrations" = "yes" ]; then
        echo "🔄 Running database migrations..."
        npm run db:push
        echo "✅ Migrations completed"
    fi
else
    echo "⚠️  WARNING: No tables found in restored database"
fi

echo ""
echo "📁 Backup files used:"
echo "   - Restored from: $BACKUP_DIR/$BACKUP_FILE"
echo "   - Pre-restore backup: $BACKUP_DIR/$PRE_RESTORE_FILE"

unset PGPASSWORD