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
  clearError: () => void; // Added missing function
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
        
        // Check if token is still valid (not expired)
        if (payload && payload.exp && payload.exp * 1000 > Date.now()) {
          console.log('💾 [STORAGE] Valid token found, user authenticated');
          setAccessToken(token);
          setUser(user);
        } else {
          console.log('💾 [STORAGE] Token expired, clearing stored auth');
          await clearStoredAuth();
        }
      } else {
        console.log('💾 [STORAGE] No stored auth found');
      }
    } catch (error) {
      console.error('💾 [STORAGE ERROR] Failed to load stored auth:', error);
      await clearStoredAuth();
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

      console.log('🔄 [TOKEN EXCHANGE] Starting token exchange...');
      
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

      console.log('👤 [USER] Authentication successful:', { email: user.email, username: user.username });

      // Store tokens
      await SecureStore.setItemAsync('accessToken', tokens.access_token);
      await SecureStore.setItemAsync('userData', JSON.stringify(user));

      setAccessToken(tokens.access_token);
      setUser(user);
    } catch (error: any) {
      console.error('❌ [TOKEN EXCHANGE ERROR]:', error.message);
      setError(error.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const clearStoredAuth = async () => {
    try {
      await SecureStore.deleteItemAsync('accessToken');
      await SecureStore.deleteItemAsync('userData');
      console.log('💾 [STORAGE] Cleared stored auth');
    } catch (error) {
      console.error('💾 [STORAGE ERROR] Failed to clear stored auth:', error);
    }
  };

  const signIn = useCallback(async () => {
    try {
      console.log('🚀 Starting sign in process...');
      
      if (!request || !discovery) {
        setError('Authentication service not ready');
        return;
      }
      
      setError(null);
      console.log('🌐 Opening browser for authentication...');
      await promptAsync();
    } catch (error: any) {
      console.error('❌ Sign in failed:', error);
      setError(error.message || 'Sign in failed');
    }
  }, [request, discovery, promptAsync]);

  const signOut = useCallback(async () => {
    console.log('🚪 Signing out...');
    await clearStoredAuth();
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
    clearError, // Added missing function
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