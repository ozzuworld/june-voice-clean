// app/(tabs)/chat.tsx - Direct Room connection approach
import React, { useEffect, useState } from 'react';
import { SafeAreaView, View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Platform, PermissionsAndroid } from 'react-native';
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

  useEffect(() => {
    let mounted = true;

    const connect = async () => {
      try {
        // Enable debug logging
        setLogLevel(LogLevel.debug);
        console.log('🔧 [DEBUG] LiveKit logging enabled');

        // Request microphone permission on Android
        if (Platform.OS === 'android') {
          console.log('🎤 [PERMISSION] Requesting microphone permission...');
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
            {
              title: 'Microphone Permission',
              message: 'June Voice needs access to your microphone',
              buttonNeutral: 'Ask Me Later',
              buttonNegative: 'Cancel',
              buttonPositive: 'OK',
            }
          );
          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            throw new Error('Microphone permission denied');
          }
          console.log('✅ [PERMISSION] Microphone permission granted');
        }

        // Start audio session
        console.log('🎤 [AUDIO] Starting audio session...');
        await AudioSession.startAudioSession();
        console.log('✅ [AUDIO] Audio session started');

        // Get token from backend
        setStatus('fetching-token');
        console.log('🎫 [TOKEN] Requesting session token...');
        
        const response = await fetch(`${APP_CONFIG.SERVICES.orchestrator}/api/sessions/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: `user-${Date.now()}`,
            room_name: `room-${Date.now()}`,
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to get token: ${response.status}`);
        }

        const data = await response.json();
        console.log('✅ [TOKEN] Token received');
        console.log('🔧 [DEBUG] LiveKit URL:', data.livekit_url);
        console.log('🔧 [DEBUG] Room name:', data.room_name);

        // Setup room event listeners BEFORE connecting
        console.log('📡 [ROOM] Setting up event listeners...');
        
        room.on(RoomEvent.Connected, () => {
          console.log('✅ [ROOM] Connected!');
          if (mounted) setStatus('connected');
        });

        room.on(RoomEvent.Disconnected, (reason) => {
          console.log('🔌 [ROOM] Disconnected:', reason);
          if (mounted) setStatus('disconnected');
        });

        room.on(RoomEvent.Reconnecting, () => {
          console.log('🔄 [ROOM] Reconnecting...');
          if (mounted) setStatus('reconnecting');
        });

        room.on(RoomEvent.Reconnected, () => {
          console.log('✅ [ROOM] Reconnected!');
          if (mounted) setStatus('connected');
        });

        room.on(RoomEvent.ParticipantConnected, (participant) => {
          console.log('👤 [ROOM] Participant joined:', participant.identity);
          if (mounted) setParticipantCount(room.numParticipants);
        });

        room.on(RoomEvent.ParticipantDisconnected, (participant) => {
          console.log('👤 [ROOM] Participant left:', participant.identity);
          if (mounted) setParticipantCount(room.numParticipants);
        });

        room.on(RoomEvent.ConnectionStateChanged, (state) => {
          console.log('🔗 [ROOM] Connection state:', state);
        });

        room.on(RoomEvent.SignalConnected, () => {
          console.log('📶 [ROOM] Signal connected');
        });

        // Add ICE connection state logging
        room.on(RoomEvent.ConnectionQualityChanged, (quality, participant) => {
          console.log('📊 [ROOM] Connection quality:', quality, participant?.identity);
        });

        room.on(RoomEvent.MediaDevicesChanged, () => {
          console.log('🎧 [ROOM] Media devices changed');
        });

        room.on(RoomEvent.MediaDevicesError, (error) => {
          console.error('❌ [ROOM] Media devices error:', error);
        });

        // Now connect to the room
        console.log('🚀 [ROOM] Connecting to LiveKit...');
        console.log('🔧 [DEBUG] Using autoSubscribe: true');
        console.log('🔧 [DEBUG] Full connection details:', {
          url: data.livekit_url,
          roomName: data.room_name,
          hasToken: !!data.access_token,
          tokenPreview: data.access_token.substring(0, 30) + '...',
        });
        setStatus('connecting');

        // Test WebSocket connection first
        console.log('🧪 [TEST] Testing raw WebSocket connection...');
        try {
          const testWs = new WebSocket(data.livekit_url);
          testWs.onopen = () => {
            console.log('✅ [TEST] WebSocket opened successfully!');
            testWs.close();
          };
          testWs.onerror = (error) => {
            console.error('❌ [TEST] WebSocket error:', error);
          };
          testWs.onclose = (event) => {
            console.log('🔌 [TEST] WebSocket closed:', event.code, event.reason);
          };
        } catch (wsError) {
          console.error('❌ [TEST] WebSocket test failed:', wsError);
        }

        // Wait a bit for the test
        await new Promise(resolve => setTimeout(resolve, 2000));
        console.log('🔧 [DEBUG] Proceeding with LiveKit connection...');
        
        // Create a timeout promise
        const connectPromise = room.connect(data.livekit_url, data.access_token, {
          autoSubscribe: true,
          rtcConfig: {
            iceServers: [
              // Use public STUN servers as fallback
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' },
              // Your STUN server
              { urls: 'stun:34.59.53.188:3478' },
              // Your TURN server
              {
                urls: 'turn:34.59.53.188:3478',
                username: 'june-user',
                credential: 'Pokemon123!',
              },
              // Try both UDP and TCP
              {
                urls: 'turn:34.59.53.188:3478?transport=tcp',
                username: 'june-user',
                credential: 'Pokemon123!',
              },
            ],
            iceTransportPolicy: 'all', // Try all ICE candidates
            bundlePolicy: 'max-bundle',
            rtcpMuxPolicy: 'require',
          },
        });

        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Connection timeout after 30 seconds')), 30000);
        });

        await Promise.race([connectPromise, timeoutPromise]);

        console.log('✅ [ROOM] Connect method completed');
        
        if (mounted) {
          setParticipantCount(room.numParticipants);
        }

      } catch (e: any) {
        console.error('❌ [ERROR]:', e);
        console.error('❌ [ERROR] Stack:', e.stack);
        
        // Provide more helpful error messages
        let errorMessage = e.message || 'Connection failed';
        if (errorMessage.includes('timeout')) {
          errorMessage = 'Connection timed out. Please check:\n• Network connectivity\n• Firewall settings\n• TURN/STUN server availability';
        }
        
        if (mounted) {
          setError(errorMessage);
          setStatus('error');
        }
      }
    };

    connect();

    return () => {
      mounted = false;
      console.log('🧹 [CLEANUP] Disconnecting...');
      room.disconnect();
      AudioSession.stopAudioSession();
    };
  }, [room]);

  const toggleMic = async () => {
    try {
      const newState = !isMicEnabled;
      await room.localParticipant.setMicrophoneEnabled(newState);
      setIsMicEnabled(newState);
      console.log('🎤 [MIC]', newState ? 'Enabled' : 'Disabled');
    } catch (e: any) {
      console.error('❌ [MIC ERROR]:', e);
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'connected': return '#4CAF50';
      case 'connecting': case 'reconnecting': return '#FF9800';
      case 'error': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'initializing': return 'Initializing...';
      case 'fetching-token': return 'Getting token...';
      case 'connecting': return 'Connecting to LiveKit...';
      case 'connected': return 'Connected';
      case 'reconnecting': return 'Reconnecting...';
      case 'disconnected': return 'Disconnected';
      case 'error': return 'Error';
      default: return status;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>🎤 June Voice</Text>

        {/* Status */}
        <View style={styles.statusCard}>
          <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
          <Text style={styles.statusText}>{getStatusText()}</Text>
        </View>

        {/* Error */}
        {error && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>❌ {error}</Text>
          </View>
        )}

        {/* Room Info */}
        {status === 'connected' && (
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Room Information</Text>
            <Text style={styles.infoText}>
              Room: {room.name}
            </Text>
            <Text style={styles.infoText}>
              Participants: {participantCount}
            </Text>
            <Text style={styles.infoText}>
              State: {room.state}
            </Text>
          </View>
        )}

        {/* Mic Control */}
        {status === 'connected' && (
          <TouchableOpacity
            style={[styles.micButton, isMicEnabled && styles.micButtonActive]}
            onPress={toggleMic}
          >
            <Text style={styles.micButtonText}>
              {isMicEnabled ? '🎤 Mute' : '🔇 Unmute'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Loading indicator */}
        {(status === 'connecting' || status === 'fetching-token' || status === 'initializing') && (
          <ActivityIndicator size="large" color="#4A9EFF" style={styles.loader} />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 40,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  errorCard: {
    backgroundColor: '#ff4d4f',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  errorText: {
    color: '#fff',
    fontSize: 14,
  },
  infoCard: {
    backgroundColor: '#1a1a1a',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  infoTitle: {
    color: '#4A9EFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  infoText: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 6,
  },
  micButton: {
    backgroundColor: '#333',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  micButtonActive: {
    backgroundColor: '#4A9EFF',
  },
  micButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loader: {
    marginTop: 20,
  },
});