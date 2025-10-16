import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import APP_CONFIG from '@/config/app.config';

interface LiveKitToken {
  token: string;
  roomName: string;
  participantName: string;
  livekitUrl: string;
}

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  isVoice?: boolean;
}

export function useLiveKitToken() {
  const { isAuthenticated, accessToken } = useAuth();
  const [liveKitToken, setLiveKitToken] = useState<LiveKitToken | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  const generateToken = useCallback(async () => {
    if (!isAuthenticated) {
      setError('Not authenticated');
      return null;
    }

    try {
      setIsLoading(true);
      setError(null);

      const url = `${APP_CONFIG.SERVICES.orchestrator}/api/sessions/`;
      console.log('🎫 [TOKEN] Requesting from:', url);
      
      const requestBody = {
        user_id: `user-${Date.now()}`,
        room_name: `voice-${Date.now()}`,
      };
      
      console.log('🎫 [TOKEN] Request body:', requestBody);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Note: No Authorization header needed for session creation
        },
        body: JSON.stringify(requestBody),
      });

      console.log('🎫 [TOKEN] Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.log('🎫 [TOKEN] Error response:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('🎫 [TOKEN] Success response:', {
        hasToken: !!data.access_token,
        tokenLength: data.access_token?.length,
        roomName: data.room_name,
        userId: data.user_id,
        livekitUrl: data.livekit_url,
      });
      
      const tokenData: LiveKitToken = {
        token: data.access_token,
        roomName: data.room_name,
        participantName: data.user_id,
        livekitUrl: data.livekit_url || APP_CONFIG.SERVICES.livekit,
      };

      setLiveKitToken(tokenData);
      return tokenData;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to generate LiveKit token';
      console.error('🎫 [TOKEN ERROR]:', errorMessage);
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, accessToken]);

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