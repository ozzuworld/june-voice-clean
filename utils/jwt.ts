// utils/jwt.ts

/**
 * Simple JWT decoder for React Native/Expo projects
 * This only decodes the payload - does not verify signature
 * Based on jwt.io decoder logic
 */

export interface JWTPayload {
  [key: string]: any;
  exp?: number;
  iat?: number;
  sub?: string;
  iss?: string;
  aud?: string | string[];
  nbf?: number;
  jti?: string;
}

/**
 * Decode a JWT token without verification
 * @param token - JWT token string
 * @returns Decoded payload object
 */
export function decodeJWT(token: string): JWTPayload | null {
  console.log('🔐 [JWT DECODE] Starting JWT decode process...');
  
  if (!token || typeof token !== 'string') {
    console.log('🔐 [JWT DECODE ERROR] Invalid token input:', { 
      exists: !!token, 
      type: typeof token, 
      length: token?.length 
    });
    return null;
  }

  try {
    console.log('🔐 [JWT DECODE] Token length:', token.length);
    console.log('🔐 [JWT DECODE] Token preview:', `${token.substring(0, 50)}...`);
    
    // JWT has 3 parts separated by dots
    const parts = token.split('.');
    console.log('🔐 [JWT DECODE] Token parts count:', parts.length);
    
    if (parts.length !== 3) {
      console.log('🔐 [JWT DECODE ERROR] Invalid JWT structure. Expected 3 parts, got:', parts.length);
      return null;
    }

    // Get the payload (second part)
    const payload = parts[1];
    console.log('🔐 [JWT DECODE] Payload part length:', payload.length);
    console.log('🔐 [JWT DECODE] Payload part preview:', `${payload.substring(0, 30)}...`);
    
    // JWT uses Base64URL encoding, need to convert to regular Base64
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    console.log('🔐 [JWT DECODE] Base64 conversion completed');
    
    // Decode from Base64
    const decoded = atob(base64);
    console.log('🔐 [JWT DECODE] Base64 decode completed, result length:', decoded.length);
    
    // Parse JSON
    const parsedPayload = JSON.parse(decoded);
    console.log('🔐 [JWT DECODE] JSON parse successful');
    console.log('🔐 [JWT DECODE] Payload contents:', {
      sub: parsedPayload.sub,
      exp: parsedPayload.exp,
      iat: parsedPayload.iat,
      iss: parsedPayload.iss,
      aud: parsedPayload.aud,
      email: parsedPayload.email,
      preferred_username: parsedPayload.preferred_username,
      name: parsedPayload.name
    });
    
    if (parsedPayload.exp) {
      const expDate = new Date(parsedPayload.exp * 1000);
      const now = new Date();
      const isExpired = expDate < now;
      console.log('🔐 [JWT DECODE] Token expiration:', {
        expires: expDate.toISOString(),
        now: now.toISOString(),
        isExpired: isExpired
      });
    }
    
    console.log('🔐 [JWT DECODE] ✅ JWT decode completed successfully');
    return parsedPayload;
  } catch (error) {
    console.log('🔐 [JWT DECODE ERROR] Failed to decode JWT:', error);
    console.log('🔐 [JWT DECODE ERROR] Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace'
    });
    return null;
  }
}

/**
 * Check if a JWT token is expired
 * @param token - JWT token string
 * @returns true if expired, false if valid, null if invalid token
 */
export function isTokenExpired(token: string): boolean | null {
  const payload = decodeJWT(token);
  if (!payload || !payload.exp) {
    return null;
  }
  
  // exp is in seconds, Date.now() is in milliseconds
  return payload.exp * 1000 < Date.now();
}

/**
 * Get the expiration date of a JWT token
 * @param token - JWT token string
 * @returns Date object or null if invalid
 */
export function getTokenExpiration(token: string): Date | null {
  const payload = decodeJWT(token);
  if (!payload || !payload.exp) {
    return null;
  }
  
  return new Date(payload.exp * 1000);
}

export default {
  decodeJWT,
  isTokenExpired,
  getTokenExpiration,
};