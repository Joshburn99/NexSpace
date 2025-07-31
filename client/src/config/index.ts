export const clientConfig = {
  // API configuration
  api: {
    baseUrl: import.meta.env.VITE_API_URL || "",
    timeout: 5000,
  },

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