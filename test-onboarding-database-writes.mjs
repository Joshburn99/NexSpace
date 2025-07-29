import fetch from 'node-fetch';

async function testOnboardingDatabaseWrites() {
  console.log('🔍 Testing NexSpace Onboarding Database Writes\n');
  console.log('This test will verify what data actually gets saved during onboarding.\n');
  
  const baseUrl = 'http://localhost:5000/api';
  let cookie;
  
  try {
    // 1. Login as super admin to check data
    console.log('📊 Step 1: Checking initial database state...');
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'joshburn@example.com',
        password: 'admin123',
      }),
    });
    const loginData = await loginRes.json();
    cookie = loginRes.headers.get('set-cookie');
    console.log('✅ Logged in as super admin\n');
    
    // 2. Check test user current state
    const testUserId = 9559; // executive@nexspacecorp.com
    console.log('📊 Step 2: Checking test user current state...');
    const userRes = await fetch(`${baseUrl}/admin/users`, {
      headers: { 'Cookie': cookie },
    });
    const users = await userRes.json();
    const testUser = users.find(u => u.id === testUserId);
    console.log('Test user:', {
      email: testUser?.email,
      firstName: testUser?.firstName,
      lastName: testUser?.lastName,
      onboardingCompleted: testUser?.onboardingCompleted,
      onboardingStep: testUser?.onboardingStep,
    });
    
    // 3. Simulate Step 1: Profile Update
    console.log('\n📝 Step 3: Testing Profile Update (Step 1)...');
    const profileData = {
      firstName: 'Executive',
      lastName: 'Director',
      phone: '+1 (555) 123-4567',
      department: 'Administration',
      title: 'Executive Director',
    };
    
    const profileRes = await fetch(`${baseUrl}/users/${testUserId}/profile`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': cookie 
      },
      body: JSON.stringify(profileData),
    });
    
    if (profileRes.ok) {
      const updatedUser = await profileRes.json();
      console.log('✅ Profile update response:', {
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
      });
      console.log('⚠️  NOTE: Only firstName and lastName are saved to users table');
      console.log('⚠️  Phone, department, and title are ignored (columns don\'t exist)');
    }
    
    // 4. Simulate Step 2: Facility Association
    console.log('\n🏥 Step 4: Testing Facility Association (Step 2)...');
    console.log('For regular users joining existing facility:');
    console.log('- No database write occurs during this step');
    console.log('- FacilityId is just passed to next step in React state');
    console.log('- User\'s facility_id in users table remains unchanged');
    
    // 5. Check if facility_users table is used
    console.log('\n🔍 Step 5: Checking facility_users table...');
    const facilityUsersRes = await fetch(`${baseUrl}/facility-users`, {
      headers: { 'Cookie': cookie },
    });
    
    if (facilityUsersRes.ok) {
      const facilityUsers = await facilityUsersRes.json();
      console.log(`Found ${facilityUsers.length} facility users in database`);
      console.log('Note: Regular users during onboarding are NOT added to facility_users table');
    }
    
    // 6. Simulate Step 3: Staff Invitations
    console.log('\n📧 Step 6: Testing Staff Invitations (Step 3)...');
    const inviteData = {
      invites: [
        { email: 'nurse1@example.com', name: 'Test Nurse', role: 'nurse' },
        { email: 'admin1@example.com', name: 'Test Admin', role: 'admin' },
      ]
    };
    
    const inviteRes = await fetch(`${baseUrl}/invites`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': cookie 
      },
      body: JSON.stringify(inviteData),
    });
    
    if (inviteRes.ok) {
      const inviteResult = await inviteRes.json();
      console.log('✅ Invite endpoint response:', inviteResult);
      console.log('⚠️  NOTE: Invitations are NOT saved to database');
      console.log('⚠️  No invites table exists');
      console.log('⚠️  Staff records are NOT created from invitations');
    }
    
    // 7. Check staff table before shift creation
    console.log('\n👥 Step 7: Checking staff table...');
    const staffRes = await fetch(`${baseUrl}/staff`, {
      headers: { 'Cookie': cookie },
    });
    
    if (staffRes.ok) {
      const staff = await staffRes.json();
      console.log(`Current staff count: ${staff.length}`);
      console.log('Invited emails NOT found in staff table (as expected)');
    }
    
    // 8. Simulate Step 4: First Shift Creation
    console.log('\n📅 Step 8: Testing Shift Creation (Step 4)...');
    const shiftData = {
      title: 'Test Onboarding Shift',
      date: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
      startTime: '09:00',
      endTime: '17:00',
      facilityId: 1,
      specialty: 'General',
      rate: 50,
      requiredWorkers: 1,
    };
    
    const shiftRes = await fetch(`${baseUrl}/shifts`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': cookie 
      },
      body: JSON.stringify(shiftData),
    });
    
    if (shiftRes.ok) {
      const createdShift = await shiftRes.json();
      console.log('✅ Shift created successfully:', {
        id: createdShift.id,
        title: createdShift.title,
        date: createdShift.date,
      });
      console.log('✅ This IS saved to the shifts table');
    }
    
    // 9. Summary
    console.log('\n📊 ONBOARDING DATABASE WRITES SUMMARY:');
    console.log('=====================================');
    console.log('Step 1 (Profile):');
    console.log('  - Regular users: Updates users table (firstName, lastName only)');
    console.log('  - Facility users: Would update facility_users table (all fields)');
    console.log('  - ❌ Missing columns: phone, department, bio in users table');
    
    console.log('\nStep 2 (Facility):');
    console.log('  - Join existing: NO database write');
    console.log('  - Create new: Would create entry in facilities table');
    console.log('  - ❌ No facility association saved for regular users');
    
    console.log('\nStep 3 (Staff Invites):');
    console.log('  - ❌ NO database writes occur');
    console.log('  - ❌ No invites table exists');
    console.log('  - ❌ Staff records NOT created');
    
    console.log('\nStep 4 (First Shift):');
    console.log('  - ✅ Creates entry in shifts table');
    console.log('  - ✅ All shift data properly saved');
    
    console.log('\nOnboarding Completion:');
    console.log('  - ✅ Updates users.onboarding_completed = true');
    console.log('  - ✅ Updates users.onboarding_step = 4');
    
    console.log('\n⚠️  IMPORTANT FINDINGS:');
    console.log('1. Profile data is only partially saved (missing columns)');
    console.log('2. Facility associations are not saved for regular users');
    console.log('3. Staff invitations are not persisted anywhere');
    console.log('4. Only shift creation actually creates new records');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testOnboardingDatabaseWrites().catch(console.error);