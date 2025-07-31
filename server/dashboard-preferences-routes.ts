import { Router } from "express";
import { Request, Response, NextFunction } from "express";

// Middleware to require authentication
const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
};

const router = Router();

// Store dashboard preferences in memory for now (should be persisted to database)
const dashboardPreferences = new Map<number, any>();

// Get user dashboard preferences
router.get("/api/user/dashboard-preferences", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const preferences = dashboardPreferences.get(userId) || {
      widgets: [],
    };

    res.json(preferences);
  } catch (error) {

    res.status(500).json({ error: "Failed to fetch dashboard preferences" });
  }
});

// Save user dashboard preferences
router.post("/api/user/dashboard-preferences", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { widgets } = req.body;

    // Validate widget data
    if (!Array.isArray(widgets)) {
      return res.status(400).json({ error: "Invalid widget configuration" });
    }

    const preferences = {
      widgets,
      updatedAt: new Date().toISOString(),
    };

    // Store in memory (should be persisted to database using dashboard_preferences column)
    dashboardPreferences.set(userId, preferences);

    res.json({ success: true, preferences });
  } catch (error) {

    res.status(500).json({ error: "Failed to save dashboard preferences" });
  }
});

export default router;
