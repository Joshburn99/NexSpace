/**
 * Demonstration of the API wrapper utility features
 */

import { ApiClient, createCMSApiClient, createNPIApiClient } from "./utils/api-client";
import { callExternalApi, sendSlackWebhook, checkExternalServiceHealth } from "./utils/external-api-wrapper";

async function demonstrateApiWrapper() {
  console.log("🔧 API Wrapper Utility Demonstration");
  console.log("===================================\n");

  // 1. Basic Configuration Demo
  console.log("✨ API Client Features:");
  console.log("• Configurable base URL and API keys via environment variables");
  console.log("• Timeouts: 10s default, customizable per request");
  console.log("• Retries: Exponential backoff with jitter (3 retries default)");
  console.log("• TypeScript validation with Zod schemas");
  console.log("• Comprehensive error logging with unique request IDs");
  console.log("• HTTP status-based retry logic (skips 4xx client errors)");

  // 2. Show configured clients
  console.log("\n🌐 Pre-configured API Clients:");
  console.log("• CMS API: Healthcare provider data from data.cms.gov");
  console.log("• NPI Registry: National Provider Identifier lookup");
  console.log("• Custom clients: For webhooks and third-party integrations");

  // 3. Demonstrate error handling with a mock service
  console.log("\n🛠️ Error Handling Demo:");
  try {
    const testClient = new ApiClient({
      baseURL: "https://httpstat.us",
      timeout: 3000,
      retries: 2,
      retryDelay: 500,
    });

    console.log("   Attempting request to /500 (should fail and retry)...");
    const response = await testClient.get("/500");
  } catch (error) {
    console.log(`   ✅ Proper error handling: ${(error as Error).message}`);
  }

  // 4. Show timeout handling
  console.log("\n⏱️ Timeout Handling Demo:");
  try {
    const timeoutClient = new ApiClient({
      baseURL: "https://httpstat.us",
      timeout: 1500,
      retries: 0,
    });

    console.log("   Attempting slow request (should timeout)...");
    const response = await timeoutClient.get("/200?sleep=3000");
  } catch (error) {
    const message = (error as Error).message;
    if (message.includes("timeout")) {
      console.log("   ✅ Timeout handled correctly");
    }
  }

  // 5. Environment Variable Configuration
  console.log("\n🔑 Environment Configuration:");
  console.log("Required environment variables for external APIs:");
  console.log("• CMS_API_KEY - for healthcare provider data");
  console.log("• CMS_API_TIMEOUT - request timeout (default: 15000ms)");
  console.log("• CMS_API_RETRIES - retry attempts (default: 3)");
  console.log("• NPI_API_TIMEOUT - NPI lookup timeout (default: 10000ms)");
  console.log("• SENDGRID_API_KEY - for email notifications");
  console.log("• Various webhook URLs for integrations");

  // 6. Real-world usage example (if keys available)
  console.log("\n📋 Real-world Usage Example:");
  if (process.env.CMS_API_KEY) {
    console.log("   CMS API key detected - API client ready for production use");
  } else {
    console.log("   ⚠️ CMS_API_KEY not set - add to .env for full functionality");
  }

  // 7. Type Safety Demo
  console.log("\n🔍 TypeScript Type Safety:");
  console.log("• CMSProviderDataSchema - validates healthcare provider data");
  console.log("• NPIProviderDataSchema - validates NPI registry responses");
  console.log("• Runtime validation catches API response changes");
  console.log("• Compile-time type checking prevents errors");

  console.log("\n✅ API Wrapper Setup Complete!");
  console.log("\nNext Steps:");
  console.log("1. Add your API keys to .env file");
  console.log("2. Import facilities: await facilityService.searchByCMSId('123456')");
  console.log("3. Validate NPI: await facilityService.getNPIInfo('1234567890')");
  console.log("4. Use wrapper for any external HTTP calls");
}

// Execute demonstration
demonstrateApiWrapper().catch(console.error);