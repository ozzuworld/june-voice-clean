// app/(tabs)/chat.tsx - ENHANCED with voice input button
import { useState, useRef } from 'react';
import { TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useVoiceChat } from '@/hooks/useVoiceChat'; // NEW import

export default function ChatScreen() {
  const { 
    // Existing chat functionality
    messages, 
    sendMessage: sendTextMessage, 
    isLoading: isChatLoading,
    clearChat, 
    isPlayingAudio,
    // NEW: Voice functionality
    isVoiceMode,
    isListening,
    isProcessing,
    startListening,
    stopListening,
    sendVoiceMessage,
    toggleVoiceMode,
    lastVoiceTranscript
  } = useVoiceChat();

  // ... existing state and functions ...

  // NEW: Handle voice recording
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

  // NEW: Enhanced input area with voice button
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
              <Animated.View style={styles.voiceButtonContent}>
                <Ionicons 
                  name={isListening ? "stop" : "mic"} 
                  size={24} 
                  color="white" 
                />
              </Animated.View>
            </TouchableOpacity>
          ) : (
            // Text Input Mode
            <>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    color: Colors[colorScheme ?? 'light'].text,
                    backgroundColor: Colors[colorScheme ?? 'light'].backgroundSecondary,
                    borderColor: inputText.trim() 
                      ? Colors[colorScheme ?? 'light'].primary 
                      : Colors[colorScheme ?? 'light'].border,
                  }
                ]}
                value={inputText}
                onChangeText={setInputText}
                placeholder="Message OZZU..."
                placeholderTextColor={Colors[colorScheme ?? 'light'].textSecondary}
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
                      : Colors[colorScheme ?? 'light'].border,
                  }
                ]}
              >
                <Ionicons 
                  name={isChatLoading ? "hourglass" : "send"} 
                  size={20} 
                  color={inputText.trim() && !isChatLoading ? 'white' : Colors[colorScheme ?? 'light'].textSecondary}
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
      {/* ... existing header ... */}
      
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

// NEW: Additional styles for voice integration
const additionalStyles = StyleSheet.create({
  voiceModeToggle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
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
