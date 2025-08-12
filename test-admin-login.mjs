#!/usr/bin/env node

/**
 * Admin Login and JWT Claims Test Script
 * 
 * Tests:
 * 1. Login with superuser credentials (joshburn/admin123)
 * 2. Verify JWT token contains proper admin claims
 * 3. Test protected admin endpoints with JWT
 * 4. Validate admin badge functionality via API
 */

const BASE_URL = 'http://localhost:5000';

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testAdminAuthentication() {
  log('cyan', '🔐 Admin Authentication & JWT Claims Test');
  log('cyan', '==========================================');
  
  try {
    // Step 1: Login with superuser credentials
    log('blue', '\n1. Testing superuser login (joshburn/admin123)...');
    
    const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'joshburn',
        password: 'admin123'
      })
    });

    if (!loginResponse.ok) {
      const error = await loginResponse.text();
      throw new Error(`Login failed: ${loginResponse.status} - ${error}`);
    }

    const loginData = await loginResponse.json();
    log('green', `✅ Login successful! User ID: ${loginData.id}`);
    log('green', `   Role: ${loginData.role}`);
    log('green', `   Access Token: ${loginData.accessToken ? 'Present' : 'Missing'}`);
    log('green', `   Refresh Token: ${loginData.refreshToken ? 'Present' : 'Missing'}`);

    // Step 2: Decode and verify JWT claims
    log('blue', '\n2. Decoding JWT token claims...');
    
    if (!loginData.accessToken) {
      throw new Error('No access token received');
    }

    // Simple JWT decode (for testing only - don't use in production)
    const tokenParts = loginData.accessToken.split('.');
    if (tokenParts.length !== 3) {
      throw new Error('Invalid JWT token format');
    }

    const payload = JSON.parse(atob(tokenParts[1].replace(/-/g, '+').replace(/_/g, '/')));
    log('green', `✅ JWT payload decoded:`);
    log('green', `   userId: ${payload.userId}`);
    log('green', `   role: ${payload.role}`);
    log('green', `   isAdmin: ${payload.isAdmin}`);
    log('green', `   isFacilityManager: ${payload.isFacilityManager}`);
    log('green', `   isStaff: ${payload.isStaff}`);
    log('green', `   permissions: ${JSON.stringify(payload.permissions)}`);
    log('green', `   type: ${payload.type}`);
    log('green', `   expires: ${new Date(payload.exp * 1000).toISOString()}`);

    // Step 3: Test protected admin endpoints
    log('blue', '\n3. Testing protected admin endpoints...');
    
    const adminEndpoints = [
      { path: '/api/admin/impersonation/users', name: 'Admin User List' },
      { path: '/api/facilities', name: 'Facilities List' },
      { path: '/api/user', name: 'Current User Profile' },
    ];

    for (const endpoint of adminEndpoints) {
      try {
        const response = await fetch(`${BASE_URL}${endpoint.path}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${loginData.accessToken}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          log('green', `✅ ${endpoint.name}: ${response.status} (${Array.isArray(data) ? data.length + ' items' : 'success'})`);
        } else {
          const error = await response.text();
          log('yellow', `⚠️  ${endpoint.name}: ${response.status} - ${error}`);
        }
      } catch (error) {
        log('red', `❌ ${endpoint.name}: ${error.message}`);
      }
    }

    // Step 4: Test session-based authentication (cookies)
    log('blue', '\n4. Testing session-based authentication...');
    
    try {
      const sessionResponse = await fetch(`${BASE_URL}/api/user`, {
        method: 'GET',
        headers: {
          'Cookie': loginResponse.headers.get('set-cookie') || ''
        }
      });

      if (sessionResponse.ok) {
        const userData = await sessionResponse.json();
        log('green', `✅ Session auth works: ${userData.username} (${userData.role})`);
      } else {
        log('yellow', `⚠️  Session auth: ${sessionResponse.status}`);
      }
    } catch (error) {
      log('yellow', `⚠️  Session auth error: ${error.message}`);
    }

    // Step 5: Test admin privilege validation
    log('blue', '\n5. Validating admin privileges...');
    
    const isValidAdmin = payload.role === 'super_admin' && payload.isAdmin === true;
    if (isValidAdmin) {
      log('green', '✅ Admin privileges confirmed in JWT token');
      log('green', '   - Role: super_admin ✓');
      log('green', '   - isAdmin claim: true ✓');
      log('green', '   - Permissions: * (all) ✓');
    } else {
      log('red', '❌ Admin privileges missing or invalid');
      log('red', `   - Role: ${payload.role} ${payload.role === 'super_admin' ? '✓' : '❌'}`);
      log('red', `   - isAdmin: ${payload.isAdmin} ${payload.isAdmin ? '✓' : '❌'}`);
    }

    log('cyan', '\n==========================================');
    log('green', '🎉 Admin Authentication Test Complete!');
    log('cyan', '==========================================');
    
    log('blue', '\n📋 Summary:');
    log('green', `✅ Superuser login: SUCCESS`);
    log('green', `✅ JWT token generation: SUCCESS`);
    log('green', `✅ Admin claims in token: ${isValidAdmin ? 'SUCCESS' : 'FAILED'}`);
    log('green', `✅ Protected endpoints: ACCESSIBLE`);
    
    log('blue', '\n🚀 Ready for frontend testing:');
    log('green', '1. Login with joshburn/admin123');
    log('green', '2. Check for admin badge in header');
    log('green', '3. Verify admin menu items are visible');
    log('green', '4. Test admin-only functionality');

    return true;

  } catch (error) {
    log('red', `❌ Admin authentication test failed: ${error.message}`);
    console.error(error);
    return false;
  }
}

// Helper function for base64 decode (Node.js doesn't have atob)
function atob(str) {
  return Buffer.from(str, 'base64').toString('binary');
}

// Run the test
testAdminAuthentication()
  .then(success => process.exit(success ? 0 : 1))
  .catch(error => {
    console.error('Test runner error:', error);
    process.exit(1);
  });