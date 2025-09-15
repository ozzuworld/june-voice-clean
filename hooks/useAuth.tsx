// hooks/useAuth.tsx - FIXED VERSION with better callback handling
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Buffer } from 'buffer';
import { makeRedirectUri, useAuthRequest, useAutoDiscovery } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import APP_CONFIG from '@/config/app.config';

// CRITICAL: Complete the auth session for React Native
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

  // Enhanced debugging
  useEffect(() => {
    console.log('🔍 Auth State Changed:', {
      isAuthenticated: state.isAuthenticated,
      isLoading: state.isLoading,
      hasUser: !!state.user,
      hasAccessToken: !!state.accessToken,
      error: state.error,
      username: state.user?.username
    });
  }, [state]);

  const discovery = useAutoDiscovery(`${KEYCLOAK_URL}/realms/${KEYCLOAK.REALM}`);

  // FIXED: Use proper redirect URI with explicit makeRedirectUri
  const redirectUri = React.useMemo(() => {
    if (Platform.OS === 'web') {
      return 'http://localhost:8081/auth/callback';
    }
    
    // FIXED: Use makeRedirectUri for proper Android handling
    const nativeRedirectUri = makeRedirectUri({
      scheme: REDIRECT_SCHEME,
      path: 'auth/callback',
      preferLocalhost: false,
      isTripleSlashed: false,
    });
    
    console.log('🔗 Native redirect URI generated:', nativeRedirectUri);
    return nativeRedirectUri;
  }, []);

  console.log('🔗 Final redirect URI being used:', redirectUri);
  console.log('🔗 Platform:', Platform.OS);
  console.log('🔗 Scheme configured:', REDIRECT_SCHEME);

  const [request, response, promptAsync] = useAuthRequest(
    {
      clientId: KEYCLOAK.CLIENT_ID,
      scopes: ['openid', 'profile', 'email', 'offline_access'],
      redirectUri,
      responseType: 'code',
      usePKCE: true,
      // FIXED: Additional parameters for better compatibility
      additionalParameters: {},
      extraParams: {},
    },
    discovery
  );

  // Enhanced debug logging
  useEffect(() => {
    console.log('🔧 Auth Configuration:', {
      clientId: KEYCLOAK.CLIENT_ID,
      redirectUri,
      discovery: discovery?.authorizationEndpoint,
      platform: Platform.OS,
      keycloakUrl: KEYCLOAK_URL,
      realm: KEYCLOAK.REALM,
      scheme: REDIRECT_SCHEME,
      requestReady: !!request,
      discoveryReady: !!discovery
    });
  }, [redirectUri, discovery, request]);

  const checkAuthState = useCallback(async () => {
    try {
      console.log('🔍 Checking stored auth state...');
      const storedAuth = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_STATE);
      const storedUser = await AsyncStorage.getItem(STORAGE_KEYS.USER_INFO);
      
      console.log('📱 Stored auth check:', {
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
          console.log('✅ Using stored valid token for user:', userData.username);
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
      setState(prev => ({ ...prev, isLoading: false, error: 'Auth check failed' }));
    }
  }, []);

  useEffect(() => {
    // Add a delay to allow the app to fully initialize
    const timer = setTimeout(() => {
      checkAuthState();
    }, 100);
    
    return () => clearTimeout(timer);
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
        throw new Error(`Token refresh failed: ${tokenResponse.status}`);
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
      
      console.log('✅ Token refreshed successfully for user:', user.username);
      
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

      console.log('🔄 Token exchange request to:', tokenEndpoint);
      console.log('🔄 Using redirect URI:', redirectUri);
      console.log('🔄 Client ID:', KEYCLOAK.CLIENT_ID);
      console.log('🔄 Has code verifier:', !!request?.codeVerifier);

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
        throw new Error(`Token exchange failed: ${response.status} - ${errorText}`);
      }

      const tokens = await response.json();
      console.log('✅ Token exchange successful, received keys:', Object.keys(tokens));
      
      // Extract user info from access token
      const tokenPayload = decodeJWT(tokens.access_token);
      console.log('🎫 Decoded token payload:', {
        sub: tokenPayload?.sub,
        email: tokenPayload?.email,
        preferred_username: tokenPayload?.preferred_username,
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
      
      // CRITICAL: Update state to authenticated
      setState({
        isAuthenticated: true,
        isLoading: false,
        user,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        error: null,
      });
      
      console.log('🎉 Authentication completed successfully for user:', user.username);
      console.log('🎉 User is now authenticated:', true);
      
    } catch (error: any) {
      console.error('💥 Authentication failed:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error?.message || 'Authentication failed',
      }));
    }
  };

  // CRITICAL: Enhanced response handling
  useEffect(() => {
    console.log('📬 Auth response received:', {
      type: response?.type,
      hasParams: !!response?.params,
      paramKeys: response?.params ? Object.keys(response.params) : [],
      code: response?.params?.code ? 'present' : 'missing',
      error: response?.error?.message,
      errorDescription: response?.params?.error_description
    });
    
    if (response?.type === 'success') {
      console.log('✅ Auth success detected!');
      if (response.params?.code) {
        console.log('✅ Authorization code received, starting token exchange...');
        handleAuthSuccess(response.params.code);
      } else {
        console.error('❌ Success response but no authorization code');
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: 'Authentication succeeded but no authorization code received',
        }));
      }
    } else if (response?.type === 'error') {
      console.error('❌ Auth error details:', {
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
      console.log('🚫 Auth cancelled by user');
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: null, // Don't show error for user cancellation
      }));
    } else if (response?.type === 'dismiss') {
      console.log('🚫 Auth dismissed');
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: null,
      }));
    }
  }, [response]);

  const signIn = useCallback(async () => {
    try {
      console.log('🚀 Starting authentication process...');
      setState(prev => ({ ...prev, error: null }));
      
      if (!request) {
        console.log('❌ Auth request not ready yet');
        setState(prev => ({
          ...prev,
          error: 'Authentication is initializing. Please wait and try again.',
        }));
        return;
      }

      if (!discovery) {
        console.log('❌ Discovery not ready yet');
        setState(prev => ({
          ...prev,
          error: 'Authentication service discovery failed. Please check your internet connection.',
        }));
        return;
      }

      console.log('🔑 Prompting for authentication with config:', {
        authorizationEndpoint: discovery.authorizationEndpoint,
        clientId: KEYCLOAK.CLIENT_ID,
        redirectUri,
        scopes: request.scopes
      });
      
      const result = await promptAsync({
        showInRecents: false,
        // Force browser session to ensure fresh authentication
        useProxy: Platform.OS === 'android',
      });
      
      console.log('🔑 Prompt async result:', result);
      
    } catch (error: any) {
      console.error('💥 Sign in failed:', error);
      setState(prev => ({
        ...prev,
        error: error?.message || 'Sign in failed',
      }));
    }
  }, [request, promptAsync, discovery, redirectUri]);

  const signOut = useCallback(async () => {
    try {
      console.log('🚪 Signing out...');
      setState(prev => ({ ...prev, isLoading: true }));
      
      // Clear local storage first
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