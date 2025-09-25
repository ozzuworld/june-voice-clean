// hooks/useVoice.tsx - Fixed audio setup + STT bypass option
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

// TEMP: Set this to true to skip STT and use placeholder text
const SKIP_STT_FOR_TESTING = true;
const MOCK_TRANSCRIPTION = "Hello, please generate a test response about the weather today.";

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

  // FIXED: Simple and compatible audio mode setup
  const setupAudioMode = useCallback(async () => {
    try {
      console.log('🔧 Setting up audio mode...');
      
      // Use a simpler, more compatible setup that works across expo-av versions
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: false,
        // Remove interruption mode constants that might not exist
        ...(Platform.OS === 'ios' && {
          // Only add iOS-specific settings if we're on iOS
          interruptionModeIOS: 1, // 1 = DoNotMix mode
        }),
        ...(Platform.OS === 'android' && {
          // Only add Android-specific settings if we're on Android
          interruptionModeAndroid: 1, // 1 = DoNotMix mode
        }),
      });
      
      console.log('✅ Audio mode setup successful');
    } catch (error) {
      console.error('❌ Audio mode setup failed:', error);
      
      // Fallback: Try with minimal settings
      try {
        console.log('🔄 Trying fallback audio setup...');
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
        });
        console.log('✅ Fallback audio mode setup successful');
      } catch (fallbackError) {
        console.error('❌ Fallback audio setup also failed:', fallbackError);
        throw new Error(`Audio setup failed: ${fallbackError.message}`);
      }
    }
  }, []);

  const startListening = useCallback(async () => {
    if (!isAuthenticated || !accessToken) {
      setState(s => ({ ...s, error: 'Not authenticated' }));
      return;
    }

    if (state.isListening || state.isProcessing) {
      console.log('Already listening or processing');
      return;
    }

    try {
      console.log('🎤 Starting voice recording...');
      await setupAudioMode();

      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        throw new Error('Microphone permission not granted');
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

      console.log('✅ Recording started successfully');
    } catch (error: any) {
      console.error('❌ Start recording failed:', error);
      setState(s => ({ 
        ...s, 
        error: error.message || 'Failed to start recording',
      }));
    }
  }, [accessToken, isAuthenticated, setupAudioMode, state.isListening, state.isProcessing]);

  const stopListening = useCallback(async () => {
    if (!state.isListening || isProcessingRef.current) {
      console.log('Not listening or already processing');
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

      console.log('🎤 Recording stopped, audio saved:', audioUri);

      setState(s => ({ 
        ...s, 
        isListening: false, 
        isProcessing: true,
        error: null,
      }));

      console.log('🔄 Processing voice input...');
      await processVoiceInput(audioUri);

    } catch (error: any) {
      console.error('❌ Stop recording failed:', error);
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
      let transcription = '';

      if (SKIP_STT_FOR_TESTING) {
        // TEMP: Skip STT and use mock transcription for testing
        console.log('⚠️ SKIPPING STT - Using mock transcription for testing');
        transcription = MOCK_TRANSCRIPTION;
        setState(s => ({ ...s, transcription }));
        
        // Add a small delay to simulate processing
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else {
        // Step 1: Speech-to-Text (when your STT service is ready)
        console.log('📝 Converting speech to text...');
        if (!audioUri) {
          throw new Error('No audio file to process');
        }
        transcription = await speechToText(audioUri);
        setState(s => ({ ...s, transcription }));
      }

      if (!transcription.trim()) {
        throw new Error('No transcription available');
      }

      // Step 2: Get AI response from orchestrator
      console.log('🤖 Getting AI response for:', transcription);
      const aiResponse = await getAIResponse(transcription);
      
      setState(s => ({ ...s, aiResponse }));

      // Step 3: Convert AI response to speech
      console.log('🔊 Converting response to speech...');
      await textToSpeech(aiResponse);

      setState(s => ({ 
        ...s, 
        isProcessing: false,
        error: null,
      }));

      console.log('✅ Voice processing completed successfully');

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
      console.log('📝 Calling STT service...');
      
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
        throw new Error(`STT failed (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      const transcription = data.text || data.transcription || data.transcript || '';
      
      console.log('✅ STT result:', transcription);
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
      console.log('🤖 Calling orchestrator with:', text);
      
      const response = await fetch(`${APP_CONFIG.SERVICES.orchestrator}${APP_CONFIG.ENDPOINTS.CHAT}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text,
          language: 'en',
          voice_id: 'default',
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
        const errorText = await response.text();
        console.error('❌ Orchestrator error response:', errorText);
        throw new Error(`Chat failed (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Orchestrator response:', data);
      
      // Handle different response formats from orchestrator
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
        aiText = 'Sorry, I couldn\'t process your request.';
      }
      
      console.log('✅ Parsed AI response:', aiText);
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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), APP_CONFIG.TIMEOUTS.TTS);

    try {
      console.log('🔊 Calling TTS service with text:', text);
      
      // Call your TTS service 
      const response = await fetch(`${APP_CONFIG.SERVICES.tts}${APP_CONFIG.ENDPOINTS.TTS}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text,
          voice_id: APP_CONFIG.TTS.DEFAULT_VOICE,
          language: 'en',
          format: 'wav',
          speed: APP_CONFIG.TTS.DEFAULT_SPEED,
          volume: 1.0,
          pitch: 0.0,
          metadata: {}
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ TTS error response:', errorText);
        throw new Error(`TTS failed (${response.status}): ${errorText}`);
      }

      // The response should be audio bytes directly
      const audioBlob = await response.arrayBuffer();
      
      if (!audioBlob || audioBlob.byteLength === 0) {
        throw new Error('No audio data in TTS response');
      }

      console.log('✅ TTS response received:', audioBlob.byteLength, 'bytes');

      // Save audio to file and play
      const audioPath = `${FileSystem.cacheDirectory}tts_response.wav`;
      const base64Audio = btoa(String.fromCharCode(...new Uint8Array(audioBlob)));
      
      await FileSystem.writeAsStringAsync(audioPath, base64Audio, {
        encoding: FileSystem.EncodingType.Base64,
      });

      console.log('💾 Audio saved to:', audioPath);

      // Clean up previous sound
      if (soundRef.current) {
        try {
          await soundRef.current.stopAsync();
          await soundRef.current.unloadAsync();
        } catch (e) {
          console.log('⚠️ Error cleaning up previous sound:', e);
        }
      }

      // Play the audio
      console.log('🎵 Starting audio playback...');
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioPath },
        { shouldPlay: true, volume: 1.0 }
      );

      soundRef.current = sound;
      
      setState(s => ({ ...s, isPlaying: true }));

      // Monitor playback
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          console.log('✅ Audio playback finished');
          setState(s => ({ ...s, isPlaying: false }));
          sound.unloadAsync();
          FileSystem.deleteAsync(audioPath, { idempotent: true });
        }
        
        if (status.isLoaded && status.error) {
          console.error('❌ Audio playback error:', status.error);
          setState(s => ({ ...s, isPlaying: false }));
        }
      });

      console.log('🔊 Audio playback started successfully');

    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Text-to-speech timed out');
      }
      throw error;
    }
  }, [accessToken]);

  const clearError = useCallback(() => {
    setState(s => ({ ...s, error: null }));
  }, []);

  const resetVoice = useCallback(async () => {
    console.log('🔄 Resetting voice state...');
    
    if (recordingRef.current) {
      try {
        await recordingRef.current.stopAndUnloadAsync();
      } catch (e) {
        console.log('⚠️ Error stopping recording:', e);
      }
      recordingRef.current = null;
    }

    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
      } catch (e) {
        console.log('⚠️ Error stopping sound:', e);
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

    console.log('✅ Voice state reset completed');
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