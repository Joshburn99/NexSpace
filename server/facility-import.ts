import { storage } from "./storage";
import { insertFacilitySchema } from "@shared/schema";
import { z } from "zod";
import { 
  createCMSApiClient, 
  createNPIApiClient,
  CMSProviderDataSchema,
  NPIProviderDataSchema,
  type CMSProviderData,
  type NPIProviderData
} from "./utils/api-client";

// External API service for facility data
export class FacilityImportService {
  private cmsApiKey: string | undefined;
  private npiApiKey: string | undefined;

  constructor() {
    this.cmsApiKey = process.env.CMS_API_KEY;
    this.npiApiKey = process.env.NPI_API_KEY;
  }

  /**
   * Search for facilities by CMS Provider Number
   */
  async searchByCMSId(cmsId: string): Promise<CMSProviderData[]> {
    const client = createCMSApiClient();
    
    const response = await client.get<{ results: CMSProviderData[] }>(
      `/provider-data/api/1/datastore/query/4pq5-n9py/0?conditions[0][property]=federal_provider_number&conditions[0][value]=${cmsId}`,
      {
        validateResponse: (data) => {
          // Validate the response structure
          const schema = z.object({
            results: z.array(CMSProviderDataSchema),
          });
          return schema.parse(data);
        },
        skipRetryOn: [401, 403], // Don't retry auth errors
      }
    );

    if (!response.success) {
      throw new Error(`Failed to search CMS by ID: ${response.error}`);
    }

    return response.data?.results || [];
  }

  /**
   * Search for facilities by name and location
   */
  async searchByNameAndLocation(name: string, state?: string, city?: string): Promise<CMSProviderData[]> {
    const client = createCMSApiClient();

    // Build query parameters
    let endpoint = `/provider-data/api/1/datastore/query/4pq5-n9py/0?conditions[0][property]=provider_name&conditions[0][operator]=LIKE&conditions[0][value]=${encodeURIComponent(name)}`;

    if (state) {
      endpoint += `&conditions[1][property]=state_abbr&conditions[1][value]=${state}`;
    }

    if (city) {
      endpoint += `&conditions[2][property]=city_name&conditions[2][operator]=LIKE&conditions[2][value]=${encodeURIComponent(city)}`;
    }

    const response = await client.get<{ results: CMSProviderData[] }>(endpoint, {
      validateResponse: (data) => {
        const schema = z.object({
          results: z.array(CMSProviderDataSchema),
        });
        return schema.parse(data);
      },
      timeout: 20000, // Longer timeout for search queries
      skipRetryOn: [401, 403],
    });

    if (!response.success) {
      throw new Error(`Failed to search CMS by name and location: ${response.error}`);
    }

    return response.data?.results || [];
  }

  /**
   * Get NPI information for additional validation
   */
  async getNPIInfo(npiNumber: string): Promise<NPIProviderData | null> {
    const client = createNPIApiClient();

    const response = await client.get<{ results: NPIProviderData[] }>(
      `/api/?number=${npiNumber}&enumeration_type=&taxonomy_description=&name_purpose=&first_name=&use_first_name_alias=&last_name=&organization_name=&address_purpose=&city=&state=&postal_code=&country_code=&limit=10&skip=0&pretty=on&version=2.1`,
      {
        validateResponse: (data) => {
          const schema = z.object({
            results: z.array(NPIProviderDataSchema),
          });
          return schema.parse(data);
        },
        retries: 2, // NPI registry is sometimes flaky
      }
    );

    if (!response.success) {
      // Log the error but don't throw - NPI lookup is not critical
      console.warn(`NPI lookup failed for ${npiNumber}: ${response.error}`);
      return null;
    }

    const results = response.data?.results || [];
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Convert CMS data to our facility schema
   */
  private mapCMSDataToFacility(cmsData: CMSProviderData): any {
    return {
      name: cmsData.provider_name,
      address: cmsData.address,
      city: cmsData.city_name,
      state: cmsData.state_abbr,
      zipCode: cmsData.zip_code,
      phone: cmsData.phone_number,
      cmsId: cmsData.federal_provider_number,
      facilityType: this.mapProviderType(cmsData.provider_type),
      bedCount: cmsData.total_number_of_certified_beds || null,
      privateRooms: cmsData.total_private_rooms || null,
      semiPrivateRooms: cmsData.number_of_certified_beds
        ? cmsData.number_of_certified_beds - (cmsData.total_private_rooms || 0)
        : null,
      overallRating: cmsData.overall_rating || null,
      healthInspectionRating: cmsData.health_inspection_rating || null,
      qualityMeasureRating: cmsData.quality_measure_rating || null,
      staffingRating: cmsData.staffing_rating || null,
      rnStaffingRating: cmsData.rn_staffing_rating || null,
      ownershipType: cmsData.ownership_type?.toLowerCase() || null,
      certificationDate: cmsData.certification_date ? new Date(cmsData.certification_date) : null,
      participatesMedicare: cmsData.participates_in_medicare || false,
      participatesMedicaid: cmsData.participates_in_medicaid || false,
      adminName: cmsData.administrator_name || null,
      adminTitle: cmsData.administrator_title || null,
      medicalDirector: cmsData.medical_director_name || null,
      lastInspectionDate: cmsData.most_recent_health_inspection_date
        ? new Date(cmsData.most_recent_health_inspection_date)
        : null,
      deficiencyCount: cmsData.number_of_standard_deficiencies || null,
      complaintsCount: cmsData.number_of_complaints || null,
      finesTotal: cmsData.total_amount_of_fines_in_dollars
        ? cmsData.total_amount_of_fines_in_dollars.toString()
        : null,
      autoImported: true,
      lastDataUpdate: new Date(),
      dataSource: "cms",
      isActive: true,
    };
  }

  /**
   * Map CMS provider types to our facility types
   */
  private mapProviderType(providerType: string): string {
    const type = providerType?.toLowerCase() || "";
    if (type.includes("nursing")) return "nursing_home";
    if (type.includes("hospital")) return "hospital";
    if (type.includes("assisted")) return "assisted_living";
    if (type.includes("hospice")) return "hospice";
    if (type.includes("home health")) return "home_health";
    return "other";
  }

  /**
   * Import facility data from CMS by Provider Number
   */
  async importFacilityByCMSId(cmsId: string): Promise<any> {
    const cmsResults = await this.searchByCMSId(cmsId);

    if (!cmsResults || cmsResults.length === 0) {
      throw new Error(`No facility found with CMS ID: ${cmsId}`);
    }

    const cmsData = cmsResults[0];
    const facilityData = this.mapCMSDataToFacility(cmsData);

    // Validate the data before creating
    const validatedData = insertFacilitySchema.parse(facilityData);

    // Check if facility already exists
    const existingFacility = await this.findFacilityByCMSId(cmsId);
    if (existingFacility) {
      // Update existing facility
      return await storage.updateFacility(existingFacility.id, validatedData);
    } else {
      // Create new facility
      return await storage.createFacility(validatedData);
    }
  }

  /**
   * Search and import facilities by name and location
   */
  async searchAndImportFacilities(name: string, state?: string, city?: string): Promise<any[]> {
    const cmsResults = await this.searchByNameAndLocation(name, state, city);
    const importedFacilities = [];

    for (const cmsData of cmsResults.slice(0, 10)) {
      // Limit to 10 results
      try {
        const facilityData = this.mapCMSDataToFacility(cmsData);
        const validatedData = insertFacilitySchema.parse(facilityData);

        // Check if facility already exists
        const existingFacility = await this.findFacilityByCMSId(cmsData.federal_provider_number);

        let facility;
        if (existingFacility) {
          facility = await storage.updateFacility(existingFacility.id, validatedData);
        } else {
          facility = await storage.createFacility(validatedData);
        }

        importedFacilities.push(facility);
      } catch (error) {

        // Continue with other facilities
      }
    }

    return importedFacilities;
  }

  /**
   * Find facility by CMS ID in our database
   */
  private async findFacilityByCMSId(cmsId: string): Promise<any> {
    try {
      const facilities = await storage.getAllFacilities();
      return facilities.find((f) => f.cmsId === cmsId);
    } catch (error) {

      return null;
    }
  }

  /**
   * Update facility data from external sources
   */
  async refreshFacilityData(facilityId: number): Promise<any> {
    const facility = await storage.getFacility(facilityId);
    if (!facility || !facility.cmsId) {
      throw new Error("Facility not found or missing CMS ID");
    }

    return await this.importFacilityByCMSId(facility.cmsId);
  }
}

export const facilityImportService = new FacilityImportService();
