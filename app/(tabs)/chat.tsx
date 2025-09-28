// app/(tabs)/chat.tsx - Fixed version
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useVoiceChat } from '@/hooks/useVoiceChat';
import { useColorScheme } from '@/hooks/useColorScheme';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { ChatMessage } from '@/components/ChatMessage';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

export default function ChatScreen() {
  const colorScheme = useColorScheme();
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);
  
  const { 
    messages, 
    sendMessage: sendTextMessage, 
    isLoading: isChatLoading,
    clearChat, 
    isPlayingAudio,
    // Voice functionality
    isVoiceMode,
    isListening,
    isProcessing,
    startListening,
    stopListening,
    sendVoiceMessage,
    toggleVoiceMode,
    lastVoiceTranscript
  } = useVoiceChat();

  // Handle sending text message
  const handleSendMessage = async () => {
    if (!inputText.trim() || isChatLoading) return;
    
    try {
      await sendTextMessage(inputText.trim());
      setInputText('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  // Handle voice recording
  const handleVoicePress = async () => {
    try {
      if (isListening) {
        console.log('🛑 Stopping voice recording');
        await stopListening();
      } else if (!isProcessing && !isChatLoading) {
        console.log('🎤 Starting voice recording');
        await startListening();
      }
    } catch (error) {
      console.error('Voice recording error:', error);
    }
  };

  // Render individual message
  const renderMessage = ({ item }: { item: Message }) => (
    <ChatMessage message={item} />
  );

  // Render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <ThemedText style={styles.emptyTitle}>Welcome to OZZU Chat</ThemedText>
      <ThemedText style={styles.emptySubtitle}>
        Start a conversation by typing a message or using voice input
      </ThemedText>
    </View>
  );

  // Render header
  const renderHeader = () => (
    <ThemedView style={styles.header}>
      <ThemedText style={styles.headerTitle}>OZZU</ThemedText>
      <TouchableOpacity
        onPress={clearChat}
        style={styles.clearButton}
      >
        <Ionicons 
          name="trash-outline" 
          size={20} 
          color={Colors[colorScheme ?? 'light'].textSecondary} 
        />
      </TouchableOpacity>
    </ThemedView>
  );

  // Enhanced input area with voice button
  const renderInputArea = () => (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ThemedView style={styles.inputContainer}>
        <ThemedView style={styles.inputWrapper}>
          {/* Voice Mode Toggle */}
          <TouchableOpacity
            onPress={toggleVoiceMode}
            style={[
              styles.voiceModeToggle,
              {
                backgroundColor: isVoiceMode 
                  ? Colors[colorScheme ?? 'light'].primary 
                  : 'transparent',
                borderColor: Colors[colorScheme ?? 'light'].primary,
              }
            ]}
          >
            <Ionicons 
              name={isVoiceMode ? "mic" : "mic-outline"} 
              size={20} 
              color={isVoiceMode ? 'white' : Colors[colorScheme ?? 'light'].primary} 
            />
          </TouchableOpacity>

          {isVoiceMode ? (
            // Voice Input Mode
            <TouchableOpacity
              onPress={handleVoicePress}
              disabled={isProcessing || isChatLoading}
              style={[
                styles.voiceButton,
                {
                  backgroundColor: isListening 
                    ? '#ff4757' 
                    : Colors[colorScheme ?? 'light'].primary,
                }
              ]}
            >
              <View style={styles.voiceButtonContent}>
                <Ionicons 
                  name={isListening ? "stop" : "mic"} 
                  size={24} 
                  color="white" 
                />
              </View>
            </TouchableOpacity>
          ) : (
            // Text Input Mode
            <>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    color: Colors[colorScheme ?? 'light'].text,
                    backgroundColor: Colors[colorScheme ?? 'light'].backgroundSecondary || '#1a1a1a',
                    borderColor: inputText.trim() 
                      ? Colors[colorScheme ?? 'light'].primary 
                      : Colors[colorScheme ?? 'light'].border || '#333',
                  }
                ]}
                value={inputText}
                onChangeText={setInputText}
                placeholder="Message OZZU..."
                placeholderTextColor={Colors[colorScheme ?? 'light'].textSecondary || '#666'}
                multiline
                maxLength={1000}
                editable={!isChatLoading}
                onSubmitEditing={handleSendMessage}
              />
              
              <TouchableOpacity
                onPress={handleSendMessage}
                disabled={!inputText.trim() || isChatLoading}
                style={[
                  styles.sendButton,
                  {
                    backgroundColor: inputText.trim() && !isChatLoading 
                      ? Colors[colorScheme ?? 'light'].primary 
                      : Colors[colorScheme ?? 'light'].border || '#333',
                  }
                ]}
              >
                <Ionicons 
                  name={isChatLoading ? "hourglass" : "send"} 
                  size={20} 
                  color={inputText.trim() && !isChatLoading ? 'white' : Colors[colorScheme ?? 'light'].textSecondary || '#666'}
                />
              </TouchableOpacity>
            </>
          )}
        </ThemedView>

        {/* Voice Status Indicator */}
        {(isListening || isProcessing) && (
          <ThemedView style={styles.voiceStatus}>
            <ThemedText style={styles.voiceStatusText}>
              {isListening ? '🎤 Listening...' : '⏳ Processing voice...'}
            </ThemedText>
          </ThemedView>
        )}

        {/* Last Transcription Display */}
        {lastVoiceTranscript && (
          <ThemedView style={styles.transcriptionPreview}>
            <ThemedText style={styles.transcriptionText}>
              You said: "{lastVoiceTranscript}"
            </ThemedText>
          </ThemedView>
        )}
      </ThemedView>
    </KeyboardAvoidingView>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}>
      {/* Header */}
      {renderHeader()}
      
      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        style={styles.messagesList}
        contentContainerStyle={[
          styles.messagesContent,
          messages.length === 0 && styles.emptyMessagesContent
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmptyState}
      />

      {/* Enhanced Input Area with Voice */}
      {renderInputArea()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#667eea',
  },
  clearButton: {
    padding: 8,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 16,
  },
  emptyMessagesContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.7,
    paddingHorizontal: 40,
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  voiceModeToggle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxHeight: 100,
    fontSize: 16,
  },
  voiceButton: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceStatus: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    borderRadius: 8,
    marginTop: 8,
  },
  voiceStatusText: {
    fontSize: 14,
    color: '#667eea',
    textAlign: 'center',
  },
  transcriptionPreview: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 8,
    marginTop: 8,
  },
  transcriptionText: {
    fontSize: 12,
    fontStyle: 'italic',
    opacity: 0.7,
  },
});