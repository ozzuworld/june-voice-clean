import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LiveKitRoom } from '@livekit/react-native';
import RoomView from './components/RoomView';
import { generateToken } from './utils/tokenGenerator';

const DEFAULT_SERVER_URL = process.env.EXPO_PUBLIC_LIVEKIT_URL || '';

export default function JuneVoiceApp() {
  const [serverUrl, setServerUrl] = useState(DEFAULT_SERVER_URL);
  const [token, setToken] = useState('');
  const [roomName, setRoomName] = useState('june-voice-room');
  const [participantName, setParticipantName] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Generate a random participant name if none provided
    if (!participantName) {
      const randomId = Math.random().toString(36).substring(2, 15);
      setParticipantName(`user-${randomId}`);
    }
  }, [participantName]);

  const handleConnect = async () => {
    if (!serverUrl) {
      Alert.alert('Error', 'Please enter a server URL');
      return;
    }

    if (!roomName) {
      Alert.alert('Error', 'Please enter a room name');
      return;
    }

    if (!participantName) {
      Alert.alert('Error', 'Please enter a participant name');
      return;
    }

    setIsConnecting(true);

    try {
      // Generate token for the participant
      const generatedToken = await generateToken(roomName, participantName);
      setToken(generatedToken);
      setIsConnected(true);
    } catch (error) {
      console.error('Failed to connect:', error);
      Alert.alert('Connection Failed', error.message || 'Failed to connect to room');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    setToken('');
  };

  if (isConnected && token) {
    return (
      <LiveKitRoom
        serverUrl={serverUrl}
        token={token}
        connect={true}
        options={{
          adaptiveStream: { pixelDensity: 'screen' },
        }}
        audio={true}
        video={false} // Start with audio-only for voice assistant
        onConnected={() => console.log('Connected to room')}
        onDisconnected={(reason) => {
          console.log('Disconnected from room:', reason);
          handleDisconnect();
        }}
        onError={(error) => {
          console.error('Room error:', error);
          Alert.alert('Room Error', error.message);
          handleDisconnect();
        }}
      >
        <RoomView onDisconnect={handleDisconnect} />
      </LiveKitRoom>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>June Voice Assistant</Text>
          <Text style={styles.subtitle}>Connect to start your voice conversation</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Server URL</Text>
            <TextInput
              style={styles.input}
              value={serverUrl}
              onChangeText={setServerUrl}
              placeholder="wss://your-livekit-server"
              placeholderTextColor="#666"
              autoCapitalize="none"
              keyboardType="url"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Room Name</Text>
            <TextInput
              style={styles.input}
              value={roomName}
              onChangeText={setRoomName}
              placeholder="Enter room name"
              placeholderTextColor="#666"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Your Name</Text>
            <TextInput
              style={styles.input}
              value={participantName}
              onChangeText={setParticipantName}
              placeholder="Enter your name"
              placeholderTextColor="#666"
            />
          </View>

          <TouchableOpacity
            style={[styles.connectButton, isConnecting && styles.connectButtonDisabled]}
            onPress={handleConnect}
            disabled={isConnecting}
          >
            <Text style={styles.connectButtonText}>
              {isConnecting ? 'Connecting...' : 'Connect to Room'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Make sure your LiveKit server is running and accessible
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B1426',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#8B9DC3',
    textAlign: 'center',
    lineHeight: 22,
  },
  form: {
    gap: 24,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  input: {
    backgroundColor: '#1A2332',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#2D3748',
  },
  connectButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginTop: 16,
  },
  connectButtonDisabled: {
    backgroundColor: '#4A5568',
  },
  connectButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  footer: {
    marginTop: 48,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#8B9DC3',
    textAlign: 'center',
    lineHeight: 20,
  },
});