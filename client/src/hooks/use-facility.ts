import { useQuery } from "@tanstack/react-query";

// Enhanced Facility Interface
export interface EnhancedFacility {
  id: number;
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
  createdAt: string;
  updatedAt: string;
  
  // Enhanced operational fields
  autoAssignmentEnabled?: boolean;
  timezone?: string;
  netTerms?: string;
  teamId?: number;
  billRates?: Record<string, number>;
  payRates?: Record<string, number>;
  floatPoolMargins?: Record<string, number>;
  workflowAutomationConfig?: {
    autoApproveShifts?: boolean;
    autoNotifyManagers?: boolean;
    autoGenerateInvoices?: boolean;
    requireManagerApproval?: boolean;
    enableOvertimeAlerts?: boolean;
    autoAssignBySpecialty?: boolean;
  };
  shiftManagementSettings?: {
    overtimeThreshold?: number;
    maxConsecutiveShifts?: number;
    minHoursBetweenShifts?: number;
    allowBackToBackShifts?: boolean;
    requireManagerApprovalForOvertime?: boolean;
    autoCalculateOvertime?: boolean;
  };
  staffingTargets?: Record<string, {
    targetHours: number;
    minStaff: number;
    maxStaff: number;
    preferredStaffMix?: Record<string, number>;
  }>;
  customRules?: {
    floatPoolRules?: {
      maxHoursPerWeek?: number;
      specialtyRestrictions?: string[];
      requireAdditionalTraining?: boolean;
    };
    overtimeRules?: {
      maxOvertimeHours?: number;
      overtimeApprovalRequired?: boolean;
      overtimeRate?: number;
    };
    attendanceRules?: {
      maxLateArrivals?: number;
      maxNoCallNoShows?: number;
      probationaryPeriod?: number;
    };
    requiredDocuments?: string[];
  };
  regulatoryDocs?: Array<{
    id: string;
    name: string;
    type: 'license' | 'certification' | 'policy' | 'procedure' | 'contract';
    url?: string;
    uploadDate: string;
    expirationDate?: string;
    status: 'active' | 'expired' | 'pending_renewal';
  }>;
  emrSystem?: string;
  contractStartDate?: string;
  billingContactName?: string;
  billingContactEmail?: string;
  payrollProviderId?: number;
}

/**
 * Hook to fetch a single facility by ID
 */
export function useFacility(facilityId: number | undefined) {
  return useQuery({
    queryKey: ["/api/facilities", facilityId],
    queryFn: async (): Promise<EnhancedFacility> => {
      if (!facilityId) throw new Error("Facility ID is required");
      
      const response = await fetch(`/api/facilities/${facilityId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch facility: ${response.statusText}`);
      }
      return response.json();
    },
    enabled: !!facilityId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1
  });
}

/**
 * Hook to fetch all facilities with optional filtering
 */
export function useFacilities(filters?: {
  search?: string;
  state?: string;
  facilityType?: string;
  isActive?: boolean;
}) {
  const queryParams = new URLSearchParams();
  
  if (filters?.search) queryParams.append('search', filters.search);
  if (filters?.state) queryParams.append('state', filters.state);
  if (filters?.facilityType) queryParams.append('facilityType', filters.facilityType);
  if (filters?.isActive !== undefined) queryParams.append('isActive', filters.isActive.toString());

  return useQuery({
    queryKey: ["/api/facilities", filters],
    queryFn: async (): Promise<EnhancedFacility[]> => {
      const url = `/api/facilities${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch facilities: ${response.statusText}`);
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1
  });
}

/**
 * Helper function to get facility display name with context
 */
export function getFacilityDisplayName(facility: EnhancedFacility | undefined): string {
  if (!facility) return "Unknown Facility";
  return `${facility.name} (${facility.facilityType})`;
}

/**
 * Helper function to get facility address string
 */
export function getFacilityAddress(facility: EnhancedFacility | undefined): string {
  if (!facility) return "";
  return `${facility.address}, ${facility.city}, ${facility.state} ${facility.zipCode}`;
}

/**
 * Helper function to get facility timezone or default
 */
export function getFacilityTimezone(facility: EnhancedFacility | undefined): string {
  return facility?.timezone || "America/New_York";
}

/**
 * Helper function to check if facility has specific capability
 */
export function hasFacilityCapability(
  facility: EnhancedFacility | undefined, 
  capability: keyof NonNullable<EnhancedFacility['workflowAutomationConfig']>
): boolean {
  return facility?.workflowAutomationConfig?.[capability] === true;
}

/**
 * Helper function to get billing rate for specialty
 */
export function getFacilityBillRate(
  facility: EnhancedFacility | undefined, 
  specialty: string
): number | undefined {
  return facility?.billRates?.[specialty];
}

/**
 * Helper function to get pay rate for specialty
 */
export function getFacilityPayRate(
  facility: EnhancedFacility | undefined, 
  specialty: string
): number | undefined {
  return facility?.payRates?.[specialty];
}

/**
 * Helper function to get staffing targets for department
 */
export function getFacilityStaffingTargets(
  facility: EnhancedFacility | undefined, 
  department: string
) {
  return facility?.staffingTargets?.[department];
}

/**
 * Helper function to check facility compliance status
 */
export function getFacilityComplianceStatus(facility: EnhancedFacility | undefined) {
  if (!facility?.regulatoryDocs) {
    return { active: 0, expired: 0, pending: 0, total: 0 };
  }

  const docs = facility.regulatoryDocs;
  return {
    active: docs.filter(doc => doc.status === 'active').length,
    expired: docs.filter(doc => doc.status === 'expired').length,
    pending: docs.filter(doc => doc.status === 'pending_renewal').length,
    total: docs.length
  };
}