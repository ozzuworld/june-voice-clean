// src/components/LiveKitConnection.tsx

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { LiveKitRoom, AudioSession } from '@livekit/react-native';
import { backendApi } from '../services/backendApi';
import { RoomView } from './RoomView';
import { DebugConnect } from './DebugConnect';

interface LiveKitConnectionProps {}

const FORCED_LIVEKIT_URL = 'wss://livekit.ozzu.world';

export const LiveKitConnection: React.FC<LiveKitConnectionProps> = () => {
  const [roomName, setRoomName] = useState('default-room');
  const [userId, setUserId] = useState(`user-${Date.now()}`);
  const [participantName, setParticipantName] = useState('Participant');
  const [token, setToken] = useState<string | null>(null);
  const [livekitUrl, setLivekitUrl] = useState<string>('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [backendStatus, setBackendStatus] = useState<'unknown' | 'connected' | 'failed'>('unknown');
  const [useTokenEndpoint, setUseTokenEndpoint] = useState(false);
  const [manualTokenMode, setManualTokenMode] = useState(false);
  const [manualToken, setManualToken] = useState('');
  const [debugConnectMode, setDebugConnectMode] = useState(true); // default ON to surface errors

  useEffect(() => {
    const initAudio = async () => {
      try {
        await AudioSession.startAudioSession();
      } catch (error) {
        console.error('Failed to start audio session:', error);
      }
    };
    initAudio();
    testBackendConnection();
    return () => {
      AudioSession.stopAudioSession();
    };
  }, []);

  const testBackendConnection = async () => {
    try {
      const ok = await backendApi.testConnection();
      setBackendStatus(ok ? 'connected' : 'failed');
    } catch (error) {
      setBackendStatus('failed');
      console.error('Backend connection test failed:', error);
    }
  };

  const connectToRoom = async () => {
    if (manualTokenMode) {
      if (!manualToken.trim()) {
        Alert.alert('Error', 'Paste a token first');
        return;
      }
      setToken(manualToken.trim());
      setLivekitUrl(FORCED_LIVEKIT_URL);
      return;
    }

    if (!roomName.trim() || !userId.trim() || !participantName.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setIsConnecting(true);
    try {
      if (useTokenEndpoint) {
        console.log('Using /livekit/token endpoint');
        const tokenResponse = await backendApi.generateLiveKitToken(roomName, participantName);
        setToken(tokenResponse.token);
        setLivekitUrl(FORCED_LIVEKIT_URL);
      } else {
        console.log('Using /api/sessions endpoint');
        const sessionResponse = await backendApi.createSession(userId, roomName);
        setToken(sessionResponse.access_token);
        setLivekitUrl(FORCED_LIVEKIT_URL);
      }
    } catch (error: any) {
      console.error('Connection failed:', error);
      Alert.alert('Connection Failed', String(error?.message ?? error));
      setIsConnected(false);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    setToken(null);
    setLivekitUrl('');
    setIsConnected(false);
  };

  const getBackendStatusColor = () => {
    switch (backendStatus) {
      case 'connected': return '#4CAF50';
      case 'failed': return '#F44336';
      default: return '#FF9800';
    }
  };

  if (token && livekitUrl) {
    if (debugConnectMode) {
      return (
        <DebugConnect
          serverUrl={livekitUrl}
          token={token}
          onConnected={() => setIsConnected(true)}
          onDisconnected={() => setIsConnected(false)}
        />
      );
    }

    return (
      <LiveKitRoom
        serverUrl={livekitUrl}
        token={token}
        connect={true}
        options={{ adaptiveStream: { pixelDensity: 'screen' } }}
        audio={true}
        video={false}
        onConnected={() => {
          console.log('LiveKit onConnected');
          setIsConnected(true);
        }}
        onDisconnected={(reason) => {
          console.warn('LiveKit onDisconnected', reason);
          setIsConnected(false);
        }}
        onError={(err) => {
          console.error('LiveKit onError', err);
        }}
        onConnectionStateChanged={(state) => {
          console.log('LiveKit connection state:', state);
        }}
      >
        <View style={{ position: 'absolute', top: 8, left: 8 }}>
          <Text style={{ color: '#9CA3AF' }}>Subtree mounted</Text>
        </View>
        {isConnected ? (
          <RoomView onDisconnect={disconnect} />
        ) : (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0B1426' }}>
            <Text style={{ color: '#FFF', fontSize: 20 }}>Connecting to room…</Text>
          </View>
        )}
      </LiveKitRoom>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>June Voice Assistant</Text>
      <Text style={styles.subtitle}>LiveKit PoC</Text>

      <View style={styles.statusContainer}>
        <View style={[styles.statusDot, { backgroundColor: getBackendStatusColor() }]} />
        <Text style={styles.statusText}>
          Backend: {backendStatus === 'connected' ? 'Connected' : backendStatus === 'failed' ? 'Failed' : 'Checking...'}
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: manualTokenMode ? '#10B981' : '#374151' }]}
        onPress={() => setManualTokenMode((v) => !v)}
      >
        <Text style={styles.buttonText}>{manualTokenMode ? 'Manual Token Mode: ON' : 'Manual Token Mode: OFF'}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: debugConnectMode ? '#10B981' : '#374151' }]}
        onPress={() => setDebugConnectMode((v) => !v)}
      >
        <Text style={styles.buttonText}>{debugConnectMode ? 'Debug Connect Mode: ON' : 'Debug Connect Mode: OFF'}</Text>
      </TouchableOpacity>

      {manualTokenMode ? (
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Paste Token</Text>
          <TextInput
            style={[styles.input, { height: 120 }]}
            value={manualToken}
            onChangeText={setManualToken}
            placeholder="Paste JWT token here"
            multiline
          />
        </View>
      ) : (
        <>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Room Name</Text>
            <TextInput style={styles.input} value={roomName} onChangeText={setRoomName} placeholder="default-room" />
          </View>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>User ID</Text>
            <TextInput style={styles.input} value={userId} onChangeText={setUserId} placeholder="unique id" />
          </View>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Participant Name</Text>
            <TextInput style={styles.input} value={participantName} onChangeText={setParticipantName} placeholder="Participant" />
          </View>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: '#374151' }]}
            onPress={() => setUseTokenEndpoint((v) => !v)}
          >
            <Text style={styles.buttonText}>Switch to {useTokenEndpoint ? '/api/sessions' : '/livekit/token'}</Text>
          </TouchableOpacity>
        </>
      )}

      <TouchableOpacity style={[styles.button, isConnecting && styles.buttonDisabled]} onPress={connectToRoom} disabled={isConnecting || backendStatus === 'failed'}>
        {isConnecting ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.buttonText}>Connect to Room</Text>
        )}
      </TouchableOpacity>

      {backendStatus === 'failed' && (
        <TouchableOpacity style={[styles.button, styles.retryButton]} onPress={testBackendConnection}>
          <Text style={styles.buttonText}>Retry Backend Connection</Text>
        </TouchableOpacity>
      )}

      <View style={styles.infoContainer}>
        <Text style={styles.infoTitle}>LiveKit Server URL</Text>
        <Text style={styles.infoText}>{FORCED_LIVEKIT_URL}</Text>
        <Text style={[styles.infoTitle, { marginTop: 12 }]}>Endpoints</Text>
        <Text style={styles.infoText}>• /api/sessions/ - Create session</Text>
        <Text style={styles.infoText}>• /livekit/token - Generate token</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, backgroundColor: '#0B1426', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#FFFFFF', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#8E9BAE', textAlign: 'center', marginBottom: 30 },
  statusContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 30 },
  statusDot: { width: 12, height: 12, borderRadius: 6, marginRight: 8 },
  statusText: { color: '#8E9BAE', fontSize: 14 },
  inputContainer: { marginBottom: 20 },
  label: { fontSize: 16, color: '#FFFFFF', marginBottom: 8 },
  input: { backgroundColor: '#1A2332', borderColor: '#2D3748', borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 16, color: '#FFFFFF' },
  button: { backgroundColor: '#4F46E5', padding: 16, borderRadius: 8, alignItems: 'center', marginVertical: 8 },
  buttonDisabled: { backgroundColor: '#6B7280' },
  retryButton: { backgroundColor: '#F59E0B' },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  infoContainer: { marginTop: 30, padding: 16, backgroundColor: '#1A2332', borderRadius: 8 },
  infoTitle: { fontSize: 14, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 8 },
  infoText: { fontSize: 12, color: '#8E9BAE', marginBottom: 4 },
});