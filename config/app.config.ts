// config/app.config.ts - Verified configuration matching your backend
const APP_CONFIG = {
  // Keycloak Configuration
  KEYCLOAK_URL: 'https://idp.ozzu.world',
  KEYCLOAK: {
    REALM: 'allsafe',
    CLIENT_ID: 'june-mobile-app',
  },

  // Redirect scheme - matches your Keycloak client config
  REDIRECT_SCHEME: 'june://auth/callback',

  // Backend Services - verified working from your CLI test
  SERVICES: {
    orchestrator: 'https://api.ozzu.world',
    livekit: 'wss://livekit.ozzu.world/rtc',
  },

  // API Endpoints
  ENDPOINTS: {
    // This endpoint creates a session and returns LiveKit token
    SESSIONS: '/api/sessions/',
    HEALTH: '/healthz',
  },

  // ICE Servers - Using hostnames instead of IPs for better compatibility
  ICE_SERVERS: [
    {
      urls: 'stun:stun.ozzu.world:3478',
    },
    {
      urls: 'turn:turn.ozzu.world:3478',
      username: 'june-user',
      credential: 'Pokemon123!',
    },
  ],

  // Debug mode
  DEBUG: __DEV__,
} as const;

export default APP_CONFIG;