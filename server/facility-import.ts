import { storage } from "./storage";
import { insertFacilitySchema } from "@shared/schema";
import { z } from "zod";

// CMS Provider Information API data structure
interface CMSProviderData {
  provider_name: string;
  address: string;
  city_name: string;
  state_abbr: string;
  zip_code: string;
  phone_number: string;
  federal_provider_number: string;
  provider_type: string;
  ownership_type: string;
  certification_date: string;
  overall_rating: number;
  health_inspection_rating: number;
  quality_measure_rating: number;
  staffing_rating: number;
  rn_staffing_rating: number;
  total_number_of_certified_beds: number;
  total_private_rooms: number;
  total_residents_in_certified_beds: number;
  number_of_certified_beds: number;
  participates_in_medicare: boolean;
  participates_in_medicaid: boolean;
  administrator_name: string;
  administrator_title: string;
  medical_director_name: string;
  most_recent_health_inspection_date: string;
  number_of_standard_deficiencies: number;
  number_of_complaints: number;
  total_amount_of_fines_in_dollars: number;
}

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
  async searchByCMSId(cmsId: string): Promise<any> {
    if (!this.cmsApiKey) {
      throw new Error("CMS API key not configured");
    }

    try {
      const response = await fetch(
        `https://data.cms.gov/provider-data/api/1/datastore/query/4pq5-n9py/0?conditions[0][property]=federal_provider_number&conditions[0][value]=${cmsId}`,
        {
          headers: {
            Authorization: `Bearer ${this.cmsApiKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`CMS API request failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.results || [];
    } catch (error) {

      throw error;
    }
  }

  /**
   * Search for facilities by name and location
   */
  async searchByNameAndLocation(name: string, state?: string, city?: string): Promise<any[]> {
    if (!this.cmsApiKey) {
      throw new Error("CMS API key not configured");
    }

    try {
      let query = `https://data.cms.gov/provider-data/api/1/datastore/query/4pq5-n9py/0?conditions[0][property]=provider_name&conditions[0][operator]=LIKE&conditions[0][value]=${encodeURIComponent(name)}`;

      if (state) {
        query += `&conditions[1][property]=state_abbr&conditions[1][value]=${state}`;
      }

      if (city) {
        query += `&conditions[2][property]=city_name&conditions[2][operator]=LIKE&conditions[2][value]=${encodeURIComponent(city)}`;
      }

      const response = await fetch(query, {
        headers: {
          Authorization: `Bearer ${this.cmsApiKey}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`CMS API request failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.results || [];
    } catch (error) {

      throw error;
    }
  }

  /**
   * Get NPI information for additional validation
   */
  async getNPIInfo(npiNumber: string): Promise<any> {
    try {
      const response = await fetch(
        `https://npiregistry.cms.hhs.gov/api/?number=${npiNumber}&enumeration_type=&taxonomy_description=&name_purpose=&first_name=&use_first_name_alias=&last_name=&organization_name=&address_purpose=&city=&state=&postal_code=&country_code=&limit=10&skip=0&pretty=on&version=2.1`
      );

      if (!response.ok) {
        throw new Error(`NPI API request failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.results && data.results.length > 0 ? data.results[0] : null;
    } catch (error) {

      return null;
    }
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
