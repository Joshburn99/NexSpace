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
import { validateEnv, logEnvInventory } from "./config/env";
import swaggerUi from "swagger-ui-express";
import { loadOpenAPISpec, swaggerOptions } from "./swagger-config";
import { 
  requestIdMiddleware as oldRequestIdMiddleware, 
  loggingMiddleware, 
  errorLoggingMiddleware as oldErrorLoggingMiddleware 
} from "./middleware/logger";
import { globalErrorHandler, notFoundHandler } from "./middleware/error-handler";
import { 
  requestIdMiddleware,
  requestLoggingMiddleware,
  errorLoggingMiddleware,
  centralizedErrorHandler,
  performanceLoggingMiddleware,
  applicationLogger
} from "./middleware/structured-logger";
import healthRoutes from "./routes/health.routes";
import os from "os";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import cors from "cors";
import { sessionSweeper } from "./services/session-sweeper";

(async () => {
  // Validate environment variables
  validateEnv();
  logEnvInventory();
  
  // Validate configuration on startup
  validateConfig();
  
  /* ---------------------------------------------------------------------- */
  /*  1.  APP & MIDDLEWARE                                                 */
  /* ---------------------------------------------------------------------- */
  const app = express();
  app.set('trust proxy', 1); // Trust first proxy (Replit's proxy)
  
  // Security middleware - configure for development with Vite HMR
  if (process.env.NODE_ENV === 'development') {
    app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "blob:", "https:"],
          connectSrc: ["'self'", "ws:", "wss:", "http:", "https:"],
          fontSrc: ["'self'", "data:"],
        },
      },
      crossOriginEmbedderPolicy: false, // Disable COEP for development
    }));
  } else {
    // Production helmet configuration - stricter
    app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", "wss:", "https:"],
          fontSrc: ["'self'"],
        },
      },
    }));
  }
  // Configure CORS for Replit environment
  const replitUrl = process.env.REPL_SLUG && process.env.REPL_OWNER 
    ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`
    : 'http://localhost:5000';
  
  app.use(cors({
    origin: function(origin, callback) {
      const allowedOrigins = [
        replitUrl,
        'http://localhost:5000',
        'http://localhost:3000',
        ...(process.env.CORS_ORIGIN ? [process.env.CORS_ORIGIN] : [])
      ];
      
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) return callback(null, true);
      
      // Check exact match or Replit pattern
      if (allowedOrigins.includes(origin) || 
          origin.match(/^https:\/\/.*\.replit\.(app|dev)$/)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  }));
  
  console.log(`CORS configured for origin: ${replitUrl}`);
  
  // Rate limiting
  const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
    message: 'Too many requests from this IP, please try again later.',
  });
  app.use('/api', limiter);
  
  // Structured logging middleware
  app.use(requestIdMiddleware);
  app.use(requestLoggingMiddleware);
  app.use(performanceLoggingMiddleware);
  
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
  /*  4.  DEBUG ROUTES                                                     */
  /* ---------------------------------------------------------------------- */
  // Add debug authentication test page route
  app.get('/debug/auth', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Authentication Debug</title>
        <style>
          body { font-family: sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
          .section { margin: 20px 0; padding: 20px; border: 1px solid #ccc; border-radius: 5px; }
          button { padding: 10px 20px; margin: 5px; cursor: pointer; }
          pre { background: #f4f4f4; padding: 10px; overflow: auto; }
          .success { color: green; }
          .error { color: red; }
        </style>
      </head>
      <body>
        <h1>NexSpace Authentication Debug</h1>
        
        <div class="section">
          <h2>Login Test</h2>
          <div>
            <input type="text" id="username" placeholder="Username" value="super_admin" />
            <input type="password" id="password" placeholder="Password" value="admin123" />
            <button onclick="testLogin()">Test Login</button>
          </div>
          <pre id="loginResult"></pre>
        </div>
        
        <div class="section">
          <h2>Check Auth Status</h2>
          <button onclick="checkAuth()">Check /api/users/me</button>
          <pre id="authResult"></pre>
        </div>
        
        <div class="section">
          <h2>Test Logout</h2>
          <button onclick="testLogout()">Test Logout</button>
          <pre id="logoutResult"></pre>
        </div>

        <script>
          async function testLogin() {
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            try {
              const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ username, password })
              });
              const data = await response.json();
              document.getElementById('loginResult').innerHTML = 
                '<span class="' + (response.ok ? 'success' : 'error') + '">Status: ' + response.status + '</span>\\n' + 
                JSON.stringify(data, null, 2);
            } catch (error) {
              document.getElementById('loginResult').innerHTML = '<span class="error">Error: ' + error.message + '</span>';
            }
          }
          
          async function checkAuth() {
            try {
              const response = await fetch('/api/users/me', {
                credentials: 'include'
              });
              const data = await response.text();
              try {
                const json = JSON.parse(data);
                document.getElementById('authResult').innerHTML = 
                  '<span class="' + (response.ok ? 'success' : 'error') + '">Status: ' + response.status + '</span>\\n' + 
                  JSON.stringify(json, null, 2);
              } catch {
                document.getElementById('authResult').innerHTML = 
                  '<span class="' + (response.ok ? 'success' : 'error') + '">Status: ' + response.status + '</span>\\n' + data;
              }
            } catch (error) {
              document.getElementById('authResult').innerHTML = '<span class="error">Error: ' + error.message + '</span>';
            }
          }
          
          async function testLogout() {
            try {
              const response = await fetch('/api/logout', {
                method: 'POST',
                credentials: 'include'
              });
              document.getElementById('logoutResult').innerHTML = 
                '<span class="' + (response.ok ? 'success' : 'error') + '">Status: ' + response.status + '</span>\\n' +
                (response.ok ? 'Logged out successfully' : 'Logout failed');
            } catch (error) {
              document.getElementById('logoutResult').innerHTML = '<span class="error">Error: ' + error.message + '</span>';
            }
          }
        </script>
      </body>
      </html>
    `);
  });

  /* ---------------------------------------------------------------------- */
  /*  5.  API ROUTES & ASSETS                                              */
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

  // Add structured error logging middleware
  app.use(errorLoggingMiddleware);

  if (app.get("env") === "development") {
    // Vite dev server middleware (handles SPA fallback)
    await setupVite(app, server);
  } else {
    // Static build in production
    serveStatic(app);
  }

  // Error handlers (must be after all other middleware and routes)
  app.use(centralizedErrorHandler);
  app.use(globalErrorHandler);
  // Only apply notFoundHandler for API routes
  app.use('/api', notFoundHandler);

  /* ---------------------------------------------------------------------- */
  /*  5.  START LISTENING                                                  */
  /* ---------------------------------------------------------------------- */
  const PORT = config.server.port;
  server.listen(PORT, "0.0.0.0", () => {
    applicationLogger.info({
      port: PORT,
      environment: process.env.NODE_ENV || "development",
      version: "1.0.0",
      pid: process.pid,
      hostname: os.hostname(),
    }, `🚀 NexSpace server started successfully on port ${PORT}`);
    
    // Start session sweeper
    sessionSweeper.start(60 * 60 * 1000); // Run every hour
    
    // Keep the original log for backward compatibility
    log(`🚀  Server listening on ${PORT}`);
  });
})().catch((err) => {

  process.exit(1);
});