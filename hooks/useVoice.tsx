// hooks/useVoice.tsx - PRODUCTION VERSION
import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Platform, Alert } from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';

import APP_CONFIG from '@/config/app.config';
import { useAuth } from '@/hooks/useAuth';

interface VoiceState {
  isListening: boolean;
  isProcessing: boolean;
  isPlaying: boolean;
  transcription: string;
  aiResponse: string;
  error: string | null;
}

interface VoiceContextValue extends VoiceState {
  startListening: () => Promise<void>;
  stopListening: () => Promise<void>;
  clearError?: () => void;
  resetVoice: () => void;
}

const VoiceContext = createContext<VoiceContextValue | undefined>(undefined);

export function VoiceProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<VoiceState>({
    isListening: false,
    isProcessing: false,
    isPlaying: false,
    transcription: '',
    aiResponse: '',
    error: null,
  });

  const recordingRef = useRef<Audio.Recording | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const isProcessingRef = useRef(false);
  const { accessToken, isAuthenticated } = useAuth();

  const setupAudioMode = useCallback(async () => {
    try {
      if (APP_CONFIG.DEBUG.VERBOSE_LOGS) {
        console.log('🔧 Setting up audio mode...');
      }
      
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: false,
        ...(Platform.OS === 'ios' && {
          interruptionModeIOS: 1,
        }),
        ...(Platform.OS === 'android' && {
          interruptionModeAndroid: 1,
        }),
      });
      
      if (APP_CONFIG.DEBUG.VERBOSE_LOGS) {
        console.log('✅ Audio mode setup successful');
      }
    } catch (error) {
      console.error('❌ Audio mode setup failed:', error);
      
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
        });
        if (APP_CONFIG.DEBUG.VERBOSE_LOGS) {
          console.log('✅ Fallback audio mode setup successful');
        }
      } catch (fallbackError) {
        console.error('❌ Fallback audio setup also failed:', fallbackError);
        throw new Error(`Audio setup failed: ${fallbackError.message}`);
      }
    }
  }, []);

  const startListening = useCallback(async () => {
    if (!isAuthenticated || !accessToken) {
      setState(s => ({ ...s, error: 'Authentication required' }));
      return;
    }

    if (state.isListening || state.isProcessing) {
      return;
    }

    try {
      await setupAudioMode();

      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        throw new Error('Microphone permission required');
      }

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync({
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 22050,
          numberOfChannels: 1,
          bitRate: 64000,
        },
        ios: {
          extension: '.m4a',
          outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
          audioQuality: Audio.IOSAudioQuality.MEDIUM,
          sampleRate: 22050,
          numberOfChannels: 1,
          bitRate: 64000,
        },
      });

      await recording.startAsync();
      recordingRef.current = recording;
      
      setState(s => ({ 
        ...s, 
        isListening: true, 
        error: null,
        transcription: '',
        aiResponse: '',
      }));

    } catch (error: any) {
      console.error('❌ Recording start failed:', error);
      setState(s => ({ 
        ...s, 
        error: error.message || 'Failed to start recording',
      }));
    }
  }, [accessToken, isAuthenticated, setupAudioMode, state.isListening, state.isProcessing]);

  const stopListening = useCallback(async () => {
    if (!state.isListening || isProcessingRef.current) {
      return;
    }

    isProcessingRef.current = true;
    
    try {
      const recording = recordingRef.current;
      if (!recording) {
        throw new Error('No active recording found');
      }

      await recording.stopAndUnloadAsync();
      const audioUri = recording.getURI();
      recordingRef.current = null;

      setState(s => ({ 
        ...s, 
        isListening: false, 
        isProcessing: true,
        error: null,
      }));

      await processVoiceInput(audioUri);

    } catch (error: any) {
      console.error('❌ Recording stop failed:', error);
      setState(s => ({ 
        ...s, 
        isListening: false,
        isProcessing: false,
        error: error.message || 'Failed to stop recording',
      }));
    } finally {
      isProcessingRef.current = false;
    }
  }, [state.isListening]);

  const processVoiceInput = useCallback(async (audioUri: string | null) => {
    try {
      if (!audioUri) {
        throw new Error('No audio file to process');
      }

      // Step 1: Speech-to-Text
      const transcription = await speechToText(audioUri);
      setState(s => ({ ...s, transcription }));

      if (!transcription.trim()) {
        throw new Error('No speech detected in audio');
      }

      // Step 2: Get AI Response
      const aiResponse = await getAIResponse(transcription);
      setState(s => ({ ...s, aiResponse }));

      // Step 3: Text-to-Speech
      await textToSpeech(aiResponse);

      setState(s => ({ 
        ...s, 
        isProcessing: false,
        error: null,
      }));

    } catch (error: any) {
      console.error('❌ Voice processing failed:', error);
      setState(s => ({ 
        ...s, 
        isProcessing: false,
        error: error.message || 'Voice processing failed',
      }));
    }
  }, []);

  const speechToText = useCallback(async (audioUri: string): Promise<string> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), APP_CONFIG.TIMEOUTS.STT);

    try {
      const formData = new FormData();
      formData.append('audio', {
        uri: audioUri,
        name: 'recording.m4a',
        type: 'audio/m4a',
      } as any);

      const response = await fetch(`${APP_CONFIG.SERVICES.stt}${APP_CONFIG.ENDPOINTS.STT}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Speech recognition failed: ${response.status}`);
      }

      const data = await response.json();
      const transcription = data.text || data.transcription || data.transcript || '';
      
      if (!transcription.trim()) {
        throw new Error('No speech detected');
      }

      return transcription;

    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Speech recognition timed out');
      }
      throw error;
    }
  }, [accessToken]);

  const getAIResponse = useCallback(async (text: string): Promise<string> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), APP_CONFIG.TIMEOUTS.CHAT);

    try {
      const response = await fetch(`${APP_CONFIG.SERVICES.orchestrator}${APP_CONFIG.ENDPOINTS.CHAT}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text,
          language: 'en',
          metadata: {
            mode: 'voice',
            platform: 'mobile',
            session_id: `voice_${Date.now()}`,
          }
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`AI response failed: ${response.status}`);
      }

      const data = await response.json();
      
      // Extract response text from various possible formats
      let aiText = '';
      if (typeof data === 'string') {
        aiText = data;
      } else if (data.message?.text) {
        aiText = data.message.text;
      } else if (data.text) {
        aiText = data.text;
      } else if (data.reply) {
        aiText = data.reply;
      } else if (data.response_text) {
        aiText = data.response_text;
      } else {
        aiText = 'I apologize, but I couldn\'t process your request properly.';
      }
      
      return aiText;

    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('AI response timed out');
      }
      throw error;
    }
  }, [accessToken]);

  const textToSpeech = useCallback(async (text: string): Promise<void> => {
    const maxLength = APP_CONFIG.TTS.MAX_TEXT_LENGTH;
    const truncatedText = text.length > maxLength 
      ? text.substring(0, maxLength) + '...' 
      : text;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, APP_CONFIG.TIMEOUTS.TTS);

    try {
      const requestPayload = {
        text: truncatedText,
        voice_id: APP_CONFIG.TTS.DEFAULT_VOICE,
        language: 'en',
        format: 'wav',
        speed: APP_CONFIG.TTS.DEFAULT_SPEED,
        volume: 1.0,
        pitch: 0.0,
        metadata: {
          session_id: `tts_${Date.now()}`,
          platform: 'mobile',
          client: 'june-voice-app'
        }
      };

      const response = await fetch(`${APP_CONFIG.SERVICES.tts}${APP_CONFIG.ENDPOINTS.TTS}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Text-to-speech failed: ${response.status}`);
      }

      const audioBlob = await response.arrayBuffer();
      
      if (!audioBlob || audioBlob.byteLength === 0) {
        throw new Error('No audio data received');
      }

      // Save and play audio
      const audioPath = `${FileSystem.cacheDirectory}tts_response_${Date.now()}.wav`;
      const base64Audio = btoa(String.fromCharCode(...new Uint8Array(audioBlob)));
      
      await FileSystem.writeAsStringAsync(audioPath, base64Audio, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Clean up previous sound
      if (soundRef.current) {
        try {
          await soundRef.current.stopAsync();
          await soundRef.current.unloadAsync();
        } catch (e) {
          // Ignore cleanup errors
        }
      }

      const { sound } = await Audio.Sound.createAsync(
        { uri: audioPath },
        { shouldPlay: true, volume: 1.0 }
      );

      soundRef.current = sound;
      setState(s => ({ ...s, isPlaying: true }));

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setState(s => ({ ...s, isPlaying: false }));
          sound.unloadAsync();
          FileSystem.deleteAsync(audioPath, { idempotent: true });
        }
        
        if (status.isLoaded && status.error) {
          console.error('❌ Audio playback error:', status.error);
          setState(s => ({ ...s, isPlaying: false }));
        }
      });

    } catch (error: any) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        if (APP_CONFIG.DEBUG.TTS_FALLBACK) {
          // Fallback: Continue without audio
          setState(s => ({ ...s, error: 'Audio generation timed out - text response only' }));
          return;
        } else {
          throw new Error('Text-to-speech timed out');
        }
      }
      
      throw error;
    }
  }, [accessToken]);

  const clearError = useCallback(() => {
    setState(s => ({ ...s, error: null }));
  }, []);

  const resetVoice = useCallback(async () => {
    if (recordingRef.current) {
      try {
        await recordingRef.current.stopAndUnloadAsync();
      } catch (e) {
        // Ignore cleanup errors
      }
      recordingRef.current = null;
    }

    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
      } catch (e) {
        // Ignore cleanup errors
      }
      soundRef.current = null;
    }

    isProcessingRef.current = false;
    
    setState({
      isListening: false,
      isProcessing: false,
      isPlaying: false,
      transcription: '',
      aiResponse: '',
      error: null,
    });
  }, []);

  const value: VoiceContextValue = {
    ...state,
    startListening,
    stopListening,
    clearError,
    resetVoice,
  };

  return <VoiceContext.Provider value={value}>{children}</VoiceContext.Provider>;
}

export function useVoice() {
  const context = useContext(VoiceContext);
  if (!context) {
    throw new Error('useVoice must be used within VoiceProvider');
  }
  return context;
}