// hooks/useChat.tsx
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

    const userMessage: Message = {
      id: Date.now().toString(),
      text: text.trim(),
      isUser: true,
      timestamp: new Date(),
      status: 'sent',
    };

    // Add user message immediately
    setState(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      isLoading: true,
      error: null,
    }));

    try {
      console.log('💬 Sending message to orchestrator:', text);
      
      const response = await fetch(`${ORCHESTRATOR_URL}/v1/chat`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_input: text
        }),
        timeout: 30000,
      });

      console.log('📨 Chat response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Chat request failed:', errorText);
        throw new Error(`Chat request failed: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Chat response received:', data);

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: data.reply || 'Sorry, I couldn\'t process your message.',
        isUser: false,
        timestamp: new Date(),
        status: 'sent',
      };

      setState(prev => ({
        ...prev,
        messages: [...prev.messages, botMessage],
        isLoading: false,
      }));

    } catch (error: any) {
      console.error('💥 Chat error:', error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: `Sorry, I encountered an error: ${error.message}`,
        isUser: false,
        timestamp: new Date(),
        status: 'error',
      };

      setState(prev => ({
        ...prev,
        messages: [...prev.messages, errorMessage],
        isLoading: false,
        error: error.message,
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
    throw new error('useChat must be used within a ChatProvider');
  }
  return context;
}