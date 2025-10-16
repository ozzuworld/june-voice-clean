import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import {
  AudioSession,
  LiveKitRoom,
  registerGlobals,
  RoomOptions,
} from '@livekit/react-native';
import { VoiceAssistant } from '@/components/VoiceAssistant';
import { useConnectionDetails } from '@/hooks/useConnectionDetails';

// Register LiveKit globals
registerGlobals();

export default function HomeScreen() {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const { wsURL, token, connectionError } = useConnectionDetails();

  useEffect(() => {
    // Start audio session when component mounts
    const initAudioSession = async () => {
      try {
        await AudioSession.startAudioSession();
      } catch (error) {
        console.error('Failed to start audio session:', error);
        Alert.alert('Audio Error', 'Failed to initialize audio session');
      }
    };

    initAudioSession();

    // Cleanup audio session when component unmounts
    return () => {
      AudioSession.stopAudioSession();
    };
  }, []);

  const handleConnect = () => {
    if (connectionError) {
      Alert.alert('Connection Error', connectionError);
      return;
    }

    if (!wsURL || !token) {
      Alert.alert('Configuration Error', 'Missing LiveKit server URL or token');
      return;
    }

    setIsConnecting(true);
    setIsConnected(true);
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    setIsConnecting(false);
  };

  const roomOptions: RoomOptions = {
    adaptiveStream: { pixelDensity: 'screen' },
    dynacast: true,
    videoCaptureDefaults: {
      enabled: true,
      resolution: {
        width: 640,
        height: 480,
      },
    },
    audioCaptureDefaults: {
      enabled: true,
    },
  };

  if (isConnected && wsURL && token) {
    return (
      <LiveKitRoom
        serverUrl={wsURL}
        token={token}
        connect={true}
        options={roomOptions}
        audio={true}
        video={true}
        onDisconnected={handleDisconnect}
      >
        <VoiceAssistant onDisconnect={handleDisconnect} />
      </LiveKitRoom>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>June Voice Assistant</Text>
          <Text style={styles.subtitle}>
            Connect to start your AI voice conversation
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.connectButton,
              (isConnecting || connectionError || !wsURL || !token) &&
                styles.connectButtonDisabled,
            ]}
            onPress={handleConnect}
            disabled={isConnecting || connectionError || !wsURL || !token}
          >
            {isConnecting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.connectButtonText}>Connect to Voice AI</Text>
            )}
          </TouchableOpacity>
        </View>

        {connectionError && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{connectionError}</Text>
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Powered by LiveKit and your June AI backend
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#888888',
    textAlign: 'center',
    lineHeight: 22,
  },
  buttonContainer: {
    width: '100%',
    marginBottom: 40,
  },
  connectButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  connectButtonDisabled: {
    backgroundColor: '#333333',
    opacity: 0.6,
  },
  connectButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  errorContainer: {
    backgroundColor: '#FF3B30',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  errorText: {
    color: '#ffffff',
    fontSize: 14,
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
  },
});