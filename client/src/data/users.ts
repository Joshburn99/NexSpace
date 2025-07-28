import type { User } from "../types";

export const mockUsers: User[] = [
  {
    id: "user-001",
    firstName: "Sarah",
    lastName: "Johnson",
    email: "sarah.johnson@nexspace.com",
    role: "staff",
    specialty: "RN",
    facilityIds: ["facility-001", "facility-002"],
    isActive: true,
    phoneNumber: "555-0101",
    avatar: "/avatars/sarah-johnson.png",
    createdAt: new Date("2024-01-15T10:30:00Z"),
    updatedAt: new Date("2024-06-01T14:22:00Z"),
  },
  {
    id: "user-002",
    firstName: "Michael",
    lastName: "Chen",
    email: "michael.chen@nexspace.com",
    role: "staff",
    specialty: "RT",
    facilityIds: ["facility-001"],
    isActive: true,
    phoneNumber: "555-0102",
    avatar: "/avatars/michael-chen.png",
    createdAt: new Date("2024-02-03T09:15:00Z"),
    updatedAt: new Date("2024-06-15T11:45:00Z"),
  },
  {
    id: "user-003",
    firstName: "Emily",
    lastName: "Rodriguez",
    email: "emily.rodriguez@nexspace.com",
    role: "staff",
    specialty: "CNA",
    facilityIds: ["facility-002", "facility-003"],
    isActive: true,
    phoneNumber: "555-0103",
    createdAt: new Date("2024-01-28T16:45:00Z"),
    updatedAt: new Date("2024-05-20T08:30:00Z"),
  },
  {
    id: "user-004",
    firstName: "David",
    lastName: "Thompson",
    email: "david.thompson@nexspace.com",
    role: "facility_admin",
    facilityIds: ["facility-001"],
    isActive: true,
    phoneNumber: "555-0104",
    avatar: "/avatars/david-thompson.png",
    createdAt: new Date("2023-11-12T13:20:00Z"),
    updatedAt: new Date("2024-06-10T16:15:00Z"),
  },
  {
    id: "user-005",
    firstName: "Lisa",
    lastName: "Park",
    email: "lisa.park@nexspace.com",
    role: "staff",
    specialty: "PT",
    facilityIds: ["facility-003"],
    isActive: true,
    phoneNumber: "555-0105",
    createdAt: new Date("2024-03-10T12:00:00Z"),
    updatedAt: new Date("2024-06-18T10:30:00Z"),
  },
  {
    id: "user-006",
    firstName: "James",
    lastName: "Wilson",
    email: "james.wilson@nexspace.com",
    role: "superuser",
    facilityIds: ["facility-001", "facility-002", "facility-003"],
    isActive: true,
    phoneNumber: "555-0106",
    avatar: "/avatars/james-wilson.png",
    createdAt: new Date("2023-08-01T08:00:00Z"),
    updatedAt: new Date("2024-06-22T15:45:00Z"),
  },
  {
    id: "user-007",
    firstName: "Amanda",
    lastName: "Davis",
    email: "amanda.davis@nexspace.com",
    role: "staff",
    specialty: "LPN",
    facilityIds: ["facility-001", "facility-002"],
    isActive: true,
    phoneNumber: "555-0107",
    createdAt: new Date("2024-04-05T14:30:00Z"),
    updatedAt: new Date("2024-06-12T09:20:00Z"),
  },
];

// Helper functions for working with user data
export const getUserById = (id: string): User | undefined => {
  return mockUsers.find((user) => user.id === id);
};

export const getUsersByFacility = (facilityId: string): User[] => {
  return mockUsers.filter((user) => user.facilityIds.includes(facilityId));
};

export const getUsersBySpecialty = (specialty: string): User[] => {
  return mockUsers.filter((user) => user.specialty === specialty);
};

export const getActiveStaff = (): User[] => {
  return mockUsers.filter((user) => user.isActive && user.role === "staff");
};
