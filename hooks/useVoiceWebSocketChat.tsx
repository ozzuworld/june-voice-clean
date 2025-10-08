import { useCallback, useState } from 'react';
import { useVoice } from './useVoice';
import { useWebSocketChat } from './useWebSocketChat';
import APP_CONFIG from '@/config/app.config';

export function useVoiceWebSocketChat() {
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const { startListening, stopListening, isListening } = useVoice();
  const { sendTextMessage, isConnected, messages, isProcessing } = useWebSocketChat();

  // Process recorded voice through STT then send to WebSocket
  const processVoiceMessage = useCallback(async (audioUri: string) => {
    try {
      // Convert audio to text via STT service
      const transcription = await transcribeAudio(audioUri);
      
      // Send transcription through WebSocket to orchestrator
      sendTextMessage(transcription);
      
    } catch (error) {
      console.error('Voice processing failed:', error);
    }
  }, [sendTextMessage]);

  const transcribeAudio = async (audioUri: string): Promise<string> => {
    const formData = new FormData();
    formData.append('audio_file', {
      uri: audioUri,
      name: 'voice.m4a',
      type: 'audio/m4a',
    } as any);

    const response = await fetch(`${APP_CONFIG.SERVICES.stt}/v1/transcribe`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}` },
      body: formData,
    });

    const data = await response.json();
    return data.text || '';
  };

  return {
    isVoiceMode,
    isListening,
    isConnected,
    messages,
    isProcessing,
    setIsVoiceMode,
    startListening,
    stopListening,
    processVoiceMessage,
    sendTextMessage,
  };
}
