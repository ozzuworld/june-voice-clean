import { useState, useCallback } from 'react';
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
  const { isAuthenticated } = useAuth();
  const [liveKitToken, setLiveKitToken] = useState<LiveKitToken | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  const generateToken = useCallback(async () => {
    if (!isAuthenticated) {
      const errMsg = 'Not authenticated';
      console.log('🎫 [TOKEN ERROR]:', errMsg);
      setError(errMsg);
      return null;
    }

    try {
      setIsLoading(true);
      setError(null);

      const url = `${APP_CONFIG.SERVICES.orchestrator}/api/sessions/`;
      console.log('🎫 [TOKEN] Full URL:', url);
      console.log('🎫 [TOKEN] Orchestrator base:', APP_CONFIG.SERVICES.orchestrator);
      
      const requestBody = {
        user_id: `user-${Date.now()}`,
        room_name: `voice-${Date.now()}`,
      };
      
      console.log('🎫 [TOKEN] Request body:', JSON.stringify(requestBody));
      console.log('🎫 [TOKEN] Making fetch request...');

      // Add timeout to fetch
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        console.log('🎫 [TOKEN] Response received!');
        console.log('🎫 [TOKEN] Response status:', response.status);
        console.log('🎫 [TOKEN] Response ok:', response.ok);
        console.log('🎫 [TOKEN] Response headers:', JSON.stringify(Object.fromEntries(response.headers.entries())));

        if (!response.ok) {
          const errorText = await response.text();
          console.log('🎫 [TOKEN] Error response body:', errorText);
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        console.log('🎫 [TOKEN] Success! Response data:', {
          hasToken: !!data.access_token,
          tokenLength: data.access_token?.length,
          roomName: data.room_name,
          userId: data.user_id,
          livekitUrl: data.livekit_url,
          sessionId: data.session_id,
        });
        
        const tokenData: LiveKitToken = {
          token: data.access_token,
          roomName: data.room_name,
          participantName: data.user_id,
          livekitUrl: data.livekit_url || APP_CONFIG.SERVICES.livekit,
        };

        setLiveKitToken(tokenData);
        console.log('🎫 [TOKEN] ✅ Token set successfully');
        return tokenData;
        
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        
        // Detailed error logging
        console.log('🎫 [TOKEN] ❌ Fetch failed!');
        console.log('🎫 [TOKEN] Error name:', fetchError.name);
        console.log('🎫 [TOKEN] Error message:', fetchError.message);
        console.log('🎫 [TOKEN] Error stack:', fetchError.stack);
        
        if (fetchError.name === 'AbortError') {
          throw new Error('Request timeout after 10 seconds');
        }
        
        throw fetchError;
      }
      
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to generate LiveKit token';
      console.error('🎫 [TOKEN ERROR]:', errorMessage);
      console.error('🎫 [TOKEN ERROR] Full error:', err);
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

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