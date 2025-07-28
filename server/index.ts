import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { exec } from "child_process";
import { createEnhancedStaffProfiles } from "./enhanced-staff-data";
import { generateComprehensiveSampleData } from "./sample-data-generator";
import { setupFacilityUserRoleTemplates } from "./facility-user-roles-setup";
import { initializeTimeOffData } from "./init-timeoff-data";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Function to kill port 5000 before starting
function killPort5000() {
  return new Promise<void>((resolve) => {
    exec("npx kill-port 5000", (error) => {
      if (error) {
        log("No process on port 5000 to kill");
      } else {
        log("Killed process on port 5000");
      }
      // Add longer delay to ensure port is fully released
      setTimeout(resolve, 2000);
    });
  });
}

(async () => {
  // Kill any existing process on port 5000
  await killPort5000();

  // Initialize enhanced staff profiles on startup
  try {
    await setupFacilityUserRoleTemplates();
    // Initialize time-off data
    await initializeTimeOffData();
    log("Time-off data initialized successfully");
    // Temporarily disable enhanced staff data creation until schema is fixed
    // await createEnhancedStaffProfiles();
    // Temporarily disable sample data generation to prevent database errors
    // await generateComprehensiveSampleData();
  } catch (error) {
    log(`Enhanced staff profiles initialization error: ${error}`);
  }

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Use environment PORT or fallback to 5000
  // this serves both the API and the client.
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 5000;

  server.on("error", (err: any) => {
    if (err.code === "EADDRINUSE") {
      console.error(`Port ${PORT} is already in use. Attempting to kill process and retry...`);
      killPort5000().then(() => {
        setTimeout(() => {
          server.listen(
            {
              port: PORT,
              host: "0.0.0.0",
              reusePort: true,
            },
            () => {
              log(`serving on port ${PORT}`);
            }
          );
        }, 1000);
      });
    } else {
      console.error("Server error:", err);
      process.exit(1);
    }
  });

  server.listen(
    {
      port: PORT,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${PORT}`);
    }
  );
})();
