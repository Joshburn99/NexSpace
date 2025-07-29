import fetch from 'node-fetch';
import fs from 'fs';

const baseUrl = 'http://localhost:5000';
let cookies = '';

// Helper function to extract cookies from response
function extractCookies(response) {
  const setCookieHeaders = response.headers.raw()['set-cookie'] || [];
  const newCookies = setCookieHeaders.map(cookie => cookie.split(';')[0]).join('; ');
  if (newCookies) {
    cookies = newCookies;
  }
}

async function test() {
  try {
    console.log('=== Testing Impersonation Persistence ===\n');

    // Step 1: Login as super admin
    console.log('1. Logging in as super admin...');
    const loginResponse = await fetch(`${baseUrl}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'joshburn@nexspace.com',
        password: 'password123'
      })
    });
    
    extractCookies(loginResponse);
    
    if (!loginResponse.ok) {
      console.error('Login failed:', loginResponse.status, loginResponse.statusText);
      return;
    }
    
    const loginData = await loginResponse.json();
    console.log('Login response:', loginData);
    console.log('Login successful:', loginData.user?.email || loginData.email || 'Unknown user');
    console.log('Cookies:', cookies);

    // Step 2: Check current user before impersonation
    console.log('\n2. Checking current user...');
    const userBeforeResponse = await fetch(`${baseUrl}/api/user`, {
      headers: { 'Cookie': cookies }
    });
    const userBefore = await userBeforeResponse.json();
    console.log('Current user:', {
      id: userBefore.id,
      email: userBefore.email,
      role: userBefore.role,
      isImpersonating: userBefore.isImpersonating
    });

    // Step 3: Start impersonation of a facility user
    console.log('\n3. Starting impersonation of facility user...');
    const impersonateResponse = await fetch(`${baseUrl}/api/impersonate/start`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': cookies 
      },
      body: JSON.stringify({
        targetUserId: 11, // karen.brown@nexspacecorp.com - supervisor
        userType: 'facility_user'
      })
    });
    
    extractCookies(impersonateResponse);
    const impersonateData = await impersonateResponse.json();
    console.log('Impersonation response:', {
      message: impersonateData.message,
      impersonatedUser: impersonateData.impersonatedUser?.email,
      originalUser: impersonateData.originalUser?.email
    });

    // Step 4: Check current user immediately after impersonation
    console.log('\n4. Checking user immediately after impersonation...');
    const userAfterResponse = await fetch(`${baseUrl}/api/user`, {
      headers: { 'Cookie': cookies }
    });
    const userAfter = await userAfterResponse.json();
    console.log('Current user after impersonation:', {
      id: userAfter.id,
      email: userAfter.email,
      role: userAfter.role,
      isImpersonating: userAfter.isImpersonating,
      originalUserId: userAfter.originalUserId,
      permissions: userAfter.permissions?.slice(0, 3) + '...' // Show first 3 permissions
    });

    // Step 5: Simulate page refresh by making a new request
    console.log('\n5. Simulating page refresh (new request with same cookies)...');
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
    
    const userRefreshResponse = await fetch(`${baseUrl}/api/user`, {
      headers: { 'Cookie': cookies }
    });
    const userRefresh = await userRefreshResponse.json();
    console.log('User after refresh:', {
      id: userRefresh.id,
      email: userRefresh.email,
      role: userRefresh.role,
      isImpersonating: userRefresh.isImpersonating,
      originalUserId: userRefresh.originalUserId,
      permissions: userRefresh.permissions?.slice(0, 3) + '...'
    });

    // Step 6: Check session debug endpoint
    console.log('\n6. Checking session debug info...');
    const sessionDebugResponse = await fetch(`${baseUrl}/api/debug/session`, {
      headers: { 'Cookie': cookies }
    });
    const sessionDebug = await sessionDebugResponse.json();
    console.log('Session debug info:', JSON.stringify(sessionDebug, null, 2));

    // Step 7: Test protected endpoint with impersonated permissions
    console.log('\n7. Testing protected endpoint (billing data)...');
    const billingResponse = await fetch(`${baseUrl}/api/billing/invoices`, {
      headers: { 'Cookie': cookies }
    });
    console.log('Billing endpoint status:', billingResponse.status);
    if (billingResponse.status === 403) {
      const errorData = await billingResponse.json();
      console.log('Access denied:', errorData.message);
    } else if (billingResponse.ok) {
      console.log('Access granted to billing data');
    }

    // Step 8: Stop impersonation
    console.log('\n8. Stopping impersonation...');
    const stopResponse = await fetch(`${baseUrl}/api/impersonate/stop`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': cookies 
      }
    });
    
    if (stopResponse.ok) {
      const stopData = await stopResponse.json();
      console.log('Impersonation stopped:', stopData.message);
    }

    // Step 9: Check user after stopping impersonation
    console.log('\n9. Checking user after stopping impersonation...');
    const userFinalResponse = await fetch(`${baseUrl}/api/user`, {
      headers: { 'Cookie': cookies }
    });
    const userFinal = await userFinalResponse.json();
    console.log('Final user state:', {
      id: userFinal.id,
      email: userFinal.email,
      role: userFinal.role,
      isImpersonating: userFinal.isImpersonating
    });

    console.log('\n=== Test Complete ===');
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

test();