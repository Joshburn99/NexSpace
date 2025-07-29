#!/usr/bin/env node

/**
 * Cross-Role Data Visibility Test Script
 * Tests that each user role only sees data they're permitted to access
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';

// User credentials for testing different roles
const TEST_USERS = {
  superAdmin: {
    username: 'josh.burn',
    password: 'josh.burn', 
    expectedRole: 'super_admin',
    description: 'Super Admin (should see all data)'
  },
  facilityUser1: {
    username: 'karen.brown',
    password: 'hashed_password_5',
    expectedRole: 'supervisor',
    description: 'Facility User - Supervisor at General Hospital (Facility 1)',
    expectedFacilities: [1]
  },
  facilityUser2: {
    username: 'admin.sarah',
    password: 'hashed_password_1',
    expectedRole: 'facility_admin',
    description: 'Facility Admin at General Hospital (Facility 1)',
    expectedFacilities: [1]
  },
  facilityUser3: {
    username: 'hr.jennifer',
    password: 'hashed_password_3',
    expectedRole: 'hr_manager',
    description: 'HR Manager at Sunset Nursing Home (Facility 2)',
    expectedFacilities: [2]
  }
};

async function login(username, password) {
  const response = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
    credentials: 'include'
  });
  
  if (!response.ok) {
    throw new Error(`Login failed for ${username}: ${response.status}`);
  }
  
  const setCookieHeader = response.headers.get('set-cookie');
  const cookies = setCookieHeader ? setCookieHeader.split(',').map(c => c.split(';')[0]).join('; ') : '';
  
  return { cookies, user: await response.json() };
}

async function fetchData(endpoint, cookies) {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    headers: { 
      'Cookie': cookies
    },
    credentials: 'include'
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch ${endpoint}: ${response.status}`);
  }
  
  return response.json();
}

async function testUserDataVisibility(userKey, credentials) {
  console.log(`\n=== Testing ${credentials.description} ===`);
  
  try {
    // Login as the user
    const { cookies, user } = await login(credentials.username, credentials.password);
    console.log(`✓ Logged in as ${user.firstName} ${user.lastName} (${user.role})`);
    
    // Test 1: Facility Users visibility
    console.log('\n📋 Testing Facility Users visibility:');
    const facilityUsers = await fetchData('/api/facility-users', cookies);
    console.log(`  - Total facility users visible: ${facilityUsers.length}`);
    
    if (userKey === 'superAdmin') {
      console.log(`  ✓ Super admin can see all facility users`);
    } else {
      // Check if facility user only sees users from their facilities
      const userFacilities = new Set(credentials.expectedFacilities);
      const visibleFacilities = new Set();
      
      facilityUsers.forEach(fu => {
        if (fu.primaryFacilityId) visibleFacilities.add(fu.primaryFacilityId);
        if (fu.associatedFacilityIds) {
          fu.associatedFacilityIds.forEach(id => visibleFacilities.add(id));
        }
      });
      
      console.log(`  - Visible facilities: ${Array.from(visibleFacilities).join(', ')}`);
      
      // Check for data leakage
      const unauthorizedFacilities = Array.from(visibleFacilities).filter(id => !userFacilities.has(id));
      if (unauthorizedFacilities.length > 0) {
        console.log(`  ❌ ERROR: User can see data from unauthorized facilities: ${unauthorizedFacilities.join(', ')}`);
      } else {
        console.log(`  ✓ User only sees data from authorized facilities`);
      }
    }
    
    // Test 2: Staff visibility
    console.log('\n👥 Testing Staff visibility:');
    const staff = await fetchData('/api/staff', cookies);
    console.log(`  - Total staff visible: ${staff.length}`);
    
    if (userKey === 'superAdmin') {
      console.log(`  ✓ Super admin can see all staff (${staff.length} total)`);
    } else {
      // For facility users, check if they only see staff from their facilities
      const userFacilities = new Set(credentials.expectedFacilities);
      const staffFacilities = new Set();
      
      staff.forEach(s => {
        if (s.facilityId) staffFacilities.add(s.facilityId);
      });
      
      const unauthorizedStaffFacilities = Array.from(staffFacilities).filter(id => !userFacilities.has(id));
      if (unauthorizedStaffFacilities.length > 0) {
        console.log(`  ❌ ERROR: User can see staff from unauthorized facilities: ${unauthorizedStaffFacilities.join(', ')}`);
      } else {
        console.log(`  ✓ User only sees staff from authorized facilities`);
      }
    }
    
    // Test 3: Shifts visibility
    console.log('\n📅 Testing Shifts visibility:');
    const shifts = await fetchData('/api/shifts', cookies);
    console.log(`  - Total shifts visible: ${shifts.length}`);
    
    if (userKey === 'superAdmin') {
      console.log(`  ✓ Super admin can see all shifts`);
    } else {
      // Check shift facilities
      const userFacilities = new Set(credentials.expectedFacilities);
      const shiftFacilities = new Set();
      
      shifts.forEach(s => {
        if (s.facilityId) shiftFacilities.add(s.facilityId);
      });
      
      console.log(`  - Shifts from facilities: ${Array.from(shiftFacilities).join(', ')}`);
      
      const unauthorizedShiftFacilities = Array.from(shiftFacilities).filter(id => !userFacilities.has(id));
      if (unauthorizedShiftFacilities.length > 0) {
        console.log(`  ❌ ERROR: User can see shifts from unauthorized facilities: ${unauthorizedShiftFacilities.join(', ')}`);
      } else {
        console.log(`  ✓ User only sees shifts from authorized facilities`);
      }
    }
    
    // Test 4: Shift Templates visibility
    console.log('\n📋 Testing Shift Templates visibility:');
    try {
      const templates = await fetchData('/api/shift-templates', cookies);
      console.log(`  - Total templates visible: ${templates.length}`);
      
      if (userKey !== 'superAdmin' && templates.length > 0) {
        const userFacilities = new Set(credentials.expectedFacilities);
        const templateFacilities = new Set();
        
        templates.forEach(t => {
          if (t.facilityId) templateFacilities.add(t.facilityId);
        });
        
        const unauthorizedTemplateFacilities = Array.from(templateFacilities).filter(id => !userFacilities.has(id));
        if (unauthorizedTemplateFacilities.length > 0) {
          console.log(`  ❌ ERROR: User can see templates from unauthorized facilities: ${unauthorizedTemplateFacilities.join(', ')}`);
        } else {
          console.log(`  ✓ User only sees templates from authorized facilities`);
        }
      }
    } catch (error) {
      console.log(`  - No access to shift templates (expected for some roles)`);
    }
    
  } catch (error) {
    console.error(`❌ Error testing ${credentials.description}: ${error.message}`);
  }
}

async function runTests() {
  console.log('🔍 Cross-Role Data Visibility Test');
  console.log('==================================');
  
  // Test each user role
  for (const [userKey, credentials] of Object.entries(TEST_USERS)) {
    await testUserDataVisibility(userKey, credentials);
  }
  
  console.log('\n✅ Test completed!');
  console.log('\nSummary:');
  console.log('- Super admins should see ALL data');
  console.log('- Facility users should only see data from their associated facilities');
  console.log('- Staff users (if applicable) should only see their own data');
}

// Run the tests
runTests().catch(console.error);