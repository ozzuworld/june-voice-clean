// hooks/useChat.tsx - UPDATED FOR API.ALLSAFE.WORLD
import React, { createContext, useCallback, useContext, useState } from 'react';
import { useAuth } from './useAuth';
import APP_CONFIG from '@/config/app.config';

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

    setState(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      isLoading: true,
      error: null,
    }));

    try {
      console.log('💬 Sending message to orchestrator:', trimmedText);
      
      const orchestratorUrl = `${APP_CONFIG.SERVICES.orchestrator}${APP_CONFIG.ENDPOINTS.CHAT}`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), APP_CONFIG.TIMEOUTS.CHAT);

      const response = await fetch(orchestratorUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_input: trimmedText,
          // Add any additional parameters your orchestrator expects
          context: {
            session_id: `session_${Date.now()}`,
            platform: 'mobile',
          }
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      console.log('📨 Chat response status:', response.status);

      if (!response.ok) {
        let errorText = `HTTP ${response.status}`;
        try {
          const errorData = await response.text();
          console.error('❌ Chat request failed:', errorData);
          errorText = errorData || errorText;
        } catch (e) {
          console.error('❌ Chat request failed with status:', response.status);
        }
        throw new Error(`Chat request failed: ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Chat response received:', data);

      const sentUserMessage: Message = {
        ...userMessage,
        status: 'sent',
      };

      // Handle various response formats from orchestrator
      let responseText = '';
      if (typeof data === 'string') {
        responseText = data;
      } else if (data.reply) {
        responseText = data.reply;
      } else if (data.response_text) {
        responseText = data.response_text;
      } else if (data.ai_response) {
        responseText = data.ai_response;
      } else if (data.message) {
        responseText = data.message;
      } else {
        responseText = 'Sorry, I couldn\'t process your message.';
      }

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: responseText,
        isUser: false,
        timestamp: new Date(),
        status: 'sent',
      };

      setState(prev => ({
        ...prev,
        messages: [...prev.messages.slice(0, -1), sentUserMessage, botMessage],
        isLoading: false,
      }));

    } catch (error: any) {
      console.error('💥 Chat error:', error);
      
      let errorMessage = 'Failed to send message';
      if (error.name === 'AbortError') {
        errorMessage = 'Request timed out. Please try again.';
      } else if (error.message) {
        errorMessage = error.message;
      }

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
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}