// config/app.config.ts - FIXED VERSION
const APP_CONFIG = {
  // Keycloak Configuration
  KEYCLOAK_URL: 'https://idp.ozzu.world',
  KEYCLOAK: {
    REALM: 'allsafe',
    CLIENT_ID: 'june-mobile-app',
  },

  // Redirect scheme
  REDIRECT_SCHEME: 'june://auth/callback',

  // Backend Services
  SERVICES: {
    orchestrator: 'https://api.ozzu.world',
    // ⚠️ CRITICAL FIX: Remove /rtc - LiveKit client adds it automatically
    livekit: 'wss://livekit.ozzu.world',
  },

  // API Endpoints
  ENDPOINTS: {
    SESSIONS: '/api/sessions/',
    HEALTH: '/healthz',
  },

  // Debug mode
  DEBUG: __DEV__,
} as const;

export default APP_CONFIG;