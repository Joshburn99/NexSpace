import type { Shift } from '../types';

export const mockShifts: Shift[] = [
  {
    id: 'shift-001',
    title: 'ICU Day Shift - RN',
    facilityId: 'facility-001',
    specialty: 'RN',
    date: '2025-06-24',
    startTime: '07:00',
    endTime: '19:00',
    requiredWorkers: 3,
    assignedWorkerIds: ['user-001', 'user-007'],
    status: 'open',
    description: 'ICU day shift requiring experienced RNs for critical care',
    requirements: ['ICU experience', 'ACLS certification', 'Minimum 2 years experience'],
    payRate: 45.50,
    createdAt: new Date('2025-06-20T10:00:00Z'),
    updatedAt: new Date('2025-06-22T14:30:00Z')
  },
  {
    id: 'shift-002',
    title: 'Respiratory Therapy - Day Shift',
    facilityId: 'facility-001',
    specialty: 'RT',
    date: '2025-06-24',
    startTime: '06:00',
    endTime: '18:00',
    requiredWorkers: 2,
    assignedWorkerIds: ['user-002'],
    status: 'open',
    description: 'Respiratory therapy coverage for general hospital units',
    requirements: ['RRT or CRT license', 'COVID-19 protocols training'],
    payRate: 38.75,
    createdAt: new Date('2025-06-21T09:15:00Z'),
    updatedAt: new Date('2025-06-21T09:15:00Z')
  },
  {
    id: 'shift-003',
    title: 'CNA Night Shift - Medical Floor',
    facilityId: 'facility-002',
    specialty: 'CNA',
    date: '2025-06-24',
    startTime: '19:00',
    endTime: '07:00',
    requiredWorkers: 4,
    assignedWorkerIds: ['user-003'],
    status: 'open',
    description: 'Night shift CNA coverage for medical floor patients',
    requirements: ['CNA certification', 'Basic Life Support'],
    payRate: 22.00,
    createdAt: new Date('2025-06-19T16:45:00Z'),
    updatedAt: new Date('2025-06-23T11:20:00Z')
  },
  {
    id: 'shift-004',
    title: 'Physical Therapy - Outpatient',
    facilityId: 'facility-005',
    specialty: 'PT',
    date: '2025-06-25',
    startTime: '08:00',
    endTime: '17:00',
    requiredWorkers: 2,
    assignedWorkerIds: ['user-005'],
    status: 'open',
    description: 'Outpatient physical therapy sessions',
    requirements: ['PT license', 'Outpatient experience preferred'],
    payRate: 42.00,
    createdAt: new Date('2025-06-22T13:30:00Z'),
    updatedAt: new Date('2025-06-22T13:30:00Z')
  },
  {
    id: 'shift-005',
    title: 'Emergency Department - RN',
    facilityId: 'facility-003',
    specialty: 'RN',
    date: '2025-06-25',
    startTime: '19:00',
    endTime: '07:00',
    requiredWorkers: 5,
    assignedWorkerIds: ['user-001', 'user-007'],
    status: 'open',
    description: 'Emergency department night shift coverage',
    requirements: ['ED experience', 'ACLS/PALS', 'Trauma experience preferred'],
    payRate: 52.25,
    createdAt: new Date('2025-06-20T08:00:00Z'),
    updatedAt: new Date('2025-06-23T15:45:00Z')
  },
  {
    id: 'shift-006',
    title: 'Lab Tech - Weekend Coverage',
    facilityId: 'facility-002',
    specialty: 'LabTech',
    date: '2025-06-28',
    startTime: '07:00',
    endTime: '15:00',
    requiredWorkers: 1,
    assignedWorkerIds: [],
    status: 'open',
    description: 'Weekend laboratory coverage for routine and urgent testing',
    requirements: ['MLT or MLS certification', 'Phlebotomy skills'],
    payRate: 28.50,
    createdAt: new Date('2025-06-18T14:20:00Z'),
    updatedAt: new Date('2025-06-18T14:20:00Z')
  },
  {
    id: 'shift-007',
    title: 'Pharmacy Tech - Evening',
    facilityId: 'facility-001',
    specialty: 'PharmTech',
    date: '2025-06-26',
    startTime: '15:00',
    endTime: '23:00',
    requiredWorkers: 2,
    assignedWorkerIds: [],
    status: 'draft',
    description: 'Evening pharmacy technician support',
    requirements: ['Pharmacy Tech certification', 'IV room experience'],
    payRate: 24.75,
    createdAt: new Date('2025-06-23T10:15:00Z'),
    updatedAt: new Date('2025-06-23T10:15:00Z')
  },
  {
    id: 'shift-008',
    title: 'Surgical Tech - OR Coverage',
    facilityId: 'facility-003',
    specialty: 'CST',
    date: '2025-06-27',
    startTime: '06:30',
    endTime: '15:00',
    requiredWorkers: 3,
    assignedWorkerIds: [],
    status: 'open',
    description: 'Operating room surgical technician coverage',
    requirements: ['CST certification', 'OR experience', 'Sterile processing knowledge'],
    payRate: 35.00,
    createdAt: new Date('2025-06-21T12:00:00Z'),
    updatedAt: new Date('2025-06-21T12:00:00Z')
  }
];

// Helper functions for working with shift data
export const getShiftById = (id: string): Shift | undefined => {
  return mockShifts.find(shift => shift.id === id);
};

export const getShiftsByFacility = (facilityId: string): Shift[] => {
  return mockShifts.filter(shift => shift.facilityId === facilityId);
};

export const getShiftsBySpecialty = (specialty: string): Shift[] => {
  return mockShifts.filter(shift => shift.specialty === specialty);
};

export const getShiftsByStatus = (status: string): Shift[] => {
  return mockShifts.filter(shift => shift.status === status);
};

export const getOpenShifts = (): Shift[] => {
  return mockShifts.filter(shift => shift.status === 'open');
};