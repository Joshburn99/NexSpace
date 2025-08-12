import pino from 'pino';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

// Create logger instance
export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'development' ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      ignore: 'pid,hostname',
      translateTime: 'SYS:standard',
    },
  } : undefined,
});

// Request ID middleware
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const requestId = req.headers['x-request-id'] as string || randomUUID();
  req.id = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
}

// Logging middleware
export function loggingMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  const requestId = req.id || randomUUID();

  // Log request
  logger.info({
    requestId,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  }, 'Request received');

  // Log response
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      requestId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
    }, 'Request completed');
  });

  next();
}

// Error logging middleware
export function errorLoggingMiddleware(err: any, req: Request, res: Response, next: NextFunction) {
  const requestId = req.id || randomUUID();
  
  logger.error({
    requestId,
    method: req.method,
    url: req.url,
    error: {
      message: err.message,
      stack: err.stack,
      name: err.name,
    },
  }, 'Request error');

  next(err);
}

// Declare module to add id to Request
declare global {
  namespace Express {
    interface Request {
      id?: string;
    }
  }
}