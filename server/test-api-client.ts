/**
 * Test script for API client functionality
 */

import { createCMSApiClient, createNPIApiClient, ApiClient } from "./utils/api-client";
import { FacilityImportService } from "./facility-import";

async function testApiClients() {
  console.log("🧪 Testing API Client Implementation");
  console.log("=====================================\n");

  // Test 1: Basic API client configuration
  console.log("1. Testing API Client Configuration");
  try {
    const cmsClient = createCMSApiClient();
    const npiClient = createNPIApiClient();
    console.log("✅ API clients created successfully");
  } catch (error) {
    console.log("❌ API client creation failed:", error);
  }

  // Test 2: Test with mock endpoint (should fail but show proper error handling)
  console.log("\n2. Testing Error Handling");
  try {
    const testClient = new ApiClient({
      baseURL: "https://httpstat.us",
      timeout: 5000,
      retries: 1,
    });

    const response = await testClient.get("/404");
    console.log("❌ Expected error but got success:", response);
  } catch (error) {
    console.log("✅ Error handling works correctly:", (error as Error).message);
  }

  // Test 3: Test timeout handling
  console.log("\n3. Testing Timeout Handling");
  try {
    const timeoutClient = new ApiClient({
      baseURL: "https://httpstat.us",
      timeout: 1000, // 1 second timeout
      retries: 0,
    });

    const response = await timeoutClient.get("/200?sleep=5000"); // 5 second delay
    console.log("❌ Expected timeout but got success:", response);
  } catch (error) {
    const message = (error as Error).message;
    if (message.includes("timeout")) {
      console.log("✅ Timeout handling works correctly");
    } else {
      console.log("⚠️ Unexpected error:", message);
    }
  }

  // Test 4: Test successful response
  console.log("\n4. Testing Successful Response");
  try {
    const successClient = new ApiClient({
      baseURL: "https://httpstat.us",
      timeout: 10000,
      retries: 1,
    });

    const response = await successClient.get("/200");
    if (response.success) {
      console.log("✅ Successful response handling works");
    } else {
      console.log("❌ Response should be successful:", response);
    }
  } catch (error) {
    console.log("❌ Unexpected error on success test:", error);
  }

  // Test 5: Test facility import service (if API keys are configured)
  console.log("\n5. Testing Facility Import Service");
  try {
    const facilityService = new FacilityImportService();
    
    // Test with a well-known NPI number (this is public data)
    const npiResult = await facilityService.getNPIInfo("1234567890");
    console.log("✅ NPI lookup completed (may return null if not found)");
    
  } catch (error) {
    const message = (error as Error).message;
    if (message.includes("not configured")) {
      console.log("⚠️ API keys not configured - this is expected in development");
    } else {
      console.log("❌ Facility import test failed:", message);
    }
  }

  console.log("\n🎉 API Client tests completed!");
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testApiClients().catch(console.error);
}

export { testApiClients };