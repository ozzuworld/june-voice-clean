// src/utils/backendTest.ts
import { AUTH_CONFIG } from '../config/auth.config';

export interface ServiceTestResult {
  serviceName: string;
  endpoint: string;
  success: boolean;
  status?: number;
  error?: string;
  data?: any;
}

export class BackendTester {
  /**
   * Test if all your backend services are accessible
   */
  static async testServices(): Promise<ServiceTestResult[]> {
    const results: ServiceTestResult[] = [];
    
    // Test each service
    for (const [serviceName, baseUrl] of Object.entries(AUTH_CONFIG.services)) {
      try {
        console.log(`Testing ${serviceName} at ${baseUrl}`);
        
        const response = await fetch(`${baseUrl}/healthz`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
          timeout: 10000,
        });

        const data = await response.json().catch(async () => ({ text: await response.text() }));
        
        results.push({
          serviceName,
          endpoint: '/healthz',
          success: response.ok,
          status: response.status,
          data: data,
        });
        
      } catch (error) {
        results.push({
          serviceName,
          endpoint: '/healthz',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
    
    return results;
  }

  /**
   * Test Keycloak realm accessibility
   */
  static async testKeycloakRealm(): Promise<ServiceTestResult> {
    try {
      const realmUrl = `${AUTH_CONFIG.keycloak.url}/realms/${AUTH_CONFIG.keycloak.realm}`;
      console.log(`Testing Keycloak realm at ${realmUrl}`);
      
      const response = await fetch(realmUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        timeout: 10000,
      });

      const data = await response.json();
      
      return {
        serviceName: 'keycloak',
        endpoint: `/realms/${AUTH_CONFIG.keycloak.realm}`,
        success: response.ok,
        status: response.status,
        data: {
          issuer: data.issuer,
          'public-key': data['public_key'] ? 'present' : 'missing',
        },
      };
      
    } catch (error) {
      return {
        serviceName: 'keycloak',
        endpoint: `/realms/${AUTH_CONFIG.keycloak.realm}`,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Test orchestrator chat endpoint (without auth for basic connectivity)
   */
  static async testChatConnectivity(): Promise<ServiceTestResult> {
    try {
      const chatUrl = `${AUTH_CONFIG.services.orchestrator}/v1/chat`;
      console.log(`Testing chat endpoint at ${chatUrl}`);
      
      const response = await fetch(chatUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ user_input: 'test' }),
        timeout: 10000,
      });

      // We expect this to fail with 401/403 (needs auth), but it shows the endpoint exists
      const data = await response.text();
      
      return {
        serviceName: 'orchestrator',
        endpoint: '/v1/chat',
        success: response.status === 401 || response.status === 403, // Expected for unauth request
        status: response.status,
        data: { note: response.status === 401 ? 'Endpoint exists (needs auth)' : data },
      };
      
    } catch (error) {
      return {
        serviceName: 'orchestrator',
        endpoint: '/v1/chat',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Run all connectivity tests
   */
  static async runAllTests(): Promise<{
    services: ServiceTestResult[];
    keycloak: ServiceTestResult;
    chat: ServiceTestResult;
    summary: {
      total: number;
      passed: number;
      failed: number;
    };
  }> {
    console.log('🔍 Running backend connectivity tests...');
    
    const [services, keycloak, chat] = await Promise.all([
      this.testServices(),
      this.testKeycloakRealm(), 
      this.testChatConnectivity(),
    ]);
    
    const allTests = [...services, keycloak, chat];
    const passed = allTests.filter(t => t.success).length;
    const failed = allTests.length - passed;
    
    return {
      services,
      keycloak,
      chat,
      summary: {
        total: allTests.length,
        passed,
        failed,
      },
    };
  }
}