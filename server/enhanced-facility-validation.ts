// Enhanced Facility Validation Schemas
import { z } from "zod";
import { insertFacilitySchema } from "@shared/schema";

// Validation schemas for new JSONB fields
export const floatPoolMarginsSchema = z
  .record(z.string(), z.number().min(0).max(100))
  .optional()
  .nullable();

export const specialtyRatesSchema = z
  .record(z.string(), z.number().min(0).max(500))
  .optional()
  .nullable();

export const workflowAutomationConfigSchema = z
  .object({
    autoApproveShifts: z.boolean().optional(),
    autoNotifyManagers: z.boolean().optional(),
    autoGenerateInvoices: z.boolean().optional(),
    requireManagerApproval: z.boolean().optional(),
    enableOvertimeAlerts: z.boolean().optional(),
    autoAssignBySpecialty: z.boolean().optional(),
  })
  .optional()
  .nullable();

export const shiftManagementSettingsSchema = z
  .object({
    overtimeThreshold: z.number().min(0).max(80).optional(),
    maxConsecutiveShifts: z.number().min(1).max(14).optional(),
    minHoursBetweenShifts: z.number().min(0).max(24).optional(),
    allowBackToBackShifts: z.boolean().optional(),
    requireManagerApprovalForOvertime: z.boolean().optional(),
    autoCalculateOvertime: z.boolean().optional(),
  })
  .optional()
  .nullable();

export const staffingTargetsSchema = z
  .record(
    z.string(),
    z.object({
      targetHours: z.number().min(0),
      minStaff: z.number().min(0),
      maxStaff: z.number().min(0),
      preferredStaffMix: z.record(z.string(), z.number()).optional(),
    })
  )
  .optional()
  .nullable();

export const customRulesSchema = z
  .object({
    floatPoolRules: z
      .object({
        maxHoursPerWeek: z.number().min(0).max(168).optional(),
        specialtyRestrictions: z.array(z.string()).optional(),
        requireAdditionalTraining: z.boolean().optional(),
      })
      .optional(),
    overtimeRules: z
      .object({
        maxOvertimeHours: z.number().min(0).max(80).optional(),
        overtimeApprovalRequired: z.boolean().optional(),
        overtimeRate: z.number().min(1).max(3).optional(),
      })
      .optional(),
    attendanceRules: z
      .object({
        maxLateArrivals: z.number().min(0).max(20).optional(),
        maxNoCallNoShows: z.number().min(0).max(10).optional(),
        probationaryPeriod: z.number().min(0).max(365).optional(),
      })
      .optional(),
    requiredDocuments: z.array(z.string()).optional(),
  })
  .optional()
  .nullable();

export const regulatoryDocsSchema = z
  .array(
    z.object({
      id: z.string(),
      name: z.string(),
      type: z.enum(["license", "certification", "policy", "procedure", "contract"]),
      url: z.string().url().optional(),
      uploadDate: z.string(),
      expirationDate: z.string().optional(),
      status: z.enum(["active", "expired", "pending_renewal"]),
    })
  )
  .optional()
  .nullable();

// Enhanced facility schema with all new fields
export const enhancedFacilitySchema = insertFacilitySchema.extend({
  // Auto-assignment & Workflow
  autoAssignmentEnabled: z.boolean().optional().default(false),
  workflowAutomationConfig: workflowAutomationConfigSchema,
  shiftManagementSettings: shiftManagementSettingsSchema,
  timezone: z.string().optional().default("America/New_York"),

  // Team & Organization
  teamId: z.number().optional().nullable(),

  // Financial & Billing
  netTerms: z.string().optional().default("Net 30"),
  floatPoolMargins: floatPoolMarginsSchema,
  billRates: specialtyRatesSchema,
  payRates: specialtyRatesSchema,
  billingContactName: z.string().optional().nullable(),
  billingContactEmail: z.string().email().optional().nullable(),

  // Staffing & Operations
  staffingTargets: staffingTargetsSchema,
  emrSystem: z.string().optional().nullable(),

  // Contract & Dates
  contractStartDate: z.coerce.date().optional().nullable(),

  // Payroll Integration
  payrollProviderId: z.number().optional().nullable(),

  // Custom Rules & Compliance
  customRules: customRulesSchema,
  regulatoryDocs: regulatoryDocsSchema,
});

// Partial update schema for PATCH operations
export const enhancedFacilityUpdateSchema = enhancedFacilitySchema.partial();

// Validation functions
export const validateFacilityRates = (billRates: any, payRates: any) => {
  if (!billRates || !payRates) return { valid: true };

  const errors: string[] = [];

  // Check that bill rates are higher than pay rates
  for (const specialty in billRates) {
    if (payRates[specialty] && billRates[specialty] <= payRates[specialty]) {
      errors.push(`Bill rate for ${specialty} must be higher than pay rate`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

export const validateStaffingTargets = (staffingTargets: any) => {
  if (!staffingTargets) return { valid: true };

  const errors: string[] = [];

  for (const [department, targets] of Object.entries(staffingTargets)) {
    const target = targets as any;
    if (target.minStaff > target.maxStaff) {
      errors.push(`Minimum staff for ${department} cannot exceed maximum staff`);
    }
    if (target.targetHours <= 0) {
      errors.push(`Target hours for ${department} must be greater than 0`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

export const validateTimezone = (timezone: string) => {
  const validTimezones = [
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles",
    "America/Anchorage",
    "Pacific/Honolulu",
  ];

  return validTimezones.includes(timezone);
};

export default {
  enhancedFacilitySchema,
  enhancedFacilityUpdateSchema,
  validateFacilityRates,
  validateStaffingTargets,
  validateTimezone,
};
