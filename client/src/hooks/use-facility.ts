import { useQuery } from "@tanstack/react-query";

// Enhanced Facility Interface with Normalized Structure
export interface EnhancedFacility {
  id: number;
  name: string;
  facilityType: string;
  bedCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  
  // Normalized address data
  address?: {
    id: number;
    facilityId: number;
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  
  // Normalized contacts
  contacts?: Array<{
    id: number;
    facilityId: number;
    contactType: string;
    name?: string;
    title?: string;
    phone?: string;
    email?: string;
    isPrimary?: boolean;
  }>;
  
  // Normalized settings
  settings?: {
    id: number;
    facilityId: number;
    autoAssignmentEnabled?: boolean;
    timezone?: string;
    emrSystem?: string;
    billingCycle?: string;
    paymentTerms?: string;
    defaultShiftDuration?: number;
    overtimeThreshold?: number;
    requiresFloatPool?: boolean;
    floatPoolRadius?: number;
  };
  
  // Normalized rates
  rates?: Array<{
    id: number;
    facilityId: number;
    rateType: string;
    specialty: string;
    baseRate: number;
    overtimeRate?: number;
    holidayRate?: number;
    effectiveDate: string;
    endDate?: string;
  }>;
  
  // Normalized staffing targets
  staffingTargets?: Array<{
    id: number;
    facilityId: number;
    department: string;
    shiftType: string;
    targetCount: number;
    minCount: number;
    maxCount?: number;
  }>;
  
  // Normalized documents
  documents?: Array<{
    id: number;
    facilityId: number;
    documentType: string;
    documentName: string;
    documentUrl?: string;
    expiryDate?: string;
    status?: string;
  }>;
  
  // Legacy fields for backward compatibility (deprecated)
  phone?: string;
  email?: string;
  
  // Additional operational fields from original interface
  teamId?: number;
  netTerms?: string;
  overallRating?: number;
  
  // Legacy JSON fields (these might be moved to normalized tables in future)
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
  // Additional fields from main facilities table
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
  if (!facility || !facility.address) return "";
  const addr = facility.address;
  return `${addr.street || ''}, ${addr.city || ''}, ${addr.state || ''} ${addr.zipCode || ''}`.trim();
}

/**
 * Helper function to get facility timezone or default
 */
export function getFacilityTimezone(facility: EnhancedFacility | undefined): string {
  return facility?.settings?.timezone || "America/New_York";
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
  if (!facility?.staffingTargets) return undefined;
  return facility.staffingTargets.filter(target => target.department === department);
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