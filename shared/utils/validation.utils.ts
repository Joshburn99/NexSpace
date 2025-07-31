// Validation Utilities
// Common validation functions to reduce code duplication

import { z } from 'zod';

// Email validation
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Phone validation
export const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^\+?1?\d{10,14}$/;
  return phoneRegex.test(phone.replace(/[\s()-]/g, ''));
};

// Date validation
export const isValidDate = (date: string | Date): boolean => {
  const parsed = new Date(date);
  return !isNaN(parsed.getTime());
};

// Time validation (HH:MM format)
export const isValidTime = (time: string): boolean => {
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  return timeRegex.test(time);
};

// Pagination validation
export const validatePagination = (page?: number, pageSize?: number) => {
  const validPage = Math.max(1, page || 1);
  const validPageSize = Math.min(100, Math.max(1, pageSize || 20));
  return {
    page: validPage,
    pageSize: validPageSize,
    offset: (validPage - 1) * validPageSize,
  };
};

// ID validation
export const isValidId = (id: any): boolean => {
  return typeof id === 'number' && id > 0 && Number.isInteger(id);
};

// Role validation
export const isValidRole = (role: string, validRoles: readonly string[]): boolean => {
  return validRoles.includes(role);
};

// Shift time validation
export const validateShiftTimes = (startTime: string, endTime: string): boolean => {
  if (!isValidTime(startTime) || !isValidTime(endTime)) return false;
  
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  
  // Allow overnight shifts
  return startMinutes !== endMinutes;
};

// Date range validation
export const isValidDateRange = (startDate: Date | string, endDate: Date | string): boolean => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (!isValidDate(start) || !isValidDate(end)) return false;
  
  return start <= end;
};

// Common Zod schemas
export const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
});

export const dateRangeSchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
}).refine(data => new Date(data.startDate) <= new Date(data.endDate), {
  message: "End date must be after start date",
});

export const idSchema = z.coerce.number().int().positive();

export const phoneSchema = z.string().regex(/^\+?1?\d{10,14}$/, {
  message: "Invalid phone number format",
});

export const emailSchema = z.string().email();

// Sanitization functions
export const sanitizeInput = (input: string): string => {
  return input.trim().replace(/[<>]/g, '');
};

export const sanitizePhone = (phone: string): string => {
  return phone.replace(/[\s()-]/g, '');
};

// Null/undefined checks
export const isNullOrUndefined = (value: any): value is null | undefined => {
  return value === null || value === undefined;
};

export const hasValue = <T>(value: T | null | undefined): value is T => {
  return value !== null && value !== undefined;
};