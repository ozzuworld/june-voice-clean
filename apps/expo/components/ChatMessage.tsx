// components/ChatMessage.tsx - Enhanced with audio indicators
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  status?: 'sending' | 'sent' | 'error';
  isVoice?: boolean;
  hasAudio?: boolean; // NEW: Indicates if message has audio
}

interface ChatMessageProps {
  message: Message;
  isPlayingAudio?: boolean; // NEW: Indicates if this message's audio is playing
}

export function ChatMessage({ message, isPlayingAudio = false }: ChatMessageProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View style={[
      styles.messageContainer,
      message.isUser ? styles.userMessage : styles.botMessage
    ]}>
      <ThemedView style={[
        styles.messageBubble,
        message.isUser 
          ? { backgroundColor: colors.primary }
          : { backgroundColor: colors.backgroundSecondary, borderColor: colors.border, borderWidth: 1 }
      ]}>
        {/* Voice/Audio Indicators */}
        {message.isVoice && (
          <ThemedText style={[styles.indicator, { color: colors.success }]}>
            🎤 Voice message
          </ThemedText>
        )}
        
        {message.hasAudio && (
          <ThemedText style={[styles.indicator, { color: colors.primary }]}>
            {isPlayingAudio ? '🔊 Playing...' : '🔊 Audio available'}
          </ThemedText>
        )}
        
        <ThemedText style={[
          styles.messageText,
          { color: message.isUser ? 'white' : colors.text }
        ]}>
          {message.text}
        </ThemedText>
      </ThemedView>
      
      <View style={styles.messageFooter}>
        <ThemedText style={[styles.timestamp, { color: colors.textSecondary }]}>
          {message.timestamp.toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </ThemedText>
        
        {/* Status indicators */}
        {message.status === 'sending' && (
          <ThemedText style={[styles.statusIcon, { color: colors.textSecondary }]}>
            ⏳
          </ThemedText>
        )}
        {message.status === 'sent' && message.isUser && (
          <ThemedText style={[styles.statusIcon, { color: colors.success }]}>
            ✓
          </ThemedText>
        )}
        {message.status === 'error' && (
          <ThemedText style={[styles.statusIcon, { color: colors.danger }]}>
            ❌
          </ThemedText>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
    borderRadius: 20,
    marginBottom: 4,
  },
  indicator: {
    fontSize: 12,
    marginBottom: 4,
    fontWeight: '600',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  timestamp: {
    fontSize: 11,
  },
  statusIcon: {
    fontSize: 11,
  },
});