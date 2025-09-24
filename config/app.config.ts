// config/app.config.ts - FIXED TO USE CUSTOM DOMAIN CONSISTENTLY

export default {
  // FIXED: Use custom domain everywhere consistently
  KEYCLOAK_URL: 'https://idp.allsafe.world',
  KEYCLOAK: {
    REALM: 'june',
    CLIENT_ID: 'june-mobile-app',
  },
  REDIRECT_SCHEME: 'june',
  
  SERVICES: {
    // FIXED: All services now use consistent custom domains
    orchestrator: 'https://june-orchestrator-359243954.us-central1.run.app',
    stt: 'https://june-stt-359243954.us-central1.run.app',
    tts: 'https://june-tts-359243954.us-central1.run.app',
    idp: 'https://idp.allsafe.world',  // FIXED: Use custom domain
  },
  
  // Voice configuration
  VOICES: {
    default: 'assistant_female',
    available: {
      'assistant_female': { 
        name: 'Assistant Female', 
        description: 'Friendly female voice' 
      },
      'assistant_male': { 
        name: 'Assistant Male', 
        description: 'Professional male voice' 
      }
    }
  }
};