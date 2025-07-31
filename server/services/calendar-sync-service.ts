import { IStorage } from "../storage";
import { createHash } from "crypto";
import { format, startOfDay, endOfDay } from "date-fns";
import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";

interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  location: string;
  uid: string;
}

export class CalendarSyncService {
  private storage: IStorage;
  private googleOAuth2Client: OAuth2Client;

  constructor(storage: IStorage) {
    this.storage = storage;

    // Initialize Google OAuth2 client
    this.googleOAuth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI || "http://localhost:5000/api/calendar-sync/google/callback"
    );
  }

  /**
   * Generate a unique calendar feed token for a user
   */
  generateCalendarToken(userId: number): string {
    const secret = process.env.CALENDAR_TOKEN_SECRET || "nexspace-calendar-sync";
    const hash = createHash("sha256");
    hash.update(`${userId}-${secret}-${Date.now()}`);
    return hash.digest("hex").substring(0, 32);
  }

  /**
   * Convert a shift to an iCal event format
   */
  private shiftToCalendarEvent(shift: any): CalendarEvent {
    const startDateTime = new Date(`${shift.date}T${shift.startTime}`);
    const endDateTime = new Date(`${shift.date}T${shift.endTime}`);

    return {
      id: shift.id.toString(),
      title: shift.title,
      description: `${shift.specialty} shift at ${shift.facilityName || "Facility"}${shift.department ? ` - ${shift.department}` : ""}`,
      startTime: startDateTime,
      endTime: endDateTime,
      location: shift.facilityName || "",
      uid: `nexspace-shift-${shift.id}@nexspace.app`,
    };
  }

  /**
   * Generate iCal feed content for a user
   */
  async generateICalFeed(userId: number): Promise<string> {
    try {
      // Get user's assigned shifts
      const shifts = await this.storage.getUserAssignedShifts(userId);

      // Start building the iCal content
      let icalContent = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//NexSpace//Healthcare Scheduling//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "X-WR-CALNAME:NexSpace Work Schedule",
        "X-WR-CALDESC:Your NexSpace work schedule",
      ];

      // Add each shift as a VEVENT
      for (const shift of shifts) {
        const event = this.shiftToCalendarEvent(shift);

        icalContent.push(
          "BEGIN:VEVENT",
          `UID:${event.uid}`,
          `DTSTAMP:${this.formatICalDate(new Date())}`,
          `DTSTART:${this.formatICalDate(event.startTime)}`,
          `DTEND:${this.formatICalDate(event.endTime)}`,
          `SUMMARY:${this.escapeICalText(event.title)}`,
          `DESCRIPTION:${this.escapeICalText(event.description)}`,
          `LOCATION:${this.escapeICalText(event.location)}`,
          "STATUS:CONFIRMED",
          "END:VEVENT"
        );
      }

      icalContent.push("END:VCALENDAR");

      return icalContent.join("\r\n");
    } catch (error) {

      throw new Error("Failed to generate calendar feed");
    }
  }

  /**
   * Format date for iCal format (YYYYMMDDTHHMMSSZ)
   */
  private formatICalDate(date: Date): string {
    return date
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "");
  }

  /**
   * Escape special characters in iCal text fields
   */
  private escapeICalText(text: string): string {
    return text
      .replace(/\\/g, "\\\\")
      .replace(/;/g, "\\;")
      .replace(/,/g, "\\,")
      .replace(/\n/g, "\\n");
  }

  /**
   * Get Google OAuth authorization URL
   */
  getGoogleAuthUrl(userId: number): string {
    const scopes = [
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/calendar",
    ];

    return this.googleOAuth2Client.generateAuthUrl({
      access_type: "offline",
      scope: scopes,
      state: userId.toString(), // Pass user ID in state for callback
    });
  }

  /**
   * Handle Google OAuth callback and store tokens
   */
  async handleGoogleCallback(code: string, userId: number): Promise<void> {
    try {
      const { tokens } = await this.googleOAuth2Client.getToken(code);

      // Store tokens in database
      await this.storage.saveUserCalendarTokens(userId, {
        provider: "google",
        accessToken: tokens.access_token!,
        refreshToken: tokens.refresh_token || undefined,
        expiryDate: tokens.expiry_date || undefined,
      });
    } catch (error) {

      throw new Error("Failed to authenticate with Google Calendar");
    }
  }

  /**
   * Sync shifts to Google Calendar
   */
  async syncToGoogleCalendar(userId: number): Promise<void> {
    try {
      // Get user's Google tokens
      const tokens = await this.storage.getUserCalendarTokens(userId, "google");
      if (!tokens) {
        throw new Error("No Google Calendar connection found");
      }

      // Set up OAuth client with user's tokens
      this.googleOAuth2Client.setCredentials({
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        expiry_date: tokens.expiryDate,
      });

      const calendar = google.calendar({ version: "v3", auth: this.googleOAuth2Client });

      // Get user's shifts
      const shifts = await this.storage.getUserAssignedShifts(userId);

      // Create or update calendar events for each shift
      for (const shift of shifts) {
        const event = this.shiftToCalendarEvent(shift);

        const googleEvent = {
          id: `nexspace${shift.id}`.replace(/[^a-zA-Z0-9]/g, ""), // Google Calendar ID must be alphanumeric
          summary: event.title,
          description: event.description,
          location: event.location,
          start: {
            dateTime: event.startTime.toISOString(),
            timeZone: "America/New_York", // Should be dynamic based on facility
          },
          end: {
            dateTime: event.endTime.toISOString(),
            timeZone: "America/New_York",
          },
          reminders: {
            useDefault: false,
            overrides: [
              { method: "popup", minutes: 60 }, // 1 hour before
              { method: "popup", minutes: 1440 }, // 1 day before
            ],
          },
        };

        try {
          // Try to update existing event first
          await calendar.events.update({
            calendarId: "primary",
            eventId: googleEvent.id,
            requestBody: googleEvent,
          });
        } catch (error: any) {
          // If event doesn't exist, create it
          if (error.code === 404) {
            await calendar.events.insert({
              calendarId: "primary",
              requestBody: googleEvent,
            });
          } else {

          }
        }
      }
    } catch (error) {

      throw error;
    }
  }

  /**
   * Remove Google Calendar integration for a user
   */
  async disconnectGoogleCalendar(userId: number): Promise<void> {
    try {
      // Get user's tokens to revoke them
      const tokens = await this.storage.getUserCalendarTokens(userId, "google");
      if (tokens && tokens.accessToken) {
        this.googleOAuth2Client.revokeToken(tokens.accessToken);
      }

      // Remove tokens from database
      await this.storage.deleteUserCalendarTokens(userId, "google");
    } catch (error) {

      throw new Error("Failed to disconnect Google Calendar");
    }
  }
}
