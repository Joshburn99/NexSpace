import express, { type Request, type Response, type NextFunction } from "express";
import { registerRoutes } from "./routes/index";
import { setupVite, serveStatic, log } from "./vite";
import { createEnhancedStaffProfiles } from "./enhanced-staff-data";
import { generateComprehensiveSampleData } from "./sample-data-generator";
import { setupFacilityUserRoleTemplates } from "./facility-user-roles-setup";
import { initializeTimeOffData } from "./init-timeoff-data";
import { config, validateConfig } from "./config";

(async () => {
  // Validate configuration on startup
  validateConfig();
  
  /* ---------------------------------------------------------------------- */
  /*  1.  APP & MIDDLEWARE                                                 */
  /* ---------------------------------------------------------------------- */
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  // Simple request-duration logger for /api routes
  app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;
    let captured: unknown;

    const originalJson = res.json.bind(res);
    res.json = (body, ...args) => {
      captured = body;
      return originalJson(body, ...args);
    };

    res.on("finish", () => {
      if (!path.startsWith("/api")) return;
      const ms = Date.now() - start;
      let line = `${req.method} ${path} ${res.statusCode} in ${ms}ms`;
      if (captured) line += ` :: ${JSON.stringify(captured)}`;
      if (line.length > 80) line = `${line.slice(0, 79)}…`;
      log(line);
    });

    next();
  });

  /* ---------------------------------------------------------------------- */
  /*  2.  ONE-OFF INITIALISATION TASKS                                     */
  /* ---------------------------------------------------------------------- */
  // Initialize each component separately with individual error handling
  try {
    await setupFacilityUserRoleTemplates();
    log("Facility user role templates initialized");
  } catch (err) {
    log(`Warning: Facility role templates failed to initialize: ${err instanceof Error ? err.message : err}`);
  }

  try {
    await initializeTimeOffData();
    log("Time-off data initialized");
  } catch (err) {
    log(`Warning: Time-off data failed to initialize: ${err instanceof Error ? err.message : err}`);
  }

  // Uncomment if/when schema is stable
  // try {
  //   await createEnhancedStaffProfiles();
  //   log("Enhanced staff profiles created");
  // } catch (err) {
  //   log(`Warning: Enhanced staff profiles failed: ${err instanceof Error ? err.message : err}`);
  // }

  // try {
  //   await generateComprehensiveSampleData();
  //   log("Sample data generated");
  // } catch (err) {
  //   log(`Warning: Sample data generation failed: ${err instanceof Error ? err.message : err}`);
  // }

  /* ---------------------------------------------------------------------- */
  /*  3.  ROUTES & ASSETS                                                  */
  /* ---------------------------------------------------------------------- */
  let server: any;
  try {
    server = await registerRoutes(app); // returns the http.Server instance
    log("Routes registered successfully");
  } catch (err) {
    log(`Route registration error: ${err instanceof Error ? err.message : err}`);
    // Create a basic HTTP server if route registration fails
    const { createServer } = await import("http");
    server = createServer(app);
  }

  // Error handler (must be after routes)
  app.use(
    (err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      res.status(status).json({ message: err.message || "Internal Server Error" });
      log(`Unhandled error → ${status} :: ${err.message}`);
    }
  );

  if (app.get("env") === "development") {
    // Vite dev server middleware
    await setupVite(app, server);
  } else {
    // Static build in production
    serveStatic(app);
  }

  /* ---------------------------------------------------------------------- */
  /*  4.  START LISTENING                                                  */
  /* ---------------------------------------------------------------------- */
  const PORT = config.server.port;
  server.listen(PORT, "0.0.0.0", () => log(`🚀  Server listening on ${PORT}`));
})().catch((err) => {

  process.exit(1);
});