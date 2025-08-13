import { Router } from "express";
import { requireAuth } from "./auth.routes";
import type { IStorage } from "../storage";
import { db } from "../db";
import { notifications, shifts } from "@shared/schema";

export function createShiftRequestRoutes(storage: IStorage) {
  const router = Router();

  // Create a shift request
  router.post("/", requireAuth, async (req, res) => {
    try {
      const { shiftId, message } = req.body;
      const staffId = req.user?.staffId || req.user?.id;
      
      if (!staffId) {
        return res.status(400).json({ error: "Staff ID not found" });
      }
      
      const request = await storage.createShiftRequest(shiftId, staffId, message);
      
      // Create notification for facility manager
      const shift = await storage.getShift(shiftId);
      if (shift) {
        await db.insert(notifications).values({
          userId: shift.createdById,
          type: "shift_request",
          title: "New Shift Request",
          message: `New request for shift: ${shift.title}`,
          link: `/shifts/requests`,
          read: false,
          createdAt: new Date()
        });
      }
      
      res.json(request);
    } catch (error) {
      console.error("Error creating shift request:", error);
      res.status(500).json({ error: "Failed to create shift request" });
    }
  });

  // Get shift requests for a facility
  router.get("/facility/:facilityId", requireAuth, async (req, res) => {
    try {
      const facilityId = parseInt(req.params.facilityId);
      const status = req.query.status as string;
      
      const requests = await storage.getShiftRequestsByFacility(facilityId, status);
      res.json(requests);
    } catch (error) {
      console.error("Error fetching facility shift requests:", error);
      res.status(500).json({ error: "Failed to fetch shift requests" });
    }
  });

  // Get shift requests for current staff member
  router.get("/my", requireAuth, async (req, res) => {
    try {
      const staffId = req.user?.staffId || req.user?.id;
      
      if (!staffId) {
        return res.status(400).json({ error: "Staff ID not found" });
      }
      
      const requests = await storage.getShiftRequestsByStaff(staffId);
      res.json(requests);
    } catch (error) {
      console.error("Error fetching staff shift requests:", error);
      res.status(500).json({ error: "Failed to fetch shift requests" });
    }
  });

  // Approve a shift request
  router.post("/:id/approve", requireAuth, async (req, res) => {
    try {
      const requestId = parseInt(req.params.id);
      const decidedBy = req.user?.id;
      
      if (!decidedBy) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const approved = await storage.approveShiftRequest(requestId, decidedBy);
      
      if (!approved) {
        return res.status(404).json({ error: "Request not found" });
      }
      
      // Create notification for staff member
      await db.insert(notifications).values({
        userId: approved.staffId,
        type: "shift_approved",
        title: "Shift Request Approved",
        message: "Your shift request has been approved",
        link: `/shifts/${approved.shiftId}`,
        read: false,
        createdAt: new Date()
      });
      
      res.json({ success: true, request: approved });
    } catch (error) {
      console.error("Error approving shift request:", error);
      res.status(500).json({ error: "Failed to approve shift request" });
    }
  });

  // Reject a shift request
  router.post("/:id/reject", requireAuth, async (req, res) => {
    try {
      const requestId = parseInt(req.params.id);
      const decidedBy = req.user?.id;
      
      if (!decidedBy) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const rejected = await storage.rejectShiftRequest(requestId, decidedBy);
      
      if (!rejected) {
        return res.status(404).json({ error: "Request not found" });
      }
      
      // Create notification for staff member
      await db.insert(notifications).values({
        userId: rejected.staffId,
        type: "shift_rejected",
        title: "Shift Request Rejected",
        message: "Your shift request has been rejected",
        link: `/shifts`,
        read: false,
        createdAt: new Date()
      });
      
      res.json({ success: true, request: rejected });
    } catch (error) {
      console.error("Error rejecting shift request:", error);
      res.status(500).json({ error: "Failed to reject shift request" });
    }
  });

  return router;
}