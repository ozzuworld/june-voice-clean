/**
 * WebRTC Configuration for June Voice Platform
 * 
 * This configuration connects to your Janus Gateway deployment
 * running on the June Kubernetes platform with STUNner TURN/STUN
 */

export interface WebRTCConfig {
  janus: {
    ws_url: string;
    http_url: string;
    admin_url?: string;
  };
  iceServers: RTCIceServer[];
  janus_admin_secret?: string;
  janus_api_secret?: string;
}

/**
 * Production WebRTC Configuration
 * Points to your deployed Janus Gateway on ozzu.world
 */
export const webrtcConfig: WebRTCConfig = {
  // Janus Gateway endpoints (your main platform)
  janus: {
    ws_url: "wss://janus.ozzu.world/janus-ws",      // Primary WebSocket connection
    http_url: "https://janus.ozzu.world/janus",     // Fallback HTTP API
    admin_url: "https://janus.ozzu.world/janus-admin" // Admin endpoint if needed
  },
  
  // Your STUNner STUN/TURN servers from Kubernetes deployment
  iceServers: [
    {
      urls: ["stun:turn.ozzu.world:3478"]
    },
    {
      urls: ["turn:turn.ozzu.world:3478"],
      username: "june-user",
      credential: "Pokemon123!"
    }
  ],
  
  // Janus API secrets (from your Helm values.yaml)
  janus_admin_secret: "janusoverlord",
  janus_api_secret: "janussecret"
};

/**
 * Development Configuration (for local testing)
 * You can switch to this when testing locally
 */
export const devWebRTCConfig: WebRTCConfig = {
  janus: {
    ws_url: "ws://localhost:8188",
    http_url: "http://localhost:8088",
    admin_url: "http://localhost:8089"
  },
  iceServers: [
    {
      urls: ["stun:stun.l.google.com:19302"]
    }
  ]
};

/**
 * Fetch dynamic WebRTC configuration from your orchestrator
 * This allows you to update config without app updates
 */
export const fetchWebRTCConfig = async (): Promise<WebRTCConfig> => {
  try {
    const response = await fetch('https://api.ozzu.world/config/webrtc');
    if (response.ok) {
      const config = await response.json();
      return config;
    }
  } catch (error) {
    console.warn('Failed to fetch dynamic WebRTC config, using static config:', error);
  }
  
  // Fallback to static config
  return webrtcConfig;
};

/**
 * Get the appropriate config based on environment
 */
export const getWebRTCConfig = (): WebRTCConfig => {
  if (__DEV__) {
    // You can switch between dev and prod config here
    return webrtcConfig; // Using prod config even in dev for now
  }
  return webrtcConfig;
};