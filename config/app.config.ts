// config/app.config.ts - Enhanced configuration for LiveKit voice chat
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
    livekit: 'wss://livekit.ozzu.world', // ✅ NEW: LiveKit server
  },

  ENDPOINTS: {
    // ✅ NEW: LiveKit endpoints
    LIVEKIT_TOKEN: '/livekit/token',
    LIVEKIT_CONFIG: '/livekit/config',
    
    // ✅ UPDATED: STT endpoint for voice transcription
    STT: '/v1/transcribe',
    
    // Keep existing endpoints for compatibility
    CHAT: '/v1/chat',
    TTS: '/tts/generate',
    VOICE_PROCESS: '/v1/voice-process',
    
    // ✅ Health and status endpoints
    HEALTH: '/healthz',
    STATUS: '/status',
    STT_WEBHOOK: '/v1/stt/webhook',
  },

  // ✅ NEW: LiveKit configuration
  LIVEKIT: {
    DEFAULT_ROOM_PREFIX: 'june-voice-',
    AUTO_RECONNECT: true,
    RECONNECT_DELAY: 3000,
    MAX_RECONNECT_ATTEMPTS: 5,
    TOKEN_TTL_MINUTES: 60,
    AUDIO_SETTINGS: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
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
    LIVEKIT_CONNECT: 10000,  // ✅ NEW: LiveKit connection timeout
    TOKEN_REFRESH: 5000,     // ✅ NEW: Token refresh timeout
  },

  DEBUG: {
    SKIP_STT: false,
    VERBOSE_LOGS: true,
    MOCK_RESPONSES: false,
    TTS_FALLBACK: true,
    LIVEKIT_LOGS: true,  // ✅ NEW: LiveKit debugging
  },

  STT: {
    SUPPORTED_FORMATS: ['m4a', 'wav', 'mp3'],
    MAX_DURATION_MS: 300000,
    AUTO_DETECT_LANGUAGE: true,
    DEFAULT_LANGUAGE: 'en',
  },

  // ✅ UPDATED: Audio configuration for LiveKit
  AUDIO: {
    RECORDING: {
      EXTENSION: '.m4a',
      SAMPLE_RATE: 44100,
      CHANNELS: 1, // Mono for voice calls
      BIT_RATE: 64000, // Lower bitrate for voice
      QUALITY: 'medium',
    },
    PLAYBACK: {
      AUTO_PLAY: true,
      VOLUME: 1.0,
    },
    VOICE_CALL: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      sampleRate: 48000,
      channels: 1,
    },
  },

  // ✅ NEW: TURN server configuration (matches your STUNner setup)
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
} as const;

export default APP_CONFIG;