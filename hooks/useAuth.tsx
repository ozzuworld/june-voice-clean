// hooks/useAuth.tsx - Simplified version without token storage
import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAuthRequest, useAutoDiscovery } from 'expo-auth-session';
import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { decodeJWT } from '@/utils/jwt';
import APP_CONFIG from '@/config/app.config';

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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const discovery = useAutoDiscovery(
    `${APP_CONFIG.KEYCLOAK_URL}/realms/${APP_CONFIG.KEYCLOAK.REALM}`
  );
  
  const redirectUri = makeRedirectUri({ 
    scheme: 'june', 
    path: 'auth/callback' 
  });

  console.log('🔐 [AUTH] Redirect URI:', redirectUri);

  const [request, response, promptAsync] = useAuthRequest(
    {
      clientId: APP_CONFIG.KEYCLOAK.CLIENT_ID,
      scopes: ['openid', 'profile', 'email'],
      redirectUri,
      responseType: 'code',
      usePKCE: true,
    },
    discovery
  );

  // Handle auth response - no storage, just set state
  React.useEffect(() => {
    if (response?.type === 'success' && response.params.code) {
      exchangeCodeForToken(response.params.code);
    } else if (response?.type === 'error') {
      console.error('🔐 [AUTH ERROR]:', response.params);
      setError(response.params.error_description || 'Authentication failed');
      setIsLoading(false);
    }
  }, [response]);

  const exchangeCodeForToken = async (code: string) => {
    try {
      setIsLoading(true);
      setError(null);

      if (!discovery?.tokenEndpoint || !request?.codeVerifier) {
        throw new Error('Authentication not ready');
      }

      console.log('🔄 [TOKEN] Exchanging code for token...');

      const tokenRequest = {
        grant_type: 'authorization_code',
        client_id: APP_CONFIG.KEYCLOAK.CLIENT_ID,
        code,
        redirect_uri: redirectUri,
        code_verifier: request.codeVerifier,
      };

      const response = await fetch(discovery.tokenEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(tokenRequest).toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Token exchange failed: ${errorText}`);
      }

      const tokens = await response.json();
      const payload = decodeJWT(tokens.access_token);

      if (!payload) {
        throw new Error('Invalid token received');
      }

      // Check if token is already expired
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        throw new Error('Received expired token');
      }

      const user: User = {
        id: payload.sub,
        name: payload.name,
        email: payload.email,
        username: payload.preferred_username,
      };

      console.log('✅ [AUTH] Success:', { 
        email: user.email, 
        expiresAt: new Date(payload.exp * 1000).toISOString() 
      });

      setAccessToken(tokens.access_token);
      setUser(user);
    } catch (error: any) {
      console.error('❌ [TOKEN ERROR]:', error.message);
      setError(error.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = useCallback(async () => {
    try {
      console.log('🚀 [AUTH] Starting sign in...');
      
      if (!request || !discovery) {
        setError('Authentication service not ready');
        return;
      }

      setError(null);
      setIsLoading(true);
      await promptAsync();
    } catch (error: any) {
      console.error('❌ [AUTH] Sign in failed:', error);
      setError(error.message || 'Sign in failed');
      setIsLoading(false);
    }
  }, [request, discovery, promptAsync]);

  const signOut = useCallback(async () => {
    console.log('🚪 [AUTH] Signing out...');
    setAccessToken(null);
    setUser(null);
    setError(null);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value: AuthContextValue = {
    accessToken,
    isAuthenticated: !!accessToken && !!user,
    isLoading,
    user,
    signIn,
    signOut,
    error,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}