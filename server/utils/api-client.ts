import { z } from "zod";
import pino from "pino";

const logger = pino({
  name: "api-client",
  level: process.env.LOG_LEVEL || "info",
});

// Configuration schema
const ApiConfigSchema = z.object({
  baseURL: z.string().url(),
  apiKey: z.string().optional(),
  timeout: z.number().min(1000).max(60000).default(10000),
  retries: z.number().min(0).max(5).default(3),
  retryDelay: z.number().min(100).max(5000).default(1000),
  headers: z.record(z.string()).optional(),
});

type ApiConfig = z.infer<typeof ApiConfigSchema>;

// Response wrapper schema
const ApiResponseSchema = z.object({
  success: z.boolean(),
  data: z.unknown().optional(),
  error: z.string().optional(),
  statusCode: z.number().optional(),
  headers: z.record(z.string()).optional(),
});

type ApiResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
  headers?: Record<string, string>;
};

// Request options schema
const RequestOptionsSchema = z.object({
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).default("GET"),
  body: z.unknown().optional(),
  headers: z.record(z.string()).optional(),
  timeout: z.number().optional(),
  retries: z.number().optional(),
  validateResponse: z.function().optional(),
  skipRetryOn: z.array(z.number()).optional(), // Status codes to not retry on
});

type RequestOptions = z.infer<typeof RequestOptionsSchema>;

/**
 * Comprehensive API client with configurable timeouts, retries, and validation
 */
export class ApiClient {
  private config: ApiConfig;
  private abortController: AbortController;

  constructor(config: Partial<ApiConfig>) {
    this.config = ApiConfigSchema.parse({
      timeout: 10000,
      retries: 3,
      retryDelay: 1000,
      ...config,
    });
    this.abortController = new AbortController();
  }

  /**
   * Make an HTTP request with full error handling and retries
   */
  async request<T = unknown>(
    endpoint: string,
    options: Partial<RequestOptions> = {}
  ): Promise<ApiResponse<T>> {
    const requestOptions = RequestOptionsSchema.parse(options);
    const url = new URL(endpoint, this.config.baseURL).toString();
    const timeout = requestOptions.timeout || this.config.timeout;
    const maxRetries = requestOptions.retries ?? this.config.retries;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const requestId = this.generateRequestId();
      
      try {
        logger.info({
          requestId,
          method: requestOptions.method,
          url,
          attempt: attempt + 1,
          maxRetries: maxRetries + 1,
        }, "Making API request");

        const response = await this.makeRequest(url, requestOptions, timeout, requestId);
        
        if (response.success) {
          // Validate response if validator provided
          if (requestOptions.validateResponse && response.data) {
            try {
              const validatedData = requestOptions.validateResponse(response.data);
              response.data = validatedData;
            } catch (validationError) {
              logger.error({
                requestId,
                error: validationError,
                data: response.data,
              }, "Response validation failed");
              
              return {
                success: false,
                error: `Response validation failed: ${validationError instanceof Error ? validationError.message : String(validationError)}`,
                statusCode: response.statusCode,
              };
            }
          }

          logger.info({
            requestId,
            statusCode: response.statusCode,
            attempt: attempt + 1,
          }, "API request successful");

          return response;
        }

        // Check if we should skip retries for this status code
        if (
          requestOptions.skipRetryOn?.includes(response.statusCode || 0) ||
          this.shouldSkipRetry(response.statusCode)
        ) {
          logger.warn({
            requestId,
            statusCode: response.statusCode,
            error: response.error,
          }, "API request failed, skipping retries");
          
          return response;
        }

        lastError = new Error(response.error || `HTTP ${response.statusCode}`);
        
        if (attempt < maxRetries) {
          const delay = this.calculateBackoffDelay(attempt);
          logger.warn({
            requestId,
            attempt: attempt + 1,
            maxRetries: maxRetries + 1,
            retryDelay: delay,
            error: response.error,
          }, "API request failed, retrying");
          
          await this.sleep(delay);
        }

      } catch (error) {
        lastError = error as Error;
        
        if (attempt < maxRetries && !this.isNonRetryableError(error)) {
          const delay = this.calculateBackoffDelay(attempt);
          logger.warn({
            requestId,
            attempt: attempt + 1,
            maxRetries: maxRetries + 1,
            retryDelay: delay,
            error: error instanceof Error ? error.message : String(error),
          }, "API request error, retrying");
          
          await this.sleep(delay);
        } else {
          logger.error({
            requestId,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
          }, "API request failed permanently");
          
          break;
        }
      }
    }

    return {
      success: false,
      error: lastError?.message || "Request failed after all retries",
    };
  }

  /**
   * Make the actual HTTP request
   */
  private async makeRequest(
    url: string,
    options: RequestOptions,
    timeout: number,
    requestId: string
  ): Promise<ApiResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      // Prepare headers
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "User-Agent": "NexSpace-API-Client/1.0",
        "X-Request-ID": requestId,
        ...this.config.headers,
        ...options.headers,
      };

      // Add API key if configured
      if (this.config.apiKey) {
        headers.Authorization = `Bearer ${this.config.apiKey}`;
      }

      // Prepare request body
      let body: string | undefined;
      if (options.body && options.method !== "GET") {
        if (typeof options.body === "string") {
          body = options.body;
        } else {
          body = JSON.stringify(options.body);
        }
      }

      const response = await fetch(url, {
        method: options.method,
        headers,
        body,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Extract response headers
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      // Parse response body
      let responseData: unknown;
      const contentType = response.headers.get("content-type");
      
      if (contentType?.includes("application/json")) {
        try {
          responseData = await response.json();
        } catch {
          responseData = null;
        }
      } else {
        responseData = await response.text();
      }

      if (!response.ok) {
        const errorMessage = this.extractErrorMessage(responseData, response.status);
        
        return {
          success: false,
          error: errorMessage,
          statusCode: response.status,
          headers: responseHeaders,
        };
      }

      return {
        success: true,
        data: responseData,
        statusCode: response.status,
        headers: responseHeaders,
      };

    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(`Request timeout after ${timeout}ms`);
      }
      
      throw error;
    }
  }

  /**
   * GET request helper
   */
  async get<T = unknown>(
    endpoint: string,
    options: Omit<Partial<RequestOptions>, "method" | "body"> = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: "GET" });
  }

  /**
   * POST request helper
   */
  async post<T = unknown>(
    endpoint: string,
    body?: unknown,
    options: Omit<Partial<RequestOptions>, "method" | "body"> = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: "POST", body });
  }

  /**
   * PUT request helper
   */
  async put<T = unknown>(
    endpoint: string,
    body?: unknown,
    options: Omit<Partial<RequestOptions>, "method" | "body"> = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: "PUT", body });
  }

  /**
   * PATCH request helper
   */
  async patch<T = unknown>(
    endpoint: string,
    body?: unknown,
    options: Omit<Partial<RequestOptions>, "method" | "body"> = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: "PATCH", body });
  }

  /**
   * DELETE request helper
   */
  async delete<T = unknown>(
    endpoint: string,
    options: Omit<Partial<RequestOptions>, "method" | "body"> = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: "DELETE" });
  }

  /**
   * Calculate exponential backoff delay with jitter
   */
  private calculateBackoffDelay(attempt: number): number {
    const baseDelay = this.config.retryDelay;
    const exponentialDelay = baseDelay * Math.pow(2, attempt);
    const jitter = Math.random() * 0.1 * exponentialDelay; // 10% jitter
    return Math.min(exponentialDelay + jitter, 30000); // Max 30 seconds
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Extract error message from response
   */
  private extractErrorMessage(responseData: unknown, statusCode: number): string {
    if (typeof responseData === "object" && responseData !== null) {
      const data = responseData as Record<string, unknown>;
      
      // Try common error message fields
      for (const field of ["message", "error", "detail", "errors"]) {
        if (typeof data[field] === "string") {
          return data[field] as string;
        }
      }
    }

    if (typeof responseData === "string") {
      return responseData;
    }

    // Default error messages by status code
    const defaultMessages: Record<number, string> = {
      400: "Bad Request",
      401: "Unauthorized",
      403: "Forbidden", 
      404: "Not Found",
      429: "Too Many Requests",
      500: "Internal Server Error",
      502: "Bad Gateway",
      503: "Service Unavailable",
      504: "Gateway Timeout",
    };

    return defaultMessages[statusCode] || `HTTP Error ${statusCode}`;
  }

  /**
   * Check if error should not be retried
   */
  private isNonRetryableError(error: unknown): boolean {
    if (error instanceof Error) {
      // Don't retry on abort/timeout errors
      if (error.name === "AbortError" || error.message.includes("timeout")) {
        return false; // Actually, we should retry timeouts
      }
      
      // Don't retry on network errors that indicate permanent failures
      if (error.message.includes("ENOTFOUND") || error.message.includes("ECONNREFUSED")) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Check if HTTP status code should skip retries
   */
  private shouldSkipRetry(statusCode?: number): boolean {
    if (!statusCode) return false;
    
    // Don't retry client errors (4xx) except rate limiting
    if (statusCode >= 400 && statusCode < 500 && statusCode !== 429) {
      return true;
    }
    
    return false;
  }

  /**
   * Cancel all pending requests
   */
  public cancel(): void {
    this.abortController.abort();
    this.abortController = new AbortController();
  }
}

/**
 * Pre-configured API clients for common services
 */
export const createCMSApiClient = (): ApiClient => {
  return new ApiClient({
    baseURL: process.env.CMS_API_URL || "https://data.cms.gov",
    apiKey: process.env.CMS_API_KEY,
    timeout: parseInt(process.env.CMS_API_TIMEOUT || "15000"),
    retries: parseInt(process.env.CMS_API_RETRIES || "3"),
    headers: {
      "Accept": "application/json",
    },
  });
};

export const createNPIApiClient = (): ApiClient => {
  return new ApiClient({
    baseURL: process.env.NPI_API_URL || "https://npiregistry.cms.hhs.gov",
    timeout: parseInt(process.env.NPI_API_TIMEOUT || "10000"),
    retries: parseInt(process.env.NPI_API_RETRIES || "2"),
    headers: {
      "Accept": "application/json",
    },
  });
};

export const createCustomApiClient = (config: Partial<ApiConfig>): ApiClient => {
  return new ApiClient(config);
};

// TypeScript schemas for common API responses
export const CMSProviderDataSchema = z.object({
  provider_name: z.string(),
  address: z.string(),
  city_name: z.string(),
  state_abbr: z.string(),
  zip_code: z.string(),
  phone_number: z.string(),
  federal_provider_number: z.string(),
  provider_type: z.string(),
  total_number_of_certified_beds: z.number().optional(),
  total_private_rooms: z.number().optional(),
  number_of_certified_beds: z.number().optional(),
  participates_in_medicare: z.boolean().optional(),
  participates_in_medicaid: z.boolean().optional(),
  administrator_name: z.string().optional(),
  administrator_title: z.string().optional(),
  medical_director_name: z.string().optional(),
  most_recent_health_inspection_date: z.string().optional(),
  number_of_standard_deficiencies: z.number().optional(),
  number_of_complaints: z.number().optional(),
  total_amount_of_fines_in_dollars: z.number().optional(),
  overall_rating: z.number().optional(),
});

export type CMSProviderData = z.infer<typeof CMSProviderDataSchema>;

export const NPIProviderDataSchema = z.object({
  number: z.string(),
  enumeration_type: z.string(),
  basic: z.object({
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    middle_name: z.string().optional(),
    organization_name: z.string().optional(),
    name_prefix: z.string().optional(),
    name_suffix: z.string().optional(),
  }),
  addresses: z.array(z.object({
    address_1: z.string(),
    address_2: z.string().optional(),
    city: z.string(),
    state: z.string(),
    postal_code: z.string(),
    country_code: z.string(),
    country_name: z.string(),
    address_purpose: z.string(),
  })).optional(),
  taxonomies: z.array(z.object({
    code: z.string(),
    desc: z.string(),
    primary: z.boolean().optional(),
  })).optional(),
});

export type NPIProviderData = z.infer<typeof NPIProviderDataSchema>;