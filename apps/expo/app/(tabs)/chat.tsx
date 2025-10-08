import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Audio } from 'expo-av';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import ChatModal from '../../components/ChatModal';
import MenuModal from '../../components/MenuModal';

WebBrowser.maybeCompleteAuthSession();

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

export default function ChatScreen() {
  // Connection states
  const [isConnected, setIsConnected] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [webSocket, setWebSocket] = useState<WebSocket | null>(null);
  
  // Audio states
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentRecording, setCurrentRecording] = useState<Audio.Recording | null>(null);
  const [isAudioStreaming, setIsAudioStreaming] = useState(false);
  const [streamingInterval, setStreamingInterval] = useState<NodeJS.Timeout | null>(null);
  
  // Conversation states
  const [isConversationMode, setIsConversationMode] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  
  // UI states
  const [isChatVisible, setIsChatVisible] = useState(false);
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  
  // Animation values
  const glowRingScale = useRef(new Animated.Value(1)).current;
  const glowRingOpacity = useRef(new Animated.Value(0.3)).current;
  const pulseRingScale = useRef(new Animated.Value(1)).current;
  const pulseRingOpacity = useRef(new Animated.Value(0)).current;
  const mainRingScale = useRef(new Animated.Value(1)).current;
  const mainRingOpacity = useRef(new Animated.Value(0.8)).current;
  const spinValue = useRef(new Animated.Value(0)).current;

  // Auth configuration
  const discovery = AuthSession.useAutoDiscovery('https://idp.ozzu.world/realms/allsafe');
  const clientId = 'june-mobile-app';
  const redirectUri = AuthSession.makeRedirectUri({
    scheme: 'exp',
    path: '/auth/callback',
  });

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId,
      scopes: ['openid', 'profile', 'email', 'orchestrator-aud'],
      redirectUri,
      responseType: AuthSession.ResponseType.Code,
      codeChallenge: AuthSession.useAuthRequest.createChallengeAsync().code_challenge,
      codeChallengeMethod: AuthSession.CodeChallengeMethod.S256,
    },
    discovery
  );

  // Debug auth request
  useEffect(() => {
    if (request && discovery) {
      console.log('🔍 [AUTH REQUEST DEBUG] ==================');
      console.log('🔍 Client ID:', request.clientId);
      console.log('🔍 Redirect URI:', request.redirectUri);
      console.log('🔍 Discovery URL:', discovery.discoveryDocument?.issuer);
      console.log('🔍 Auth Endpoint:', discovery.discoveryDocument?.authorizationEndpoint);
      console.log('🔍 Token Endpoint:', discovery.discoveryDocument?.tokenEndpoint);
      console.log('🔍 Request URL that will be opened:', request.url);
      console.log('🔍 ========================================');
    }
  }, [request, discovery]);

  // Handle auth response
  useEffect(() => {
    if (response?.type === 'success') {
      const { code } = response.params;
      exchangeCodeForToken(code);
    }
  }, [response]);

  const exchangeCodeForToken = async (code: string) => {
    try {
      if (!discovery?.discoveryDocument?.tokenEndpoint) {
        throw new Error('Token endpoint not found');
      }

      const tokenResult = await AuthSession.exchangeCodeAsync(
        {
          clientId,
          code,
          redirectUri,
          extraParams: {},
        },
        discovery
      );

      if (tokenResult.accessToken) {
        await AsyncStorage.setItem('access_token', tokenResult.accessToken);
        setIsAuthenticated(true);
        connectWebSocket(tokenResult.accessToken);
      }
    } catch (error) {
      console.error('Token exchange error:', error);
      Alert.alert('Authentication Error', 'Failed to complete authentication');
    }
  };

  const connectWebSocket = (token: string) => {
    console.log('🔌 Connecting WebSocket...');
    
    const ws = new WebSocket('wss://api.ozzu.world/ws/', [], {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    ws.onopen = () => {
      console.log('✅ WebSocket connected');
    };

    ws.onmessage = (event) => {
      console.log('📨 [WEBSOCKET DEBUG] Raw message received:', event.data);
      
      try {
        const message = JSON.parse(event.data);
        console.log('📨 [WEBSOCKET DEBUG] Parsed message:', message);
        
        if (message.type === 'connected') {
          console.log('✅ [WEBSOCKET DEBUG] Connection confirmed with features:', message.features);
          console.log('✅ WebSocket session established');
          setIsConnected(true);
        }
        
        if (message.type === 'audio_response' && message.audio_url) {
          handleAudioResponse(message.audio_url, message.text || '');
        }
        
        if (message.type === 'text_response') {
          addMessage(message.text, false);
        }
        
        if (message.type === 'error') {
          console.error('❌ WebSocket error:', message.message);
          Alert.alert('Error', message.message);
        }
        
      } catch (error) {
        console.error('❌ [WEBSOCKET DEBUG] Error parsing message:', error);
      }
    };

    ws.onclose = (event) => {
      console.log('🔌 [WEBSOCKET DEBUG] Connection closed with code:', event.code, 'reason:', event.reason);
      setIsConnected(false);
      setIsListening(false);
      setIsProcessing(false);
      setIsAudioStreaming(false);
    };

    ws.onerror = (error) => {
      console.error('❌ [WEBSOCKET DEBUG] WebSocket error:', error);
    };

    setWebSocket(ws);
  };

  const startAudioStreaming = async () => {
    try {
      console.log('🎤 [AUDIO DEBUG] Starting audio streaming...');
      
      // Check WebSocket connection first
      if (!webSocket || webSocket.readyState !== WebSocket.OPEN) {
        console.error('❌ [AUDIO DEBUG] WebSocket not connected');
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

      // Send audio_start message with detailed logging
      const audioStartMessage = {
        type: 'audio_start',
        sample_rate: 16000,
        channels: 1,
        format: 'wav',
        timestamp: new Date().toISOString()
      };

      console.log('📨 [AUDIO DEBUG] Sending audio_start message:', audioStartMessage);
      
      webSocket.send(JSON.stringify(audioStartMessage));
      
      console.log('✅ [AUDIO DEBUG] Audio start message sent successfully');

      // Set streaming state
      setIsAudioStreaming(true);
      setIsListening(true);
      console.log('✅ [AUDIO DEBUG] Audio streaming state set to true');

      // Start the recording
      console.log('🎤 [AUDIO DEBUG] Starting actual audio recording...');
      
      const recordingOptions = {
        android: {
          extension: '.wav',
          outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_DEFAULT,
          audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_DEFAULT,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: '.wav',
          audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_HIGH,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
      };

      const { recording } = await Audio.Recording.createAsync(recordingOptions);
      setCurrentRecording(recording);
      
      console.log('✅ [AUDIO DEBUG] Audio recording started successfully');
      console.log('🎤 Started real-time audio streaming');

      // Start streaming interval (but don't send chunks yet - just keep alive)
      const interval = setInterval(() => {
        if (webSocket && webSocket.readyState === WebSocket.OPEN) {
          console.log('🔄 [AUDIO DEBUG] Streaming interval - connection alive');
          // For now, just log - we'll implement actual chunk sending later
        } else {
          console.error('❌ [AUDIO DEBUG] WebSocket connection lost during streaming');
          clearInterval(interval);
        }
      }, 1000); // Check every 1 second instead of sending chunks

      setStreamingInterval(interval);

    } catch (error) {
      console.error('❌ [AUDIO DEBUG] Error starting audio streaming:', error);
      
      // Clean up on error
      setIsAudioStreaming(false);
      setIsListening(false);
      
      if (currentRecording) {
        try {
          await currentRecording.stopAndUnloadAsync();
          setCurrentRecording(null);
        } catch (cleanupError) {
          console.error('❌ [AUDIO DEBUG] Error cleaning up recording:', cleanupError);
        }
      }
    }
  };

  const stopAudioStreaming = async () => {
    try {
      console.log('🛑 [AUDIO DEBUG] Stopping audio streaming...');

      // Clear streaming interval
      if (streamingInterval) {
        clearInterval(streamingInterval);
        setStreamingInterval(null);
      }

      // Stop recording
      if (currentRecording) {
        console.log('🛑 [AUDIO DEBUG] Stopping recording...');
        await currentRecording.stopAndUnloadAsync();
        setCurrentRecording(null);
      }

      // Send audio_end message
      if (webSocket && webSocket.readyState === WebSocket.OPEN) {
        const audioEndMessage = {
          type: 'audio_end',
          timestamp: new Date().toISOString()
        };
        
        console.log('📨 [AUDIO DEBUG] Sending audio_end message:', audioEndMessage);
        webSocket.send(JSON.stringify(audioEndMessage));
      }

      setIsAudioStreaming(false);
      setIsListening(false);
      setIsProcessing(true);
      console.log('✅ [AUDIO DEBUG] Audio streaming stopped successfully');
      console.log('🛾 Stopped audio streaming');

    } catch (error) {
      console.error('❌ [AUDIO DEBUG] Error stopping audio streaming:', error);
    }
  };

  const handleMainRingPress = async () => {
    if (!isConnected) return;

    if (isAudioStreaming) {
      await stopAudioStreaming();
    } else {
      await startAudioStreaming();
    }
  };

  const handleAudioResponse = async (audioUrl: string, text: string) => {
    try {
      setIsProcessing(false);
      
      if (text) {
        addMessage(text, false);
      }

      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: true }
      );

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          if (isConversationMode) {
            setTimeout(() => startAudioStreaming(), 1000);
          }
        }
      });
    } catch (error) {
      console.error('Audio playback error:', error);
      setIsProcessing(false);
    }
  };

  const addMessage = (text: string, isUser: boolean) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      text,
      isUser,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, newMessage]);
  };

  // Animation effects
  useEffect(() => {
    if (isListening) {
      // Listening animations
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseRingScale, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseRingScale, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();

      Animated.timing(pulseRingOpacity, {
        toValue: 0.6,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Rotation for streaming
      Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: isAudioStreaming ? 2000 : 3000, // Faster rotation during streaming
          useNativeDriver: true,
        })
      ).start();
    } else {
      Animated.timing(pulseRingOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }

    if (isProcessing) {
      // Processing rotation
      Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        })
      ).start();
    }

    if (isConversationMode && !isListening && !isProcessing) {
      // Breathing effect for conversation mode
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
    }
  }, [isListening, isProcessing, isConversationMode, isAudioStreaming]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const getRingColor = () => {
    if (!isConnected) return '#666';
    if (isListening) return '#FF4444';
    if (isProcessing) return '#FF8800';
    if (isConversationMode) return '#00AA00';
    return '#4A9EFF';
  };

  const authenticate = () => {
    promptAsync();
  };

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <View style={styles.authContainer}>
          <Text style={styles.authTitle}>June Voice Assistant</Text>
          <Text style={styles.authSubtitle}>Please authenticate to continue</Text>
          <TouchableOpacity style={styles.authButton} onPress={authenticate}>
            <Text style={styles.authButtonText}>Sign In with Keycloak</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Menu Button */}
      <TouchableOpacity
        style={styles.menuButton}
        onPress={() => setIsMenuVisible(true)}
      >
        <Ionicons name="menu" size={24} color="#fff" />
      </TouchableOpacity>

      {/* Clean Main Interface - Enhanced Ring Design */}
      <View style={styles.mainContainer}>
        {/* Enhanced Multi-Layer Ring System */}
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
          
          {/* Pulse Ring (only during listening) */}
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
              {isListening && (
                <View style={styles.listeningIndicator}>
                  <Animated.View style={[styles.waveBar, { backgroundColor: getRingColor() }]} />
                  <Animated.View style={[styles.waveBar, { backgroundColor: getRingColor() }]} />
                  <Animated.View style={[styles.waveBar, { backgroundColor: getRingColor() }]} />
                  <Animated.View style={[styles.waveBar, { backgroundColor: getRingColor() }]} />
                  {isAudioStreaming && (
                    <Animated.View style={[styles.streamingBar, { backgroundColor: getRingColor() }]} />
                  )}
                </View>
              )}
              {isConversationMode && !isListening && !isProcessing && (
                <View style={styles.conversationIndicator}>
                  <View style={[styles.conversationDot, { backgroundColor: getRingColor() }]} />
                  <View style={[styles.conversationDot, { backgroundColor: getRingColor() }]} />
                  <View style={[styles.conversationDot, { backgroundColor: getRingColor() }]} />
                </View>
              )}
            </View>
          </Animated.View>
        </TouchableOpacity>

        {/* NO STATUS TEXT - COMPLETELY CLEAN! */}
      </View>

      {/* Modals */}
      <ChatModal
        visible={isChatVisible}
        onClose={() => setIsChatVisible(false)}
        messages={messages}
      />

      <MenuModal
        visible={isMenuVisible}
        onClose={() => setIsMenuVisible(false)}
        isConnected={isConnected}
        isConversationMode={isConversationMode}
        isAudioStreaming={isAudioStreaming}
        messageCount={messages.length}
        onToggleConversationMode={() => setIsConversationMode(!isConversationMode)}
        onOpenChat={() => {
          setIsMenuVisible(false);
          setIsChatVisible(true);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  authContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  authTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  authSubtitle: {
    fontSize: 16,
    color: '#ccc',
    marginBottom: 30,
  },
  authButton: {
    backgroundColor: '#4A9EFF',
    padding: 15,
    borderRadius: 10,
    minWidth: 200,
    alignItems: 'center',
  },
  authButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  menuButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    zIndex: 1000,
    padding: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 25,
  },
  mainContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringContainer: {
    width: 300,
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
  },
  outerGlowRing: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    borderWidth: 2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  pulseRing: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    borderWidth: 3,
  },
  mainRing: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
    elevation: 8,
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
    gap: 4,
  },
  waveBar: {
    width: 4,
    height: 20,
    borderRadius: 2,
  },
  streamingBar: {
    width: 4,
    height: 24,
    borderRadius: 2,
    marginLeft: 2,
  },
  conversationIndicator: {
    flexDirection: 'row',
    gap: 8,
  },
  conversationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
