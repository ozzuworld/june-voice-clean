// config/app.config.ts - Updated for your real services
const APP_CONFIG = {
  KEYCLOAK_URL: 'https://idp.allsafe.world',
  KEYCLOAK: {
    REALM: 'allsafe', 
    CLIENT_ID: 'june-mobile-app',
  },
  REDIRECT_SCHEME: 'june', // expo scheme: june://auth/callback

  SERVICES: {
    orchestrator: 'https://api.allsafe.world',
    stt: 'https://stt.allsafe.world', 
    tts: 'https://tts.allsafe.world',
    idp: 'https://idp.allsafe.world',
  },

  // API Endpoints
  ENDPOINTS: {
    CHAT: '/v1/conversation', // Updated to match your orchestrator
    STT: '/v1/transcribe', 
    TTS: '/tts/generate', // Updated to match your TTS service
    VOICE_PROCESS: '/v1/voice-chat',
  },

  // TTS Configuration for low latency
  TTS: {
    DEFAULT_VOICE: 'default',
    DEFAULT_SPEED: 1.0,
    DEFAULT_ENCODING: 'WAV',
    QUALITY: 'high',
  },

  // Timeouts (optimized for voice)
  TIMEOUTS: {
    STT: 15000, // 15 seconds
    TTS: 8000,  // 8 seconds (reduced for low latency)
    CHAT: 20000, // 20 seconds 
    VOICE: 30000, // 30 seconds for full voice processing
  },
} as const;

export default APP_CONFIG;