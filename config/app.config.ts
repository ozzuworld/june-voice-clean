// config/app.config.ts - HTTP configuration for development
const APP_CONFIG = {
  // ✅ IMPORTANT: Use HTTP if certificate is self-signed/staging
  // Change to 'https' once you have a proper certificate
  KEYCLOAK_URL: 'https://idp.ozzu.world',
  
  KEYCLOAK: {
    REALM: 'allsafe', 
    CLIENT_ID: 'june-mobile-app',
  },
  
  // ✅ Make sure this matches your scheme in app.json
  REDIRECT_SCHEME: 'june',

  SERVICES: {
    orchestrator: 'https://api.ozzu.world',
    stt: 'https://stt.ozzu.world',
    tts: 'https://tts.ozzu.world',
    idp: 'https://idp.ozzu.world',
  },

  ENDPOINTS: {
    CHAT: '/v1/chat',
    STT: '/v1/transcribe',
    TTS: '/tts/generate',
    VOICE_PROCESS: '/v1/voice-process',
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
  },

  DEBUG: {
    SKIP_STT: false,
    VERBOSE_LOGS: true,
    MOCK_RESPONSES: false,
    TTS_FALLBACK: true,
  },

  STT: {
    SUPPORTED_FORMATS: ['m4a', 'wav', 'mp3'],
    MAX_DURATION_MS: 300000,
    AUTO_DETECT_LANGUAGE: true,
    DEFAULT_LANGUAGE: 'en',
  },
} as const;

export default APP_CONFIG;