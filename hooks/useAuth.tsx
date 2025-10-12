// hooks/useAuth.tsx - ENHANCED DEEP LINKING VERSION WITH ANDROID FIX
import React, { createContext, useContext, useEffect, useState, useRef, useMemo, useCallback } from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as SecureStore from 'expo-secure-store';
import * as Linking from 'expo-linking';
import { makeRedirectUri, useAuthRequest, useAutoDiscovery } from 'expo-auth-session';
import { decodeJWT } from '@/utils/jwt';
import APP_CONFIG from '@/config/app.config';

// CRITICAL: Complete auth session before component definition
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

// Deep link handler function
const handleDeepLink = (url: string) => {
  console.log('🔗 Deep link received:', url);
  
  // Check if this is an auth callback
  if (url.includes('june://auth/callback')) {
    console.log('✅ Auth callback detected');
    // The expo-auth-session will handle this automatically
    // but logging helps with debugging
  }
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Generate stable context ID
  const contextId = useRef(`ctx_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`).current;

  const [state, setState] = useState({
    accessToken: null as string | null,
    isAuthenticated: false,
    isLoading: true,
    user: null as User | null,
    error: null as string | null,
  });

  // USE CONFIG VALUES
  const keycloakUrl = APP_CONFIG.KEYCLOAK_URL;
  const realm = APP_CONFIG.KEYCLOAK.REALM;
  const clientId = APP_CONFIG.KEYCLOAK.CLIENT_ID;
  const discoveryUrl = `${keycloakUrl}/realms/${realm}`;

  // Auto-discover Keycloak endpoints using config
  const discovery = useAutoDiscovery(discoveryUrl);

  // 🔧 UPDATED: Use the REDIRECT_SCHEME from config directly
  const redirectUri = useMemo(() => {
    const uri = __DEV__ 
      ? makeRedirectUri({ 
          native: APP_CONFIG.REDIRECT_SCHEME, // Use full URI from config
          path: undefined // Remove path since it's included in REDIRECT_SCHEME
        })
      : APP_CONFIG.REDIRECT_SCHEME;  // Use config value for production
    
    // 🔍 DETAILED DEBUG LOGGING
    console.log('🔍 [REDIRECT URI DEBUG] ==================')
    console.log('🔍 Environment:', __DEV__ ? 'Development (Expo Go)' : 'Production (Standalone)');
    console.log('🔍 Config REDIRECT_SCHEME:', APP_CONFIG.REDIRECT_SCHEME);
    console.log('🔍 Generated URI:', uri);
    console.log('🔍 makeRedirectUri options:', {
      native: APP_CONFIG.REDIRECT_SCHEME,
      path: undefined,
    });
    console.log('🔍 ========================================')
    
    return uri;
  }, []);

  // Only create auth request when discovery is ready
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

  // 🐛 DEBUG: Log auth request details when ready
  useEffect(() => {
    if (request && discovery) {
      console.log('🔍 [AUTH REQUEST DEBUG] ==================')
      console.log('🔍 Client ID:', clientId);
      console.log('🔍 Redirect URI:', redirectUri);
      console.log('🔍 Discovery URL:', discoveryUrl);
      console.log('🔍 Auth Endpoint:', discovery.authorizationEndpoint);
      console.log('🔍 Token Endpoint:', discovery.tokenEndpoint);
      console.log('🔍 Request URL that will be opened:', request.url);
      console.log('🔍 ========================================')
    }
  }, [request, discovery, clientId, redirectUri, discoveryUrl]);

  // Add deep link listener
  useEffect(() => {
    console.log('🔗 Setting up deep link listeners...');
    
    const subscription = Linking.addEventListener('url', handleDeepLink);
    
    // Check if app was opened with a deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        console.log('🔗 Initial URL detected:', url);
        handleDeepLink(url);
      }
    });

    return () => {
      console.log('🔗 Cleaning up deep link listeners...');
      subscription?.remove();
    };
  }, []);

  // Optimize logging for development only
  const logDebug = useCallback((message: string, data?: any) => {
    if (APP_CONFIG.DEBUG.VERBOSE_LOGS && __DEV__) {
      console.log(`[Auth-${contextId.slice(-4)}] ${message}`, data || '');
    }
  }, [contextId]);

  // Memoized state update to prevent unnecessary re-renders
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

  // Handle auth response with enhanced debugging
  useEffect(() => {
    if (response) {
      console.log('🔍 [AUTH RESPONSE DEBUG] ==================')
      console.log('🔍 Response type:', response.type);
      console.log('🔍 Full response:', response);
      
      if (response.type === 'error') {
        console.log('🔍 Error details:', response.params);
        console.log('🔍 Error code:', response.params?.error);
        console.log('🔍 Error description:', response.params?.error_description);
      }
      console.log('🔍 ========================================')
      
      logDebug('Auth response received', response.type);
      
      if (response.type === 'success') {
        console.log('🎉 OAuth success! Exchanging code for token...');
        handleAuthSuccess(response.params.code);
      } else if (response.type === 'error') {
        logDebug('Auth error', response.params);
        updateState({
          error: response.params.error_description || response.params.error || 'Authentication failed',
          isLoading: false,
        });
      } else if (response.type === 'cancel') {
        console.log('🚫 User cancelled authentication');
        updateState({ 
          error: 'Authentication cancelled',
          isLoading: false,
        });
      } else if (response.type === 'dismiss') {
        // 🔧 ANDROID FIX: Handle dismiss response for Android browser issues
        console.log('🚫 Browser dismissed - Android redirect issue detected');
        updateState({ 
          error: 'Authentication window closed unexpectedly. This may be due to Android browser settings. Please try again.',
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
      console.log('🔍 [SIGN IN DEBUG] ========================');
      console.log('🔍 Starting sign in process...');
      console.log('🔍 Discovery ready:', isDiscoveryReady);
      console.log('🔍 Discovery object:', discovery);
      console.log('🔍 Request object exists:', !!request);
      console.log('🔍 Redirect URI being used:', redirectUri);
      console.log('🔍 ========================================')
      
      logDebug('Starting sign in...');
      
      if (!isDiscoveryReady) {
        const message = !discovery 
          ? 'Loading authentication service... Please wait.'
          : 'Authentication not ready. Please try again.';
        
        console.log('🔍 Discovery not ready:', message);
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
      
      console.log('🔍 About to open browser with URL:', request?.url);
      logDebug('Opening browser for authentication...');
      
      // 🐛 DEBUG: Log the exact URL that will be opened
      if (request?.url) {
        console.log('🔍 [BROWSER URL DEBUG] ====================');
        console.log('🔍 Full auth URL:', request.url);
        const url = new URL(request.url);
        console.log('🔍 URL params:');
        url.searchParams.forEach((value, key) => {
          console.log(`🔍   ${key}: ${value}`);
        });
        console.log('🔍 ========================================')
      }
      
      await promptAsync();
      
    } catch (error: any) {
      console.log('🔍 Sign in error:', error);
      logDebug('Sign in error', error);
      updateState({ 
        error: error.message || 'Sign in failed',
        isLoading: false,
      });
    }
  }, [isDiscoveryReady, discovery, promptAsync, updateState, logDebug, discoveryUrl, request, redirectUri]);

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

      console.log('🔍 [TOKEN EXCHANGE DEBUG] =================');
      console.log('🔍 Token endpoint:', discovery.tokenEndpoint);
      console.log('🔍 Token request params:', tokenRequest);
      console.log('🔍 =========================================')

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
        console.log('🔍 Token exchange failed:', { status: response.status, error: errorText });
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

      console.log('🎉 Authentication completed successfully!');
      logDebug('Authentication completed successfully!');

    } catch (error: any) {
      console.log('🔍 Token exchange error:', error);
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

  // Memoize context value to prevent unnecessary re-renders
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