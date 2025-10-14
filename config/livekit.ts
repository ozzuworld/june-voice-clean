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
 * Updated for your June backend deployment with correct domain
 */
export const livekitConfig: LiveKitConfig = {
  // LiveKit server endpoint - this should be accessible externally
  // You need to expose LiveKit through your ingress controller
  serverUrl: "wss://livekit.allsafe.world", // Changed to match your domain
  
  // Your STUNner STUN/TURN servers from Kubernetes deployment
  // Using your actual TURN/STUN server IP: 34.59.53.188:3478
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
 * This connects to your June orchestrator service
 */
export const fetchLiveKitConfig = async (): Promise<LiveKitConfig> => {
  try {
    // Try to get config from your June orchestrator
    const response = await fetch('https://api.allsafe.world/api/livekit/config');
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
 * Generate LiveKit access token from your June orchestrator
 * This integrates with your session management API
 */
export const generateAccessToken = async (
  roomName: string, 
  participantName: string
): Promise<string> => {
  try {
    // First, create a session with your June orchestrator
    const sessionResponse = await fetch('https://api.allsafe.world/api/sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Add Keycloak token if you have authentication setup
        // 'Authorization': `Bearer ${keycloakToken}`
      },
      body: JSON.stringify({
        user_id: participantName,
        room_name: roomName
      })
    });
    
    if (sessionResponse.ok) {
      const sessionData = await sessionResponse.json();
      console.log('Session created:', sessionData.session_id);
    }
    
    // Now get LiveKit token - you need to add this endpoint to your orchestrator
    const tokenResponse = await fetch('https://api.allsafe.world/api/livekit/token', {
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
    
    if (tokenResponse.ok) {
      const data = await tokenResponse.json();
      return data.token;
    }
    
    throw new Error('Failed to get token from backend');
  } catch (error) {
    console.error('Failed to generate access token:', error);
    throw error;
  }
};

/**
 * Connect to June orchestrator for business logic
 * Separate from LiveKit connection - this handles AI, STT, TTS coordination
 */
export const connectToOrchestrator = async (
  sessionId: string,
  onMessage?: (data: any) => void
): Promise<WebSocket> => {
  return new Promise((resolve, reject) => {
    try {
      // Connect to June orchestrator via WebSocket for real-time coordination
      const ws = new WebSocket(`wss://api.allsafe.world/ws/${sessionId}`);
      
      ws.onopen = () => {
        console.log('✅ Connected to June Orchestrator');
        resolve(ws);
      };
      
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('📨 Message from orchestrator:', data);
        onMessage?.(data);
      };
      
      ws.onerror = (error) => {
        console.error('❌ Orchestrator WebSocket error:', error);
        reject(error);
      };
      
      ws.onclose = () => {
        console.log('🔌 Disconnected from June Orchestrator');
      };
      
    } catch (error) {
      reject(error);
    }
  });
};