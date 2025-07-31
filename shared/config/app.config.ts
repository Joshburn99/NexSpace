// App Configuration
// This file centralizes all application configuration values that were previously hardcoded

export const APP_CONFIG = {
  // Application Info
  name: 'NexSpace',
  version: '1.0.0',
  description: 'Healthcare Workforce Management Platform',
  
  // Server Configuration
  server: {
    port: process.env.PORT || 5000,
    host: '0.0.0.0',
    env: process.env.NODE_ENV || 'development',
    sessionSecret: process.env.SESSION_SECRET || 'nexspace-session-secret-2024',
  },
  
  // Database Configuration
  database: {
    url: process.env.DATABASE_URL,
    poolSize: parseInt(process.env.DB_POOL_SIZE || '10'),
    idleTimeout: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
  },
  
  // Authentication Configuration
  auth: {
    sessionMaxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    bcryptRounds: 10,
    passwordMinLength: 8,
    maxLoginAttempts: 5,
    lockoutDuration: 15 * 60 * 1000, // 15 minutes
  },
  
  // File Upload Configuration
  upload: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    uploadDir: process.env.UPLOAD_DIR || './uploads',
  },
  
  // Pagination Configuration
  pagination: {
    defaultPageSize: 20,
    maxPageSize: 100,
  },
  
  // Facility Configuration
  facility: {
    defaultBedCount: 150,
    defaultTimezone: 'America/New_York',
    minBedCount: 50,
    maxBedCount: 500,
    radiusSearchDefault: 25, // miles
    radiusSearchMax: 100, // miles
  },
  
  // Shift Configuration
  shift: {
    defaultDuration: 8, // hours
    minDuration: 4, // hours
    maxDuration: 16, // hours
    advanceBookingDays: 90,
    cancellationWindow: 24, // hours
    overtimeThreshold: 40, // hours per week
  },
  
  // Staff Configuration
  staff: {
    maxCertifications: 20,
    maxLanguages: 10,
    defaultHourlyRate: 35,
    minHourlyRate: 15,
    maxHourlyRate: 150,
  },
  
  // WebSocket Configuration
  websocket: {
    port: process.env.WS_PORT || 9005,
    pingInterval: 30000, // 30 seconds
    reconnectDelay: 5000, // 5 seconds
    maxReconnectAttempts: 10,
  },
  
  // Email Configuration
  email: {
    provider: process.env.EMAIL_PROVIDER || 'sendgrid',
    fromAddress: process.env.EMAIL_FROM || 'noreply@nexspace.com',
    supportEmail: process.env.SUPPORT_EMAIL || 'support@nexspace.com',
  },
  
  // Analytics Configuration
  analytics: {
    retentionDays: 90,
    samplingRate: 1.0,
    batchSize: 100,
  },
  
  // Security Configuration
  security: {
    corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:5000'],
    rateLimitWindow: 15 * 60 * 1000, // 15 minutes
    rateLimitMax: 100,
    jwtExpiresIn: '7d',
  },
  
  // Feature Flags
  features: {
    enableWebSocket: process.env.ENABLE_WEBSOCKET !== 'false',
    enableAnalytics: process.env.ENABLE_ANALYTICS !== 'false',
    enableNotifications: process.env.ENABLE_NOTIFICATIONS !== 'false',
    enableCalendarSync: process.env.ENABLE_CALENDAR_SYNC === 'true',
    enableAI: process.env.ENABLE_AI === 'true',
  },
} as const;

export type AppConfig = typeof APP_CONFIG;