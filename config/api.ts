/**
 * June Platform API Configuration
 * 
 * This file contains configuration for connecting to your June backend services
 */

export interface JuneApiConfig {
  orchestratorUrl: string;
  idpUrl: string;
  sttUrl?: string;
  ttsUrl?: string;
  turnServer: {
    urls: string[];
    username: string;
    credential: string;
  };
}

/**
 * Production API Configuration
 * Updated for your deployed June platform on allsafe.world
 */
export const juneApiConfig: JuneApiConfig = {
  // June Orchestrator - Main API endpoint for business logic
  orchestratorUrl: "https://api.allsafe.world",
  
  // Keycloak Identity Provider for authentication
  idpUrl: "https://idp.allsafe.world",
  
  // Optional: Direct access to STT/TTS if needed
  sttUrl: "https://stt.allsafe.world",
  ttsUrl: "https://tts.allsafe.world",
  
  // STUNner TURN/STUN server configuration
  turnServer: {
    urls: [
      "stun:34.59.53.188:3478",
      "turn:34.59.53.188:3478"
    ],
    username: "june-user",
    credential: "Pokemon123!"
  }
};

/**
 * Development Configuration
 */
export const devJuneApiConfig: JuneApiConfig = {
  orchestratorUrl: "http://localhost:8080",
  idpUrl: "http://localhost:8081", 
  turnServer: {
    urls: ["stun:stun.l.google.com:19302"],
    username: "",
    credential: ""
  }
};

/**
 * Get the appropriate API config based on environment
 */
export const getJuneApiConfig = (): JuneApiConfig => {
  if (__DEV__) {
    return devJuneApiConfig;
  }
  return juneApiConfig;
};

/**
 * June API Client Class
 * Handles all communication with June backend services
 */
export class JuneApiClient {
  private config: JuneApiConfig;
  private token?: string;

  constructor(config?: JuneApiConfig) {
    this.config = config || getJuneApiConfig();
  }

  /**
   * Set authentication token (from Keycloak)
   */
  setAuthToken(token: string): void {
    this.token = token;
  }

  /**
   * Get auth headers for API requests
   */
  private getAuthHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    
    return headers;
  }

  /**
   * Create a new session with the June orchestrator
   */
  async createSession(userId: string, roomName: string): Promise<any> {
    const response = await fetch(`${this.config.orchestratorUrl}/api/sessions`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({
        user_id: userId,
        room_name: roomName
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to create session: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Get session details
   */
  async getSession(sessionId: string): Promise<any> {
    const response = await fetch(`${this.config.orchestratorUrl}/api/sessions/${sessionId}`, {
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error(`Failed to get session: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Delete a session
   */
  async deleteSession(sessionId: string): Promise<void> {
    const response = await fetch(`${this.config.orchestratorUrl}/api/sessions/${sessionId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error(`Failed to delete session: ${response.statusText}`);
    }
  }

  /**
   * Send AI message
   */
  async sendAiMessage(message: string, sessionId?: string): Promise<any> {
    const body: any = { message };
    if (sessionId) {
      body.session_id = sessionId;
    }

    const response = await fetch(`${this.config.orchestratorUrl}/api/ai/chat`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`Failed to send AI message: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Get conversation history
   */
  async getConversationHistory(sessionId: string): Promise<any> {
    const response = await fetch(`${this.config.orchestratorUrl}/api/sessions/${sessionId}/history`, {
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error(`Failed to get conversation history: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.orchestratorUrl}/healthz`);
      return response.ok;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }

  /**
   * Connect to orchestrator WebSocket for real-time communication
   */
  connectWebSocket(sessionId: string, onMessage?: (data: any) => void): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      try {
        const wsUrl = this.config.orchestratorUrl.replace('https://', 'wss://').replace('http://', 'ws://');
        const ws = new WebSocket(`${wsUrl}/ws/${sessionId}`);
        
        ws.onopen = () => {
          console.log('✅ Connected to June Orchestrator WebSocket');
          resolve(ws);
        };
        
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('📨 Orchestrator message:', data);
            onMessage?.(data);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };
        
        ws.onerror = (error) => {
          console.error('❌ Orchestrator WebSocket error:', error);
          reject(error);
        };
        
        ws.onclose = (event) => {
          console.log('🔌 Disconnected from June Orchestrator WebSocket:', event.code, event.reason);
        };
        
      } catch (error) {
        reject(error);
      }
    });
  }
}

/**
 * Default API client instance
 */
export const juneApi = new JuneApiClient();