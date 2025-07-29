# Onboarding Wizard Validation Test Plan

## Overview
This document details all validation tests to perform on the NexSpace onboarding wizard to ensure proper form validation and error handling.

## Current Validation Rules

### Step 1: Profile Setup
- **firstName**: REQUIRED, 1-50 chars, letters/spaces/hyphens/apostrophes only
- **lastName**: REQUIRED, 1-50 chars, letters/spaces/hyphens/apostrophes only  
- **phone**: Optional, but if provided must have valid format and 10+ digits
- **department**: Optional, max 100 chars
- **title**: Optional, max 100 chars

### Step 2: Facility Setup
- Must either select existing facility OR provide new facility name
- Current validation: Too loose (accepts any of facilityId, facilityName, or teamName)

### Step 3: Staff Invitations
- Entire step is optional (can skip)
- If adding invites: email must be valid, role and name required

### Step 4: First Shift
- **shiftTitle**: REQUIRED
- **shiftDate**: REQUIRED  
- **shiftTime**: REQUIRED

## Validation Tests to Perform

### Step 1: Profile Validation Tests

1. **Empty Required Fields**
   - Clear firstName → Click Next
   - Expected: "First name is required" error

2. **Invalid Characters**
   - firstName: "John123" → Expected: Error about letters only
   - firstName: "John@#$" → Expected: Error about letters only

3. **Length Validation**
   - firstName: 51+ characters → Expected: "must be less than 50 characters"
   - department: 101+ characters → Expected: "must be less than 100 characters"

4. **Phone Validation**
   - phone: "123" → Expected: "must have at least 10 digits"
   - phone: "abc-def-ghij" → Expected: "valid phone number" error
   - phone: "+1 (555) 123-4567" → Expected: Should pass

5. **Valid Submissions**
   - Only firstName and lastName filled → Should proceed to Step 2

### Step 2: Facility Validation Tests

1. **No Selection**
   - Don't select facility, don't enter new name → Click Next
   - Expected: Error message requiring selection

2. **Join Existing - No Selection**
   - Select "Join existing" but no facility dropdown selection
   - Expected: Should block advancement

3. **Create New - Empty Name**  
   - Select "Create new" but leave facility name empty
   - Expected: Should require facility name

4. **Non-Superuser Validation**
   - Non-superuser should NOT see "Create new" option at all

### Step 3: Staff Invitation Tests

1. **Skip Functionality**
   - Click "Skip this step" → Should advance to Step 4

2. **Invalid Email**
   - email: "notanemail" → Expected: "Invalid email address"
   - email: "missing@domain" → Expected: "Invalid email address"

3. **Missing Required Fields**
   - Add email but no name → Expected: "Name is required"
   - Add email but no role → Expected: "Role is required"

4. **Partial Entry**
   - Start filling invite, then try to advance without completing
   - Expected: Should validate incomplete entries

### Step 4: Shift Validation Tests

1. **Empty Fields**
   - Leave all fields empty → Click Complete
   - Expected: Multiple required field errors

2. **Missing Individual Fields**
   - Only fill title → Expected: Date and time required errors
   - Only fill date → Expected: Title and time required errors

3. **Skip Option**
   - "Skip & Finish" should complete onboarding without shift

## Validation Gaps Identified

### Critical Issues:
1. **Step 2**: Facility selection validation is too permissive
2. **Step 3**: No validation on duplicate emails
3. **Step 4**: No validation on past dates
4. **General**: Form errors may not be clearly displayed

### Enhancement Opportunities:
1. Add email uniqueness check in invitations
2. Add date validation (no past dates) for shifts
3. Strengthen facility selection requirements
4. Add loading states during validation

## Test Implementation

### Manual Testing Steps:
1. Login with test user (onboarding_completed = false)
2. For each step, try all validation scenarios
3. Document any validation that doesn't work as expected
4. Note unclear or missing error messages

### Expected Behaviors:
- Form should prevent advancement with invalid data
- Error messages should appear near relevant fields
- Errors should clear when corrected
- Required field indicators (*) should be visible

## Success Criteria
✅ All required fields block advancement when empty
✅ Format validations work correctly (email, phone, names)
✅ Length limits are enforced
✅ Error messages are clear and helpful
✅ Users cannot bypass validation by clicking quickly
✅ Skip options work without validation (where allowed)