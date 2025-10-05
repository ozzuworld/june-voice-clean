// hooks/useAuth.tsx - CORRECTED VERSION
import React, { createContext, useContext, useEffect, useState, useRef, useMemo, useCallback } from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as SecureStore from 'expo-secure-store';
import { makeRedirectUri, useAuthRequest, useAutoDiscovery } from 'expo-auth-session';
import { decodeJWT } from '@/utils/jwt';
import APP_CONFIG from '@/config/app.config'; // ✅ IMPORT CONFIG

WebBrowser.maybeCompleteAuthSession();

interface User {
  id: string;
  name?: string;
  email?: string;
  username?: string;
}

interface AuthContextValue {
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  error: string | null;
  clearError: () => void;
  isDiscoveryReady: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // ✅ Generate stable context ID
  const contextId = useRef(`ctx_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`).current;

  const [state, setState] = useState({
    accessToken: null as string | null,
    isAuthenticated: false,
    isLoading: true,
    user: null as User | null,
    error: null as string | null,
  });

  // ✅ USE CONFIG VALUES - Not hardcoded
  const keycloakUrl = APP_CONFIG.KEYCLOAK_URL;
  const realm = APP_CONFIG.KEYCLOAK.REALM;
  const clientId = APP_CONFIG.KEYCLOAK.CLIENT_ID;
  const discoveryUrl = `${keycloakUrl}/realms/${realm}`;

  // ✅ Auto-discover Keycloak endpoints using config
  const discovery = useAutoDiscovery(discoveryUrl);

  // ✅ Create redirect URI using config
  const redirectUri = useMemo(() => 
    makeRedirectUri({
      scheme: APP_CONFIG.REDIRECT_SCHEME,
      path: 'auth/callback',
    }), []);

  // ✅ Only create auth request when discovery is ready
  const [request, response, promptAsync] = useAuthRequest(
    {
      clientId: clientId,
      scopes: ['openid', 'profile', 'email', 'orchestrator-aud'],
      redirectUri: redirectUri,
      responseType: 'code',
      usePKCE: true,
    },
    discovery
  );

  const isDiscoveryReady = Boolean(discovery && request);

  // ✅ Optimize logging for development only
  const logDebug = useCallback((message: string, data?: any) => {
    if (APP_CONFIG.DEBUG.VERBOSE_LOGS && __DEV__) {
      console.log(`[Auth-${contextId.slice(-4)}] ${message}`, data || '');
    }
  }, [contextId]);

  // ✅ Memoized state update to prevent unnecessary re-renders
  const updateState = useCallback((updates: Partial<typeof state>) => {
    setState(prev => {
      const newState = { ...prev, ...updates };
      logDebug('State update', { from: prev, to: newState });
      return newState;
    });
  }, [logDebug]);

  // Load stored auth on startup
  useEffect(() => {
    loadStoredAuth();
  }, []);

  // Handle auth response
  useEffect(() => {
    if (response) {
      logDebug('Auth response received', response.type);
      
      if (response.type === 'success') {
        handleAuthSuccess(response.params.code);
      } else if (response.type === 'error') {
        logDebug('Auth error', response.params);
        updateState({
          error: response.params.error_description || 'Authentication failed',
          isLoading: false,
        });
      } else if (response.type === 'cancel') {
        updateState({ 
          error: 'Authentication cancelled',
          isLoading: false,
        });
      }
    }
  }, [response, updateState, logDebug]);

  const loadStoredAuth = async () => {
    try {
      logDebug('Loading stored auth...');
      
      const token = await SecureStore.getItemAsync('accessToken');
      const userData = await SecureStore.getItemAsync('userData');
      
      if (token && userData) {
        const user = JSON.parse(userData);
        
        // Validate token
        const payload = decodeJWT(token);
        if (!payload || !payload.exp || payload.exp * 1000 < Date.now()) {
          logDebug('Stored token expired, clearing...');
          await clearStoredAuth();
          updateState({ isLoading: false });
          return;
        }
        
        logDebug('Valid stored auth found', { email: user.email });
        updateState({
          accessToken: token,
          isAuthenticated: true,
          user,
          isLoading: false,
        });
      } else {
        logDebug('No stored auth found');
        updateState({ isLoading: false });
      }
    } catch (error) {
      logDebug('Failed to load stored auth', error);
      await clearStoredAuth();
      updateState({ isLoading: false });
    }
  };

  const clearStoredAuth = async () => {
    try {
      await Promise.all([
        SecureStore.deleteItemAsync('accessToken'),
        SecureStore.deleteItemAsync('userData')
      ]);
      logDebug('Stored auth cleared');
    } catch (error) {
      logDebug('Error clearing stored auth', error);
    }
  };

  const signIn = useCallback(async () => {
    try {
      logDebug('Starting sign in...');
      
      if (!isDiscoveryReady) {
        const message = !discovery 
          ? 'Loading authentication service... Please wait.'
          : 'Authentication not ready. Please try again.';
        
        updateState({ error: message });
        
        // Auto-retry when discovery becomes ready
        if (!discovery) {
          setTimeout(() => {
            if (discovery) {
              updateState({ error: null });
            }
          }, 2000);
        }
        return;
      }

      logDebug('Discovery ready', {
        authEndpoint: discovery.authorizationEndpoint,
        tokenEndpoint: discovery.tokenEndpoint,
        configUrl: discoveryUrl
      });

      // Clear existing state
      await clearStoredAuth();
      updateState({ 
        error: null,
        isAuthenticated: false,
        accessToken: null,
        user: null,
        isLoading: false,
      });
      
      logDebug('Opening browser for authentication...');
      await promptAsync();
      
    } catch (error: any) {
      logDebug('Sign in error', error);
      updateState({ 
        error: error.message || 'Sign in failed',
        isLoading: false,
      });
    }
  }, [isDiscoveryReady, discovery, promptAsync, updateState, logDebug, discoveryUrl]);

  const handleAuthSuccess = async (code: string) => {
    try {
      logDebug('Exchanging code for token...');
      
      updateState({ isLoading: true, error: null });
      
      if (!discovery?.tokenEndpoint || !request?.codeVerifier) {
        throw new Error('Authentication configuration not ready');
      }

      const tokenRequest = {
        grant_type: 'authorization_code',
        client_id: clientId,
        code: code,
        redirect_uri: redirectUri,
        code_verifier: request.codeVerifier,
      };

      logDebug('Making token request to', discovery.tokenEndpoint);

      const response = await fetch(discovery.tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(tokenRequest).toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logDebug('Token exchange failed', { status: response.status, error: errorText });
        throw new Error(`Token exchange failed: ${response.status}`);
      }

      const tokens = await response.json();
      logDebug('Token exchange successful');

      // Decode JWT to get user info
      const payload = decodeJWT(tokens.access_token);
      if (!payload) {
        throw new Error('Failed to decode access token');
      }

      const user: User = {
        id: payload.sub,
        name: payload.name,
        email: payload.email,
        username: payload.preferred_username,
      };

      logDebug('User authenticated', { email: user.email });

      // Store securely
      await Promise.all([
        SecureStore.setItemAsync('accessToken', tokens.access_token),
        SecureStore.setItemAsync('userData', JSON.stringify(user))
      ]);

      updateState({
        accessToken: tokens.access_token,
        isAuthenticated: true,
        user: user,
        error: null,
        isLoading: false,
      });

      logDebug('Authentication completed successfully!');

    } catch (error: any) {
      logDebug('Token exchange error', error);
      updateState({ 
        error: error.message || 'Failed to complete authentication',
        isLoading: false,
      });
    }
  };

  const signOut = useCallback(async () => {
    try {
      logDebug('Signing out...');
      
      await clearStoredAuth();
      
      updateState({
        accessToken: null,
        isAuthenticated: false,
        isLoading: false,
        user: null,
        error: null,
      });

      logDebug('Signed out successfully');
    } catch (error) {
      logDebug('Sign out error', error);
    }
  }, [updateState, logDebug]);

  const clearError = useCallback(() => {
    updateState({ error: null });
  }, [updateState]);

  // ✅ Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo((): AuthContextValue => ({
    ...state,
    signIn,
    signOut,
    clearError,
    isDiscoveryReady,
  }), [state, signIn, signOut, clearError, isDiscoveryReady]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
