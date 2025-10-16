// app/(tabs)/chat.tsx - Let LiveKit server control ICE
import React, { useEffect, useState } from 'react';
import { SafeAreaView, View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Platform, PermissionsAndroid, ScrollView } from 'react-native';
import { Room, RoomEvent, setLogLevel, LogLevel } from 'livekit-client';
import { AudioSession } from '@livekit/react-native';
import APP_CONFIG from '@/config/app.config';

export default function ChatScreen() {
  const [room] = useState(() => new Room({
    adaptiveStream: true,
    dynacast: true,
  }));
  
  const [status, setStatus] = useState('initializing');
  const [error, setError] = useState<string | null>(null);
  const [participantCount, setParticipantCount] = useState(0);
  const [isMicEnabled, setIsMicEnabled] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    console.log(msg);
    setLogs(prev => [...prev.slice(-8), `${time}: ${msg}`]);
  };

  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;

    const connect = async () => {
      try {
        setLogLevel(LogLevel.debug);
        addLog('🔧 Starting...');

        // Request permission
        if (Platform.OS === 'android') {
          addLog('🎤 Requesting mic...');
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
            {
              title: 'Microphone Permission',
              message: 'June Voice needs microphone access',
              buttonNeutral: 'Ask Me Later',
              buttonNegative: 'Cancel',
              buttonPositive: 'OK',
            }
          );
          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            throw new Error('Mic permission denied');
          }
          addLog('✅ Mic granted');
        }

        // Start audio session
        await AudioSession.startAudioSession();
        addLog('✅ Audio started');

        // Get token
        setStatus('fetching-token');
        addLog('🎫 Getting token...');
        
        const response = await fetch(`${APP_CONFIG.SERVICES.orchestrator}/api/sessions/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: `user-${Date.now()}`,
            room_name: `room-${Date.now()}`,
          }),
        });

        if (!response.ok) {
          throw new Error(`Token failed: ${response.status}`);
        }

        const data = await response.json();
        addLog('✅ Token received');

        let livekitUrl = data.livekit_url || APP_CONFIG.SERVICES.livekit;
        if (livekitUrl.endsWith('/rtc')) {
          livekitUrl = livekitUrl.replace('/rtc', '');
          addLog('🔧 Fixed URL');
        }

        // Setup event listeners
        addLog('📡 Setup listeners...');
        
        room.on(RoomEvent.Connected, () => {
          addLog('✅ CONNECTED!');
          clearTimeout(timeoutId);
          if (mounted) {
            setStatus('connected');
            setParticipantCount(room.numParticipants);
            setError(null);
          }
        });

        room.on(RoomEvent.Disconnected, (reason) => {
          addLog(`🔌 Disconnected: ${reason}`);
          if (mounted) setStatus('disconnected');
        });

        room.on(RoomEvent.ConnectionStateChanged, (state) => {
          addLog(`🔗 State: ${state}`);
        });

        room.on(RoomEvent.SignalConnected, () => {
          addLog('📶 Signal OK!');
        });

        room.on(RoomEvent.ParticipantConnected, (p) => {
          addLog(`👤 ${p.identity} joined`);
          if (mounted) setParticipantCount(room.numParticipants);
        });

        // Set timeout
        timeoutId = setTimeout(() => {
          if (status === 'connecting') {
            addLog('⏱️ TIMEOUT - ICE failed');
            addLog('❌ Check network/TURN');
            setError('Connection timeout. Your device cannot reach the TURN server or LiveKit server.');
            setStatus('error');
          }
        }, 20000);

        // Connect WITHOUT overriding ICE config
        // Let the server's token provide TURN servers
        addLog('🚀 Connecting...');
        addLog('🔧 Using server ICE config');
        setStatus('connecting');

        await room.connect(livekitUrl, data.access_token, {
          autoSubscribe: true,
          // NO rtcConfig - let server handle it!
        });

        addLog('✅ Connect done');
        clearTimeout(timeoutId);

      } catch (e: any) {
        clearTimeout(timeoutId);
        addLog(`❌ ERROR: ${e.message}`);
        console.error('Full error:', e);
        
        if (mounted) {
          setError(e.message || 'Connection failed');
          setStatus('error');
        }
      }
    };

    connect();

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      addLog('🧹 Cleanup');
      room.disconnect();
      AudioSession.stopAudioSession();
    };
  }, [room]);

  const toggleMic = async () => {
    try {
      const newState = !isMicEnabled;
      await room.localParticipant.setMicrophoneEnabled(newState);
      setIsMicEnabled(newState);
      addLog(`🎤 Mic ${newState ? 'ON' : 'OFF'}`);
    } catch (e: any) {
      addLog(`❌ Mic error: ${e.message}`);
    }
  };

  const retry = () => {
    setError(null);
    setStatus('initializing');
    setLogs([]);
    // Force re-render to trigger useEffect
    room.disconnect();
  };

  const getStatusColor = () => {
    switch (status) {
      case 'connected': return '#4CAF50';
      case 'connecting': case 'reconnecting': return '#FF9800';
      case 'error': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.title}>🎤 June Voice</Text>

        {/* Status */}
        <View style={styles.card}>
          <View style={[styles.dot, { backgroundColor: getStatusColor() }]} />
          <Text style={styles.statusText}>{status}</Text>
        </View>

        {/* Error */}
        {error && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>❌ {error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={retry}>
              <Text style={styles.retryText}>🔄 Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Connected Info */}
        {status === 'connected' && (
          <View style={styles.card}>
            <Text style={styles.successText}>✅ Connected!</Text>
            <Text style={styles.infoText}>Room: {room.name}</Text>
            <Text style={styles.infoText}>Participants: {participantCount}</Text>
          </View>
        )}

        {/* Debug Logs */}
        <View style={styles.logCard}>
          <Text style={styles.logTitle}>Debug Log:</Text>
          {logs.map((log, i) => (
            <Text key={i} style={styles.logText}>{log}</Text>
          ))}
          {logs.length === 0 && (
            <Text style={styles.logText}>No logs yet...</Text>
          )}
        </View>

        {/* Mic Control */}
        {status === 'connected' && (
          <TouchableOpacity
            style={[styles.micBtn, isMicEnabled && styles.micBtnActive]}
            onPress={toggleMic}
          >
            <Text style={styles.micBtnText}>
              {isMicEnabled ? '🎤 Mute' : '🔇 Unmute'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Loading */}
        {(status === 'connecting' || status === 'fetching-token') && (
          <ActivityIndicator size="large" color="#4A9EFF" style={styles.loader} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingTop: 40,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 30,
  },
  card: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  statusText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  successText: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  infoText: {
    color: '#aaa',
    fontSize: 13,
    marginTop: 4,
  },
  errorCard: {
    backgroundColor: '#ff4d4f',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 12,
  },
  retryBtn: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  retryText: {
    color: '#ff4d4f',
    fontSize: 14,
    fontWeight: 'bold',
  },
  logCard: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    maxHeight: 200,
  },
  logTitle: {
    color: '#4A9EFF',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  logText: {
    color: '#888',
    fontSize: 10,
    fontFamily: 'monospace',
    marginBottom: 2,
  },
  micBtn: {
    backgroundColor: '#333',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  micBtnActive: {
    backgroundColor: '#4A9EFF',
  },
  micBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loader: {
    marginTop: 20,
  },
});