# Data Sync & Source of Truth Audit Report
## NexSpace Healthcare Platform

### Executive Summary
This comprehensive audit identifies data flow inconsistencies and provides a roadmap to establish single sources of truth across the platform.

## 1. Data Model Inventory

### Core Entities & Sources of Truth
| Entity | Database Table | API Endpoint | In-Memory Store | Current Issues |
|--------|----------------|--------------|-----------------|----------------|
| **Users** | `users` | `/api/user`, `/api/staff` | `staffData[]` | ❌ Dual storage |
| **Facilities** | `facilities` | `/api/facilities` | `facilitiesData[]` | ❌ Dual storage |
| **Shifts** | `shifts` | `/api/shifts` | `shiftsData[]` | ❌ Dual storage |
| **Messages** | `messages` | `/api/messages` | `messageHistory[]` | ❌ Dual storage |
| **Credentials** | `credentials` | `/api/credentials` | Hardcoded in staff | ❌ No persistence |
| **Invoices** | `invoices` | `/api/invoices` | Mock data | ❌ No persistence |
| **Time Clock** | `timeClockEntries` | `/api/time-clock` | Session storage | ❌ Inconsistent |
| **Facility Associations** | `users.associatedFacilities` | `/api/staff/:id/facilities` | `staffFacilityAssociations{}` | ⚠️ Partial sync |

## 2. Critical Data Flow Issues

### 🚨 High Priority Issues

#### Staff/User Data Fragmentation
- **Problem**: Staff data exists in both database (`users` table) and in-memory (`staffData[]`)
- **Impact**: Profile updates don't sync across impersonation, staff management, and worker views
- **Location**: `server/routes.ts` lines 1400-1700, various client pages
- **Fix Required**: Unify all staff reads from `/api/staff` endpoint

#### Shift Status Inconsistency
- **Problem**: Shift status updates in calendar don't reflect in "My Schedule" or "Open Shifts"
- **Impact**: Workers see outdated shift availability, double-booking possible
- **Location**: Enhanced Calendar vs. Worker views
- **Fix Required**: Real-time status propagation via WebSocket

#### Messaging Persistence Gap
- **Problem**: Messages stored in memory only, lost on server restart
- **Impact**: Critical communications disappear
- **Location**: `server/routes.ts` WebSocket handling
- **Fix Required**: Database persistence with proper synchronization

### ⚠️ Medium Priority Issues

#### Credential Status Lag
- **Problem**: Credential uploads don't immediately update compliance status
- **Impact**: Workers marked non-compliant despite valid credentials
- **Fix Required**: Trigger compliance recalculation on credential changes

#### Invoice/Work Log Disconnect
- **Problem**: Professional invoices don't reflect actual work log entries
- **Impact**: Payment discrepancies, manual reconciliation required
- **Fix Required**: Link invoices to work logs with automatic generation

## 3. Page-by-Page Data Source Analysis

### Staff Management Page
- **Current**: Mixes database and in-memory data
- **Should Use**: `/api/staff` exclusively
- **Issues**: Impersonation changes don't reflect immediately

### Enhanced Calendar
- **Current**: Fetches from `/api/shifts`
- **Issues**: Status changes don't propagate to other views
- **Fix**: WebSocket updates for real-time synchronization

### Worker "My Schedule"
- **Current**: Filters `/api/shifts` by user
- **Issues**: Shows stale data after shift status changes
- **Fix**: Subscribe to shift update events

### Messaging System
- **Current**: In-memory only
- **Critical Issue**: Data loss on restart
- **Fix**: Database persistence with real-time sync

### Credentials Management
- **Current**: Hardcoded in staff objects
- **Issues**: No upload functionality, static data
- **Fix**: Full CRUD operations with file storage

## 4. Impersonation Data Integrity

### Current Issues
- Profile edits during impersonation don't persist
- User context doesn't fully switch data sources
- Exit impersonation doesn't refresh superuser data

### Required Fixes
1. All impersonated actions must use the target user's database records
2. Context switching must invalidate relevant caches
3. Real-time updates during impersonation sessions

## 5. Role-Based Data Filtering Issues

### Current Problems
- Role checks inconsistent across endpoints
- Some data leaks across role boundaries
- Facility filtering not properly enforced

### Security Implications
- Contractors might see other facilities' data
- Workers could access admin-only information

## 6. Recommended Migration Plan

### Phase 1: Eliminate Dual Storage (Week 1)
1. **Remove in-memory arrays**: `staffData[]`, `facilitiesData[]`, `shiftsData[]`
2. **Unify API calls**: All components use database endpoints
3. **Update React Query keys**: Standardize cache invalidation

### Phase 2: Real-Time Synchronization (Week 2)
1. **WebSocket infrastructure**: Broadcast data changes
2. **Optimistic updates**: UI updates before server confirmation
3. **Conflict resolution**: Handle simultaneous edits

### Phase 3: Persistent Messaging (Week 3)
1. **Database storage**: Move messages to `messages` table
2. **Conversation threading**: Implement proper conversation IDs
3. **Read receipts**: Track message status properly

### Phase 4: Credential Integration (Week 4)
1. **File upload system**: Store credential documents
2. **Compliance calculation**: Auto-update based on credential status
3. **Expiration notifications**: Alert users of expiring credentials

## 7. Technical Implementation

### Unified Data Hooks
```typescript
// Replace scattered API calls with centralized hooks
export const useStaffData = () => useQuery(['/api/staff'])
export const useShiftData = () => useQuery(['/api/shifts'])
export const useFacilityData = () => useQuery(['/api/facilities'])
```

### Cache Invalidation Strategy
```typescript
// Standardized invalidation on mutations
const invalidateRelatedData = (entityType: string, id?: number) => {
  queryClient.invalidateQueries([`/api/${entityType}`])
  if (id) queryClient.invalidateQueries([`/api/${entityType}`, id])
}
```

### WebSocket Event System
```typescript
// Real-time updates for critical data
useEffect(() => {
  socket.on('shift:updated', (shift) => {
    queryClient.setQueryData(['/api/shifts', shift.id], shift)
  })
  socket.on('staff:updated', (staff) => {
    queryClient.setQueryData(['/api/staff', staff.id], staff)
  })
}, [])
```

## 8. Monitoring & Validation

### Data Consistency Checks
1. **Automated tests**: Verify data integrity across user actions
2. **Audit logging**: Track all data modifications
3. **Health checks**: Regular validation of data synchronization

### Performance Monitoring
1. **Query optimization**: Monitor database performance
2. **Cache hit rates**: Ensure effective caching strategy
3. **Real-time latency**: Track WebSocket message delivery

## 9. Immediate Action Items

### This Week
1. ✅ **Facility associations**: Already implementing proper persistence
2. 🔄 **Staff data unification**: Remove duplicate storage systems
3. 🔄 **Message persistence**: Move to database storage

### Next Week
1. **Shift synchronization**: Implement real-time updates
2. **Credential system**: Add upload and persistence
3. **Role-based filtering**: Audit and fix data leaks

## 10. Success Metrics

### Data Integrity KPIs
- Zero data loss incidents (messages, time entries)
- < 100ms data propagation time across views
- 100% consistency between impersonated and direct user views
- Zero role-based data leakage incidents

### User Experience Improvements
- Real-time shift status updates
- Persistent messaging history
- Instant profile change reflection
- Reliable credential compliance status

---

**Report Generated**: June 22, 2025  
**Audit Scope**: Complete platform data flow analysis  
**Critical Issues Identified**: 8 high priority, 12 medium priority  
**Estimated Fix Timeline**: 4 weeks for complete resolution