// Test script for job applications and interviews API
// Run in browser console after logging in

async function testJobApplicationsAPI() {
  console.log('Testing Job Applications API - Happy Path...\n');
  
  try {
    // Step 1: Create a job posting first
    console.log('1. Creating a test job posting...');
    const jobPosting = {
      title: 'Emergency Room Nurse',
      description: 'Seeking experienced ER nurse for night shifts.',
      requirements: {
        experience: '3+ years ER experience',
        certifications: ['RN', 'ACLS', 'PALS'],
        skills: ['Trauma care', 'Triage']
      },
      scheduleType: 'Full-time',
      payRate: 52.00,
      status: 'active'
    };
    
    const postingResponse = await fetch('/api/job-postings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(jobPosting)
    });
    const postingData = await postingResponse.json();
    console.log('Job posting created:', postingData);
    
    if (postingResponse.ok && postingData.id) {
      const jobPostingId = postingData.id;
      
      // Step 2: Apply to the job
      console.log('\n2. Applying to the job posting...');
      const application = {
        jobPostingId,
        coverLetter: 'I am very interested in this ER nurse position. I have 5 years of experience...',
        resumeUrl: 'https://example.com/resume.pdf'
      };
      
      const applyResponse = await fetch('/api/job-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(application)
      });
      const applyData = await applyResponse.json();
      console.log('Application submitted:', applyData);
      
      if (applyResponse.ok && applyData.id) {
        const applicationId = applyData.id;
        
        // Step 3: List applications by staff ID
        console.log('\n3. Listing my applications...');
        const myAppsResponse = await fetch(`/api/job-applications?staffId=${applyData.applicantId}`);
        const myApps = await myAppsResponse.json();
        console.log('My applications:', myApps);
        
        // Step 4: List applications by facility (if user is facility user)
        console.log('\n4. Listing facility applications...');
        const facilityAppsResponse = await fetch(`/api/job-applications?facilityId=${postingData.facilityId}`);
        const facilityApps = await facilityAppsResponse.json();
        console.log('Facility applications:', facilityApps);
        
        // Step 5: Update application status
        console.log('\n5. Updating application status to hired...');
        const statusResponse = await fetch(`/api/job-applications/${applicationId}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'hired' })
        });
        const statusData = await statusResponse.json();
        console.log('Application status updated:', statusData);
        
        // Step 6: Schedule an interview
        console.log('\n6. Scheduling an interview...');
        const interview = {
          applicationId,
          start: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week from now
          end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(), // 1 hour duration
          meetingUrl: 'https://zoom.us/j/123456789'
        };
        
        const interviewResponse = await fetch('/api/interviews', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(interview)
        });
        const interviewData = await interviewResponse.json();
        console.log('Interview scheduled:', interviewData);
        
        // Step 7: Get interviews for application
        console.log('\n7. Getting interviews for application...');
        const getInterviewsResponse = await fetch(`/api/interviews?applicationId=${applicationId}`);
        const interviews = await getInterviewsResponse.json();
        console.log('Interviews:', interviews);
      }
    }
    
    console.log('\n✅ All tests completed successfully!');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Quick test for just listing applications
async function listMyApplications() {
  try {
    // Get current user ID (you may need to adjust this based on your auth system)
    const userResponse = await fetch('/api/auth/user');
    const user = await userResponse.json();
    
    if (user && user.id) {
      const response = await fetch(`/api/job-applications?staffId=${user.id}`);
      const data = await response.json();
      console.log('My applications:', data);
    } else {
      console.log('Please login first');
    }
  } catch (error) {
    console.error('Error listing applications:', error);
  }
}

// Instructions
console.log('Job Applications API Test Suite');
console.log('================================');
console.log('To run the complete happy path test:');
console.log('  testJobApplicationsAPI()');
console.log('\nTo just list your applications:');
console.log('  listMyApplications()');
console.log('\nMake sure you are logged in before running tests!');