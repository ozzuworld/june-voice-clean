// app/(tabs)/chat.tsx - FIXED: Real API calls to backend
import React, { useState, useRef, useEffect } from 'react';
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
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import APP_CONFIG from '@/config/app.config';

// Message interface
interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  status?: 'sending' | 'sent' | 'error';
}

export default function ChatScreen() {
  const colorScheme = useColorScheme();
  const { user, signOut, accessToken, isAuthenticated } = useAuth();
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  // Real API call to send message
  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading) return;
    
    if (!isAuthenticated || !accessToken) {
      Alert.alert('Authentication Required', 'Please sign in first');
      return;
    }

    const userMessageText = inputText.trim();
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      text: userMessageText,
      isUser: true,
      timestamp: new Date(),
      status: 'sending',
    };

    // Add user message immediately
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      console.log('📤 Sending message to API...');
      console.log('URL:', `${APP_CONFIG.SERVICES.orchestrator}${APP_CONFIG.ENDPOINTS.CHAT}`);
      console.log('Text:', userMessageText);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        console.log('⏰ Request timeout');
      }, APP_CONFIG.TIMEOUTS.CHAT);

      const requestBody = {
        text: userMessageText,
        language: 'en',
        metadata: {
          session_id: `session_${Date.now()}`,
          user_id: user?.id || user?.email || 'mobile_user',
          platform: 'mobile',
          include_audio: false,
        }
      };

      console.log('📦 Request body:', JSON.stringify(requestBody, null, 2));

      const response = await fetch(
        `${APP_CONFIG.SERVICES.orchestrator}${APP_CONFIG.ENDPOINTS.CHAT}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      console.log('📥 Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Response error:', errorText);
        throw new Error(`Request failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Response data:', JSON.stringify(data, null, 2));

      // Extract response text from various possible formats
      let responseText = '';
      if (data.ok && data.message && data.message.text) {
        responseText = data.message.text;
      } else if (data.message?.text) {
        responseText = data.message.text;
      } else if (data.text) {
        responseText = data.text;
      } else if (typeof data === 'string') {
        responseText = data;
      } else {
        console.warn('⚠️ Unexpected response format:', data);
        responseText = 'I received your message, but had trouble formatting my response.';
      }

      // Update user message status to 'sent'
      setMessages(prev => prev.map(msg => 
        msg.id === userMessage.id ? { ...msg, status: 'sent' } : msg
      ));

      // Add bot response
      const botMessage: Message = {
        id: `bot-${Date.now()}`,
        text: responseText,
        isUser: false,
        timestamp: new Date(),
        status: 'sent',
      };

      setMessages(prev => [...prev, botMessage]);
      setIsLoading(false);

    } catch (error: any) {
      console.error('💥 Chat error:', error);
      
      let errorMessage = 'Failed to send message';
      if (error.name === 'AbortError') {
        errorMessage = 'Request timed out. Please try again.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      // Update user message status to 'error'
      setMessages(prev => prev.map(msg => 
        msg.id === userMessage.id ? { ...msg, status: 'error' } : msg
      ));

      // Add error message
      const errorBotMessage: Message = {
        id: `error-${Date.now()}`,
        text: `I apologize, but I encountered an error: ${errorMessage}`,
        isUser: false,
        timestamp: new Date(),
        status: 'error',
      };

      setMessages(prev => [...prev, errorBotMessage]);
      setIsLoading(false);

      // Show alert for network errors
      if (error.name === 'AbortError' || error.message.includes('network')) {
        Alert.alert(
          'Connection Error',
          'Could not connect to the server. Please check your internet connection and try again.',
          [{ text: 'OK' }]
        );
      }
    }
  };

  // Clear all messages
  const clearChat = () => {
    Alert.alert(
      'Clear Chat',
      'Are you sure you want to clear all messages?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear', 
          style: 'destructive',
          onPress: () => setMessages([])
        }
      ]
    );
  };

  // Test connection
  const testConnection = async () => {
    if (!isAuthenticated || !accessToken) {
      Alert.alert('Authentication Required', 'Please sign in first');
      return;
    }

    try {
      console.log('🔧 Testing connection to:', APP_CONFIG.SERVICES.orchestrator);
      
      const response = await fetch(`${APP_CONFIG.SERVICES.orchestrator}/healthz`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      console.log('Health check status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Health check response:', data);
        Alert.alert('Connection Test', '✅ Connected to server successfully!');
      } else {
        Alert.alert('Connection Test', `❌ Server returned status: ${response.status}`);
      }
    } catch (error: any) {
      console.error('Connection test failed:', error);
      Alert.alert('Connection Test', `❌ Failed to connect: ${error.message}`);
    }
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
            : Colors[colorScheme ?? 'light'].backgroundSecondary || '#1a1a1a',
          borderColor: item.status === 'error' 
            ? Colors[colorScheme ?? 'light'].danger 
            : 'transparent',
          borderWidth: item.status === 'error' ? 1 : 0,
        }
      ]}>
        <Text style={[
          styles.messageText,
          { color: item.isUser ? 'white' : Colors[colorScheme ?? 'light'].text }
        ]}>
          {item.text}
        </Text>
        
        {/* Status indicator */}
        {item.isUser && (
          <View style={styles.statusContainer}>
            {item.status === 'sending' && (
              <ActivityIndicator size="small" color="rgba(255,255,255,0.7)" />
            )}
            {item.status === 'sent' && (
              <Ionicons name="checkmark" size={14} color="rgba(255,255,255,0.7)" />
            )}
            {item.status === 'error' && (
              <Ionicons name="alert-circle" size={14} color={Colors[colorScheme ?? 'light'].danger} />
            )}
          </View>
        )}
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
      
      {/* Debug info */}
      {__DEV__ && (
        <View style={styles.debugInfo}>
          <Text style={[styles.debugText, { color: Colors[colorScheme ?? 'light'].textSecondary }]}>
            API: {APP_CONFIG.SERVICES.orchestrator}{APP_CONFIG.ENDPOINTS.CHAT}
          </Text>
          <Text style={[styles.debugText, { color: Colors[colorScheme ?? 'light'].textSecondary }]}>
            Auth: {isAuthenticated ? '✅' : '❌'}
          </Text>
          <TouchableOpacity onPress={testConnection} style={styles.testButton}>
            <Text style={styles.testButtonText}>Test Connection</Text>
          </TouchableOpacity>
        </View>
      )}
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
          {__DEV__ && (
            <TouchableOpacity onPress={testConnection} style={styles.headerButton}>
              <Ionicons 
                name="bug-outline" 
                size={20} 
                color={Colors[colorScheme ?? 'light'].textSecondary || '#666'} 
              />
            </TouchableOpacity>
          )}
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
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      {/* Loading indicator */}
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={Colors[colorScheme ?? 'light'].primary} />
          <Text style={[styles.loadingText, { color: Colors[colorScheme ?? 'light'].textSecondary }]}>
            AI is thinking...
          </Text>
        </View>
      )}

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
              returnKeyType="send"
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
  debugInfo: {
    marginTop: 20,
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
    alignItems: 'center',
  },
  debugText: {
    fontSize: 10,
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  testButton: {
    marginTop: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#667eea',
    borderRadius: 6,
  },
  testButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
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
  statusContainer: {
    position: 'absolute',
    bottom: 4,
    right: 8,
  },
  timestamp: {
    fontSize: 11,
    textAlign: 'center',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
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