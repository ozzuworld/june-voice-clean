import React, { useEffect, useState } from 'react';
import { SafeAreaView, View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { LiveKitRoom } from '@livekit/react-native';
import { AudioSession } from '@livekit/react-native';
import { LogLevel, setLogLevel } from 'livekit-client';
import { useAuth } from '@/hooks/useAuth';
import APP_CONFIG from '@/config/app.config';

async function fetchLiveKitToken(accessToken: string) {
  const url = `${APP_CONFIG.SERVICES.orchestrator}${APP_CONFIG.ENDPOINTS.SESSIONS}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      user_id: `user-${Date.now()}`,
      room_name: `voice-${Date.now()}`,
    }),
  });
  if (!response.ok) throw new Error(`Failed to get token: ${response.status}`);
  const data = await response.json();
  return { token: data.access_token, url: data.livekit_url || APP_CONFIG.SERVICES.livekit };
}

export default function ChatScreen() {
  const { isAuthenticated, accessToken } = useAuth();
  const [conn, setConn] = useState<{ url: string; token: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        setLogLevel(LogLevel.debug);
        await AudioSession.startAudioSession();
        if (!isAuthenticated || !accessToken) return;
        const { url, token } = await fetchLiveKitToken(accessToken);
        if (mounted) setConn({ url, token });
      } catch (e: any) { setErr(e?.message || 'Failed to init'); }
    };
    run();
    return () => { mounted = false; AudioSession.stopAudioSession(); };
  }, [isAuthenticated, accessToken]);

  if (err) return (
    <SafeAreaView style={styles.container}><Text style={styles.err}>Error: {err}</Text></SafeAreaView>
  );

  if (!conn) return (
    <SafeAreaView style={styles.container}>
      <ActivityIndicator size="large" color="#007AFF" />
      <Text style={styles.text}>Connecting…</Text>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={styles.container}>
      <LiveKitRoom
        serverUrl={conn.url}
        token={conn.token}
        connect
        audio
        video={false}
        options={{ adaptiveStream: { pixelDensity: 'screen' } }}
        onConnected={() => console.log('✅ LiveKitRoom connected')}
        onDisconnected={() => console.log('🔌 LiveKitRoom disconnected')}
        onError={(e) => console.log('❌ LiveKitRoom error', e)}
      >
        <View style={styles.center}><Text style={styles.text}>Connected to LiveKit</Text></View>
      </LiveKitRoom>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  text: { color: '#fff', marginTop: 12 },
  err: { color: '#ff4d4f', padding: 16 },
});
