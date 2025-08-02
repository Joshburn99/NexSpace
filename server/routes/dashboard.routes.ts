import { Router } from "express";
import { storage } from "../storage";
import { handleImpersonation, requireAuth } from "./auth.routes";

const router = Router();

// Dashboard API - Enhanced with comprehensive statistics and facility filtering
router.get(
  "/api/dashboard/stats",
  requireAuth,
  handleImpersonation,
  async (req: any, res) => {
    try {
      console.log(`[/api/dashboard/stats] User:`, {
        id: req.user?.id,
        role: req.user?.role,
        email: req.user?.email,
        associatedFacilityIds: req.user?.associatedFacilityIds,
        associatedFacilities: req.user?.associatedFacilities,
        facilityId: req.user?.facilityId,
      });

      // Get facility IDs for filtering based on user role
      let facilityIds: number[] | undefined;

      if (req.user.role === "super_admin") {
        // Super admin sees all data (undefined = no filtering)
        console.log(`[/api/dashboard/stats] Super admin - no filtering`);
      } else {
        // For facility users, filter by their associated facilities
        // Check associatedFacilityIds first (set by impersonation), then associatedFacilities
        const associatedFacilities =
          req.user?.associatedFacilityIds || req.user?.associatedFacilities;
        const singleFacility = req.user?.facilityId;

        if (associatedFacilities && associatedFacilities.length > 0) {
          facilityIds = associatedFacilities;
          console.log(`[/api/dashboard/stats] Using associated facilities:`, facilityIds);
        } else if (singleFacility) {
          facilityIds = [singleFacility];
          console.log(`[/api/dashboard/stats] Using single facility:`, facilityIds);
        } else {
          facilityIds = []; // Empty array means no data visible
          console.log(`[/api/dashboard/stats] No facility access - empty results`);
        }
      }

      // Get comprehensive dashboard stats with facility filtering
      const stats = await storage.getDashboardStats(facilityIds);
      console.log(`[/api/dashboard/stats] Stats retrieved:`, {
        activeStaff: stats.activeStaff,
        openShifts: stats.openShifts,
        totalFacilities: stats.totalFacilities,
      });

      res.json(stats);
    } catch (error) {
      console.error(`[/api/dashboard/stats] Error:`, error);
      res.status(500).json({ error: "Failed to fetch dashboard statistics" });
    }
  }
);

// Dashboard widget configuration API - temporarily disabled
router.get("/api/dashboard/widgets", requireAuth, handleImpersonation, async (req: any, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    // Return empty widgets array for now
    res.json([]);
  } catch (error) {
    console.error(`[/api/dashboard/widgets] Error:`, error);
    res.status(500).json({ error: "Failed to fetch dashboard widgets" });
  }
});

router.post("/api/dashboard/widgets", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    // Return success for now
    res.json({ success: true, message: "Dashboard layout saved successfully" });
  } catch (error) {
    console.error(`[/api/dashboard/widgets] Error:`, error);
    res.status(500).json({ error: "Failed to save dashboard widgets" });
  }
});

router.get("/api/dashboard/recent-activity", requireAuth, handleImpersonation, async (req: any, res) => {
  try {
    const facilityId = req.user.facilityId;
    if (!facilityId) {
      return res.status(400).json({ message: "User not assigned to a facility" });
    }

    const limit = parseInt(req.query.limit as string) || 10;
    const activity = await storage.getRecentActivity(facilityId, limit);
    res.json(activity);
  } catch (error) {
    console.error(`[/api/dashboard/recent-activity] Error:`, error);
    res.status(500).json({ message: "Failed to fetch recent activity" });
  }
});

export default router;