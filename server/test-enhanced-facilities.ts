// Test script for Enhanced Facility Management System
import { db } from "./db";
import { facilities } from "@shared/schema";
import { eq } from "drizzle-orm";

interface EnhancedFacilityTestData {
  name: string;
  facilityType: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  email: string;
  bedCount: number;
  isActive: boolean;

  // Enhanced fields
  autoAssignmentEnabled: boolean;
  timezone: string;
  netTerms: string;
  teamId?: number;

  // JSONB fields with proper structure
  billRates: {
    "Registered Nurse": number;
    "Licensed Practical Nurse": number;
    "Certified Nursing Assistant": number;
    "Physical Therapist": number;
    "Respiratory Therapist": number;
  };

  payRates: {
    "Registered Nurse": number;
    "Licensed Practical Nurse": number;
    "Certified Nursing Assistant": number;
    "Physical Therapist": number;
    "Respiratory Therapist": number;
  };

  floatPoolMargins: {
    "Registered Nurse": number;
    "Licensed Practical Nurse": number;
    "Certified Nursing Assistant": number;
  };

  workflowAutomationConfig: {
    autoApproveShifts: boolean;
    autoNotifyManagers: boolean;
    autoGenerateInvoices: boolean;
    requireManagerApproval: boolean;
    enableOvertimeAlerts: boolean;
    autoAssignBySpecialty: boolean;
  };

  shiftManagementSettings: {
    overtimeThreshold: number;
    maxConsecutiveShifts: number;
    minHoursBetweenShifts: number;
    allowBackToBackShifts: boolean;
    requireManagerApprovalForOvertime: boolean;
    autoCalculateOvertime: boolean;
  };

  staffingTargets: {
    ICU: {
      targetHours: number;
      minStaff: number;
      maxStaff: number;
      preferredStaffMix: {
        "Registered Nurse": number;
        "Licensed Practical Nurse": number;
      };
    };
    Emergency: {
      targetHours: number;
      minStaff: number;
      maxStaff: number;
      preferredStaffMix: {
        "Registered Nurse": number;
        "Certified Nursing Assistant": number;
      };
    };
  };

  customRules: {
    floatPoolRules: {
      maxHoursPerWeek: number;
      specialtyRestrictions: string[];
      requireAdditionalTraining: boolean;
    };
    overtimeRules: {
      maxOvertimeHours: number;
      overtimeApprovalRequired: boolean;
      overtimeRate: number;
    };
    attendanceRules: {
      maxLateArrivals: number;
      maxNoCallNoShows: number;
      probationaryPeriod: number;
    };
    requiredDocuments: string[];
  };

  regulatoryDocs: Array<{
    id: string;
    name: string;
    type: "license" | "certification" | "policy" | "procedure" | "contract";
    url?: string;
    uploadDate: string;
    expirationDate?: string;
    status: "active" | "expired" | "pending_renewal";
  }>;

  emrSystem: string;
  contractStartDate: Date;
  billingContactName: string;
  billingContactEmail: string;
}

export async function testEnhancedFacilitySystem() {

  try {
    // Test data with comprehensive enhanced fields
    const testFacilityData: EnhancedFacilityTestData = {
      name: "Advanced Regional Medical Center",
      facilityType: "Hospital",
      address: "1500 Medical Center Drive",
      city: "Portland",
      state: "OR",
      zipCode: "97201",
      phone: "(503) 555-0100",
      email: "admin@armc.com",
      bedCount: 250,
      isActive: true,

      // Enhanced operational fields
      autoAssignmentEnabled: true,
      timezone: "America/Los_Angeles",
      netTerms: "Net 15",
      teamId: 1,

      // Specialty-based billing rates
      billRates: {
        "Registered Nurse": 75,
        "Licensed Practical Nurse": 50,
        "Certified Nursing Assistant": 35,
        "Physical Therapist": 85,
        "Respiratory Therapist": 65,
      },

      // Specialty-based pay rates
      payRates: {
        "Registered Nurse": 48,
        "Licensed Practical Nurse": 32,
        "Certified Nursing Assistant": 22,
        "Physical Therapist": 55,
        "Respiratory Therapist": 42,
      },

      // Float pool profit margins by specialty
      floatPoolMargins: {
        "Registered Nurse": 15,
        "Licensed Practical Nurse": 12,
        "Certified Nursing Assistant": 10,
      },

      // Workflow automation settings
      workflowAutomationConfig: {
        autoApproveShifts: false,
        autoNotifyManagers: true,
        autoGenerateInvoices: true,
        requireManagerApproval: true,
        enableOvertimeAlerts: true,
        autoAssignBySpecialty: true,
      },

      // Shift management rules
      shiftManagementSettings: {
        overtimeThreshold: 40,
        maxConsecutiveShifts: 5,
        minHoursBetweenShifts: 8,
        allowBackToBackShifts: false,
        requireManagerApprovalForOvertime: true,
        autoCalculateOvertime: true,
      },

      // Department-specific staffing targets
      staffingTargets: {
        ICU: {
          targetHours: 168,
          minStaff: 4,
          maxStaff: 8,
          preferredStaffMix: {
            "Registered Nurse": 75,
            "Licensed Practical Nurse": 25,
          },
        },
        Emergency: {
          targetHours: 210,
          minStaff: 6,
          maxStaff: 12,
          preferredStaffMix: {
            "Registered Nurse": 60,
            "Certified Nursing Assistant": 40,
          },
        },
      },

      // Custom operational rules
      customRules: {
        floatPoolRules: {
          maxHoursPerWeek: 60,
          specialtyRestrictions: ["ICU", "Emergency"],
          requireAdditionalTraining: true,
        },
        overtimeRules: {
          maxOvertimeHours: 20,
          overtimeApprovalRequired: true,
          overtimeRate: 1.5,
        },
        attendanceRules: {
          maxLateArrivals: 3,
          maxNoCallNoShows: 1,
          probationaryPeriod: 90,
        },
        requiredDocuments: ["State License", "BLS Certification", "ACLS Certification"],
      },

      // Regulatory compliance documents
      regulatoryDocs: [
        {
          id: "license-001",
          name: "Healthcare Facility License",
          type: "license" as const,
          url: "https://documents.armc.com/license-001.pdf",
          uploadDate: "2025-01-01",
          expirationDate: "2026-01-01",
          status: "active" as const,
        },
        {
          id: "cert-001",
          name: "Joint Commission Accreditation",
          type: "certification" as const,
          uploadDate: "2024-06-01",
          expirationDate: "2027-06-01",
          status: "active" as const,
        },
      ],

      emrSystem: "Epic",
      contractStartDate: new Date("2025-01-01"),
      billingContactName: "Sarah Johnson",
      billingContactEmail: "billing@armc.com",
    };

    // Test 1: Create enhanced facility
    const [createdFacility] = await db
      .insert(facilities)
      .values(testFacilityData as any)
      .returning();

      id: createdFacility.id,
      name: createdFacility.name,
      autoAssignmentEnabled: createdFacility.autoAssignmentEnabled,
      timezone: createdFacility.timezone,
      emrSystem: createdFacility.emrSystem,
    });

    // Test 2: Retrieve and verify enhanced fields
    const [retrievedFacility] = await db
      .select()
      .from(facilities)
      .where(eq(facilities.id, createdFacility.id));

    if (retrievedFacility) {
    }

    // Test 3: Update specific enhanced fields
    const updatedBillRates = {
      "Registered Nurse": 80, // Increased rate
      "Licensed Practical Nurse": 55,
      "Certified Nursing Assistant": 40,
      "Physical Therapist": 90,
      "Respiratory Therapist": 70,
    };

    const [updatedFacility] = await db
      .update(facilities)
      .set({
        billRates: updatedBillRates,
        autoAssignmentEnabled: false, // Changed setting
        updatedAt: new Date(),
      })
      .where(eq(facilities.id, createdFacility.id))
      .returning();


    // Test 4: Query facilities with enhanced filtering
    const activeFacilities = await db
      .select()
      .from(facilities)
      .where(eq(facilities.isActive, true));


    // Test 5: Validate JSONB field structures
    const facilityWithJsonb = activeFacilities[0];

    if (facilityWithJsonb?.billRates) {
      const billRates = facilityWithJsonb.billRates as any;
    }

    if (facilityWithJsonb?.workflowAutomationConfig) {
      const workflow = facilityWithJsonb.workflowAutomationConfig as any;
    }

    // Test 6: Cleanup - Remove test facility
    await db.delete(facilities).where(eq(facilities.id, createdFacility.id));


    return true;
  } catch (error) {
    console.error("❌ Enhanced Facility System test failed:", error);
    return false;
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testEnhancedFacilitySystem()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error("Test execution failed:", error);
      process.exit(1);
    });
}
