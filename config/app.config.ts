// config/app.config.ts - Fixed syntax and updated URLs
export default {
  KEYCLOAK_URL: 'https://june-idp-wrqlxfokjq-uc.a.run.app',
  KEYCLOAK: {
    REALM: 'june',
    CLIENT_ID: 'june-mobile-app',
  },
  REDIRECT_SCHEME: 'june',
  
  SERVICES: {
    orchestrator: 'https://june-orchestrator-wrqlxfokjq-uc.a.run.app',
    stt: 'https://june-stt-wrqlxfokjq-uc.a.run.app',
    tts: 'https://june-kokoro-tts-wrqlxfokjq-uc.a.run.app',
    idp: 'https://june-idp-wrqlxfokjq-uc.a.run.app',
  },
  
  // Kokoro TTS voices configuration
  VOICES: {
    default: 'af_bella',
    available: {
      'af_bella': { 
        name: 'Bella', 
        description: 'Warm, friendly female voice' 
      },
      'af_nicole': { 
        name: 'Nicole', 
        description: 'Professional, clear female voice' 
      },
      'af_sarah': { 
        name: 'Sarah', 
        description: 'Energetic, expressive female voice' 
      },
      'af_sky': { 
        name: 'Sky', 
        description: 'Calm, soothing female voice' 
      },
      'am_adam': { 
        name: 'Adam', 
        description: 'Professional male voice' 
      },
      'am_michael': { 
        name: 'Michael', 
        description: 'Friendly male voice' 
      }
    }
  }
};