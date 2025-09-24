// utils/jwt.ts
import { Buffer } from 'buffer';

export interface JwtPayload {
  exp?: number;
  iat?: number;
  [k: string]: unknown;
}

export function decodeJWT<T = JwtPayload>(token: string | null | undefined): T | null {
  if (!token) return null;
  try {
    const payload = token.split('.')[1];
    const json = Buffer.from(payload, 'base64').toString('utf8');
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

export function secondsUntilExpiry(token: string | null | undefined, skew = 15): number | null {
  const payload = decodeJWT<JwtPayload>(token);
  if (!payload?.exp) return null;
  const now = Math.floor(Date.now() / 1000);
  return payload.exp - now - skew; // subtract a small skew
}
