// src/services/api.service.ts
import { AUTH_CONFIG, type ServiceName } from '@/config/auth.config';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  status?: number;
  timestamp: string;
}

class ApiService {
  private baseUrls = AUTH_CONFIG.services;

  /**
   * Make authenticated HTTP request
   */
  async makeRequest<T = any>(
    serviceName: ServiceName,
    endpoint: string,
    options: {
      method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
      body?: any;
      headers?: Record<string, string>;
      accessToken?: string;
      timeout?: number;
    } = {}
  ): Promise<ApiResponse<T>> {
    const {
      method = 'GET',
      body,
      headers = {},
      accessToken,
      timeout = 15000,
    } = options;

    const baseUrl = this.baseUrls[serviceName];
    const url = `${baseUrl}${endpoint}`;
    
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...headers,
    };

    // Add authentication header if token provided
    if (accessToken) {
      requestHeaders.Authorization = `Bearer ${accessToken}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      let responseData: any;
      const contentType = response.headers.get('content-type');
      
      if (contentType?.includes('application/json')) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }

      if (!response.ok) {
        return {
          success: false,
          status: response.status,
          error: responseData?.message || responseData || `HTTP ${response.status}: ${response.statusText}`,
          timestamp: new Date().toISOString(),
        };
      }

      return {
        success: true,
        data: responseData,
        status: response.status,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      clearTimeout(timeoutId);
      
      let errorMessage = 'Network error';
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = 'Request timeout';
        } else {
          errorMessage = error.message;
        }
      }
      
      return {
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Send chat message to orchestrator
   */
  async sendChatMessage(
    message: string,
    accessToken: string
  ): Promise<ApiResponse> {
    return this.makeRequest('orchestrator', '/v1/chat', {
      method: 'POST',
      body: { user_input: message },
      accessToken,
      timeout: 30000, // 30 second timeout for chat
    });
  }

  /**
   * Test service health
   */
  async testServiceHealth(serviceName: ServiceName): Promise<ApiResponse> {
    return this.makeRequest(serviceName, '/healthz', {
      method: 'GET',
      timeout: 10000,
    });
  }

  /**
   * Test all services
   */
  async testAllServices(): Promise<Record<ServiceName, ApiResponse>> {
    const results = await Promise.allSettled(
      Object.keys(this.baseUrls).map(async (serviceName) => {
        const result = await this.testServiceHealth(serviceName as ServiceName);
        return [serviceName, result] as const;
      })
    );

    const serviceResults: Record<string, ApiResponse> = {};
    
    results.forEach((result, index) => {
      const serviceName = Object.keys(this.baseUrls)[index];
      if (result.status === 'fulfilled') {
        serviceResults[serviceName] = result.value[1];
      } else {
        serviceResults[serviceName] = {
          success: false,
          error: 'Test failed',
          timestamp: new Date().toISOString(),
        };
      }
    });

    return serviceResults as Record<ServiceName, ApiResponse>;
  }
}

// Export singleton instance
export const apiService = new ApiService();