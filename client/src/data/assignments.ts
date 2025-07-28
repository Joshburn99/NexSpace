import type { Assignment } from "../types";

export const mockAssignments: Assignment[] = [
  // Confirmed assignments (already assigned to shifts)
  {
    id: "assignment-001",
    userId: "user-001",
    shiftId: "shift-001",
    status: "confirmed",
    assignedAt: new Date("2025-06-22T10:30:00Z"),
    updatedAt: new Date("2025-06-22T10:30:00Z"),
    notes: "Confirmed for ICU coverage",
  },
  {
    id: "assignment-002",
    userId: "user-007",
    shiftId: "shift-001",
    status: "confirmed",
    assignedAt: new Date("2025-06-22T11:15:00Z"),
    updatedAt: new Date("2025-06-22T11:15:00Z"),
    notes: "Secondary RN for ICU shift",
  },
  {
    id: "assignment-003",
    userId: "user-002",
    shiftId: "shift-002",
    status: "confirmed",
    assignedAt: new Date("2025-06-21T14:20:00Z"),
    updatedAt: new Date("2025-06-21T14:20:00Z"),
    notes: "RT coverage confirmed",
  },
  {
    id: "assignment-005",
    userId: "user-005",
    shiftId: "shift-004",
    status: "confirmed",
    assignedAt: new Date("2025-06-22T16:00:00Z"),
    updatedAt: new Date("2025-06-22T16:00:00Z"),
    notes: "PT outpatient coverage",
  },
  {
    id: "assignment-007",
    userId: "user-007",
    shiftId: "shift-005",
    status: "confirmed",
    assignedAt: new Date("2025-06-23T13:20:00Z"),
    updatedAt: new Date("2025-06-23T13:20:00Z"),
    notes: "ED night shift coverage",
  },

  // Pending requests (workers requesting shifts)
  {
    id: "assignment-004",
    userId: "user-003",
    shiftId: "shift-003",
    status: "pending",
    assignedAt: new Date("2025-06-23T09:45:00Z"),
    updatedAt: new Date("2025-06-23T09:45:00Z"),
    notes: "Requesting night shift CNA position",
  },
  {
    id: "assignment-008",
    userId: "user-001",
    shiftId: "shift-003",
    status: "pending",
    assignedAt: new Date("2025-06-23T14:20:00Z"),
    updatedAt: new Date("2025-06-23T14:20:00Z"),
    notes: "Available for additional night coverage",
  },
  {
    id: "assignment-009",
    userId: "user-007",
    shiftId: "shift-003",
    status: "pending",
    assignedAt: new Date("2025-06-23T16:30:00Z"),
    updatedAt: new Date("2025-06-23T16:30:00Z"),
    notes: "Requesting night shift assignment",
  },
  {
    id: "assignment-010",
    userId: "user-001",
    shiftId: "shift-005",
    status: "pending",
    assignedAt: new Date("2025-06-23T08:15:00Z"),
    updatedAt: new Date("2025-06-23T08:15:00Z"),
    notes: "Available for ED coverage",
  },
  {
    id: "assignment-011",
    userId: "user-003",
    shiftId: "shift-006",
    status: "pending",
    assignedAt: new Date("2025-06-23T12:45:00Z"),
    updatedAt: new Date("2025-06-23T12:45:00Z"),
    notes: "Requesting weekend lab coverage",
  },
  {
    id: "assignment-012",
    userId: "user-001",
    shiftId: "shift-002",
    status: "pending",
    assignedAt: new Date("2025-06-23T11:20:00Z"),
    updatedAt: new Date("2025-06-23T11:20:00Z"),
    notes: "Can provide additional RT support",
  },

  // Declined assignments
  {
    id: "assignment-006",
    userId: "user-005",
    shiftId: "shift-005",
    status: "declined",
    assignedAt: new Date("2025-06-21T08:30:00Z"),
    updatedAt: new Date("2025-06-21T12:15:00Z"),
    notes: "Declined due to scheduling conflict",
  },
];

// Helper functions for working with assignment data
export const getAssignmentById = (id: string): Assignment | undefined => {
  return mockAssignments.find((assignment) => assignment.id === id);
};

export const getAssignmentsByUser = (userId: string): Assignment[] => {
  return mockAssignments.filter((assignment) => assignment.userId === userId);
};

export const getAssignmentsByShift = (shiftId: string): Assignment[] => {
  return mockAssignments.filter((assignment) => assignment.shiftId === shiftId);
};

export const getAssignmentsByStatus = (status: string): Assignment[] => {
  return mockAssignments.filter((assignment) => assignment.status === status);
};

export const getPendingAssignments = (): Assignment[] => {
  return mockAssignments.filter((assignment) => assignment.status === "pending");
};

export const getConfirmedAssignments = (): Assignment[] => {
  return mockAssignments.filter((assignment) => assignment.status === "confirmed");
};
