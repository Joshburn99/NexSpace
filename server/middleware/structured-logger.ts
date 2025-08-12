/**
 * Structured logging middleware using pino
 * Provides request-id correlation and centralized error handling
 */

import { Request, Response, NextFunction } from "express";
import pino from "pino";
import { randomUUID } from "crypto";

// Configure pino logger with structured format
const logger = pino({
  name: "nexspace-server",
  level: process.env.LOG_LEVEL || "info",
  ...(process.env.NODE_ENV === "development" && {
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "SYS:standard",
        ignore: "pid,hostname",
      },
    },
  }),
  serializers: {
    req: (req: Request) => ({
      method: req.method,
      url: req.url,
      headers: {
        'user-agent': req.headers['user-agent'],
        'content-type': req.headers['content-type'],
        'authorization': req.headers.authorization ? '[REDACTED]' : undefined,
      },
      ip: req.ip || req.connection?.remoteAddress,
      userId: (req as any).user?.id,
    }),
    res: (res: Response) => ({
      statusCode: res.statusCode,
      headers: {
        'content-type': res.get('content-type'),
        'content-length': res.get('content-length'),
      },
    }),
    err: pino.stdSerializers.err,
  },
});

// Extend Request type to include requestId and logger
declare global {
  namespace Express {
    interface Request {
      requestId: string;
      logger: pino.Logger;
      startTime: number;
    }
  }
}

/**
 * Request ID middleware - adds unique request ID to each request
 */
export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  req.requestId = req.headers['x-request-id'] as string || randomUUID();
  req.startTime = Date.now();
  
  // Add request ID to response headers for debugging
  res.setHeader('X-Request-ID', req.requestId);
  
  // Create child logger with request context
  req.logger = logger.child({ 
    requestId: req.requestId,
    method: req.method,
    url: req.url,
  });

  next();
};

/**
 * Request logging middleware - logs incoming requests with structured data
 */
export const requestLoggingMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Skip logging for health checks and static assets
  if (req.url === '/health' || req.url.startsWith('/@fs/') || req.url.includes('.map')) {
    return next();
  }

  req.logger.info({
    req,
    userAgent: req.headers['user-agent'],
    ip: req.ip || req.connection?.remoteAddress,
    userId: (req as any).user?.id,
  }, 'Request received');

  // Log response when finished
  const originalSend = res.send;
  res.send = function(body) {
    const duration = Date.now() - req.startTime;
    
    req.logger.info({
      res,
      duration: `${duration}ms`,
      bodySize: Buffer.isBuffer(body) ? body.length : JSON.stringify(body || '').length,
    }, 'Request completed');

    return originalSend.call(this, body);
  };

  next();
};

/**
 * Error logging middleware - logs errors with full context
 */
export const errorLoggingMiddleware = (err: Error, req: Request, res: Response, next: NextFunction): void => {
  const requestId = req.requestId || 'unknown';
  const duration = req.startTime ? Date.now() - req.startTime : 0;

  // Log error with full context
  const errorLogger = req.logger || logger;
  errorLogger.error({
    err,
    req,
    res: {
      statusCode: res.statusCode,
    },
    duration: `${duration}ms`,
    requestId,
    userId: (req as any).user?.id,
    stack: err.stack,
  }, 'Request error occurred');

  next(err);
};

/**
 * Centralized error handler - returns safe JSON responses and logs errors
 */
export const centralizedErrorHandler = (err: Error, req: Request, res: Response, next: NextFunction): void => {
  const requestId = req.requestId || 'unknown';
  const statusCode = (err as any).statusCode || (err as any).status || 500;

  // Don't double-handle if response already sent
  if (res.headersSent) {
    return next(err);
  }

  // Prepare safe error response
  const errorResponse: any = {
    error: true,
    message: statusCode < 500 ? err.message : 'Internal server error',
    requestId,
    timestamp: new Date().toISOString(),
  };

  // Add stack trace in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = err.stack;
    errorResponse.details = err.message;
  }

  // Add error code if available
  if ((err as any).code) {
    errorResponse.code = (err as any).code;
  }

  // Set appropriate status code
  res.status(statusCode);

  // Log final error details
  const errorLogger = req.logger || logger;
  errorLogger.error({
    requestId,
    statusCode,
    errorMessage: err.message,
    errorName: err.name,
    url: req.url,
    method: req.method,
    userId: (req as any).user?.id,
  }, 'Sending error response');

  // Send error response
  res.json(errorResponse);
};

/**
 * Async error wrapper - catches async errors and passes to error handler
 */
export const asyncErrorHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Log application events (startup, shutdown, etc.)
 */
export const applicationLogger = logger.child({ component: 'application' });

/**
 * Export the main logger for use throughout the application
 */
export { logger };

/**
 * Request performance logging middleware
 */
export const performanceLoggingMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const end = process.hrtime.bigint();
    const duration = Number(end - start) / 1000000; // Convert to milliseconds

    // Log slow requests (over 1 second)
    if (duration > 1000) {
      req.logger.warn({
        duration: `${duration.toFixed(2)}ms`,
        url: req.url,
        method: req.method,
        statusCode: res.statusCode,
      }, 'Slow request detected');
    }

    // Log to performance metrics if needed
    if (process.env.LOG_PERFORMANCE === 'true') {
      req.logger.debug({
        performance: {
          duration: `${duration.toFixed(2)}ms`,
          memory: process.memoryUsage(),
          cpuUsage: process.cpuUsage(),
        }
      }, 'Request performance metrics');
    }
  });

  next();
};

/**
 * Database query logging helper
 */
export const logDatabaseQuery = (query: string, params?: any[], duration?: number) => {
  const queryLogger = logger.child({ component: 'database' });
  
  queryLogger.debug({
    query: query.replace(/\s+/g, ' ').trim(),
    params: params ? params.map(p => typeof p === 'string' && p.length > 100 ? `${p.substring(0, 100)}...` : p) : undefined,
    duration: duration ? `${duration}ms` : undefined,
  }, 'Database query executed');
};

/**
 * External API call logging helper
 */
export const logExternalApiCall = (apiName: string, method: string, url: string, duration?: number, error?: Error) => {
  const apiLogger = logger.child({ component: 'external-api' });
  
  if (error) {
    apiLogger.error({
      apiName,
      method,
      url,
      duration: duration ? `${duration}ms` : undefined,
      error: error.message,
    }, 'External API call failed');
  } else {
    apiLogger.info({
      apiName,
      method,
      url,
      duration: duration ? `${duration}ms` : undefined,
    }, 'External API call completed');
  }
};