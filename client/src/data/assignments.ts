import type { Assignment } from '../types';

export const mockAssignments: Assignment[] = [
  {
    id: 'assignment-001',
    userId: 'user-001',
    shiftId: 'shift-001',
    status: 'confirmed',
    assignedAt: new Date('2025-06-22T10:30:00Z'),
    updatedAt: new Date('2025-06-22T10:30:00Z'),
    notes: 'Confirmed for ICU coverage'
  },
  {
    id: 'assignment-002',
    userId: 'user-007',
    shiftId: 'shift-001',
    status: 'confirmed',
    assignedAt: new Date('2025-06-22T11:15:00Z'),
    updatedAt: new Date('2025-06-22T11:15:00Z'),
    notes: 'Secondary RN for ICU shift'
  },
  {
    id: 'assignment-003',
    userId: 'user-002',
    shiftId: 'shift-002',
    status: 'confirmed',
    assignedAt: new Date('2025-06-21T14:20:00Z'),
    updatedAt: new Date('2025-06-21T14:20:00Z'),
    notes: 'RT coverage confirmed'
  },
  {
    id: 'assignment-004',
    userId: 'user-003',
    shiftId: 'shift-003',
    status: 'pending',
    assignedAt: new Date('2025-06-23T09:45:00Z'),
    updatedAt: new Date('2025-06-23T09:45:00Z'),
    notes: 'Waiting for confirmation on night shift'
  },
  {
    id: 'assignment-005',
    userId: 'user-005',
    shiftId: 'shift-004',
    status: 'confirmed',
    assignedAt: new Date('2025-06-22T16:00:00Z'),
    updatedAt: new Date('2025-06-22T16:00:00Z'),
    notes: 'PT outpatient coverage'
  },
  {
    id: 'assignment-006',
    userId: 'user-001',
    shiftId: 'shift-005',
    status: 'declined',
    assignedAt: new Date('2025-06-21T08:30:00Z'),
    updatedAt: new Date('2025-06-21T12:15:00Z'),
    notes: 'Declined due to scheduling conflict'
  },
  {
    id: 'assignment-007',
    userId: 'user-007',
    shiftId: 'shift-005',
    status: 'confirmed',
    assignedAt: new Date('2025-06-23T13:20:00Z'),
    updatedAt: new Date('2025-06-23T13:20:00Z'),
    notes: 'ED night shift coverage'
  }
];

// Helper functions for working with assignment data
export const getAssignmentById = (id: string): Assignment | undefined => {
  return mockAssignments.find(assignment => assignment.id === id);
};

export const getAssignmentsByUser = (userId: string): Assignment[] => {
  return mockAssignments.filter(assignment => assignment.userId === userId);
};

export const getAssignmentsByShift = (shiftId: string): Assignment[] => {
  return mockAssignments.filter(assignment => assignment.shiftId === shiftId);
};

export const getAssignmentsByStatus = (status: string): Assignment[] => {
  return mockAssignments.filter(assignment => assignment.status === status);
};

export const getPendingAssignments = (): Assignment[] => {
  return mockAssignments.filter(assignment => assignment.status === 'pending');
};

export const getConfirmedAssignments = (): Assignment[] => {
  return mockAssignments.filter(assignment => assignment.status === 'confirmed');
};