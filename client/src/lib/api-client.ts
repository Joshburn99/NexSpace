import { clientConfig } from '@/config';

/**
 * Enhanced API Client with Environment Configuration
 * Supports both dev proxy and production URLs
 */
class ApiClient {
  private baseUrl: string;
  private timeout: number;
  private retries: number;

  constructor() {
    this.baseUrl = clientConfig.api.baseUrl;
    this.timeout = clientConfig.api.timeout;
    this.retries = clientConfig.api.retries;
  }

  private buildUrl(endpoint: string): string {
    // In dev mode with proxy, use relative URLs
    if (clientConfig.isDev && !this.baseUrl) {
      return endpoint.startsWith('/') ? endpoint : `/${clientConfig.api.basePath}/${endpoint}`;
    }
    
    // Production or explicit baseUrl
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${this.baseUrl}${cleanEndpoint}`;
  }

  async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<{ data: T; response: Response }> {
    const url = this.buildUrl(endpoint);
    
    const config: RequestInit = {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    let lastError: Error;
    
    for (let attempt = 1; attempt <= this.retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);
        
        const response = await fetch(url, {
          ...config,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text().catch(() => response.statusText);
          throw new ApiError(
            `${response.status}: ${errorText}`,
            response.status,
            response,
            errorText
          );
        }

        const contentType = response.headers.get('content-type');
        const data = contentType?.includes('application/json') 
          ? await response.json()
          : await response.text();

        return { data, response };
        
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry client errors (4xx)
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
          throw error;
        }
        
        // Don't retry on last attempt
        if (attempt === this.retries) {
          break;
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }

    throw lastError!;
  }

  async get<T = any>(endpoint: string, options?: RequestInit): Promise<T> {
    const { data } = await this.request<T>(endpoint, { ...options, method: 'GET' });
    return data;
  }

  async post<T = any>(endpoint: string, body?: any, options?: RequestInit): Promise<T> {
    const { data } = await this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
    return data;
  }

  async put<T = any>(endpoint: string, body?: any, options?: RequestInit): Promise<T> {
    const { data } = await this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
    return data;
  }

  async patch<T = any>(endpoint: string, body?: any, options?: RequestInit): Promise<T> {
    const { data } = await this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
    return data;
  }

  async delete<T = any>(endpoint: string, options?: RequestInit): Promise<T> {
    const { data } = await this.request<T>(endpoint, { ...options, method: 'DELETE' });
    return data;
  }
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public response: Response,
    public details?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }

  get isAuthError(): boolean {
    return this.status === 401;
  }

  get isForbiddenError(): boolean {
    return this.status === 403;
  }

  get isNotFoundError(): boolean {
    return this.status === 404;
  }

  get isServerError(): boolean {
    return this.status >= 500;
  }
}

export const apiClient = new ApiClient();
export default apiClient;