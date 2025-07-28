import express from "express";
import { storage } from "./storage";
import { CalendarSyncService } from "./services/calendar-sync-service";

const router = express.Router();

// Authentication middleware
const requireAuth = (req: any, res: any, next: any) => {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
};
const calendarSyncService = new CalendarSyncService(storage);

// Get user's calendar sync status
router.get("/status", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;

    // Check if user has calendar feed token
    const feedToken = await storage.getUserCalendarFeedToken(userId);

    // Check if user has Google Calendar connected
    const googleTokens = await storage.getUserCalendarTokens(userId, "google");

    res.json({
      icalFeed: {
        enabled: !!feedToken,
        url: feedToken
          ? `${process.env.APP_URL || "http://localhost:5000"}/api/calendar-sync/ical/${feedToken}`
          : null,
      },
      googleCalendar: {
        connected: !!googleTokens,
      },
    });
  } catch (error) {
    console.error("Error fetching calendar sync status:", error);
    res.status(500).json({ message: "Failed to fetch calendar sync status" });
  }
});

// Enable/regenerate iCal feed token
router.post("/ical/enable", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;

    // Generate new token
    const token = calendarSyncService.generateCalendarToken(userId);

    // Save token to database
    await storage.saveUserCalendarFeedToken(userId, token);

    const feedUrl = `${process.env.APP_URL || "http://localhost:5000"}/api/calendar-sync/ical/${token}`;

    res.json({
      success: true,
      feedUrl,
      token,
    });
  } catch (error) {
    console.error("Error enabling iCal feed:", error);
    res.status(500).json({ message: "Failed to enable calendar feed" });
  }
});

// Disable iCal feed
router.post("/ical/disable", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;

    // Remove token from database
    await storage.saveUserCalendarFeedToken(userId, "");

    res.json({
      success: true,
      message: "Calendar feed disabled",
    });
  } catch (error) {
    console.error("Error disabling iCal feed:", error);
    res.status(500).json({ message: "Failed to disable calendar feed" });
  }
});

// Get iCal feed (public endpoint - authenticated by token)
router.get("/ical/:token", async (req, res) => {
  try {
    const { token } = req.params;

    // Find user by token
    const users = await storage.getAllUsers();
    const user = users.find((u) => u.calendarFeedToken === token);

    if (!user) {
      return res.status(404).json({ message: "Invalid calendar feed token" });
    }

    // Generate iCal content
    const icalContent = await calendarSyncService.generateICalFeed(user.id);

    // Set appropriate headers for iCal
    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader("Content-Disposition", 'inline; filename="nexspace-schedule.ics"');

    res.send(icalContent);
  } catch (error) {
    console.error("Error generating iCal feed:", error);
    res.status(500).json({ message: "Failed to generate calendar feed" });
  }
});

// Start Google Calendar OAuth flow
router.get("/google/auth", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const authUrl = calendarSyncService.getGoogleAuthUrl(userId);

    res.json({ authUrl });
  } catch (error) {
    console.error("Error starting Google OAuth:", error);
    res.status(500).json({ message: "Failed to start Google Calendar authentication" });
  }
});

// Handle Google OAuth callback
router.get("/google/callback", async (req, res) => {
  try {
    const { code, state } = req.query;

    if (!code || !state) {
      return res.status(400).json({ message: "Invalid callback parameters" });
    }

    const userId = parseInt(state as string);

    // Exchange code for tokens
    await calendarSyncService.handleGoogleCallback(code as string, userId);

    // Redirect to settings page with success message
    res.redirect("/settings?calendar_connected=true");
  } catch (error) {
    console.error("Error handling Google OAuth callback:", error);
    res.redirect("/settings?calendar_error=true");
  }
});

// Sync shifts to Google Calendar
router.post("/google/sync", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;

    await calendarSyncService.syncToGoogleCalendar(userId);

    res.json({
      success: true,
      message: "Shifts synced to Google Calendar",
    });
  } catch (error) {
    console.error("Error syncing to Google Calendar:", error);
    res.status(500).json({ message: "Failed to sync with Google Calendar" });
  }
});

// Disconnect Google Calendar
router.post("/google/disconnect", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;

    await calendarSyncService.disconnectGoogleCalendar(userId);

    res.json({
      success: true,
      message: "Google Calendar disconnected",
    });
  } catch (error) {
    console.error("Error disconnecting Google Calendar:", error);
    res.status(500).json({ message: "Failed to disconnect Google Calendar" });
  }
});

export default router;
