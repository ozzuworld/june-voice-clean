// app/(tabs)/chat.tsx - Real-time Audio Streaming Implementation
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
  type: 'connected' | 'text_response' | 'audio_response' | 'processing_status' | 'processing_complete' | 'error' | 'audio_start' | 'audio_chunk' | 'audio_end';
  text?: string;
  audio_data?: string;
  status?: string;
  message?: string;
  chunk?: string;
  sample_rate?: number;
  channels?: number;
  format?: string;
}

export default function ChatScreen() {
  const { user, signOut, accessToken, isAuthenticated } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('Disconnected');
  const [isChatVisible, setIsChatVisible] = useState(false);
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [isConversationMode, setIsConversationMode] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  
  const flatListRef = useRef<FlatList>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const streamingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const chatAnimatedValue = useRef(new Animated.Value(0)).current;
  const menuAnimatedValue = useRef(new Animated.Value(0)).current;
  
  // Enhanced ring animations
  const mainRingScale = useRef(new Animated.Value(1)).current;
  const mainRingOpacity = useRef(new Animated.Value(0.8)).current;
  const glowRingScale = useRef(new Animated.Value(1)).current;
  const glowRingOpacity = useRef(new Animated.Value(0.3)).current;
  const pulseRingScale = useRef(new Animated.Value(1)).current;
  const pulseRingOpacity = useRef(new Animated.Value(0)).current;
  const rotationValue = useRef(new Animated.Value(0)).current;

  // Auto-scroll to bottom
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  // Enhanced ring animations based on state
  useEffect(() => {
    // Stop all animations first
    mainRingScale.stopAnimation();
    glowRingScale.stopAnimation();
    pulseRingScale.stopAnimation();
    rotationValue.stopAnimation();

    if (!isConnected) {
      // Disconnected state - subtle pulse
      Animated.loop(
        Animated.sequence([
          Animated.timing(mainRingOpacity, {
            toValue: 0.3,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(mainRingOpacity, {
            toValue: 0.6,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else if (isListening || isStreaming) {
      // Listening/Streaming state - active glow + rotation
      Animated.parallel([
        Animated.loop(
          Animated.timing(rotationValue, {
            toValue: 1,
            duration: 2000, // Faster rotation for streaming
            useNativeDriver: true,
          })
        ),
        Animated.loop(
          Animated.sequence([
            Animated.timing(glowRingScale, {
              toValue: 1.15,
              duration: 800,
              useNativeDriver: true,
            }),
            Animated.timing(glowRingScale, {
              toValue: 1,
              duration: 800,
              useNativeDriver: true,
            }),
          ])
        ),
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulseRingScale, {
              toValue: 1.4,
              duration: 600,
              useNativeDriver: true,
            }),
            Animated.timing(pulseRingScale, {
              toValue: 1,
              duration: 600,
              useNativeDriver: true,
            }),
          ])
        ),
      ]).start();
      
      mainRingOpacity.setValue(1);
      pulseRingOpacity.setValue(0.5);
      glowRingOpacity.setValue(0.7);
    } else if (isProcessing) {
      // Processing state - steady glow + slow rotation
      Animated.parallel([
        Animated.loop(
          Animated.timing(rotationValue, {
            toValue: 1,
            duration: 4000,
            useNativeDriver: true,
          })
        ),
        Animated.timing(mainRingScale, {
          toValue: 1.05,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
      
      mainRingOpacity.setValue(0.9);
      glowRingOpacity.setValue(0.5);
    } else if (isConversationMode) {
      // Conversation mode - gentle breathing effect
      Animated.loop(
        Animated.sequence([
          Animated.timing(mainRingScale, {
            toValue: 1.02,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(mainRingScale, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      ).start();
      
      mainRingOpacity.setValue(0.9);
      glowRingOpacity.setValue(0.4);
    } else {
      // Connected idle state - soft glow
      mainRingScale.setValue(1);
      mainRingOpacity.setValue(0.8);
      glowRingOpacity.setValue(0.3);
      pulseRingOpacity.setValue(0);
    }
  }, [isConnected, isListening, isProcessing, isConversationMode, isStreaming]);

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

  // Toggle menu visibility
  const toggleMenu = () => {
    const toValue = isMenuVisible ? 0 : 1;
    setIsMenuVisible(!isMenuVisible);
    
    Animated.spring(menuAnimatedValue, {
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
        setIsConversationMode(false);
        setIsStreaming(false);
        stopAudioStreaming();
      };

      wsRef.current.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        setIsConnected(false);
        setConnectionStatus('Error');
        setIsProcessing(false);
        setIsConversationMode(false);
        setIsStreaming(false);
        stopAudioStreaming();
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
          
          if (data.text) {
            setMessages(prev => prev.map(msg => 
              !msg.isUser && msg.text === data.text 
                ? { ...msg, audioData: data.audio_data }
                : msg
            ));
          }
          
          // After audio response, prepare for next input in conversation mode
          if (isConversationMode) {
            setTimeout(() => {
              setIsProcessing(false);
              // Auto-restart streaming for continuous conversation
              startAudioStreaming();
            }, 500);
          } else {
            setIsProcessing(false);
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
        setIsConversationMode(false);
        setIsStreaming(false);
        stopAudioStreaming();
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
      stopAudioStreaming();
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

  // Real-time Audio Streaming Functions
  const startAudioStreaming = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant microphone permission');
        return;
      }

      if (!wsRef.current || !isConnected) {
        console.log('❌ Cannot start streaming: WebSocket not connected');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Start recording with streaming-optimized settings
      const { recording } = await Audio.Recording.createAsync({
        android: {
          extension: '.wav',
          outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_PCM_16BIT,
          audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_PCM_16BIT,
          sampleRate: 16000, // Optimized for speech recognition
          numberOfChannels: 1, // Mono for better performance
          bitRate: 128000,
        },
        ios: {
          extension: '.wav',
          outputFormat: Audio.RECORDING_OPTION_IOS_OUTPUT_FORMAT_LINEARPCM,
          audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_HIGH,
          sampleRate: 16000, // Optimized for speech recognition
          numberOfChannels: 1, // Mono for better performance
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
      });

      recordingRef.current = recording;
      setIsListening(true);
      setIsStreaming(true);

      // Send audio start signal
      wsRef.current.send(JSON.stringify({
        type: 'audio_start',
        sample_rate: 16000,
        channels: 1,
        format: 'wav',
        timestamp: new Date().toISOString(),
      }));

      console.log('🎤 Started real-time audio streaming');

      // Start periodic chunk sending
      startChunkStreaming();

    } catch (error) {
      console.error('❌ Failed to start audio streaming:', error);
      Alert.alert('Streaming Error', 'Failed to start voice streaming');
      setIsStreaming(false);
      setIsListening(false);
    }
  };

  const startChunkStreaming = () => {
    if (streamingIntervalRef.current) {
      clearInterval(streamingIntervalRef.current);
    }

    // Send audio chunks every 100ms for real-time processing
    streamingIntervalRef.current = setInterval(async () => {
      if (!recordingRef.current || !wsRef.current || !isStreaming) {
        return;
      }

      try {
        // Get recording status and data
        const status = await recordingRef.current.getStatusAsync();
        
        if (status.isRecording) {
          // In a real implementation, you'd need to access the raw audio buffer
          // This is a simplified version - you might need to use a native module
          // for actual real-time audio chunk extraction
          
          // For now, we'll simulate chunk sending
          const chunkData = await getAudioChunk();
          
          if (chunkData && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
              type: 'audio_chunk',
              chunk: chunkData,
              timestamp: new Date().toISOString(),
            }));
          }
        }
      } catch (error) {
        console.error('❌ Error sending audio chunk:', error);
      }
    }, 100); // Send chunks every 100ms
  };

  // Simulate getting audio chunk (in real implementation, this would access raw audio buffer)
  const getAudioChunk = async (): Promise<string | null> => {
    try {
      // This is a placeholder - in a real implementation you would:
      // 1. Access the recording's buffer
      // 2. Extract the latest chunk since last send
      // 3. Convert to base64 or appropriate format
      // 4. Return the chunk data
      
      // For now, we'll return null to avoid sending empty chunks
      return null;
    } catch (error) {
      console.error('❌ Error getting audio chunk:', error);
      return null;
    }
  };

  const stopAudioStreaming = async () => {
    try {
      // Clear streaming interval
      if (streamingIntervalRef.current) {
        clearInterval(streamingIntervalRef.current);
        streamingIntervalRef.current = null;
      }

      setIsListening(false);
      setIsStreaming(false);
      
      if (recordingRef.current) {
        await recordingRef.current.stopAndUnloadAsync();
        recordingRef.current = null;
      }

      // Send audio end signal
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'audio_end',
          timestamp: new Date().toISOString(),
        }));
      }

      console.log('🛾 Stopped audio streaming');

    } catch (error) {
      console.error('❌ Failed to stop audio streaming:', error);
    }
  };

  // Legacy batch recording (fallback)
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

  // Process voice message through STT then WebSocket (legacy fallback)
  const processVoiceMessage = async (audioUri: string) => {
    try {
      setIsProcessing(true);

      const transcription = await transcribeAudio(audioUri);
      
      if (transcription.trim()) {
        sendTextMessage(transcription);
      } else {
        Alert.alert('No Speech Detected', 'Please try speaking more clearly');
        setIsProcessing(false);
        if (isConversationMode) {
          // Restart streaming in conversation mode
          setTimeout(() => startAudioStreaming(), 1000);
        }
      }

    } catch (error) {
      console.error('❌ Voice processing failed:', error);
      Alert.alert('Voice Processing Error', error.message || 'Failed to process voice');
      setIsProcessing(false);
      setIsConversationMode(false);
    }
  };

  // Transcribe audio using STT service (legacy fallback)
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

  // Handle main ring tap - Now uses real-time streaming
  const handleMainRingPress = () => {
    if (!isConnected) {
      Alert.alert('Not Connected', 'Please wait for connection to establish');
      return;
    }

    if (isConversationMode || isStreaming) {
      // Stop conversation mode and streaming
      setIsConversationMode(false);
      if (isStreaming) {
        stopAudioStreaming();
      }
      setIsProcessing(false);
    } else {
      // Start conversation mode with real-time streaming
      setIsConversationMode(true);
      startAudioStreaming();
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

  const getRingColor = () => {
    if (!isConnected) return '#666666';
    if (isListening || isStreaming) return '#FF3B30';
    if (isProcessing) return '#FF9500';
    if (isConversationMode) return '#34C759';
    return '#007AFF';
  };

  const spin = rotationValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <SafeAreaView style={styles.container}>
        {/* COMPLETELY CLEAN MAIN INTERFACE - JUST THE RING */}
        <View style={styles.mainContainer}>
          {/* Enhanced Multi-Layer Ring System - THE ONLY INTERFACE ELEMENT */}
          <TouchableOpacity
            onPress={handleMainRingPress}
            disabled={!isConnected}
            style={styles.ringContainer}
            activeOpacity={0.8}
          >
            {/* Outer Glow Ring */}
            <Animated.View style={[
              styles.outerGlowRing,
              {
                transform: [{ scale: glowRingScale }],
                opacity: glowRingOpacity,
                borderColor: getRingColor(),
                shadowColor: getRingColor(),
              }
            ]} />
            
            {/* Pulse Ring (only during listening/streaming) */}
            <Animated.View style={[
              styles.pulseRing,
              {
                transform: [{ scale: pulseRingScale }],
                opacity: pulseRingOpacity,
                borderColor: getRingColor(),
              }
            ]} />
            
            {/* Main Ring with Rotation */}
            <Animated.View style={[
              styles.mainRing,
              {
                transform: [
                  { scale: mainRingScale },
                  { rotate: spin }
                ],
                opacity: mainRingOpacity,
                borderColor: getRingColor(),
                shadowColor: getRingColor(),
              }
            ]}>
              {/* Inner Ring Content */}
              <View style={[
                styles.innerRingContent,
                {
                  backgroundColor: getRingColor() + '10',
                }
              ]}>
                {isProcessing && (
                  <ActivityIndicator size="large" color={getRingColor()} />
                )}
                {(isListening || isStreaming) && (
                  <View style={styles.listeningIndicator}>
                    <Animated.View style={[styles.waveBar, { backgroundColor: getRingColor() }]} />
                    <Animated.View style={[styles.waveBar, { backgroundColor: getRingColor() }]} />
                    <Animated.View style={[styles.waveBar, { backgroundColor: getRingColor() }]} />
                    <Animated.View style={[styles.waveBar, { backgroundColor: getRingColor() }]} />
                    {isStreaming && (
                      <Animated.View style={[styles.streamingIndicator, { backgroundColor: getRingColor() }]} />
                    )}
                  </View>
                )}
                {isConversationMode && !isListening && !isProcessing && !isStreaming && (
                  <View style={styles.conversationIndicator}>
                    <View style={[styles.conversationDot, { backgroundColor: getRingColor() }]} />
                    <View style={[styles.conversationDot, { backgroundColor: getRingColor() }]} />
                    <View style={[styles.conversationDot, { backgroundColor: getRingColor() }]} />
                  </View>
                )}
              </View>
            </Animated.View>
          </TouchableOpacity>
        </View>

        {/* Floating Menu Button (Left Side) */}
        <TouchableOpacity
          onPress={toggleMenu}
          style={styles.menuToggleButton}
        >
          <Ionicons 
            name={isMenuVisible ? "close" : "menu"} 
            size={24} 
            color="white" 
          />
        </TouchableOpacity>

        {/* Left Side Floating Menu */}
        <Animated.View style={[
          styles.floatingMenu,
          {
            transform: [{
              translateX: menuAnimatedValue.interpolate({
                inputRange: [0, 1],
                outputRange: [-200, 0]
              })
            }],
            opacity: menuAnimatedValue
          }
        ]}>
          <TouchableOpacity
            onPress={() => {
              toggleChat();
              toggleMenu();
            }}
            style={styles.menuItem}
          >
            <Ionicons name="chatbubbles" size={20} color="white" />
            <Text style={styles.menuItemText}>Chat</Text>
            {messages.length > 0 && (
              <View style={styles.menuBadge}>
                <Text style={styles.menuBadgeText}>
                  {messages.length > 99 ? '99+' : messages.length}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          
          {/* Connection Status in Menu */}
          <View style={styles.menuItem}>
            <View style={[
              styles.connectionDot, 
              { backgroundColor: isConnected ? '#34C759' : '#FF3B30' }
            ]} />
            <Text style={styles.menuItemText}>{connectionStatus}</Text>
          </View>

          {/* Streaming Status */}
          <View style={styles.menuItem}>
            <Ionicons name="radio" size={20} color={isStreaming ? '#34C759' : '#666'} />
            <Text style={styles.menuItemText}>Real-time Streaming</Text>
            <View style={[
              styles.toggleIndicator,
              { backgroundColor: isStreaming ? '#34C759' : '#666' }
            ]} />
          </View>

          {/* Conversation Mode Toggle */}
          <TouchableOpacity
            onPress={() => {
              if (isConversationMode) {
                setIsConversationMode(false);
                if (isStreaming) {
                  stopAudioStreaming();
                }
              } else {
                setIsConversationMode(true);
                startAudioStreaming();
              }
              toggleMenu();
            }}
            style={styles.menuItem}
          >
            <Ionicons name={isConversationMode ? "pause" : "play"} size={20} color="white" />
            <Text style={styles.menuItemText}>Continuous Mode</Text>
            <View style={[
              styles.toggleIndicator,
              { backgroundColor: isConversationMode ? '#34C759' : '#666' }
            ]} />
          </TouchableOpacity>
        </Animated.View>

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
            <View style={styles.chatHeaderActions}>
              <TouchableOpacity onPress={() => setMessages([])} style={styles.chatHeaderButton}>
                <Ionicons name="trash-outline" size={20} color="#8E8E93" />
              </TouchableOpacity>
              <TouchableOpacity onPress={toggleChat} style={styles.chatHeaderButton}>
                <Ionicons name="close" size={20} color="#8E8E93" />
              </TouchableOpacity>
            </View>
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
                <Text style={styles.emptySubtext}>Start a conversation by tapping the ring</Text>
              </View>
            )}
          />
        </Animated.View>

        {/* Menu Overlay */}
        {isMenuVisible && (
          <TouchableOpacity
            style={styles.menuOverlay}
            onPress={toggleMenu}
            activeOpacity={1}
          />
        )}
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
  ringContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  outerGlowRing: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    borderWidth: 1,
    borderColor: '#007AFF',
    shadowOpacity: 0.8,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  pulseRing: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  mainRing: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 4,
    borderColor: '#007AFF',
    shadowOpacity: 0.6,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerRingContent: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listeningIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  waveBar: {
    width: 6,
    height: 25,
    marginHorizontal: 3,
    borderRadius: 3,
    backgroundColor: '#007AFF',
  },
  streamingIndicator: {
    width: 8,
    height: 30,
    marginLeft: 6,
    borderRadius: 4,
    backgroundColor: '#FF3B30',
  },
  conversationIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  conversationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#34C759',
    marginHorizontal: 4,
  },
  menuToggleButton: {
    position: 'absolute',
    top: 60,
    left: 20,
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
  floatingMenu: {
    position: 'absolute',
    top: 120,
    left: 20,
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
    minWidth: 180,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  menuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  menuItemText: {
    fontSize: 16,
    color: '#FFFFFF',
    marginLeft: 12,
    flex: 1,
  },
  menuBadge: {
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  menuBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  toggleIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginLeft: 8,
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
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
  chatHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatHeaderButton: {
    marginLeft: 16,
    padding: 4,
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