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
} from 'react-native';
import { LiveKitRoom, AudioSession } from '@livekit/react-native';
import { backendApi } from '../services/backendApi';
import { RoomView } from './RoomView';

interface LiveKitConnectionProps {
  // Add any props if needed
}

export const LiveKitConnection: React.FC<LiveKitConnectionProps> = () => {
  const [roomName, setRoomName] = useState('default-room');
  const [userId, setUserId] = useState('user123');
  const [participantName, setParticipantName] = useState('Participant');
  const [token, setToken] = useState<string | null>(null);
  const [livekitUrl, setLivekitUrl] = useState<string>('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [backendStatus, setBackendStatus] = useState<'unknown' | 'connected' | 'failed'>('unknown');

  useEffect(() => {
    // Initialize AudioSession for mobile
    const initAudio = async () => {
      try {
        await AudioSession.startAudioSession();
      } catch (error) {
        console.error('Failed to start audio session:', error);
      }
    };

    initAudio();

    // Test backend connection
    testBackendConnection();

    return () => {
      AudioSession.stopAudioSession();
    };
  }, []);

  const testBackendConnection = async () => {
    try {
      const isConnected = await backendApi.testConnection();
      setBackendStatus(isConnected ? 'connected' : 'failed');
    } catch (error) {
      setBackendStatus('failed');
      console.error('Backend connection test failed:', error);
    }
  };

  const connectToRoom = async () => {
    if (!roomName.trim() || !userId.trim() || !participantName.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setIsConnecting(true);
    
    try {
      // Option 1: Use the sessions endpoint (recommended)
      const sessionResponse = await backendApi.createSession(userId, roomName);
      
      setToken(sessionResponse.access_token);
      setLivekitUrl(sessionResponse.livekit_url);
      setIsConnected(true);
      
      console.log('Session created:', {
        sessionId: sessionResponse.session_id,
        roomName: sessionResponse.room_name,
        livekitUrl: sessionResponse.livekit_url,
      });

      // Alternative Option 2: Use direct token generation
      // const tokenResponse = await backendApi.generateLiveKitToken(roomName, participantName);
      // setToken(tokenResponse.token);
      // setLivekitUrl(tokenResponse.livekitUrl);
      // setIsConnected(true);
      
    } catch (error) {
      console.error('Connection failed:', error);
      Alert.alert(
        'Connection Failed',
        `Failed to connect to room: ${error.message}`
      );
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

  if (isConnected && token && livekitUrl) {
    return (
      <LiveKitRoom
        serverUrl={livekitUrl}
        token={token}
        connect={true}
        options={{
          // Audio-only configuration for voice assistant
          adaptiveStream: { pixelDensity: 'screen' },
        }}
        audio={true}
        video={false} // Disable video for audio-only experience
      >
        <RoomView onDisconnect={disconnect} />
      </LiveKitRoom>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>June Voice Assistant</Text>
      <Text style={styles.subtitle}>LiveKit PoC</Text>
      
      {/* Backend Status Indicator */}
      <View style={styles.statusContainer}>
        <View style={[styles.statusDot, { backgroundColor: getBackendStatusColor() }]} />
        <Text style={styles.statusText}>
          Backend: {backendStatus === 'connected' ? 'Connected' : backendStatus === 'failed' ? 'Failed' : 'Checking...'}
        </Text>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Room Name</Text>
        <TextInput
          style={styles.input}
          value={roomName}
          onChangeText={setRoomName}
          placeholder="default-room"
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>User ID</Text>
        <TextInput
          style={styles.input}
          value={userId}
          onChangeText={setUserId}
          placeholder="user123"
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Participant Name</Text>
        <TextInput
          style={styles.input}
          value={participantName}
          onChangeText={setParticipantName}
          placeholder="Participant"
        />
      </View>

      <TouchableOpacity
        style={[styles.button, isConnecting && styles.buttonDisabled]}
        onPress={connectToRoom}
        disabled={isConnecting || backendStatus === 'failed'}
      >
        {isConnecting ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.buttonText}>Connect to Room</Text>
        )}
      </TouchableOpacity>

      {backendStatus === 'failed' && (
        <TouchableOpacity
          style={[styles.button, styles.retryButton]}
          onPress={testBackendConnection}
        >
          <Text style={styles.buttonText}>Retry Backend Connection</Text>
        </TouchableOpacity>
      )}

      <View style={styles.infoContainer}>
        <Text style={styles.infoTitle}>Backend Endpoints:</Text>
        <Text style={styles.infoText}>• /api/sessions/ - Create session</Text>
        <Text style={styles.infoText}>• /livekit/token - Generate token</Text>
        <Text style={styles.infoText}>• LiveKit URL: wss://livekit.ozzu.world</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#0B1426',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#8E9BAE',
    textAlign: 'center',
    marginBottom: 30,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statusText: {
    color: '#8E9BAE',
    fontSize: 14,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1A2332',
    borderColor: '#2D3748',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#FFFFFF',
  },
  button: {
    backgroundColor: '#4F46E5',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 8,
  },
  buttonDisabled: {
    backgroundColor: '#6B7280',
  },
  retryButton: {
    backgroundColor: '#F59E0B',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoContainer: {
    marginTop: 30,
    padding: 16,
    backgroundColor: '#1A2332',
    borderRadius: 8,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 12,
    color: '#8E9BAE',
    marginBottom: 4,
  },
});