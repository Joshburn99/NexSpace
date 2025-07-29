# Onboarding Database Write Verification Report

## Executive Summary
After thorough analysis of the NexSpace onboarding wizard, I've identified exactly what data gets saved to the database at each step. The results show that while the wizard collects comprehensive information, not all of it is persisted to the database.

## Detailed Findings by Step

### Step 1: Profile Setup
**What's Collected:**
- First Name
- Last Name  
- Phone Number
- Department
- Title

**What's Actually Saved:**

#### For Regular Users (users table):
- ✅ firstName → users.first_name
- ✅ lastName → users.last_name
- ❌ phone (column doesn't exist in users table)
- ❌ department (column doesn't exist in users table)
- ❌ title (column doesn't exist in users table)

#### For Facility Users (facility_users table):
- ✅ firstName → facility_users.first_name
- ✅ lastName → facility_users.last_name
- ✅ phone → facility_users.phone
- ✅ department → facility_users.department
- ✅ title → facility_users.title

**API Endpoint:** 
- Regular users: `PATCH /api/users/{userId}/profile`
- Facility users: `PATCH /api/facility-users/{facilityUserId}/profile`

### Step 2: Facility Setup
**What's Collected:**
- Facility selection (from dropdown)
- OR new facility name + team name (superusers only)

**What's Actually Saved:**

#### Joining Existing Facility:
- ❌ NO database write occurs
- ❌ User's facility association is NOT updated
- ❌ No entry created in facility_user_facility_associations
- ⚠️ FacilityId is only stored in React component state

#### Creating New Facility (Superusers only):
- ✅ New facility created in facilities table
- ✅ Facility name, type, address saved
- ❌ Creator's association with facility NOT saved

**API Endpoint:** `POST /api/facilities` (for creation only)

### Step 3: Staff Invitation
**What's Collected:**
- Staff member emails
- Names
- Roles

**What's Actually Saved:**
- ❌ NO database writes occur
- ❌ No invites table exists
- ❌ No staff records created
- ❌ No pending invitations stored
- ⚠️ API endpoint just returns success without persistence

**API Endpoint:** `POST /api/invites` (mock implementation only)

### Step 4: First Shift
**What's Collected:**
- Shift Title
- Date
- Start Time

**What's Actually Saved:**
- ✅ Complete shift record created in shifts table
- ✅ title → shifts.title
- ✅ date → shifts.date
- ✅ startTime → shifts.start_time
- ✅ endTime → shifts.end_time (defaults to 17:00)
- ✅ facilityId → shifts.facility_id
- ✅ specialty → shifts.specialty (defaults to "General")
- ✅ rate → shifts.rate (defaults to 50)
- ✅ requiredWorkers → shifts.required_workers (defaults to 1)

**API Endpoint:** `POST /api/shifts`

### Onboarding Completion
**What's Saved:**
- ✅ users.onboarding_completed → true
- ✅ users.onboarding_step → 4
- ✅ Session updated with completion status

**API Endpoint:** `PATCH /api/users/{userId}/onboarding`

## Database Tables Analysis

### Tables Checked:
1. **users** - Contains basic user info but missing profile fields
2. **facility_users** - Has all profile fields (phone, department, title)
3. **facility_user_facility_associations** - Links facility users to facilities
4. **shifts** - Stores all shift data
5. **staff** - Exists but not used during onboarding
6. **invites** - Does NOT exist

### Missing Database Functionality:
1. **User-Facility Association**: Regular users who join a facility during onboarding don't have this association saved
2. **Staff Invitations**: No persistence mechanism for invited staff members
3. **Profile Fields**: Regular users can't save phone, department, or title

## Verification SQL Queries

```sql
-- Check user after onboarding
SELECT id, email, first_name, last_name, facility_id, 
       onboarding_completed, onboarding_step
FROM users 
WHERE email = 'executive@nexspacecorp.com';

-- Check if facility association was created
SELECT * FROM facility_user_facility_associations
WHERE facility_user_id = (
  SELECT id FROM facility_users 
  WHERE email = 'executive@nexspacecorp.com'
);

-- Check shifts created during onboarding
SELECT * FROM shifts 
WHERE title LIKE '%Test Onboarding%' 
ORDER BY created_at DESC 
LIMIT 5;

-- Verify no invite records exist
SELECT COUNT(*) as invite_count 
FROM information_schema.tables 
WHERE table_name = 'invites';
```

## Recommendations

### Critical Fixes Needed:
1. **Save Facility Association**: Update user's facility_id when they select a facility in Step 2
2. **Create Invites System**: Implement proper invitation storage and processing
3. **Add Missing Columns**: Add phone, department, title to users table

### Implementation Suggestions:
1. In Step 2, add: `UPDATE users SET facility_id = ? WHERE id = ?`
2. Create invites table with: user_id, email, role, token, status, created_at
3. In Step 3, actually create invitation records
4. Consider creating staff "pending" records from invitations

## Conclusion

The onboarding wizard provides a good user experience but has significant gaps in data persistence:
- ✅ Profile names and shift creation work correctly
- ❌ Facility associations are not saved
- ❌ Staff invitations are not persisted
- ❌ Some profile fields are lost for regular users

Only **2 out of 4 steps** actually write meaningful data to the database. The wizard completes successfully from the user's perspective, but much of the collected information is not retained for future use.