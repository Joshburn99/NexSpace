import dotenv from "dotenv";
// Load environment variables first
dotenv.config();

import express, { type Request, type Response, type NextFunction } from "express";
import { registerRoutes } from "./routes/index";
import { setupVite, serveStatic, log } from "./vite";
import { createEnhancedStaffProfiles } from "./enhanced-staff-data";
import { generateComprehensiveSampleData } from "./sample-data-generator";
import { setupFacilityUserRoleTemplates } from "./facility-user-roles-setup";
import { initializeTimeOffData } from "./init-timeoff-data";
import { config, validateConfig } from "./config";
import swaggerUi from "swagger-ui-express";
import { loadOpenAPISpec, swaggerOptions } from "./swagger-config";
import { requestIdMiddleware, loggingMiddleware, errorLoggingMiddleware } from "./middleware/logger";
import { globalErrorHandler, notFoundHandler } from "./middleware/error-handler";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import cors from "cors";

(async () => {
  // Validate configuration on startup
  validateConfig();
  
  /* ---------------------------------------------------------------------- */
  /*  1.  APP & MIDDLEWARE                                                 */
  /* ---------------------------------------------------------------------- */
  const app = express();
  
  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: false, // Disable for development
  }));
  // Configure CORS for development
  app.use(cors({
    origin: [
      'http://localhost:5000',
      'http://localhost:3000',
      'https://*.replit.app',
      'https://*.replit.dev',
      ...(process.env.CORS_ORIGIN ? [process.env.CORS_ORIGIN] : [])
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  }));
  
  // Rate limiting
  const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
    message: 'Too many requests from this IP, please try again later.',
  });
  app.use('/api', limiter);
  
  // Logging middleware
  app.use(requestIdMiddleware);
  app.use(loggingMiddleware);
  
  // Body parsing
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
  /*  3.  API DOCUMENTATION                                                */
  /* ---------------------------------------------------------------------- */
  try {
    const openApiSpec = loadOpenAPISpec();
    
    // Swagger UI documentation at /docs
    app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec, swaggerOptions));
    
    // Also serve at /api-docs for backward compatibility
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiSpec, swaggerOptions));
    
    // Raw OpenAPI spec endpoint
    app.get('/api/openapi.json', (req, res) => {
      res.json(openApiSpec);
    });
    
    log("API documentation configured at /docs and /api-docs");
  } catch (err) {
    log(`Warning: API documentation setup failed: ${err instanceof Error ? err.message : err}`);
  }

  /* ---------------------------------------------------------------------- */
  /*  4.  ROUTES & ASSETS                                                  */
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

  // Add error logging middleware
  app.use(errorLoggingMiddleware);

  if (app.get("env") === "development") {
    // Vite dev server middleware
    await setupVite(app, server);
  } else {
    // Static build in production
    serveStatic(app);
  }

  // Error handlers (must be after all other middleware and routes)
  app.use(globalErrorHandler);
  // Only apply notFoundHandler for API routes
  app.use('/api', notFoundHandler);

  /* ---------------------------------------------------------------------- */
  /*  5.  START LISTENING                                                  */
  /* ---------------------------------------------------------------------- */
  const PORT = config.server.port;
  server.listen(PORT, "0.0.0.0", () => log(`🚀  Server listening on ${PORT}`));
})().catch((err) => {

  process.exit(1);
});