// hooks/useAuth.tsx - ENHANCED DEEP LINKING VERSION WITH COMPREHENSIVE DEBUGGING
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

// 🔍 ENHANCED: Deep link handler function with comprehensive debugging
const handleDeepLink = (url: string) => {
  console.log('🔗 [DEEP LINK DEBUG] ==================');
  console.log('🔗 Deep link received:', url);
  console.log('🔗 Timestamp:', new Date().toISOString());
  console.log('🔗 URL breakdown:');
  
  try {
    const parsedUrl = new URL(url);
    console.log('🔗   Protocol:', parsedUrl.protocol);
    console.log('🔗   Host:', parsedUrl.host);
    console.log('🔗   Pathname:', parsedUrl.pathname);
    console.log('🔗   Search params:', parsedUrl.search);
    
    // Check if this is an auth callback
    if (url.includes('june://auth/callback') || url.includes('june:') && url.includes('code=')) {
      console.log('✅ OAuth callback detected!');
      console.log('🔗 This should trigger the auth response handler...');
    } else {
      console.log('ℹ️ Non-OAuth deep link');
    }
  } catch (error) {
    console.log('🔗 Error parsing URL:', error);
  }
  
  console.log('🔗 ======================================');
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

  // 🔍 ENHANCED: Deep link listener with comprehensive debugging
  useEffect(() => {
    console.log('🔗 [DEEP LINK SETUP] Setting up listeners...');
    console.log('🔗 Context ID:', contextId);
    
    const subscription = Linking.addEventListener('url', (event) => {
      console.log('🔗 [DEEP LINK EVENT] Received URL event:', event);
      handleDeepLink(event.url);
    });
    
    // Check if app was opened with a deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        console.log('🔗 [INITIAL URL] App opened with URL:', url);
        handleDeepLink(url);
      } else {
        console.log('🔗 [INITIAL URL] No initial URL detected');
      }
    }).catch((error) => {
      console.log('🔗 [INITIAL URL ERROR]:', error);
    });

    return () => {
      console.log('🔗 [DEEP LINK CLEANUP] Removing listeners...');
      subscription?.remove();
    };
  }, [contextId]);

  // Optimize logging for development only
  const logDebug = useCallback((message: string, data?: any) => {
    if (APP_CONFIG.DEBUG.VERBOSE_LOGS && __DEV__) {
      console.log(`[Auth-${contextId.slice(-4)}] ${message}`, data || '');
    }
  }, [contextId]);

  // 🔍 ENHANCED: Memoized state update with detailed logging
  const updateState = useCallback((updates: Partial<typeof state>) => {
    setState(prev => {
      const newState = { ...prev, ...updates };
      
      // 🔍 DETAILED STATE CHANGE LOGGING
      console.log('🔄 [STATE UPDATE DEBUG] ================');
      console.log('🔄 Previous state:', {
        isAuthenticated: prev.isAuthenticated,
        isLoading: prev.isLoading,
        hasToken: !!prev.accessToken,
        hasUser: !!prev.user,
        error: prev.error
      });
      console.log('🔄 Updates applied:', updates);
      console.log('🔄 New state:', {
        isAuthenticated: newState.isAuthenticated,
        isLoading: newState.isLoading,
        hasToken: !!newState.accessToken,
        hasUser: !!newState.user,
        error: newState.error
      });
      console.log('🔄 ======================================');
      
      logDebug('State update', { from: prev, to: newState });
      return newState;
    });
  }, [logDebug]);

  // Load stored auth on startup
  useEffect(() => {
    loadStoredAuth();
  }, []);

  // 🔍 ENHANCED: Handle auth response with comprehensive debugging
  useEffect(() => {
    if (response) {
      console.log('🔍 [AUTH RESPONSE DEBUG] ==================')
      console.log('🔍 Response type:', response.type);
      console.log('🔍 Response received at:', new Date().toISOString());
      console.log('🔍 Full response object:', response);
      
      if (response.type === 'error') {
        console.log('🔍 Error details:', response.params);
        console.log('🔍 Error code:', response.params?.error);
        console.log('🔍 Error description:', response.params?.error_description);
      } else if (response.type === 'success') {
        console.log('🔍 Success params:', response.params);
        console.log('🔍 Authorization code received:', response.params?.code ? 'YES' : 'NO');
        console.log('🔍 State parameter:', response.params?.state);
      }
      console.log('🔍 ========================================')
      
      logDebug('Auth response received', response.type);
      
      if (response.type === 'success') {
        console.log('🎉 [SUCCESS] OAuth success! Proceeding to token exchange...');
        handleAuthSuccess(response.params.code);
      } else if (response.type === 'error') {
        console.log('❌ [ERROR] Auth error received');
        logDebug('Auth error', response.params);
        updateState({
          error: response.params.error_description || response.params.error || 'Authentication failed',
          isLoading: false,
        });
      } else if (response.type === 'cancel') {
        console.log('🚫 [CANCEL] User cancelled authentication');
        updateState({ 
          error: 'Authentication cancelled',
          isLoading: false,
        });
      } else if (response.type === 'dismiss') {
        console.log('🚫 [DISMISS] Browser dismissed - Android redirect issue detected');
        updateState({ 
          error: 'Authentication window closed unexpectedly. This may be due to Android browser settings. Please try again.',
          isLoading: false,
        });
      } else {
        console.log('❓ [UNKNOWN] Unknown response type:', response.type);
      }
    }
  }, [response, updateState, logDebug]);

  const loadStoredAuth = async () => {
    try {
      console.log('💾 [STORAGE] Loading stored auth...');
      
      const token = await SecureStore.getItemAsync('accessToken');
      const userData = await SecureStore.getItemAsync('userData');
      
      if (token && userData) {
        console.log('💾 [STORAGE] Found stored credentials');
        const user = JSON.parse(userData);
        
        // Validate token
        const payload = decodeJWT(token);
        if (!payload || !payload.exp || payload.exp * 1000 < Date.now()) {
          console.log('💾 [STORAGE] Stored token expired, clearing...');
          await clearStoredAuth();
          updateState({ isLoading: false });
          return;
        }
        
        console.log('💾 [STORAGE] Valid stored auth found:', { email: user.email });
        updateState({
          accessToken: token,
          isAuthenticated: true,
          user,
          isLoading: false,
        });
      } else {
        console.log('💾 [STORAGE] No stored auth found');
        updateState({ isLoading: false });
      }
    } catch (error) {
      console.log('💾 [STORAGE ERROR] Failed to load stored auth:', error);
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
      console.log('💾 [STORAGE] Stored auth cleared');
    } catch (error) {
      console.log('💾 [STORAGE ERROR] Error clearing stored auth:', error);
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
      
      console.log('🚀 [BROWSER] About to call promptAsync()...');
      const result = await promptAsync();
      console.log('🚀 [BROWSER] promptAsync() completed with result:', result);
      
    } catch (error: any) {
      console.log('🔍 [SIGN IN ERROR]:', error);
      logDebug('Sign in error', error);
      updateState({ 
        error: error.message || 'Sign in failed',
        isLoading: false,
      });
    }
  }, [isDiscoveryReady, discovery, promptAsync, updateState, logDebug, discoveryUrl, request, redirectUri]);

  const handleAuthSuccess = async (code: string) => {
    try {
      console.log('🔄 [TOKEN EXCHANGE] Starting token exchange...');
      console.log('🔄 Authorization code received:', code ? 'YES (length: ' + code.length + ')' : 'NO');
      
      updateState({ isLoading: true, error: null });
      
      if (!discovery?.tokenEndpoint || !request?.codeVerifier) {
        const error = !discovery?.tokenEndpoint ? 'Token endpoint not available' : 'Code verifier not available';
        console.log('🔄 [TOKEN EXCHANGE ERROR]:', error);
        throw new Error('Authentication configuration not ready: ' + error);
      }

      const tokenRequest = {
        grant_type: 'authorization_code',
        client_id: clientId,
        code: code,
        redirect_uri: redirectUri,
        code_verifier: request.codeVerifier,
      };

      console.log('🔄 [TOKEN EXCHANGE DEBUG] =================');
      console.log('🔄 Token endpoint:', discovery.tokenEndpoint);
      console.log('🔄 Token request params:', {
        ...tokenRequest,
        code: code ? `${code.substring(0, 10)}...` : 'missing',
        code_verifier: request.codeVerifier ? `${request.codeVerifier.substring(0, 10)}...` : 'missing'
      });
      console.log('🔄 Making token request...');

      const response = await fetch(discovery.tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(tokenRequest).toString(),
      });

      console.log('🔄 Token response status:', response.status);
      console.log('🔄 Token response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.log('🔄 [TOKEN EXCHANGE FAILED]:', { status: response.status, error: errorText });
        throw new Error(`Token exchange failed: ${response.status} - ${errorText}`);
      }

      const tokens = await response.json();
      console.log('🔄 [TOKEN EXCHANGE SUCCESS] Received tokens:', {
        access_token: tokens.access_token ? 'present' : 'missing',
        token_type: tokens.token_type,
        expires_in: tokens.expires_in
      });

      // Decode JWT to get user info
      const payload = decodeJWT(tokens.access_token);
      if (!payload) {
        console.log('🔄 [JWT ERROR] Failed to decode access token');
        throw new Error('Failed to decode access token');
      }

      const user: User = {
        id: payload.sub,
        name: payload.name,
        email: payload.email,
        username: payload.preferred_username,
      };

      console.log('👤 [USER INFO] User authenticated:', { 
        id: user.id, 
        email: user.email, 
        username: user.username 
      });

      // Store securely
      console.log('💾 [STORAGE] Storing tokens and user data...');
      await Promise.all([
        SecureStore.setItemAsync('accessToken', tokens.access_token),
        SecureStore.setItemAsync('userData', JSON.stringify(user))
      ]);
      console.log('💾 [STORAGE] Storage completed successfully');

      console.log('🎯 [FINAL STATE UPDATE] Setting authenticated state...');
      updateState({
        accessToken: tokens.access_token,
        isAuthenticated: true,
        user: user,
        error: null,
        isLoading: false,
      });

      console.log('🎉 [COMPLETE] Authentication completed successfully!');

    } catch (error: any) {
      console.log('❌ [TOKEN EXCHANGE ERROR]:', error);
      console.log('❌ Error details:', {
        message: error.message,
        stack: error.stack
      });
      updateState({ 
        error: error.message || 'Failed to complete authentication',
        isLoading: false,
      });
    }
  };

  const signOut = useCallback(async () => {
    try {
      console.log('🚪 [SIGN OUT] Starting sign out process...');
      
      await clearStoredAuth();
      
      updateState({
        accessToken: null,
        isAuthenticated: false,
        isLoading: false,
        user: null,
        error: null,
      });

      console.log('🚪 [SIGN OUT] Signed out successfully');
    } catch (error) {
      console.log('🚪 [SIGN OUT ERROR]:', error);
    }
  }, [updateState]);

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