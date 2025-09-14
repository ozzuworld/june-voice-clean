// src/contexts/AuthContext.tsx - Fixed JWT decoding for React Native
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Buffer } from 'buffer';
import { makeRedirectUri, useAuthRequest, useAutoDiscovery } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';

// Complete the auth session
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
  error: string | null;
}

interface AuthContextType extends AuthState {
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshToken: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Storage keys
const STORAGE_KEYS = {
  AUTH_STATE: '@ozzu_auth_state',
  USER_INFO: '@ozzu_user_info',
};

// Keycloak configuration - UPDATED to use your actual service
const KEYCLOAK_URL = 'https://june-idp-359243954.us-central1.run.app';
const REALM = 'june';
const CLIENT_ID = 'june-mobile-app';

// Helper to decode JWT token - FIXED for React Native
function decodeJWT(token: string): any {
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
    
    // Use Buffer for React Native compatibility
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
    error: null,
  });

  // Auto-discover Keycloak endpoints
  const discovery = useAutoDiscovery(`${KEYCLOAK_URL}/realms/${REALM}`);

  // Create redirect URI with explicit control
  const redirectUri = React.useMemo(() => {
    if (Platform.OS === 'web') {
      return 'http://localhost:8081/auth/callback';
    }
    return 'june://auth/callback';
  }, []);

  console.log('Platform:', Platform.OS, 'Redirect URI:', redirectUri);

  // Create auth request
  const [request, response, promptAsync] = useAuthRequest(
    {
      clientId: CLIENT_ID,
      scopes: ['openid', 'profile', 'email', 'offline_access'],
      redirectUri: makeRedirectUri({
        native: redirectUri,
      }),
      responseType: 'code',
      usePKCE: true,
      additionalParameters: {},
    },
    discovery
  );

  // Debug logging for auth request
  useEffect(() => {
    if (discovery) {
      console.log('Discovery loaded:', discovery.authorizationEndpoint);
    }
    if (request) {
      console.log('Auth request created with:', {
        clientId: request.clientId,
        redirectUri: request.redirectUri,
        scopes: request.scopes,
        responseType: request.responseType,
        usePKCE: request.usePKCE,
      });
    }
  }, [discovery, request]);

  // Check for existing auth on app start
  useEffect(() => {
    checkAuthState();
  }, []);

  // Handle auth response
  useEffect(() => {
    console.log('Auth response:', response?.type, response?.params);
    
    if (response?.type === 'success') {
      console.log('Auth success, code:', response.params.code);
      handleAuthSuccess(response.params.code);
    } else if (response?.type === 'error') {
      console.error('Auth error details:', {
        error: response.error,
        errorDescription: response.params?.error_description,
        params: response.params
      });
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: response.params?.error_description || response.error?.message || 'Authentication failed',
      }));
    } else if (response?.type === 'cancel') {
      console.log('Auth cancelled');
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Authentication was cancelled',
      }));
    } else if (response?.type === 'dismiss') {
      console.log('Auth dismissed');
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Authentication was dismissed',
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
        
        if (tokenPayload && tokenPayload.exp > currentTime + 60) { // 60 second buffer
          setState({
            isAuthenticated: true,
            isLoading: false,
            user: userData,
            accessToken: authData.access_token,
            error: null,
          });
          return;
        } else if (authData.refresh_token) {
          // Try to refresh token
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

      // Exchange code for tokens using Keycloak token endpoint
      const tokenEndpoint = `${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/token`;
      
      const tokenRequestBody = {
        grant_type: 'authorization_code',
        client_id: CLIENT_ID,
        code: code,
        redirect_uri: redirectUri,
        code_verifier: request?.codeVerifier || '',
      };

      console.log('Token exchange request:', {
        tokenEndpoint,
        body: tokenRequestBody,
        code: code.substring(0, 20) + '...',
        codeVerifier: request?.codeVerifier ? 'present' : 'missing'
      });

      const tokenResponse = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(tokenRequestBody).toString(),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error('Token exchange failed:', errorText);
        throw new Error(`Token exchange failed: ${errorText}`);
      }

      const tokens = await tokenResponse.json();
      console.log('Token exchange successful');
      console.log('Received tokens keys:', Object.keys(tokens));
      
      // Extract user info from access token
      const tokenPayload = decodeJWT(tokens.access_token);
      
      if (!tokenPayload) {
        throw new Error('Failed to decode access token');
      }
      
      const user = mapKeycloakUser(tokenPayload);
      console.log('Mapped user:', user);
      
      // Store auth state
      await AsyncStorage.setItem(STORAGE_KEYS.AUTH_STATE, JSON.stringify(tokens));
      await AsyncStorage.setItem(STORAGE_KEYS.USER_INFO, JSON.stringify(user));
      
      setState({
        isAuthenticated: true,
        isLoading: false,
        user,
        accessToken: tokens.access_token,
        error: null,
      });
      
      console.log('Authentication successful for user:', user.username);
      
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
      const tokenEndpoint = `${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/token`;
      
      const refreshRequestBody = {
        grant_type: 'refresh_token',
        client_id: CLIENT_ID,
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
      const user = mapKeycloakUser(tokenPayload);
      
      await AsyncStorage.setItem(STORAGE_KEYS.AUTH_STATE, JSON.stringify(tokens));
      await AsyncStorage.setItem(STORAGE_KEYS.USER_INFO, JSON.stringify(user));
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        user,
        accessToken: tokens.access_token,
        isAuthenticated: true,
        error: null,
      }));
      
      console.log('Token refreshed successfully');
      
    } catch (error) {
      console.error('Token refresh failed:', error);
      // Clear stored tokens on refresh failure
      await AsyncStorage.multiRemove([STORAGE_KEYS.AUTH_STATE, STORAGE_KEYS.USER_INFO]);
      setState({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        accessToken: null,
        error: 'Session expired. Please sign in again.',
      });
    }
  };

  const signIn = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, error: null }));
      
      if (!request) {
        console.log('Auth request not ready, discovery loaded:', !!discovery);
        setState(prev => ({
          ...prev,
          error: 'Authentication is initializing. Please wait and try again.',
        }));
        return;
      }

      console.log('Starting authentication with redirect URI:', request.redirectUri);
      
      await promptAsync({
        showInRecents: false,
      });
      
    } catch (error: any) {
      console.error('Sign in failed:', error);
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
        
        // Logout from Keycloak server
        try {
          const logoutEndpoint = `${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/logout`;
          const logoutRequestBody = {
            client_id: CLIENT_ID,
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
      
      // Clear local storage
      await AsyncStorage.multiRemove([STORAGE_KEYS.AUTH_STATE, STORAGE_KEYS.USER_INFO]);
      
      setState({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        accessToken: null,
        error: null,
      });
      
      console.log('Signed out successfully');
      
    } catch (error) {
      console.error('Sign out failed:', error);
      // Still clear local state even if server logout fails
      setState({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        accessToken: null,
        error: null,
      });
    }
  }, []);

  const refreshTokenMethod = useCallback(async () => {
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
    refreshToken: refreshTokenMethod,
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