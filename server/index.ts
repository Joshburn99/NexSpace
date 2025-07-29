import express, { type Request, type Response, type NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { createEnhancedStaffProfiles } from "./enhanced-staff-data";
import { generateComprehensiveSampleData } from "./sample-data-generator";
import { setupFacilityUserRoleTemplates } from "./facility-user-roles-setup";
import { initializeTimeOffData } from "./init-timeoff-data";

(async () => {
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
  try {
    await setupFacilityUserRoleTemplates();
    await initializeTimeOffData();
    log("Time-off data initialized");

    // Uncomment if/when schema is stable
    // await createEnhancedStaffProfiles();
    // await generateComprehensiveSampleData();
  } catch (err) {
    log(`Initialisation error: ${err instanceof Error ? err.message : err}`);
  }

  /* ---------------------------------------------------------------------- */
  /*  3.  ROUTES & ASSETS                                                  */
  /* ---------------------------------------------------------------------- */
  const server = await registerRoutes(app); // returns the http.Server instance

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
  const PORT = Number(process.env.PORT) || 5000;
  server.listen(PORT, "0.0.0.0", () => log(`🚀  Server listening on ${PORT}`));
})().catch((err) => {
  console.error("Fatal startup error:", err);
  process.exit(1);
});