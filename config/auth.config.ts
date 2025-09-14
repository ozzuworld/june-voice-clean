export const AUTH_CONFIG = {
  services: {
    orchestrator: 'https://june-orchestrator-359243954.us-central1.run.app',
    stt: 'https://june-stt-359243954.us-central1.run.app', 
    tts: 'https://june-tts-359243954.us-central1.run.app',
    idp: 'https://idp.allsafe.world', // Use your custom domain
  },
  keycloak: {
    url: 'https://idp.allsafe.world',
    realm: 'june',
    clientId: 'june-mobile-app',
  }
} as const;