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
    console.log("[UNIFIED SHIFTS API] Starting unified shifts fetch...");
    
    // Check if we need to regenerate template shifts
    const generatedShiftsCount = await db.select().from(generatedShifts);
    console.log(`[UNIFIED SHIFTS API] Found ${generatedShiftsCount.length} generated shifts in database`);
    
    // If no generated shifts exist, regenerate from active templates
    if (generatedShiftsCount.length === 0) {
      console.log("[UNIFIED SHIFTS API] No generated shifts found, regenerating from templates...");
      const result = await regenerateAllActiveTemplateShifts();
      console.log(`[UNIFIED SHIFTS API] Regeneration result: ${result.message}`);
    }

    // Get all database shifts (both generated and manual) - FIXED: properly handle shift_position
    const dbGeneratedShifts = await db.select().from(generatedShifts);
    const dbManualShifts = await db.select().from(shifts);

    console.log(`[UNIFIED SHIFTS API] Database stats: ${dbGeneratedShifts.length} generated, ${dbManualShifts.length} manual`);

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
      console.log(`[UNIFIED SHIFTS API] Facility filtering: ${allShifts.length} → ${filteredShifts.length} shifts`);
    }

    // Sort by date and time
    filteredShifts.sort((a, b) => {
      if (a.date !== b.date) {
        return a.date.localeCompare(b.date);
      }
      return a.startTime.localeCompare(b.startTime);
    });

    console.log(`[UNIFIED SHIFTS API] Returning ${filteredShifts.length} unified shifts`);

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
    console.error("[UNIFIED SHIFTS API] getUnifiedShifts failed", err);
    if (err?.stack) console.error(err.stack);
    res.status(500).json({
      success: false,
      message: "Failed to fetch shifts",
      error: process.env.NODE_ENV === "development" ? (err instanceof Error ? err.message : "Unknown error") : "Internal Error"
    });
  }
}