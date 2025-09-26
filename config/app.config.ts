// config/app.config.ts - Updated for your real deployed services
const APP_CONFIG = {
  KEYCLOAK_URL: 'https://idp.allsafe.world',
  KEYCLOAK: {
    REALM: 'allsafe', 
    CLIENT_ID: 'june-mobile-app',
  },
  REDIRECT_SCHEME: 'june://auth/callback', // expo scheme: june://auth/callback

  SERVICES: {
    // Use your actual deployed service URLs
    orchestrator: 'https://api.allsafe.world',
    stt: 'https://stt.allsafe.world', // Not ready yet, but config is here
    tts: 'https://tts.allsafe.world', // Your working TTS service
    idp: 'https://idp.allsafe.world',
  },

  // API Endpoints - FIXED: Updated to match backend routes
  ENDPOINTS: {
    CHAT: '/v1/chat',             // ✅ FIXED: Match backend route
    STT: '/v1/transcribe',        // STT endpoint (for when ready)
    TTS: '/tts/generate',         // Your TTS generation endpoint
    VOICE_PROCESS: '/v1/chat',    // ✅ FIXED: Match backend route
  },

  // TTS Configuration optimized for your service
  TTS: {
    DEFAULT_VOICE: 'default',
    DEFAULT_SPEED: 1.0,
    DEFAULT_ENCODING: 'WAV',
    QUALITY: 'high',
  },

  // Timeouts optimized for your services
  TIMEOUTS: {
    STT: 15000,   // 15 seconds
    TTS: 10000,   // 10 seconds for your TTS service
    CHAT: 20000,  // 20 seconds for orchestrator
    VOICE: 30000, // 30 seconds for full voice processing
  },

  // Debug flags
  DEBUG: {
    SKIP_STT: true, // Set to true while STT is under construction
    VERBOSE_LOGS: true,
    MOCK_RESPONSES: false,
  },
} as const;

export default APP_CONFIG;