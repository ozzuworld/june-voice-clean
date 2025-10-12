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
  if (!token || typeof token !== 'string') {
    return null;
  }

  try {
    // JWT has 3 parts separated by dots
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    // Get the payload (second part)
    const payload = parts[1];
    
    // JWT uses Base64URL encoding, need to convert to regular Base64
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    
    // Decode from Base64
    const decoded = atob(base64);
    
    // Parse JSON
    return JSON.parse(decoded);
  } catch (error) {
    console.error('Failed to decode JWT:', error);
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