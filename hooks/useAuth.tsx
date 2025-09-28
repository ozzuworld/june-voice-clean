// hooks/useChat.tsx - FIXED: Match the exact working PowerShell format
import React, { createContext, useCallback, useContext, useState } from 'react';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { useAuth } from './useAuth';
import APP_CONFIG from '@/config/app.config';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  status?: 'sending' | 'sent' | 'error';
  isVoice?: boolean;
  hasAudio?: boolean;
}

interface ChatState {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  isPlayingAudio: boolean;
}

interface ChatContextType extends ChatState {
  sendMessage: (text: string, includeAudio?: boolean) => Promise<void>;
  clearChat: () => void;
  clearError: () => void;
}

const ChatContext = createContext<ChatContextType | null>(null);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { accessToken, user } = useAuth();
  const [state, setState] = useState<ChatState>({
    messages: [],
    isLoading: false,
    error: null,
    isPlayingAudio: false,
  });

  const setupAudioMode = useCallback(async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: false,
      });
    } catch (error) {
      console.warn('Failed to setup audio mode:', error);
    }
  }, []);

  const playAudioFromBase64 = useCallback(async (audioBase64: string, messageId: string) => {
    try {
      setState(prev => ({ ...prev, isPlayingAudio: true }));
      
      await setupAudioMode();
      
      const audioPath = `${FileSystem.cacheDirectory}chat_audio_${messageId}.wav`;
      await FileSystem.writeAsStringAsync(audioPath, audioBase64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioPath },
        { shouldPlay: true, volume: 1.0 }
      );
      
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setState(prev => ({ ...prev, isPlayingAudio: false }));
          sound.unloadAsync();
          FileSystem.deleteAsync(audioPath, { idempotent: true });
        }
        
        if (status.isLoaded && status.error) {
          console.error('Audio playback error:', status.error);
          setState(prev => ({ ...prev, isPlayingAudio: false }));
        }
      });
      
    } catch (error) {
      console.error('❌ Audio playback failed:', error);
      setState(prev => ({ ...prev, isPlayingAudio: false }));
    }
  }, [setupAudioMode]);

  const sendMessage = useCallback(async (text: string, includeAudio: boolean = true) => {
    if (!accessToken) {
      setState(prev => ({ ...prev, error: 'Authentication required' }));
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
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, APP_CONFIG.TIMEOUTS.CHAT);

      // ✅ FIXED: Use EXACT format that works in PowerShell
      const requestBody = {
        text: trimmedText,
        language: 'en',
        metadata: {
          session_id: `session_${Date.now()}`,
          user_id: user?.id || user?.email || 'mobile_user',
          ...(includeAudio && { include_audio: true })
        }
      };

      console.log('📤 Sending chat request:', JSON.stringify(requestBody, null, 2));

      const response = await fetch(`${APP_CONFIG.SERVICES.orchestrator}${APP_CONFIG.ENDPOINTS.CHAT}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorText = `Request failed: ${response.status}`;
        try {
          const errorData = await response.text();
          console.error('❌ Response error:', errorData);
          errorText = errorData || errorText;
        } catch (e) {
          // Use default error message
        }
        throw new Error(errorText);
      }

      const data = await response.json();
      console.log('📥 Chat response received:', JSON.stringify(data, null, 2));

      const sentUserMessage: Message = {
        ...userMessage,
        status: 'sent',
      };

      // ✅ Extract response text from the API response
      let responseText = '';
      let hasAudio = false;
      
      if (data.ok && data.message && data.message.text) {
        responseText = data.message.text;
      } else if (data.message?.text) {
        responseText = data.message.text;
      } else if (data.text) {
        responseText = data.text;
      } else if (typeof data === 'string') {
        responseText = data;
      } else {
        console.warn('Unexpected response format:', data);
        responseText = 'I received your message but had trouble formatting my response.';
      }

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: responseText,
        isUser: false,
        timestamp: new Date(),
        status: 'sent',
        hasAudio: false,
      };

      setState(prev => ({
        ...prev,
        messages: [...prev.messages.slice(0, -1), sentUserMessage, botMessage],
        isLoading: false,
      }));

      // Handle audio if present
      if (data.audio && data.audio.data) {
        console.log('🔊 Audio received, playing...');
        hasAudio = true;
        
        // Update the bot message to indicate it has audio
        setState(prev => ({
          ...prev,
          messages: prev.messages.map(msg => 
            msg.id === botMessage.id ? { ...msg, hasAudio: true } : msg
          ),
        }));
        
        // Play the audio
        await playAudioFromBase64(data.audio.data, botMessage.id);
      } else if (data.audio && typeof data.audio === 'string') {
        // Handle if audio is directly a base64 string
        console.log('🔊 Direct audio string received, playing...');
        hasAudio = true;
        setState(prev => ({
          ...prev,
          messages: prev.messages.map(msg => 
            msg.id === botMessage.id ? { ...msg, hasAudio: true } : msg
          ),
        }));
        await playAudioFromBase64(data.audio, botMessage.id);
      } else {
        console.log('ℹ️ No audio in response');
      }

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
        text: `I apologize, but I encountered an error: ${errorMessage}`,
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
  }, [accessToken, user, playAudioFromBase64]);

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