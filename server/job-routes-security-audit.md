# Job Management Routes Security Audit

## Security Implementation Summary

All job management routes have been secured with proper role-based access control:

### Job Postings (`/api/job-postings`)
- **GET**: ✅ All authenticated users can view
  - Staff users see only active postings
  - Facility users see only their facility's postings  
  - Super admins see all postings
- **POST**: ✅ Only facility users and super admins can create
- **PATCH /:id**: ✅ Only posting owner (facility) or super admin can edit
- **DELETE /:id**: ✅ Only posting owner (facility) or super admin can delete

### Job Applications (`/api/job-applications`)
- **GET**: ✅ Role-based viewing
  - Staff can only view their own applications (staffId must match)
  - Facility users can only view applications for their facility's jobs
  - Super admins can view all applications
- **POST**: ✅ Any authenticated user can apply (staff applying for jobs)
- **PATCH /:id/status**: ✅ Only job owner (facility) or super admin can update
  - Includes hiring workflow with facility association creation
  - WebSocket notification on hire

### Interview Schedules (`/api/interviews`)
- **GET**: ✅ Role-based viewing
  - Staff can only view their own interviews
  - Facility users can only view interviews for their facility's jobs
  - Super admins can view all interviews
- **POST**: ✅ Only facility users (for their jobs) or super admins can schedule

## Permission Matrix

| Endpoint                          | Super Admin | Facility User | Staff |
|----------------------------------|-------------|---------------|--------|
| GET /api/job-postings            | ✅ All      | ✅ Own facility| ✅ Active only |
| POST /api/job-postings           | ✅          | ✅             | ❌     |
| PATCH /api/job-postings/:id      | ✅          | ✅ Own only    | ❌     |
| DELETE /api/job-postings/:id     | ✅          | ✅ Own only    | ❌     |
| GET /api/job-applications        | ✅ All      | ✅ Own facility| ✅ Own only |
| POST /api/job-applications       | ✅          | ✅             | ✅     |
| PATCH /api/job-applications/:id/status | ✅    | ✅ Own facility| ❌     |
| GET /api/interviews              | ✅ All      | ✅ Own facility| ✅ Own only |
| POST /api/interviews             | ✅          | ✅ Own facility| ❌     |

## Security Checks Implemented

1. **Authentication**: All routes require `requireAuth` middleware
2. **Role Validation**: Checks `req.user.role` for super_admin privileges
3. **Facility Ownership**: Validates `req.user.facilityId` matches resource facility
4. **Resource Ownership**: Validates `req.user.id` matches resource owner (for staff)
5. **Audit Logging**: All create/update/delete operations use `auditLog` middleware

## Test Coverage

Unit tests have been created in `server/__tests__/job-routes.test.ts` covering:
- Permission checks for each endpoint
- Role-based access scenarios
- Ownership validation
- Error responses for unauthorized access