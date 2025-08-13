# NexSpace Platform Run Book

> **Note**: This is a simplified runbook. For complete documentation and setup instructions, please refer to [README.md](./README.md).

## System Information
- **Platform**: NexSpace Healthcare Workforce Management
- **Node Version**: v20.19.3+ 
- **Database**: PostgreSQL (Neon)
- **Framework**: React + TypeScript (Vite) / Node.js + Express

## Installation Commands

```bash
# 1. Install dependencies
npm install

# 2. Copy environment configuration
cp .env.example .env

# 3. Configure environment variables in .env or Replit Secrets
# Required: DATABASE_URL, SESSION_SECRET
# Optional: SENDGRID_API_KEY, OPENAI_API_KEY, etc.
```

## Startup Procedures

```bash
# Start development server (frontend + backend on port 5000)
npm run dev

# Build for production
npm run build

# Start production server
npm run start
```

## Database Commands

```bash
# Push schema changes to database
npm run db:push

# Run database migrations
tsx scripts/db-migrate.ts

# Seed database with initial data
tsx server/db-seed.ts

# Reset database (WARNING: Deletes all data)
tsx scripts/db-reset.ts
```

## Environment Variables

### Required Variables
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Session encryption key (min 32 chars)
- `NODE_ENV` - Environment (development/production)
- `PORT` - Server port (default: 5000)

### Optional Services
- `SENDGRID_API_KEY` - Email notifications
- `OPENAI_API_KEY` - AI features
- `GOOGLE_CLIENT_ID/SECRET` - Calendar sync
- `TWILIO_ACCOUNT_SID/AUTH_TOKEN` - SMS notifications

See `.env.example` for complete list with descriptions.

## Access Points

- **Web Application**: http://localhost:5000
- **API Documentation**: http://localhost:5000/api-docs
- **Admin Login**: 
  - Username: `joshburn`
  - Password: `admin123`
  - Role: `super_admin`

## Database Backup

```bash
# Full backup
pg_dump $DATABASE_URL > nexspace_backup_$(date +%Y%m%d_%H%M%S).sql

# Schema only
pg_dump $DATABASE_URL --schema-only > nexspace_schema_backup.sql

# Data only
pg_dump $DATABASE_URL --data-only > nexspace_data_backup.sql
```

## Common Troubleshooting

### Port Already in Use
```bash
# The dev script automatically kills port 5000
npm run dev
# Or manually:
kill-port 5000
```

### Database Connection Issues
1. Check DATABASE_URL in .env or Replit Secrets
2. Verify PostgreSQL is accessible
3. Check SSL requirements (sslmode=require)

### Missing Dependencies
```bash
npm install
```

### Session/Authentication Issues
1. Ensure SESSION_SECRET is set
2. Clear browser cookies
3. Restart server

### API 500 Errors
1. Check server logs in console
2. Verify database migrations are run
3. Check permissions table has data

## Log Locations

- **Server Logs**: Console output with structured JSON
- **Request Logs**: Includes unique request IDs for tracing
- **Error Logs**: Full stack traces with request context
- **Audit Logs**: `audit_logs` table in database

## Health Checks

```bash
# Check web UI
curl http://localhost:5000/

# Check API docs
curl http://localhost:5000/api-docs/

# Check database connection
tsx -e "import { db } from './server/db'; db.execute('SELECT 1').then(() => console.log('✅ DB OK')).catch(console.error)"
```

## Performance Monitoring

- Request duration logged for each API call
- Slow query logging enabled (>100ms)
- Analytics events tracked in `analytics_events` table
- Dashboard provides real-time metrics

## Security Notes

1. **Never commit .env files** - Use Replit Secrets for production
2. **Rotate SESSION_SECRET** regularly in production
3. **Use strong passwords** - Minimum 8 chars, mixed case
4. **Enable 2FA** for admin accounts when available
5. **Review audit logs** regularly for suspicious activity

## Emergency Procedures

### Complete System Reset
```bash
# WARNING: This will delete all data!
tsx scripts/db-reset.ts
# Follow prompts to confirm
```

### Restore from Backup
```bash
# Restore full database
psql $DATABASE_URL < nexspace_backup_YYYYMMDD_HHMMSS.sql
```

### Clear Sessions
```sql
-- Run in database console
TRUNCATE TABLE session;
TRUNCATE TABLE user_sessions;
```

## Support Resources

- **Documentation**: See README.md
- **API Reference**: http://localhost:5000/api-docs
- **Database Schema**: shared/schema.ts
- **Migration History**: migrations/

## Platform Status Checklist

✅ Node.js v20.19.3+  
✅ PostgreSQL connected  
✅ Environment variables configured  
✅ Dependencies installed  
✅ Migrations run  
✅ Admin user created  
✅ Permissions configured  
✅ Server running on port 5000  

---

**Last Updated**: August 12, 2025  
**Version**: 1.0.0  
**Maintained By**: NexSpace Development Team