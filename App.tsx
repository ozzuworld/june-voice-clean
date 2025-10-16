// App.tsx - minimal LiveKitRoom usage from official quickstart
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, Platform, PermissionsAndroid } from 'react-native';
import { LiveKitRoom, AudioSession } from '@livekit/react-native';

const SERVER_URL = 'wss://livekit.ozzu.world';

async function ensureMicPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  try {
    const res = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      { title: 'Microphone Permission', message: 'Allow microphone to join the room.', buttonPositive: 'OK' }
    );
    return res === PermissionsAndroid.RESULTS.GRANTED;
  } catch {
    return false;
  }
}

export default function App() {
  const [token, setToken] = useState('');
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Start audio session for RN per quickstart
    AudioSession.startAudioSession();
    return () => { AudioSession.stopAudioSession(); };
  }, []);

  const onConnectPress = async () => {
    if (!token.trim()) {
      Alert.alert('Missing token', 'Paste a LiveKit access token to connect.');
      return;
    }
    const ok = await ensureMicPermission();
    if (!ok) {
      Alert.alert('Permission required', 'Microphone access is required.');
      return;
    }
    setConnected(true);
  };

  if (connected) {
    return (
      <LiveKitRoom
        serverUrl={SERVER_URL}
        token={token}
        connect={true}
        audio={true}
        video={false}
        onConnected={() => console.log('connected')}
        onDisconnected={() => { console.log('disconnected'); setConnected(false); }}
        onError={(e) => { console.log('error', e); Alert.alert('LiveKit error', String(e)); setConnected(false); }}
      >
        <View style={styles.center}><Text style={styles.text}>Connected</Text></View>
      </LiveKitRoom>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>LiveKit Minimal</Text>
      <Text style={styles.label}>Paste Token</Text>
      <TextInput
        style={styles.input}
        value={token}
        onChangeText={setToken}
        placeholder="Paste JWT token from /livekit/token"
        multiline
      />
      <TouchableOpacity style={styles.button} onPress={onConnectPress}>
        <Text style={styles.buttonText}>Connect</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#0B1426', justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0B1426' },
  title: { color: '#fff', fontSize: 22, textAlign: 'center', marginBottom: 20 },
  label: { color: '#9CA3AF', marginBottom: 8 },
  input: { backgroundColor: '#1A2332', color: '#fff', minHeight: 100, borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#2D3748', marginBottom: 16 },
  button: { backgroundColor: '#4F46E5', padding: 14, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold' },
  text: { color: '#fff', fontSize: 18 },
});