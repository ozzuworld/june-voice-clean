// src/hooks/useAuth.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Buffer } from 'buffer';
import { makeRedirectUri, useAuthRequest, useAutoDiscovery } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { AUTH_CONFIG } from '@/config/auth.config';
import type { AuthContextType, AuthState, TokenPayload, User } from '@/types/auth.types';

WebBrowser.maybeCompleteAuthSession();

const AuthContext = createContext<AuthContextType | null>(null);

// Storage keys
const STORAGE_KEYS = {
  AUTH_STATE: '@june_auth_state',
  USER_INFO: '@june_user_info',
};

// Helper to decode JWT token
function decodeJWT(token: string): TokenPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT token format');
    }

    const payload = parts[1];
    
    // Add padding if needed
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
function mapKeycloakUser(tokenPayload: TokenPayload): User {
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

  // Auto-discover Keycloak endpoints
  const discovery = useAutoDiscovery(`${AUTH_CONFIG.keycloak.url}/realms/${AUTH_CONFIG.keycloak.realm}`);

  // Create redirect URI
  const redirectUri = React.useMemo(() => {
    if (Platform.OS === 'web') {
      return 'http://localhost:8081/auth/callback';
    }
    return makeRedirectUri({ native: 'june://auth/callback' });
  }, []);

  // Create auth request
  const [request, response, promptAsync] = useAuthRequest(
    {
      clientId: AUTH_CONFIG.keycloak.clientId,
      scopes: ['openid', 'profile', 'email', 'offline_access'],
      redirectUri,
      responseType: 'code',
      usePKCE: true,
    },
    discovery
  );

  // Check for existing auth on app start
  useEffect(() => {
    checkAuthState();
  }, []);

  // Handle auth response
  useEffect(() => {
    if (response?.type === 'success') {
      handleAuthSuccess(response.params.code);
    } else if (response?.type === 'error') {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: response.params?.error_description || 'Authentication failed',
      }));
    } else if (response?.type === 'cancel') {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Authentication was cancelled',
      }));
    }
  }, [response]);

  const checkAuthState = useCallback(async () => {
    try {
      const storedAuth = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_STATE);
      const storedUser = await AsyncStorage.getItem(STORAGE_KEYS.USER_INFO);
      
      if (storedAuth && storedUser) {
        const authData = JSON.parse(storedAuth);
        const userData: User = JSON.parse(storedUser);
        
        // Check if access token is still valid
        const tokenPayload = decodeJWT(authData.access_token);
        const currentTime = Date.now() / 1000;
        
        if (tokenPayload && tokenPayload.exp > currentTime + 60) {
          setState({
            isAuthenticated: true,
            isLoading: false,
            user: userData,
            accessToken: authData.access_token,
            refreshToken: authData.refresh_token,
            error: null,
          });
          return;
        } else if (authData.refresh_token) {
          await handleRefreshToken(authData.refresh_token);
          return;
        }
      }
      
      setState(prev => ({ ...prev, isLoading: false }));
    } catch (err) {
      console.error('Auth check failed:', err);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const handleAuthSuccess = async (code: string) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const tokenEndpoint = `${AUTH_CONFIG.keycloak.url}/realms/${AUTH_CONFIG.keycloak.realm}/protocol/openid-connect/token`;
      
      const tokenRequestBody = {
        grant_type: 'authorization_code',
        client_id: AUTH_CONFIG.keycloak.clientId,
        code: code,
        redirect_uri: redirectUri,
        code_verifier: request?.codeVerifier || '',
      };

      const tokenResponse = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(tokenRequestBody).toString(),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        throw new Error(`Token exchange failed: ${errorText}`);
      }

      const tokens = await tokenResponse.json();
      const tokenPayload = decodeJWT(tokens.access_token);
      
      if (!tokenPayload) {
        throw new Error('Failed to decode access token');
      }
      
      const user = mapKeycloakUser(tokenPayload);
      
      // Store auth state
      await AsyncStorage.setItem(STORAGE_KEYS.AUTH_STATE, JSON.stringify(tokens));
      await AsyncStorage.setItem(STORAGE_KEYS.USER_INFO, JSON.stringify(user));
      
      setState({
        isAuthenticated: true,
        isLoading: false,
        user,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        error: null,
      });
      
    } catch (error: any) {
      console.error('Authentication failed:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error?.message || 'Authentication failed',
      }));
    }
  };

  const handleRefreshToken = async (refreshToken: string) => {
    try {
      const tokenEndpoint = `${AUTH_CONFIG.keycloak.url}/realms/${AUTH_CONFIG.keycloak.realm}/protocol/openid-connect/token`;
      
      const refreshRequestBody = {
        grant_type: 'refresh_token',
        client_id: AUTH_CONFIG.keycloak.clientId,
        refresh_token: refreshToken,
      };

      const tokenResponse = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(refreshRequestBody).toString(),
      });

      if (!tokenResponse.ok) {
        throw new Error('Token refresh failed');
      }

      const tokens = await tokenResponse.json();
      const tokenPayload = decodeJWT(tokens.access_token);
      
      if (!tokenPayload) {
        throw new Error('Failed to decode refreshed token');
      }
      
      const user = mapKeycloakUser(tokenPayload);
      
      await AsyncStorage.setItem(STORAGE_KEYS.AUTH_STATE, JSON.stringify(tokens));
      await AsyncStorage.setItem(STORAGE_KEYS.USER_INFO, JSON.stringify(user));
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        user,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        isAuthenticated: true,
        error: null,
      }));
      
    } catch (error) {
      console.error('Token refresh failed:', error);
      await AsyncStorage.multiRemove([STORAGE_KEYS.AUTH_STATE, STORAGE_KEYS.USER_INFO]);
      setState({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        accessToken: null,
        refreshToken: null,
        error: 'Session expired. Please sign in again.',
      });
    }
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
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      
      const storedAuth = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_STATE);
      if (storedAuth) {
        const authData = JSON.parse(storedAuth);
        
        try {
          const logoutEndpoint = `${AUTH_CONFIG.keycloak.url}/realms/${AUTH_CONFIG.keycloak.realm}/protocol/openid-connect/logout`;
          const logoutRequestBody = {
            client_id: AUTH_CONFIG.keycloak.clientId,
            refresh_token: authData.refresh_token,
          };
          
          await fetch(logoutEndpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams(logoutRequestBody).toString(),
          });
        } catch (logoutError) {
          console.log('Server logout failed:', logoutError);
        }
      }
      
      await AsyncStorage.multiRemove([STORAGE_KEYS.AUTH_STATE, STORAGE_KEYS.USER_INFO]);
      
      setState({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        accessToken: null,
        refreshToken: null,
        error: null,
      });
      
    } catch (error) {
      console.error('Sign out failed:', error);
      setState({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        accessToken: null,
        refreshToken: null,
        error: null,
      });
    }
  }, []);

  const refreshAuth = useCallback(async () => {
    const storedAuth = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_STATE);
    if (storedAuth) {
      const authData = JSON.parse(storedAuth);
      if (authData.refresh_token) {
        await handleRefreshToken(authData.refresh_token);
      }
    }
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