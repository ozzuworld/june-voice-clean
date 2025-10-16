// This bypasses the LiveKitRoom component bug by using Room directly
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AudioSession } from '@livekit/react-native';
import { Room, RoomEvent, Track, setLogLevel, LogLevel } from 'livekit-client';
import { useAuth } from '@/hooks/useAuth';
import APP_CONFIG from '@/config/app.config';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  isVoice?: boolean;
}

async function fetchLiveKitToken(accessToken: string) {
  const url = `${APP_CONFIG.SERVICES.orchestrator}${APP_CONFIG.ENDPOINTS.SESSIONS}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      user_id: `user-${Date.now()}`,
      room_name: `voice-${Date.now()}`,
    }),
  });
  if (!response.ok) {
    throw new Error(`Failed to get token: ${response.status}`);
  }
  const data = await response.json();
  return {
    token: data.access_token,
    url: data.livekit_url || APP_CONFIG.SERVICES.livekit,
  };
}

// --- Diagnostics helpers ---
const testWebSocketConnection = async () => {
  console.log('🧪 [WS] Starting WebSocket diagnostics...');
  // Echo test
  try {
    const echoWs = new WebSocket('wss://echo.websocket.events');
    echoWs.onopen = () => {
      console.log('✅ [WS] Echo opened');
      try { echoWs.send('ping'); } catch {}
    };
    echoWs.onmessage = (e) => {
      console.log('✅ [WS] Echo message:', typeof e.data === 'string' ? e.data.slice(0, 64) : '[binary]');
      echoWs.close();
    };
    echoWs.onerror = (err) => console.log('❌ [WS] Echo error:', err);
    echoWs.onclose = (e) => console.log('🔌 [WS] Echo closed:', e.code, e.reason);
  } catch (e:any) {
    console.log('❌ [WS] Echo create failed:', e?.message || e);
  }
  // LiveKit raw WS
  try {
    const lkWs = new WebSocket('wss://livekit.ozzu.world');
    lkWs.onopen = () => { console.log('✅ [WS] LiveKit raw opened'); lkWs.close(); };
    lkWs.onerror = (err) => console.log('❌ [WS] LiveKit raw error:', err);
    lkWs.onclose = (e) => console.log('🔌 [WS] LiveKit raw closed:', e.code, e.reason);
  } catch (e:any) {
    console.log('❌ [WS] LiveKit raw create failed:', e?.message || e);
  }
};

const testSTUNConnectivity = async () => {
  console.log('🧪 [ICE] Starting STUN diagnostics...');
  try {
    // @ts-ignore - RN provides RTCPeerConnection via react-native-webrtc bridge in @livekit/react-native
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:34.59.53.188:3478' }, // your STUNner
        // TURN sample (uncomment if needed)
        // { urls: 'turn:34.59.53.188:3478', username: 'june-user', credential: 'Pokemon123!' },
      ],
      iceTransportPolicy: 'all',
    } as any);

    pc.onicegatheringstatechange = () => {
      console.log('🔄 [ICE] gathering state:', pc.iceGatheringState);
    };
    pc.oniceconnectionstatechange = () => {
      console.log('🔄 [ICE] connection state:', pc.iceConnectionState);
    };
    pc.onicecandidate = (ev:any) => {
      if (ev.candidate) {
        console.log('✅ [ICE] candidate:', ev.candidate.candidate);
      } else {
        console.log('✅ [ICE] gathering complete');
      }
    };

    pc.createDataChannel('diag');
    const offer = await pc.createOffer({ offerToReceiveAudio: false, offerToReceiveVideo: false });
    await pc.setLocalDescription(offer);
    console.log('📨 [ICE] Local SDP set, length:', offer.sdp?.length);

    // Close after 10s
    setTimeout(() => { try { pc.close(); console.log('🔌 [ICE] pc closed'); } catch {} }, 10000);
  } catch (e:any) {
    console.log('❌ [ICE] failed:', e?.message || e);
  }
};

export default function ChatScreen() {
  const { isAuthenticated, signIn, isLoading: authLoading, error: authError, accessToken } = useAuth();
  const [tokenData, setTokenData] = useState<{ token: string; url: string } | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [isLoadingToken, setIsLoadingToken] = useState(false);
  const roomRef = useRef<Room | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [participantCount, setParticipantCount] = useState(0);

  useEffect(() => {
    if (isAuthenticated && accessToken && !tokenData && !isLoadingToken) {
      console.log('🎫 Generating LiveKit token...');
      setIsLoadingToken(true);
      fetchLiveKitToken(accessToken)
        .then(data => { console.log('✅ Token generated'); setTokenData(data); setTokenError(null); })
        .catch(err => { console.error('❌ Token failed:', err); setTokenError(err.message); })
        .finally(() => setIsLoadingToken(false));
    }
  }, [isAuthenticated, accessToken, tokenData, isLoadingToken]);

  useEffect(() => {
    if (!tokenData) return;
    let room: Room | null = null;

    const connect = async () => {
      try {
        setLogLevel(LogLevel.debug);
        console.log('🔌 Starting audio session...');
        await AudioSession.startAudioSession();
        console.log('🔌 Creating room...');
        room = new Room();
        roomRef.current = room;

        room.on(RoomEvent.Connected, () => { console.log('✅ Room connected'); setIsConnected(true); });
        room.on(RoomEvent.Disconnected, (reason) => { console.log('🔌 Room disconnected', reason); setIsConnected(false); setIsRecording(false); });
        room.on(RoomEvent.ParticipantConnected, () => { console.log('👤 Participant joined'); setParticipantCount(room?.remoteParticipants.size || 0); });
        room.on(RoomEvent.ParticipantDisconnected, () => { console.log('👤 Participant left'); setParticipantCount(room?.remoteParticipants.size || 0); });
        room.on(RoomEvent.Reconnecting, () => console.log('🔄 Room reconnecting...'));
        room.on(RoomEvent.Reconnected, () => console.log('🔄 Room reconnected'));
        room.on(RoomEvent.ConnectionStateChanged, (state) => console.log('🔄 Connection state changed:', state));
        room.on(RoomEvent.DataReceived, (payload: Uint8Array) => {
          try { const decoder = new TextDecoder(); const data = JSON.parse(decoder.decode(payload)); console.log('📨 Data received:', data); if (data.type === 'ai_response' && data.text) { addMessage(data.text, false); } else if (data.type === 'stt_transcript' && data.text) { addMessage(data.text, true, true); } } catch (error) { console.error('Failed to parse data:', error); }
        });

        console.log('🔍 [DEBUG] About to connect to LiveKit');
        console.log('🔍 [DEBUG] URL:', tokenData.url);
        console.log('🔍 [DEBUG] Token length:', tokenData.token.length);
        console.log('🔍 [DEBUG] Token starts with:', tokenData.token.substring(0, 20));

        const connectionTimeout = setTimeout(() => {
          console.log('⏰ Connection timeout after 15 seconds');
          console.log('⏰ Room state at timeout:', room?.state);
          Alert.alert('Connection Timeout', 'Failed to connect to LiveKit server. Check logs for details.');
        }, 15000);

        try {
          console.log('🔌 Starting room.connect()...');
          await Promise.race([
            room.connect(tokenData.url, tokenData.token, { autoSubscribe: true, adaptiveStream: false }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('connect() timed out')), 15000)),
          ]);
          clearTimeout(connectionTimeout);
          console.log('✅ Connected successfully');
        } catch (error: any) {
          clearTimeout(connectionTimeout);
          console.log('❌ Connection error:', error);
          console.log('❌ Error message:', error?.message);
          console.log('❌ Error stack:', error?.stack);
          throw error;
        }
      } catch (error: any) {
        console.error('❌ Connection failed:', error);
        Alert.alert('Connection Error', error.message || 'Failed to connect');
        setTokenData(null);
      }
    };

    connect();
    return () => { console.log('🔌 Cleaning up connection...'); if (room) { room.disconnect(); } AudioSession.stopAudioSession(); roomRef.current = null; };
  }, [tokenData]);

  const addMessage = (text: string, isUser: boolean, isVoice = false) => {
    const message: Message = { id: `msg-${Date.now()}-${Math.random()}`, text, isUser, timestamp: new Date(), isVoice };
    setMessages(prev => [...prev, message]);
  };

  const toggleRecording = async () => {
    const room = roomRef.current; if (!room?.localParticipant) { Alert.alert('Error', 'Not connected to room'); return; }
    try { if (isRecording) { await room.localParticipant.setMicrophoneEnabled(false); setIsRecording(false); addMessage('Stopped recording', true, true); } else { await room.localParticipant.setMicrophoneEnabled(true); setIsRecording(true); addMessage('Started recording...', true, true); } } catch (error: any) { console.error('Microphone toggle error:', error); Alert.alert('Error', error.message || 'Failed to toggle microphone'); }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>June Voice AI</Text>
        <View style={styles.statusContainer}>
          <View style={[styles.statusDot, { backgroundColor: isConnected ? '#34C759' : '#8E8E93' }]} />
          <Text style={styles.statusText}>{isConnected ? (isRecording ? 'Recording...' : 'Connected') : 'Connecting...'}</Text>
        </View>
        <View style={styles.debugPanel}>
          <Text style={styles.debugTitle}>🔍 Debug</Text>
          <Text style={styles.debugText}>Connected: {isConnected ? 'Yes' : 'No'}</Text>
          <Text style={styles.debugText}>Participants: {participantCount}</Text>
          <Text style={styles.debugText}>Recording: {isRecording ? 'Yes' : 'No'}</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
            <TouchableOpacity style={styles.retryButton} onPress={testWebSocketConnection}>
              <Text style={styles.retryButtonText}>Test WebSocket</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.retryButton} onPress={testSTUNConnectivity}>
              <Text style={styles.retryButtonText}>Test STUN</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={[styles.messageContainer, item.isUser ? styles.userMessage : styles.aiMessage]}>
            <View style={[styles.messageBubble, { backgroundColor: item.isUser ? '#007AFF' : '#2C2C2E' }]}>
              <Text style={styles.messageText}>{item.text}</Text>
              {item.isVoice && (<Ionicons name="mic" size={12} color="rgba(255,255,255,0.6)" style={styles.voiceIcon} />)}
            </View>
            <Text style={styles.timestamp}>{item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
          </View>
        )}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContainer}
        ListEmptyComponent={(
          <View style={styles.emptyState}>
            <Ionicons name="chatbubbles-outline" size={48} color="#48484A" />
            <Text style={styles.emptyText}>Start talking to begin</Text>
            <Text style={styles.emptySubtext}>Press the button to talk to June AI</Text>
          </View>
        )}
      />

      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.voiceButton, { borderColor: isConnected ? (isRecording ? '#FF3B30' : '#34C759') : '#8E8E93', backgroundColor: isRecording ? 'rgba(255,59,48,0.2)' : 'transparent' }]}
          onPress={toggleRecording}
          disabled={!isConnected}
          activeOpacity={0.7}
        >
          <Ionicons name={isRecording ? 'stop' : 'mic'} size={32} color={isConnected ? (isRecording ? '#FF3B30' : '#34C759') : '#8E8E93'} />
        </TouchableOpacity>
        <Text style={styles.buttonLabel}>{isRecording ? 'Tap to stop' : isConnected ? 'Tap to talk' : 'Connecting...'}</Text>
      </View>
    </SafeAreaView>
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
  retryButton: { backgroundColor: '#007AFF', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  retryButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  header: { padding: 20, paddingTop: 60, borderBottomWidth: 1, borderBottomColor: '#2C2C2E' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 8 },
  statusContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  statusText: { color: '#FFFFFF', fontSize: 14 },
  debugPanel: { backgroundColor: '#1C1C1E', padding: 12, borderRadius: 8, marginTop: 8 },
  debugTitle: { color: '#FFFFFF', fontSize: 12, fontWeight: 'bold', marginBottom: 6 },
  debugText: { color: '#8E8E93', fontSize: 10, marginBottom: 2 },
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