// hooks/useChat.tsx - FIXED VERSION
import React, { createContext, useCallback, useContext, useState } from 'react';
import { useAuth } from './useAuth';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  status?: 'sending' | 'sent' | 'error';
  isVoice?: boolean;
}

interface ChatState {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
}

interface ChatContextType extends ChatState {
  sendMessage: (text: string) => Promise<void>;
  clearChat: () => void;
  clearError: () => void;
}

const ChatContext = createContext<ChatContextType | null>(null);

// Your orchestrator service URL
const ORCHESTRATOR_URL = 'https://june-orchestrator-359243954.us-central1.run.app';

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { accessToken } = useAuth();
  const [state, setState] = useState<ChatState>({
    messages: [],
    isLoading: false,
    error: null,
  });

  const sendMessage = useCallback(async (text: string) => {
    if (!accessToken) {
      setState(prev => ({ ...prev, error: 'Not authenticated' }));
      return;
    }

    const trimmedText = text.trim();
    if (!trimmedText) {
      setState(prev => ({ ...prev, error: 'Message cannot be empty' }));
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      text: trimmedText,
      isUser: true,
      timestamp: new Date(),
      status: 'sending',
    };

    // Add user message immediately
    setState(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      isLoading: true,
      error: null,
    }));

    try {
      console.log('💬 Sending message to orchestrator:', trimmedText);
      
      // FIXED: Better request configuration with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch(`${ORCHESTRATOR_URL}/v1/chat`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_input: trimmedText
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      console.log('📨 Chat response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Chat request failed:', errorText);
        throw new Error(`Chat request failed: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Chat response received:', data);

      // Mark user message as sent
      const sentUserMessage: Message = {
        ...userMessage,
        status: 'sent',
      };

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: data.reply || 'Sorry, I couldn\'t process your message.',
        isUser: false,
        timestamp: new Date(),
        status: 'sent',
      };

      // FIXED: Update messages with both sent user message and bot response
      setState(prev => ({
        ...prev,
        messages: [...prev.messages.slice(0, -1), sentUserMessage, botMessage],
        isLoading: false,
      }));

    } catch (error: any) {
      console.error('💥 Chat error:', error);
      
      // FIXED: Handle different error types
      let errorMessage = 'Failed to send message';
      if (error.name === 'AbortError') {
        errorMessage = 'Request timed out. Please try again.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      // Mark user message as error
      const errorUserMessage: Message = {
        ...userMessage,
        status: 'error',
      };

      const errorBotMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: `Sorry, I encountered an error: ${errorMessage}`,
        isUser: false,
        timestamp: new Date(),
        status: 'error',
      };

      setState(prev => ({
        ...prev,
        messages: [...prev.messages.slice(0, -1), errorUserMessage, errorBotMessage],
        isLoading: false,
        error: errorMessage,
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
    // FIXED: Error constructor with capital E
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}