// hooks/useAuth.tsx - PRODUCTION VERSION (Clean, no debug logs)
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
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Keycloak configuration
const KEYCLOAK_URL = 'https://idp.allsafe.world';
const REALM = 'allsafe';
const CLIENT_ID = 'june-mobile-app';

export function AuthProvider({ children }: { children: React.ReactNode }) {
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

  const [request, response, promptAsync] = useAuthRequest(
    {
      clientId: CLIENT_ID,
      scopes: ['openid', 'profile', 'email', 'orchestrator-aud'],
      redirectUri: redirectUri,
      responseType: 'code',
      usePKCE: true,
    },
    discovery
  );

  // Load stored auth on startup
  useEffect(() => {
    loadStoredAuth();
  }, []);

  // Handle auth response
  useEffect(() => {
    if (response) {
      if (response.type === 'success') {
        handleAuthSuccess(response.params.code);
      } else if (response.type === 'error') {
        console.error('Auth error:', response.params);
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
  }, [response]);

  const updateState = (updates: Partial<typeof state>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  const loadStoredAuth = async () => {
    try {
      const token = await SecureStore.getItemAsync('accessToken');
      const userData = await SecureStore.getItemAsync('userData');
      
      if (token && userData) {
        const user = JSON.parse(userData);
        
        // Validate token before using it
        const payload = decodeJWT(token);
        if (!payload || !payload.exp || payload.exp * 1000 < Date.now()) {
          await clearStoredAuth();
          updateState({ isLoading: false });
          return;
        }
        
        updateState({
          accessToken: token,
          isAuthenticated: true,
          user,
          isLoading: false,
        });
      } else {
        updateState({ isLoading: false });
      }
    } catch (error) {
      console.error('Failed to load stored auth:', error);
      await clearStoredAuth();
      updateState({ isLoading: false });
    }
  };

  const clearStoredAuth = async () => {
    try {
      await SecureStore.deleteItemAsync('accessToken');
      await SecureStore.deleteItemAsync('userData');
    } catch (error) {
      console.error('Error clearing stored auth:', error);
    }
  };

  const signIn = async () => {
    try {
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
      console.error('Sign in error:', error);
      updateState({ 
        error: error.message || 'Sign in failed',
        isLoading: false,
      });
    }
  };

  const handleAuthSuccess = async (code: string) => {
    try {
      // Set loading state to prevent premature redirects
      updateState({ isLoading: true, error: null });
      
      if (!discovery?.tokenEndpoint) {
        throw new Error('Token endpoint not available');
      }

      if (!request?.codeVerifier) {
        throw new Error('PKCE code verifier not available');
      }

      const tokenRequest = {
        grant_type: 'authorization_code',
        client_id: CLIENT_ID,
        code: code,
        redirect_uri: redirectUri,
        code_verifier: request.codeVerifier,
      };

      const response = await fetch(discovery.tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(tokenRequest).toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Token exchange failed:', errorText);
        throw new Error(`Token exchange failed: ${response.status}`);
      }

      const tokens = await response.json();

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

      // Store securely
      await SecureStore.setItemAsync('accessToken', tokens.access_token);
      await SecureStore.setItemAsync('userData', JSON.stringify(user));

      // Update state
      updateState({
        accessToken: tokens.access_token,
        isAuthenticated: true,
        user: user,
        error: null,
        isLoading: false,
      });

    } catch (error: any) {
      console.error('Token exchange error:', error);
      updateState({ 
        error: error.message || 'Failed to complete authentication',
        isLoading: false,
      });
    }
  };

  const signOut = async () => {
    try {
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
    } catch (error) {
      console.error('Sign out error:', error);
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
  return context;
}