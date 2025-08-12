/**
 * Convenience wrapper functions for external API integrations
 * These functions provide standardized error handling and logging for external services
 */

import { ApiClient, createCustomApiClient } from "./api-client";
import { z } from "zod";
import pino from "pino";

const logger = pino({ name: "external-api-wrapper" });

/**
 * Generic wrapper for external API calls with standardized error handling
 */
export async function callExternalApi<T>(
  apiName: string,
  operation: string,
  apiCall: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();
  const requestId = `${apiName}_${operation}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  try {
    logger.info({
      requestId,
      apiName,
      operation,
    }, "Starting external API call");

    const result = await apiCall();

    logger.info({
      requestId,
      apiName,
      operation,
      duration: Date.now() - startTime,
    }, "External API call completed successfully");

    return result;

  } catch (error) {
    logger.error({
      requestId,
      apiName,
      operation,
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error),
    }, "External API call failed");

    // Re-throw with consistent error format
    throw new Error(`${apiName} ${operation} failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Create API client for webhook endpoints
 */
export function createWebhookApiClient(baseUrl: string, apiKey?: string): ApiClient {
  return createCustomApiClient({
    baseURL: baseUrl,
    apiKey,
    timeout: 30000, // Longer timeout for webhooks
    retries: 1, // Don't retry webhooks aggressively
    headers: {
      "Accept": "application/json",
      "User-Agent": "NexSpace-Webhook/1.0",
    },
  });
}

/**
 * Create API client for third-party integrations
 */
export function createThirdPartyApiClient(baseUrl: string, options?: {
  apiKey?: string;
  timeout?: number;
  retries?: number;
  headers?: Record<string, string>;
}): ApiClient {
  return createCustomApiClient({
    baseURL: baseUrl,
    apiKey: options?.apiKey,
    timeout: options?.timeout || 15000,
    retries: options?.retries || 3,
    headers: {
      "Accept": "application/json",
      ...options?.headers,
    },
  });
}

/**
 * Wrapper for SendGrid API calls (when not using their SDK)
 */
export async function sendGridApiCall<T>(
  endpoint: string,
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  body?: unknown
): Promise<T> {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) {
    throw new Error("SendGrid API key not configured");
  }

  const client = createThirdPartyApiClient("https://api.sendgrid.com", {
    apiKey,
    timeout: 10000,
    retries: 2,
  });

  const response = await client.request<T>(endpoint, {
    method,
    body,
    headers: {
      "Authorization": `Bearer ${apiKey}`,
    },
  });

  if (!response.success) {
    throw new Error(response.error || "SendGrid API request failed");
  }

  return response.data as T;
}

/**
 * Wrapper for Slack webhook calls
 */
export async function sendSlackWebhook(webhookUrl: string, message: {
  text?: string;
  blocks?: any[];
  attachments?: any[];
}): Promise<void> {
  return callExternalApi("Slack", "webhook", async () => {
    const client = createWebhookApiClient(webhookUrl);
    
    const response = await client.post("", message, {
      timeout: 10000,
      retries: 2,
    });

    if (!response.success) {
      throw new Error(response.error || "Slack webhook failed");
    }
  });
}

/**
 * Wrapper for Microsoft Teams webhook calls
 */
export async function sendTeamsWebhook(webhookUrl: string, message: {
  "@type": string;
  "@context": string;
  summary: string;
  sections?: any[];
}): Promise<void> {
  return callExternalApi("Teams", "webhook", async () => {
    const client = createWebhookApiClient(webhookUrl);
    
    const response = await client.post("", message, {
      timeout: 10000,
      retries: 2,
    });

    if (!response.success) {
      throw new Error(response.error || "Teams webhook failed");
    }
  });
}

/**
 * Wrapper for generic webhook calls
 */
export async function sendGenericWebhook(
  webhookUrl: string,
  payload: unknown,
  options?: {
    headers?: Record<string, string>;
    timeout?: number;
    retries?: number;
  }
): Promise<void> {
  return callExternalApi("Generic", "webhook", async () => {
    const client = createWebhookApiClient(webhookUrl);
    
    const response = await client.post("", payload, {
      timeout: options?.timeout || 10000,
      retries: options?.retries || 2,
      headers: options?.headers,
    });

    if (!response.success) {
      throw new Error(response.error || "Webhook failed");
    }
  });
}

/**
 * Wrapper for external health check endpoints
 */
export async function checkExternalServiceHealth(
  serviceName: string,
  healthUrl: string,
  expectedResponse?: Record<string, unknown>
): Promise<boolean> {
  try {
    return await callExternalApi(serviceName, "health_check", async () => {
      const client = createThirdPartyApiClient(healthUrl, {
        timeout: 5000,
        retries: 1,
      });

      const response = await client.get("");

      if (!response.success) {
        return false;
      }

      // Optionally validate expected response structure
      if (expectedResponse && response.data) {
        try {
          // Simple validation - check that all expected keys exist
          const data = response.data as Record<string, unknown>;
          for (const [key, expectedValue] of Object.entries(expectedResponse)) {
            if (!(key in data)) {
              return false;
            }
          }
        } catch {
          return false;
        }
      }

      return true;
    });
  } catch {
    return false;
  }
}

/**
 * Rate limit wrapper for external API calls
 */
export class ExternalApiRateLimiter {
  private callCounts = new Map<string, { count: number; resetTime: number }>();
  private readonly windowMs = 60000; // 1 minute window

  async checkRateLimit(apiName: string, maxCalls: number): Promise<boolean> {
    const now = Date.now();
    const key = apiName;
    
    if (!this.callCounts.has(key)) {
      this.callCounts.set(key, { count: 0, resetTime: now + this.windowMs });
    }

    const current = this.callCounts.get(key)!;

    // Reset if window has passed
    if (now >= current.resetTime) {
      current.count = 0;
      current.resetTime = now + this.windowMs;
    }

    // Check if under limit
    if (current.count < maxCalls) {
      current.count++;
      return true;
    }

    return false;
  }
}

export const externalApiRateLimiter = new ExternalApiRateLimiter();