/**
 * Health check routes for monitoring and status validation
 */

import { Router, Request, Response } from "express";
import { db } from "../db";
import { logger } from "../middleware/structured-logger";
import { sql } from "drizzle-orm";
import fs from "fs";
import path from "path";

const router = Router();

// Get application version from package.json
let applicationVersion = "unknown";
try {
  const packagePath = path.join(process.cwd(), "package.json");
  const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));
  applicationVersion = packageJson.version || "unknown";
} catch (error) {
  logger.warn("Could not read application version from package.json");
}

/**
 * Basic health check endpoint
 * GET /health
 */
router.get("/health", (req: Request, res: Response) => {
  res.json({
    ok: true,
    version: applicationVersion,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    uptime: process.uptime(),
  });
});

/**
 * Detailed health check with dependency validation
 * GET /health/detailed
 */
router.get("/health/detailed", async (req: Request, res: Response) => {
  const startTime = Date.now();
  const healthStatus: any = {
    ok: true,
    version: applicationVersion,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    uptime: process.uptime(),
    checks: {},
  };

  // Check database connectivity
  try {
    const dbStartTime = Date.now();
    await db.execute(sql`SELECT 1 as health_check`);
    healthStatus.checks.database = {
      ok: true,
      responseTime: `${Date.now() - dbStartTime}ms`,
      status: "connected",
    };
  } catch (error) {
    healthStatus.ok = false;
    healthStatus.checks.database = {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown database error",
      status: "disconnected",
    };
  }

  // Check memory usage
  const memUsage = process.memoryUsage();
  healthStatus.checks.memory = {
    ok: memUsage.heapUsed < memUsage.heapTotal * 0.9, // Alert if using >90% of heap
    heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
    heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
    external: `${Math.round(memUsage.external / 1024 / 1024)}MB`,
    rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
  };

  // Check environment variables
  const requiredEnvVars = ["DATABASE_URL", "JWT_SECRET"];
  const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
  
  healthStatus.checks.environment = {
    ok: missingEnvVars.length === 0,
    requiredVariables: requiredEnvVars.length,
    missingVariables: missingEnvVars.length,
    missing: missingEnvVars,
  };

  if (missingEnvVars.length > 0) {
    healthStatus.ok = false;
  }

  // Check external API configurations
  healthStatus.checks.externalApis = {
    cmsApiConfigured: !!process.env.CMS_API_KEY,
    sendgridConfigured: !!process.env.SENDGRID_API_KEY,
    googleClientConfigured: !!process.env.GOOGLE_CLIENT_ID,
  };

  // Overall response time
  healthStatus.responseTime = `${Date.now() - startTime}ms`;

  // Set appropriate HTTP status
  const statusCode = healthStatus.ok ? 200 : 503;
  
  // Log health check results
  req.logger.info({
    healthCheck: healthStatus,
    statusCode,
  }, "Health check performed");

  res.status(statusCode).json(healthStatus);
});

/**
 * Readiness probe - checks if application is ready to serve requests
 * GET /health/ready
 */
router.get("/health/ready", async (req: Request, res: Response) => {
  try {
    // Check database connection
    await db.execute(sql`SELECT 1 as readiness_check`);

    // Check critical environment variables
    const criticalEnvVars = ["DATABASE_URL", "JWT_SECRET"];
    const missingCriticalVars = criticalEnvVars.filter(envVar => !process.env[envVar]);

    if (missingCriticalVars.length > 0) {
      throw new Error(`Missing critical environment variables: ${missingCriticalVars.join(", ")}`);
    }

    res.json({
      ready: true,
      timestamp: new Date().toISOString(),
      version: applicationVersion,
    });

  } catch (error) {
    req.logger.error({ error }, "Readiness check failed");
    
    res.status(503).json({
      ready: false,
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : "Unknown readiness error",
    });
  }
});

/**
 * Liveness probe - simple check that the application is running
 * GET /health/live
 */
router.get("/health/live", (req: Request, res: Response) => {
  res.json({
    alive: true,
    timestamp: new Date().toISOString(),
    pid: process.pid,
    uptime: process.uptime(),
  });
});

/**
 * Metrics endpoint for monitoring tools
 * GET /health/metrics
 */
router.get("/health/metrics", (req: Request, res: Response) => {
  const metrics = {
    timestamp: new Date().toISOString(),
    process: {
      pid: process.pid,
      uptime: process.uptime(),
      version: process.version,
      platform: process.platform,
      arch: process.arch,
    },
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
    eventLoop: {
      // Add event loop lag if monitoring library is available
      lag: "Not monitored",
    },
    application: {
      version: applicationVersion,
      environment: process.env.NODE_ENV || "development",
      nodeVersion: process.version,
    },
  };

  res.json(metrics);
});

export default router;