// API Response Utilities
// Standardized response patterns to reduce code duplication

import { Response } from 'express';

// Success response
export const sendSuccess = (res: Response, data: any, message?: string, statusCode: number = 200) => {
  return res.status(statusCode).json({
    success: true,
    message: message || 'Success',
    data,
  });
};

// Error response
export const sendError = (res: Response, message: string, statusCode: number = 400, error?: any) => {
  return res.status(statusCode).json({
    success: false,
    message,
    error: process.env.NODE_ENV === 'development' ? error : undefined,
  });
};

// Paginated response
export const sendPaginatedResponse = (
  res: Response,
  data: any[],
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  }
) => {
  const totalPages = Math.ceil(pagination.total / pagination.pageSize);
  
  return res.json({
    success: true,
    data,
    pagination: {
      page: pagination.page,
      pageSize: pagination.pageSize,
      total: pagination.total,
      totalPages,
      hasNextPage: pagination.page < totalPages,
      hasPreviousPage: pagination.page > 1,
    },
  });
};

// Not found response
export const sendNotFound = (res: Response, resource: string = 'Resource') => {
  return sendError(res, `${resource} not found`, 404);
};

// Unauthorized response
export const sendUnauthorized = (res: Response, message: string = 'Unauthorized') => {
  return sendError(res, message, 401);
};

// Forbidden response
export const sendForbidden = (res: Response, message: string = 'Forbidden') => {
  return sendError(res, message, 403);
};

// Validation error response
export const sendValidationError = (res: Response, errors: any) => {
  return res.status(422).json({
    success: false,
    message: 'Validation failed',
    errors,
  });
};

// Created response
export const sendCreated = (res: Response, data: any, message: string = 'Created successfully') => {
  return sendSuccess(res, data, message, 201);
};

// Updated response
export const sendUpdated = (res: Response, data: any, message: string = 'Updated successfully') => {
  return sendSuccess(res, data, message);
};

// Deleted response
export const sendDeleted = (res: Response, message: string = 'Deleted successfully') => {
  return sendSuccess(res, null, message);
};

// Internal server error
export const sendServerError = (res: Response, error: any) => {
  console.error('Server error:', error);
  return sendError(
    res,
    'Internal server error',
    500,
    process.env.NODE_ENV === 'development' ? error.message : undefined
  );
};

// Rate limit response
export const sendRateLimitError = (res: Response) => {
  return sendError(res, 'Too many requests. Please try again later.', 429);
};

// Service unavailable
export const sendServiceUnavailable = (res: Response, message: string = 'Service temporarily unavailable') => {
  return sendError(res, message, 503);
};

// No content response
export const sendNoContent = (res: Response) => {
  return res.status(204).send();
};

// File response
export const sendFile = (res: Response, filePath: string, fileName: string) => {
  return res.download(filePath, fileName);
};

// Stream response
export const sendStream = (res: Response, stream: any, contentType: string) => {
  res.setHeader('Content-Type', contentType);
  stream.pipe(res);
};

// Handle async route errors
export const asyncHandler = (fn: Function) => (req: any, res: any, next: any) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};