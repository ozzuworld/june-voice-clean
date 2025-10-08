// app/(tabs)/chat.tsx - Simplified Voice Chat Focus
import React, { useState, useRef, useEffect, useCallback } from 'react';
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
import { Audio } from 'expo-av';
import { useAuth } from '@/hooks/useAuth';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import APP_CONFIG from '@/config/app.config';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  status?: 'sending' | 'sent' | 'error';
  audioData?: string;
}

interface WebSocketMessage {
  type: 'connected' | 'text_response' | 'audio_response' | 'processing_status' | 'processing_complete' | 'error';
  text?: string;
  audio_data?: string;
  status?: string;
  message?: string;
}

export default function ChatScreen() {
  const colorScheme = useColorScheme();
  const { user, signOut, accessToken, isAuthenticated } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('Disconnected');
  const flatListRef = useRef<FlatList>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  // WebSocket Connection
  const connectWebSocket = useCallback(() => {
    if (!accessToken || !isAuthenticated) return;

    try {
      const wsUrl = `wss://api.ozzu.world/ws?token=${encodeURIComponent(`Bearer ${accessToken}`)}`;
      console.log('🔌 Connecting WebSocket...');
      
      wsRef.current = new WebSocket(wsUrl);
      setConnectionStatus('Connecting...');

      wsRef.current.onopen = () => {
        console.log('✅ WebSocket connected');
        setIsConnected(true);
        setConnectionStatus('Connected');
      };

      wsRef.current.onmessage = (event) => {
        const data: WebSocketMessage = JSON.parse(event.data);
        console.log('📨 WebSocket message:', data.type, data);
        handleWebSocketMessage(data);
      };

      wsRef.current.onclose = () => {
        console.log('🔌 WebSocket closed');
        setIsConnected(false);
        setConnectionStatus('Disconnected');
        setIsProcessing(false);
      };

      wsRef.current.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        setIsConnected(false);
        setConnectionStatus('Error');
        setIsProcessing(false);
      };

    } catch (error) {
      console.error('❌ WebSocket connection failed:', error);
      setConnectionStatus('Failed');
    }
  }, [accessToken, isAuthenticated]);

  // Handle WebSocket Messages
  const handleWebSocketMessage = (data: WebSocketMessage) => {
    switch (data.type) {
      case 'connected':
        console.log('✅ WebSocket session established');
        break;

      case 'text_response':
        if (data.text) {
          const botMessage: Message = {
            id: `bot-${Date.now()}`,
            text: data.text,
            isUser: false,
            timestamp: new Date(),
            status: 'sent',
          };
          setMessages(prev => [...prev, botMessage]);
        }
        break;

      case 'audio_response':
        if (data.audio_data) {
          console.log('🔊 Received audio response, playing...');
          playAudioResponse(data.audio_data);
          
          // Update the last bot message with audio data
          if (data.text) {
            setMessages(prev => prev.map(msg => 
              !msg.isUser && msg.text === data.text 
                ? { ...msg, audioData: data.audio_data }
                : msg
            ));
          }
        }
        break;

      case 'processing_status':
        setIsProcessing(data.status !== 'complete');
        break;

      case 'processing_complete':
        setIsProcessing(false);
        break;

      case 'error':
        console.error('❌ WebSocket error:', data.message);
        setIsProcessing(false);
        Alert.alert('Error', data.message || 'Unknown error occurred');
        break;
    }
  };

  // Connect WebSocket on mount
  useEffect(() => {
    if (isAuthenticated && accessToken) {
      connectWebSocket();
    }
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [isAuthenticated, accessToken, connectWebSocket]);

  // Send text message via WebSocket
  const sendTextMessage = useCallback((text: string) => {
    if (!text.trim() || !wsRef.current || !isConnected) {
      console.log('❌ Cannot send message: not connected or empty text');
      return;
    }

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      text: text.trim(),
      isUser: true,
      timestamp: new Date(),
      status: 'sending',
    };

    setMessages(prev => [...prev, userMessage]);
    setIsProcessing(true);

    try {
      wsRef.current.send(JSON.stringify({
        type: 'text_input',
        text: text.trim(),
        timestamp: new Date().toISOString(),
      }));

      // Update message status
      setMessages(prev => prev.map(msg => 
        msg.id === userMessage.id ? { ...msg, status: 'sent' } : msg
      ));

    } catch (error) {
      console.error('❌ Failed to send message:', error);
      setMessages(prev => prev.map(msg => 
        msg.id === userMessage.id ? { ...msg, status: 'error' } : msg
      ));
      setIsProcessing(false);
    }
  }, [isConnected]);

  // Voice Recording Functions
  const startVoiceRecording = async () => {
    try {
      console.log('🎤 Starting voice recording...');
      
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant microphone permission');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync({
        android: {
          extension: '.m4a',
          outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_MPEG_4,
          audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_AAC,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          outputFormat: Audio.RECORDING_OPTION_IOS_OUTPUT_FORMAT_MPEG4AAC,
          audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_HIGH,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
        },
      });

      recordingRef.current = recording;
      setIsListening(true);
      console.log('✅ Recording started');

    } catch (error) {
      console.error('❌ Failed to start recording:', error);
      Alert.alert('Recording Error', 'Failed to start voice recording');
    }
  };

  const stopVoiceRecording = async () => {
    try {
      if (!recordingRef.current) return;

      console.log('🛑 Stopping voice recording...');
      setIsListening(false);
      
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      if (uri) {
        console.log('📁 Recording saved, processing...');
        await processVoiceMessage(uri);
      }

    } catch (error) {
      console.error('❌ Failed to stop recording:', error);
      Alert.alert('Recording Error', 'Failed to process voice recording');
    }
  };

  // Process voice message through STT then WebSocket
  const processVoiceMessage = async (audioUri: string) => {
    try {
      console.log('🎤 Processing voice message...');
      setIsProcessing(true);

      // Step 1: Convert audio to text
      const transcription = await transcribeAudio(audioUri);
      
      if (transcription.trim()) {
        console.log('📝 Transcription:', transcription);
        // Step 2: Send transcription through WebSocket for AI response
        sendTextMessage(transcription);
      } else {
        Alert.alert('No Speech Detected', 'Please try speaking more clearly');
        setIsProcessing(false);
      }

    } catch (error) {
      console.error('❌ Voice processing failed:', error);
      Alert.alert('Voice Processing Error', error.message || 'Failed to process voice');
      setIsProcessing(false);
    }
  };

  // Transcribe audio using STT service
  const transcribeAudio = async (audioUri: string): Promise<string> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), APP_CONFIG.TIMEOUTS.STT);

    try {
      console.log('📝 Sending audio to STT service...');
      
      const formData = new FormData();
      formData.append('audio_file', {
        uri: audioUri,
        name: 'voice.m4a',
        type: 'audio/m4a',
      } as any);

      formData.append('language', 'en');
      formData.append('task', 'transcribe');

      const response = await fetch(
        `${APP_CONFIG.SERVICES.stt}${APP_CONFIG.ENDPOINTS.STT}`, 
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
          body: formData,
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ STT service error:', errorText);
        throw new Error(`STT failed (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ STT response:', data);
      
      return data.text || data.transcription || '';

    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Speech recognition timed out');
      }
      throw error;
    }
  };

  // Play audio response
  const playAudioResponse = async (audioData: string) => {
    try {
      console.log('🔊 Playing audio response...');
      
      // Set audio mode for playback
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      const { sound } = await Audio.Sound.createAsync({
        uri: `data:audio/wav;base64,${audioData}`
      });
      
      await sound.playAsync();
      console.log('✅ Audio playback started');
      
      // Clean up sound after playback
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
        }
      });

    } catch (error) {
      console.error('❌ Audio playback failed:', error);
      Alert.alert('Audio Error', 'Failed to play audio response');
    }
  };

  // Handle voice button press
  const handleVoiceButtonPress = () => {
    if (!isConnected) {
      Alert.alert('Not Connected', 'Please wait for connection to establish');
      return;
    }

    if (isListening) {
      stopVoiceRecording();
    } else {
      startVoiceRecording();
    }
  };

  // Clear chat
  const clearChat = () => {
    Alert.alert(
      'Clear Chat',
      'Are you sure you want to clear all messages?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear', 
          style: 'destructive',
          onPress: () => setMessages([])
        }
      ]
    );
  };

  // Render message
  const renderMessage = ({ item }: { item: Message }) => (
    <View style={[
      styles.messageContainer,
      item.isUser ? styles.userMessage : styles.botMessage
    ]}>
      <View style={[
        styles.messageBubble,
        {
          backgroundColor: item.isUser 
            ? Colors[colorScheme ?? 'light'].primary 
            : Colors[colorScheme ?? 'light'].backgroundSecondary || '#1a1a1a',
        }
      ]}>
        <Text style={[
          styles.messageText,
          { color: item.isUser ? 'white' : Colors[colorScheme ?? 'light'].text }
        ]}>
          {item.text}
        </Text>
        
        {/* Audio replay button for bot messages */}
        {!item.isUser && item.audioData && (
          <TouchableOpacity 
            onPress={() => playAudioResponse(item.audioData!)}
            style={styles.audioButton}
          >
            <Ionicons name="play" size={16} color={Colors[colorScheme ?? 'light'].primary} />
          </TouchableOpacity>
        )}
      </View>
      <Text style={[styles.timestamp, { color: Colors[colorScheme ?? 'light'].textSecondary || '#666' }]}>
        {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: Colors[colorScheme ?? 'light'].border || '#333' }]}>
        <Text style={[styles.headerTitle, { color: Colors[colorScheme ?? 'light'].primary }]}>
          OZZU Voice Chat
        </Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity onPress={clearChat} style={styles.headerButton}>
            <Ionicons name="trash-outline" size={20} color={Colors[colorScheme ?? 'light'].textSecondary || '#666'} />
          </TouchableOpacity>
          <TouchableOpacity onPress={signOut} style={styles.headerButton}>
            <Ionicons name="log-out-outline" size={20} color={Colors[colorScheme ?? 'light'].textSecondary || '#666'} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Status Bar */}
      <View style={[styles.statusBar, { backgroundColor: Colors[colorScheme ?? 'light'].backgroundSecondary || '#1a1a1a' }]}>
        <View style={styles.statusLeft}>
          <View style={[styles.connectionDot, { backgroundColor: isConnected ? '#4CAF50' : '#F44336' }]} />
          <Text style={[styles.statusText, { color: Colors[colorScheme ?? 'light'].textSecondary }]}>
            {connectionStatus}
          </Text>
        </View>
        
        {isProcessing && (
          <View style={styles.statusRight}>
            <ActivityIndicator size="small" color={Colors[colorScheme ?? 'light'].primary} />
            <Text style={[styles.statusText, { color: Colors[colorScheme ?? 'light'].textSecondary }]}>
              {isListening ? 'Listening...' : 'Processing...'}
            </Text>
          </View>
        )}
      </View>
      
      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <Ionicons name="mic" size={60} color={Colors[colorScheme ?? 'light'].primary} />
            <Text style={[styles.emptyTitle, { color: Colors[colorScheme ?? 'light'].text }]}>
              Voice Chat Ready
            </Text>
            <Text style={[styles.emptySubtitle, { color: Colors[colorScheme ?? 'light'].textSecondary }]}>
              Tap the microphone to start talking with AI
            </Text>
          </View>
        )}
      />

      {/* Voice Controls */}
      <View style={[styles.voiceContainer, { borderTopColor: Colors[colorScheme ?? 'light'].border || '#333' }]}>
        <TouchableOpacity
          onPress={handleVoiceButtonPress}
          disabled={!isConnected || (isProcessing && !isListening)}
          style={[
            styles.voiceButton,
            {
              backgroundColor: isListening 
                ? Colors[colorScheme ?? 'light'].danger 
                : Colors[colorScheme ?? 'light'].primary,
              opacity: (!isConnected || (isProcessing && !isListening)) ? 0.5 : 1,
            }
          ]}
        >
          {isListening ? (
            <Ionicons name="stop" size={32} color="white" />
          ) : (
            <Ionicons name="mic" size={32} color="white" />
          )}
        </TouchableOpacity>
        
        <Text style={[styles.voiceInstructions, { color: Colors[colorScheme ?? 'light'].textSecondary }]}>
          {!isConnected 
            ? 'Connecting...' 
            : isListening 
            ? 'Listening... Tap to stop'
            : isProcessing
            ? 'Processing your message...'
            : 'Tap to speak'
          }
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  headerButtons: { flexDirection: 'row', gap: 10 },
  headerButton: { padding: 8 },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  statusLeft: { flexDirection: 'row', alignItems: 'center' },
  statusRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  connectionDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  statusText: { fontSize: 12 },
  messagesList: { flex: 1 },
  messagesContent: { padding: 16, flexGrow: 1 },
  messageContainer: { marginBottom: 16, maxWidth: '85%' },
  userMessage: { alignSelf: 'flex-end' },
  botMessage: { alignSelf: 'flex-start' },
  messageBubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    marginBottom: 4,
    position: 'relative',
  },
  messageText: { fontSize: 16, lineHeight: 20 },
  audioButton: { position: 'absolute', bottom: 4, right: 8, padding: 4 },
  timestamp: { fontSize: 11, textAlign: 'center' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyTitle: { fontSize: 24, fontWeight: 'bold', marginTop: 20, marginBottom: 8 },
  emptySubtitle: { fontSize: 16, textAlign: 'center', paddingHorizontal: 40 },
  voiceContainer: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
    borderTopWidth: 1,
  },
  voiceButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  voiceInstructions: { fontSize: 16, textAlign: 'center' },
});