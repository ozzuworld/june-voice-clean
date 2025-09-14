// src/components/ChatMessage.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import type { Message } from '@/types/chat.types';

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
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
        {message.isVoice && (
          <ThemedText style={[styles.voiceIndicator, { color: colors.success }]}>
            🎤 Voice message
          </ThemedText>
        )}
        
        <ThemedText style={[
          styles.messageText,
          { color: message.isUser ? 'white' : colors.text }
        ]}>
          {message.text}
        </ThemedText>
      </ThemedView>
      
      <ThemedText style={[styles.timestamp, { color: colors.textSecondary }]}>
        {message.timestamp.toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit' 
        })}
      </ThemedText>
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
  voiceIndicator: {
    fontSize: 12,
    marginBottom: 4,
    fontWeight: '600',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  timestamp: {
    fontSize: 11,
    alignSelf: 'center',
  },
});