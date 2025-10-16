// config/app.config.ts - Simplified configuration for LiveKit voice chat
const APP_CONFIG = {
  // Keycloak Configuration
  KEYCLOAK_URL: 'https://idp.ozzu.world',
  KEYCLOAK: {
    REALM: 'allsafe', 
    CLIENT_ID: 'june-mobile-app',
  },
  
  // Simple redirect URI
  REDIRECT_SCHEME: 'june://auth/callback',

  // Backend Services
  SERVICES: {
    orchestrator: 'https://api.ozzu.world',
    stt: 'https://stt.ozzu.world',
    tts: 'https://tts.ozzu.world',
    idp: 'https://idp.ozzu.world',
    livekit: 'wss://livekit.ozzu.world',
  },

  // API Endpoints
  ENDPOINTS: {
    SESSIONS: '/api/sessions/',
    CHAT: '/v1/chat',
    TTS: '/tts/generate',
    HEALTH: '/healthz',
  },

  // TURN/STUN Server Configuration (your STUNner setup)
  TURN_SERVERS: {
    PRIMARY: {
      urls: ['stun:34.59.53.188:3478'],
    },
    FALLBACK: {
      urls: ['turn:34.59.53.188:3478'],
      username: 'june-user',
      credential: 'Pokemon123!',
    },
  },

  // Audio Settings for Voice Chat
  AUDIO: {
    VOICE_CALL: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      sampleRate: 48000,
      channels: 1, // Mono for voice
    },
  },

  // Simple timeout settings
  TIMEOUTS: {
    LIVEKIT_CONNECT: 10000,
    TOKEN_REFRESH: 5000,
  },

  // Debug settings
  DEBUG: {
    VERBOSE_LOGS: __DEV__,
    LIVEKIT_LOGS: __DEV__,
  },
} as const;

export default APP_CONFIG;