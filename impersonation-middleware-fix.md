# Impersonation State Management Audit & Fix Plan

## Current State Analysis

### Backend Session Storage
- ✅ `impersonatedUserId`: ID of user being impersonated
- ✅ `impersonatedUserType`: Type ('facility_user', 'staff', 'user')
- ✅ `originalUser`: Original user object
- ✅ `isImpersonating`: Boolean flag

### Frontend Local Storage
- ✅ `impersonateUserId`: ID of impersonated user
- ✅ `originalUserId`: ID of original user
- ⚠️ `nexspace_impersonation_state`: Additional state (potentially redundant)

### Middleware Implementation
- ✅ `handleImpersonation` middleware properly swaps req.user
- ❌ Many endpoints missing the middleware
- ❌ Inconsistent middleware chain across endpoints

## Critical Issues Found

### 1. Missing Middleware on Key Endpoints
The following endpoints lack `handleImpersonation` middleware:
- `/api/facilities`
- `/api/users/:id`
- `/api/user/profile` (GET & PATCH)
- `/api/dashboard/*`
- `/api/job-postings`
- `/api/job-applications`
- `/api/shifts/open`
- `/api/shifts/my-shifts`
- `/api/shift-requests/:shiftId`
- Many more...

### 2. Session-Frontend Sync Issues
- Frontend uses localStorage which can get out of sync
- No validation that localStorage matches session state
- Missing cleanup on logout

### 3. Inconsistent Permission Checks
- Some endpoints check permissions before handleImpersonation
- This leads to checking original user's permissions instead of impersonated

## Fix Implementation

### Phase 1: Add Missing Middleware
All endpoints that use `requireAuth` should also use `handleImpersonation` before any permission checks:
```
app.get("/api/endpoint", requireAuth, handleImpersonation, requirePermission("permission"), ...)
```

### Phase 2: Frontend-Backend Sync
- Session is source of truth
- Frontend checks session status on mount
- Clear localStorage on logout/session expiry

### Phase 3: Testing
- Verify all endpoints respect impersonation
- Test permission checks use impersonated user
- Ensure state persists across page reloads