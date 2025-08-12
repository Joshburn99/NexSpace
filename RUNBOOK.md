# NexSpace Platform Runbook

## Table of Contents
1. [Quick Start](#quick-start)
2. [System Requirements](#system-requirements)
3. [Installation & Setup](#installation--setup)
4. [Database Management](#database-management)
5. [Authentication & Access](#authentication--access)
6. [API Documentation](#api-documentation)
7. [Development Workflow](#development-workflow)
8. [Troubleshooting](#troubleshooting)
9. [Architecture Overview](#architecture-overview)

## Quick Start

### 1. Start the Application
```bash
# Development mode (default)
npm run dev

# The application will be available at:
# - Web UI: http://localhost:5000
# - API Docs: http://localhost:5000/api-docs
```

### 2. Login Credentials
**Admin User:**
- Username: `joshburn`
- Password: `admin123`
- Role: Super Admin

**Alternative Admin (existing in DB):**
- Username: `JoshBurn`
- Email: `joshburn99@icloud.com`
- Role: Super Admin

## System Requirements

- **Node.js**: v20.19.3 or higher
- **npm**: v10.8.2 or higher
- **PostgreSQL**: Already provisioned (DATABASE_URL environment variable set)
- **Memory**: Minimum 2GB RAM
- **Disk**: 500MB free space

## Installation & Setup

### 1. Environment Configuration
```bash
# Copy the example environment file
cp .env.example .env

# The DATABASE_URL is already set by Replit
# Add any additional secrets as needed
```

### 2. Install Dependencies
```bash
# Dependencies are already installed
# To reinstall if needed:
npm install
```

### 3. Database Setup
```bash
# Push schema to database
npm run db:push

# Seed with sample data (including admin user)
tsx server/seed.ts

# To completely reset database (CAUTION: destroys all data)
# npm run db:reset
```

## Database Management

### Available Commands

```bash
# Push schema changes to database
npm run db:push

# Run seed script (creates admin user and sample data)
tsx server/seed.ts

# Reset database (DANGEROUS - will delete all data)
echo "DROP SCHEMA public CASCADE; CREATE SCHEMA public;" | psql $DATABASE_URL
npm run db:push
tsx server/seed.ts
```

### Database Schema Overview

**Main Tables:**
- `users` - System users and authentication
- `facilities` - Healthcare facilities
- `staff` - Staff members
- `shifts` - Shift scheduling
- `permissions` - RBAC permissions
- `audit_logs` - System audit trail

### Seed Data

The seed script creates:
- 1 Super Admin user (joshburn/admin123)
- 3 Sample facilities (Hospital, Nursing Home, Rehabilitation Center)
- 5 Sample staff members
- 5 Sample shifts
- 22 System permissions

## Authentication & Access

### Session-Based Authentication
The system uses Passport.js with session-based authentication stored in PostgreSQL.

### Login via Web UI
1. Navigate to http://localhost:5000
2. Click "Login" 
3. Enter credentials:
   - Username: `joshburn`
   - Password: `admin123`

### Login via API (cURL)
```bash
# Login and save session cookie
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"joshburn","password":"admin123"}' \
  -c cookies.txt

# Test authenticated endpoint
curl -X GET http://localhost:5000/api/auth/me \
  -b cookies.txt

# Get dashboard stats
curl -X GET http://localhost:5000/api/dashboard/stats \
  -b cookies.txt
```

### Role-Based Access Control (RBAC)

**System Roles:**
- `super_admin` - Full system access
- `admin` - Administrative access
- `facility_manager` - Facility management
- `internal_employee` - Employee access
- `contractor_1099` - Contractor access

**Key Permissions:**
- `dashboard.view` - View dashboard
- `facilities.*` - Facility CRUD operations
- `staff.*` - Staff management
- `shifts.*` - Shift management
- `settings.*` - System settings
- `audit.view` - View audit logs

## API Documentation

### Swagger UI
Access the interactive API documentation at:
http://localhost:5000/api-docs

### Main API Endpoints

**Authentication:**
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Current user info

**Facilities:**
- `GET /api/facilities` - List facilities
- `POST /api/facilities` - Create facility
- `GET /api/facilities/:id` - Get facility
- `PUT /api/facilities/:id` - Update facility
- `DELETE /api/facilities/:id` - Delete facility

**Staff:**
- `GET /api/staff` - List staff
- `POST /api/staff` - Create staff member
- `GET /api/staff/:id` - Get staff member
- `PUT /api/staff/:id` - Update staff
- `DELETE /api/staff/:id` - Delete staff

**Shifts:**
- `GET /api/shifts` - List shifts
- `POST /api/shifts` - Create shift
- `GET /api/shifts/:id` - Get shift
- `PUT /api/shifts/:id` - Update shift
- `DELETE /api/shifts/:id` - Delete shift

**Dashboard:**
- `GET /api/dashboard/stats` - Dashboard statistics
- `GET /api/dashboard/analytics` - Analytics data

## Development Workflow

### Code Structure
```
/
├── client/               # React frontend
│   ├── src/
│   │   ├── pages/       # Page components
│   │   ├── components/  # Reusable components
│   │   ├── hooks/       # Custom React hooks
│   │   └── lib/         # Utilities
├── server/              # Express backend
│   ├── routes/          # API routes
│   ├── middleware/      # Express middleware
│   ├── auth.ts          # Authentication
│   └── db.ts           # Database connection
├── shared/              # Shared types/schemas
│   └── schema.ts       # Drizzle ORM schemas
└── migrations/          # Database migrations
```

### Development Commands

```bash
# Start dev server
npm run dev

# Type checking
npm run check

# Linting
npm run lint

# Format code
npm run format

# Build for production
npm run build

# Start production server
npm start
```

### Making Changes

1. **Frontend Changes:**
   - Edit files in `client/src/`
   - Hot reload will update automatically

2. **Backend Changes:**
   - Edit files in `server/`
   - Server will restart automatically

3. **Database Schema Changes:**
   - Edit `shared/schema.ts`
   - Run `npm run db:push` to apply

## Troubleshooting

### Common Issues

**Issue: White screen after login**
- Solution: Check browser console for errors
- Verify API endpoints are responding
- Check session cookie is set

**Issue: API returns 401 Unauthorized**
- Solution: Ensure you're logged in
- Check session cookie is being sent
- Try logging in again

**Issue: Database connection errors**
- Solution: Verify DATABASE_URL is set
- Check PostgreSQL is running
- Try `npm run db:push` to sync schema

**Issue: Port 5000 already in use**
- Solution: The dev script automatically kills the port
- If still issues: `lsof -i :5000` and `kill -9 <PID>`

### Logging

**Backend Logs:**
- Uses Pino logger with pretty printing
- Request IDs for tracing
- Structured JSON logging

**Frontend Debugging:**
- Browser DevTools Console
- React Developer Tools
- Network tab for API calls

### Health Checks

```bash
# Check server is running
curl http://localhost:5000/health

# Check database connection
curl http://localhost:5000/api/health/db

# Check authentication
curl http://localhost:5000/api/auth/me -b cookies.txt
```

## Architecture Overview

### Technology Stack
- **Frontend:** React 18 with TypeScript, Vite, Tailwind CSS
- **Backend:** Node.js with Express, TypeScript
- **Database:** PostgreSQL with Drizzle ORM
- **Authentication:** Passport.js with express-session
- **Real-time:** WebSockets (Socket.io)
- **API Docs:** Swagger/OpenAPI 3.0

### Security Features
- Session-based authentication
- RBAC with granular permissions
- Rate limiting on API endpoints
- Helmet.js for security headers
- CORS configuration
- Request ID tracking
- Audit logging

### Performance Optimizations
- Database connection pooling
- API response caching
- Lazy loading on frontend
- Code splitting with Vite
- Optimized production builds

## Production Deployment

### Environment Variables
```bash
NODE_ENV=production
DATABASE_URL=postgresql://...
SESSION_SECRET=<strong-random-string>
JWT_SECRET=<strong-random-string>
CORS_ORIGIN=https://yourdomain.com
```

### Build & Deploy
```bash
# Build the application
npm run build

# Start production server
NODE_ENV=production npm start
```

### Monitoring
- Request/Response logging with Pino
- Error tracking with structured logs
- Performance metrics in dashboard
- Database query monitoring

## Support & Maintenance

### Regular Tasks
- Monitor error logs daily
- Review audit logs weekly
- Update dependencies monthly
- Backup database regularly
- Review security patches

### Emergency Procedures
1. **Database Recovery:**
   - Restore from latest backup
   - Run migrations if needed
   - Verify data integrity

2. **Security Breach:**
   - Rotate all secrets immediately
   - Review audit logs
   - Reset all user passwords
   - Notify affected users

### Contact
- Technical Support: support@nexspace.com
- Documentation: http://localhost:5000/api-docs
- Admin Dashboard: http://localhost:5000

---

## Change Log

### August 2025 - Comprehensive Audit
- ✅ Fixed EnhancedStaffPage errors (removed invalid fallback prop)
- ✅ Added OpenAPI/Swagger documentation
- ✅ Implemented structured logging with Pino
- ✅ Added rate limiting and security headers
- ✅ Created database seed script with admin user
- ✅ Added centralized error handling
- ✅ Documented all API endpoints
- ✅ Created comprehensive runbook

### Known Issues
- Some LSP diagnostics in storage.ts (non-breaking)
- Modular routing conflicts with Vite middleware (workaround in place)

---

*Last Updated: August 2025*