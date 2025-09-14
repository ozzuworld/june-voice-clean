// src/config/auth.config.ts
export const AUTH_CONFIG = {
  // Your backend services
  services: {
    orchestrator: 'https://june-orchestrator-359243954.us-central1.run.app',
    stt: 'https://june-stt-359243954.us-central1.run.app', 
    tts: 'https://june-tts-359243954.us-central1.run.app',
    idp: 'https://june-idp-359243954.us-central1.run.app',
  },
  
  // Keycloak configuration
  keycloak: {
    url: 'https://june-idp-359243954.us-central1.run.app',
    realm: 'june',
    clientId: 'june-mobile-app',
  },
  
  // Voice settings
  voice: {
    defaultLanguage: 'en-US',
    defaultVoice: 'en-US-Wavenet-D',
    audioEncoding: 'MP3',
    sampleRate: 16000,
  },
} as const;

export type ServiceName = keyof typeof AUTH_CONFIG.services;