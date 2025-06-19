import { db } from "./db";
import { facilities } from "@shared/schema";

export async function createExampleFacilities() {
  try {
    const facilityData = [
      {
        name: "Sunnybrook Medical Center",
        facilityType: "hospital",
        address: "1234 Healthcare Drive",
        city: "Springfield",
        state: "IL",
        zipCode: "62701",
        phone: "(217) 555-0123",
        email: "admin@sunnybrook.com",
        isActive: true,
        bedCount: 150,
        description:
          "Full-service medical center with emergency, surgical, and rehabilitation services",
        cmsId: "140001",
        overallRating: 4.2,
        staffingRating: 4.0,
        qualityRating: 4.3,
        safetyRating: 4.1,
      },
      {
        name: "Golden Years Nursing Home",
        facilityType: "nursing_home",
        address: "5678 Elder Care Lane",
        city: "Springfield",
        state: "IL",
        zipCode: "62702",
        phone: "(217) 555-0456",
        email: "contact@goldenyears.com",
        isActive: true,
        bedCount: 120,
        description: "Skilled nursing facility specializing in long-term care and rehabilitation",
        cmsId: "140002",
        overallRating: 4.5,
        staffingRating: 4.6,
        qualityRating: 4.4,
        safetyRating: 4.5,
      },
      {
        name: "Riverside Assisted Living",
        facilityType: "assisted_living",
        address: "9012 River View Road",
        city: "Springfield",
        state: "IL",
        zipCode: "62703",
        phone: "(217) 555-0789",
        email: "info@riverside-al.com",
        isActive: true,
        bedCount: 80,
        description: "Luxury assisted living community with memory care services",
        overallRating: 4.7,
        staffingRating: 4.8,
        qualityRating: 4.6,
        safetyRating: 4.7,
      },
      {
        name: "Springfield General Hospital",
        facilityType: "hospital",
        address: "3456 Medical Plaza",
        city: "Springfield",
        state: "IL",
        zipCode: "62704",
        phone: "(217) 555-1234",
        email: "administration@sggeneral.org",
        isActive: true,
        bedCount: 200,
        description: "Major teaching hospital with trauma center and specialty services",
        cmsId: "140003",
        overallRating: 4.0,
        staffingRating: 3.9,
        qualityRating: 4.1,
        safetyRating: 4.0,
      },
      {
        name: "Peaceful Meadows Hospice",
        facilityType: "hospice",
        address: "7890 Serenity Circle",
        city: "Springfield",
        state: "IL",
        zipCode: "62705",
        phone: "(217) 555-2468",
        email: "care@peacefulmeadows.org",
        isActive: true,
        bedCount: 24,
        description: "Compassionate end-of-life care with family support services",
        overallRating: 4.9,
        staffingRating: 4.9,
        qualityRating: 4.8,
        safetyRating: 4.9,
      },
    ];

    const createdFacilities = await db.insert(facilities).values(facilityData).returning();
    console.log(`Created ${createdFacilities.length} example facilities`);
    return createdFacilities;
  } catch (error) {
    console.error("Error creating example facilities:", error);
    throw error;
  }
}
