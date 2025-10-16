// Environment variables for LiveKit configuration
const LIVEKIT_API_KEY = process.env.EXPO_PUBLIC_LIVEKIT_API_KEY || '';
const LIVEKIT_SECRET_KEY = process.env.EXPO_PUBLIC_LIVEKIT_SECRET_KEY || '';
const SANDBOX_TOKEN_SERVER_ID = process.env.EXPO_PUBLIC_SANDBOX_ID || '';

/**
 * Generate a LiveKit access token for a participant
 * 
 * IMPORTANT: In production, token generation should ALWAYS happen on your backend server
 * This client-side implementation is only for development/testing purposes
 */
export async function generateToken(roomName: string, participantName: string): Promise<string> {
  try {
    // Option 1: Use LiveKit Cloud Sandbox (recommended for development)
    if (SANDBOX_TOKEN_SERVER_ID) {
      return await generateSandboxToken(roomName, participantName);
    }
    
    // Option 2: Generate token with API keys (development only)
    if (LIVEKIT_API_KEY && LIVEKIT_SECRET_KEY) {
      return await generateManualToken(roomName, participantName);
    }
    
    throw new Error('No token generation method configured. Please set either EXPO_PUBLIC_SANDBOX_ID or LIVEKIT_API_KEY/LIVEKIT_SECRET_KEY');
  } catch (error) {
    console.error('Token generation failed:', error);
    throw error;
  }
}

/**
 * Generate token using LiveKit Cloud Sandbox
 * This is the recommended approach for development and testing
 */
async function generateSandboxToken(roomName: string, participantName: string): Promise<string> {
  const response = await fetch(`https://livekit.cloud/token?roomName=${encodeURIComponent(roomName)}&participantName=${encodeURIComponent(participantName)}&sandboxId=${SANDBOX_TOKEN_SERVER_ID}`);
  
  if (!response.ok) {
    throw new Error(`Failed to generate sandbox token: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.token;
}

/**
 * Generate token manually with API keys
 * 
 * WARNING: This exposes your API keys to the client and should NEVER be used in production
 * Use this only for development/testing when you can't set up a proper backend token server
 */
async function generateManualToken(roomName: string, participantName: string): Promise<string> {
  if (typeof window !== 'undefined') {
    console.warn('WARNING: Generating tokens client-side is not secure for production use');
  }
  
  // For React Native, we need to use a different approach since livekit-server-sdk 
  // is not compatible with React Native environment
  // You should implement this on your backend server instead
  
  throw new Error('Manual token generation not supported in React Native client. Please use sandbox tokens or implement a backend token server.');
}

/**
 * Validate LiveKit configuration
 */
export function validateLiveKitConfig(): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!process.env.EXPO_PUBLIC_LIVEKIT_URL) {
    errors.push('EXPO_PUBLIC_LIVEKIT_URL is required');
  }
  
  if (!SANDBOX_TOKEN_SERVER_ID && !(LIVEKIT_API_KEY && LIVEKIT_SECRET_KEY)) {
    errors.push('Either EXPO_PUBLIC_SANDBOX_ID or both LIVEKIT_API_KEY and LIVEKIT_SECRET_KEY are required');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Get LiveKit server URL from environment
 */
export function getLiveKitServerUrl(): string {
  const url = process.env.EXPO_PUBLIC_LIVEKIT_URL;
  if (!url) {
    throw new Error('EXPO_PUBLIC_LIVEKIT_URL environment variable is not set');
  }
  return url;
}