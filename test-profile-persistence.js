// Test script for comprehensive profile field validation and persistence
// Run this in browser console after logging in

async function testProfilePersistence() {
  console.log("=== Testing Profile Field Persistence ===");
  
  // Get auth data
  const authDataString = localStorage.getItem('nexspace-auth');
  if (!authDataString) {
    console.error("❌ No auth data found. Please log in first.");
    return;
  }
  
  const authData = JSON.parse(authDataString);
  const user = authData.user;
  
  console.log("📋 Testing as user:", {
    id: user.id,
    email: user.email,
    role: user.role,
    facilityUserId: user.facilityUserId
  });
  
  // Test 1: Navigate to profile editor
  console.log("\n🔍 Test 1: Navigate to profile editor");
  window.location.href = '/profile-editor';
  
  console.log("✅ Please check the profile editor page:");
  console.log("- All fields should load with existing data");
  console.log("- Validation should work on each field");
  console.log("- Form should save successfully");
  
  // Test validation rules
  console.log("\n📝 Validation Rules to Test:");
  console.log("1. First Name: Required, max 50 chars, letters/spaces/hyphens/apostrophes only");
  console.log("2. Last Name: Required, max 50 chars, letters/spaces/hyphens/apostrophes only");
  console.log("3. Phone: Optional, min 10 digits, valid phone format");
  console.log("4. Department: Optional, max 100 chars (facility users only)");
  console.log("5. Title: Optional, max 100 chars (facility users only)");
  
  console.log("\n🧪 Test Cases:");
  console.log("- Try saving with empty required fields (should show errors)");
  console.log("- Try invalid phone like '123' (should show 'must have at least 10 digits')");
  console.log("- Try invalid name like 'John123' (should show 'can only contain letters')");
  console.log("- Try very long text (should show 'must be less than X characters')");
  console.log("- Save valid data and refresh page (should persist)");
}

// Run the test
testProfilePersistence();