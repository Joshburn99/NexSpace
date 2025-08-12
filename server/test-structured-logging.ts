/**
 * Demonstration script for structured logging features
 */

import { logger } from "./middleware/structured-logger";
import fetch from "node-fetch";

async function demonstrateStructuredLogging() {
  console.log("🔍 Structured Logging Demonstration");
  console.log("==================================\n");

  // 1. Test health endpoints
  console.log("📊 Testing Health Check Endpoints:");
  
  try {
    const healthResponse = await fetch("http://localhost:5000/health");
    const healthData = await healthResponse.json();
    console.log("✅ Basic health check:", JSON.stringify(healthData, null, 2));
    
    const detailedResponse = await fetch("http://localhost:5000/health/detailed");
    const detailedData = await detailedResponse.json();
    console.log("🔍 Detailed health check status:", detailedData.ok ? "HEALTHY" : "DEGRADED");
    console.log("   Database:", detailedData.checks.database.ok ? "✅ Connected" : "❌ Failed");
    console.log("   Memory:", detailedData.checks.memory.ok ? "✅ Normal" : "❌ High usage");
    console.log("   Environment:", detailedData.checks.environment.ok ? "✅ Complete" : `❌ Missing: ${detailedData.checks.environment.missing.join(", ")}`);
    
  } catch (error) {
    console.log("❌ Health check failed:", (error as Error).message);
  }

  // 2. Test request correlation
  console.log("\n🔗 Testing Request ID Correlation:");
  console.log("Making multiple API calls to demonstrate request tracing...");
  
  const requests = [
    fetch("http://localhost:5000/health"),
    fetch("http://localhost:5000/health/metrics"),
    fetch("http://localhost:5000/api/facilities", {
      headers: { "Authorization": "Bearer fake-token" }
    })
  ];

  await Promise.allSettled(requests);
  console.log("✅ Check server logs to see unique request IDs for correlation");

  // 3. Demonstrate error logging
  console.log("\n🚨 Testing Error Logging:");
  try {
    const errorResponse = await fetch("http://localhost:5000/api/nonexistent-endpoint");
    console.log("Error response status:", errorResponse.status);
  } catch (error) {
    console.log("Network error:", (error as Error).message);
  }

  // 4. Performance testing
  console.log("\n⚡ Testing Performance Logging:");
  console.log("Making requests to test slow request detection...");
  
  const startTime = Date.now();
  try {
    // Simulate multiple concurrent requests
    const performanceRequests = Array.from({ length: 5 }, () => 
      fetch("http://localhost:5000/health/detailed")
    );
    
    await Promise.all(performanceRequests);
    const duration = Date.now() - startTime;
    console.log(`✅ Completed 5 concurrent requests in ${duration}ms`);
    console.log("   Check logs for performance metrics and any slow request warnings");
    
  } catch (error) {
    console.log("Performance test error:", (error as Error).message);
  }

  // 5. Demonstrate application logger
  console.log("\n📝 Application Event Logging Examples:");
  
  logger.info({
    event: "user_action",
    action: "facility_created",
    facilityId: 123,
    userId: 456,
    metadata: {
      source: "admin_panel",
      timestamp: new Date().toISOString(),
    }
  }, "New facility created by administrator");

  logger.warn({
    event: "security_alert",
    alert: "multiple_failed_logins",
    attempts: 5,
    ip: "192.168.1.100",
    username: "admin",
  }, "Multiple failed login attempts detected");

  logger.error({
    event: "system_error",
    component: "database",
    operation: "connection_pool",
    error: "Connection pool exhausted",
    poolSize: 10,
    activeConnections: 10,
  }, "Database connection pool exhausted");

  console.log("✅ Application events logged with structured data");

  // 6. Database query logging example
  console.log("\n🗄️ Database Query Logging Example:");
  const { logDatabaseQuery } = await import("./middleware/structured-logger");
  
  logDatabaseQuery(
    "SELECT * FROM facilities WHERE status = $1 AND created_at > $2",
    ["active", "2025-01-01"],
    250 // 250ms query time
  );

  // 7. External API logging example
  console.log("\n🌐 External API Logging Example:");
  const { logExternalApiCall } = await import("./middleware/structured-logger");
  
  logExternalApiCall("CMS", "GET", "https://data.cms.gov/api/1/datastore/query", 1500);
  logExternalApiCall("NPI", "GET", "https://npiregistry.cms.hhs.gov/api", 800, new Error("Rate limit exceeded"));

  console.log("\n🎉 Structured Logging Demonstration Complete!");
  console.log("\nKey Features Demonstrated:");
  console.log("• Request ID correlation for end-to-end tracing");
  console.log("• Health check monitoring with detailed system status");
  console.log("• Performance monitoring with slow request detection");
  console.log("• Error tracking with full context and stack traces");
  console.log("• Structured application event logging");
  console.log("• Database query performance logging");
  console.log("• External API call monitoring");
  console.log("\nView logs in Replit Console tab to see structured output!");
}

// Run demonstration
demonstrateStructuredLogging().catch(console.error);