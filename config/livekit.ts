import APP_CONFIG from './app.config';

/**
 * Simple LiveKit configuration
 * Your backend handles token generation, this just provides fallback config
 */
export interface LiveKitConfig {
  serverUrl: string;
  iceServers: RTCIceServer[];
}

/**
 * Get LiveKit configuration
 */
export function getLiveKitConfig(): LiveKitConfig {
  return {
    serverUrl: APP_CONFIG.SERVICES.livekit,
    iceServers: [
      { urls: APP_CONFIG.TURN_SERVERS.PRIMARY.urls },
      {
        urls: APP_CONFIG.TURN_SERVERS.FALLBACK.urls,
        username: APP_CONFIG.TURN_SERVERS.FALLBACK.username,
        credential: APP_CONFIG.TURN_SERVERS.FALLBACK.credential,
      },
    ],
  };
}

/**
 * Get LiveKit token and room info from backend
 * This replaces the complex session management
 */
export async function obtainSessionAndToken(
  roomName: string,
  participantName: string,
  accessToken?: string
): Promise<{
  sessionId: string;
  accessToken: string;
  livekitUrl: string;
  roomName: string;
}> {
  const response = await fetch(
    `${APP_CONFIG.SERVICES.orchestrator}${APP_CONFIG.ENDPOINTS.LIVEKIT_TOKEN}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({
        roomName,
        participantName,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to get LiveKit token: ${response.statusText}`);
  }

  const data = await response.json();

  return {
    sessionId: data.sessionId || `session-${Date.now()}`,
    accessToken: data.token || data.accessToken,
    livekitUrl: data.livekitUrl || APP_CONFIG.SERVICES.livekit,
    roomName: data.roomName || roomName,
  };
}