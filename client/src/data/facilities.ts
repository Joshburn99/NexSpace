import type { Facility } from "../types";

export const mockFacilities: Facility[] = [
  {
    id: "facility-001",
    name: "Portland General Hospital",
    address: "1221 SW Yamhill Street",
    city: "Portland",
    state: "Oregon",
    zipCode: "97205",
    phoneNumber: "503-413-7711",
    email: "info@portlandgeneral.org",
    bedCount: 287,
    facilityType: "hospital",
    isActive: true,
    createdAt: new Date("2023-05-15T09:00:00Z"),
    updatedAt: new Date("2024-06-01T10:30:00Z"),
  },
  {
    id: "facility-002",
    name: "OHSU Hospital",
    address: "3181 SW Sam Jackson Park Road",
    city: "Portland",
    state: "Oregon",
    zipCode: "97239",
    phoneNumber: "503-494-8311",
    email: "contact@ohsu.edu",
    bedCount: 576,
    facilityType: "hospital",
    isActive: true,
    createdAt: new Date("2023-03-22T14:15:00Z"),
    updatedAt: new Date("2024-05-28T16:45:00Z"),
  },
  {
    id: "facility-003",
    name: "Legacy Emanuel Medical Center",
    address: "2801 North Gantenbein Avenue",
    city: "Portland",
    state: "Oregon",
    zipCode: "97227",
    phoneNumber: "503-413-2200",
    email: "info@legacyhealth.org",
    bedCount: 368,
    facilityType: "hospital",
    isActive: true,
    createdAt: new Date("2023-07-10T11:20:00Z"),
    updatedAt: new Date("2024-06-15T13:10:00Z"),
  },
  {
    id: "facility-004",
    name: "Rose Villa Senior Living",
    address: "13505 SE River Road",
    city: "Milwaukie",
    state: "Oregon",
    zipCode: "97267",
    phoneNumber: "503-654-4651",
    email: "info@rosevilla.org",
    bedCount: 156,
    facilityType: "assisted_living",
    isActive: true,
    createdAt: new Date("2023-09-05T08:30:00Z"),
    updatedAt: new Date("2024-06-08T12:00:00Z"),
  },
  {
    id: "facility-005",
    name: "Providence Rehabilitation Hospital",
    address: "9205 SW Barnes Road",
    city: "Portland",
    state: "Oregon",
    zipCode: "97225",
    phoneNumber: "503-216-1015",
    email: "rehab@providence.org",
    bedCount: 58,
    facilityType: "rehab_center",
    isActive: true,
    createdAt: new Date("2023-12-01T15:45:00Z"),
    updatedAt: new Date("2024-06-20T09:15:00Z"),
  },
];

// Helper functions for working with facility data
export const getFacilityById = (id: string): Facility | undefined => {
  return mockFacilities.find((facility) => facility.id === id);
};

export const getFacilitiesByType = (facilityType: string): Facility[] => {
  return mockFacilities.filter((facility) => facility.facilityType === facilityType);
};

export const getActiveFacilities = (): Facility[] => {
  return mockFacilities.filter((facility) => facility.isActive);
};

export const getFacilitiesByBedCount = (minBeds: number, maxBeds?: number): Facility[] => {
  return mockFacilities.filter((facility) => {
    if (maxBeds) {
      return facility.bedCount >= minBeds && facility.bedCount <= maxBeds;
    }
    return facility.bedCount >= minBeds;
  });
};
