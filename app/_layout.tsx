// app/_layout.tsx — Simple inline version
import { Stack } from 'expo-router';
import React, { createContext, useCallback, useContext, useState } from 'react';
import { AuthProvider, useAuth } from '@/hooks/useAuth';

// Simple inline ChatProvider for now
interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  status?: 'sending' | 'sent' | 'error';
}

interface ChatContextType {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  sendMessage: (text: string) => Promise<void>;
  clearChat: () => void;
  clearError: () => void;
}

const ChatContext = createContext<ChatContextType | null>(null);

function InlineChatProvider({ children }: { children: React.ReactNode }) {
  // Remove useAuth dependency for now - just make it work
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: text.trim(),
      isUser: true,
      timestamp: new Date(),
      status: 'sending',
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    try {
      // Simple test response for now
      setTimeout(() => {
        const botMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: `Echo: ${text.trim()}`,
          isUser: false,
          timestamp: new Date(),
          status: 'sent',
        };

        setMessages(prev => [
          ...prev.slice(0, -1),
          { ...userMessage, status: 'sent' },
          botMessage
        ]);
        setIsLoading(false);
        
        console.log('✅ Message sent successfully');
      }, 1000);
      
    } catch (err: any) {
      console.error('❌ Send message error:', err);
      setMessages(prev => [
        ...prev.slice(0, -1),
        { ...userMessage, status: 'error' }
      ]);
      setError(err.message || 'Failed to send message');
      setIsLoading(false);
    }
  }, []);

  const clearChat = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value: ChatContextType = {
    messages,
    isLoading,
    error,
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

// Export the useChat hook so other files can import it
export { useChat };

// Simple inline VoiceProvider placeholder
function InlineVoiceProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export default function RootLayout() {
  console.log('🔧 RootLayout rendering with inline providers');
  
  return (
    <AuthProvider>
      <InlineChatProvider>
        <InlineVoiceProvider>
          <Stack screenOptions={{ headerShown: false }} />
        </InlineVoiceProvider>
      </InlineChatProvider>
    </AuthProvider>
  );
}