// hooks/useAuth.tsx - DEBUG VERSION with detailed logging
import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as SecureStore from 'expo-secure-store';
import { makeRedirectUri, useAuthRequest, useAutoDiscovery } from 'expo-auth-session';
import { decodeJWT } from '@/utils/jwt';

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
  // Debug info
  contextId: string;
  renderCount: number;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Keycloak configuration
const KEYCLOAK_URL = 'https://idp.allsafe.world';
const REALM = 'allsafe';
const CLIENT_ID = 'june-mobile-app';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Debug: Generate unique ID for this context instance
  const contextId = useRef(`ctx_${Math.random().toString(36).substr(2, 9)}`).current;
  const renderCount = useRef(0);
  renderCount.current += 1;

  console.log(`🔧 AuthProvider render #${renderCount.current} (ID: ${contextId})`);

  const [state, setState] = useState({
    accessToken: null as string | null,
    isAuthenticated: false,
    isLoading: true,
    user: null as User | null,
    error: null as string | null,
  });

  // Auto-discover Keycloak endpoints
  const discovery = useAutoDiscovery(`${KEYCLOAK_URL}/realms/${REALM}`);

  // Create redirect URI
  const redirectUri = makeRedirectUri({
    scheme: 'june',
    path: 'auth/callback',
  });

  // Create auth request with PKCE
  const [request, response, promptAsync] = useAuthRequest(
    {
      clientId: CLIENT_ID,
      scopes: ['openid', 'profile', 'email'],
      redirectUri: redirectUri,
      responseType: 'code',
      usePKCE: true,
    },
    discovery
  );

  console.log(`🔧 Auth setup (${contextId}):`, {
    redirectUri,
    hasDiscovery: !!discovery,
    hasRequest: !!request,
    keycloakRealm: REALM,
  });

  // Debug state changes with context ID
  useEffect(() => {
    console.log(`🔍 Auth state changed (${contextId}):`, {
      isAuthenticated: state.isAuthenticated,
      isLoading: state.isLoading,
      hasUser: !!state.user,
      hasToken: !!state.accessToken,
      userEmail: state.user?.email,
      error: state.error,
      renderCount: renderCount.current,
    });
  }, [state, contextId]);

  // Load stored auth on startup - only once per context
  useEffect(() => {
    console.log(`🔄 Loading stored auth (${contextId})...`);
    loadStoredAuth();
  }, [contextId]); // Use contextId to ensure it only runs once per instance

  // Handle auth response
  useEffect(() => {
    if (response) {
      console.log(`📱 Auth response (${contextId}):`, response.type);
      
      if (response.type === 'success') {
        console.log(`✅ Auth success, processing... (${contextId})`);
        handleAuthSuccess(response.params.code);
      } else if (response.type === 'error') {
        console.error(`❌ Auth error (${contextId}):`, response.params);
        updateState({
          error: response.params.error_description || 'Authentication failed',
          isLoading: false,
        });
      } else if (response.type === 'cancel') {
        console.log(`❌ Auth cancelled (${contextId})`);
        updateState({ 
          error: 'Authentication cancelled',
          isLoading: false,
        });
      }
    }
  }, [response, contextId]);

  // Centralized state update with logging
  const updateState = (updates: Partial<typeof state>) => {
    console.log(`🔄 State update (${contextId}):`, updates);
    setState(prev => {
      const newState = { ...prev, ...updates };
      console.log(`📊 State transition (${contextId}):`, {
        from: { isAuthenticated: prev.isAuthenticated, isLoading: prev.isLoading },
        to: { isAuthenticated: newState.isAuthenticated, isLoading: newState.isLoading }
      });
      return newState;
    });
  };

  const loadStoredAuth = async () => {
    try {
      console.log(`🔄 Loading stored auth (${contextId})...`);
      
      const token = await SecureStore.getItemAsync('accessToken');
      const userData = await SecureStore.getItemAsync('userData');
      
      if (token && userData) {
        const user = JSON.parse(userData);
        
        // Validate token before using it
        const payload = decodeJWT(token);
        if (!payload || !payload.exp || payload.exp * 1000 < Date.now()) {
          console.log(`⚠️ Stored token expired, clearing... (${contextId})`);
          await clearStoredAuth();
          updateState({ isLoading: false });
          return;
        }
        
        console.log(`✅ Found valid stored auth (${contextId}):`, user.email || user.username);
        updateState({
          accessToken: token,
          isAuthenticated: true,
          user,
          isLoading: false,
        });
      } else {
        console.log(`ℹ️ No stored auth found (${contextId})`);
        updateState({ isLoading: false });
      }
    } catch (error) {
      console.error(`❌ Failed to load stored auth (${contextId}):`, error);
      await clearStoredAuth();
      updateState({ isLoading: false });
    }
  };

  const clearStoredAuth = async () => {
    try {
      console.log(`🗑️ Clearing stored auth (${contextId})`);
      await SecureStore.deleteItemAsync('accessToken');
      await SecureStore.deleteItemAsync('userData');
    } catch (error) {
      console.error(`Error clearing stored auth (${contextId}):`, error);
    }
  };

  const signIn = async () => {
    try {
      console.log(`🚀 Starting sign in (${contextId})...`);
      
      if (!request) {
        updateState({ 
          error: 'Authentication not ready. Please wait and try again.' 
        });
        return;
      }

      // Clear any existing invalid tokens first
      await clearStoredAuth();
      updateState({ 
        error: null,
        isAuthenticated: false,
        accessToken: null,
        user: null,
        isLoading: false,
      });
      
      // This opens the browser and handles PKCE automatically
      await promptAsync();
      
    } catch (error: any) {
      console.error(`❌ Sign in error (${contextId}):`, error);
      updateState({ 
        error: error.message || 'Sign in failed',
        isLoading: false,
      });
    }
  };

  const handleAuthSuccess = async (code: string) => {
    try {
      console.log(`🔄 Exchanging code for token (${contextId})...`);
      
      // Set loading state to prevent premature redirects
      updateState({ isLoading: true, error: null });
      
      if (!discovery?.tokenEndpoint) {
        throw new Error('Token endpoint not available');
      }

      if (!request?.codeVerifier) {
        throw new Error('PKCE code verifier not available');
      }

      console.log(`🔑 Using PKCE code verifier (${contextId}):`, request.codeVerifier.substring(0, 10) + '...');

      const tokenRequest = {
        grant_type: 'authorization_code',
        client_id: CLIENT_ID,
        code: code,
        redirect_uri: redirectUri,
        code_verifier: request.codeVerifier,
      };

      console.log(`🔄 Making token request (${contextId}) to:`, discovery.tokenEndpoint);

      const response = await fetch(discovery.tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(tokenRequest).toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Token exchange failed (${contextId}):`, errorText);
        throw new Error(`Token exchange failed: ${response.status} - ${errorText}`);
      }

      const tokens = await response.json();
      console.log(`✅ Token exchange successful (${contextId})`);

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

      console.log(`✅ User authenticated (${contextId}):`, user.email || user.username);

      // Store securely FIRST
      await SecureStore.setItemAsync('accessToken', tokens.access_token);
      await SecureStore.setItemAsync('userData', JSON.stringify(user));
      console.log(`💾 Tokens saved to secure storage (${contextId})`);

      // Update state
      updateState({
        accessToken: tokens.access_token,
        isAuthenticated: true,
        user: user,
        error: null,
        isLoading: false,
      });

      console.log(`🎉 Authentication completed successfully (${contextId})!`);

    } catch (error: any) {
      console.error(`❌ Token exchange error (${contextId}):`, error);
      updateState({ 
        error: error.message || 'Failed to complete authentication',
        isLoading: false,
      });
    }
  };

  const signOut = async () => {
    try {
      console.log(`🚪 Signing out (${contextId})...`);
      
      // Clear stored data
      await clearStoredAuth();
      
      // Reset state
      updateState({
        accessToken: null,
        isAuthenticated: false,
        isLoading: false,
        user: null,
        error: null,
      });

      console.log(`✅ Signed out successfully (${contextId})`);
    } catch (error) {
      console.error(`❌ Sign out error (${contextId}):`, error);
    }
  };

  const clearError = () => {
    updateState({ error: null });
  };

  const value: AuthContextValue = {
    ...state,
    signIn,
    signOut,
    clearError,
    // Debug info
    contextId,
    renderCount: renderCount.current,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  // Log every time useAuth is called
  console.log(`🎣 useAuth called - Context ID: ${context.contextId}, Render: ${context.renderCount}`);
  
  return context;
}