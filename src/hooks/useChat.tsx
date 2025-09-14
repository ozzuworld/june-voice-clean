// src/hooks/useChat.tsx
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

import { apiService } from '@/services/api.service';
import type { ChatContextType, ChatState, Message } from '@/types/chat.types';
import { useAuth } from './useAuth';

const ChatContext = createContext<ChatContextType | null>(null);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { user, accessToken } = useAuth();
  const [state, setState] = useState<ChatState>({
    messages: [],
    isLoading: false,
    error: null,
  });

  // Add welcome message when user is authenticated
  useEffect(() => {
    if (user && state.messages.length === 0) {
      const welcomeMessage: Message = {
        id: '1',
        text: `Hello ${user.name || 'there'}! 👋\n\nI'm June, your AI assistant. I can help you with various tasks, answer questions, and have conversations. You can type messages or use the voice tab for voice interactions!`,
        isUser: false,
        timestamp: new Date(),
        status: 'sent',
      };
      setState(prev => ({ ...prev, messages: [welcomeMessage] }));
    }
  }, [user, state.messages.length]);

  const sendMessage = useCallback(async (text: string) => {
    if (!accessToken) {
      setState(prev => ({
        ...prev,
        error: 'Not authenticated. Please sign in again.',
      }));
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      text: text.trim(),
      isUser: true,
      timestamp: new Date(),
      status: 'sent',
    };

    const botMessageId = (Date.now() + 1).toString();
    const botMessage: Message = {
      id: botMessageId,
      text: '',
      isUser: false,
      timestamp: new Date(),
      status: 'sending',
    };

    // Add user message and placeholder bot message
    setState(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage, botMessage],
      isLoading: true,
      error: null,
    }));

    try {
      const startTime = Date.now();
      const response = await apiService.sendChatMessage(text, accessToken);
      const processingTime = Date.now() - startTime;

      if (response.success && response.data) {
        const replyText = response.data.reply || response.data.text || 'I received your message but had trouble generating a response.';
        
        setState(prev => ({
          ...prev,
          messages: prev.messages.map(msg => 
            msg.id === botMessageId 
              ? {
                  ...msg,
                  text: replyText,
                  status: 'sent' as const,
                  metadata: {
                    processingTime,
                    model: response.data.ai_model || 'unknown',
                  }
                }
              : msg
          ),
          isLoading: false,
        }));
      } else {
        setState(prev => ({
          ...prev,
          messages: prev.messages.map(msg => 
            msg.id === botMessageId 
              ? {
                  ...msg,
                  text: `Sorry, I encountered an error: ${response.error || 'Unknown error'}`,
                  status: 'error' as const,
                }
              : msg
          ),
          isLoading: false,
          error: response.error || 'Failed to get response',
        }));
      }
    } catch (error) {
      console.error('Chat error:', error);
      setState(prev => ({
        ...prev,
        messages: prev.messages.map(msg => 
          msg.id === botMessageId 
            ? {
                ...msg,
                text: 'Sorry, I\'m having trouble connecting right now. Please try again.',
                status: 'error' as const,
              }
            : msg
        ),
        isLoading: false,
        error: error instanceof Error ? error.message : 'Network error',
      }));
    }
  }, [accessToken]);

  const clearChat = useCallback(() => {
    setState(prev => ({ ...prev, messages: [], error: null }));
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const value: ChatContextType = {
    ...state,
    sendMessage,
    clearChat,
    clearError,
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat(): ChatContextType {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}