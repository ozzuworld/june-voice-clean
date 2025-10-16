// src/types/index.ts

export interface SessionCreateRequest {
  user_id: string;
  room_name: string;
}

export interface SessionResponse {
  session_id: string;
  user_id: string;
  room_name: string;
  access_token: string;  // LiveKit JWT token
  livekit_url: string;   // LiveKit server URL
}

export interface TokenRequest {
  roomName: string;
  participantName: string;
  metadata?: string;
}

export interface TokenResponse {
  token: string;
  roomName: string;
  participantName: string;
  livekitUrl: string;
}