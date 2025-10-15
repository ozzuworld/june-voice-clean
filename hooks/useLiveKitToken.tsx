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

      const url = `${APP_CONFIG.SERVICES.orchestrator}${APP_CONFIG.ENDPOINTS.LIVEKIT_TOKEN}`;
      console.log('🎫 [LIVEKIT TOKEN] Requesting token from:', url);
      
      const requestBody = {
        roomName: `voice-${Date.now()}`,
        participantName: `user-${Date.now()}`,
      };
      
      console.log('🎫 [LIVEKIT TOKEN] Request body:', requestBody);
      console.log('🎫 [LIVEKIT TOKEN] Using access token:', accessToken ? `${accessToken.substring(0, 20)}...` : 'none');

      // Call your backend to get LiveKit token
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('🎫 [LIVEKIT TOKEN] Response status:', response.status, response.statusText);
      console.log('🎫 [LIVEKIT TOKEN] Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        let errorText;
        try {
          errorText = await response.text();
        } catch {
          errorText = `HTTP ${response.status} ${response.statusText}`;
        }
        console.log('🎫 [LIVEKIT TOKEN] Error response body:', errorText);
        throw new Error(`Failed to get LiveKit token: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('🎫 [LIVEKIT TOKEN] Success response:', data);
      
      const tokenData: LiveKitToken = {
        token: data.accessToken || data.token,
        roomName: data.roomName || requestBody.roomName,
        participantName: data.participantName || requestBody.participantName,
      };

      console.log('🎫 [LIVEKIT TOKEN] Parsed token data:', {
        hasToken: !!tokenData.token,
        tokenLength: tokenData.token?.length,
        roomName: tokenData.roomName,
        participantName: tokenData.participantName,
      });

      setLiveKitToken(tokenData);
      return tokenData;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to generate LiveKit token';
      console.error('🎫 [LIVEKIT TOKEN ERROR]:', errorMessage);
      console.error('🎫 [LIVEKIT TOKEN ERROR] Full error:', err);
      setError(errorMessage);
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