// config/app.config.ts - CORRECTED to match actual backend endpoints
const APP_CONFIG = {
  KEYCLOAK_URL: 'https://idp.allsafe.world',
  KEYCLOAK: {
    REALM: 'allsafe', 
    CLIENT_ID: 'june-mobile-app',
  },
  REDIRECT_SCHEME: 'june', // expo scheme: june://auth/callback

  SERVICES: {
    // Use your actual deployed service URLs
    orchestrator: 'https://api.allsafe.world',
    stt: '142.189.180.177:40275', // Not ready yet, but config is here
    tts: 'https://tts.allsafe.world', // Your working TTS service
    idp: 'https://idp.allsafe.world',
  },

  // ✅ CORRECTED: Match actual backend endpoints
  ENDPOINTS: {
    CHAT: '/v1/chat',             // ✅ FIXED: This matches your orchestrator backend
    STT: '/v1/transcribe',        // STT endpoint (for when ready)
    TTS: '/tts/generate',         // Your TTS generation endpoint
    VOICE_PROCESS: '/v1/voice-process',
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
    TTS: 30000,   // 10 seconds for your TTS service
    CHAT: 45000,  // 20 seconds for orchestrator
    VOICE: 60000, // 30 seconds for full voice processing
  },

  // Debug flags
  DEBUG: {
    SKIP_STT: false, // ✅ CHANGED: Enable STT integration
    VERBOSE_LOGS: true,
    MOCK_RESPONSES: false,
  },

  // Add STT-specific configuration
  STT: {
    SUPPORTED_FORMATS: ['m4a', 'wav', 'mp3'],
    MAX_DURATION_MS: 300000, // 5 minutes
    AUTO_DETECT_LANGUAGE: true,
    DEFAULT_LANGUAGE: 'en',
  },
} as const;

export default APP_CONFIG;