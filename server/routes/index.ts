import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { setupAuth } from "../auth";
import { unifiedDataService } from "../unified-data-service";

// Import route modules
import authRoutes, { handleImpersonation } from "./auth.routes";
import facilitiesRoutes from "./facilities.routes";
import facilityUsersRoutes from "./facility-users.routes";
import shiftsRoutes from "./shifts.routes";
import staffRoutes from "./staff.routes";
import dashboardRoutes from "./dashboard.routes";
import healthRoutes from "./health.routes";
import dashboardPreferencesRoutes from "../dashboard-preferences-routes";
import calendarSyncRoutes from "../calendar-sync-routes";
import { createCredentialsRoutes } from "./credentials.routes";
import { createShiftRequestRoutes } from "./shift-requests.routes";
import calendarRoutes from "./calendar.routes";
import shiftTemplatesRoutes from "./shift-templates.routes";
import { storage } from "../storage";

// Track authenticated WebSocket connections
const userConnections = new Map<number, Set<WebSocket>>();

export function registerRoutes(app: Express): Server {
  // Development-only /api/me stub
  if (process.env.NODE_ENV === 'development') {
    app.get('/api/me', (req, res) => {
      // Check if there's an existing session first
      if (req.session?.userId || req.user) {
        // Use existing auth if available
        return res.json({
          user: req.user || { id: req.session.userId, role: 'super_admin' },
          permissions: ["dashboard.view", "shift.view", "timesheet.view", "staff.view", "analytics.view"]
        });
      }
      // Fallback dev user if no session
      res.json({
        user: { id: "dev", name: "Dev User", role: "super_admin" },
        permissions: ["dashboard.view", "shift.view", "timesheet.view", "staff.view", "analytics.view"]
      });
    });
  }

  // Setup authentication routes with handleImpersonation middleware
  setupAuth(app, handleImpersonation);

  // Register route modules
  app.use(authRoutes);
  app.use(facilitiesRoutes);
  app.use("/api/facility-users", facilityUsersRoutes);
  app.use(shiftsRoutes);
  app.use(staffRoutes);
  app.use(dashboardRoutes);
  app.use(healthRoutes);
  
  // Dashboard preferences routes
  app.use(dashboardPreferencesRoutes);
  
  // Calendar sync routes
  app.use("/api/calendar-sync", calendarSyncRoutes);
  
  // Calendar API routes
  app.use(calendarRoutes);
  
  // Shift templates routes
  app.use(shiftTemplatesRoutes);
  
  // MVP routes for credentials and shift requests
  app.use("/api/credentials", createCredentialsRoutes(storage));
  app.use("/api/shift-requests", createShiftRequestRoutes(storage));

  // Create HTTP server
  const httpServer = createServer(app);

  // WebSocket setup for real-time messaging
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  // Set WebSocket server on the existing unified data service instance
  unifiedDataService.setWebSocketServer(wss);

  wss.on("connection", (ws: WebSocket & { userId?: number; isAlive?: boolean }, req) => {
    // Set up heartbeat to detect disconnected clients
    ws.isAlive = true;
    ws.on("pong", () => {
      ws.isAlive = true;
    });

    ws.on("message", async (data) => {
      try {
        const message = JSON.parse(data.toString());

        // Handle different message types
        switch (message.type) {
          case "authenticate":
            // Authenticate WebSocket connection with user ID
            if (message.userId && typeof message.userId === "number") {
              ws.userId = message.userId;

              // Add to user connections map
              if (!userConnections.has(message.userId)) {
                userConnections.set(message.userId, new Set());
              }
              userConnections.get(message.userId)!.add(ws);

              ws.send(
                JSON.stringify({
                  type: "authenticated",
                  userId: message.userId,
                })
              );
            }
            break;

          case "new_message":
            // Handle new message
            if (ws.userId && message.data) {
              unifiedDataService.broadcastMessage(message.data);
            }
            break;

          case "shift_update":
            // Handle shift update
            if (ws.userId && message.data) {
              unifiedDataService.broadcastShiftUpdate(
                message.data.shiftId,
                message.data.updateType,
                message.data
              );
            }
            break;

          case "ping":
            ws.send(JSON.stringify({ type: "pong" }));
            break;
        }
      } catch (error) {
        console.error("WebSocket message error:", error);
      }
    });

    ws.on("close", () => {
      // Remove from user connections
      if (ws.userId && userConnections.has(ws.userId)) {
        userConnections.get(ws.userId)!.delete(ws);
        if (userConnections.get(ws.userId)!.size === 0) {
          userConnections.delete(ws.userId);
        }
      }
    });

    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
    });
  });

  // Heartbeat interval to detect disconnected clients
  const interval = setInterval(() => {
    wss.clients.forEach((ws: WebSocket & { isAlive?: boolean }) => {
      if (ws.isAlive === false) {
        return ws.terminate();
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on("close", () => {
    clearInterval(interval);
  });

  // System health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      connections: wss.clients.size,
    });
  });

  return httpServer;
}