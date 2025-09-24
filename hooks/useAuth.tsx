// hooks/useAuth.min.tsx — super small Keycloak auth for Expo (Code+PKCE)
// Works in Expo Go (proxy) or Dev Client (custom scheme) by flipping USE_PROXY.
import * as React from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import * as SecureStore from 'expo-secure-store';
import APP_CONFIG from '@/config/app.config';

WebBrowser.maybeCompleteAuthSession();

const USE_PROXY = true; // Expo Go: true  | Dev Client: false
const REDIRECT = AuthSession.makeRedirectUri({
  scheme: APP_CONFIG.REDIRECT_SCHEME,
  path: 'auth/callback',
  useProxy: USE_PROXY,
});

export type AuthContextValue = {
  accessToken: string | null;
  isAuthenticated: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = React.createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [accessToken, setAccessToken] = React.useState<string | null>(null);
  const issuer = `${APP_CONFIG.KEYCLOAK_URL}/realms/${APP_CONFIG.KEYCLOAK.REALM}`;
  const [discovery, setDiscovery] = React.useState<AuthSession.DiscoveryDocument | null>(null);

  React.useEffect(() => {
    (async () => {
      setDiscovery(await AuthSession.fetchDiscoveryAsync(issuer));
      const existing = await SecureStore.getItemAsync('access');
      if (existing) setAccessToken(existing);
    })();
  }, [issuer]);

  const signIn = React.useCallback(async () => {
    if (!discovery) throw new Error('discovery not loaded');

    const request = new AuthSession.AuthRequest({
      clientId: APP_CONFIG.KEYCLOAK.CLIENT_ID,
      redirectUri: REDIRECT,
      responseType: AuthSession.ResponseType.Code,
      scopes: ['openid', 'profile'], // keep it tiny for now
    });

    const result = await request.promptAsync(discovery, { useProxy: USE_PROXY });
    if (result.type !== 'success' || !result.params.code) return;

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: APP_CONFIG.KEYCLOAK.CLIENT_ID,
      code: result.params.code,
      redirect_uri: REDIRECT,
    });

    const res = await fetch(discovery.tokenEndpoint!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    if (!res.ok) throw new Error(`token exchange failed: ${res.status}`);
    const json = await res.json();

    const token = json.access_token as string;
    setAccessToken(token);
    await SecureStore.setItemAsync('access', token);
  }, [discovery]);

  const signOut = React.useCallback(async () => {
    setAccessToken(null);
    await SecureStore.deleteItemAsync('access');
  }, []);

  return (
    <Ctx.Provider value={{ accessToken, isAuthenticated: !!accessToken, signIn, signOut }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const v = React.useContext(Ctx);
  if (!v) throw new Error('useAuth must be used inside <AuthProvider>');
  return v;
}

// Keycloak server setup to match this:
// - Client: public, Standard Flow ON
// - Valid Redirect URIs: if USE_PROXY=true, paste the printed exp://.../--/auth/callback
//                        if USE_PROXY=false, add june://auth/callback
