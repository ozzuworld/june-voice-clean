// config/app.config.ts - Enhanced configuration for WebSocket voice chat
const APP_CONFIG = {
  // ✅ IMPORTANT: Use HTTP if certificate is self-signed/staging
  // Change to 'https' once you have a proper certificate
  KEYCLOAK_URL: 'https://idp.ozzu.world',
  
  KEYCLOAK: {
    REALM: 'allsafe', 
    CLIENT_ID: 'june-mobile-app',
  },
  
  // ✅ Updated: Use full URI format to fix redirect URI matching in Keycloak
  REDIRECT_SCHEME: 'june://auth/callback',

  // Add development configuration
  DEVELOPMENT: {
    // Use wildcard for any development IP
    REDIRECT_URI_PATTERN: 'exp://*/--/auth/callback',
  },

  SERVICES: {
    orchestrator: 'https://api.ozzu.world',
    stt: 'https://stt.ozzu.world',
    tts: 'https://tts.ozzu.world',
    idp: 'https://idp.ozzu.world',
  },

  ENDPOINTS: {
    // ✅ NEW: WebSocket endpoint for real-time chat (replaces /v1/chat)
    WEBSOCKET: '/ws',
    
    // ✅ UPDATED: STT endpoint for voice transcription
    STT: '/v1/transcribe',
    
    // Keep existing endpoints for compatibility
    CHAT: '/v1/chat',  // Fallback HTTP endpoint
    TTS: '/tts/generate',
    VOICE_PROCESS: '/v1/voice-process',
    
    // ✅ NEW: Health and status endpoints
    HEALTH: '/healthz',
    STATUS: '/status',
    STT_WEBHOOK: '/v1/stt/webhook',
  },

  // ✅ NEW: WebSocket configuration
  WEBSOCKET: {
    AUTO_RECONNECT: true,
    RECONNECT_DELAY: 3000,
    MAX_RECONNECT_ATTEMPTS: 5,
    PING_INTERVAL: 30000,
  },

  TTS: {
    DEFAULT_VOICE: 'default',
    DEFAULT_SPEED: 1.0,
    DEFAULT_ENCODING: 'WAV',
    QUALITY: 'high',
    MAX_TEXT_LENGTH: 1000,
    CHUNK_SIZE: 200,
  },

  TIMEOUTS: {
    STT: 30000,
    TTS: 90000,
    CHAT: 60000,
    VOICE: 120000,
    WEBSOCKET_CONNECT: 10000,  // ✅ NEW: WebSocket connection timeout
  },

  DEBUG: {
    SKIP_STT: false,
    VERBOSE_LOGS: true,
    MOCK_RESPONSES: false,
    TTS_FALLBACK: true,
    WEBSOCKET_LOGS: true,  // ✅ NEW: WebSocket debugging
  },

  STT: {
    SUPPORTED_FORMATS: ['m4a', 'wav', 'mp3'],
    MAX_DURATION_MS: 300000,
    AUTO_DETECT_LANGUAGE: true,
    DEFAULT_LANGUAGE: 'en',
  },

  // ✅ NEW: Audio configuration
  AUDIO: {
    RECORDING: {
      EXTENSION: '.m4a',
      SAMPLE_RATE: 44100,
      CHANNELS: 2,
      BIT_RATE: 128000,
      QUALITY: 'high',
    },
    PLAYBACK: {
      AUTO_PLAY: true,
      VOLUME: 1.0,
    },
  },
} as const;

export default APP_CONFIG;