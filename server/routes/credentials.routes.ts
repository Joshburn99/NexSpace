import { Router } from "express";
import { db } from "../db";
import { requireAuth } from "./auth.routes";
import type { IStorage } from "../storage";
import { credentials } from "@shared/schema";
import { eq } from "drizzle-orm";

export function createCredentialsRoutes(storage: IStorage) {
  const router = Router();

  // Get credentials for a staff member
  router.get("/staff/:staffId", requireAuth, async (req, res) => {
    try {
      const staffId = parseInt(req.params.staffId);
      const staffCredentials = await storage.getStaffCredentials(staffId);
      res.json(staffCredentials);
    } catch (error) {
      console.error("Error fetching staff credentials:", error);
      res.status(500).json({ error: "Failed to fetch credentials" });
    }
  });

  // Get current user's credentials
  router.get("/my", requireAuth, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const userCredentials = await storage.getUserCredentials(userId);
      res.json(userCredentials);
    } catch (error) {
      console.error("Error fetching user credentials:", error);
      res.status(500).json({ error: "Failed to fetch credentials" });
    }
  });

  // Get expiring credentials
  router.get("/expiring", requireAuth, async (req, res) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const expiringCreds = await storage.getExpiringCredentials(days);
      res.json(expiringCreds);
    } catch (error) {
      console.error("Error fetching expiring credentials:", error);
      res.status(500).json({ error: "Failed to fetch expiring credentials" });
    }
  });

  // Create new credential
  router.post("/", requireAuth, async (req, res) => {
    try {
      const credentialData = {
        ...req.body,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const newCredential = await storage.createCredential(credentialData);
      res.json(newCredential);
    } catch (error) {
      console.error("Error creating credential:", error);
      res.status(500).json({ error: "Failed to create credential" });
    }
  });

  // Update credential status (verify/reject)
  router.patch("/:id/status", requireAuth, async (req, res) => {
    try {
      const credentialId = parseInt(req.params.id);
      const { status } = req.body;
      const verifierId = req.user?.id;
      
      if (!["verified", "pending", "expired", "rejected"].includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }
      
      const updatedCredential = await storage.updateCredentialStatus(
        credentialId,
        status,
        verifierId
      );
      
      if (!updatedCredential) {
        return res.status(404).json({ error: "Credential not found" });
      }
      
      res.json(updatedCredential);
    } catch (error) {
      console.error("Error updating credential status:", error);
      res.status(500).json({ error: "Failed to update credential status" });
    }
  });

  // Upload credential document
  router.post("/:id/upload", requireAuth, async (req, res) => {
    try {
      const credentialId = parseInt(req.params.id);
      const { fileUrl } = req.body;
      
      const [updated] = await db
        .update(credentials)
        .set({ fileUrl, updatedAt: new Date() })
        .where(eq(credentials.id, credentialId))
        .returning();
        
      res.json(updated);
    } catch (error) {
      console.error("Error uploading credential document:", error);
      res.status(500).json({ error: "Failed to upload document" });
    }
  });

  return router;
}