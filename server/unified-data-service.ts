import { db } from "./db";
import { users, facilities, shifts, messages, credentials } from "@shared/schema";
import { eq, sql, and } from "drizzle-orm";
import type { WebSocketServer } from "ws";

/**
 * Unified Data Service - Single Source of Truth
 * Eliminates dual storage systems and ensures data consistency
 */
export class UnifiedDataService {
  private wss?: WebSocketServer;

  constructor(wss?: WebSocketServer) {
    this.wss = wss;
  }

  /**
   * Staff Management - Single Source of Truth
   */
  async getStaffWithAssociations() {
    try {
      const staffData = await db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          role: users.role,
          specialty: users.specialty,
          associatedFacilities: users.associatedFacilities,
          isActive: users.isActive,
          avatar: users.avatar,
          facilityId: users.facilityId,
          availabilityStatus: users.availabilityStatus,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        })
        .from(users)
        .where(eq(users.isActive, true));

      return staffData.map(staff => ({
        ...staff,
        associatedFacilities: Array.isArray(staff.associatedFacilities) 
          ? staff.associatedFacilities 
          : [],
      }));
    } catch (error) {
      console.error("Error fetching staff data:", error);
      throw new Error("Failed to fetch staff data");
    }
  }

  /**
   * Update staff facility associations
   */
  async updateStaffFacilities(staffId: number, facilityIds: number[]) {
    try {
      const [updatedStaff] = await db
        .update(users)
        .set({ 
          associatedFacilities: facilityIds,
          updatedAt: new Date()
        })
        .where(eq(users.id, staffId))
        .returning();

      // Broadcast update via WebSocket
      this.broadcastUpdate('staff:updated', updatedStaff);

      return updatedStaff;
    } catch (error) {
      console.error("Error updating staff facilities:", error);
      throw new Error("Failed to update staff facilities");
    }
  }

  /**
   * Get live shift data with real-time status
   */
  async getActiveShifts(userId?: number, facilityId?: number) {
    try {
      const baseQuery = db.select().from(shifts);
      
      if (userId && facilityId) {
        return await baseQuery.where(
          and(
            sql`${shifts.assignedStaffIds} @> ARRAY[${userId}]::integer[]`,
            eq(shifts.facilityId, facilityId)
          )
        );
      } else if (userId) {
        return await baseQuery.where(
          sql`${shifts.assignedStaffIds} @> ARRAY[${userId}]::integer[]`
        );
      } else if (facilityId) {
        return await baseQuery.where(eq(shifts.facilityId, facilityId));
      } else {
        return await baseQuery;
      }
    } catch (error) {
      console.error("Error fetching shifts:", error);
      throw new Error("Failed to fetch shifts");
    }
  }

  /**
   * Update shift status and broadcast changes
   */
  async updateShiftStatus(shiftId: number, status: string, userId?: number) {
    try {
      const updateData: any = { 
        status, 
        updatedAt: new Date() 
      };

      if (userId && status === 'assigned') {
        // Add user to assigned staff
        const shift = await db
          .select({ assignedStaffIds: shifts.assignedStaffIds })
          .from(shifts)
          .where(eq(shifts.id, shiftId))
          .limit(1);

        if (shift[0]) {
          const currentStaff = shift[0].assignedStaffIds || [];
          if (!currentStaff.includes(userId)) {
            updateData.assignedStaffIds = [...currentStaff, userId];
          }
        }
      }

      const [updatedShift] = await db
        .update(shifts)
        .set(updateData)
        .where(eq(shifts.id, shiftId))
        .returning();

      // Broadcast update to all connected clients
      this.broadcastUpdate('shift:updated', updatedShift);

      return updatedShift;
    } catch (error) {
      console.error("Error updating shift status:", error);
      throw new Error("Failed to update shift status");
    }
  }

  /**
   * Persist messages to database instead of memory
   */
  async createMessage(messageData: any) {
    try {
      const [message] = await db
        .insert(messages)
        .values(messageData)
        .returning();

      // Broadcast to WebSocket clients
      this.broadcastUpdate('message:new', message);

      return message;
    } catch (error) {
      console.error("Error creating message:", error);
      throw new Error("Failed to create message");
    }
  }

  /**
   * Get conversation messages from database
   */
  async getConversationMessages(conversationId: string) {
    try {
      const conversationMessages = await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, conversationId))
        .orderBy(messages.createdAt);

      return conversationMessages;
    } catch (error) {
      console.error("Error fetching conversation messages:", error);
      throw new Error("Failed to fetch messages");
    }
  }

  /**
   * Get facilities with live data
   */
  async getFacilities(activeOnly: boolean = true) {
    try {
      if (activeOnly) {
        return await db.select().from(facilities).where(eq(facilities.isActive, true));
      } else {
        return await db.select().from(facilities);
      }
    } catch (error) {
      console.error("Error fetching facilities:", error);
      throw new Error("Failed to fetch facilities");
    }
  }

  /**
   * Broadcast updates to WebSocket clients
   */
  private broadcastUpdate(type: string, data: any) {
    if (!this.wss) return;

    const message = JSON.stringify({ type, data });
    
    this.wss.clients.forEach((client) => {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(message);
      }
    });
  }

  /**
   * Validate data consistency across entities
   */
  async validateDataConsistency() {
    const issues: string[] = [];

    try {
      // Check for orphaned facility associations
      const staff = await this.getStaffWithAssociations();
      const allFacilities = await this.getFacilities(false);
      const facilityIds = new Set(allFacilities.map(f => f.id));

      for (const member of staff) {
        const invalidFacilities = member.associatedFacilities.filter(
          id => !facilityIds.has(id)
        );
        if (invalidFacilities.length > 0) {
          issues.push(`Staff ${member.id} has invalid facility associations: ${invalidFacilities.join(', ')}`);
        }
      }

      // Check for shifts with invalid staff assignments
      const allShifts = await this.getActiveShifts();
      const userIds = new Set(staff.map(s => s.id));

      for (const shift of allShifts) {
        if (shift.assignedStaffIds) {
          const invalidUsers = shift.assignedStaffIds.filter(
            id => !userIds.has(id)
          );
          if (invalidUsers.length > 0) {
            issues.push(`Shift ${shift.id} has invalid staff assignments: ${invalidUsers.join(', ')}`);
          }
        }
      }

      return {
        isValid: issues.length === 0,
        issues
      };
    } catch (error) {
      console.error("Error validating data consistency:", error);
      return {
        isValid: false,
        issues: ["Failed to validate data consistency"]
      };
    }
  }
}

export const unifiedDataService = new UnifiedDataService();