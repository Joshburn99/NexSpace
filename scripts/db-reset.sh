#!/bin/bash

# Database Reset Script for NexSpace
# WARNING: This will DELETE ALL DATA

echo "⚠️  WARNING: This will DELETE ALL DATA in the database!"
echo "Press Ctrl+C to cancel, or wait 5 seconds to continue..."
sleep 5

echo "🗑️  Dropping all tables..."
echo "DROP SCHEMA public CASCADE; CREATE SCHEMA public;" | psql $DATABASE_URL

echo "📦 Pushing schema to database..."
npm run db:push

echo "🌱 Seeding database with sample data..."
tsx server/seed.ts

echo "✅ Database reset complete!"
echo ""
echo "Login credentials:"
echo "  Username: joshburn"
echo "  Password: admin123"