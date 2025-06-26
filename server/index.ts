import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { exec } from "child_process";
import { createEnhancedStaffProfiles } from "./enhanced-staff-data";
import { DailyShiftGenerator } from "./daily-shift-generator";

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
      // Add delay to ensure port is fully released
      setTimeout(resolve, 1000);
    });
  });
}

(async () => {
  // Kill any existing process on port 5000
  await killPort5000();

  // Initialize enhanced staff profiles on startup
  try {
    await createEnhancedStaffProfiles();
  } catch (error) {
    log("Enhanced staff profiles initialization:", error);
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
  server.listen(
    {
      port: PORT,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      console.log(`Server running on port ${PORT}`);

  // Initialize shift generation on startup
  setTimeout(async () => {
    try {
      console.log('[STARTUP] Initializing daily shift generation...');
      await DailyShiftGenerator.generateDailyShifts();
    } catch (error) {
      console.error('[STARTUP] Failed to initialize shift generation:', error);
    }
  }, 5000); // Wait 5 seconds for server to fully start

  // Set up daily shift generation (runs every 24 hours)
  setInterval(async () => {
    try {
      console.log('[SCHEDULER] Running daily shift generation...');
      await DailyShiftGenerator.generateDailyShifts();
    } catch (error) {
      console.error('[SCHEDULER] Daily shift generation failed:', error);
    }
  }, 24 * 60 * 60 * 1000); // 24 hours
}
  );
})();