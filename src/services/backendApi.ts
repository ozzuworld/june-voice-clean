// src/services/backendApi.ts

import { SessionCreateRequest, SessionResponse, TokenRequest, TokenResponse } from '../types';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://api.ozzu.world';

class BackendApiService {
  private baseURL: string;

  constructor() {
    this.baseURL = BACKEND_URL;
  }

  /**
   * Create a session using the /api/sessions endpoint
   * This creates a complete session with LiveKit token
   */
  async createSession(userId: string, roomName: string): Promise<SessionResponse> {
    const response = await fetch(`${this.baseURL}/api/sessions/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Add authentication headers when available
        // 'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        user_id: userId,
        room_name: roomName,
      } as SessionCreateRequest),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to create session: ${response.status} - ${errorText}`);
    }

    return response.json() as Promise<SessionResponse>;
  }

  /**
   * Generate LiveKit token using the /livekit/token endpoint
   * This is a direct token generation endpoint
   */
  async generateLiveKitToken(roomName: string, participantName: string, metadata?: string): Promise<TokenResponse> {
    const response = await fetch(`${this.baseURL}/livekit/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Add authentication headers when available
        // 'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        roomName,
        participantName,
        metadata,
      } as TokenRequest),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to generate token: ${response.status} - ${errorText}`);
    }

    return response.json() as Promise<TokenResponse>;
  }

  /**
   * Test backend connectivity
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL}/`);
      return response.ok;
    } catch (error) {
      console.error('Backend connection test failed:', error);
      return false;
    }
  }
}

export const backendApi = new BackendApiService();