// hooks/useVoiceChat.tsx - NEW: Combined voice + chat hook
import { useCallback, useState } from 'react';
import { useAuth } from './useAuth';
import { useVoice } from './useVoice';
import { useChat } from './useChat';
import APP_CONFIG from '@/config/app.config';

interface VoiceChatState {
  isVoiceMode: boolean;
  isProcessingVoice: boolean;
  lastVoiceTranscript: string | null;
}

export function useVoiceChat() {
  const { accessToken } = useAuth();
  const { sendMessage: sendTextMessage, isLoading: isChatLoading } = useChat();
  const { 
    startListening, 
    stopListening, 
    isListening, 
    isProcessing: isVoiceProcessing 
  } = useVoice();
  
  const [state, setState] = useState<VoiceChatState>({
    isVoiceMode: false,
    isProcessingVoice: false,
    lastVoiceTranscript: null,
  });

  // NEW: Send voice to STT then to chat
  const sendVoiceMessage = useCallback(async (audioUri: string) => {
    if (!accessToken) throw new Error('Not authenticated');

    try {
      setState(prev => ({ ...prev, isProcessingVoice: true }));

      // Step 1: Convert voice to text using STT service
      console.log('🎤 Converting voice to text...');
      const transcription = await voiceToText(audioUri);
      
      setState(prev => ({ 
        ...prev, 
        lastVoiceTranscript: transcription 
      }));

      // Step 2: Send transcription to chat (which handles orchestrator + TTS)
      console.log('💬 Sending transcription to chat:', transcription);
      await sendTextMessage(transcription, true); // includeAudio = true
      
      setState(prev => ({ ...prev, isProcessingVoice: false }));

    } catch (error: any) {
      console.error('❌ Voice message failed:', error);
      setState(prev => ({ ...prev, isProcessingVoice: false }));
      throw error;
    }
  }, [accessToken, sendTextMessage]);

  // NEW: STT integration function
  const voiceToText = useCallback(async (audioUri: string): Promise<string> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), APP_CONFIG.TIMEOUTS.STT);

    try {
      console.log('📝 Sending audio to STT service...');
      
      const formData = new FormData();
      formData.append('audio_file', {
        uri: audioUri,
        name: 'recording.m4a',
        type: 'audio/m4a',
      } as any);

      // Optional STT parameters
      formData.append('language', 'en');
      formData.append('task', 'transcribe');
      formData.append('notify_orchestrator', 'false'); // We'll handle chat separately

      const response = await fetch(
        `${APP_CONFIG.SERVICES.stt}${APP_CONFIG.ENDPOINTS.STT}`, 
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            // Don't set Content-Type for FormData - let browser set it
          },
          body: formData,
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ STT service error:', errorText);
        throw new Error(`STT failed (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ STT response:', data);
      
      const transcription = data.text || data.transcription || '';
      if (!transcription.trim()) {
        throw new Error('No speech detected in audio');
      }

      console.log('✅ Transcription:', transcription);
      return transcription;

    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Speech recognition timed out');
      }
      throw error;
    }
  }, [accessToken]);

  const toggleVoiceMode = useCallback(() => {
    setState(prev => ({ ...prev, isVoiceMode: !prev.isVoiceMode }));
  }, []);

  return {
    ...state,
    isListening,
    isChatLoading,
    isProcessing: isVoiceProcessing || state.isProcessingVoice,
    startListening,
    stopListening,
    sendVoiceMessage,
    toggleVoiceMode,
  };
}
