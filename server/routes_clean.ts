import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { z } from "zod";
import {
  insertJobSchema,
  insertShiftSchema,
  insertShiftTemplateSchema,
  insertGeneratedShiftSchema,
  shifts,
  generatedShifts,
  shiftTemplates,
  facilities,
  users,
} from "@shared/schema";
import { db } from "./db";
import { eq, sql } from "drizzle-orm";
import { UnifiedDataService } from "./unified-data-service";

export function registerRoutes(app: Express): Server {
  // Setup authentication routes
  setupAuth(app);

  // Helper functions
  const requireAuth = (req: any, res: any, next: any) => {
    if (req.user) {
      next();
    } else {
      res.status(401).json({ message: "Authentication required" });
    }
  };

  // Initialize unified data service
  const unifiedDataService = new UnifiedDataService();

  // Basic shifts endpoint
  app.get("/api/shifts", async (req, res) => {
    try {
      const dbShifts = await db.select().from(generatedShifts);
      res.json(dbShifts);
    } catch (error) {
      console.error("Error fetching shifts:", error);
      res.status(500).json({ message: "Failed to fetch shifts" });
    }
  });

  // WebSocket setup
  const server = createServer(app);
  const wss = new WebSocketServer({ server });

  wss.on("connection", (ws: WebSocket) => {
    console.log("Client connected");
    ws.on("close", () => {
      console.log("Client disconnected");
    });
  });

  return server;
}