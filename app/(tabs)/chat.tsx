// app/(tabs)/chat.tsx
import { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  TextInput,
  View,
  Animated,
  TouchableOpacity,
} from 'react-native';

import { Button } from '@/components/ui/Button';
import { ChatMessage } from '@/components/ChatMessage';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/hooks/useAuth';
import { useChat } from '@/app/_layout'; // Fixed import - now importing from _layout
import { useColorScheme } from '@/hooks/useColorScheme';
import type { Message } from '@/types/chat.types';

export default function ChatScreen() {
  const colorScheme = useColorScheme();
  const { user, signOut } = useAuth();
  const { messages, sendMessage, isLoading, clearChat } = useChat();
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  const scrollToBottom = () => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const messageText = inputText.trim();
    setInputText('');
    
    await sendMessage(messageText);
    scrollToBottom();
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <ChatMessage message={item} />
  );

  const renderEmptyState = () => (
    <Animated.View style={[styles.emptyState, { opacity: fadeAnim }]}>
      <View style={styles.emptyIconContainer}>
        <ThemedText style={styles.emptyIcon}>💭</ThemedText>
      </View>
      <ThemedText style={styles.emptyTitle}>Start a conversation</ThemedText>
      <ThemedText style={styles.emptySubtitle}>
        Ask me anything or just say hello!
      </ThemedText>
    </Animated.View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}>
      {/* Enhanced Header */}
      <ThemedView style={styles.header}>
        <ThemedView style={styles.headerLeft}>
          <ThemedView style={styles.avatarContainer}>
            <ThemedText style={styles.avatarText}>O</ThemedText>
          </ThemedView>
          <ThemedView>
            <ThemedText style={styles.headerTitle}>OZZU</ThemedText>
            <ThemedText style={styles.headerSubtitle}>
              {user?.name ? `Chat with ${user.name}` : 'Your AI Assistant'}
            </ThemedText>
          </ThemedView>
        </ThemedView>
        
        <ThemedView style={styles.headerActions}>
          {messages.length > 0 && (
            <TouchableOpacity onPress={clearChat} style={styles.clearButton}>
              <ThemedText style={styles.clearButtonText}>Clear</ThemedText>
            </TouchableOpacity>
          )}
          <Button
            title="Sign Out"
            onPress={signOut}
            variant="secondary"
            size="small"
          />
        </ThemedView>
      </ThemedView>

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

      {/* Enhanced Input Area */}
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ThemedView style={styles.inputContainer}>
          <ThemedView style={styles.inputWrapper}>
            <TextInput
              style={[
                styles.textInput,
                {
                  color: Colors[colorScheme ?? 'light'].text,
                  backgroundColor: Colors[colorScheme ?? 'light'].backgroundSecondary,
                  borderColor: inputText.trim() ? Colors[colorScheme ?? 'light'].primary : Colors[colorScheme ?? 'light'].border,
                }
              ]}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Message OZZU..."
              placeholderTextColor={Colors[colorScheme ?? 'light'].textSecondary}
              multiline
              maxLength={1000}
              editable={!isLoading}
              onSubmitEditing={handleSendMessage}
              blurOnSubmit={false}
            />
            
            <TouchableOpacity
              onPress={handleSendMessage}
              disabled={!inputText.trim() || isLoading}
              style={[
                styles.sendButtonCircle,
                {
                  backgroundColor: inputText.trim() && !isLoading 
                    ? Colors[colorScheme ?? 'light'].primary 
                    : Colors[colorScheme ?? 'light'].border,
                }
              ]}
            >
              <ThemedText style={[
                styles.sendIcon,
                { color: inputText.trim() && !isLoading ? '#fff' : Colors[colorScheme ?? 'light'].textSecondary }
              ]}>
                {isLoading ? '⏳' : '↗'}
              </ThemedText>
            </TouchableOpacity>
          </ThemedView>
        </ThemedView>
      </KeyboardAvoidingView>
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
    borderBottomColor: '#e9ecef',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 1,
  },
  headerSubtitle: {
    fontSize: 12,
    opacity: 0.7,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  clearButtonText: {
    fontSize: 14,
    opacity: 0.6,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  emptyMessagesContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyIcon: {
    fontSize: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    opacity: 0.6,
    textAlign: 'center',
    lineHeight: 22,
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  textInput: {
    flex: 1,
    borderWidth: 2,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxHeight: 100,
    fontSize: 16,
    lineHeight: 20,
  },
  sendButtonCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendIcon: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});