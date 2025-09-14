// src/hooks/useVoice.tsx
import { Audio } from 'expo-av';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Alert, Platform } from 'react-native';

import { AUTH_CONFIG } from '@/config/auth.config';
import { voiceService } from '@/services/voice.service';
import type { VoiceContextType, VoiceState } from '@/types/voice.types';
import { useAuth } from './useAuth';

const VoiceContext = createContext<VoiceContextType | null>(null);

export function VoiceProvider({ children }: { children: React.ReactNode }) {
  const { accessToken } = useAuth();
  const [state, setState] = useState<VoiceState>({
    isListening: false,
    isProcessing: false,
    isPlaying: false,
    transcription: '',
    aiResponse: '',
    error: null,
  });

  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [permissionResponse, requestPermission] = Audio.usePermissions();

  useEffect(() => {
    setupAudio();
    return () => {
      cleanup();
    };
  }, []);

  const setupAudio = async () => {
    try {
      if (Platform.OS === 'ios') {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });
      }
    } catch (error) {
      console.error('Failed to setup audio:', error);
    }
  };

  const cleanup = () => {
    if (recording) {
      recording.stopAndUnloadAsync();
    }
    if (sound) {
      sound.unloadAsync();
    }
  };

  const startListening = useCallback(async () => {
    if (!accessToken) {
      Alert.alert('Error', 'No authentication token available');
      return;
    }

    try {
      setState(prev => ({ 
        ...prev, 
        error: null, 
        transcription: '', 
        aiResponse: '',
        isListening: true,
      }));

      // Check microphone permissions
      if (permissionResponse?.status !== 'granted') {
        const permission = await requestPermission();
        if (!permission.granted) {
          Alert.alert('Permission Required', 'Please grant microphone permission to use voice chat.');
          setState(prev => ({ ...prev, isListening: false }));
          return;
        }
      }

      const { recording } = await Audio.Recording.createAsync({
        android: {
          extension: '.wav',
          outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_DEFAULT,
          audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_DEFAULT,
          sampleRate: AUTH_CONFIG.voice.sampleRate,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: '.wav',
          outputFormat: Audio.RECORDING_OPTION_IOS_OUTPUT_FORMAT_LINEARPCM,
          audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_HIGH,
          sampleRate: AUTH_CONFIG.voice.sampleRate,
          numberOfChannels: 1,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
      });

      setRecording(recording);

      // Auto-stop recording after 10 seconds
      setTimeout(() => {
        if (recording) {
          stopListening();
        }
      }, 10000);

    } catch (error) {
      console.error('Failed to start recording:', error);
      setState(prev => ({ 
        ...prev, 
        error: 'Failed to start recording',
        isListening: false 
      }));
    }
  }, [accessToken, permissionResponse, requestPermission]);

  const stopListening = useCallback(async () => {
    if (!recording) return;

    try {
      setState(prev => ({ 
        ...prev, 
        isListening: false, 
        isProcessing: true 
      }));

      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);

      if (uri && accessToken) {
        await processAudioFile(uri);
      }
    } catch (error) {
      console.error('Failed to stop recording:', error);
      setState(prev => ({ 
        ...prev, 
        error: 'Failed to process audio',
        isProcessing: false 
      }));
    }
  }, [recording, accessToken]);

  const processAudioFile = async (audioUri: string) => {
    if (!accessToken) return;

    try {
      // Read audio file and convert to base64
      const response = await fetch(audioUri);
      const audioBlob = await response.blob();
      const audioBase64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]); // Remove data URL prefix
        };
        reader.readAsDataURL(audioBlob);
      });

      // Process through voice service
      const result = await voiceService.processVoiceInteraction({
        audio_data: audioBase64,
        language: AUTH_CONFIG.voice.defaultLanguage,
        voice_settings: {
          language_code: AUTH_CONFIG.voice.defaultLanguage,
          voice_name: AUTH_CONFIG.voice.defaultVoice,
          audio_encoding: AUTH_CONFIG.voice.audioEncoding,
        },
      }, accessToken);

      if (result.success) {
        setState(prev => ({
          ...prev,
          isProcessing: false,
          transcription: result.transcription || 'No transcription available',
          aiResponse: result.response_text || 'No response generated',
        }));

        // Play AI audio response if available
        if (result.response_audio) {
          await playAudioResponse(result.response_audio);
        }
      } else {
        setState(prev => ({
          ...prev,
          isProcessing: false,
          error: result.error || 'Voice processing failed',
        }));
      }

    } catch (error) {
      console.error('Failed to process audio:', error);
      setState(prev => ({
        ...prev,
        isProcessing: false,
        error: `Processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }));
    }
  };

  const playAudioResponse = async (audioBase64: string) => {
    try {
      setState(prev => ({ ...prev, isPlaying: true }));

      // Create audio file from base64
      const audioUri = `data:audio/mpeg;base64,${audioBase64}`;
      
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUri },
        { shouldPlay: true }
      );

      setSound(sound);

      // Listen for playback completion
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setState(prev => ({ ...prev, isPlaying: false }));
          sound.unloadAsync();
          setSound(null);
        }
      });

    } catch (error) {
      console.error('Failed to play audio response:', error);
      setState(prev => ({
        ...prev,
        isPlaying: false,
        error: 'Failed to play audio response',
      }));
    }
  };

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const resetVoice = useCallback(() => {
    setState({
      isListening: false,
      isProcessing: false,
      isPlaying: false,
      transcription: '',
      aiResponse: '',
      error: null,
    });
  }, []);

  const value: VoiceContextType = {
    ...state,
    startListening,
    stopListening,
    clearError,
    resetVoice,
  };

  return (
    <VoiceContext.Provider value={value}>
      {children}
    </VoiceContext.Provider>
  );
}

export function useVoice(): VoiceContextType {
  const context = useContext(VoiceContext);
  if (!context) {
    throw new Error('useVoice must be used within a VoiceProvider');
  }
  return context;
}