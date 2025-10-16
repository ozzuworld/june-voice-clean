// LiveKit connection constants
export const LIVEKIT_CONSTANTS = {
  // Default room configuration
  DEFAULT_ROOM: 'voice-assistant-room',
  
  // Audio configuration
  AUDIO_CONFIG: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: 44100,
  },
  
  // Video configuration
  VIDEO_CONFIG: {
    width: 640,
    height: 480,
    frameRate: 30,
  },
  
  // Connection timeouts (in milliseconds)
  TIMEOUTS: {
    CONNECTION: 30000,
    RECONNECTION: 5000,
    AGENT_RESPONSE: 10000,
  },
  
  // Participant roles
  ROLES: {
    USER: 'user',
    AGENT: 'agent',
    ASSISTANT: 'assistant',
  },
};

// Audio session categories for iOS
export const AUDIO_CATEGORIES = {
  PLAYBACK: 'AVAudioSessionCategoryPlayback',
  RECORD: 'AVAudioSessionCategoryRecord', 
  PLAY_AND_RECORD: 'AVAudioSessionCategoryPlayAndRecord',
  MULTI_ROUTE: 'AVAudioSessionCategoryMultiRoute',
};

// Connection states
export const CONNECTION_STATES = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  RECONNECTING: 'reconnecting',
  FAILED: 'failed',
} as const;

export type ConnectionState = typeof CONNECTION_STATES[keyof typeof CONNECTION_STATES];

// Error codes
export const ERROR_CODES = {
  NO_MICROPHONE_PERMISSION: 'NO_MICROPHONE_PERMISSION',
  NO_CAMERA_PERMISSION: 'NO_CAMERA_PERMISSION',
  CONNECTION_FAILED: 'CONNECTION_FAILED',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  AGENT_UNAVAILABLE: 'AGENT_UNAVAILABLE',
  AUDIO_SESSION_FAILED: 'AUDIO_SESSION_FAILED',
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];