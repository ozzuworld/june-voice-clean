// config/app.config.ts - Updated for your services
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
    CHAT: '/v1/chat',
    STT: '/v1/transcribe', 
    TTS: '/v1/tts',
    VOICE_PROCESS: '/v1/voice-chat', // If you have a direct voice processing endpoint
  },

  // TTS Configuration for low latency
  TTS: {
    DEFAULT_VOICE: 'default',
    DEFAULT_SPEED: 1.0,
    DEFAULT_ENCODING: 'WAV', // or MP3 for smaller file size
    QUALITY: 'high', // or 'low' for faster processing
  },

  // Timeouts
  TIMEOUTS: {
    STT: 15000, // 15 seconds
    TTS: 10000, // 10 seconds  
    CHAT: 30000, // 30 seconds
    VOICE: 45000, // 45 seconds for full voice processing
  },
} as const;

export default APP_CONFIG;