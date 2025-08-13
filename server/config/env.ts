import { z } from 'zod';

// Define the environment schema
const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('5000').transform(Number),
  
  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  
  // Authentication
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters').default('nexspace-dev-secret-change-in-production'),
  JWT_SECRET: z.string().optional(),
  JWT_REFRESH_SECRET: z.string().optional(),
  
  // Replit environment
  REPL_SLUG: z.string().optional(),
  REPL_OWNER: z.string().optional(),
  REPL_ID: z.string().optional(),
  
  // CORS
  CORS_ORIGIN: z.string().optional(),
  
  // Rate limiting
  RATE_LIMIT_WINDOW_MS: z.string().default('900000').transform(Number),
  RATE_LIMIT_MAX_REQUESTS: z.string().default('100').transform(Number),
  
  // External APIs (optional)
  OPENAI_API_KEY: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().optional(),
  SENDGRID_API_KEY: z.string().optional(),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  
  // Feature flags
  ENABLE_ANALYTICS: z.string().default('true').transform(v => v === 'true'),
  ENABLE_NOTIFICATIONS: z.string().default('true').transform(v => v === 'true'),
});

type Env = z.infer<typeof envSchema>;

// Validate environment variables
export function validateEnv(): Env {
  try {
    const parsed = envSchema.parse(process.env);
    console.log('✅ Environment variables validated successfully');
    return parsed;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Environment validation failed:');
      console.error('Missing or invalid environment variables:');
      
      const issues = error.errors.map(e => {
        const path = e.path.join('.');
        const message = e.message;
        return `  - ${path}: ${message}`;
      });
      
      console.error(issues.join('\n'));
      console.error('\nPlease check your .env file and ensure all required variables are set.');
      
      // Only exit in production, warn in development
      if (process.env.NODE_ENV === 'production') {
        process.exit(1);
      }
    }
    throw error;
  }
}

// Export validated environment
export const env = validateEnv();

// Create environment variable inventory
export function getEnvInventory() {
  const inventory = [
    { name: 'NODE_ENV', files: ['server/index.ts', 'server/config/env.ts'], required: false, default: 'development' },
    { name: 'PORT', files: ['server/index.ts', 'server/config/index.ts'], required: false, default: '5000' },
    { name: 'DATABASE_URL', files: ['server/db.ts', 'drizzle.config.ts'], required: true, default: null },
    { name: 'SESSION_SECRET', files: ['server/auth.ts'], required: true, default: 'nexspace-dev-secret-change-in-production' },
    { name: 'JWT_SECRET', files: ['server/middleware/auth.ts'], required: false, default: null },
    { name: 'JWT_REFRESH_SECRET', files: ['server/middleware/auth.ts'], required: false, default: null },
    { name: 'REPL_SLUG', files: ['server/index.ts'], required: false, default: null },
    { name: 'REPL_OWNER', files: ['server/index.ts'], required: false, default: null },
    { name: 'CORS_ORIGIN', files: ['server/index.ts'], required: false, default: null },
    { name: 'RATE_LIMIT_WINDOW_MS', files: ['server/index.ts'], required: false, default: '900000' },
    { name: 'RATE_LIMIT_MAX_REQUESTS', files: ['server/index.ts'], required: false, default: '100' },
    { name: 'OPENAI_API_KEY', files: ['server/routes/facilities.routes.ts'], required: false, default: null },
    { name: 'GOOGLE_CLIENT_ID', files: ['server/calendar-sync-routes.ts'], required: false, default: null },
    { name: 'GOOGLE_CLIENT_SECRET', files: ['server/calendar-sync-routes.ts'], required: false, default: null },
    { name: 'SENDGRID_API_KEY', files: ['server/services/notification-service.ts'], required: false, default: null },
    { name: 'VITE_API_URL', files: ['client/src/lib/api.ts'], required: false, default: '' },
    { name: 'VITE_APP_NAME', files: ['client/src/components/UnifiedHeader.tsx'], required: false, default: 'NexSpace' },
  ];
  
  return inventory;
}

// Log environment inventory on startup
export function logEnvInventory() {
  console.log('\n📋 Environment Variables Inventory:');
  console.log('----------------------------------------');
  const inventory = getEnvInventory();
  
  console.table(inventory.map(item => ({
    Variable: item.name,
    Required: item.required ? '✓' : '-',
    'Default Value': item.default || 'none',
    Status: process.env[item.name] ? '✅ Set' : item.required ? '❌ Missing' : '⚠️ Using default'
  })));
}