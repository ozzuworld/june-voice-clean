// hooks/useAuth.tsx - Official Expo AuthSession + Keycloak (CLEAN VERSION)
import React, { createContext, useContext, useEffect, useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as SecureStore from 'expo-secure-store';
import { makeRedirectUri, useAuthRequest, useAutoDiscovery } from 'expo-auth-session';
import { decodeJWT } from '@/utils/jwt';

// Complete the auth session
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

  // Auto-discover Keycloak endpoints (handles OIDC discovery)
  const discovery = useAutoDiscovery(`${KEYCLOAK_URL}/realms/${REALM}`);

  // Create redirect URI
  const redirectUri = makeRedirectUri({
    scheme: 'june',
    path: 'auth/callback',
  });

  // Create auth request with PKCE (this handles PKCE automatically!)
  const [request, response, promptAsync] = useAuthRequest(
    {
      clientId: CLIENT_ID,
      scopes: ['openid', 'profile', 'email'],
      redirectUri: redirectUri,
      responseType: 'code', // Authorization code flow
      usePKCE: true, // Enable PKCE - expo-auth-session handles everything!
    },
    discovery
  );

  console.log('🔧 Auth setup:', {
    redirectUri,
    hasDiscovery: !!discovery,
    hasRequest: !!request,
  });

  // Load stored auth on startup
  useEffect(() => {
    loadStoredAuth();
  }, []);

  // Handle auth response
  useEffect(() => {
    if (response) {
      console.log('📱 Auth response:', response.type);
      
      if (response.type === 'success') {
        console.log('✅ Auth success, processing...');
        handleAuthSuccess(response.params.code);
      } else if (response.type === 'error') {
        console.error('❌ Auth error:', response.params);
        setState(prev => ({
          ...prev,
          error: response.params.error_description || 'Authentication failed'
        }));
      } else if (response.type === 'cancel') {
        console.log('❌ Auth cancelled');
        setState(prev => ({ ...prev, error: 'Authentication cancelled' }));
      }
    }
  }, [response]);

  const loadStoredAuth = async () => {
    try {
      console.log('🔄 Loading stored auth...');
      
      const token = await SecureStore.getItemAsync('accessToken');
      const userData = await SecureStore.getItemAsync('userData');
      
      if (token && userData) {
        const user = JSON.parse(userData);
        console.log('✅ Found stored auth:', user.email || user.username);
        
        // TODO: Validate token expiry here
        setState(prev => ({
          ...prev,
          accessToken: token,
          isAuthenticated: true,
          user,
          isLoading: false,
        }));
      } else {
        console.log('ℹ️ No stored auth found');
        setState(prev => ({ ...prev, isLoading: false }));
      }
    } catch (error) {
      console.error('❌ Failed to load stored auth:', error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const signIn = async () => {
    try {
      console.log('🚀 Starting sign in...');
      
      if (!request) {
        setState(prev => ({ 
          ...prev, 
          error: 'Authentication not ready. Please wait and try again.' 
        }));
        return;
      }

      setState(prev => ({ ...prev, error: null }));
      
      // This opens the browser and handles everything including PKCE!
      await promptAsync();
      
    } catch (error: any) {
      console.error('❌ Sign in error:', error);
      setState(prev => ({ 
        ...prev, 
        error: error.message || 'Sign in failed' 
      }));
    }
  };

  const handleAuthSuccess = async (code: string) => {
    try {
      console.log('🔄 Exchanging code for token...');
      
      if (!discovery?.tokenEndpoint) {
        throw new Error('Token endpoint not available');
      }

      // The expo-auth-session request object has the code_verifier for us!
      const tokenRequest = {
        grant_type: 'authorization_code',
        client_id: CLIENT_ID,
        code: code,
        redirect_uri: redirectUri,
        code_verifier: request?.codeVerifier, // This is the key part!
      };

      console.log('🔄 Making token request to:', discovery.tokenEndpoint);

      const response = await fetch(discovery.tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(tokenRequest).toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Token exchange failed:', errorText);
        throw new Error(`Token exchange failed: ${response.status}`);
      }

      const tokens = await response.json();
      console.log('✅ Token exchange successful');

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

      console.log('✅ User authenticated:', user.email || user.username);

      // Store securely
      await SecureStore.setItemAsync('accessToken', tokens.access_token);
      await SecureStore.setItemAsync('userData', JSON.stringify(user));

      setState(prev => ({
        ...prev,
        accessToken: tokens.access_token,
        isAuthenticated: true,
        user: user,
        error: null,
      }));

    } catch (error: any) {
      console.error('❌ Token exchange error:', error);
      setState(prev => ({ 
        ...prev, 
        error: error.message || 'Failed to complete authentication' 
      }));
    }
  };

  const signOut = async () => {
    try {
      console.log('🚪 Signing out...');
      
      // Clear stored data
      await SecureStore.deleteItemAsync('accessToken');
      await SecureStore.deleteItemAsync('userData');
      
      // Reset state
      setState({
        accessToken: null,
        isAuthenticated: false,
        isLoading: false,
        user: null,
        error: null,
      });

      console.log('✅ Signed out successfully');
    } catch (error) {
      console.error('❌ Sign out error:', error);
    }
  };

  const clearError = () => {
    setState(prev => ({ ...prev, error: null }));
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