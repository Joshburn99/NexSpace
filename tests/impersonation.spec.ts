import { test, expect } from '@playwright/test';

/**
 * E2E Tests for NexSpace Impersonation System with Role-Based Dashboard Routing
 * 
 * This test suite validates the comprehensive impersonation security system:
 * 1. Role-based dashboard routing (staff → /staff, facility → /facility, super-admin → /admin)
 * 2. Route fencing (impersonated users contained within allowed routes)
 * 3. Permission validation during impersonation
 * 4. Secure session isolation and cleanup
 * 5. Form validation and data persistence during impersonation
 */

test.describe('NexSpace Impersonation System', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
    
    // Login as super admin (assuming test credentials)
    await page.fill('input[name="email"]', 'joshburn@nexspace.com');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');
    
    // Wait for successful login
    await page.waitForURL('/dashboard');
  });

  test('should route impersonated users to role-specific dashboards', async ({ page }) => {
    // Navigate to impersonation page
    await page.goto('/admin/impersonation');
    
    // Test staff impersonation -> /staff route
    await page.click('button:has-text("Impersonate"):first');
    await page.waitForURL('/staff');
    expect(page.url()).toContain('/staff');
    
    // Verify "Viewing as" indicator is present
    await expect(page.locator('text=Viewing as')).toBeVisible();
    
    // End impersonation
    await page.click('button:has-text("Quit Impersonation")');
    await page.waitForURL('/admin');
  });

  test('should prevent unauthorized route access during impersonation', async ({ page }) => {
    // Start impersonating a staff member
    await page.goto('/admin/impersonation');
    await page.click('button:has-text("Impersonate"):first');
    await page.waitForURL('/staff');
    
    // Attempt to access super admin route - should redirect to /staff
    await page.goto('/admin/database');
    await page.waitForURL('/staff');
    expect(page.url()).toContain('/staff');
    
    // Attempt to access facility route - should redirect to /staff
    await page.goto('/facility-dashboard');
    await page.waitForURL('/staff');
    expect(page.url()).toContain('/staff');
  });

  test('should validate permissions during impersonation', async ({ page }) => {
    // Start impersonating a limited user
    await page.goto('/admin/impersonation');
    await page.click('button:has-text("Impersonate"):first');
    await page.waitForURL('/staff');
    
    // Try to access billing data (should show 403 or not be visible)
    await page.goto('/billing-dashboard');
    
    // Should either redirect to /staff or show access denied
    const currentUrl = page.url();
    const hasAccessDenied = await page.locator('text=Access Denied').isVisible().catch(() => false);
    
    expect(currentUrl.includes('/staff') || hasAccessDenied).toBeTruthy();
  });

  test('should restore original permissions after ending impersonation', async ({ page }) => {
    // Start impersonation
    await page.goto('/admin/impersonation');
    await page.click('button:has-text("Impersonate"):first');
    await page.waitForURL('/staff');
    
    // End impersonation
    await page.click('button:has-text("Quit Impersonation")');
    await page.waitForURL('/admin');
    
    // Verify super admin can access admin routes again
    await page.goto('/admin/database');
    await expect(page.locator('h1:has-text("Database Console")')).toBeVisible();
  });

  test('should handle form submissions during impersonation', async ({ page }) => {
    // Start impersonating a facility user
    await page.goto('/admin/impersonation');
    await page.click('button:has-text("Impersonate Facility User"):first');
    await page.waitForURL('/facility');
    
    // Navigate to a form page (e.g., profile editing)
    await page.goto('/profile');
    
    // Fill out form fields
    await page.fill('input[name="firstName"]', 'Updated Name');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Verify success message or form submission
    await expect(page.locator('text=Profile updated')).toBeVisible({ timeout: 10000 });
  });

  test('should maintain session isolation between users', async ({ page }) => {
    // Get original user ID
    const originalResponse = await page.request.get('/api/user');
    const originalUser = await originalResponse.json();
    
    // Start impersonation
    await page.goto('/admin/impersonation');
    await page.click('button:has-text("Impersonate"):first');
    await page.waitForURL('/staff');
    
    // Verify impersonated user ID is different
    const impersonatedResponse = await page.request.get('/api/user');
    const impersonatedUser = await impersonatedResponse.json();
    
    expect(impersonatedUser.id).not.toBe(originalUser.id);
    expect(impersonatedUser.isImpersonating).toBe(true);
    expect(impersonatedUser.originalUserId).toBe(originalUser.id);
  });

  test('should handle page refresh during impersonation', async ({ page }) => {
    // Start impersonation
    await page.goto('/admin/impersonation');
    await page.click('button:has-text("Impersonate"):first');
    await page.waitForURL('/staff');
    
    // Refresh the page
    await page.reload();
    
    // Verify impersonation state persists
    await expect(page.locator('text=Viewing as')).toBeVisible();
    expect(page.url()).toContain('/staff');
  });

  test('should clean up session data on logout during impersonation', async ({ page }) => {
    // Start impersonation
    await page.goto('/admin/impersonation');
    await page.click('button:has-text("Impersonate"):first');
    await page.waitForURL('/staff');
    
    // Logout while impersonating
    await page.click('button:has-text("Logout")');
    await page.waitForURL('/auth');
    
    // Login again as super admin
    await page.fill('input[name="email"]', 'joshburn@nexspace.com');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
    
    // Verify no impersonation state remains
    const userResponse = await page.request.get('/api/user');
    const user = await userResponse.json();
    expect(user.isImpersonating).toBeFalsy();
  });

  test('should validate route access patterns for different roles', async ({ page }) => {
    const roleTests = [
      {
        roleButton: 'Impersonate Staff',
        expectedRoute: '/staff',
        allowedRoutes: ['/staff', '/my-schedule', '/my-requests'],
        forbiddenRoutes: ['/admin', '/facility-dashboard', '/billing']
      },
      {
        roleButton: 'Impersonate Facility User',
        expectedRoute: '/facility',
        allowedRoutes: ['/facility', '/schedule', '/staff-directory'],
        forbiddenRoutes: ['/admin', '/admin/database']
      }
    ];

    for (const roleTest of roleTests) {
      // Reset to admin state
      await page.goto('/admin/impersonation');
      
      // Start impersonation for this role
      await page.click(`button:has-text("${roleTest.roleButton}"):first`);
      await page.waitForURL(roleTest.expectedRoute);
      
      // Test forbidden routes redirect back to allowed route
      for (const forbiddenRoute of roleTest.forbiddenRoutes) {
        await page.goto(forbiddenRoute);
        await page.waitForTimeout(1000); // Allow redirect time
        expect(page.url()).toContain(roleTest.expectedRoute);
      }
      
      // End impersonation
      await page.click('button:has-text("Quit Impersonation")');
      await page.waitForURL('/admin');
    }
  });
});