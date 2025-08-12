# NexSpace - Healthcare Workforce Management Platform

## Quick Start

### System Requirements
- **Node.js**: v20.19.3+ (automatically provided on Replit)
- **PostgreSQL**: Pre-configured via DATABASE_URL environment variable
- **Memory**: 2GB RAM minimum

### Installation & Startup
```bash
# Dependencies are pre-installed, but to reinstall if needed:
npm install

# Start development server (frontend + backend)
npm run dev

# Access points:
# - Web UI: http://localhost:5000
# - API Documentation: http://localhost:5000/api-docs
```

### Admin Login
```
Username: joshburn
Password: admin123
Role: Super Admin
```

## Environment Variables

### Required Variables (Pre-configured on Replit)
```bash
DATABASE_URL=postgresql://...     # ✅ Already set
NODE_ENV=development             # ✅ Default
PORT=5000                        # ✅ Default
```

### Optional Variables
```bash
SESSION_SECRET=your-secret-key   # For production
CORS_ORIGIN=*                    # CORS configuration
```

### Setting Environment Variables on Replit
1. Click "Secrets" tab in the left sidebar
2. Add key-value pairs (e.g., `SESSION_SECRET` = `your-secret-here`)
3. Restart the application

## Database Management

### Quick Commands
```bash
# Push schema changes to database
npm run db:push

# Seed database with sample data (creates admin user)
tsx server/seed.ts

# Complete database reset (⚠️ DESTROYS ALL DATA)
./scripts/db-reset.sh
```

### Seed Data Includes
- Admin user (joshburn/admin123)
- 3 Sample facilities
- 5 Sample staff members
- 5 Sample shifts
- 22 RBAC permissions

## Architecture Overview

### Stack
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL + Drizzle ORM
- **Auth**: Passport.js + express-session
- **API Docs**: Swagger/OpenAPI 3.0

### Project Structure
```
├── client/          # React frontend
├── server/          # Express backend + API routes
├── shared/          # TypeScript schemas (Drizzle ORM)
├── scripts/         # Database utilities
└── migrations/      # Database migrations
```

## Logging & Debugging

### Where Logs Appear
- **Console Output**: Structured JSON logs with request IDs
- **Browser DevTools**: Frontend errors and network requests
- **Replit Console**: All server logs in the workspace

### Log Format Example
```json
{
  "level": "info",
  "time": "2025-08-12T18:40:52.784Z",
  "requestId": "d2d84322-b7f9-42cc-8090-eaeb577d822b",
  "method": "GET",
  "url": "/api/dashboard/stats",
  "statusCode": 200,
  "duration": "169ms"
}
```

## Common Issues & Fixes

### 1. Port 5000 Already in Use
```bash
# The dev script automatically kills the port, but if issues persist:
lsof -i :5000
kill -9 <PID>
# Or restart the workflow in Replit
```

### 2. Database Connection Errors
```bash
# Verify DATABASE_URL is set
echo $DATABASE_URL

# Push schema if tables are missing
npm run db:push

# Reseed if data is corrupted
tsx server/seed.ts
```

### 3. White Screen After Login
- Check browser console for errors
- Verify API endpoints return 200 status
- Clear browser cookies and try again
- Check session storage in PostgreSQL

### 4. API Returns 401 Unauthorized
```bash
# Test login via curl
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"joshburn","password":"admin123"}' \
  -c cookies.txt

# Test authenticated endpoint
curl -X GET http://localhost:5000/api/auth/me -b cookies.txt
```

### 5. CORS Issues
- CORS is pre-configured to allow all origins in development
- For production, set `CORS_ORIGIN` environment variable
- Restart server after changing CORS settings

### 6. Vite Build Issues
- Never modify `vite.config.ts` or `server/vite.ts`
- If frontend won't load, check Vite dev server in console
- Clear browser cache and reload

### 7. TypeScript Errors
```bash
# Check for type errors
npm run check

# View detailed diagnostics in Replit
# LSP errors appear in the workspace sidebar
```

## API Documentation

### Interactive Docs
Access Swagger UI at: http://localhost:5000/api-docs

### Key Endpoints
```bash
# Authentication
POST /api/auth/login    # User login
GET  /api/auth/me       # Current user info
POST /api/auth/logout   # User logout

# Core Resources
GET  /api/facilities    # List facilities
GET  /api/staff         # List staff
GET  /api/shifts        # List shifts
GET  /api/dashboard/stats # Dashboard data
```

## Development Workflow

### Making Changes
1. **Frontend**: Edit files in `client/src/` (hot reload enabled)
2. **Backend**: Edit files in `server/` (auto-restart enabled)
3. **Database**: Edit `shared/schema.ts` then run `npm run db:push`

### Code Quality
```bash
npm run lint      # ESLint
npm run format    # Prettier
npm run check     # TypeScript
```

## Production Deployment

### Build Commands
```bash
npm run build     # Build for production
npm start         # Start production server
```

### Environment Variables for Production
```bash
NODE_ENV=production
DATABASE_URL=postgresql://prod-db-url
SESSION_SECRET=strong-random-string
CORS_ORIGIN=https://yourdomain.com
```

## Security Features

- Session-based authentication with PostgreSQL storage
- Role-based access control (RBAC) with granular permissions
- Rate limiting (100 requests per 15 minutes)
- Security headers via Helmet.js
- CORS protection
- Request ID tracking for audit trails

## Support

### Health Checks
```bash
curl http://localhost:5000/          # Web UI
curl http://localhost:5000/api-docs/ # API docs
```

### Emergency Reset
If the application is completely broken:
```bash
./scripts/db-reset.sh  # Reset database
npm run dev            # Restart server
```

### Documentation
- **Complete Runbook**: `RUNBOOK.md`
- **Audit Report**: `AUDIT_CHANGELOG.md`
- **API Documentation**: http://localhost:5000/api-docs

---

**Last Updated**: August 2025  
**Platform Status**: ✅ Operational  
**Admin Access**: joshburn / admin123