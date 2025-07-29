#!/usr/bin/env node
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';

// Test impersonation persistence across page refreshes
async function testImpersonationRefresh() {
  console.log('🧪 Testing Impersonation Persistence Across Page Refreshes\n');
  
  // Step 1: Login as super admin
  console.log('1️⃣ Logging in as super admin...');
  const loginResponse = await fetch(`${BASE_URL}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'joshburn',
      password: 'admin123'
    }),
    credentials: 'include',
  });
  
  const admin = await loginResponse.json();
  const cookies = loginResponse.headers.get('set-cookie');
  console.log(`✅ Logged in as: ${admin.username} (${admin.role})\n`);

  // Step 2: Start impersonating a facility user
  console.log('2️⃣ Starting impersonation of facility user...');
  const impersonateResponse = await fetch(`${BASE_URL}/api/impersonate/start`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Cookie': cookies
    },
    body: JSON.stringify({
      targetUserId: 7, // Sarah Henderson - Facility Admin
      userType: 'facility_user'
    })
  });
  
  const impersonateData = await impersonateResponse.json();
  const sessionCookies = impersonateResponse.headers.get('set-cookie') || cookies;
  
  if (!impersonateResponse.ok) {
    console.log('❌ Failed to start impersonation:', impersonateData);
    return;
  }
  
  console.log('📝 Impersonation response:', JSON.stringify(impersonateData, null, 2));
  const impersonatedEmail = impersonateData.impersonatedUser?.email || 'Unknown user';
  console.log(`✅ Impersonating: ${impersonatedEmail}\n`);

  // Step 3: Check session contents
  console.log('3️⃣ Checking session contents...');
  const sessionResponse = await fetch(`${BASE_URL}/api/debug/session`, {
    method: 'GET',
    headers: { 
      'Cookie': sessionCookies
    }
  });
  
  const sessionData = await sessionResponse.json();
  console.log('📝 Session data:', sessionData);

  // Step 4: Simulate page refresh by calling /api/user
  console.log('\n4️⃣ Simulating page refresh - fetching /api/user...');
  const userResponse = await fetch(`${BASE_URL}/api/user`, {
    method: 'GET',
    headers: { 
      'Cookie': sessionCookies
    }
  });
  
  const currentUser = await userResponse.json();
  console.log('📝 User data after refresh:', {
    id: currentUser.id,
    email: currentUser.email,
    role: currentUser.role,
    isImpersonating: currentUser.isImpersonating,
    originalUserId: currentUser.originalUserId,
    userType: currentUser.userType
  });

  // Step 5: Verify impersonation persisted
  if (currentUser.isImpersonating && currentUser.id === 7) {
    console.log('✅ SUCCESS: Impersonation persisted across refresh!');
    console.log('   - isImpersonating flag is true');
    console.log('   - User ID matches impersonated user');
    console.log('   - Original user ID is preserved:', currentUser.originalUserId);
  } else {
    console.log('❌ FAIL: Impersonation did not persist');
    console.log('   - Expected isImpersonating: true, got:', currentUser.isImpersonating);
    console.log('   - Expected user ID: 7, got:', currentUser.id);
  }

  // Step 6: Test permission-restricted endpoint during impersonation
  console.log('\n5️⃣ Testing permission-restricted endpoint...');
  const shiftsResponse = await fetch(`${BASE_URL}/api/shifts`, {
    method: 'GET',
    headers: { 
      'Cookie': sessionCookies
    }
  });
  
  if (shiftsResponse.ok) {
    const shifts = await shiftsResponse.json();
    console.log(`✅ Can access shifts endpoint (${shifts.shifts.length} shifts)`);
  } else {
    console.log(`❌ Cannot access shifts endpoint: ${shiftsResponse.status}`);
  }

  // Step 7: Stop impersonation
  console.log('\n6️⃣ Stopping impersonation...');
  const stopResponse = await fetch(`${BASE_URL}/api/impersonate/stop`, {
    method: 'POST',
    headers: { 
      'Cookie': sessionCookies
    }
  });
  
  const stopData = await stopResponse.json();
  console.log(`✅ Back to original user: ${stopData.originalUser.email}\n`);

  console.log('🎉 Test completed!');
}

testImpersonationRefresh().catch(console.error);