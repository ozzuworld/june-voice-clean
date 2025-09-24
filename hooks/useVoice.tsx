// hooks/useVoice.tsx - Enhanced for low-latency TTS + orchestrator control
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
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: false,
      });
    } catch (error) {
      console.error('Audio mode setup failed:', error);
      throw new Error('Failed to setup audio mode');
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
      await setupAudioMode();

      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        throw new Error('Microphone permission not granted');
      }

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync({
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
        // Optimize for voice
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
        web: {
          mimeType: 'audio/webm;codecs=opus',
          bitsPerSecond: 64000,
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

      console.log('🎤 Started recording');
    } catch (error: any) {
      console.error('Start recording failed:', error);
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
      // Stop recording
      const recording = recordingRef.current;
      if (!recording) {
        throw new Error('No active recording found');
      }

      await recording.stopAndUnloadAsync();
      const audioUri = recording.getURI();
      recordingRef.current = null;

      if (!audioUri) {
        throw new Error('No audio file generated');
      }

      setState(s => ({ 
        ...s, 
        isListening: false, 
        isProcessing: true,
        error: null,
      }));

      console.log('🎤 Stopped recording, processing audio...');

      // Process the voice input
      await processVoiceInput(audioUri);

    } catch (error: any) {
      console.error('Stop recording failed:', error);
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

  const processVoiceInput = useCallback(async (audioUri: string) => {
    try {
      // Step 1: Speech-to-Text
      console.log('📝 Converting speech to text...');
      const transcription = await speechToText(audioUri);
      
      setState(s => ({ ...s, transcription }));

      if (!transcription.trim()) {
        throw new Error('No speech detected in audio');
      }

      // Step 2: Get AI response from orchestrator
      console.log('🤖 Getting AI response...');
      const aiResponse = await getAIResponse(transcription);
      
      setState(s => ({ ...s, aiResponse }));

      // Step 3: Convert AI response to speech (low-latency)
      console.log('🔊 Converting text to speech...');
      await textToSpeech(aiResponse);

      setState(s => ({ 
        ...s, 
        isProcessing: false,
        error: null,
      }));

    } catch (error: any) {
      console.error('Voice processing failed:', error);
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
        throw new Error(`STT failed (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      const transcription = data.text || data.transcription || data.transcript || '';
      
      console.log('📝 Transcription:', transcription);
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
          user_input: text,
          context: {
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
        throw new Error(`Chat failed (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      const aiText = data.reply || data.response_text || data.ai_response || data.message || '';
      
      console.log('🤖 AI Response:', aiText);
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
      // Direct TTS call for low latency
      const response = await fetch(`${APP_CONFIG.SERVICES.tts}${APP_CONFIG.ENDPOINTS.TTS}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text,
          voice: APP_CONFIG.TTS.DEFAULT_VOICE,
          speed: APP_CONFIG.TTS.DEFAULT_SPEED,
          audio_encoding: APP_CONFIG.TTS.DEFAULT_ENCODING,
          quality: APP_CONFIG.TTS.QUALITY,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`TTS failed (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      
      // Handle different response formats
      let audioData: string;
      let mimeType = 'audio/wav';

      if (data.audio_base64) {
        audioData = data.audio_base64;
        mimeType = data.mime_type || mimeType;
      } else if (data.audio) {
        audioData = data.audio;
      } else {
        throw new Error('No audio data in TTS response');
      }

      // Save and play audio
      const fileExtension = mimeType.includes('mp3') ? 'mp3' : 'wav';
      const audioPath = `${FileSystem.cacheDirectory}tts_response.${fileExtension}`;

      await FileSystem.writeAsStringAsync(audioPath, audioData, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Clean up previous sound
      if (soundRef.current) {
        try {
          await soundRef.current.stopAsync();
          await soundRef.current.unloadAsync();
        } catch (e) {
          console.log('Error cleaning up previous sound:', e);
        }
      }

      // Play the audio
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioPath },
        { shouldPlay: true, volume: 1.0 }
      );

      soundRef.current = sound;
      
      setState(s => ({ ...s, isPlaying: true }));

      // Monitor playback
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setState(s => ({ ...s, isPlaying: false }));
          // Clean up
          sound.unloadAsync();
          FileSystem.deleteAsync(audioPath, { idempotent: true });
        }
      });

      console.log('🔊 Playing TTS audio');

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
    // Stop any ongoing operations
    if (recordingRef.current) {
      try {
        await recordingRef.current.stopAndUnloadAsync();
      } catch (e) {
        console.log('Error stopping recording:', e);
      }
      recordingRef.current = null;
    }

    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
      } catch (e) {
        console.log('Error stopping sound:', e);
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

    console.log('🔄 Voice state reset');
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