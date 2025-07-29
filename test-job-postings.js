// Test script for job postings API
// Run in browser console after logging in

async function testJobPostingsAPI() {
  console.log('Testing Job Postings API...\n');
  
  // Test 1: GET all job postings
  console.log('1. Testing GET /api/job-postings');
  try {
    const response = await fetch('/api/job-postings');
    const data = await response.json();
    console.log('GET Response:', response.status, data);
  } catch (error) {
    console.error('GET Error:', error);
  }
  
  // Test 2: POST new job posting
  console.log('\n2. Testing POST /api/job-postings');
  try {
    const newPosting = {
      title: 'Senior Nurse - ICU',
      description: 'We are looking for an experienced ICU nurse to join our team.',
      requirements: {
        experience: '5+ years ICU experience',
        certifications: ['RN', 'ACLS', 'BLS'],
        skills: ['Critical care', 'Ventilator management']
      },
      scheduleType: 'Full-time',
      payRate: 45.50,
      status: 'active'
    };
    
    const response = await fetch('/api/job-postings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newPosting)
    });
    const data = await response.json();
    console.log('POST Response:', response.status, data);
    
    if (response.ok && data.id) {
      // Test 3: PATCH update job posting
      console.log('\n3. Testing PATCH /api/job-postings/' + data.id);
      const updateResponse = await fetch('/api/job-postings/' + data.id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payRate: 48.00 })
      });
      const updateData = await updateResponse.json();
      console.log('PATCH Response:', updateResponse.status, updateData);
      
      // Test 4: DELETE job posting (soft delete)
      console.log('\n4. Testing DELETE /api/job-postings/' + data.id);
      const deleteResponse = await fetch('/api/job-postings/' + data.id, {
        method: 'DELETE'
      });
      const deleteData = await deleteResponse.json();
      console.log('DELETE Response:', deleteResponse.status, deleteData);
    }
  } catch (error) {
    console.error('Error:', error);
  }
  
  console.log('\nAll tests completed!');
}

// Instructions
console.log('To test the job postings API:');
console.log('1. Make sure you are logged in as a superuser or facility user');
console.log('2. Run: testJobPostingsAPI()');
console.log('\nOr test individual endpoints with:');
console.log("fetch('/api/job-postings').then(r => r.json()).then(console.log)");