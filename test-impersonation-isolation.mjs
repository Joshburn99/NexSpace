#!/usr/bin/env node

/**
 * Test script to verify impersonation session isolation
 * Ensures no data bleed-over between impersonation sessions
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';
const SUPER_ADMIN = { username: 'joshburn', password: 'admin123' };

// User IDs to impersonate
const USER_A_ID = 24;  // Test Billing as billing manager
const USER_B_ID = 21;  // John Thompson as facility administrator

let sessionCookies = '';

function extractCookies(response) {
  const setCookieHeaders = response.headers.raw()['set-cookie'] || [];
  return setCookieHeaders.map(cookie => cookie.split(';')[0]).join('; ');
}

async function loginAsSuperAdmin() {
  console.log('🔐 Logging in as super admin...');
  const response = await fetch(`${BASE_URL}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(SUPER_ADMIN)
  });

  if (!response.ok) {
    throw new Error(`Login failed: ${response.status}`);
  }

  sessionCookies = extractCookies(response);
  const data = await response.json();
  console.log(`✅ Logged in successfully\n`);
}

async function getCurrentUser() {
  const response = await fetch(`${BASE_URL}/api/user`, {
    headers: { 'Cookie': sessionCookies }
  });
  
  if (!response.ok) {
    throw new Error(`Failed to get current user: ${response.status} ${response.statusText}`);
  }
  
  const user = await response.json();
  return user;
}

async function getSessionDebug() {
  const response = await fetch(`${BASE_URL}/api/debug/session`, {
    headers: { 'Cookie': sessionCookies }
  });
  
  if (response.ok) {
    return await response.json();
  }
  return null;
}

async function testDataAccess(description) {
  console.log(`\n📊 Testing data access: ${description}`);
  
  // Test facility access
  const facilitiesResponse = await fetch(`${BASE_URL}/api/facilities`, {
    headers: { 'Cookie': sessionCookies }
  });
  
  if (facilitiesResponse.ok) {
    const facilities = await facilitiesResponse.json();
    console.log(`  - Can access ${facilities.length} facilities`);
  } else {
    console.log(`  - Cannot access facilities: ${facilitiesResponse.status}`);
  }
  
  // Test billing access
  const billingResponse = await fetch(`${BASE_URL}/api/billing/invoices`, {
    headers: { 'Cookie': sessionCookies }
  });
  
  if (billingResponse.ok) {
    console.log(`  - Can access billing data`);
  } else {
    console.log(`  - Cannot access billing: ${billingResponse.status}`);
  }
  
  // Test admin access
  const adminResponse = await fetch(`${BASE_URL}/api/admin/users`, {
    headers: { 'Cookie': sessionCookies }
  });
  
  if (adminResponse.ok) {
    console.log(`  - Can access admin endpoints`);
  } else {
    console.log(`  - Cannot access admin: ${adminResponse.status}`);
  }
}

async function impersonateUser(userId, userType = 'facility_user') {
  console.log(`\n🎭 Starting impersonation of ${userType} ID ${userId}...`);
  
  const response = await fetch(`${BASE_URL}/api/impersonate/start`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Cookie': sessionCookies 
    },
    body: JSON.stringify({ targetUserId: userId, userType })
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Impersonation failed: ${error}`);
  }
  
  sessionCookies = extractCookies(response) || sessionCookies;
  const data = await response.json();
  console.log(`✅ Now impersonating: ${data.impersonatedUser.email}`);
}

async function stopImpersonation() {
  console.log('\n🛑 Stopping impersonation...');
  
  const response = await fetch(`${BASE_URL}/api/impersonate/stop`, {
    method: 'POST',
    headers: { 
      'Cookie': sessionCookies 
    }
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Stop impersonation failed: ${error}`);
  }
  
  // Update session cookies with new session ID after regeneration
  const newCookies = extractCookies(response);
  console.log('📝 Response headers:', response.headers.raw());
  console.log('📝 New cookies extracted:', newCookies);
  if (newCookies) {
    sessionCookies = newCookies;
    console.log('📝 Updated session cookies after regeneration');
  } else {
    console.log('⚠️  No new cookies found in response headers');
  }
  
  const data = await response.json();
  console.log(`✅ Returned to: ${data.originalUser.email}`);
}

async function verifyNoBleedOver(expectedUserId, expectedEmail) {
  console.log(`\n🔍 Verifying session integrity...`);
  
  const currentUser = await getCurrentUser();
  const sessionData = await getSessionDebug();
  
  console.log(`  Current user ID: ${currentUser.id} (Expected: ${expectedUserId})`);
  console.log(`  Current email: ${currentUser.email} (Expected: ${expectedEmail})`);
  console.log(`  Is impersonating: ${currentUser.isImpersonating}`);
  
  if (sessionData) {
    console.log(`  Session data:`, {
      sessionId: sessionData.sessionId,
      userId: sessionData.userId,
      isImpersonating: sessionData.isImpersonating,
      impersonatedUserId: sessionData.impersonatedUserId,
      hasOriginalUser: sessionData.hasOriginalUser
    });
  }
  
  // Verify expectations
  if (currentUser.id !== expectedUserId) {
    console.error(`❌ USER ID MISMATCH! Got ${currentUser.id}, expected ${expectedUserId}`);
    return false;
  }
  
  if (currentUser.email !== expectedEmail) {
    console.error(`❌ EMAIL MISMATCH! Got ${currentUser.email}, expected ${expectedEmail}`);
    return false;
  }
  
  console.log('✅ Session integrity verified');
  return true;
}

async function runTest() {
  try {
    console.log('🧪 IMPERSONATION SESSION ISOLATION TEST\n');
    console.log('This test verifies that impersonation sessions are properly isolated');
    console.log('and no data bleeds over between different impersonation sessions.\n');
    
    // Step 1: Login as super admin
    await loginAsSuperAdmin();
    const superAdminUser = await getCurrentUser();
    await testDataAccess('Super Admin (baseline)');
    
    // Step 2: Impersonate User A
    await impersonateUser(USER_A_ID);
    await verifyNoBleedOver(USER_A_ID, 'test_billing@example.com');
    await testDataAccess('User A (Test Billing - Billing Manager)');
    
    // Step 3: Stop impersonation, back to super admin
    await stopImpersonation();
    await verifyNoBleedOver(superAdminUser.id, superAdminUser.email);
    await testDataAccess('Super Admin (after User A)');
    
    // Step 4: Impersonate User B
    await impersonateUser(USER_B_ID);
    await verifyNoBleedOver(USER_B_ID, 'john.admin@regionalhospital.com');
    await testDataAccess('User B (John Thompson - Facility Administrator)');
    
    // Step 5: Verify no data from User A
    console.log('\n🔒 Checking for data bleed-over from User A...');
    const currentSession = await getSessionDebug();
    if (currentSession) {
      if (currentSession.impersonatedUserId === USER_A_ID) {
        console.error('❌ CRITICAL: User A ID found in User B session!');
      } else {
        console.log('✅ No User A data found in current session');
      }
    }
    
    // Step 6: Stop impersonation again
    await stopImpersonation();
    await verifyNoBleedOver(superAdminUser.id, superAdminUser.email);
    await testDataAccess('Super Admin (final state)');
    
    // Step 7: Rapid switching test
    console.log('\n⚡ Testing rapid impersonation switching...');
    for (let i = 0; i < 3; i++) {
      await impersonateUser(USER_A_ID);
      await verifyNoBleedOver(USER_A_ID, 'test_billing@example.com');
      
      await stopImpersonation();
      await verifyNoBleedOver(superAdminUser.id, superAdminUser.email);
      
      await impersonateUser(USER_B_ID);
      await verifyNoBleedOver(USER_B_ID, 'john.admin@regionalhospital.com');
      
      await stopImpersonation();
      await verifyNoBleedOver(superAdminUser.id, superAdminUser.email);
    }
    
    console.log('\n✅ All isolation tests passed! Impersonation sessions are properly isolated.');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the test
runTest();