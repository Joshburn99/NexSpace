// Enhanced Facility Management Implementation Example
// This file demonstrates the complete TypeScript interfaces and usage patterns

import type {
  Facility,
  FloatPoolMargins,
  SpecialtyRates,
  WorkflowAutomationConfig,
  ShiftManagementSettings,
  StaffingTargets,
  CustomRules,
  RegulatoryDocument
} from "@shared/schema";

// Enhanced Facility Interface with All New Fields
export interface EnhancedFacility extends Facility {
  // Auto-assignment & Workflow
  autoAssignmentEnabled: boolean;
  workflowAutomationConfig: WorkflowAutomationConfig;
  shiftManagementSettings: ShiftManagementSettings;
  timezone: string;

  // Team & Organization
  teamId?: number;

  // Financial & Billing
  netTerms: string;
  floatPoolMargins: FloatPoolMargins;
  billRates: SpecialtyRates;
  payRates: SpecialtyRates;
  billingContactName?: string;
  billingContactEmail?: string;

  // Staffing & Operations
  staffingTargets: StaffingTargets;
  emrSystem?: string;

  // Contract & Dates
  contractStartDate?: string;

  // Payroll Integration
  payrollProviderId?: number;

  // Custom Rules & Compliance
  customRules: CustomRules;
  regulatoryDocs: RegulatoryDocument[];
}

// Example usage patterns for the enhanced facility management system

export const createExampleFacility = (): Partial<EnhancedFacility> => ({
  name: "Metro Healthcare Center",
  facilityType: "hospital",
  address: "123 Healthcare Drive",
  city: "Portland", 
  state: "Oregon",
  zipCode: "97201",
  phone: "(503) 555-0100",
  email: "admin@metrohealthcare.com",
  bedCount: 250,
  isActive: true,
  
  // Enhanced management fields
  autoAssignmentEnabled: true,
  teamId: 1,
  netTerms: "Net 30",
  timezone: "America/Los_Angeles",
  
  floatPoolMargins: {
    "Registered Nurse": 15.00,
    "Licensed Practical Nurse": 10.00,
    "Certified Nursing Assistant": 8.00,
    "Physical Therapist": 18.00
  },
  
  billRates: {
    "Registered Nurse": 65.00,
    "Licensed Practical Nurse": 45.00, 
    "Certified Nursing Assistant": 28.00,
    "Physical Therapist": 80.00
  },
  
  payRates: {
    "Registered Nurse": 42.00,
    "Licensed Practical Nurse": 30.00,
    "Certified Nursing Assistant": 18.00,
    "Physical Therapist": 55.00
  },
  
  workflowAutomationConfig: {
    autoApproveShifts: false,
    autoNotifyManagers: true,
    autoGenerateInvoices: true,
    requireManagerApproval: true,
    enableOvertimeAlerts: true,
    autoAssignBySpecialty: true
  },
  
  shiftManagementSettings: {
    overtimeThreshold: 40,
    maxConsecutiveShifts: 7,
    minHoursBetweenShifts: 10,
    allowBackToBackShifts: false,
    requireManagerApprovalForOvertime: true,
    autoCalculateOvertime: true
  },
  
  billingContactName: "Sarah Johnson",
  billingContactEmail: "billing@metrohealthcare.com",
  
  staffingTargets: {
    "ICU": {
      targetHours: 168,
      minStaff: 12,
      maxStaff: 18,
      preferredStaffMix: {
        "Registered Nurse": 8,
        "Licensed Practical Nurse": 4
      }
    },
    "Emergency Department": {
      targetHours: 240,
      minStaff: 15,
      maxStaff: 22,
      preferredStaffMix: {
        "Registered Nurse": 12,
        "Licensed Practical Nurse": 6,
        "Certified Nursing Assistant": 4
      }
    },
    "Medical/Surgical": {
      targetHours: 144,
      minStaff: 10,
      maxStaff: 14,
      preferredStaffMix: {
        "Registered Nurse": 6,
        "Licensed Practical Nurse": 4,
        "Certified Nursing Assistant": 4
      }
    }
  },
  
  emrSystem: "Epic Systems",
  contractStartDate: "2024-01-15",
  payrollProviderId: 1,
  
  customRules: {
    floatPoolRules: {
      maxHoursPerWeek: 60,
      specialtyRestrictions: ["ICU", "Operating Room"],
      requireAdditionalTraining: true
    },
    overtimeRules: {
      maxOvertimeHours: 20,
      overtimeApprovalRequired: true,
      overtimeRate: 1.5
    },
    attendanceRules: {
      maxLateArrivals: 3,
      maxNoCallNoShows: 1,
      probationaryPeriod: 90
    },
    requiredDocuments: [
      "RN License",
      "CPR Certification", 
      "Background Check",
      "TB Test",
      "Flu Vaccination"
    ]
  },
  
  regulatoryDocs: [
    {
      id: "doc_001",
      name: "State Nursing Home License",
      type: "license",
      url: "/documents/nursing_license.pdf",
      uploadDate: "2024-01-15",
      expirationDate: "2025-12-31",
      status: "active"
    },
    {
      id: "doc_002", 
      name: "CMS Certification",
      type: "certification",
      url: "/documents/cms_certification.pdf",
      uploadDate: "2024-01-15",
      status: "active"
    },
    {
      id: "doc_003",
      name: "Emergency Preparedness Plan",
      type: "policy",
      url: "/documents/emergency_plan.pdf",
      uploadDate: "2024-01-15",
      expirationDate: "2025-01-15",
      status: "active"
    }
  ]
});

// API usage examples
export const facilityManagementExamples = {
  
  // Get facility with enhanced data
  async getFacilityWithEnhancedData(facilityId: number): Promise<EnhancedFacility> {
    const response = await fetch(`/api/facilities/${facilityId}`);
    return response.json();
  },
  
  // Update facility billing rates
  async updateFacilityRates(facilityId: number, billRates: SpecialtyRates, payRates: SpecialtyRates) {
    return fetch(`/api/facilities/${facilityId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ billRates, payRates })
    });
  },
  
  // Configure workflow automation
  async updateWorkflowSettings(facilityId: number, config: WorkflowAutomationConfig) {
    return fetch(`/api/facilities/${facilityId}/workflow`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workflowAutomationConfig: config })
    });
  },
  
  // Set staffing targets
  async updateStaffingTargets(facilityId: number, targets: StaffingTargets) {
    return fetch(`/api/facilities/${facilityId}/staffing-targets`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ staffingTargets: targets })
    });
  }
};

// Form validation schemas for frontend
export const facilityValidationRules = {
  billRates: {
    required: true,
    min: 10,
    max: 200,
    message: "Bill rates must be between $10-200 per hour"
  },
  payRates: {
    required: true,
    min: 8,
    max: 150,
    message: "Pay rates must be between $8-150 per hour"
  },
  floatPoolMargins: {
    required: false,
    min: 0,
    max: 50,
    message: "Float pool margins must be between $0-50 per hour"
  },
  netTerms: {
    required: true,
    pattern: /^Net \d+$/,
    message: "Net terms must be in format 'Net XX' (e.g., 'Net 30')"
  },
  timezone: {
    required: true,
    enum: [
      "America/New_York",
      "America/Chicago", 
      "America/Denver",
      "America/Los_Angeles",
      "America/Anchorage",
      "Pacific/Honolulu"
    ]
  }
};

export default {
  createExampleFacility,
  facilityManagementExamples,
  facilityValidationRules
};