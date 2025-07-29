// Test script to validate impersonation permissions
import fetch from 'node-fetch';
const baseUrl = 'http://0.0.0.0:5000';

async function testImpersonationPermissions() {
  try {
    // First, login as super admin
    console.log('=== STEP 1: Login as Super Admin ===');
    const loginResponse = await fetch(`${baseUrl}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'joshburn', password: 'admin123' })
    });
    
    const cookies = loginResponse.headers.get('set-cookie');
    console.log('Login successful:', loginResponse.ok);
    
    // Check initial session
    console.log('\n=== STEP 2: Check Super Admin Session ===');
    const sessionResponse = await fetch(`${baseUrl}/api/debug/session`, {
      headers: { 'Cookie': cookies }
    });
    const sessionData = await sessionResponse.json();
    console.log('Super Admin Session:', JSON.stringify(sessionData, null, 2));
    
    // Create test facility user if needed
    console.log('\n=== STEP 3: Creating Test Facility User ===');
    const createUserResponse = await fetch(`${baseUrl}/api/facility-users`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': cookies 
      },
      body: JSON.stringify({
        username: 'test_facility_user',
        email: 'test_facility@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'Facility',
        role: 'billing_manager',
        primaryFacilityId: 1,
        associatedFacilityIds: [1]
      })
    });
    
    let facilityUserId;
    if (createUserResponse.ok) {
      const newUser = await createUserResponse.json();
      facilityUserId = newUser.id;
      console.log('Created facility user:', newUser.email, 'with role:', newUser.role);
    } else {
      // Try to find existing user
      const usersResponse = await fetch(`${baseUrl}/api/facility-users`, {
        headers: { 'Cookie': cookies }
      });
      if (usersResponse.ok) {
        const users = await usersResponse.json();
        const testUser = users.find(u => u.email === 'test_facility@example.com');
        if (testUser) {
          facilityUserId = testUser.id;
          console.log('Found existing facility user:', testUser.email);
        }
      }
    }
    
    // Impersonate facility user
    if (facilityUserId) {
      console.log('\n=== STEP 4: Impersonate Facility User ===');
      const impersonateResponse = await fetch(`${baseUrl}/api/impersonate/start`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': cookies 
        },
        body: JSON.stringify({
          targetUserId: facilityUserId,
          userType: 'facility_user'
        })
      });
      
      if (impersonateResponse.ok) {
        const impersonationData = await impersonateResponse.json();
        console.log('Impersonation started for:', impersonationData.impersonatedUser?.email);
        
        // Check impersonated session
        console.log('\n=== STEP 5: Check Impersonated Session ===');
        const impersonatedSessionResponse = await fetch(`${baseUrl}/api/debug/session`, {
          headers: { 'Cookie': cookies }
        });
        const impersonatedSession = await impersonatedSessionResponse.json();
        console.log('Impersonated Session:', JSON.stringify(impersonatedSession, null, 2));
        
        // Test facility access
        console.log('\n=== STEP 6: Test Facility Access ===');
        const facilitiesResponse = await fetch(`${baseUrl}/api/facilities`, {
          headers: { 'Cookie': cookies }
        });
        if (facilitiesResponse.ok) {
          const facilities = await facilitiesResponse.json();
          console.log('Accessible facilities count:', facilities.length);
          console.log('Should only see facility 1:', facilities.map(f => ({ id: f.id, name: f.name })));
        }
        
        // Test admin endpoint access (should fail)
        console.log('\n=== STEP 7: Test Admin Access (Should Fail) ===');
        const adminResponse = await fetch(`${baseUrl}/api/admin/users`, {
          headers: { 'Cookie': cookies }
        });
        console.log('Admin endpoint access:', adminResponse.status, adminResponse.statusText);
        
        // Stop impersonation
        console.log('\n=== STEP 8: Stop Impersonation ===');
        const stopResponse = await fetch(`${baseUrl}/api/impersonate/stop`, {
          method: 'POST',
          headers: { 'Cookie': cookies }
        });
        if (stopResponse.ok) {
          console.log('Impersonation stopped successfully');
        }
      }
    }
    
    // Test staff impersonation
    console.log('\n=== STEP 9: Test Staff Impersonation ===');
    const staffResponse = await fetch(`${baseUrl}/api/impersonate/start`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': cookies 
      },
      body: JSON.stringify({
        targetUserId: 1,
        userType: 'staff'
      })
    });
    
    if (staffResponse.ok) {
      const staffData = await staffResponse.json();
      console.log('Impersonated staff:', staffData.impersonatedUser?.email);
      
      // Check staff session
      const staffSessionResponse = await fetch(`${baseUrl}/api/debug/session`, {
        headers: { 'Cookie': cookies }
      });
      const staffSession = await staffSessionResponse.json();
      console.log('Staff Session:', JSON.stringify(staffSession, null, 2));
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testImpersonationPermissions();