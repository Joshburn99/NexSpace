/**
 * Critical Fix: Unified Shifts API Endpoint
 * Replaces the broken shifts endpoint with proper data flow
 */

import { Request, Response } from "express";
import { db } from "./db";
import { shifts, generatedShifts, shiftTemplates } from "../shared/schema";
import { eq, and, gte, lte, or } from "drizzle-orm";
import { regenerateAllActiveTemplateShifts } from "./fix-shift-generation";

interface UnifiedShiftData {
  id: string | number;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  department: string;
  specialty: string;
  facilityId: number;
  facilityName: string;
  status: string;
  rate: number;
  urgency: string;
  description: string;
  requiredWorkers?: number;
  totalPositions?: number;
  source: 'generated' | 'manual';
  templateId?: number;
  assignedStaffIds?: number[];
}

export async function getUnifiedShifts(req: Request, res: Response) {
  try {

    // Check if we need to regenerate template shifts
    const generatedShiftsCount = await db.select().from(generatedShifts);

    // If no generated shifts exist, regenerate from active templates
    if (generatedShiftsCount.length === 0) {

      const result = await regenerateAllActiveTemplateShifts();

    }

    // Get all database shifts (both generated and manual) - FIXED: properly handle shift_position
    const dbGeneratedShifts = await db.select().from(generatedShifts);
    const dbManualShifts = await db.select().from(shifts);

    // Convert generated shifts to unified format (using actual database column names)
    const unifiedGeneratedShifts: UnifiedShiftData[] = dbGeneratedShifts.map((shift: any) => ({
      id: `${shift.id}-${shift.shiftPosition || 0}`, // Include position in ID to ensure uniqueness
      title: shift.title || "Untitled Shift",
      date: shift.date || new Date().toISOString().split("T")[0],
      startTime: shift.startTime || "08:00",
      endTime: shift.endTime || "16:00",
      department: shift.department || "General",
      specialty: shift.specialty || "General",
      facilityId: shift.facilityId || 1,
      facilityName: shift.facilityName || "Unknown Facility",
      status: shift.status || "open",
      rate: parseFloat(shift.rate?.toString() || "40.0"),
      urgency: shift.urgency || "medium",
      description: shift.description || "Generated shift",
      requiredWorkers: shift.requiredWorkers || 1,
      totalPositions: shift.maxStaff || shift.requiredWorkers || 1,
      source: 'generated' as const,
      templateId: shift.templateId,
    }));

    // Convert manual shifts to unified format
    const unifiedManualShifts: UnifiedShiftData[] = dbManualShifts.map((shift) => ({
      id: shift.id,
      title: shift.title || "Manual Shift",
      date: shift.date || new Date().toISOString().split("T")[0],
      startTime: shift.startTime || "08:00",
      endTime: shift.endTime || "16:00",
      department: shift.department || "General",
      specialty: shift.specialty || "General",
      facilityId: shift.facilityId || 1,
      facilityName: shift.facilityName || "Unknown Facility",
      status: shift.status || "open",
      rate: parseFloat(shift.rate?.toString() || "40.0"),
      urgency: shift.urgency || "medium",
      description: shift.description || "Manual shift",
      requiredWorkers: shift.requiredStaff || 1,
      totalPositions: shift.requiredStaff || 1,
      source: 'manual' as const,
      assignedStaffIds: shift.assignedStaffIds || [],
    }));

    // Combine all shifts
    const allShifts = [...unifiedGeneratedShifts, ...unifiedManualShifts];

    // Apply facility filtering for facility users
    const user = req.user;
    let filteredShifts = allShifts;
    
    if (user && user.role !== "super_admin" && user.associatedFacilities) {
      const associatedFacilityIds = user.associatedFacilities;
      filteredShifts = allShifts.filter(shift => 
        associatedFacilityIds.includes(shift.facilityId)
      );

    }

    // Sort by date and time
    filteredShifts.sort((a, b) => {
      if (a.date !== b.date) {
        return a.date.localeCompare(b.date);
      }
      return a.startTime.localeCompare(b.startTime);
    });

    res.json({
      success: true,
      shifts: filteredShifts,
      metadata: {
        totalShifts: filteredShifts.length,
        generatedShifts: unifiedGeneratedShifts.length,
        manualShifts: unifiedManualShifts.length,
        facilityFiltered: user?.role !== "super_admin" && user?.associatedFacilities,
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (err) {

    if (err?.stack) console.error(err.stack);
    res.status(500).json({
      success: false,
      message: "Failed to fetch shifts",
      error: process.env.NODE_ENV === "development" ? (err instanceof Error ? err.message : "Unknown error") : "Internal Error"
    });
  }
}
export async function getUnifiedShifts({ statuses = [] } = {}) {
  const whereSql = statuses.length
    ? sql`WHERE shifts.status IN (${sql.join(statuses)})`
    : sql``;

  const result = await db.query(sql`
    SELECT shifts.*, staff.name AS staff_name
    FROM shifts
    LEFT JOIN staff ON staff.id = shifts.staff_id
    ${whereSql}
  `);
  return result.rows;
}

export async function getAllStaff() {
  const result = await db.query(sql`
    SELECT * FROM staff
    ORDER BY name ASC
  `);
  return result.rows;
}

export async function getFacilityStaff(facilityId: number) {
  if (!facilityId) {
    return [];
  }
  
  const result = await db.query(sql`
    SELECT * FROM staff
    WHERE facility_id = ${facilityId}
    ORDER BY name ASC
  `);
  return result.rows;
}
