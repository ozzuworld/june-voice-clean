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
import { LiveKitRoom, useRoom, useParticipants, useTracks, Track, ConnectionState, Room } from '@livekit/react-native';
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

  // Enhanced room state monitoring
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
        signalConnected: room.engine?.connectedServerAddr ? true : false,
        canPublish: room.localParticipant?.permissions?.canPublish || false,
        canSubscribe: room.localParticipant?.permissions?.canSubscribe || false
      };
      setDebugInfo(newDebugInfo);
      console.log('🔍 [DEBUG] Updated debug info:', newDebugInfo);
    };

    // Monitor connection state changes
    const handleStateChange = () => {
      console.log('🔍 [DEBUG] Room state changed to:', room.state);
      if (room.state === 'connected') {
        setConnectionStatus('connected');
        console.log('🟢 [DEBUG] LiveKit room connected successfully');
        console.log('🔍 [DEBUG] Local participant identity:', room.localParticipant?.identity);
        console.log('🔍 [DEBUG] Local participant permissions:', room.localParticipant?.permissions);
        console.log('🔍 [DEBUG] Engine connected server:', room.engine?.connectedServerAddr);
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

    // Monitor participant changes
    const handleParticipantConnected = (participant: any) => {
      console.log('🟢 [DEBUG] Participant connected:', participant.identity);
      updateDebugInfo();
    };

    const handleParticipantDisconnected = (participant: any) => {
      console.log('🔴 [DEBUG] Participant disconnected:', participant.identity);
      updateDebugInfo();
    };

    // Monitor track changes
    const handleTrackSubscribed = (track: any, participant: any) => {
      console.log('🟢 [DEBUG] Track subscribed:', track.kind, 'from', participant.identity);
      updateDebugInfo();
    };

    const handleTrackUnsubscribed = (track: any, participant: any) => {
      console.log('🔴 [DEBUG] Track unsubscribed:', track.kind, 'from', participant.identity);
      updateDebugInfo();
    };

    // Monitor connection quality
    const handleConnectionQualityChanged = (quality: any, participant: any) => {
      console.log('📊 [DEBUG] Connection quality changed:', quality, 'for', participant.identity);
      updateDebugInfo();
    };

    // Set up event listeners
    if (room.on) {
      console.log('🔍 [DEBUG] Setting up room event listeners...');
      
      // Connection events
      room.on('connected', handleStateChange);
      room.on('disconnected', handleStateChange);
      room.on('reconnecting', handleStateChange);
      room.on('reconnected', handleStateChange);
      
      // Participant events
      room.on('participantConnected', handleParticipantConnected);
      room.on('participantDisconnected', handleParticipantDisconnected);
      
      // Track events
      room.on('trackSubscribed', handleTrackSubscribed);
      room.on('trackUnsubscribed', handleTrackUnsubscribed);
      
      // Connection quality
      room.on('connectionQualityChanged', handleConnectionQualityChanged);

      // Error events
      room.on('error', (error: any) => {
        console.error('🔴 [DEBUG] Room error event:', error);
        setDebugInfo(prev => ({ ...prev, lastError: error?.message || String(error) }));
      });
    }

    // Initial update
    handleStateChange();

    return () => {
      console.log('🔍 [DEBUG] Cleaning up room event listeners...');
      if (room.off) {
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
          <Text style={styles.participantCount}>{participants.length} participants</Text>
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
  const [connectionTimeout, setConnectionTimeout] = React.useState<NodeJS.Timeout | null>(null);

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
    const run = async () => {
      try {
        if (!liveKitToken?.livekitUrl?.startsWith('wss://')) return;
        const httpsUrl = liveKitToken.livekitUrl.replace('wss://', 'https://');
        console.log('🔎 [DEBUG] TLS preflight to:', httpsUrl);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const res = await fetch(httpsUrl, { 
          method: 'HEAD',
          signal: controller.signal,
          headers: {
            'User-Agent': 'june-voice-react-native/1.0'
          }
        });
        clearTimeout(timeoutId);
        console.log('🔎 [DEBUG] TLS preflight status:', res.status, 'headers:', Object.fromEntries(res.headers.entries()));
        
        // Test WebSocket path specifically
        const wsTestUrl = httpsUrl + '/rtc?protocol=8&sdk=react-native';
        console.log('🔎 [DEBUG] Testing WebSocket path:', wsTestUrl);
        const wsTest = await fetch(wsTestUrl, { method: 'GET' });
        console.log('🔎 [DEBUG] WebSocket path test status:', wsTest.status);
        
      } catch (err: any) {
        const emsg = err?.message || String(err);
        console.error('🔎 [DEBUG] TLS preflight failed:', emsg);
        if (err.name === 'AbortError') {
          console.error('🔎 [DEBUG] TLS preflight timed out after 5 seconds');
        }
      }
    };
    run();
  }, [liveKitToken?.livekitUrl]);

  useEffect(() => {
    if (isAuthenticated && !liveKitToken && !tokenLoading) {
      console.log('🎫 [DEBUG] Generating LiveKit token...');
      generateToken();
    }
  }, [isAuthenticated, liveKitToken, tokenLoading, generateToken]);

  // Connection timeout handler
  useEffect(() => {
    if (liveKitToken && !lkConnected) {
      console.log('⏰ [DEBUG] Setting connection timeout (30 seconds)...');
      const timeout = setTimeout(() => {
        console.log('⏰ [DEBUG] Connection timeout reached, connection attempts:', connectionAttempts + 1);
        setConnectionAttempts(prev => prev + 1);
        if (connectionAttempts >= 2) {
          Alert.alert(
            'Connection Timeout', 
            'Unable to connect to LiveKit server. This appears to be a server-side issue.\n\nDetails:\n- Token generated successfully\n- TLS preflight passed\n- WebSocket connection is timing out\n\nPlease check server logs and configuration.',
            [
              { text: 'Retry', onPress: () => {
                setConnectionAttempts(0);
                generateToken();
              }},
              { text: 'OK' }
            ]
          );
        }
      }, 30000);
      
      setConnectionTimeout(timeout);
      
      return () => {
        if (timeout) {
          clearTimeout(timeout);
        }
      };
    }
  }, [liveKitToken, lkConnected, connectionAttempts]);

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
  console.log('🎫 [DEBUG] Using LiveKit server URL:', serverUrl);
  console.log('🎫 [DEBUG] Token length:', liveKitToken.token?.length);
  console.log('🎫 [DEBUG] Connection attempt:', connectionAttempts + 1);

  return (
    <LiveKitRoom
      serverUrl={serverUrl}
      token={liveKitToken.token}
      connect={true}
      options={{
        // Simplified options for debugging
        adaptiveStream: false,
        dynacast: false,
        // Remove complex publishDefaults temporarily
      }}
      audio={false} // Start with audio disabled to test signaling first
      video={false}
      onConnected={() => {
        console.log('🟢 [DEBUG] LiveKit onConnected event fired!');
        console.log('🟢 [DEBUG] Connection successful after', connectionAttempts + 1, 'attempts');
        setLkConnected(true);
        if (connectionTimeout) {
          clearTimeout(connectionTimeout);
          setConnectionTimeout(null);
        }
      }}
      onDisconnected={(reason?: any) => {
        console.log('🔴 [DEBUG] LiveKit onDisconnected event fired, reason:', reason);
        setLkConnected(false);
      }}
      onError={(e: any) => {
        const msg = e?.message || String(e);
        const cause = (e?.cause && (e.cause.message || String(e.cause))) || null;
        console.error('🔴 [DEBUG] LiveKitRoom onError event:', { 
          msg, 
          cause, 
          url: serverUrl,
          stack: e?.stack,
          name: e?.name,
          code: e?.code
        });
        Alert.alert(
          'LiveKit Connection Error', 
          `Frontend Error Details:\n\n` +
          `Message: ${msg}\n` +
          `${cause ? `Cause: ${cause}\n` : ''}` +
          `URL: ${serverUrl}\n\n` +
          `This indicates a connection-level issue. Check:\n` +
          `- Server is running and accessible\n` +
          `- WebSocket path /rtc is properly configured\n` +
          `- Token signing keys match server config\n` +
          `- No firewall blocking WebSocket connections`,
          [
            { text: 'Retry', onPress: generateToken },
            { text: 'OK' }
          ]
        );
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
              🔍 Attempt: {connectionAttempts + 1}/3{'\n'}
              📡 Server: {serverUrl.replace('wss://', '')}{'\n'}
              🎫 Token: {liveKitToken.token?.length || 0} chars{'\n'}
              ⏰ Timeout: 30s
            </Text>
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