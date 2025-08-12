export const clientConfig = {
  // API configuration
  api: {
    baseUrl: import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "" : "https://your-production-domain.com"),
    basePath: import.meta.env.VITE_API_BASE_URL || "/api",
    timeout: parseInt(import.meta.env.VITE_API_TIMEOUT || "10000"),
    retries: parseInt(import.meta.env.VITE_API_RETRIES || "3"),
  },

  // WebSocket configuration
  websocket: {
    url: import.meta.env.VITE_WS_URL || (import.meta.env.DEV ? "/ws" : "wss://your-production-domain.com/ws"),
  },

  // Environment flags
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,

  // Google Maps configuration
  google: {
    mapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
  },

  // UI configuration
  ui: {
    defaultPageSize: 20,
    maxPageSize: 100,
    debounceDelay: 300,
    toastDuration: 5000,
  },

  // Calendar configuration
  calendar: {
    defaultView: "month",
    workingHours: {
      start: "07:00",
      end: "19:00",
    },
  },

  // Messaging configuration
  messaging: {
    refetchInterval: 5000,
    maxMessageLength: 1000,
  },

  // Financial defaults
  financial: {
    monthlyRevenueTarget: 250000,
    monthlyRevenueBenchmark: 235000,
  },
} as const;

// Type-safe config getter
export function getClientConfig<T extends keyof typeof clientConfig>(section: T): typeof clientConfig[T] {
  return clientConfig[section];
}