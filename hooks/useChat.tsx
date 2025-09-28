// hooks/useChat.tsx - FIXED: Added audio support
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
  hasAudio?: boolean; // ✅ NEW: Track if message has audio
}

interface ChatState {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  isPlayingAudio: boolean; // ✅ NEW: Track audio playback state
}

interface ChatContextType extends ChatState {
  sendMessage: (text: string, includeAudio?: boolean) => Promise<void>;
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
    isPlayingAudio: false,
  });

  // ✅ NEW: Setup audio mode for better compatibility
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

  // ✅ NEW: Play audio from base64 data
  const playAudioFromBase64 = useCallback(async (audioBase64: string, messageId: string) => {
    try {
      setState(prev => ({ ...prev, isPlayingAudio: true }));
      
      // Setup audio mode
      await setupAudioMode();
      
      // Decode base64 and save to temp file
      const audioPath = `${FileSystem.cacheDirectory}chat_audio_${messageId}.wav`;
      await FileSystem.writeAsStringAsync(audioPath, audioBase64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      // Play the audio
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioPath },
        { shouldPlay: true, volume: 1.0 }
      );
      
      // Monitor playback
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
      
      console.log('✅ Audio playback started for message:', messageId);
      
    } catch (error) {
      console.error('❌ Audio playback failed:', error);
      setState(prev => ({ ...prev, isPlayingAudio: false }));
    }
  }, [setupAudioMode]);

  const sendMessage = useCallback(async (text: string, includeAudio: boolean = true) => {
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
      console.log('💬 Sending message with audio support:', trimmedText);
      console.log('🔗 Endpoint:', `${APP_CONFIG.SERVICES.orchestrator}${APP_CONFIG.ENDPOINTS.CHAT}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), APP_CONFIG.TIMEOUTS.CHAT);

      // ✅ FIXED: Include audio request
      const response = await fetch(`${APP_CONFIG.SERVICES.orchestrator}${APP_CONFIG.ENDPOINTS.CHAT}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: trimmedText,
          language: 'en',
          include_audio: includeAudio, // ✅ NEW: Request audio from backend
          audio_config: {
            voice: 'default',
            speed: 1.0,
            language: 'EN'
          },
          metadata: {
            session_id: `session_${Date.now()}`,
            platform: 'mobile',
            client_version: '2.0.0',
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

      // ✅ ENHANCED: Handle response with audio
      let responseText = '';
      let hasAudio = false;
      
      if (data.ok && data.message && data.message.text) {
        responseText = data.message.text;
      } else if (data.message) {
        responseText = typeof data.message === 'string' ? data.message : JSON.stringify(data.message);
      } else if (data.text) {
        responseText = data.text;
      } else if (typeof data === 'string') {
        responseText = data;
      } else {
        console.warn('Unexpected response format:', data);
        responseText = 'I received your message, but had trouble formatting my response.';
      }

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: responseText,
        isUser: false,
        timestamp: new Date(),
        status: 'sent',
        hasAudio: hasAudio,
      };

      setState(prev => ({
        ...prev,
        messages: [...prev.messages.slice(0, -1), sentUserMessage, botMessage],
        isLoading: false,
      }));

      // ✅ NEW: Play audio if available
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
      } else {
        console.log('ℹ️ No audio in response');
      }

      console.log('✅ Message exchange completed successfully');

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
  }, [accessToken, playAudioFromBase64]);

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