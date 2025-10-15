import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import APP_CONFIG from '@/config/app.config';

interface LiveKitToken {
  token: string;
  roomName: string;
  participantName: string;
}

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  isVoice?: boolean;
}

export function useLiveKitToken() {
  const { accessToken, isAuthenticated } = useAuth();
  const [liveKitToken, setLiveKitToken] = useState<LiveKitToken | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  const generateToken = useCallback(async () => {
    if (!accessToken || !isAuthenticated) {
      setError('Not authenticated');
      return null;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Call your backend to get LiveKit token
      const response = await fetch(`${APP_CONFIG.SERVICES.orchestrator}${APP_CONFIG.ENDPOINTS.LIVEKIT_TOKEN}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomName: `voice-${Date.now()}`,
          participantName: `user-${Date.now()}`,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to get LiveKit token: ${response.statusText}`);
      }

      const data = await response.json();
      
      const tokenData: LiveKitToken = {
        token: data.accessToken || data.token,
        roomName: data.roomName,
        participantName: data.participantName || `user-${Date.now()}`,
      };

      setLiveKitToken(tokenData);
      return tokenData;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to generate LiveKit token';
      setError(errorMessage);
      console.error('LiveKit token error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, isAuthenticated]);

  const addMessage = useCallback((text: string, isUser: boolean, isVoice = false) => {
    const message: Message = {
      id: `msg-${Date.now()}-${Math.random()}`,
      text,
      isUser,
      timestamp: new Date(),
      isVoice,
    };
    setMessages(prev => [...prev, message]);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  const clearToken = useCallback(() => {
    setLiveKitToken(null);
    setError(null);
  }, []);

  return {
    liveKitToken,
    isLoading,
    error,
    messages,
    generateToken,
    addMessage,
    clearMessages,
    clearToken,
  };
}