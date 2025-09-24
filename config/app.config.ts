// config/app.config.ts
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
} as const;

export default APP_CONFIG;
