import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LiveKitRoom, useRoom, useParticipants, useTracks, Track } from '@livekit/react-native';
import { useAuth } from '@/hooks/useAuth';
import { useLiveKitToken } from '@/hooks/useLiveKitToken';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  isVoice?: boolean;
}

function VoiceChatUI() {
  const room = useRoom();
  if (!room) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#fff' }}>Preparing room…</Text>
        </View>
      </SafeAreaView>
    );
  }

  const participants = useParticipants();

  let micSource: any = undefined;
  try {
    micSource = (Track && (Track as any).Source && (Track as any).Source.Microphone) ? (Track as any).Source.Microphone : undefined;
  } catch (e) {
    console.log('🔴 Track.Source not available:', e);
  }

  const tracks = micSource ? useTracks([micSource]) : [];

  const [isRecording, setIsRecording] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

  useEffect(() => {
    if (room?.state === 'connected') {
      setConnectionStatus('connected');
      console.log('🟢 LiveKit room connected successfully');
    } else if (room?.state === 'disconnected') {
      setConnectionStatus('disconnected');
      console.log('🔴 LiveKit room disconnected');
    } else {
      console.log('🟡 LiveKit room state:', room?.state);
    }
  }, [room?.state]);

  useEffect(() => {
    if (!room || !(room as any).on) return;

    const handleDataReceived = (payload: Uint8Array) => {
      try {
        const decoder = new TextDecoder();
        const data = JSON.parse(decoder.decode(payload));
        if (data.type === 'ai_response' && data.text) {
          addMessage(data.text, false);
        } else if (data.type === 'stt_transcript' && data.text) {
          addMessage(data.text, true, true);
        }
      } catch (error) {
        console.error('Failed to parse data message:', error);
      }
    };

    (room as any).on('dataReceived', handleDataReceived);
    return () => (room as any).off('dataReceived', handleDataReceived);
  }, [room]);

  const addMessage = (text: string, isUser: boolean, isVoice = false) => {
    const message: Message = {
      id: `msg-${Date.now()}-${Math.random()}`,
      text,
      isUser,
      timestamp: new Date(),
      isVoice,
    };
    setMessages(prev => [...prev, message]);
  };

  const toggleRecording = async () => {
    if (!room) {
      Alert.alert('Error', 'Not connected to room');
      return;
    }

    try {
      if (isRecording) {
        await room.localParticipant.setMicrophoneEnabled(false);
        setIsRecording(false);
        console.log('🔇 Microphone disabled');
      } else {
        await room.localParticipant.setMicrophoneEnabled(true);
        setIsRecording(true);
        console.log('🎤 Microphone enabled');
      }
    } catch (error: any) {
      console.error('🔴 Microphone toggle error:', error);
      Alert.alert('Error', error.message || 'Failed to toggle microphone');
    }
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <View style={[styles.messageContainer, item.isUser ? styles.userMessage : styles.aiMessage]}>
      <View style={[styles.messageBubble, { backgroundColor: item.isUser ? '#007AFF' : '#2C2C2E' }]}>
        <Text style={styles.messageText}>{item.text}</Text>
        {item.isVoice && (
          <Ionicons name="mic" size={12} color="rgba(255,255,255,0.6)" style={styles.voiceIcon} />
        )}
      </View>
      <Text style={styles.timestamp}>
        {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </Text>
    </View>
  );

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return isRecording ? '#FF3B30' : '#34C759';
      case 'connecting': return '#FF9500';
      case 'disconnected': return '#8E8E93';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return isRecording ? 'Recording...' : 'Connected';
      case 'connecting': return 'Connecting...';
      case 'disconnected': return 'Disconnected';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>June Voice AI</Text>
        <View style={styles.statusContainer}>
          <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
          <Text style={styles.statusText}>{getStatusText()}</Text>
          <Text style={styles.participantCount}>{participants.length} participants</Text>
        </View>
      </View>

      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContainer}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="chatbubbles-outline" size={48} color="#48484A" />
            <Text style={styles.emptyText}>Start talking to begin</Text>
            <Text style={styles.emptySubtext}>Press and hold the button to talk to June AI</Text>
          </View>
        }
      />

      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.voiceButton, { borderColor: getStatusColor(), backgroundColor: isRecording ? getStatusColor() + '20' : 'transparent' }]}
          onPress={toggleRecording}
          disabled={connectionStatus !== 'connected'}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isRecording ? "stop" : "mic"}
            size={32}
            color={connectionStatus === 'connected' ? getStatusColor() : '#8E8E93'}
          />
        </TouchableOpacity>
        <Text style={styles.buttonLabel}>
          {isRecording ? 'Tap to stop' : 'Tap to talk'}
        </Text>
      </View>
    </SafeAreaView>
  );
}

export default function ChatScreen() {
  const { isAuthenticated, signIn, isLoading: authLoading, error: authError } = useAuth();
  const { liveKitToken, isLoading: tokenLoading, error: tokenError, generateToken } = useLiveKitToken();
  const [lkConnected, setLkConnected] = React.useState(false);

  useEffect(() => {
    const requestMicPermission = async () => {
      if (Platform.OS === 'android') {
        try {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
            {
              title: 'Microphone Permission',
              message: 'June Voice needs access to your microphone for voice chat.',
              buttonNeutral: 'Ask Me Later',
              buttonNegative: 'Cancel',
              buttonPositive: 'OK',
            }
          );
          console.log('🎤 Microphone permission:', granted);
        } catch (err) {
          console.warn('🎤 Permission error:', err);
        }
      }
    };
    requestMicPermission();
  }, []);

  useEffect(() => {
    const run = async () => {
      try {
        if (!liveKitToken?.livekitUrl?.startsWith('wss://')) return;
        const httpsUrl = liveKitToken.livekitUrl.replace('wss://', 'https://');
        console.log('🔎 TLS preflight to:', httpsUrl);
        const res = await fetch(httpsUrl, { method: 'HEAD' });
        console.log('🔎 TLS preflight status:', res.status);
      } catch (err: any) {
        const emsg = err?.message || String(err);
        console.error('🔎 TLS preflight failed:', emsg);
      }
    };
    run();
  }, [liveKitToken?.livekitUrl]);

  useEffect(() => {
    if (isAuthenticated && !liveKitToken && !tokenLoading) {
      generateToken();
    }
  }, [isAuthenticated, liveKitToken, tokenLoading, generateToken]);

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.authContainer}>
          <Text style={styles.authTitle}>June Voice AI</Text>
          <Text style={styles.authSubtitle}>Voice chat with AI using LiveKit</Text>
          {authError && <Text style={styles.errorText}>{authError}</Text>}
          <TouchableOpacity
            style={[styles.signInButton, authLoading && styles.signInButtonDisabled]}
            onPress={signIn}
            disabled={authLoading}
          >
            {authLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.signInButtonText}>Sign In with Keycloak</Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (tokenLoading || !liveKitToken) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Connecting to June AI...</Text>
          {tokenError && (
            <View>
              <Text style={styles.errorText}>{tokenError}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={generateToken}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // Use base URL, let SDK choose signaling path
  const serverUrl = liveKitToken.livekitUrl;
  console.log('🎫 Using LiveKit server URL:', serverUrl);
  console.log('🎫 Token length:', liveKitToken.token?.length);

  return (
    <LiveKitRoom
      serverUrl={serverUrl}
      token={liveKitToken.token}
      connect={true}
      options={{
        adaptiveStream: true,
        dynacast: true,
        publishDefaults: {
          audioPresets: {
            maxBitrate: 64_000,
            priority: 'high',
          },
        },
      }}
      audio={true}
      video={false}
      onConnected={() => {
        console.log('🟢 LiveKit connected!');
        setLkConnected(true);
      }}
      onDisconnected={() => {
        console.log('🔴 LiveKit disconnected');
        setLkConnected(false);
      }}
      onError={(e: any) => {
        const msg = e?.message || String(e);
        const cause = (e?.cause && (e.cause.message || String(e.cause))) || null;
        console.error('🔴 LiveKitRoom error (connect):', { msg, cause, url: serverUrl });
        Alert.alert('LiveKit Error', `${msg}${cause ? `\nCause: ${cause}` : ''}`);
      }}
    >
      {lkConnected ? (
        <VoiceChatUI />
      ) : (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#fff' }}>Connecting to room…</Text>
        </View>
      )}
    </LiveKitRoom>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  authContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  authTitle: { fontSize: 32, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 8 },
  authSubtitle: { fontSize: 16, color: '#8E8E93', marginBottom: 32, textAlign: 'center' },
  errorText: { color: '#FF3B30', fontSize: 14, marginBottom: 16, textAlign: 'center' },
  signInButton: { backgroundColor: '#007AFF', paddingHorizontal: 32, paddingVertical: 16, borderRadius: 12 },
  signInButtonDisabled: { opacity: 0.6 },
  signInButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText: { color: '#FFFFFF', fontSize: 16, marginTop: 16 },
  retryButton: { backgroundColor: '#007AFF', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, marginTop: 16 },
  retryButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  header: { padding: 20, paddingTop: 60, borderBottomWidth: 1, borderBottomColor: '#2C2C2E' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 8 },
  statusContainer: { flexDirection: 'row', alignItems: 'center' },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  statusText: { color: '#FFFFFF', fontSize: 14, marginRight: 12 },
  participantCount: { color: '#8E8E93', fontSize: 14 },
  messagesList: { flex: 1 },
  messagesContainer: { padding: 16, flexGrow: 1 },
  messageContainer: { marginBottom: 16, maxWidth: '85%' },
  userMessage: { alignSelf: 'flex-end' },
  aiMessage: { alignSelf: 'flex-start' },
  messageBubble: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 18, marginBottom: 4, flexDirection: 'row', alignItems: 'center' },
  messageText: { fontSize: 16, lineHeight: 20, color: '#FFFFFF', flex: 1 },
  voiceIcon: { marginLeft: 8 },
  timestamp: { fontSize: 11, color: '#8E8E93', textAlign: 'center' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 18, color: '#FFFFFF', marginTop: 16, marginBottom: 8 },
  emptySubtext: { fontSize: 14, color: '#8E8E93', textAlign: 'center' },
  controls: { padding: 20, alignItems: 'center' },
  voiceButton: { width: 80, height: 80, borderRadius: 40, borderWidth: 3, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  buttonLabel: { color: '#8E8E93', fontSize: 14 },
});
