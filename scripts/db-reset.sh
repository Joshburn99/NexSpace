#!/bin/bash

# Database Reset Script for NexSpace
# Drops database, recreates, runs migrations, and seeds with test data

set -e

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '#' | awk '/=/ {print $1}')
fi

echo "🔄 Starting database reset..."

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

# Create backup before reset
echo ""
echo "💾 Creating backup before reset..."
./scripts/db-backup.sh

# Safety confirmation
if [ "$1" != "--force" ]; then
    echo ""
    echo "⚠️  WARNING: This will completely reset the database '$DB_NAME'"
    echo "🗑️  All existing data will be lost!"
    echo "💾 A backup has been created in backups/database/"
    echo ""
    read -p "Are you sure you want to continue? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        echo "❌ Reset cancelled by user"
        exit 0
    fi
fi

# Drop and recreate database
echo ""
echo "🗑️  Dropping database..."
dropdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME" --if-exists

echo "🆕 Creating new database..."
createdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME"

# Run database migrations
echo ""
echo "🔄 Running database migrations..."
npm run db:push

if [ $? -eq 0 ]; then
    echo "✅ Database migrations completed successfully"
else
    echo "❌ ERROR: Database migrations failed"
    exit 1
fi

# Seed database with test data
echo ""
echo "🌱 Seeding database with test data..."

# Create seed data SQL
cat > /tmp/seed_data.sql << 'EOF'
-- Insert test facilities
INSERT INTO facilities (id, name, address, phone, email, type, beds, timezone, status) VALUES
(1, 'Portland General Hospital', '1120 NW 20th Ave, Portland, OR 97209', '(503) 413-7711', 'contact@pgh.org', 'hospital', 450, 'America/Los_Angeles', 'active'),
(2, 'OHSU Hospital', '3181 SW Sam Jackson Park Rd, Portland, OR 97239', '(503) 494-8311', 'info@ohsu.edu', 'hospital', 576, 'America/Los_Angeles', 'active'),
(3, 'Legacy Emanuel Medical Center', '2801 N Gantenbein Ave, Portland, OR 97227', '(503) 413-2200', 'contact@legacyhealth.org', 'hospital', 368, 'America/Los_Angeles', 'active'),
(4, 'Providence Portland Medical Center', '4805 NE Glisan St, Portland, OR 97213', '(503) 215-1111', 'info@providence.org', 'hospital', 423, 'America/Los_Angeles', 'active'),
(5, 'Salem Health Hospital', '890 Oak St SE, Salem, OR 97301', '(503) 561-5200', 'contact@salemhealth.org', 'hospital', 454, 'America/Los_Angeles', 'active')
ON CONFLICT (id) DO UPDATE SET 
name = EXCLUDED.name,
address = EXCLUDED.address,
phone = EXCLUDED.phone,
email = EXCLUDED.email,
type = EXCLUDED.type,
beds = EXCLUDED.beds,
timezone = EXCLUDED.timezone,
status = EXCLUDED.status;

-- Insert test users
INSERT INTO users (id, email, password, role, first_name, last_name, phone, status, created_at, updated_at) VALUES
(1, 'admin@nexspace.com', '$2b$10$rQc5fKj7rKjFJ5FKj5FKj5', 'super_admin', 'Admin', 'User', '(555) 123-4567', 'active', NOW(), NOW()),
(2, 'manager@pgh.org', '$2b$10$rQc5fKj7rKjFJ5FKj5FKj5', 'facility_manager', 'John', 'Smith', '(503) 413-7712', 'active', NOW(), NOW()),
(3, 'nurse@pgh.org', '$2b$10$rQc5fKj7rKjFJ5FKj5FKj5', 'staff', 'Sarah', 'Johnson', '(503) 413-7713', 'active', NOW(), NOW()),
(4, 'doctor@ohsu.edu', '$2b$10$rQc5fKj7rKjFJ5FKj5FKj5', 'staff', 'Dr. Michael', 'Davis', '(503) 494-8312', 'active', NOW(), NOW()),
(5, 'tech@legacyhealth.org', '$2b$10$rQc5fKj7rKjFJ5FKj5FKj5', 'staff', 'Emily', 'Brown', '(503) 413-2201', 'active', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET 
email = EXCLUDED.email,
role = EXCLUDED.role,
first_name = EXCLUDED.first_name,
last_name = EXCLUDED.last_name,
phone = EXCLUDED.phone,
status = EXCLUDED.status,
updated_at = NOW();

-- Insert test staff profiles
INSERT INTO staff (id, user_id, facility_id, specialty, certifications, years_experience, hourly_rate, employment_type, worker_type, status, created_at, updated_at) VALUES
(1, 2, 1, 'management', ARRAY['Healthcare Administration', 'Leadership'], 8, 55.00, 'full_time', 'internal_employee', 'active', NOW(), NOW()),
(2, 3, 1, 'nursing', ARRAY['RN', 'BLS', 'ACLS'], 5, 42.00, 'full_time', 'internal_employee', 'active', NOW(), NOW()),
(3, 4, 2, 'physician', ARRAY['MD', 'Board Certified Internal Medicine'], 12, 95.00, 'full_time', 'internal_employee', 'active', NOW(), NOW()),
(4, 5, 3, 'tech', ARRAY['Radiology Tech', 'CT Certification'], 3, 28.50, 'part_time', 'contractor_1099', 'active', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET 
user_id = EXCLUDED.user_id,
facility_id = EXCLUDED.facility_id,
specialty = EXCLUDED.specialty,
certifications = EXCLUDED.certifications,
years_experience = EXCLUDED.years_experience,
hourly_rate = EXCLUDED.hourly_rate,
employment_type = EXCLUDED.employment_type,
worker_type = EXCLUDED.worker_type,
status = EXCLUDED.status,
updated_at = NOW();

-- Insert test shifts
INSERT INTO shifts (id, title, facility_id, department, start_time, end_time, required_workers, assigned_worker_ids, hourly_rate, is_urgent, requirements, notes, status, created_at, updated_at) VALUES
(1, 'Day Shift - ICU', 1, 'Intensive Care Unit', NOW() + INTERVAL '1 day', NOW() + INTERVAL '1 day 8 hours', 2, ARRAY[2], 45.00, false, ARRAY['RN License', 'ICU Experience'], 'Regular day shift coverage', 'open', NOW(), NOW()),
(2, 'Night Shift - ER', 1, 'Emergency Department', NOW() + INTERVAL '2 days 20 hours', NOW() + INTERVAL '3 days 4 hours', 3, ARRAY[]::integer[], 48.00, true, ARRAY['RN License', 'Emergency Experience'], 'Urgent coverage needed', 'open', NOW(), NOW()),
(3, 'Weekend Coverage - Surgery', 2, 'Operating Room', NOW() + INTERVAL '3 days', NOW() + INTERVAL '3 days 12 hours', 1, ARRAY[4], 65.00, false, ARRAY['Surgical Tech Certification'], 'Weekend surgical support', 'filled', NOW(), NOW()),
(4, 'Float Pool - General', 3, 'General Medicine', NOW() + INTERVAL '1 day 12 hours', NOW() + INTERVAL '2 days', 1, ARRAY[]::integer[], 40.00, false, ARRAY['RN License'], 'Float pool assignment', 'open', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET 
title = EXCLUDED.title,
facility_id = EXCLUDED.facility_id,
department = EXCLUDED.department,
start_time = EXCLUDED.start_time,
end_time = EXCLUDED.end_time,
required_workers = EXCLUDED.required_workers,
assigned_worker_ids = EXCLUDED.assigned_worker_ids,
hourly_rate = EXCLUDED.hourly_rate,
is_urgent = EXCLUDED.is_urgent,
requirements = EXCLUDED.requirements,
notes = EXCLUDED.notes,
status = EXCLUDED.status,
updated_at = NOW();

-- Reset sequences to prevent conflicts
SELECT setval('facilities_id_seq', (SELECT MAX(id) FROM facilities));
SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));
SELECT setval('staff_id_seq', (SELECT MAX(id) FROM staff));
SELECT setval('shifts_id_seq', (SELECT MAX(id) FROM shifts));
EOF

# Execute seed data
if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f /tmp/seed_data.sql; then
    echo "✅ Test data seeded successfully"
else
    echo "⚠️  WARNING: Failed to seed test data, but database is ready"
fi

# Clean up temporary file
rm -f /tmp/seed_data.sql

# Verify the reset
echo ""
echo "🔍 Verifying database reset..."

# Check tables
TABLE_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';" | xargs)
echo "📊 Tables created: $TABLE_COUNT"

# Check data
FACILITY_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT count(*) FROM facilities;" 2>/dev/null | xargs || echo "0")
USER_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT count(*) FROM users;" 2>/dev/null | xargs || echo "0")
STAFF_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT count(*) FROM staff;" 2>/dev/null | xargs || echo "0")
SHIFT_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT count(*) FROM shifts;" 2>/dev/null | xargs || echo "0")

echo "👥 Test users: $USER_COUNT"
echo "🏥 Test facilities: $FACILITY_COUNT"
echo "👨‍⚕️ Test staff: $STAFF_COUNT"
echo "📅 Test shifts: $SHIFT_COUNT"

if [ "$TABLE_COUNT" -gt 0 ] && [ "$USER_COUNT" -gt 0 ] && [ "$FACILITY_COUNT" -gt 0 ]; then
    echo ""
    echo "✅ Database reset completed successfully!"
    echo "🌱 Database is ready with test data"
    echo ""
    echo "🔑 Test Login Credentials:"
    echo "   - Admin: admin@nexspace.com (super_admin)"
    echo "   - Manager: manager@pgh.org (facility_manager)"
    echo "   - Staff: nurse@pgh.org (staff)"
    echo "   - Password: Use your authentication system"
    echo ""
    echo "💡 You can now start the application:"
    echo "   npm run dev"
else
    echo ""
    echo "⚠️  WARNING: Database reset completed but verification failed"
    echo "📋 Manual verification recommended"
fi

unset PGPASSWORD