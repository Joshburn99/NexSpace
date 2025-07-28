import { db } from "./db";
import { users, facilities, shifts, messages, credentials, staff, facilityUsers, teams, facilityUserTeamMemberships } from "@shared/schema";
import { eq, sql, and, inArray } from "drizzle-orm";
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
   * Staff Management - Single Source of Truth (Actual Staff Only)
   */
  async getStaffWithAssociations() {
    try {
      const staffData = await db
        .select({
          id: staff.id,
          firstName: staff.firstName,
          lastName: staff.lastName,
          email: staff.email,
          role: staff.employmentType,
          specialty: staff.specialty,
          department: staff.department,
          isActive: staff.isActive,
          avatar: staff.profilePhoto,

          phone: staff.phone,
          hourlyRate: staff.hourlyRate,
          availabilityStatus: staff.availabilityStatus,
          createdAt: staff.createdAt,
          updatedAt: staff.updatedAt,
        })
        .from(staff)
        .where(eq(staff.isActive, true));

      return staffData.map(staffMember => {
        return {
          ...staffMember,
          firstName: staffMember.firstName || 'Unknown',
          lastName: staffMember.lastName || 'Staff',
          associatedFacilities: [], // Will be populated from separate table when implemented
        };
      });
    } catch (error) {
      console.error("Error fetching staff data:", error);
      throw new Error("Failed to fetch staff data");
    }
  }

  /**
   * Facility Users Management - Single Source of Truth (Facility Users Only)
   */
  async getFacilityUsersWithAssociations() {
    try {
      // Get all facility users with facility and team information
      const facilityUsersData = await db
        .select({
          id: facilityUsers.id,
          firstName: facilityUsers.firstName,
          lastName: facilityUsers.lastName,
          email: facilityUsers.email,
          role: facilityUsers.role,
          specialty: sql<string>`null`.as('specialty'),
          associatedFacilities: facilityUsers.associatedFacilityIds,
          isActive: facilityUsers.isActive,
          avatar: facilityUsers.avatar,
          facilityId: facilityUsers.primaryFacilityId,
          availabilityStatus: sql<string>`'available'`.as('availabilityStatus'),
          createdAt: facilityUsers.createdAt,
          updatedAt: facilityUsers.updatedAt,
          phone: facilityUsers.phone,
          title: facilityUsers.title,
          department: facilityUsers.department,
          permissions: facilityUsers.permissions,
          facilityName: facilities.name,
        })
        .from(facilityUsers)
        .leftJoin(facilities, eq(facilityUsers.primaryFacilityId, facilities.id))
        .where(eq(facilityUsers.isActive, true));

      // Get team information for users who are team members
      const usersWithTeams = await Promise.all(
        facilityUsersData.map(async (user) => {
          // Check if user is a member of any teams
          const teamMemberships = await db
            .select({
              teamId: facilityUserTeamMemberships.teamId,
              teamName: teams.name,
              role: facilityUserTeamMemberships.role,
            })
            .from(facilityUserTeamMemberships)
            .innerJoin(teams, eq(facilityUserTeamMemberships.teamId, teams.id))
            .where(eq(facilityUserTeamMemberships.facilityUserId, user.id));

          return {
            ...user,
            teamMemberships,
          };
        })
      );

      return usersWithTeams.map(user => ({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        specialty: user.specialty,
        associatedFacilities: Array.isArray(user.associatedFacilities) 
          ? user.associatedFacilities 
          : (user.facilityId ? [user.facilityId] : []),
        isActive: user.isActive,
        avatar: user.avatar,
        facilityId: user.facilityId,
        facilityName: user.facilityName,
        teamMemberships: user.teamMemberships,
        availabilityStatus: user.availabilityStatus,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        phone: user.phone,
        title: user.title,
        department: user.department,
        permissions: user.permissions,
      }));
    } catch (error) {
      console.error("Error fetching facility users data:", error);
      throw new Error("Failed to fetch facility users data");
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
        .where(eq(messages.conversationId, parseInt(conversationId)))
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