import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import APP_CONFIG from '@/config/app.config';

interface LiveKitToken {
  token: string;
  roomName: string;
  participantName: string;
  livekitUrl?: string;
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

      // FIX: Use correct endpoint
      const url = `${APP_CONFIG.SERVICES.orchestrator}/api/sessions/`;
      console.log('🎫 [LIVEKIT TOKEN] Requesting session from:', url);
      
      const requestBody = {
        user_id: `user-${Date.now()}`,
        room_name: `voice-${Date.now()}`,
      };
      
      console.log('🎫 [LIVEKIT TOKEN] Request body:', requestBody);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Remove Authorization header - not needed for session creation
        },
        body: JSON.stringify(requestBody),
      });

      console.log('🎫 [LIVEKIT TOKEN] Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.log('🎫 [LIVEKIT TOKEN] Error response:', errorText);
        throw new Error(`Failed to create session: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('🎫 [LIVEKIT TOKEN] Success response:', data);
      
      // FIX: Map backend field names to frontend
      const tokenData: LiveKitToken = {
        token: data.access_token,           // backend uses access_token
        roomName: data.room_name,           // backend uses room_name
        participantName: data.user_id,      // backend uses user_id
        livekitUrl: data.livekit_url,       // backend uses livekit_url
      };

      console.log('🎫 [LIVEKIT TOKEN] Parsed token data:', {
        hasToken: !!tokenData.token,
        tokenLength: tokenData.token?.length,
        roomName: tokenData.roomName,
        participantName: tokenData.participantName,
        livekitUrl: tokenData.livekitUrl,
      });

      setLiveKitToken(tokenData);
      return tokenData;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to generate LiveKit token';
      console.error('🎫 [LIVEKIT TOKEN ERROR]:', errorMessage);
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
