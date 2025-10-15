import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuthRequest, useAutoDiscovery } from 'expo-auth-session';
import { makeRedirectUri } from 'expo-auth-session';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import { decodeJWT } from '@/utils/jwt';
import APP_CONFIG from '@/config/app.config';

// Complete auth session
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
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const discovery = useAutoDiscovery(`${APP_CONFIG.KEYCLOAK_URL}/realms/${APP_CONFIG.KEYCLOAK.REALM}`);
  const redirectUri = makeRedirectUri({ scheme: 'june', path: 'auth/callback' });

  const [request, response, promptAsync] = useAuthRequest(
    {
      clientId: APP_CONFIG.KEYCLOAK.CLIENT_ID,
      scopes: ['openid', 'profile', 'email', 'orchestrator-aud'],
      redirectUri,
      responseType: 'code',
      usePKCE: true,
    },
    discovery
  );

  // Load stored token on startup
  useEffect(() => {
    loadStoredAuth();
  }, []);

  // Handle auth response
  useEffect(() => {
    if (response?.type === 'success' && response.params.code) {
      exchangeCodeForToken(response.params.code);
    } else if (response?.type === 'error') {
      setError(response.params.error_description || 'Authentication failed');
      setIsLoading(false);
    }
  }, [response]);

  const loadStoredAuth = async () => {
    try {
      const token = await SecureStore.getItemAsync('accessToken');
      const userData = await SecureStore.getItemAsync('userData');
      
      if (token && userData) {
        const user = JSON.parse(userData);
        const payload = decodeJWT(token);
        
        if (payload && payload.exp && payload.exp * 1000 > Date.now()) {
          setAccessToken(token);
          setUser(user);
        } else {
          await clearStoredAuth();
        }
      }
    } catch (error) {
      console.error('Failed to load stored auth:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const exchangeCodeForToken = async (code: string) => {
    try {
      setIsLoading(true);
      setError(null);

      if (!discovery?.tokenEndpoint || !request?.codeVerifier) {
        throw new Error('Authentication not ready');
      }

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

      const user: User = {
        id: payload.sub,
        name: payload.name,
        email: payload.email,
        username: payload.preferred_username,
      };

      // Store tokens
      await SecureStore.setItemAsync('accessToken', tokens.access_token);
      await SecureStore.setItemAsync('userData', JSON.stringify(user));

      setAccessToken(tokens.access_token);
      setUser(user);
    } catch (error: any) {
      setError(error.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const clearStoredAuth = async () => {
    try {
      await SecureStore.deleteItemAsync('accessToken');
      await SecureStore.deleteItemAsync('userData');
    } catch (error) {
      console.error('Failed to clear stored auth:', error);
    }
  };

  const signIn = useCallback(async () => {
    if (!request || !discovery) {
      setError('Authentication service not ready');
      return;
    }
    
    setError(null);
    await promptAsync();
  }, [request, discovery, promptAsync]);

  const signOut = useCallback(async () => {
    await clearStoredAuth();
    setAccessToken(null);
    setUser(null);
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