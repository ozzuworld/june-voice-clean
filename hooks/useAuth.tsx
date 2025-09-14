// hooks/useAuth.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Buffer } from 'buffer';
import { makeRedirectUri, useAuthRequest, useAutoDiscovery } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

// Types
export interface User {
  id: string;
  email?: string;
  username?: string;
  name?: string;
  roles?: string[];
}

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  error: string | null;
}

interface AuthContextType extends AuthState {
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Keycloak configuration
const KEYCLOAK_URL = 'https://june-idp-359243954.us-central1.run.app';
const REALM = 'june';
const CLIENT_ID = 'june-mobile-app';

// Storage keys
const STORAGE_KEYS = {
  AUTH_STATE: '@june_auth_state',
  USER_INFO: '@june_user_info',
};

// Helper to decode JWT token
function decodeJWT(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT token format');
    }

    const payload = parts[1];
    let base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    
    const decoded = Buffer.from(base64, 'base64').toString('utf8');
    return JSON.parse(decoded);
  } catch (error) {
    console.error('Failed to decode JWT:', error);
    return null;
  }
}

// Map Keycloak token to User object
function mapKeycloakUser(tokenPayload: any): User {
  return {
    id: tokenPayload.sub,
    email: tokenPayload.email,
    username: tokenPayload.preferred_username,
    name: tokenPayload.name,
    roles: tokenPayload.realm_access?.roles || [],
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    user: null,
    accessToken: null,
    refreshToken: null,
    error: null,
  });

  const discovery = useAutoDiscovery(`${KEYCLOAK_URL}/realms/${REALM}`);

  const redirectUri = React.useMemo(() => {
    if (Platform.OS === 'web') {
      return 'http://localhost:8081/auth/callback';
    }
    return makeRedirectUri({ native: 'june://auth/callback' });
  }, []);

  const [request, response, promptAsync] = useAuthRequest(
    {
      clientId: CLIENT_ID,
      scopes: ['openid', 'profile', 'email', 'offline_access'],
      redirectUri,
      responseType: 'code',
      usePKCE: true,
    },
    discovery
  );

  useEffect(() => {
    checkAuthState();
  }, []);

  useEffect(() => {
    if (response?.type === 'success') {
      handleAuthSuccess(response.params.code);
    } else if (response?.type === 'error') {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: response.params?.error_description || 'Authentication failed',
      }));
    }
  }, [response]);

  const checkAuthState = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: false }));
    } catch (err) {
      console.error('Auth check failed:', err);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const handleAuthSuccess = async (code: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    // Implementation here...
    setState(prev => ({ ...prev, isLoading: false }));
  };

  const signIn = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, error: null }));
      
      if (!request) {
        setState(prev => ({
          ...prev,
          error: 'Authentication is initializing. Please wait and try again.',
        }));
        return;
      }

      await promptAsync({
        showInRecents: false,
      });
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        error: error?.message || 'Sign in failed',
      }));
    }
  }, [request, promptAsync]);

  const signOut = useCallback(async () => {
    setState({
      isAuthenticated: false,
      isLoading: false,
      user: null,
      accessToken: null,
      refreshToken: null,
      error: null,
    });
  }, []);

  const refreshAuth = useCallback(async () => {
    // Implementation here...
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const value: AuthContextType = {
    ...state,
    signIn,
    signOut,
    refreshAuth,
    clearError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}