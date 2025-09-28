// app/(tabs)/chat.tsx - Simple, crash-free version
import React, { useState } from 'react';
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
import { useAuth } from '@/hooks/useAuth';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

// Simple message interface
interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

export default function ChatScreen() {
  const colorScheme = useColorScheme();
  const { user, signOut } = useAuth();
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Simple message sending
  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading) return;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      isUser: true,
      timestamp: new Date(),
    };

    // Add user message immediately
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    // Simulate bot response (replace with real API call later)
    setTimeout(() => {
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: `I received your message: "${userMessage.text}". This is a test response.`,
        isUser: false,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, botMessage]);
      setIsLoading(false);
    }, 1000);
  };

  // Clear all messages
  const clearChat = () => {
    setMessages([]);
  };

  // Render individual message
  const renderMessage = ({ item }: { item: Message }) => (
    <View style={[
      styles.messageContainer,
      item.isUser ? styles.userMessage : styles.botMessage
    ]}>
      <View style={[
        styles.messageBubble,
        {
          backgroundColor: item.isUser 
            ? Colors[colorScheme ?? 'light'].primary 
            : Colors[colorScheme ?? 'light'].backgroundSecondary || '#1a1a1a'
        }
      ]}>
        <Text style={[
          styles.messageText,
          { color: item.isUser ? 'white' : Colors[colorScheme ?? 'light'].text }
        ]}>
          {item.text}
        </Text>
      </View>
      <Text style={[styles.timestamp, { color: Colors[colorScheme ?? 'light'].textSecondary || '#666' }]}>
        {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </Text>
    </View>
  );

  // Render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={[styles.emptyTitle, { color: Colors[colorScheme ?? 'light'].text }]}>
        Welcome to OZZU Chat
      </Text>
      <Text style={[styles.emptySubtitle, { color: Colors[colorScheme ?? 'light'].textSecondary || '#666' }]}>
        Start a conversation by typing a message below
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: Colors[colorScheme ?? 'light'].border || '#333' }]}>
        <Text style={[styles.headerTitle, { color: Colors[colorScheme ?? 'light'].primary }]}>
          OZZU
        </Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity onPress={clearChat} style={styles.headerButton}>
            <Ionicons 
              name="trash-outline" 
              size={20} 
              color={Colors[colorScheme ?? 'light'].textSecondary || '#666'} 
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={signOut} style={styles.headerButton}>
            <Ionicons 
              name="log-out-outline" 
              size={20} 
              color={Colors[colorScheme ?? 'light'].textSecondary || '#666'} 
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* User info */}
      {user && (
        <View style={[styles.userInfo, { backgroundColor: Colors[colorScheme ?? 'light'].backgroundSecondary || '#1a1a1a' }]}>
          <Text style={[styles.userInfoText, { color: Colors[colorScheme ?? 'light'].textSecondary || '#666' }]}>
            Logged in as: {user.email || user.username || 'Unknown'}
          </Text>
        </View>
      )}
      
      {/* Messages */}
      <FlatList
        data={messages || []} // Safe fallback
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        style={styles.messagesList}
        contentContainerStyle={[
          styles.messagesContent,
          (messages?.length || 0) === 0 && styles.emptyMessagesContent
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmptyState}
      />

      {/* Input Area */}
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={[styles.inputContainer, { borderTopColor: Colors[colorScheme ?? 'light'].border || '#333' }]}>
          <View style={styles.inputWrapper}>
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
              editable={!isLoading}
              onSubmitEditing={handleSendMessage}
            />
            
            <TouchableOpacity
              onPress={handleSendMessage}
              disabled={!inputText.trim() || isLoading}
              style={[
                styles.sendButton,
                {
                  backgroundColor: inputText.trim() && !isLoading 
                    ? Colors[colorScheme ?? 'light'].primary 
                    : Colors[colorScheme ?? 'light'].border || '#333',
                }
              ]}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Ionicons 
                  name="send" 
                  size={20} 
                  color={inputText.trim() && !isLoading ? 'white' : Colors[colorScheme ?? 'light'].textSecondary || '#666'}
                />
              )}
            </TouchableOpacity>
          </View>
        </View>
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
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  headerButton: {
    padding: 8,
  },
  userInfo: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  userInfoText: {
    fontSize: 12,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingVertical: 10,
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
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  timestamp: {
    fontSize: 11,
    textAlign: 'center',
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
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
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});