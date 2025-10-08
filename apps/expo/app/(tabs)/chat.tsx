// app/(tabs)/chat.tsx - Enhanced Ring Design with REAL Audio Streaming
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
import * as FileSystem from 'expo-file-system';
import { useAuth } from '@/hooks/useAuth';
import { useWebSocketChat } from '@/hooks/useWebSocketChat';

const { width, height } = Dimensions.get('window');

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  status?: 'sending' | 'sent' | 'error';
  audioData?: string;
  isVoice?: boolean;
}

export default function ChatScreen() {
  const { user, signOut, accessToken, isAuthenticated, signIn, isLoading, error, clearError } = useAuth();
  const { 
    isConnected, 
    messages, 
    isProcessing, 
    audioStreamState,
    sessionId,
    audioPreferencesSet, // NEW
    connect,
    sendTextMessage,
    sendVoiceMessage,
    sendAudioChunk, // NEW
    startAudioStreaming: startStreamingMode, // NEW
    stopAudioStreaming: stopStreamingMode, // NEW
  } = useWebSocketChat();
  
  const [isListening, setIsListening] = useState(false);
  const [isChatVisible, setIsChatVisible] = useState(false);
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [isConversationMode, setIsConversationMode] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  
  const flatListRef = useRef<FlatList>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const streamingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const chunkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const recordingStartTime = useRef<number>(0);
  const lastChunkTime = useRef<number>(0);
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

  // Connect WebSocket when authenticated
  useEffect(() => {
    if (isAuthenticated && accessToken) {
      console.log('🔌 [CHAT] Connecting WebSocket...'); 
      connect();
    }
  }, [isAuthenticated, accessToken, connect]);

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

  // Extract real audio chunks from the ongoing recording
  const extractAudioChunk = useCallback(async () => {
    if (!recordingRef.current || !isStreaming) return;

    try {
      const currentTime = Date.now();
      
      // Check if we have recorded enough audio for a chunk (1 second minimum)
      if (currentTime - lastChunkTime.current < 1000) return;

      console.log('🎤 [REAL AUDIO] Extracting audio chunk from ongoing recording...');

      // Get the current recording status
      const status = await recordingRef.current.getStatusAsync();
      
      if (!status.isRecording) return;

      console.log('🎤 [REAL AUDIO] Recording duration:', status.durationMillis, 'ms');

      // Temporarily pause and get the current audio data
      await recordingRef.current.pauseAsync();
      const tempUri = recordingRef.current.getURI();
      
      if (tempUri) {
        // Read the current audio file as base64
        const audioBase64 = await FileSystem.readAsStringAsync(tempUri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        // Convert base64 to ArrayBuffer for WebSocket
        const binaryString = atob(audioBase64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        console.log('🎤 [REAL AUDIO] Extracted chunk size:', bytes.length, 'bytes');
        
        // Send the real audio chunk via WebSocket
        const sent = sendAudioChunk(bytes.buffer);
        
        if (sent) {
          console.log('✅ [REAL AUDIO] Real audio chunk sent successfully');
          lastChunkTime.current = currentTime;
        } else {
          console.log('⏳ [REAL AUDIO] Real audio chunk queued for later sending');
        }
      }

      // Resume recording
      await recordingRef.current.startAsync();
      
    } catch (error) {
      console.error('❌ [REAL AUDIO] Error extracting audio chunk:', error);
      // Continue recording even if chunk extraction fails
      try {
        if (recordingRef.current) {
          await recordingRef.current.startAsync();
        }
      } catch (resumeError) {
        console.error('❌ [REAL AUDIO] Error resuming recording:', resumeError);
      }
    }
  }, [isStreaming, sendAudioChunk]);

  // Real-time Audio Streaming Functions - UPDATED for REAL audio
  const startAudioStreaming = async () => {
    try {
      console.log('🎤 [AUDIO DEBUG] Starting REAL audio streaming...');
      
      // Check WebSocket connection first
      if (!isConnected) {
        console.error('❌ [AUDIO DEBUG] WebSocket not connected');
        Alert.alert('Not Connected', 'Please wait for connection to establish');
        return;
      }

      // Request audio permissions first
      console.log('🎤 [AUDIO DEBUG] Requesting audio permissions...');
      const { status } = await Audio.requestPermissionsAsync();
      
      if (status !== 'granted') {
        console.error('❌ [AUDIO DEBUG] Audio permission denied');
        Alert.alert('Permission Required', 'Please grant microphone permission');
        return;
      }
      
      console.log('✅ [AUDIO DEBUG] Audio permissions granted');

      // Configure audio mode
      console.log('🎤 [AUDIO DEBUG] Configuring audio mode...');
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      console.log('✅ [AUDIO DEBUG] Audio mode configured');

      // Start real-time streaming mode in WebSocket
      startStreamingMode();

      // Start the recording with streaming-optimized settings
      console.log('🎤 [AUDIO DEBUG] Starting actual audio recording...');
      
      const recordingOptions = {
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
      };

      const { recording } = await Audio.Recording.createAsync(recordingOptions);
      recordingRef.current = recording;
      recordingStartTime.current = Date.now();
      lastChunkTime.current = Date.now();
      
      setIsListening(true);
      setIsStreaming(true);

      console.log('✅ [AUDIO DEBUG] Audio recording started successfully');
      console.log('🎤 Started REAL audio streaming');

      // Start monitor for connection health
      startStreamingMonitor();
      
      // Start real audio chunk extraction
      startRealAudioChunking();

    } catch (error) {
      console.error('❌ [AUDIO DEBUG] Error starting real audio streaming:', error);
      Alert.alert('Streaming Error', 'Failed to start voice streaming');
      setIsStreaming(false);
      setIsListening(false);
    }
  };

  const startStreamingMonitor = () => {
    if (streamingIntervalRef.current) {
      clearInterval(streamingIntervalRef.current);
    }

    // Monitor connection and streaming status every 2 seconds
    streamingIntervalRef.current = setInterval(() => {
      if (!isConnected) {
        console.error('❌ [AUDIO DEBUG] WebSocket connection lost during streaming');
        stopAudioStreaming();
        return;
      }
      console.log('🔄 [AUDIO DEBUG] Streaming monitor - connection alive, chunks sent:', audioStreamState.sentChunks);
    }, 2000);
  };

  const startRealAudioChunking = () => {
    if (chunkIntervalRef.current) {
      clearInterval(chunkIntervalRef.current);
    }

    // Extract real audio chunks every 1.5 seconds
    chunkIntervalRef.current = setInterval(() => {
      extractAudioChunk();
    }, 1500);
  };

  // Updated stop function
  const stopAudioStreaming = async () => {
    try {
      console.log('🛑 [AUDIO DEBUG] Stopping real audio streaming...');

      // Clear streaming intervals
      if (streamingIntervalRef.current) {
        clearInterval(streamingIntervalRef.current);
        streamingIntervalRef.current = null;
      }

      if (chunkIntervalRef.current) {
        clearInterval(chunkIntervalRef.current);
        chunkIntervalRef.current = null;
      }

      setIsListening(false);
      setIsStreaming(false);
      
      // Stop streaming mode in WebSocket
      stopStreamingMode();

      // Stop and process final recording
      if (recordingRef.current) {
        console.log('🛑 [AUDIO DEBUG] Stopping recording...');
        await recordingRef.current.stopAndUnloadAsync();
        const uri = recordingRef.current.getURI();
        recordingRef.current = null;

        if (uri) {
          console.log('🎤 [AUDIO DEBUG] Processing final recorded audio:', uri);
          
          // Send the final complete recording for transcription
          await sendVoiceMessage(uri);
        }
      }

      console.log('✅ [AUDIO DEBUG] Real audio streaming stopped successfully');

    } catch (error) {
      console.error('❌ [AUDIO DEBUG] Error stopping real audio streaming:', error);
    }
  };

  // Handle main ring tap - Now uses real-time streaming
  const handleMainRingPress = async () => {
    if (!isConnected) {
      Alert.alert('Not Connected', 'Please wait for connection to establish');
      return;
    }

    if (isConversationMode || isStreaming) {
      // Stop conversation mode and streaming
      setIsConversationMode(false);
      if (isStreaming) {
        await stopAudioStreaming();
      }
    } else {
      // Start conversation mode with real-time streaming
      setIsConversationMode(true);
      await startAudioStreaming();
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
        
        {item.isVoice && (
          <View style={styles.voiceIndicator}>
            <Ionicons name="mic" size={12} color="rgba(255,255,255,0.6)" />
          </View>
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

  // Show authentication screen if not authenticated
  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.authContainer}>
          <View style={styles.authContent}>
            <Text style={styles.authTitle}>June Voice Assistant</Text>
            <Text style={styles.authSubtitle}>Please authenticate to continue</Text>
            
            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity onPress={clearError} style={styles.errorDismiss}>
                  <Ionicons name="close" size={16} color="#FF3B30" />
                </TouchableOpacity>
              </View>
            )}
            
            <TouchableOpacity 
              style={[styles.authButton, isLoading && styles.authButtonDisabled]} 
              onPress={signIn}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.authButtonText}>Sign In with Keycloak</Text>
              )}
            </TouchableOpacity>
            
            <Text style={styles.authFooter}>Secure authentication via Keycloak</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

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
            <Text style={styles.menuItemText}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </Text>
          </View>

          {/* Audio Preferences Status */}
          <View style={styles.menuItem}>
            <View style={[
              styles.connectionDot, 
              { backgroundColor: audioPreferencesSet ? '#34C759' : '#FF9500' }
            ]} />
            <Text style={styles.menuItemText}>
              Audio Prefs: {audioPreferencesSet ? 'Set' : 'Pending'}
            </Text>
          </View>

          {/* Session ID */}
          {sessionId && (
            <View style={styles.menuItem}>
              <Ionicons name="radio" size={20} color="#666" />
              <Text style={[styles.menuItemText, { fontSize: 12, color: '#666' }]}>
                Session: {sessionId.slice(-8)}
              </Text>
            </View>
          )}

          {/* Streaming Status */}
          <View style={styles.menuItem}>
            <Ionicons name="radio" size={20} color={isStreaming ? '#34C759' : '#666'} />
            <Text style={styles.menuItemText}>REAL Audio Streaming</Text>
            <View style={[
              styles.toggleIndicator,
              { backgroundColor: isStreaming ? '#34C759' : '#666' }
            ]} />
          </View>

          {/* Audio Stream Progress */}
          <View style={styles.menuItem}>
            <Ionicons name="musical-notes" size={20} color="#FF9500" />
            <Text style={styles.menuItemText}>
              Sent: {audioStreamState.sentChunks} | Recv: {audioStreamState.receivedChunks}
            </Text>
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
          
          {/* Sign Out */}
          <TouchableOpacity
            onPress={() => {
              signOut();
              toggleMenu();
            }}
            style={[styles.menuItem, { borderTopWidth: 1, borderTopColor: '#333', marginTop: 8, paddingTop: 16 }]}
          >
            <Ionicons name="log-out-outline" size={20} color="#FF3B30" />
            <Text style={[styles.menuItemText, { color: '#FF3B30' }]}>Sign Out</Text>
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
              <TouchableOpacity onPress={() => {/* Clear messages */}} style={styles.chatHeaderButton}>
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
  authContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  authContent: {
    alignItems: 'center',
    maxWidth: 300,
    width: '100%',
  },
  authTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  authSubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    marginBottom: 32,
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: '#FF3B3020',
    borderColor: '#FF3B30',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
    flex: 1,
  },
  errorDismiss: {
    marginLeft: 8,
    padding: 4,
  },
  authButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    minWidth: 200,
    alignItems: 'center',
    marginBottom: 16,
  },
  authButtonDisabled: {
    backgroundColor: '#007AFF80',
  },
  authButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  authFooter: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
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
  voiceIndicator: {
    position: 'absolute',
    bottom: 4,
    right: 8,
    padding: 2,
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
