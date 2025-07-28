import { storage } from "./storage";
import type { InsertAnalyticsEvent } from "@shared/schema";
import type { Request } from "express";

export interface TrackingContext {
  userId?: number;
  facilityId?: number;
  userAgent?: string;
  ipAddress?: string;
  sessionId?: string;
}

export interface EventMetadata {
  [key: string]: any;
}

class AnalyticsTracker {
  /**
   * Extract tracking context from Express request
   */
  getContextFromRequest(req: Request): TrackingContext {
    const user = req.user as any;
    const session = req.session as any;

    return {
      userId: user?.id || user?.userId,
      facilityId: user?.facilityId || user?.associatedFacilities?.[0],
      userAgent: req.get("user-agent"),
      ipAddress: req.ip || req.connection.remoteAddress,
      sessionId: session?.id || req.sessionID,
    };
  }

  /**
   * Track a user event
   */
  async track(
    eventName: string,
    eventCategory: string,
    context: TrackingContext,
    options?: {
      entityType?: string;
      entityId?: string;
      action?: string;
      metadata?: EventMetadata;
      duration?: number;
    }
  ): Promise<void> {
    const event: InsertAnalyticsEvent = {
      eventName,
      eventCategory,
      userId: context.userId,
      facilityId: context.facilityId,
      userAgent: context.userAgent,
      ipAddress: context.ipAddress,
      sessionId: context.sessionId,
      entityType: options?.entityType,
      entityId: options?.entityId,
      action: options?.action,
      metadata: options?.metadata,
      duration: options?.duration,
    };

    await storage.trackEvent(event);
  }

  /**
   * Track authentication events
   */
  async trackAuth(
    action: "login" | "logout" | "signup" | "failed_login",
    context: TrackingContext,
    metadata?: EventMetadata
  ): Promise<void> {
    await this.track(`user_${action}`, "auth", context, {
      action,
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Track shift-related events
   */
  async trackShift(
    action: "create" | "update" | "delete" | "request" | "approve" | "deny" | "withdraw" | "assign",
    shiftId: string,
    context: TrackingContext,
    metadata?: EventMetadata
  ): Promise<void> {
    await this.track(`shift_${action}`, "shifts", context, {
      entityType: "shift",
      entityId: shiftId,
      action,
      metadata,
    });
  }

  /**
   * Track staff-related events
   */
  async trackStaff(
    action: "create" | "update" | "delete" | "view" | "export",
    staffId: string | number,
    context: TrackingContext,
    metadata?: EventMetadata
  ): Promise<void> {
    await this.track(`staff_${action}`, "staff", context, {
      entityType: "staff",
      entityId: staffId.toString(),
      action,
      metadata,
    });
  }

  /**
   * Track messaging events
   */
  async trackMessage(
    action: "send" | "receive" | "read",
    messageId: string | number,
    context: TrackingContext,
    metadata?: EventMetadata
  ): Promise<void> {
    await this.track(`message_${action}`, "messaging", context, {
      entityType: "message",
      entityId: messageId.toString(),
      action,
      metadata,
    });
  }

  /**
   * Track template-related events
   */
  async trackTemplate(
    action: "create" | "update" | "delete" | "activate" | "deactivate" | "use",
    templateId: string | number,
    context: TrackingContext,
    metadata?: EventMetadata
  ): Promise<void> {
    await this.track(`template_${action}`, "templates", context, {
      entityType: "template",
      entityId: templateId.toString(),
      action,
      metadata,
    });
  }

  /**
   * Track facility management events
   */
  async trackFacility(
    action: "create" | "update" | "delete" | "view" | "activate" | "deactivate",
    facilityId: string | number,
    context: TrackingContext,
    metadata?: EventMetadata
  ): Promise<void> {
    await this.track(`facility_${action}`, "facilities", context, {
      entityType: "facility",
      entityId: facilityId.toString(),
      action,
      metadata,
    });
  }

  /**
   * Track time-off events
   */
  async trackTimeOff(
    action: "request" | "approve" | "deny" | "cancel",
    requestId: string | number,
    context: TrackingContext,
    metadata?: EventMetadata
  ): Promise<void> {
    await this.track(`timeoff_${action}`, "timeoff", context, {
      entityType: "timeoff_request",
      entityId: requestId.toString(),
      action,
      metadata,
    });
  }

  /**
   * Track performance metrics
   */
  async trackPerformance(
    operation: string,
    duration: number,
    context: TrackingContext,
    metadata?: EventMetadata
  ): Promise<void> {
    await this.track(`performance_${operation}`, "performance", context, {
      action: "measure",
      duration,
      metadata: {
        ...metadata,
        operation,
        duration_ms: duration,
      },
    });
  }
}

// Export singleton instance
export const analytics = new AnalyticsTracker();
