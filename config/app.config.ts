// config/auth.config.ts - Updated for Kokoro TTS
export const AUTH_CONFIG = {
  services: {
    orchestrator: 'https://june-orchestrator-359243954.us-central1.run.app',
    stt: 'https://june-stt-359243954.us-central1.run.app', 
    tts: 'https://june-kokoro-tts-359243954.us-central1.run.app', // NEW: Kokoro TTS
    idp: 'https://idp.allsafe.world',
  },
  keycloak: {
    url: 'https://idp.allsafe.world',
    realm: 'june',
    clientId: 'june-mobile-app',
  },
  
  // NEW: Voice configuration for Kokoro TTS
  voices: {
    default: 'af_bella',
    available: {
      'af_bella': {
        name: 'Bella',
        gender: 'female',
        accent: 'american',
        description: 'Warm, friendly female voice'
      },
      'af_nicole': {
        name: 'Nicole', 
        gender: 'female',
        accent: 'american',
        description: 'Professional, clear female voice'
      },
      'af_sarah': {
        name: 'Sarah',
        gender: 'female', 
        accent: 'american',
        description: 'Energetic, expressive female voice'
      },
      'af_sky': {
        name: 'Sky',
        gender: 'female',
        accent: 'american', 
        description: 'Calm, soothing female voice'
      },
      'am_adam': {