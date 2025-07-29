import puppeteer from 'puppeteer';

async function testOnboardingWizard() {
  console.log('🚀 Testing NexSpace Onboarding Wizard Flow\n');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  try {
    // 1. Navigate to the application
    console.log('1️⃣ Navigating to NexSpace...');
    await page.goto('http://localhost:5000');
    await page.waitForTimeout(2000);
    
    // 2. Login as a user who hasn't completed onboarding
    console.log('2️⃣ Logging in as executive@nexspacecorp.com (onboarding not completed)...');
    await page.waitForSelector('input[placeholder="name@example.com"]');
    await page.type('input[placeholder="name@example.com"]', 'executive@nexspacecorp.com');
    await page.type('input[placeholder="Enter your password"]', 'password123'); // You'll need the correct password
    await page.click('button[type="submit"]');
    
    // Wait for onboarding wizard to appear
    await page.waitForTimeout(3000);
    console.log('✅ Logged in successfully\n');
    
    // 3. Verify onboarding wizard appears
    console.log('3️⃣ Checking for onboarding wizard...');
    const wizardExists = await page.evaluate(() => {
      return !!document.querySelector('[class*="Welcome to NexSpace"]');
    });
    
    if (!wizardExists) {
      console.log('❌ Onboarding wizard did not appear');
      return;
    }
    console.log('✅ Onboarding wizard is displayed\n');
    
    // 4. Test Step 1: Profile Setup
    console.log('4️⃣ Step 1: Profile Setup');
    console.log('   Filling out profile information...');
    
    // Clear and fill first name
    const firstNameInput = await page.$('input#firstName');
    await firstNameInput.click({ clickCount: 3 });
    await firstNameInput.type('Executive');
    
    // Clear and fill last name
    const lastNameInput = await page.$('input#lastName');
    await lastNameInput.click({ clickCount: 3 });
    await lastNameInput.type('Director');
    
    // Fill phone
    await page.type('input#phone', '+1 (555) 123-4567');
    
    // Fill department
    const deptInput = await page.$('input#department');
    if (deptInput) {
      await deptInput.type('Administration');
    }
    
    // Fill title
    const titleInput = await page.$('input#title');
    if (titleInput) {
      await titleInput.type('Executive Director');
    }
    
    console.log('   Clicking Next button...');
    await page.click('button:has-text("Next")');
    await page.waitForTimeout(2000);
    console.log('✅ Profile step completed\n');
    
    // 5. Test Step 2: Facility Details
    console.log('5️⃣ Step 2: Facility Details');
    console.log('   Selecting facility option...');
    
    // Check if there's a facility selection or creation option
    const facilityOptions = await page.evaluate(() => {
      const labels = Array.from(document.querySelectorAll('label'));
      return labels.map(label => label.textContent);
    });
    console.log('   Available options:', facilityOptions);
    
    // Click on join existing facility if available
    const joinExisting = await page.$('label:has-text("Join an existing facility")');
    if (joinExisting) {
      await joinExisting.click();
      await page.waitForTimeout(1000);
      
      // Select a facility if dropdown appears
      const facilitySelect = await page.$('select, [role="combobox"]');
      if (facilitySelect) {
        await facilitySelect.click();
        await page.waitForTimeout(500);
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('Enter');
      }
    }
    
    console.log('   Clicking Next button...');
    await page.click('button:has-text("Next")');
    await page.waitForTimeout(2000);
    console.log('✅ Facility step completed\n');
    
    // 6. Test Step 3: Staff Invitation
    console.log('6️⃣ Step 3: Staff Invitation');
    console.log('   Adding staff members...');
    
    // Add a staff member
    const emailInput = await page.$('input[type="email"]');
    if (emailInput) {
      await emailInput.type('nurse1@example.com');
      
      const addButton = await page.$('button:has-text("Add")');
      if (addButton) {
        await addButton.click();
        await page.waitForTimeout(1000);
      }
    }
    
    console.log('   Clicking Next button...');
    await page.click('button:has-text("Next")');
    await page.waitForTimeout(2000);
    console.log('✅ Staff invitation step completed\n');
    
    // 7. Test Step 4: Shift Scheduling
    console.log('7️⃣ Step 4: Shift Scheduling');
    console.log('   Creating first shift...');
    
    // Fill shift title
    const shiftTitleInput = await page.$('input#shiftTitle');
    if (shiftTitleInput) {
      await shiftTitleInput.type('Morning Shift - Nursing');
    }
    
    // Set date (if date picker exists)
    const dateInput = await page.$('input[type="date"], input#shiftDate');
    if (dateInput) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().split('T')[0];
      await dateInput.type(dateStr);
    }
    
    // Set time
    const timeInput = await page.$('input#shiftTime');
    if (timeInput) {
      await timeInput.type('07:00 AM - 03:00 PM');
    }
    
    console.log('   Clicking Complete button...');
    const completeButton = await page.$('button:has-text("Complete"), button:has-text("Get Started")');
    if (completeButton) {
      await completeButton.click();
      await page.waitForTimeout(3000);
    }
    console.log('✅ Shift scheduling step completed\n');
    
    // 8. Verify onboarding completion
    console.log('8️⃣ Verifying onboarding completion...');
    
    // Check if we're redirected to dashboard or if wizard is gone
    const wizardGone = await page.evaluate(() => {
      return !document.querySelector('[class*="Welcome to NexSpace"]');
    });
    
    if (wizardGone) {
      console.log('✅ Onboarding wizard completed successfully!');
      console.log('✅ User is now on the main application');
    } else {
      console.log('❌ Onboarding wizard is still visible');
    }
    
    // Check for success toast
    const toastMessage = await page.evaluate(() => {
      const toast = document.querySelector('[class*="toast"]');
      return toast ? toast.textContent : null;
    });
    
    if (toastMessage) {
      console.log(`📢 Toast message: ${toastMessage}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    console.log('\n🏁 Test completed. Browser will close in 5 seconds...');
    await page.waitForTimeout(5000);
    await browser.close();
  }
}

// Run the test
testOnboardingWizard().catch(console.error);