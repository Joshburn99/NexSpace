# Onboarding Wizard Test Guide

## Test Objective
Verify that the NexSpace onboarding wizard correctly guides new facility users through all 4 steps:
1. Profile Setup
2. Facility Details  
3. Staff Invitation
4. Shift Scheduling

## Test Users Available
The following users have `onboarding_completed = false` and can be used for testing:
- **executive@nexspacecorp.com** (facility_admin, onboarding_step: 0)
- **mengineer650@gmail.com** (internal_employee, onboarding_step: 0)
- **mateen1@gmail.com** (client_administrator, onboarding_step: 0)

## Step-by-Step Test Instructions

### 1. Initial Setup
1. Open browser and navigate to http://localhost:5000
2. Login with one of the test users (you'll need their password)
3. **Expected**: Onboarding wizard should appear immediately after login

### 2. Verify Onboarding Wizard Display
- **Expected**: A modal overlay with "Welcome to NexSpace!" title
- **Expected**: Progress bar showing 0% completion
- **Expected**: 4 step indicators (Profile, Facility, Team, Shift)
- **Expected**: Skip button and X (exit) button in top right
- **Expected**: "Already have an account? Sign in" link

### 3. Test Step 1: Profile Setup
1. **Check pre-filled data**: First name and last name should be populated from user account
2. **Fill required fields**:
   - Phone Number: Enter any valid phone format (e.g., +1 (555) 123-4567)
   - Department: Enter department name (optional)
   - Title: Enter job title (optional)
3. **Click Next button**
4. **Expected**: 
   - Profile data is saved (check console for "[ONBOARDING] Profile update successful")
   - Progress bar shows 25%
   - Step 2 (Facility) becomes active

### 4. Test Step 2: Facility Details
1. **For non-superusers**: 
   - Should only see "Join an existing facility" option
   - "Create a new facility" should NOT be visible
2. **Select a facility** from dropdown (if joining existing)
3. **Click Next button**
4. **Expected**:
   - Progress bar shows 50%
   - Step 3 (Team) becomes active

### 5. Test Step 3: Staff Invitation
1. **Add staff emails**:
   - Enter email addresses one at a time
   - Click "Add" button after each email
   - Added emails should appear in a list
2. **Optional**: Can skip this step without adding any emails
3. **Click Next button**
4. **Expected**:
   - Progress bar shows 75%
   - Step 4 (Shift) becomes active

### 6. Test Step 4: Shift Scheduling
1. **Fill shift details**:
   - Shift Title: e.g., "Morning Shift - Nursing"
   - Date: Select tomorrow's date
   - Time: e.g., "07:00 AM - 03:00 PM"
2. **Click Complete button**
3. **Expected**:
   - Success toast: "Welcome to NexSpace! You've successfully completed the onboarding process."
   - Onboarding wizard closes
   - User is redirected to main dashboard

### 7. Verify Completion
1. **Check database**: User's `onboarding_completed` should be `true`
2. **Refresh page**: Onboarding wizard should NOT reappear
3. **Check user can access**: Normal dashboard and features

## Data Persistence Test
1. Start onboarding with a test user
2. Complete Step 1 (Profile) and Step 2 (Facility)
3. Click Exit (X) button
4. Log out and log back in
5. **Expected**: Onboarding resumes at Step 3 (Team) with previous data retained

## Edge Cases to Test
1. **Skip Button**: Click Skip at any step → Should complete onboarding and close wizard
2. **Exit Button**: Click X at any step → Should close wizard but not mark as completed
3. **Back Navigation**: Use Back buttons to go to previous steps → Data should be preserved
4. **Step Indicators**: Click on completed step indicators → Should navigate to that step

## Known Issues from Previous Fix
- The `updateUserProfile` method was trying to update non-existent fields
- Fixed to only update firstName/lastName using snake_case column names
- Phone, department, and bio fields need to be added to users table for full functionality

## Console Logs to Monitor
Look for these console messages during testing:
- `[ONBOARDING] Using endpoint: /api/users/{id}/profile`
- `[ONBOARDING] Submitting profile data:` 
- `[ONBOARDING] Profile update successful:`
- `[ONBOARDING] Profile update successful, calling onNext`

## API Endpoints Used
- `PATCH /api/users/{userId}/onboarding` - Updates onboarding step/completion
- `PATCH /api/users/{userId}/profile` - Updates user profile (regular users)
- `PATCH /api/facility-users/{facilityUserId}/profile` - Updates facility user profile
- `GET /api/facilities` - Fetches available facilities for Step 2

## Success Criteria
✅ All 4 steps are accessible and functional
✅ Next buttons progress to the correct next step
✅ Data entered in each step is preserved when moving between steps
✅ Onboarding completion is properly recorded in database
✅ Users cannot create facilities unless they are superusers
✅ Onboarding wizard only appears for users with `onboarding_completed = false`