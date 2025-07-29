# Forms Pre-Population Audit Report

## Executive Summary
This report analyzes all major forms in the NexSpace application that handle editing existing data, checking whether they properly pre-populate with saved values. Most forms are correctly implemented, but several need fixes to ensure data pre-fills properly.

## Form Status Overview

### ✅ WORKING CORRECTLY (Pre-populate properly)

#### 1. **ProfileEditor Component** (`client/src/components/ProfileEditor.tsx`)
- **Status**: ✅ Working
- **Method**: Uses `useEffect` to call `form.reset()` when profileData loads
- **Implementation**:
  ```typescript
  useEffect(() => {
    if (profileData) {
      form.reset({
        firstName: profileData.firstName || profileData.first_name || "",
        lastName: profileData.lastName || profileData.last_name || "",
        phone: profileData.phone || "",
        department: profileData.department || "",
        title: profileData.title || "",
      });
    }
  }, [profileData, form]);
  ```

#### 2. **Shift Templates Page** (`client/src/pages/shift-templates-page.tsx`)
- **Status**: ✅ Working
- **Method**: `handleEditTemplate` function properly maps data and calls `form.reset()`
- **Implementation**: Transforms database fields to form fields with proper null checks and defaults

#### 3. **Facility Jobs Page** (`client/src/pages/FacilityJobsPage.tsx`)
- **Status**: ✅ Working
- **Method**: `handleEdit` function sets form state with existing posting data
- **Implementation**: Direct state update with proper field mapping

#### 4. **Facility User Edit Form** (`client/src/components/FacilityUserEditForm.tsx`)
- **Status**: ✅ Working
- **Method**: useState initialized with user prop data
- **Implementation**:
  ```typescript
  const [formData, setFormData] = useState({
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone || "",
    // ... other fields
  });
  ```

#### 5. **Facility Settings Page** (`client/src/pages/FacilitySettingsPage.tsx`)
- **Status**: ✅ Working
- **Method**: State-based with `useEffect` to update when data loads
- **Implementation**: Updates settings state when facilityData changes

### ⚠️ NEEDS VERIFICATION (May have issues)

#### 1. **User Profile Page** (`client/src/pages/user-profile-page.tsx`)
- **Status**: ⚠️ Needs checking
- **Issue**: Uses react-hook-form but no visible `useEffect` or `form.reset()` for pre-population
- **Fix Needed**: Add useEffect to reset form when user data loads

#### 2. **Enhanced Staff Page** (`client/src/pages/enhanced-staff-page.tsx`)
- **Status**: ⚠️ Uses defaultValue props
- **Issue**: `defaultValue` props don't update after initial render
- **Fix Needed**: Switch to controlled inputs with `value` prop or use `form.reset()`

#### 3. **Facility Profile Page** (`client/src/pages/FacilityProfilePage.tsx`)
- **Status**: ⚠️ State-based editing
- **Issue**: Uses local state (`editedFacility`) initialized on edit button click
- **Concern**: May not reflect real-time data changes if facility data updates

### ❌ KNOWN ISSUES (Need fixing)

#### 1. **Onboarding Wizard** (`client/src/components/OnboardingWizard.tsx`)
- **Status**: ❌ Data not persisting/pre-populating
- **Issue**: Profile data entered in Step 1 doesn't save or pre-fill on return
- **Root Cause**: The `updateUserProfile` storage method tries to update non-existent columns
- **Fix Applied**: Already fixed in routes.ts to only update existing columns

## Common Patterns for Proper Pre-Population

### 1. **React Hook Form Pattern** (Recommended)
```typescript
const form = useForm({
  defaultValues: { /* initial empty values */ }
});

useEffect(() => {
  if (existingData) {
    form.reset({
      field1: existingData.field1 || "",
      field2: existingData.field2 || "",
      // map all fields
    });
  }
}, [existingData, form]);
```

### 2. **State-Based Pattern**
```typescript
const [formData, setFormData] = useState(() => ({
  field1: existingData?.field1 || "",
  field2: existingData?.field2 || "",
}));

// Update when data changes
useEffect(() => {
  if (existingData) {
    setFormData({
      field1: existingData.field1 || "",
      field2: existingData.field2 || "",
    });
  }
}, [existingData]);
```

### 3. **Controlled Input Pattern**
```typescript
<Input
  value={formData.field1}  // NOT defaultValue
  onChange={(e) => setFormData({...formData, field1: e.target.value})}
/>
```

## Key Issues to Avoid

1. **Using `defaultValue` for Dynamic Data**: The `defaultValue` prop only sets initial value and doesn't update
2. **Missing Null Checks**: Always provide fallback empty strings for undefined values
3. **Field Name Mismatches**: Ensure form field names match API response fields (handle snake_case vs camelCase)
4. **Timing Issues**: Data might load after form renders - use useEffect to update when data arrives
5. **Stale Data**: Form might show old data if not properly refreshed after mutations

## Recommendations

1. **Standardize Form Pattern**: Use react-hook-form with useEffect/reset pattern for all edit forms
2. **Add Loading States**: Show skeleton loaders while fetching existing data
3. **Handle Field Mapping**: Create utility functions to map API responses to form fields
4. **Test Data Flow**: Verify data saves correctly and pre-populates on subsequent edits
5. **Add Form Validation**: Ensure all forms have proper validation before submission

## Next Steps

1. Fix User Profile Page to use form.reset() pattern
2. Convert Enhanced Staff Page from defaultValue to controlled inputs
3. Add comprehensive testing for all edit forms
4. Create shared form utilities for consistent implementation
5. Document the standard form pattern for future development