// Test script for facility user profile persistence
// Run this after logging in as a facility user

async function testFacilityUserProfilePersistence() {
  console.log("=== Testing Facility User Profile Persistence ===");
  
  // Check if we have facility user info in localStorage
  const authDataString = localStorage.getItem('nexspace-auth');
  if (!authDataString) {
    console.error("❌ No auth data found. Please log in as a facility user first.");
    return;
  }
  
  const authData = JSON.parse(authDataString);
  const user = authData.user;
  
  console.log("📋 Current user:", {
    id: user.id,
    email: user.email,
    role: user.role,
    facilityUserId: user.facilityUserId
  });
  
  if (user.role !== 'facility_user') {
    console.error("❌ Current user is not a facility user. Please log in as a facility user.");
    return;
  }
  
  if (!user.facilityUserId) {
    console.error("❌ facilityUserId is missing from user object. Authentication may need to be fixed.");
    return;
  }
  
  // Test 1: Get current profile
  console.log("\n📖 Test 1: Fetching current profile...");
  try {
    const getResponse = await fetch(`/api/facility-users/${user.facilityUserId}/profile`, {
      method: 'GET',
      credentials: 'include'
    });
    
    if (!getResponse.ok) {
      throw new Error(`Failed to get profile: ${getResponse.status}`);
    }
    
    const currentProfile = await getResponse.json();
    console.log("✅ Current profile:", currentProfile);
    
    // Test 2: Update profile
    console.log("\n✏️ Test 2: Updating profile...");
    const testData = {
      firstName: currentProfile.first_name || currentProfile.firstName,
      lastName: currentProfile.last_name || currentProfile.lastName,
      phone: "555-1234",
      department: "Operations",
      title: "Facility Manager"
    };
    
    console.log("📤 Sending update:", testData);
    
    const updateResponse = await fetch(`/api/facility-users/${user.facilityUserId}/profile`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(testData)
    });
    
    if (!updateResponse.ok) {
      const error = await updateResponse.json();
      throw new Error(`Failed to update profile: ${error.message}`);
    }
    
    const updatedProfile = await updateResponse.json();
    console.log("✅ Profile updated:", updatedProfile);
    
    // Test 3: Verify persistence
    console.log("\n🔍 Test 3: Verifying persistence...");
    const verifyResponse = await fetch(`/api/facility-users/${user.facilityUserId}/profile`, {
      method: 'GET',
      credentials: 'include'
    });
    
    if (!verifyResponse.ok) {
      throw new Error(`Failed to verify profile: ${verifyResponse.status}`);
    }
    
    const verifiedProfile = await verifyResponse.json();
    console.log("✅ Verified profile:", verifiedProfile);
    
    // Check if data persisted
    if (verifiedProfile.phone === testData.phone &&
        verifiedProfile.department === testData.department &&
        verifiedProfile.title === testData.title) {
      console.log("\n🎉 SUCCESS: Profile data persisted correctly!");
    } else {
      console.error("\n❌ FAILED: Profile data did not persist correctly");
      console.log("Expected:", testData);
      console.log("Got:", {
        phone: verifiedProfile.phone,
        department: verifiedProfile.department,
        title: verifiedProfile.title
      });
    }
    
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

// Run the test
testFacilityUserProfilePersistence();