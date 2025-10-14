/**
 * LiveKit Configuration for June Voice Platform
 * 
 * This configuration connects to your LiveKit deployment
 * running on the June Kubernetes platform with STUNner TURN/STUN
 */

export interface LiveKitConfig {
  serverUrl: string;
  apiKey?: string;
  apiSecret?: string;
  iceServers?: RTCIceServer[];
}

/**
 * Production LiveKit Configuration
 * Points to your deployed LiveKit on ozzu.world
 */
export const livekitConfig: LiveKitConfig = {
  // LiveKit server endpoint (WebSocket URL)
  serverUrl: "wss://livekit.ozzu.world", // Update this to your actual LiveKit domain
  
  // Your STUNner STUN/TURN servers from Kubernetes deployment
  // Note: LiveKit will automatically discover these if properly configured with STUNner
  iceServers: [
    {
      urls: ["stun:34.59.53.188:3478"]
    },
    {
      urls: ["turn:34.59.53.188:3478"],
      username: "june-user",
      credential: "Pokemon123!"
    }
  ]
};

/**
 * Development Configuration (for local testing)
 */
export const devLiveKitConfig: LiveKitConfig = {
  serverUrl: "ws://localhost:7880", // Local LiveKit server
  iceServers: [
    {
      urls: ["stun:stun.l.google.com:19302"]
    }
  ]
};

/**
 * Fetch dynamic LiveKit configuration from your orchestrator
 */
export const fetchLiveKitConfig = async (): Promise<LiveKitConfig> => {
  try {
    const response = await fetch('https://api.ozzu.world/livekit/config');
    if (response.ok) {
      const config = await response.json();
      return {
        serverUrl: config.serverUrl || livekitConfig.serverUrl,
        iceServers: config.iceServers || livekitConfig.iceServers
      };
    }
  } catch (error) {
    console.warn('Failed to fetch dynamic LiveKit config, using static config:', error);
  }
  
  // Fallback to static config
  return livekitConfig;
};

/**
 * Get the appropriate config based on environment
 */
export const getLiveKitConfig = (): LiveKitConfig => {
  if (__DEV__) {
    // You can switch between dev and prod config here
    return livekitConfig; // Using prod config even in dev for now
  }
  return livekitConfig;
};

/**
 * Generate LiveKit access token
 * This should ideally be done on your backend for security
 */
export const generateAccessToken = async (
  roomName: string, 
  participantName: string
): Promise<string> => {
  try {
    const response = await fetch('https://api.ozzu.world/livekit/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        room: roomName,
        participant: participantName,
        permissions: {
          canPublish: true,
          canSubscribe: true,
          canPublishData: true
        }
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.token;
    }
    
    throw new Error('Failed to get token from backend');
  } catch (error) {
    console.error('Failed to generate access token:', error);
    throw error;
  }
};