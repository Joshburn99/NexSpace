import { db } from "./db";
import { timeOffTypes, timeOffPolicies } from "@shared/schema";

export async function initializeTimeOffData() {
  try {
    // Check if time-off types already exist
    const existingTypes = await db.select().from(timeOffTypes);

    if (existingTypes.length === 0) {

      // Create default time-off types
      const defaultTypes = [
        {
          name: "vacation",
          displayName: "Vacation",
          description: "Paid time off for vacation and personal use",
          color: "#10b981",
          icon: "plane",
          requiresApproval: true,
          requiresDocumentation: false,
          maxConsecutiveDays: 14,
          advanceNoticeRequired: 14,
          isActive: true,
        },
        {
          name: "sick",
          displayName: "Sick Leave",
          description: "Paid time off for illness or medical appointments",
          color: "#ef4444",
          icon: "thermometer",
          requiresApproval: false,
          requiresDocumentation: true,
          maxConsecutiveDays: 7,
          advanceNoticeRequired: 0,
          isActive: true,
        },
        {
          name: "personal",
          displayName: "Personal Leave",
          description: "Time off for personal matters",
          color: "#8b5cf6",
          icon: "user",
          requiresApproval: true,
          requiresDocumentation: false,
          maxConsecutiveDays: 3,
          advanceNoticeRequired: 7,
          isActive: true,
        },
        {
          name: "bereavement",
          displayName: "Bereavement Leave",
          description: "Time off for family bereavement",
          color: "#6b7280",
          icon: "heart",
          requiresApproval: true,
          requiresDocumentation: true,
          maxConsecutiveDays: 5,
          advanceNoticeRequired: 0,
          isActive: true,
        },
        {
          name: "jury_duty",
          displayName: "Jury Duty",
          description: "Time off for civic duty",
          color: "#3b82f6",
          icon: "gavel",
          requiresApproval: true,
          requiresDocumentation: true,
          maxConsecutiveDays: 30,
          advanceNoticeRequired: 0,
          isActive: true,
        },
      ];

      await db.insert(timeOffTypes).values(defaultTypes);
    }

    // Check if time-off policies exist
    const existingPolicies = await db.select().from(timeOffPolicies);

    if (existingPolicies.length === 0) {

      // Create default policy for each facility
      const defaultPolicy = {
        name: "Standard PTO Policy",
        description: "Default paid time off policy for healthcare workers",
        accrualMethod: "annual",
        yearlyAllocation: 120, // 15 days * 8 hours
        accrualRate: 10, // 10 hours per month
        maxCarryover: 40, // 5 days
        waitingPeriod: 90, // 90 days before PTO can be used
        minimumIncrement: 4, // 4 hour minimum
        isActive: true,
      };

      await db.insert(timeOffPolicies).values(defaultPolicy);
    }
  } catch (error) {
    console.error("Error initializing time-off data:", error);
    throw error;
  }
}
