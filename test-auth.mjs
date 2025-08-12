#!/usr/bin/env node
/**
 * Authentication and Authorization Test Suite
 * Tests for 401 (unauthenticated), 403 (unauthorized), and successful authorized requests
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logTest(name) {
  console.log(`\n${colors.cyan}━━━ ${name} ━━━${colors.reset}`);
}

function logResult(passed, message) {
  const symbol = passed ? '✓' : '✗';
  const color = passed ? colors.green : colors.red;
  log(`${symbol} ${message}`, color);
}

// Test helper functions
async function makeRequest(endpoint, options = {}) {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
    
    const data = response.headers.get('content-type')?.includes('application/json')
      ? await response.json()
      : await response.text();
    
    return { 
      status: response.status, 
      data,
      headers: Object.fromEntries(response.headers.entries())
    };
  } catch (error) {
    return { 
      status: 0, 
      error: error.message 
    };
  }
}

// Test scenarios
async function runTests() {
  log('\n🔐 AUTHENTICATION & AUTHORIZATION TEST SUITE', colors.magenta);
  log('==========================================', colors.magenta);
  
  let accessToken = null;
  let refreshToken = null;
  
  // Test 1: Unauthenticated request (should return 401)
  logTest('Test 1: Unauthenticated Request');
  {
    const result = await makeRequest('/api/facilities');
    logResult(
      result.status === 401,
      `GET /api/facilities without auth: ${result.status} ${
        result.status === 401 ? '(Expected 401)' : `(Expected 401, got ${result.status})`
      }`
    );
    if (result.data?.code) {
      log(`  Response code: ${result.data.code}`, colors.blue);
    }
  }
  
  // Test 2: Login with invalid credentials (should return 401)
  logTest('Test 2: Invalid Login Credentials');
  {
    const result = await makeRequest('/api/login', {
      method: 'POST',
      body: JSON.stringify({
        username: 'invalid_user',
        password: 'wrong_password'
      })
    });
    logResult(
      result.status === 401,
      `POST /api/login with invalid credentials: ${result.status} ${
        result.status === 401 ? '(Expected 401)' : `(Expected 401, got ${result.status})`
      }`
    );
  }
  
  // Test 3: Login with valid credentials
  logTest('Test 3: Valid Login');
  {
    const result = await makeRequest('/api/login', {
      method: 'POST',
      body: JSON.stringify({
        username: 'joshburn',
        password: 'admin123'
      })
    });
    logResult(
      result.status === 200,
      `POST /api/login with valid credentials: ${result.status} ${
        result.status === 200 ? '(Success)' : `(Expected 200, got ${result.status})`
      }`
    );
    
    if (result.status === 200) {
      accessToken = result.data.accessToken;
      refreshToken = result.data.refreshToken;
      log(`  User: ${result.data.username} (${result.data.role})`, colors.blue);
      log(`  Access Token: ${accessToken ? accessToken.substring(0, 20) + '...' : 'Not provided'}`, colors.blue);
      log(`  Refresh Token: ${refreshToken ? refreshToken.substring(0, 20) + '...' : 'Not provided'}`, colors.blue);
    }
  }
  
  // Test 4: Authenticated request with valid token
  logTest('Test 4: Authenticated Request');
  if (accessToken) {
    const result = await makeRequest('/api/facilities', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    logResult(
      result.status === 200,
      `GET /api/facilities with valid token: ${result.status} ${
        result.status === 200 ? '(Success)' : `(Expected 200, got ${result.status})`
      }`
    );
    if (result.status === 200 && Array.isArray(result.data)) {
      log(`  Facilities count: ${result.data.length}`, colors.blue);
    }
  } else {
    log('⚠ Skipping - No access token available', colors.yellow);
  }
  
  // Test 5: Create manager user for authorization tests
  logTest('Test 5: Create Test Users');
  let managerToken = null;
  let staffToken = null;
  
  // Create a facility manager
  {
    const result = await makeRequest('/api/register', {
      method: 'POST',
      body: JSON.stringify({
        username: 'testmanager',
        password: 'manager123',
        email: 'manager@test.com',
        firstName: 'Test',
        lastName: 'Manager',
        role: 'facility_manager'
      })
    });
    
    if (result.status === 201 || result.status === 200) {
      log('  ✓ Created facility manager user', colors.green);
      
      // Login as manager
      const loginResult = await makeRequest('/api/login', {
        method: 'POST',
        body: JSON.stringify({
          username: 'testmanager',
          password: 'manager123'
        })
      });
      
      if (loginResult.status === 200) {
        managerToken = loginResult.data.accessToken;
        log('  ✓ Logged in as facility manager', colors.green);
      }
    }
  }
  
  // Create a staff member
  {
    const result = await makeRequest('/api/register', {
      method: 'POST',
      body: JSON.stringify({
        username: 'teststaff',
        password: 'staff123',
        email: 'staff@test.com',
        firstName: 'Test',
        lastName: 'Staff',
        role: 'internal_employee'
      })
    });
    
    if (result.status === 201 || result.status === 200) {
      log('  ✓ Created staff user', colors.green);
      
      // Login as staff
      const loginResult = await makeRequest('/api/login', {
        method: 'POST',
        body: JSON.stringify({
          username: 'teststaff',
          password: 'staff123'
        })
      });
      
      if (loginResult.status === 200) {
        staffToken = loginResult.data.accessToken;
        log('  ✓ Logged in as staff', colors.green);
      }
    }
  }
  
  // Test 6: Authorization - Staff trying to create facility (should return 403)
  logTest('Test 6: Unauthorized Request (Staff → Create Facility)');
  if (staffToken) {
    const result = await makeRequest('/api/facilities', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${staffToken}`
      },
      body: JSON.stringify({
        name: 'Test Facility',
        type: 'hospital',
        address: '123 Test St',
        city: 'Test City',
        state: 'TS',
        zipCode: '12345',
        phone: '555-1234',
        email: 'test@facility.com'
      })
    });
    logResult(
      result.status === 403,
      `POST /api/facilities as staff: ${result.status} ${
        result.status === 403 ? '(Expected 403)' : `(Expected 403, got ${result.status})`
      }`
    );
    if (result.data?.code) {
      log(`  Response code: ${result.data.code}`, colors.blue);
      log(`  Required roles: ${result.data.requiredRoles?.join(', ')}`, colors.blue);
    }
  } else {
    log('⚠ Skipping - No staff token available', colors.yellow);
  }
  
  // Test 7: Manager with partial permissions
  logTest('Test 7: Partial Authorization (Manager → View Facilities)');
  if (managerToken) {
    const result = await makeRequest('/api/facilities', {
      headers: {
        'Authorization': `Bearer ${managerToken}`
      }
    });
    const expectedStatus = result.status === 200 || result.status === 403;
    logResult(
      expectedStatus,
      `GET /api/facilities as manager: ${result.status} ${
        result.status === 200 ? '(Has permission)' : '(No permission)'
      }`
    );
  } else {
    log('⚠ Skipping - No manager token available', colors.yellow);
  }
  
  // Test 8: Token refresh
  logTest('Test 8: Token Refresh');
  if (refreshToken) {
    const result = await makeRequest('/api/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({
        refreshToken: refreshToken
      })
    });
    logResult(
      result.status === 200,
      `POST /api/auth/refresh: ${result.status} ${
        result.status === 200 ? '(Success)' : `(Expected 200, got ${result.status})`
      }`
    );
    if (result.status === 200) {
      log(`  New Access Token: ${result.data.accessToken ? result.data.accessToken.substring(0, 20) + '...' : 'Not provided'}`, colors.blue);
    }
  } else {
    log('⚠ Skipping - No refresh token available', colors.yellow);
  }
  
  // Test 9: Invalid/Expired token
  logTest('Test 9: Invalid Token');
  {
    const result = await makeRequest('/api/facilities', {
      headers: {
        'Authorization': 'Bearer invalid.token.here'
      }
    });
    logResult(
      result.status === 401,
      `GET /api/facilities with invalid token: ${result.status} ${
        result.status === 401 ? '(Expected 401)' : `(Expected 401, got ${result.status})`
      }`
    );
    if (result.data?.code) {
      log(`  Response code: ${result.data.code}`, colors.blue);
    }
  }
  
  // Test 10: Logout
  logTest('Test 10: Logout');
  {
    const result = await makeRequest('/api/logout', {
      method: 'POST'
    });
    logResult(
      result.status === 200,
      `POST /api/logout: ${result.status} ${
        result.status === 200 ? '(Success)' : `(Expected 200, got ${result.status})`
      }`
    );
  }
  
  // Summary
  console.log(`\n${colors.magenta}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  log('TEST SUITE COMPLETE', colors.magenta);
  log('\nCURL EXAMPLES:', colors.cyan);
  
  // Provide curl examples
  console.log('\n1. Login:');
  console.log(`curl -X POST ${BASE_URL}/api/login \\
  -H "Content-Type: application/json" \\
  -d '{"username":"joshburn","password":"admin123"}'`);
  
  console.log('\n2. Authenticated Request:');
  console.log(`curl ${BASE_URL}/api/facilities \\
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"`);
  
  console.log('\n3. Refresh Token:');
  console.log(`curl -X POST ${BASE_URL}/api/auth/refresh \\
  -H "Content-Type: application/json" \\
  -d '{"refreshToken":"YOUR_REFRESH_TOKEN"}'`);
  
  console.log('\n4. Create Resource (Admin Only):');
  console.log(`curl -X POST ${BASE_URL}/api/facilities \\
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "New Facility",
    "type": "hospital",
    "address": "123 Main St",
    "city": "City",
    "state": "ST",
    "zipCode": "12345",
    "phone": "555-1234",
    "email": "facility@example.com"
  }'`);
  
  log('\nFETCH EXAMPLES:', colors.cyan);
  
  console.log('\n1. Login with Fetch:');
  console.log(`fetch('${BASE_URL}/api/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'joshburn',
    password: 'admin123'
  })
})
.then(res => res.json())
.then(data => {
  console.log('Access Token:', data.accessToken);
  localStorage.setItem('token', data.accessToken);
});`);
  
  console.log('\n2. Authenticated Fetch:');
  console.log(`fetch('${BASE_URL}/api/facilities', {
  headers: {
    'Authorization': \`Bearer \${localStorage.getItem('token')}\`
  }
})
.then(res => {
  if (res.status === 401) throw new Error('Unauthenticated');
  if (res.status === 403) throw new Error('Unauthorized');
  return res.json();
})
.then(data => console.log('Facilities:', data))
.catch(err => console.error('Error:', err));`);
}

// Run the tests
runTests().catch(error => {
  log(`\n❌ Test suite failed: ${error.message}`, colors.red);
  process.exit(1);
});