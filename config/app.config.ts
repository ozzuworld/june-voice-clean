// config/app.config.ts - PRODUCTION READY
const APP_CONFIG = {
  KEYCLOAK_URL: 'https://idp.allsafe.world',
  KEYCLOAK: {
    REALM: 'allsafe', 
    CLIENT_ID: 'june-mobile-app',
  },
  REDIRECT_SCHEME: 'june',

  SERVICES: {
    orchestrator: 'https://api.allsafe.world',
    stt: 'http://142.189.180.177:40275',
    tts: 'https://tts.allsafe.world',
    idp: 'https://idp.allsafe.world',
  },

  ENDPOINTS: {
    CHAT: '/v1/conversation',
    STT: '/v1/transcribe',
    TTS: '/tts/generate',
    VOICE_PROCESS: '/v1/voice-process',
  },

  // Production TTS Configuration
  TTS: {
    DEFAULT_VOICE: 'default',
    DEFAULT_SPEED: 1.0,
    DEFAULT_ENCODING: 'WAV',
    QUALITY: 'high',
    MAX_TEXT_LENGTH: 1000, // Increased for production
    CHUNK_SIZE: 200,
  },

  // Production Timeouts - Conservative values
  TIMEOUTS: {
    STT: 30000,   // 30 seconds
    TTS: 90000,   // 90 seconds
    CHAT: 60000,  // 60 seconds
    VOICE: 120000, // 2 minutes for full voice processing
  },

  // Production settings - All debugging disabled
  DEBUG: {
    SKIP_STT: false,
    VERBOSE_LOGS: false, // Disabled for production
    MOCK_RESPONSES: false,
    TTS_FALLBACK: true, // Keep fallback for reliability
  },

  STT: {
    SUPPORTED_FORMATS: ['m4a', 'wav', 'mp3'],
    MAX_DURATION_MS: 300000, // 5 minutes max recording
    AUTO_DETECT_LANGUAGE: true,
    DEFAULT_LANGUAGE: 'en',
  },
} as const;

export default APP_CONFIG;