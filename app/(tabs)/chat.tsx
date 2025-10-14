/**
 * Chat Screen - UPDATED FOR LIVEKIT + JUNE PLATFORM
 * 
 * Modern voice chat interface using LiveKit WebRTC and June orchestrator backend
 */

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
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { useWebRTC } from '@/hooks/useWebRTC';

const { width, height } = Dimensions.get('window');

export default function ChatScreen() {
  const { user, signOut, isAuthenticated, signIn, isLoading, error: authError, clearError } = useAuth();
  const {
    isConnected,
    isStreaming,
    messages,
    sessionId,
    error: webrtcError,
    connect,
    startStreaming,
    stopStreaming,
  } = useWebRTC();

  const [isChatVisible, setIsChatVisible] = useState(false);
  const [isMenuVisible, setIsMenuVisible] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const chatAnimatedValue = useRef(new Animated.Value(0)).current;
  const menuAnimatedValue = useRef(new Animated.Value(0)).current;

  const mainRingScale = useRef(new Animated.Value(1)).current;
  const mainRingOpacity = useRef(new Animated.Value(0.8)).current;
  const glowRingScale = useRef(new Animated.Value(1)).current;
  const glowRingOpacity = useRef(new Animated.Value(0.3)).current;
  const rotationValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  useEffect(() => {
    if (isAuthenticated) {
      console.log('🔌 Connecting to June platform...');
      connect();
    }
  }, [isAuthenticated, connect]);

  useEffect(() => {
    mainRingScale.stopAnimation();
    glowRingScale.stopAnimation();
    rotationValue.stopAnimation();

    if (!isConnected) {
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
    } else if (isStreaming) {
      Animated.parallel([
        Animated.loop(
          Animated.timing(rotationValue, {
            toValue: 1,
            duration: 2000,
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
      ]).start();
      mainRingOpacity.setValue(1);
      glowRingOpacity.setValue(0.7);
    } else {
      mainRingScale.setValue(1);
      mainRingOpacity.setValue(0.8);
      glowRingOpacity.setValue(0.3);
    }
  }, [isConnected, isStreaming]);

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

  const handleMainRingPress = async () => {
    if (!isConnected) {
      Alert.alert('Not Connected', 'Connecting to June platform...');
      return;
    }

    if (isStreaming) {
      stopStreaming();
    } else {
      try {
        await startStreaming();
      } catch (error: any) {
        Alert.alert('Error', error.message || 'Failed to start voice call');
      }
    }
  };

  const renderMessage = ({ item }: { item: any }) => (
    <View style={[
      styles.messageContainer,
      item.isUser ? styles.userMessage : styles.botMessage
    ]}>
      <View style={[
        styles.messageBubble,
        { backgroundColor: item.isUser ? '#007AFF' : '#2C2C2E' }
      ]}>
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

  const getRingColor = () => {
    if (!isConnected) return '#666666';
    if (isStreaming) return '#FF3B30';
    return '#007AFF';
  };

  const getConnectionStatusText = () => {
    if (!isConnected) return 'Connecting...';
    if (isStreaming) return 'Listening';
    return 'Connected';
  };

  const spin = rotationValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.authContainer}>
          <Text style={styles.authTitle}>June Voice</Text>
          <Text style={styles.authSubtitle}>LiveKit + June Platform Integration</Text>
          {authError && <Text style={styles.errorText}>{authError}</Text>}
          <TouchableOpacity
            style={[styles.authButton, isLoading && styles.authButtonDisabled]}
            onPress={signIn}
            disabled={isLoading}
          >
            {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.authButtonText}>Sign In</Text>}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <SafeAreaView style={styles.container}>
        <View style={styles.mainContainer}>
          <TouchableOpacity
            onPress={handleMainRingPress}
            disabled={!isConnected}
            style={styles.ringContainer}
            activeOpacity={0.8}
          >
            <Animated.View style={[
              styles.outerGlowRing,
              {
                transform: [{ scale: glowRingScale }],
                opacity: glowRingOpacity,
                borderColor: getRingColor(),
                shadowColor: getRingColor(),
              }
            ]} />

            <Animated.View style={[
              styles.mainRing,
              {
                transform: [{ scale: mainRingScale }, { rotate: spin }],
                opacity: mainRingOpacity,
                borderColor: getRingColor(),
                shadowColor: getRingColor(),
              }
            ]}>
              <View style={[styles.innerRing, { backgroundColor: getRingColor() + '10' }]}>
                <Ionicons
                  name={isStreaming ? "mic" : "mic-outline"}
                  size={48}
                  color={getRingColor()}
                />
                <Text style={[styles.statusText, { color: getRingColor() }]}>
                  {isStreaming ? 'Listening...' : 'Tap to talk'}
                </Text>
              </View>
            </Animated.View>
          </TouchableOpacity>

          <View style={styles.statusBadge}>
            <Text style={styles.statusBadgeText}>LiveKit + June</Text>
            <View style={[styles.statusDot, { backgroundColor: isConnected ? '#34C759' : '#FF3B30' }]} />
          </View>
          
          {/* Connection info */}
          <View style={styles.connectionInfo}>
            <Text style={styles.connectionText}>{getConnectionStatusText()}</Text>
            {sessionId && (
              <Text style={styles.sessionText}>Session: {sessionId.substring(0, 8)}...</Text>
            )}
          </View>
        </View>

        {webrtcError && (
          <View style={styles.errorBanner}>
            <Ionicons name="warning" size={16} color="#FF3B30" style={{ marginRight: 8 }} />
            <Text style={styles.errorBannerText}>{webrtcError}</Text>
          </View>
        )}

        <TouchableOpacity onPress={toggleMenu} style={styles.menuButton}>
          <Ionicons name={isMenuVisible ? "close" : "menu"} size={24} color="white" />
        </TouchableOpacity>

        <Animated.View style={[
          styles.menu,
          {
            transform: [{ translateX: menuAnimatedValue.interpolate({ inputRange: [0, 1], outputRange: [-200, 0] }) }],
            opacity: menuAnimatedValue
          }
        ]}>
          <TouchableOpacity onPress={() => { toggleChat(); toggleMenu(); }} style={styles.menuItem}>
            <Ionicons name="chatbubbles" size={20} color="white" />
            <Text style={styles.menuItemText}>Chat</Text>
            {messages.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{messages.length}</Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.menuItem}>
            <View style={[styles.dot, { backgroundColor: isConnected ? '#34C759' : '#FF3B30' }]} />
            <Text style={styles.menuItemText}>{getConnectionStatusText()}</Text>
          </View>
          
          <View style={styles.menuItem}>
            <Ionicons name="server" size={20} color="#8E8E93" />
            <Text style={[styles.menuItemText, { color: '#8E8E93' }]}>api.allsafe.world</Text>
          </View>

          <TouchableOpacity onPress={() => { signOut(); toggleMenu(); }} style={styles.menuItem}>
            <Ionicons name="log-out-outline" size={20} color="#FF3B30" />
            <Text style={[styles.menuItemText, { color: '#FF3B30' }]}>Sign Out</Text>
          </TouchableOpacity>
        </Animated.View>

        <Animated.View style={[
          styles.chatContainer,
          {
            transform: [{ translateY: chatAnimatedValue.interpolate({ inputRange: [0, 1], outputRange: [height, 0] }) }],
            opacity: chatAnimatedValue
          }
        ]}>
          <View style={styles.chatHeader}>
            <Text style={styles.chatTitle}>AI Conversation</Text>
            <TouchableOpacity onPress={toggleChat}>
              <Ionicons name="close" size={20} color="#8E8E93" />
            </TouchableOpacity>
          </View>

          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            style={styles.messagesList}
            contentContainerStyle={styles.messagesContent}
            ListEmptyComponent={() => (
              <View style={styles.emptyState}>
                <Ionicons name="chatbubbles-outline" size={48} color="#48484A" />
                <Text style={styles.emptyText}>No messages yet</Text>
                <Text style={styles.emptySubtext}>Start talking to begin your AI conversation</Text>
              </View>
            )}
          />
        </Animated.View>

        {isMenuVisible && (
          <TouchableOpacity style={styles.overlay} onPress={toggleMenu} activeOpacity={1} />
        )}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  authContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  authTitle: { fontSize: 32, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 8 },
  authSubtitle: { fontSize: 16, color: '#8E8E93', marginBottom: 32, textAlign: 'center' },
  errorText: { color: '#FF3B30', fontSize: 14, marginBottom: 16, textAlign: 'center' },
  authButton: { backgroundColor: '#007AFF', paddingHorizontal: 32, paddingVertical: 16, borderRadius: 12 },
  authButtonDisabled: { opacity: 0.6 },
  authButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  mainContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  ringContainer: { alignItems: 'center', justifyContent: 'center' },
  outerGlowRing: { position: 'absolute', width: 300, height: 300, borderRadius: 150, borderWidth: 1, shadowOpacity: 0.8, shadowRadius: 20, shadowOffset: { width: 0, height: 0 } },
  mainRing: { width: 200, height: 200, borderRadius: 100, borderWidth: 4, shadowOpacity: 0.6, shadowRadius: 15, shadowOffset: { width: 0, height: 0 }, justifyContent: 'center', alignItems: 'center' },
  innerRing: { width: 160, height: 160, borderRadius: 80, justifyContent: 'center', alignItems: 'center' },
  statusText: { marginTop: 8, fontSize: 14, fontWeight: '600' },
  statusBadge: { position: 'absolute', bottom: 120, flexDirection: 'row', alignItems: 'center', backgroundColor: '#1C1C1E', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  statusBadgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600', marginRight: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  connectionInfo: { position: 'absolute', bottom: 80, alignItems: 'center' },
  connectionText: { color: '#FFFFFF', fontSize: 16, fontWeight: '500', marginBottom: 4 },
  sessionText: { color: '#8E8E93', fontSize: 12, fontFamily: 'monospace' },
  errorBanner: { position: 'absolute', top: 60, left: 20, right: 20, backgroundColor: '#FF3B3020', borderColor: '#FF3B30', borderWidth: 1, borderRadius: 8, padding: 12, flexDirection: 'row', alignItems: 'center' },
  errorBannerText: { color: '#FF3B30', fontSize: 14, flex: 1 },
  menuButton: { position: 'absolute', top: 60, left: 20, width: 50, height: 50, borderRadius: 25, backgroundColor: '#007AFF', justifyContent: 'center', alignItems: 'center' },
  menu: { position: 'absolute', top: 120, left: 20, backgroundColor: '#1C1C1E', borderRadius: 12, padding: 16, minWidth: 200 },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.3)' },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  menuItemText: { fontSize: 16, color: '#FFFFFF', marginLeft: 12, flex: 1 },
  badge: { backgroundColor: '#FF3B30', borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center' },
  badgeText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  chatContainer: { position: 'absolute', top: 120, left: 0, right: 0, bottom: 0, backgroundColor: '#1C1C1E', borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  chatHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#2C2C2E' },
  chatTitle: { fontSize: 18, fontWeight: '600', color: '#FFFFFF' },
  messagesList: { flex: 1 },
  messagesContent: { padding: 16, flexGrow: 1 },
  messageContainer: { marginBottom: 16, maxWidth: '85%' },
  userMessage: { alignSelf: 'flex-end' },
  botMessage: { alignSelf: 'flex-start' },
  messageBubble: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 18, marginBottom: 4 },
  messageText: { fontSize: 16, lineHeight: 20, color: '#FFFFFF' },
  voiceIcon: { marginLeft: 8 },
  timestamp: { fontSize: 11, color: '#8E8E93', textAlign: 'center' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 18, color: '#FFFFFF', marginTop: 16, marginBottom: 8 },
  emptySubtext: { fontSize: 14, color: '#8E8E93', textAlign: 'center' },
});