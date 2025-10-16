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

interface DebugInfo {
  connectionState: string;
  connectionQuality: string;
  participantCount: number;
  tracksCount: number;
  lastError: string | null;
  reconnectAttempts: number;
  signalConnected: boolean;
  canPublish: boolean;
  canSubscribe: boolean;
}

// Helper components defined at top-level without hooks
function ForceConnectButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.retryButton} onPress={onPress}>
      <Text style={styles.retryButtonText}>Force Connect</Text>
    </TouchableOpacity>
  );
}

function DirectConnectTestButton({ serverUrl, token }: { serverUrl: string; token: string }) {
  const onPress = async () => {
    try {
      console.log('🐛 [TRACE] direct connect test start');
      const { Room } = await import('livekit-client');
      const r = new Room();
      await r.connect(serverUrl, token);
      console.log('🟢 [SUCCESS] direct connect ok');
      await r.disconnect();
    } catch (e: any) {
      console.log('🚨 [ERROR] direct connect failed:', e?.message || String(e));
    }
  };
  return (
    <TouchableOpacity style={[styles.retryButton, { marginTop: 8 }]} onPress={onPress}>
      <Text style={styles.retryButtonText}>Direct Connect Test</Text>
    </TouchableOpacity>
  );
}

function VoiceChatUI() {
  const room = useRoom();
  if (!room) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#fff' }}>🔄 Preparing room…</Text>
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
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({
    connectionState: 'unknown',
    connectionQuality: 'unknown',
    participantCount: 0,
    tracksCount: 0,
    lastError: null,
    reconnectAttempts: 0,
    signalConnected: false,
    canPublish: false,
    canSubscribe: false
  });

  useEffect(() => {
    console.log('🐛 [TRACE] VoiceChatUI mounted');
    return () => console.log('🐛 [TRACE] VoiceChatUI unmounted');
  }, []);

  useEffect(() => {
    if (!room) return;

    console.log('🔍 [DEBUG] Room object available, setting up listeners...');
    console.log('🔍 [DEBUG] Room initial state:', room.state);
    console.log('🔍 [DEBUG] Room localParticipant:', room.localParticipant?.identity || 'none');

    const updateDebugInfo = () => {
      const newDebugInfo: DebugInfo = {
        connectionState: room.state || 'unknown',
        connectionQuality: room.localParticipant?.connectionQuality || 'unknown',
        participantCount: participants.length,
        tracksCount: tracks.length,
        lastError: null,
        reconnectAttempts: 0,
        signalConnected: (room as any)?.engine?.connectedServerAddr ? true : false,
        canPublish: room.localParticipant?.permissions?.canPublish || false,
        canSubscribe: room.localParticipant?.permissions?.canSubscribe || false
      };
      setDebugInfo(newDebugInfo);
      console.log('🔍 [DEBUG] Updated debug info:', newDebugInfo);
    };

    const handleStateChange = () => {
      console.log('🔍 [DEBUG] Room state changed to:', room.state);
      if (room.state === 'connected') {
        setConnectionStatus('connected');
        console.log('🟢 [DEBUG] LiveKit room connected successfully');
        console.log('🔍 [DEBUG] Local participant identity:', room.localParticipant?.identity);
        console.log('🔍 [DEBUG] Local participant permissions:', room.localParticipant?.permissions);
        console.log('🔍 [DEBUG] Engine connected server:', (room as any)?.engine?.connectedServerAddr);
      } else if (room.state === 'disconnected') {
        setConnectionStatus('disconnected');
        console.log('🔴 [DEBUG] LiveKit room disconnected');
      } else if (room.state === 'connecting') {
        setConnectionStatus('connecting');
        console.log('🟡 [DEBUG] LiveKit room connecting...');
      } else if (room.state === 'reconnecting') {
        console.log('🟡 [DEBUG] LiveKit room reconnecting...');
      }
      updateDebugInfo();
    };

    const handleParticipantConnected = (participant: any) => {
      console.log('🟢 [DEBUG] Participant connected:', participant.identity);
      updateDebugInfo();
    };

    const handleParticipantDisconnected = (participant: any) => {
      console.log('🔴 [DEBUG] Participant disconnected:', participant.identity);
      updateDebugInfo();
    };

    const handleTrackSubscribed = (track: any, participant: any) => {
      console.log('🟢 [DEBUG] Track subscribed:', track.kind, 'from', participant.identity);
      updateDebugInfo();
    };

    const handleTrackUnsubscribed = (track: any, participant: any) => {
      console.log('🔴 [DEBUG] Track unsubscribed:', track.kind, 'from', participant.identity);
      updateDebugInfo();
    };

    const handleConnectionQualityChanged = (quality: any, participant: any) => {
      console.log('📊 [DEBUG] Connection quality changed:', quality, 'for', participant.identity);
      updateDebugInfo();
    };

    if ((room as any).on) {
      console.log('🔍 [DEBUG] Setting up room event listeners...');
      room.on('connected', handleStateChange);
      room.on('disconnected', handleStateChange);
      room.on('reconnecting', handleStateChange);
      room.on('reconnected', handleStateChange);
      room.on('participantConnected', handleParticipantConnected);
      room.on('participantDisconnected', handleParticipantDisconnected);
      room.on('trackSubscribed', handleTrackSubscribed);
      room.on('trackUnsubscribed', handleTrackUnsubscribed);
      room.on('connectionQualityChanged', handleConnectionQualityChanged);
      room.on('error', (error: any) => {
        console.error('🔴 [DEBUG] Room error event:', error);
        setDebugInfo(prev => ({ ...prev, lastError: error?.message || String(error) }));
      });
    }

    handleStateChange();

    return () => {
      console.log('🔍 [DEBUG] Cleaning up room event listeners...');
      if ((room as any).off) {
        room.off('connected', handleStateChange);
        room.off('disconnected', handleStateChange);
        room.off('reconnecting', handleStateChange);
        room.off('reconnected', handleStateChange);
        room.off('participantConnected', handleParticipantConnected);
        room.off('participantDisconnected', handleParticipantDisconnected);
        room.off('trackSubscribed', handleTrackSubscribed);
        room.off('trackUnsubscribed', handleTrackUnsubscribed);
        room.off('connectionQualityChanged', handleConnectionQualityChanged);
      }
    };
  }, [room, participants, tracks]);

  useEffect(() => {
    if (!room || !(room as any).on) return;
    console.log('🐛 [TRACE] Setting up dataReceived listener');
    const handleDataReceived = (payload: Uint8Array) => {
      try {
        const decoder = new TextDecoder();
        const data = JSON.parse(decoder.decode(payload));
        console.log('📨 [DEBUG] Data received:', data);
        if (data.type === 'ai_response' && data.text) {
          addMessage(data.text, false);
        } else if (data.type === 'stt_transcript' && data.text) {
          addMessage(data.text, true, true);
        }
      } catch (error) {
        console.error('🔴 [DEBUG] Failed to parse data message:', error);
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
    console.log('💬 [DEBUG] Message added:', { text: text.substring(0, 50) + '...', isUser, isVoice });
  };

  const toggleRecording = async () => {
    if (!room) {
      Alert.alert('Error', 'Not connected to room');
      console.log('🔴 [DEBUG] Toggle recording failed: No room');
      return;
    }

    if (!room.localParticipant) {
      Alert.alert('Error', 'No local participant');
      console.log('🔴 [DEBUG] Toggle recording failed: No local participant');
      return;
    }

    try {
      console.log('🎤 [DEBUG] Toggling microphone, current state:', isRecording);
      console.log('🔍 [DEBUG] Local participant permissions:', room.localParticipant.permissions);
      
      if (isRecording) {
        console.log('🔇 [DEBUG] Disabling microphone...');
        await room.localParticipant.setMicrophoneEnabled(false);
        setIsRecording(false);
        console.log('🔇 [DEBUG] Microphone disabled successfully');
      } else {
        console.log('🎤 [DEBUG] Enabling microphone...');
        await room.localParticipant.setMicrophoneEnabled(true);
        setIsRecording(true);
        console.log('🎤 [DEBUG] Microphone enabled successfully');
      }
    } catch (error: any) {
      console.error('🔴 [DEBUG] Microphone toggle error:', error);
      console.error('🔴 [DEBUG] Error details:', {
        message: error?.message,
        code: error?.code,
        stack: error?.stack
      });
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
          <Text style={styles.participantCount}>{/* count rendered in VoiceChatUI */}</Text>
        </View>
        
        {/* DEBUG INFO PANEL */}
        <View style={styles.debugPanel}>
          <Text style={styles.debugTitle}>🔍 Debug Info</Text>
          <Text style={styles.debugText}>State: {debugInfo.connectionState}</Text>
          <Text style={styles.debugText}>Signal: {debugInfo.signalConnected ? '✅' : '❌'}</Text>
          <Text style={styles.debugText}>Publish: {debugInfo.canPublish ? '✅' : '❌'}</Text>
          <Text style={styles.debugText}>Subscribe: {debugInfo.canSubscribe ? '✅' : '❌'}</Text>
          <Text style={styles.debugText}>Participants: {debugInfo.participantCount}</Text>
          <Text style={styles.debugText}>Tracks: {debugInfo.tracksCount}</Text>
          {debugInfo.lastError && (
            <Text style={styles.debugError}>Error: {debugInfo.lastError}</Text>
          )}
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
          {isRecording ? 'Tap to stop' : connectionStatus === 'connected' ? 'Tap to talk' : 'Waiting to connect...'}
        </Text>
      </View>
    </SafeAreaView>
  );
}

export default function ChatScreen() {
  const { isAuthenticated, signIn, isLoading: authLoading, error: authError } = useAuth();
  const { liveKitToken, isLoading: tokenLoading, error: tokenError, generateToken } = useLiveKitToken();
  const [lkConnected, setLkConnected] = React.useState(false);
  const [connectionAttempts, setConnectionAttempts] = React.useState(0);

  useEffect(() => {
    console.log('🐛 [TRACE] ChatScreen mounted');
    return () => console.log('🐛 [TRACE] ChatScreen unmounted');
  }, []);

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
          console.log('🎤 [DEBUG] Microphone permission result:', granted);
        } catch (err) {
          console.warn('🎤 [DEBUG] Permission request error:', err);
        }
      }
    };
    requestMicPermission();
  }, []);

  useEffect(() => {
    console.log('🐛 [TRACE] tokenLoading:', tokenLoading, 'hasToken?', !!liveKitToken);
  }, [tokenLoading, liveKitToken]);

  // generate token when authenticated
  useEffect(() => {
    if (isAuthenticated && !liveKitToken && !tokenLoading) {
      console.log('🎫 [DEBUG] Generating LiveKit token...');
      generateToken();
    }
  }, [isAuthenticated, liveKitToken, tokenLoading, generateToken]);

  if (!isAuthenticated) {
    console.log('🐛 [TRACE] branch: unauthenticated');
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
    console.log('🐛 [TRACE] branch: loading token');
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Connecting to June AI...</Text>
          {tokenError && (
            <View>
              <Text style={styles.errorText}>{tokenError}</Text>
              <ForceConnectButton onPress={generateToken} />
            </View>
          )}
          {!tokenError && <ForceConnectButton onPress={generateToken} />}
        </View>
      </SafeAreaView>
    );
  }

  const serverUrl = liveKitToken.livekitUrl!;
  const token = liveKitToken.token!;
  console.log('🐛 [TRACE] Token ready for LiveKitRoom:', {
    serverUrl,
    tokenPreview: (token || '').substring(0, 30) + '...'
  });
  console.log('🐛 [TRACE] branch: rendering LiveKitRoom');

  return (
    <LiveKitRoom
      serverUrl={serverUrl}
      token={token}
      connect={true}
      options={{
        adaptiveStream: true,
        dynacast: true,
      }}
      audio={false}
      video={false}
      onConnected={() => {
        console.log('🟢 [SUCCESS] LiveKit connected!');
        setLkConnected(true);
      }}
      onDisconnected={(reason?: any) => {
        console.log('🔴 [DISCONNECT] LiveKit disconnected:', reason);
        setLkConnected(false);
      }}
      onError={(e: any) => {
        console.error('🚨 [ERROR] LiveKit error:', {
          message: e?.message,
          name: e?.name,
          code: e?.code,
          stack: e?.stack,
          cause: e?.cause,
        });
      }}
      onConnectionStateChanged={(state: any) => {
        console.log('🔄 [STATE] Connection state changed:', state);
      }}
      onReconnecting={() => {
        console.log('🔄 [RECONNECT] LiveKit reconnecting...');
      }}
      onReconnected={() => {
        console.log('🟢 [RECONNECT] LiveKit reconnected!');
      }}
    >
      {lkConnected ? (
        <VoiceChatUI />
      ) : (
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>
              Connecting to LiveKit room...
            </Text>
            <Text style={styles.debugConnectionInfo}>
              {[
                `🔍 Attempt: ${connectionAttempts + 1}`,
                `📡 Server: ${serverUrl.replace('wss://', '')}`,
                `🎫 Token: ${(token?.length || 0)} chars`,
                `🧪 Trace: enabled`,
              ].join('\n')}
            </Text>
            <DirectConnectTestButton serverUrl={serverUrl} token={token} />
          </View>
        </SafeAreaView>
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
  debugConnectionInfo: { color: '#8E8E93', fontSize: 12, marginTop: 16, textAlign: 'center' },
  retryButton: { backgroundColor: '#007AFF', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, marginTop: 16 },
  retryButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  header: { padding: 20, paddingTop: 60, borderBottomWidth: 1, borderBottomColor: '#2C2C2E' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 8 },
  statusContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  statusText: { color: '#FFFFFF', fontSize: 14, marginRight: 12 },
  participantCount: { color: '#8E8E93', fontSize: 14 },
  debugPanel: { backgroundColor: '#1C1C1E', padding: 12, borderRadius: 8, marginTop: 8 },
  debugTitle: { color: '#FFFFFF', fontSize: 12, fontWeight: 'bold', marginBottom: 6 },
  debugText: { color: '#8E8E93', fontSize: 10, marginBottom: 2 },
  debugError: { color: '#FF3B30', fontSize: 10, marginTop: 4 },
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
