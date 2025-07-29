# Impersonation Audit Logging Implementation

## Overview
The NexSpace platform now has comprehensive audit logging that properly tracks actions performed during impersonation. This ensures complete accountability and transparency when super admins perform actions on behalf of other users.

## Implementation Details

### 1. Database Schema Enhancement
Added three new columns to the `audit_logs` table:
- `original_user_id` (INTEGER): ID of the super admin who initiated impersonation
- `is_impersonated` (BOOLEAN): Flag indicating if action was performed during impersonation 
- `impersonation_context` (JSONB): Additional context including userType and email addresses

### 2. Audit Logging Middleware Updates
Both audit logging middleware functions have been enhanced:

#### In `server/routes.ts`:
```typescript
const auditLog = (action: string, resource: string) => {
  return async (req: any, res: any, next: any) => {
    // ... existing code ...
    
    // Check if this is an impersonated action
    const isImpersonated = !!(req.session as any).originalUser;
    const originalUserId = isImpersonated ? (req.session as any).originalUser.id : undefined;
    const impersonationContext = isImpersonated
      ? {
          userType: (req.session as any).impersonatedUserType || "user",
          originalEmail: (req.session as any).originalUser.email,
          impersonatedEmail: req.user.email,
        }
      : undefined;

    storage.createAuditLog(
      req.user.id,
      action,
      resource,
      data?.id,
      undefined,
      data,
      req.ip,
      req.get("User-Agent"),
      originalUserId,
      isImpersonated,
      impersonationContext
    );
  };
};
```

#### In `server/security-middleware.ts`:
Similar implementation for the security middleware audit logging.

### 3. Enhanced Audit Log Retrieval
The `getAuditLogs` method in storage now:
- Joins with the users table to get usernames
- Fetches original user information for impersonated actions
- Returns comprehensive data including impersonation context

### 4. UI Enhancement
The Admin Audit Logs page now displays:
- Clear indication when an action was performed during impersonation
- Shows "Impersonated by: [email]" in an orange highlight box
- Maintains full audit trail of who did what and when

## How It Works

### When a Super Admin Impersonates a User:
1. Super admin logs in and navigates to the impersonation page
2. Selects a user to impersonate (e.g., billing manager)
3. Session stores both original user and impersonated user information

### During Impersonation:
1. All actions use the impersonated user's permissions (via handleImpersonation middleware)
2. Audit logging middleware detects the impersonation state from session
3. Each logged action includes:
   - The impersonated user as the primary actor (userId)
   - The original super admin ID (originalUserId)
   - Impersonation context with both email addresses

### In the Audit Logs:
Actions performed during impersonation show:
```
User: test_billing@example.com (ID: 4)
[Impersonated by: joshburn@example.com]
```

## Example Audit Log Entry
When a super admin impersonates a billing manager and updates a facility:

```json
{
  "id": 123,
  "action": "update",
  "resource": "facility",
  "resourceId": 1,
  "userId": 4,  // The billing manager
  "username": "test_billing@example.com",
  "originalUserId": 1,  // The super admin
  "isImpersonated": true,
  "originalUserInfo": {
    "id": 1,
    "email": "joshburn@example.com",
    "firstName": "Josh",
    "lastName": "Burnham"
  },
  "impersonationContext": {
    "userType": "facility_user",
    "originalEmail": "joshburn@example.com",
    "impersonatedEmail": "test_billing@example.com"
  },
  "timestamp": "2025-07-29T10:45:00Z"
}
```

## Security Benefits
1. **Full Accountability**: Every action is traceable to both the impersonated user and the original super admin
2. **Compliance**: Meets regulatory requirements for audit trails in healthcare systems
3. **Transparency**: Clear indication of when actions were performed on behalf of another user
4. **Non-repudiation**: Cannot deny performing actions during impersonation

## Testing Instructions
1. Login as super admin (joshburn@example.com / admin123)
2. Navigate to Admin > User Impersonation
3. Impersonate any user (e.g., billing manager)
4. Perform actions like updating facility settings or creating shifts
5. Quit impersonation
6. Navigate to Admin > Audit Logs
7. Look for the actions you performed - they will show the impersonation indicator

## Middleware Chain
All protected endpoints follow this middleware chain:
```
requireAuth → handleImpersonation → requirePermission → auditLog
```

This ensures that:
1. User is authenticated
2. Impersonation context is properly set
3. Permissions are checked against the impersonated user
4. Actions are logged with full impersonation context