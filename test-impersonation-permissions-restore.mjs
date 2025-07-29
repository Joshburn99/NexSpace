#!/usr/bin/env node

/**
 * Test Script: Verify Permissions Restoration After Impersonation
 * 
 * This test ensures that when a superuser stops impersonating another user,
 * their original superuser permissions are fully restored.
 * 
 * Test Flow:
 * 1. Login as superuser
 * 2. Verify superuser can access admin-only endpoints
 * 3. Start impersonating a limited user
 * 4. Verify the limited user CANNOT access admin-only endpoints
 * 5. Stop impersonation
 * 6. Verify superuser permissions are fully restored
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';
const SUPER_ADMIN = { username: 'joshburn', password: 'admin123' };

// Limited user to impersonate (HR manager with no admin rights)
const LIMITED_USER_ID = 10;  // linda.hr@generalhospital.com

let sessionCookies = '';

function extractCookies(response) {
  const setCookieHeaders = response.headers.raw()['set-cookie'] || [];
  const cookies = setCookieHeaders
    .map(header => header.split(';')[0])
    .join('; ');
  return cookies;
}

async function loginAsSuperAdmin() {
  console.log('🔐 Logging in as super admin...');
  const response = await fetch(`${BASE_URL}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(SUPER_ADMIN),
  });

  if (!response.ok) {
    throw new Error(`Login failed: ${response.status}`);
  }

  sessionCookies = extractCookies(response);
  const data = await response.json();
  console.log(`✅ Logged in as superuser successfully\n`);
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

async function testSuperuserAccess() {
  console.log('🔒 Testing superuser-only endpoints...');
  
  // Test 1: Security Audit endpoint (requireSuperAdmin)
  const auditResponse = await fetch(`${BASE_URL}/api/security/audit`, {
    headers: { 'Cookie': sessionCookies }
  });
  console.log(`  - Security Audit endpoint: ${auditResponse.status} ${auditResponse.status === 200 ? '✅' : '❌'}`);
  
  // Test 2: Security Quick Check endpoint (requireSuperAdmin)
  const quickCheckResponse = await fetch(`${BASE_URL}/api/security/quick-check`, {
    headers: { 'Cookie': sessionCookies }
  });
  console.log(`  - Security Quick Check endpoint: ${quickCheckResponse.status} ${quickCheckResponse.status === 200 ? '✅' : '❌'}`);
  
  // Test 3: Analytics Events endpoint (super_admin check)
  const analyticsResponse = await fetch(`${BASE_URL}/api/analytics/events`, {
    headers: { 'Cookie': sessionCookies }
  });
  console.log(`  - Analytics Events endpoint: ${analyticsResponse.status} ${analyticsResponse.status === 200 ? '✅' : '❌'}`);
  
  return {
    audit: auditResponse.status === 200,
    quickCheck: quickCheckResponse.status === 200,
    analytics: analyticsResponse.status === 200
  };
}

async function startImpersonation(userId, userType = 'facility_user') {
  console.log(`\n🎭 Starting impersonation of ${userType} ID ${userId}...`);
  const response = await fetch(`${BASE_URL}/api/impersonate/start`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': sessionCookies
    },
    body: JSON.stringify({ targetUserId: userId, userType }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Start impersonation failed: ${error}`);
  }

  sessionCookies = extractCookies(response) || sessionCookies;
  const data = await response.json();
  console.log(`✅ Now impersonating: ${data.impersonatedUser.email} (${data.impersonatedUser.role})`);
}

async function stopImpersonation() {
  console.log('\n🛑 Stopping impersonation...');
  const response = await fetch(`${BASE_URL}/api/impersonate/stop`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': sessionCookies
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Stop impersonation failed: ${error}`);
  }
  
  // Update session cookies with new session ID after regeneration
  const newCookies = extractCookies(response);
  if (newCookies) {
    sessionCookies = newCookies;
    console.log('📝 Updated session cookies after regeneration');
  }
  
  const data = await response.json();
  console.log(`✅ Returned to: ${data.originalUser.email}`);
}

async function runTest() {
  try {
    console.log('🧪 IMPERSONATION PERMISSION RESTORATION TEST');
    console.log('Testing that superuser permissions are fully restored after impersonation\n');
    
    // Step 1: Login as superuser
    await loginAsSuperAdmin();
    
    // Step 2: Verify current user and test superuser access
    const initialUser = await getCurrentUser();
    console.log(`📊 Initial user: ${initialUser.email} (Role: ${initialUser.role})`);
    
    console.log('\n🔍 BASELINE TEST: Superuser permissions before impersonation');
    const baselineAccess = await testSuperuserAccess();
    
    if (!baselineAccess.audit || !baselineAccess.quickCheck || !baselineAccess.analytics) {
      throw new Error('Superuser should have access to all admin endpoints!');
    }
    console.log('✅ All superuser endpoints accessible\n');
    
    // Step 3: Start impersonating a limited user
    await startImpersonation(LIMITED_USER_ID);
    
    // Step 4: Verify impersonated user and test access
    const impersonatedUser = await getCurrentUser();
    console.log(`\n📊 Impersonated user: ${impersonatedUser.email} (Role: ${impersonatedUser.role})`);
    
    console.log('\n🔍 DURING IMPERSONATION: Testing permissions as limited user');
    const limitedAccess = await testSuperuserAccess();
    
    if (limitedAccess.audit || limitedAccess.quickCheck || limitedAccess.analytics) {
      throw new Error('Limited user should NOT have access to admin endpoints!');
    }
    console.log('✅ All superuser endpoints properly blocked for limited user');
    
    // Step 5: Stop impersonation
    await stopImpersonation();
    
    // Step 6: Verify we're back as superuser and test access again
    const restoredUser = await getCurrentUser();
    console.log(`\n📊 Restored user: ${restoredUser.email} (Role: ${restoredUser.role})`);
    
    if (restoredUser.role !== 'super_admin') {
      throw new Error(`User role not restored! Expected 'super_admin', got '${restoredUser.role}'`);
    }
    
    console.log('\n🔍 AFTER IMPERSONATION: Testing restored superuser permissions');
    const restoredAccess = await testSuperuserAccess();
    
    if (!restoredAccess.audit || !restoredAccess.quickCheck || !restoredAccess.analytics) {
      console.error('❌ CRITICAL: Superuser permissions NOT fully restored!');
      console.error('Access results:', restoredAccess);
      throw new Error('Superuser permissions were not fully restored after ending impersonation!');
    }
    
    console.log('✅ All superuser endpoints accessible again');
    
    // Additional verification: Check impersonation flags
    if (restoredUser.isImpersonating) {
      throw new Error('User still marked as impersonating after stop!');
    }
    
    console.log('\n✅ SUCCESS: All permissions fully restored after impersonation!');
    console.log('The impersonation teardown logic correctly restores original user capabilities.');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run the test
runTest();