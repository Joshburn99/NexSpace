export const config = {
  // Server configuration
  server: {
    port: Number(process.env.PORT) || 5000,
    nodeEnv: process.env.NODE_ENV || "development",
    appUrl: process.env.APP_URL || `http://localhost:${Number(process.env.PORT) || 5000}`,
  },

  // Database configuration
  database: {
    url: process.env.DATABASE_URL,
  },

  // Session configuration
  session: {
    secret: process.env.SESSION_SECRET || "nexspace-dev-secret",
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },

  // Email configuration
  email: {
    sendgridApiKey: process.env.SENDGRID_API_KEY,
    fromEmail: process.env.SENDGRID_FROM_EMAIL || "notifications@nexspace.com",
  },

  // Google services configuration
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_REDIRECT_URI || `http://localhost:${Number(process.env.PORT) || 5000}/api/calendar-sync/google/callback`,
  },

  // Calendar sync configuration
  calendar: {
    tokenSecret: process.env.CALENDAR_TOKEN_SECRET || "nexspace-calendar-sync",
  },

  // External API keys
  api: {
    openaiKey: process.env.OPENAI_API_KEY,
    cmsApiKey: process.env.CMS_API_KEY,
    npiApiKey: process.env.NPI_API_KEY,
  },

  // Rate limiting
  rateLimit: {
    maxShiftsPerRequest: 5000,
  },

  // Timeouts
  timeouts: {
    default: 5000,
    longRunning: 30000,
  },
} as const;

// Type-safe config getter with validation
export function getConfig<T extends keyof typeof config>(section: T): typeof config[T] {
  return config[section];
}

// Validate required environment variables on startup
export function validateConfig(): void {
  const requiredEnvVars = [
    { name: "DATABASE_URL", value: config.database.url },
    { name: "SESSION_SECRET", value: config.session.secret },
  ];

  const missing = requiredEnvVars.filter(({ value }) => !value);
  
  if (missing.length > 0) {
    const missingVars = missing.map(({ name }) => name).join(", ");
    throw new Error(`Missing required environment variables: ${missingVars}`);
  }
}