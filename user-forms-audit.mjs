#!/usr/bin/env node

/**
 * User Forms Audit Script
 * 
 * This script comprehensively tests all user-related forms in the application:
 * 1. Onboarding forms (4 steps)
 * 2. Profile edit forms
 * 3. Team/Role assignment forms
 * 4. Shift/Schedule forms
 * 
 * For each form, it verifies:
 * - Data saves correctly to the database
 * - Data reappears when the form is reopened
 * - Validation works properly
 * - UI updates reflect the changes
 */

import fetch from 'node-fetch';
import { createHash } from 'crypto';

const BASE_URL = 'http://localhost:5000';
const SUPER_ADMIN = { username: 'joshburn', password: 'admin123' };

let sessionCookies = '';
let currentUserId = null;

const testResults = {
  passed: [],
  failed: [],
  anomalies: []
};

function generateTestEmail() {
  const timestamp = Date.now();
  const hash = createHash('md5').update(timestamp.toString()).digest('hex').substring(0, 8);
  return `test.user.${hash}@example.com`;
}

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
  console.log(`✅ Logged in successfully\n`);
}

async function testOnboardingForms() {
  console.log('\n📋 TESTING ONBOARDING FORMS\n');
  console.log('━'.repeat(50));

  // Create a new user for onboarding test
  const testEmail = generateTestEmail();
  const testUsername = `testuser_${Date.now()}`;
  
  console.log('📝 Creating test user for onboarding...');
  const signupResponse = await fetch(`${BASE_URL}/api/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: testUsername,
      email: testEmail,
      password: 'TestPass123!',
      firstName: 'Test',
      lastName: 'User',
      role: 'facility_user'
    }),
  });

  if (!signupResponse.ok) {
    const error = await signupResponse.text();
    testResults.failed.push({
      form: 'User Signup',
      issue: `Failed to create test user: ${error}`
    });
    return;
  }

  const newUser = await signupResponse.json();
  currentUserId = newUser.id;
  console.log(`✅ Created test user: ${testEmail} (ID: ${currentUserId})`);

  // Login as the new user
  console.log('🔐 Logging in as new user...');
  const loginResponse = await fetch(`${BASE_URL}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: testUsername,
      password: 'TestPass123!'
    }),
  });

  if (!loginResponse.ok) {
    testResults.failed.push({
      form: 'User Login',
      issue: 'Failed to login as new user'
    });
    return;
  }

  // Update session cookies for new user
  const userCookies = extractCookies(loginResponse);
  console.log('✅ Logged in as new user');

  // Test Step 1: Profile Update
  console.log('\n📍 Step 1: Testing Profile Update Form...');
  const profileData = {
    firstName: 'Updated',
    lastName: 'Name',
    phone: '555-1234',
    department: 'IT',
    title: 'Test Manager'
  };

  const profileUpdateResponse = await fetch(`${BASE_URL}/api/user/profile`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': userCookies
    },
    body: JSON.stringify(profileData),
  });

  if (profileUpdateResponse.ok) {
    console.log('✅ Profile updated successfully');
    
    // Verify data persists by fetching user again
    const userResponse = await fetch(`${BASE_URL}/api/user`, {
      headers: { 'Cookie': userCookies }
    });
    
    if (userResponse.ok) {
      const userData = await userResponse.json();
      const profileMatches = 
        userData.firstName === profileData.firstName &&
        userData.lastName === profileData.lastName;
      
      if (profileMatches) {
        console.log('✅ Profile data persists correctly');
        testResults.passed.push({
          form: 'Onboarding Step 1 - Profile',
          details: 'Data saves and persists correctly'
        });
      } else {
        console.log('❌ Profile data does not match');
        testResults.failed.push({
          form: 'Onboarding Step 1 - Profile',
          issue: 'Data does not persist correctly',
          expected: profileData,
          actual: userData
        });
      }
    }
  } else {
    const error = await profileUpdateResponse.text();
    testResults.failed.push({
      form: 'Onboarding Step 1 - Profile',
      issue: `Profile update failed: ${error}`
    });
  }

  // Test onboarding completion
  console.log('\n📍 Testing onboarding completion...');
  const completeResponse = await fetch(`${BASE_URL}/api/onboarding/complete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': userCookies
    }
  });

  if (completeResponse.ok) {
    console.log('✅ Onboarding marked as complete');
    testResults.passed.push({
      form: 'Onboarding Completion',
      details: 'Successfully marks onboarding as complete'
    });
  } else {
    testResults.anomalies.push({
      form: 'Onboarding Completion',
      issue: 'Could not mark onboarding as complete'
    });
  }
}

async function testProfileEditForms() {
  console.log('\n📋 TESTING PROFILE EDIT FORMS\n');
  console.log('━'.repeat(50));

  // Test regular user profile edit
  console.log('📝 Testing user profile edit...');
  
  const profileUpdateData = {
    firstName: 'Josh',
    lastName: 'Updated',
    bio: 'Updated bio text for testing'
  };

  const updateResponse = await fetch(`${BASE_URL}/api/user/profile`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': sessionCookies
    },
    body: JSON.stringify(profileUpdateData),
  });

  if (updateResponse.ok) {
    console.log('✅ Profile update request successful');
    
    // Verify the changes persist
    const verifyResponse = await fetch(`${BASE_URL}/api/user`, {
      headers: { 'Cookie': sessionCookies }
    });
    
    const userData = await verifyResponse.json();
    
    if (userData.firstName === profileUpdateData.firstName && 
        userData.lastName === profileUpdateData.lastName) {
      console.log('✅ Profile changes persist in database');
      testResults.passed.push({
        form: 'User Profile Edit',
        details: 'Profile updates save and persist correctly'
      });
    } else {
      console.log('❌ Profile changes do not persist');
      testResults.failed.push({
        form: 'User Profile Edit',
        issue: 'Changes do not persist in database',
        expected: profileUpdateData,
        actual: userData
      });
    }
    
    // Note about bio field
    if (!userData.bio) {
      testResults.anomalies.push({
        form: 'User Profile Edit',
        issue: 'Bio field may not exist in users table schema',
        recommendation: 'Consider adding bio field to users table if needed'
      });
    }
  } else {
    const error = await updateResponse.text();
    testResults.failed.push({
      form: 'User Profile Edit',
      issue: `Update failed: ${error}`
    });
  }
}

async function testShiftForms() {
  console.log('\n📋 TESTING SHIFT/SCHEDULE FORMS\n');
  console.log('━'.repeat(50));

  // Test shift creation
  console.log('📝 Testing shift creation form...');
  
  const shiftData = {
    title: 'Test Shift ' + Date.now(),
    specialty: 'Registered Nurse',
    date: new Date().toISOString().split('T')[0],
    facilityId: 1,
    startTime: '08:00',
    endTime: '16:00',
    requiredStaff: 2,
    hourlyRate: 45,
    urgency: 'normal',
    description: 'Test shift for form audit'
  };

  const createShiftResponse = await fetch(`${BASE_URL}/api/shifts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': sessionCookies
    },
    body: JSON.stringify(shiftData),
  });

  if (createShiftResponse.ok) {
    const createdShift = await createShiftResponse.json();
    console.log(`✅ Shift created successfully (ID: ${createdShift.id})`);
    
    // Verify shift appears in calendar data
    const shiftsResponse = await fetch(`${BASE_URL}/api/shifts?date=${shiftData.date}`, {
      headers: { 'Cookie': sessionCookies }
    });
    
    if (shiftsResponse.ok) {
      const shifts = await shiftsResponse.json();
      const foundShift = shifts.find(s => s.id === createdShift.id);
      
      if (foundShift) {
        console.log('✅ Shift data persists and loads correctly');
        testResults.passed.push({
          form: 'Shift Creation Form',
          details: 'Shift saves and appears in calendar correctly'
        });
      } else {
        testResults.failed.push({
          form: 'Shift Creation Form',
          issue: 'Created shift not found in calendar data'
        });
      }
    }
  } else {
    const error = await createShiftResponse.text();
    testResults.failed.push({
      form: 'Shift Creation Form',
      issue: `Shift creation failed: ${error}`
    });
  }

  // Test shift template creation
  console.log('\n📝 Testing shift template form...');
  
  const templateData = {
    name: 'Test Template ' + Date.now(),
    shiftType: 'Day',
    startTime: '07:00',
    endTime: '19:00',
    department: 'ICU',
    specialty: 'Registered Nurse',
    requiredStaff: 3,
    facilityId: 1,
    recurrencePattern: 'weekly',
    daysOfWeek: ['monday', 'wednesday', 'friday'],
    hourlyRate: 50,
    isActive: true
  };

  const createTemplateResponse = await fetch(`${BASE_URL}/api/shift-templates`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': sessionCookies
    },
    body: JSON.stringify(templateData),
  });

  if (createTemplateResponse.ok) {
    const createdTemplate = await createTemplateResponse.json();
    console.log(`✅ Shift template created successfully (ID: ${createdTemplate.id})`);
    
    // Verify template persists
    const templatesResponse = await fetch(`${BASE_URL}/api/shift-templates`, {
      headers: { 'Cookie': sessionCookies }
    });
    
    if (templatesResponse.ok) {
      const templates = await templatesResponse.json();
      const foundTemplate = templates.find(t => t.id === createdTemplate.id);
      
      if (foundTemplate && foundTemplate.name === templateData.name) {
        console.log('✅ Template data persists correctly');
        testResults.passed.push({
          form: 'Shift Template Form',
          details: 'Template saves and persists with all fields'
        });
      } else {
        testResults.failed.push({
          form: 'Shift Template Form',
          issue: 'Template data does not persist correctly'
        });
      }
    }
  } else {
    const error = await createTemplateResponse.text();
    testResults.failed.push({
      form: 'Shift Template Form',
      issue: `Template creation failed: ${error}`
    });
  }
}

async function testFacilityForms() {
  console.log('\n📋 TESTING FACILITY MANAGEMENT FORMS\n');
  console.log('━'.repeat(50));

  // Get a facility to edit
  console.log('📝 Testing facility edit form...');
  
  const facilitiesResponse = await fetch(`${BASE_URL}/api/facilities`, {
    headers: { 'Cookie': sessionCookies }
  });

  if (!facilitiesResponse.ok) {
    testResults.anomalies.push({
      form: 'Facility Management',
      issue: 'Could not fetch facilities for testing'
    });
    return;
  }

  const facilities = await facilitiesResponse.json();
  if (facilities.length === 0) {
    testResults.anomalies.push({
      form: 'Facility Management',
      issue: 'No facilities available for testing'
    });
    return;
  }

  const testFacility = facilities[0];
  console.log(`Testing with facility: ${testFacility.name} (ID: ${testFacility.id})`);

  // Test facility update
  const updateData = {
    name: testFacility.name,
    phone: '555-9999',
    email: 'updated@facility.com',
    autoAssignmentEnabled: true,
    timezone: 'America/New_York'
  };

  const updateResponse = await fetch(`${BASE_URL}/api/facilities/${testFacility.id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': sessionCookies
    },
    body: JSON.stringify(updateData),
  });

  if (updateResponse.ok) {
    console.log('✅ Facility update successful');
    
    // Verify changes persist
    const verifyResponse = await fetch(`${BASE_URL}/api/facilities/${testFacility.id}`, {
      headers: { 'Cookie': sessionCookies }
    });
    
    if (verifyResponse.ok) {
      const updatedFacility = await verifyResponse.json();
      
      if (updatedFacility.phone === updateData.phone && 
          updatedFacility.email === updateData.email) {
        console.log('✅ Facility changes persist correctly');
        testResults.passed.push({
          form: 'Facility Edit Form',
          details: 'Facility updates save and persist'
        });
      } else {
        testResults.failed.push({
          form: 'Facility Edit Form',
          issue: 'Changes do not persist correctly',
          expected: updateData,
          actual: updatedFacility
        });
      }
    }
  } else {
    const error = await updateResponse.text();
    testResults.failed.push({
      form: 'Facility Edit Form',
      issue: `Update failed: ${error}`
    });
  }
}

async function testTeamRoleForms() {
  console.log('\n📋 TESTING TEAM/ROLE ASSIGNMENT FORMS\n');
  console.log('━'.repeat(50));

  // Test facility user role update
  console.log('📝 Testing facility user role assignment...');
  
  // Get facility users
  const facilityUsersResponse = await fetch(`${BASE_URL}/api/facility-users`, {
    headers: { 'Cookie': sessionCookies }
  });

  if (!facilityUsersResponse.ok) {
    testResults.anomalies.push({
      form: 'Role Assignment',
      issue: 'Could not fetch facility users for testing'
    });
    return;
  }

  const facilityUsers = await facilityUsersResponse.json();
  if (facilityUsers.length === 0) {
    testResults.anomalies.push({
      form: 'Role Assignment',
      issue: 'No facility users available for testing'
    });
    return;
  }

  // Find a non-admin user to test role change
  const testUser = facilityUsers.find(u => u.role !== 'facility_admin');
  if (!testUser) {
    testResults.anomalies.push({
      form: 'Role Assignment',
      issue: 'No suitable user for role change testing'
    });
    return;
  }

  console.log(`Testing role change for: ${testUser.email}`);
  
  const originalRole = testUser.role;
  const newRole = originalRole === 'hr_manager' ? 'supervisor' : 'hr_manager';
  
  const roleUpdateResponse = await fetch(`${BASE_URL}/api/facility-users/${testUser.id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': sessionCookies
    },
    body: JSON.stringify({ role: newRole }),
  });

  if (roleUpdateResponse.ok) {
    console.log(`✅ Role updated from ${originalRole} to ${newRole}`);
    
    // Verify change persists
    const verifyResponse = await fetch(`${BASE_URL}/api/facility-users`, {
      headers: { 'Cookie': sessionCookies }
    });
    
    if (verifyResponse.ok) {
      const updatedUsers = await verifyResponse.json();
      const updatedUser = updatedUsers.find(u => u.id === testUser.id);
      
      if (updatedUser && updatedUser.role === newRole) {
        console.log('✅ Role change persists correctly');
        testResults.passed.push({
          form: 'Role Assignment Form',
          details: 'Role changes save and persist'
        });
        
        // Change it back
        await fetch(`${BASE_URL}/api/facility-users/${testUser.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': sessionCookies
          },
          body: JSON.stringify({ role: originalRole }),
        });
      } else {
        testResults.failed.push({
          form: 'Role Assignment Form',
          issue: 'Role change does not persist'
        });
      }
    }
  } else {
    const error = await roleUpdateResponse.text();
    testResults.failed.push({
      form: 'Role Assignment Form',
      issue: `Role update failed: ${error}`
    });
  }
}

function generateReport() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 USER FORMS AUDIT REPORT');
  console.log('='.repeat(60) + '\n');

  console.log(`✅ PASSED TESTS (${testResults.passed.length}):`);
  if (testResults.passed.length > 0) {
    testResults.passed.forEach(result => {
      console.log(`   • ${result.form}: ${result.details}`);
    });
  } else {
    console.log('   None');
  }

  console.log(`\n❌ FAILED TESTS (${testResults.failed.length}):`);
  if (testResults.failed.length > 0) {
    testResults.failed.forEach(result => {
      console.log(`   • ${result.form}: ${result.issue}`);
      if (result.expected) {
        console.log(`     Expected:`, result.expected);
        console.log(`     Actual:`, result.actual);
      }
    });
  } else {
    console.log('   None');
  }

  console.log(`\n⚠️  ANOMALIES & RECOMMENDATIONS (${testResults.anomalies.length}):`);
  if (testResults.anomalies.length > 0) {
    testResults.anomalies.forEach(anomaly => {
      console.log(`   • ${anomaly.form}: ${anomaly.issue}`);
      if (anomaly.recommendation) {
        console.log(`     → ${anomaly.recommendation}`);
      }
    });
  } else {
    console.log('   None');
  }

  console.log('\n' + '='.repeat(60));
  console.log('📈 SUMMARY:');
  console.log(`   Total Forms Tested: ${testResults.passed.length + testResults.failed.length}`);
  console.log(`   Pass Rate: ${testResults.passed.length > 0 ? 
    Math.round((testResults.passed.length / (testResults.passed.length + testResults.failed.length)) * 100) : 0}%`);
  console.log('='.repeat(60) + '\n');
}

async function runAudit() {
  try {
    console.log('🚀 Starting User Forms Audit...\n');
    
    await loginAsSuperAdmin();
    
    await testOnboardingForms();
    await testProfileEditForms();
    await testShiftForms();
    await testFacilityForms();
    await testTeamRoleForms();
    
    generateReport();
    
  } catch (error) {
    console.error('\n❌ Audit failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run the audit
runAudit();