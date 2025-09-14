// src/config/auth.config.ts
export type ServiceName = 'orchestrator' | 'stt' | 'tts' | 'idp';

export const AUTH_CONFIG = {
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
  }
} as const;