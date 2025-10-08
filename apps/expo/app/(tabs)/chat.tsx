// app/(tabs)/chat.tsx - Modern Dark UI with Collapsible Chat
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
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useAuth } from '@/hooks/useAuth';
import APP_CONFIG from '@/config/app.config';

const { width, height } = Dimensions.get('window');

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
  const { user, signOut, accessToken, isAuthenticated } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('Disconnected');
  const [isChatVisible, setIsChatVisible] = useState(false);
  
  const flatListRef = useRef<FlatList>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const chatAnimatedValue = useRef(new Animated.Value(0)).current;
  const pulseAnimatedValue = useRef(new Animated.Value(1)).current;
  const ringAnimatedValue = useRef(new Animated.Value(0)).current;

  // Auto-scroll to bottom
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  // Pulse animation for voice button
  useEffect(() => {
    if (isListening || isProcessing) {
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnimatedValue, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnimatedValue, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulseAnimation.start();
      return () => pulseAnimation.stop();
    } else {
      Animated.timing(pulseAnimatedValue, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [isListening, isProcessing]);

  // Ring animation for voice states
  useEffect(() => {
    if (isListening) {
      Animated.loop(
        Animated.timing(ringAnimatedValue, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        })
      ).start();
    } else {
      ringAnimatedValue.setValue(0);
    }
  }, [isListening]);

  // Toggle chat visibility
  const toggleChat = () => {
    const toValue = isChatVisible ? 0 : 1;
    setIsChatVisible(!isChatVisible);
    
    Animated.spring(chatAnimatedValue, {
      toValue,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  };

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
          // Auto-show chat when receiving response
          if (!isChatVisible) {
            toggleChat();
          }
        }
        break;

      case 'audio_response':
        if (data.audio_data) {
          console.log('🔊 Received audio response, playing...');
          playAudioResponse(data.audio_data);
          
          if (data.text) {
            setMessages(prev => prev.map(msg => 
              !msg.isUser && msg.text === data.text 
                ? { ...msg, audioData: data.audio_data }
                : msg
            ));
          }
          
          setIsProcessing(false);
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

    } catch (error) {
      console.error('❌ Failed to start recording:', error);
      Alert.alert('Recording Error', 'Failed to start voice recording');
    }
  };

  const stopVoiceRecording = async () => {
    try {
      if (!recordingRef.current) return;

      setIsListening(false);
      
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      if (uri) {
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
      setIsProcessing(true);

      const transcription = await transcribeAudio(audioUri);
      
      if (transcription.trim()) {
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

  // Render message
  const renderMessage = ({ item }: { item: Message }) => (
    <View style={[
      styles.messageContainer,
      item.isUser ? styles.userMessage : styles.botMessage
    ]}>
      <View style={[
        styles.messageBubble,
        {
          backgroundColor: item.isUser ? '#007AFF' : '#2C2C2E',
        }
      ]}>
        <Text style={[
          styles.messageText,
          { color: '#FFFFFF' }
        ]}>
          {item.text}
        </Text>
        
        {!item.isUser && item.audioData && (
          <TouchableOpacity 
            onPress={() => playAudioResponse(item.audioData!)}
            style={styles.audioButton}
          >
            <Ionicons name="play" size={16} color="#007AFF" />
          </TouchableOpacity>
        )}
      </View>
      <Text style={styles.timestamp}>
        {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </Text>
    </View>
  );

  const getStatusText = () => {
    if (!isConnected) return 'Connecting...';
    if (isListening) return 'Listening...';
    if (isProcessing) return 'Processing...';
    return 'Tap to speak';
  };

  const getButtonColor = () => {
    if (!isConnected) return '#666666';
    if (isListening) return '#FF3B30';
    if (isProcessing) return '#FF9500';
    return '#007AFF';
  };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <SafeAreaView style={styles.container}>
        {/* Main Voice Interface */}
        <View style={styles.mainContainer}>
          {/* Brand */}
          <View style={styles.brandContainer}>
            <Text style={styles.brandText}>OZZU</Text>
            <Text style={styles.brandSubtext}>AI Voice Assistant</Text>
          </View>

          {/* Voice Button with Blue Ring */}
          <View style={styles.voiceButtonContainer}>
            {/* Outer Ring Animation */}
            <Animated.View style={[
              styles.outerRing,
              {
                transform: [{ scale: pulseAnimatedValue }],
                opacity: ringAnimatedValue.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.3, 0.8]
                })
              }
            ]} />
            
            {/* Inner Ring */}
            <View style={[
              styles.innerRing,
              { borderColor: getButtonColor() }
            ]} />
            
            {/* Voice Button */}
            <TouchableOpacity
              onPress={handleVoiceButtonPress}
              disabled={!isConnected || (isProcessing && !isListening)}
              style={[
                styles.voiceButton,
                {
                  backgroundColor: getButtonColor(),
                  opacity: (!isConnected || (isProcessing && !isListening)) ? 0.5 : 1,
                }
              ]}
            >
              {isProcessing && !isListening ? (
                <ActivityIndicator size="large" color="white" />
              ) : isListening ? (
                <Ionicons name="stop" size={32} color="white" />
              ) : (
                <Ionicons name="mic" size={32} color="white" />
              )}
            </TouchableOpacity>
          </View>

          {/* Status Text */}
          <Text style={styles.statusText}>
            {getStatusText()}
          </Text>

          {/* Connection Status */}
          <View style={styles.connectionContainer}>
            <View style={[
              styles.connectionDot, 
              { backgroundColor: isConnected ? '#34C759' : '#FF3B30' }
            ]} />
            <Text style={styles.connectionText}>
              {connectionStatus}
            </Text>
          </View>
        </View>

        {/* Floating Chat Toggle Button */}
        <TouchableOpacity
          onPress={toggleChat}
          style={styles.chatToggleButton}
        >
          <Ionicons 
            name={isChatVisible ? "close" : "chatbubbles"} 
            size={24} 
            color="white" 
          />
          {messages.length > 0 && !isChatVisible && (
            <View style={styles.messageBadge}>
              <Text style={styles.messageBadgeText}>
                {messages.length > 99 ? '99+' : messages.length}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Collapsible Chat Interface */}
        <Animated.View style={[
          styles.chatContainer,
          {
            transform: [{
              translateY: chatAnimatedValue.interpolate({
                inputRange: [0, 1],
                outputRange: [height, 0]
              })
            }],
            opacity: chatAnimatedValue
          }
        ]}>
          <View style={styles.chatHeader}>
            <Text style={styles.chatTitle}>Conversation</Text>
            <TouchableOpacity onPress={() => setMessages([])}>
              <Ionicons name="trash-outline" size={20} color="#8E8E93" />
            </TouchableOpacity>
          </View>
          
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
                <Ionicons name="chatbubbles-outline" size={48} color="#48484A" />
                <Text style={styles.emptyText}>No messages yet</Text>
                <Text style={styles.emptySubtext}>Start a conversation by speaking</Text>
              </View>
            )}
          />
        </Animated.View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  mainContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 80,
  },
  brandText: {
    fontSize: 42,
    fontWeight: '200',
    letterSpacing: 8,
    color: '#FFFFFF',
    marginBottom: 8,
  },
  brandSubtext: {
    fontSize: 16,
    color: '#8E8E93',
    letterSpacing: 2,
  },
  voiceButtonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  outerRing: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  innerRing: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
    borderColor: '#007AFF',
  },
  voiceButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  statusText: {
    fontSize: 18,
    color: '#FFFFFF',
    marginBottom: 20,
    textAlign: 'center',
  },
  connectionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  connectionText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  chatToggleButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  messageBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  chatContainer: {
    position: 'absolute',
    top: 120,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  chatTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    flexGrow: 1,
  },
  messageContainer: {
    marginBottom: 16,
    maxWidth: '85%',
  },
  userMessage: {
    alignSelf: 'flex-end',
  },
  botMessage: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
    marginBottom: 4,
    position: 'relative',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  audioButton: {
    position: 'absolute',
    bottom: 4,
    right: 8,
    padding: 4,
  },
  timestamp: {
    fontSize: 11,
    color: '#8E8E93',
    textAlign: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
  },
});