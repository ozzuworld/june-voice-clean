// hooks/useAuth.tsx - COMPLETE FIXED VERSION with centralized config
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Buffer } from 'buffer';
import { makeRedirectUri, useAuthRequest, useAutoDiscovery } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import APP_CONFIG from '@/config/app.config';

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

// FIXED: Use centralized configuration
const { KEYCLOAK_URL, KEYCLOAK, REDIRECT_SCHEME } = APP_CONFIG;

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
    name: tokenPayload.name || tokenPayload.preferred_username,
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

  // Add debugging for auth state changes
  useEffect(() => {
    console.log('🔍 Auth State Changed:', {
      isAuthenticated: state.isAuthenticated,
      isLoading: state.isLoading,
      hasUser: !!state.user,
      hasAccessToken: !!state.accessToken,
      error: state.error
    });
  }, [state]);

  const discovery = useAutoDiscovery(`${KEYCLOAK_URL}/realms/${KEYCLOAK.REALM}`);

  // FIXED: Better redirect URI handling
  const redirectUri = React.useMemo(() => {
    if (Platform.OS === 'web') {
      return 'http://localhost:8081/auth/callback';
    }
    // Use the scheme from centralized config
    return makeRedirectUri({ 
      scheme: REDIRECT_SCHEME,
      path: 'auth/callback'
    });
  }, []);

  console.log('Redirect URI being used:', redirectUri);

  const [request, response, promptAsync] = useAuthRequest(
    {
      clientId: KEYCLOAK.CLIENT_ID,
      scopes: ['openid', 'profile', 'email', 'offline_access'],
      redirectUri,
      responseType: 'code',
      usePKCE: true,
    },
    discovery
  );

  // Debug auth request details
  useEffect(() => {
    console.log('Auth Request Details:', {
      clientId: KEYCLOAK.CLIENT_ID,
      redirectUri,
      discovery: discovery?.authorizationEndpoint,
      platform: Platform.OS,
      keycloakUrl: KEYCLOAK_URL
    });
  }, [redirectUri, discovery]);

  const checkAuthState = useCallback(async () => {
    try {
      console.log('🔍 Checking stored auth state...');
      const storedAuth = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_STATE);
      const storedUser = await AsyncStorage.getItem(STORAGE_KEYS.USER_INFO);
      
      console.log('📱 Stored auth found:', {
        hasStoredAuth: !!storedAuth,
        hasStoredUser: !!storedUser
      });
      
      if (storedAuth && storedUser) {
        const authData = JSON.parse(storedAuth);
        const userData: User = JSON.parse(storedUser);
        
        // Check if access token is still valid
        const tokenPayload = decodeJWT(authData.access_token);
        const currentTime = Date.now() / 1000;
        
        console.log('⏰ Token validation:', {
          hasPayload: !!tokenPayload,
          tokenExp: tokenPayload?.exp,
          currentTime,
          isValid: tokenPayload && tokenPayload.exp > currentTime + 60
        });
        
        if (tokenPayload && tokenPayload.exp > currentTime + 60) {
          console.log('✅ Using stored valid token');
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
          console.log('🔄 Token expired, attempting refresh...');
          await handleRefreshToken(authData.refresh_token);
          return;
        }
      }
      
      console.log('🚫 No valid stored auth, user needs to sign in');
      setState(prev => ({ ...prev, isLoading: false }));
    } catch (err) {
      console.error('💥 Auth check failed:', err);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  useEffect(() => {
    checkAuthState();
  }, [checkAuthState]);

  const handleRefreshToken = async (refreshToken: string) => {
    try {
      console.log('🔄 Attempting to refresh token...');
      const tokenEndpoint = `${KEYCLOAK_URL}/realms/${KEYCLOAK.REALM}/protocol/openid-connect/token`;
      
      const refreshRequestBody = {
        grant_type: 'refresh_token',
        client_id: KEYCLOAK.CLIENT_ID,
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
      
      setState({
        isAuthenticated: true,
        isLoading: false,
        user,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        error: null,
      });
      
      console.log('✅ Token refreshed successfully');
      
    } catch (error) {
      console.error('💥 Token refresh failed:', error);
      // Clear stored tokens on refresh failure
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

  const handleAuthSuccess = async (code: string) => {
    try {
      console.log('🎯 Starting token exchange with code:', code.substring(0, 20) + '...');
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const tokenEndpoint = `${KEYCLOAK_URL}/realms/${KEYCLOAK.REALM}/protocol/openid-connect/token`;
      
      const tokenRequestBody = {
        grant_type: 'authorization_code',
        client_id: KEYCLOAK.CLIENT_ID,
        code: code,
        redirect_uri: redirectUri,
        code_verifier: request?.codeVerifier || '',
      };

      console.log('🔄 Token exchange request:', {
        tokenEndpoint,
        clientId: KEYCLOAK.CLIENT_ID,
        redirectUri,
        hasCodeVerifier: !!request?.codeVerifier
      });

      const response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(tokenRequestBody).toString(),
      });

      console.log('📨 Token response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Token exchange failed:', errorText);
        throw new Error(`Token exchange failed: ${errorText}`);
      }

      const tokens = await response.json();
      console.log('✅ Token exchange successful, received keys:', Object.keys(tokens));
      
      // Extract user info from access token
      const tokenPayload = decodeJWT(tokens.access_token);
      console.log('🎫 Decoded token payload:', {
        sub: tokenPayload?.sub,
        email: tokenPayload?.email,
        name: tokenPayload?.name,
        exp: tokenPayload?.exp
      });
      
      if (!tokenPayload) {
        throw new Error('Failed to decode access token');
      }
      
      const user = mapKeycloakUser(tokenPayload);
      console.log('👤 Mapped user:', user);
      
      // Store auth state
      await AsyncStorage.setItem(STORAGE_KEYS.AUTH_STATE, JSON.stringify(tokens));
      await AsyncStorage.setItem(STORAGE_KEYS.USER_INFO, JSON.stringify(user));
      console.log('💾 Stored auth state in AsyncStorage');
      
      setState({
        isAuthenticated: true,
        isLoading: false,
        user,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        error: null,
      });
      
      console.log('🎉 Authentication completed successfully for user:', user.username);
      
    } catch (error: any) {
      console.error('💥 Authentication failed:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error?.message || 'Authentication failed',
      }));
    }
  };

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
    }
  }, [response]);

  const signIn = useCallback(async () => {
    try {
      console.log('🚀 Starting authentication...');
      setState(prev => ({ ...prev, error: null }));
      
      if (!request) {
        setState(prev => ({
          ...prev,
          error: 'Authentication is initializing. Please wait and try again.',
        }));
        return;
      }

      console.log('🔑 Prompting for authentication...');
      await promptAsync({
        showInRecents: false,
      });
    } catch (error: any) {
      console.error('💥 Sign in failed:', error);
      setState(prev => ({
        ...prev,
        error: error?.message || 'Sign in failed',
      }));
    }
  }, [request, promptAsync]);

  const signOut = useCallback(async () => {
    try {
      console.log('🚪 Signing out...');
      setState(prev => ({ ...prev, isLoading: true }));
      
      const storedAuth = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_STATE);
      if (storedAuth) {
        const authData = JSON.parse(storedAuth);
        
        // Optional: Logout from Keycloak server
        try {
          const logoutEndpoint = `${KEYCLOAK_URL}/realms/${KEYCLOAK.REALM}/protocol/openid-connect/logout`;
          const logoutRequestBody = {
            client_id: KEYCLOAK.CLIENT_ID,
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
          console.log('Server logout failed (ignored):', logoutError);
        }
      }
      
      // Clear local storage
      await AsyncStorage.multiRemove([STORAGE_KEYS.AUTH_STATE, STORAGE_KEYS.USER_INFO]);
      
      setState({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        accessToken: null,
        refreshToken: null,
        error: null,
      });
      
      console.log('✅ Signed out successfully');
      
    } catch (error) {
      console.error('💥 Sign out failed:', error);
      // Still clear local state even if something fails
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