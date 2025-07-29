import fetch from 'node-fetch';

async function testImpersonationAudit() {
  const baseUrl = 'http://localhost:5000/api';
  
  console.log('Testing Impersonation Audit Logging...\n');
  
  // 1. Login as super admin
  console.log('1. Logging in as super admin...');
  const loginRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'joshburn@example.com',
      password: 'admin123',
    }),
  });
  const loginData = await loginRes.json();
  const cookie = loginRes.headers.get('set-cookie');
  console.log('Super admin logged in:', loginData.user.email);
  
  // 2. Start impersonation of billing manager
  console.log('\n2. Starting impersonation of billing manager...');
  const impersonateRes = await fetch(`${baseUrl}/impersonate/start`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Cookie': cookie 
    },
    body: JSON.stringify({
      userId: 4, // test_billing@example.com
      userType: 'facility_user',
    }),
  });
  const impersonateData = await impersonateRes.json();
  const impersonateCookie = impersonateRes.headers.get('set-cookie') || cookie;
  console.log('Impersonation started:', impersonateData.user.email);
  
  // 3. Perform an action while impersonated (update facility)
  console.log('\n3. Updating facility while impersonated...');
  const updateRes = await fetch(`${baseUrl}/facilities/1`, {
    method: 'PATCH',
    headers: { 
      'Content-Type': 'application/json',
      'Cookie': impersonateCookie 
    },
    body: JSON.stringify({
      name: 'General Hospital - Updated by Impersonated User',
    }),
  });
  const updateData = await updateRes.json();
  console.log('Facility updated:', updateData.name);
  
  // 4. Stop impersonation and check audit logs as super admin
  console.log('\n4. Stopping impersonation...');
  await fetch(`${baseUrl}/impersonate/quit`, {
    method: 'POST',
    headers: { 'Cookie': impersonateCookie },
  });
  
  // 5. Check audit logs
  console.log('\n5. Fetching audit logs...');
  const auditRes = await fetch(`${baseUrl}/admin/audit-logs`, {
    method: 'GET',
    headers: { 'Cookie': cookie },
  });
  const auditLogs = await auditRes.json();
  
  // Find the most recent facility update log
  const facilityUpdateLog = auditLogs.find(log => 
    log.resource === 'facility' && 
    log.action === 'update'
  );
  
  if (facilityUpdateLog) {
    console.log('\n✅ Audit Log Entry Found:');
    console.log('================================');
    console.log('Action:', facilityUpdateLog.action);
    console.log('Resource:', facilityUpdateLog.resource);
    console.log('User who performed action:', facilityUpdateLog.username);
    console.log('User ID:', facilityUpdateLog.userId);
    console.log('Is Impersonated:', facilityUpdateLog.isImpersonated);
    console.log('Original User ID:', facilityUpdateLog.originalUserId);
    
    if (facilityUpdateLog.originalUserInfo) {
      console.log('Original User (who initiated impersonation):');
      console.log('  - Email:', facilityUpdateLog.originalUserInfo.email);
      console.log('  - ID:', facilityUpdateLog.originalUserInfo.id);
    }
    
    if (facilityUpdateLog.impersonationContext) {
      console.log('Impersonation Context:', JSON.stringify(facilityUpdateLog.impersonationContext, null, 2));
    }
    console.log('================================');
  } else {
    console.log('\n❌ No facility update log found in audit logs');
  }
  
  console.log('\n✅ Impersonation audit logging test complete!');
}

testImpersonationAudit().catch(console.error);