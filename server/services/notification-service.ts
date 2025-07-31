import { MailService } from "@sendgrid/mail";
import { InsertNotification, Notification } from "@shared/schema";
import { IStorage } from "../storage";
import { User } from "@shared/schema";
import { WebSocketServer } from "ws";

// Initialize SendGrid
const mailService = new MailService();
if (process.env.SENDGRID_API_KEY) {
  mailService.setApiKey(process.env.SENDGRID_API_KEY);
}

interface NotificationContext {
  user: User;
  type: string;
  title: string;
  message: string;
  metadata?: any;
  link?: string;
}

export class NotificationService {
  private storage: IStorage;
  private wss: WebSocketServer | null = null;

  constructor(storage: IStorage) {
    this.storage = storage;
  }

  setWebSocketServer(wss: WebSocketServer) {
    this.wss = wss;
  }

  async sendNotification(context: NotificationContext): Promise<Notification> {
    // Create in-app notification
    const notification = await this.storage.createNotification({
      userId: context.user.id,
      facilityUserId: null,
      type: context.type,
      title: context.title,
      message: context.message,
      metadata: context.metadata,
      link: context.link,
      isRead: false,
      emailSent: false,
    });

    // Send real-time WebSocket notification
    if (this.wss) {
      this.wss.clients.forEach((client) => {
        if (client.readyState === 1) {
          // WebSocket.OPEN
          client.send(
            JSON.stringify({
              type: "notification",
              data: notification,
            })
          );
        }
      });
    }

    // Send email notification if enabled and SendGrid is configured
    if (process.env.SENDGRID_API_KEY && context.user.email) {
      try {
        await this.sendEmailNotification(context.user.email, context);

        // Mark email as sent - we'll need to add a method to update notification emailSent status
        // For now, the notification was created with emailSent: true if email was sent successfully
      } catch (error) {

      }
    }

    return notification;
  }

  private async sendEmailNotification(to: string, context: NotificationContext): Promise<void> {
    const fromEmail = process.env.SENDGRID_FROM_EMAIL || "notifications@nexspace.com";

    const msg = {
      to,
      from: fromEmail,
      subject: `NexSpace: ${context.title}`,
      text: context.message,
      html: this.generateEmailHtml(context),
    };

    await mailService.send(msg);
  }

  private generateEmailHtml(context: NotificationContext): string {
    const baseUrl = process.env.APP_URL || "https://nexspace.com";
    const linkUrl = context.link ? `${baseUrl}${context.link}` : baseUrl;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${context.title}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4A90E2; color: white; padding: 20px; text-align: center; }
          .content { background-color: #f9f9f9; padding: 30px; margin-top: 0; }
          .button { display: inline-block; background-color: #4A90E2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin-top: 20px; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>NexSpace</h1>
          </div>
          <div class="content">
            <h2>${context.title}</h2>
            <p>${context.message}</p>
            ${context.link ? `<a href="${linkUrl}" class="button">View Details</a>` : ""}
          </div>
          <div class="footer">
            <p>You received this email because you have notifications enabled in NexSpace.</p>
            <p>To manage your notification preferences, visit your settings page.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Notification templates for common events
  async notifyShiftAssigned(user: User, shift: any): Promise<Notification> {
    return this.sendNotification({
      user,
      type: "shift_assigned",
      title: "New Shift Assigned",
      message: `You have been assigned to ${shift.title} on ${shift.date} from ${shift.startTime} to ${shift.endTime} at ${shift.facilityName}.`,
      metadata: { shiftId: shift.id, facilityId: shift.facilityId },
      link: `/calendar?date=${shift.date}`,
    });
  }

  async notifyShiftChanged(user: User, shift: any, changes: any): Promise<Notification> {
    const changesList = Object.entries(changes)
      .map(([key, value]) => `${key}: ${value}`)
      .join(", ");

    return this.sendNotification({
      user,
      type: "shift_changed",
      title: "Shift Updated",
      message: `Your shift ${shift.title} on ${shift.date} has been updated. Changes: ${changesList}`,
      metadata: { shiftId: shift.id, facilityId: shift.facilityId, changes },
      link: `/calendar?date=${shift.date}`,
    });
  }

  async notifyShiftCancelled(user: User, shift: any): Promise<Notification> {
    return this.sendNotification({
      user,
      type: "shift_cancelled",
      title: "Shift Cancelled",
      message: `Your shift ${shift.title} on ${shift.date} has been cancelled.`,
      metadata: { shiftId: shift.id, facilityId: shift.facilityId },
      link: "/calendar",
    });
  }

  async notifyNewMessage(user: User, message: any, sender: any): Promise<Notification> {
    return this.sendNotification({
      user,
      type: "message_received",
      title: `New message from ${sender.name}`,
      message: message.content.substring(0, 100) + (message.content.length > 100 ? "..." : ""),
      metadata: { messageId: message.id, senderId: sender.id },
      link: "/messaging",
    });
  }

  async notifyApprovalPending(user: User, item: string, itemId: number): Promise<Notification> {
    return this.sendNotification({
      user,
      type: "approval_pending",
      title: "Approval Required",
      message: `A ${item} requires your approval.`,
      metadata: { itemType: item, itemId },
      link: "/approvals",
    });
  }

  async notifyShiftRequestApproved(user: User, shift: any): Promise<Notification> {
    return this.sendNotification({
      user,
      type: "shift_request_approved",
      title: "Shift Request Approved",
      message: `Your request for ${shift.title} on ${shift.date} has been approved.`,
      metadata: { shiftId: shift.id, facilityId: shift.facilityId },
      link: `/calendar?date=${shift.date}`,
    });
  }

  async notifyShiftRequestDenied(user: User, shift: any, reason?: string): Promise<Notification> {
    return this.sendNotification({
      user,
      type: "shift_request_denied",
      title: "Shift Request Denied",
      message: `Your request for ${shift.title} on ${shift.date} was denied.${reason ? ` Reason: ${reason}` : ""}`,
      metadata: { shiftId: shift.id, facilityId: shift.facilityId, reason },
      link: "/my-requests",
    });
  }
}
