// lib/authStorage.ts
import * as SecureStore from 'expo-secure-store';
import { STORAGE_KEYS } from '@/constants/storage';

// Android SecureStore has ~2KB limit per item.
// Store access token directly; split refresh token across two keys if present.

export async function saveTokens(opts: { access?: string | null; refresh?: string | null }): Promise<void> {
  const { access, refresh } = opts;

  if (access) {
    await SecureStore.setItemAsync(STORAGE_KEYS.ACCESS, access);
  } else {
    await SecureStore.deleteItemAsync(STORAGE_KEYS.ACCESS);
  }

  if (refresh) {
    const mid = Math.ceil(refresh.length / 2);
    await SecureStore.setItemAsync(STORAGE_KEYS.RT_A, refresh.slice(0, mid));
    await SecureStore.setItemAsync(STORAGE_KEYS.RT_B, refresh.slice(mid));
  } else {
    await SecureStore.deleteItemAsync(STORAGE_KEYS.RT_A);
    await SecureStore.deleteItemAsync(STORAGE_KEYS.RT_B);
  }
}

export async function loadAccess(): Promise<string | null> {
  return SecureStore.getItemAsync(STORAGE_KEYS.ACCESS);
}

export async function loadRefresh(): Promise<string | null> {
  const a = await SecureStore.getItemAsync(STORAGE_KEYS.RT_A);
  const b = await SecureStore.getItemAsync(STORAGE_KEYS.RT_B);
  if (!a || !b) return null;
  return a + b;
}

export async function saveUser(user: unknown | null): Promise<void> {
  if (user) {
    await SecureStore.setItemAsync(STORAGE_KEYS.USER, JSON.stringify(user));
  } else {
    await SecureStore.deleteItemAsync(STORAGE_KEYS.USER);
  }
}

export async function loadUser<T = any>(): Promise<T | null> {
  const raw = await SecureStore.getItemAsync(STORAGE_KEYS.USER);
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}
