import { Router } from "express";
import { requireAuth } from "./auth.routes";
import { storage } from "../storage";
import { db } from "../db";
import { eq, sql, and, gte, lte, or, inArray } from "drizzle-orm";
import { 
  shifts, 
  shiftRequests,
  facilities,
  staff,
  insertShiftSchema,
  insertShiftRequestSchema,
  UserRole
} from "@shared/schema";
import { z } from "zod";
import { format, parseISO } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";

const router = Router();

// Calendar event schema for frontend
const calendarEventSchema = z.object({
  id: z.number(),
  facilityId: z.number(),
  facilityName: z.string(),
  role: z.string(), // Will map from specialty
  status: z.enum(["open", "pending", "filled", "cancelled"]),
  startUtc: z.string(), // ISO string
  endUtc: z.string(), // ISO string
  timezone: z.string(),
  assignedStaffId: z.number().nullable().optional(),
  assignedStaffName: z.string().nullable().optional(),
  requiredWorkers: z.number().optional(),
  assignedWorkerIds: z.array(z.number()).optional(),
  notes: z.string().nullable().optional(),
  department: z.string().nullable().optional(),
  rate: z.number().nullable().optional(),
  color: z.string().optional(),
});

// GET /api/calendar/shifts - Get shifts for calendar view
router.get("/api/calendar/shifts", requireAuth, async (req: any, res) => {
  try {
    const { start, end, facilityId, role, status } = req.query;

    if (!start || !end) {
      return res.status(400).json({ 
        error: "start and end dates are required",
        message: "Please provide start and end date parameters" 
      });
    }

    // Parse dates
    const startDate = parseISO(start);
    const endDate = parseISO(end);

    // Build query conditions
    const conditions = [
      gte(shifts.date, format(startDate, 'yyyy-MM-dd')),
      lte(shifts.date, format(endDate, 'yyyy-MM-dd'))
    ];

    // Filter by facility if specified or user's facility
    if (facilityId) {
      conditions.push(eq(shifts.facilityId, parseInt(facilityId)));
    } else if (req.user.facilityId) {
      conditions.push(eq(shifts.facilityId, req.user.facilityId));
    }

    // Filter by role (maps to specialty in database)
    if (role) {
      conditions.push(eq(shifts.specialty, role));
    }

    // Filter by status if specified
    if (status) {
      const statusList = status.split(',').map((s: string) => s.trim());
      conditions.push(inArray(shifts.status, statusList));
    }

    // Query shifts with facility info
    const shiftsData = await db
      .select({
        shift: shifts,
        facility: facilities
      })
      .from(shifts)
      .leftJoin(facilities, eq(shifts.facilityId, facilities.id))
      .where(and(...conditions))
      .orderBy(shifts.date, shifts.startTime);

    // Map to calendar event format
    const events = shiftsData.map((row) => {
      const shift = row.shift;
      const facility = row.facility;
      
      // Combine date and time for start/end
      const startDateTime = `${shift.date}T${shift.startTime}:00`;
      const endDateTime = `${shift.date}T${shift.endTime}:00`;
      
      // Get timezone from facility or default
      const timezone = facility?.timezone || 'America/New_York';
      
      // Convert to UTC
      const startUtc = fromZonedTime(startDateTime, timezone).toISOString();
      const endUtc = fromZonedTime(endDateTime, timezone).toISOString();
      
      // Get assigned staff name if available
      let assignedStaffName = null;
      if (shift.assignedStaffIds && shift.assignedStaffIds.length > 0) {
        // We'd need to join with staff table for names, simplified for now
        assignedStaffName = `${shift.assignedStaffIds.length} staff assigned`;
      }
      
      // Determine color based on status
      let color = '#3B82F6'; // blue for open
      if (shift.status === 'filled') color = '#10B981'; // green
      else if (shift.status === 'pending') color = '#F59E0B'; // yellow
      else if (shift.status === 'cancelled') color = '#EF4444'; // red
      
      return {
        id: shift.id,
        facilityId: shift.facilityId,
        facilityName: facility?.name || 'Unknown Facility',
        role: shift.specialty, // Using specialty as role
        status: shift.status,
        startUtc,
        endUtc,
        timezone,
        assignedStaffId: shift.assignedStaffIds?.[0] || null,
        assignedStaffName,
        requiredWorkers: shift.requiredStaff || 1,
        assignedWorkerIds: shift.assignedStaffIds || [],
        notes: shift.description,
        department: shift.department,
        rate: parseFloat(shift.rate),
        color,
      };
    });

    res.json(events);
  } catch (error) {
    console.error("Failed to fetch calendar shifts:", error);
    res.status(500).json({ 
      error: "Failed to fetch calendar shifts",
      message: error instanceof Error ? error.message : "Unknown error" 
    });
  }
});

// POST /api/shifts/:id/assign - Assign staff to shift
router.post("/api/shifts/:id/assign", requireAuth, async (req: any, res) => {
  try {
    const shiftId = parseInt(req.params.id);
    const { staffId } = req.body;

    if (!staffId) {
      return res.status(400).json({ 
        error: "staffId is required",
        message: "Please provide a staff ID to assign" 
      });
    }

    // Get the shift
    const shift = await storage.getShift(shiftId);
    if (!shift) {
      return res.status(404).json({ 
        error: "Shift not found",
        message: "The specified shift does not exist" 
      });
    }

    // Check permissions
    if (req.user.role !== UserRole.SUPER_ADMIN && 
        req.user.role !== UserRole.FACILITY_MANAGER &&
        req.user.facilityId !== shift.facilityId) {
      return res.status(403).json({ 
        error: "Permission denied",
        message: "You don't have permission to assign staff to this shift" 
      });
    }

    // Update shift with assigned staff
    const currentStaffIds = shift.assignedStaffIds || [];
    if (!currentStaffIds.includes(staffId)) {
      currentStaffIds.push(staffId);
    }

    const updatedShift = await storage.updateShift(shiftId, {
      assignedStaffIds: currentStaffIds,
      status: 'filled'
    });

    // Emit WebSocket event
    const io = (req.app as any).io;
    if (io) {
      io.emit('shift.assigned', {
        shiftId,
        staffId,
        shift: updatedShift
      });
    }

    res.json({ 
      success: true, 
      shift: updatedShift,
      message: "Staff assigned successfully" 
    });
  } catch (error) {
    console.error("Failed to assign staff:", error);
    res.status(500).json({ 
      error: "Failed to assign staff",
      message: error instanceof Error ? error.message : "Unknown error" 
    });
  }
});

// POST /api/shifts/:id/unassign - Unassign staff from shift
router.post("/api/shifts/:id/unassign", requireAuth, async (req: any, res) => {
  try {
    const shiftId = parseInt(req.params.id);
    const { staffId } = req.body;

    // Get the shift
    const shift = await storage.getShift(shiftId);
    if (!shift) {
      return res.status(404).json({ 
        error: "Shift not found",
        message: "The specified shift does not exist" 
      });
    }

    // Check permissions
    if (req.user.role !== UserRole.SUPER_ADMIN && 
        req.user.role !== UserRole.FACILITY_MANAGER &&
        req.user.facilityId !== shift.facilityId) {
      return res.status(403).json({ 
        error: "Permission denied",
        message: "You don't have permission to unassign staff from this shift" 
      });
    }

    // Update shift removing the staff
    const currentStaffIds = shift.assignedStaffIds || [];
    const newStaffIds = staffId 
      ? currentStaffIds.filter(id => id !== staffId)
      : [];

    const updatedShift = await storage.updateShift(shiftId, {
      assignedStaffIds: newStaffIds,
      status: newStaffIds.length > 0 ? 'filled' : 'open'
    });

    // Emit WebSocket event
    const io = (req.app as any).io;
    if (io) {
      io.emit('shift.unassigned', {
        shiftId,
        staffId,
        shift: updatedShift
      });
    }

    res.json({ 
      success: true, 
      shift: updatedShift,
      message: "Staff unassigned successfully" 
    });
  } catch (error) {
    console.error("Failed to unassign staff:", error);
    res.status(500).json({ 
      error: "Failed to unassign staff",
      message: error instanceof Error ? error.message : "Unknown error" 
    });
  }
});

// POST /api/shifts/:id/cancel - Cancel a shift
router.post("/api/shifts/:id/cancel", requireAuth, async (req: any, res) => {
  try {
    const shiftId = parseInt(req.params.id);

    // Get the shift
    const shift = await storage.getShift(shiftId);
    if (!shift) {
      return res.status(404).json({ 
        error: "Shift not found",
        message: "The specified shift does not exist" 
      });
    }

    // Check permissions
    if (req.user.role !== UserRole.SUPER_ADMIN && 
        req.user.role !== UserRole.FACILITY_MANAGER &&
        req.user.facilityId !== shift.facilityId) {
      return res.status(403).json({ 
        error: "Permission denied",
        message: "You don't have permission to cancel this shift" 
      });
    }

    // Update shift status to cancelled
    const updatedShift = await storage.updateShift(shiftId, {
      status: 'cancelled'
    });

    // Emit WebSocket event
    const io = (req.app as any).io;
    if (io) {
      io.emit('shift.cancelled', {
        shiftId,
        shift: updatedShift
      });
    }

    res.json({ 
      success: true, 
      shift: updatedShift,
      message: "Shift cancelled successfully" 
    });
  } catch (error) {
    console.error("Failed to cancel shift:", error);
    res.status(500).json({ 
      error: "Failed to cancel shift",
      message: error instanceof Error ? error.message : "Unknown error" 
    });
  }
});

// POST /api/shifts/:id/request - Request a shift (for staff)
router.post("/api/shifts/:id/request", requireAuth, async (req: any, res) => {
  try {
    const shiftId = parseInt(req.params.id);
    const staffId = req.user.id;

    // Get the shift
    const shift = await storage.getShift(shiftId);
    if (!shift) {
      return res.status(404).json({ 
        error: "Shift not found",
        message: "The specified shift does not exist" 
      });
    }

    // Check if shift is open
    if (shift.status !== 'open') {
      return res.status(400).json({ 
        error: "Shift not available",
        message: "This shift is not open for requests" 
      });
    }

    // Create shift request
    const shiftRequest = await db
      .insert(shiftRequests)
      .values({
        shiftId,
        staffId,
        status: 'pending',
        createdAt: new Date(),
      })
      .returning();

    // Update shift status to pending if it's the first request
    if (shift.status === 'open') {
      await storage.updateShift(shiftId, {
        status: 'pending'
      });
    }

    // Emit WebSocket event
    const io = (req.app as any).io;
    if (io) {
      io.emit('shift.requested', {
        shiftId,
        staffId,
        request: shiftRequest[0]
      });
    }

    res.status(201).json({ 
      success: true, 
      request: shiftRequest[0],
      message: "Shift request submitted successfully" 
    });
  } catch (error) {
    console.error("Failed to request shift:", error);
    res.status(500).json({ 
      error: "Failed to request shift",
      message: error instanceof Error ? error.message : "Unknown error" 
    });
  }
});

// GET /api/shift-templates - Get shift templates
router.get("/api/shift-templates", requireAuth, async (req: any, res) => {
  try {
    const templates = await storage.getShiftTemplates();
    res.json(templates);
  } catch (error) {
    console.error("Failed to fetch shift templates:", error);
    res.status(500).json({ 
      error: "Failed to fetch shift templates",
      message: error instanceof Error ? error.message : "Unknown error" 
    });
  }
});

// PATCH /api/shifts/:id - Update shift details
router.patch("/api/shifts/:id", requireAuth, async (req: any, res) => {
  try {
    const shiftId = parseInt(req.params.id);
    const updateData = req.body;

    // Get the shift
    const shift = await storage.getShift(shiftId);
    if (!shift) {
      return res.status(404).json({ 
        error: "Shift not found",
        message: "The specified shift does not exist" 
      });
    }

    // Check permissions
    if (req.user.role !== UserRole.SUPER_ADMIN && 
        req.user.role !== UserRole.FACILITY_MANAGER &&
        req.user.facilityId !== shift.facilityId) {
      return res.status(403).json({ 
        error: "Permission denied",
        message: "You don't have permission to update this shift" 
      });
    }

    // Update shift
    const updatedShift = await storage.updateShift(shiftId, updateData);

    // Emit WebSocket event
    const io = (req.app as any).io;
    if (io) {
      io.emit('shift.updated', {
        shiftId,
        shift: updatedShift
      });
    }

    res.json({ 
      success: true, 
      shift: updatedShift,
      message: "Shift updated successfully" 
    });
  } catch (error) {
    console.error("Failed to update shift:", error);
    res.status(500).json({ 
      error: "Failed to update shift",
      message: error instanceof Error ? error.message : "Unknown error" 
    });
  }
});

export default router;