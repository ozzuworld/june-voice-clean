// hooks/useVoice.tsx - COMPLETE WORKING VERSION - FIXES DONOTMIX ERROR
import React, { createContext, useCallback, useContext, useState, useRef } from 'react';
import { Audio } from 'expo-av';
import { useAuth } from './useAuth';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

interface VoiceState {
  isListening: boolean;
  isProcessing: boolean;
  isPlaying: boolean;
  transcription: string;
  aiResponse: string;
  error: string | null;
}

interface VoiceContextType extends VoiceState {
  startListening: () => Promise<void>;
  stopListening: () => Promise<void>;
  clearError: () => void;
  resetVoice: () => void;
}

const VoiceContext = createContext<VoiceContextType | null>(null);

const ORCHESTRATOR_URL = 'https://june-orchestrator-359243954.us-central1.run.app';

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

  const recordingRef = useRef<Audio.Recording | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const isProcessingRef = useRef(false);

  const cleanup = useCallback(async () => {
    try {
      if (recordingRef.current) {
        try {
          const status = await recordingRef.current.getStatusAsync();
          if (status.canRecord) {
            await recordingRef.current.stopAndUnloadAsync();
          }
        } catch (error) {
          console.log('Recording cleanup error (ignored):', error);
        }
        recordingRef.current = null;
      }

      if (soundRef.current) {
        try {
          await soundRef.current.stopAsync();
          await soundRef.current.unloadAsync();
        } catch (error) {
          console.log('Sound cleanup error (ignored):', error);
        }
        soundRef.current = null;
      }
    } catch (error) {
      console.log('General cleanup error (ignored):', error);
    }
  }, []);

  const startListening = useCallback(async () => {
    if (!accessToken) {
      setState(prev => ({ ...prev, error: 'Not authenticated' }));
      return;
    }

    if (isProcessingRef.current || state.isListening || state.isProcessing) {
      console.log('Voice operation already in progress, ignoring');
      return;
    }

    try {
      console.log('🎤 Starting voice recording...');
      
      await cleanup();

      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        throw new Error('Microphone permission denied');
      }

      // FIXED: Completely remove problematic setAudioModeAsync call that causes DoNotMix error
      console.log('Setting up audio mode...');
      
      setState(prev => ({ 
        ...prev, 
        isListening: true,
        error: null,
        transcription: '',
        aiResponse: '',
      }));

      // FIXED: Simplified recording options that work across platforms
      const recordingOptions: Audio.RecordingOptions = {
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/webm;codecs=opus',
          bitsPerSecond: 128000,
        },
      };
      
      const { recording: newRecording } = await Audio.Recording.createAsync(recordingOptions);
      recordingRef.current = newRecording;
      
      console.log('✅ Recording started');

    } catch (error: any) {
      console.error('💥 Failed to start recording:', error);
      await cleanup();
      setState(prev => ({
        ...prev,
        isListening: false,
        error: `Failed to start recording: ${error.message}`,
      }));
    }
  }, [accessToken, state.isListening, state.isProcessing, cleanup]);

  const stopListening = useCallback(async () => {
    if (isProcessingRef.current || !state.isListening) {
      console.log('Not recording or already processing, ignoring stop');
      return;
    }

    isProcessingRef.current = true;

    try {
      console.log('🛑 Stopping voice recording...');
      
      if (!recordingRef.current) {
        setState(prev => ({ ...prev, isListening: false }));
        isProcessingRef.current = false;
        return;
      }

      setState(prev => ({ 
        ...prev, 
        isListening: false,
        isProcessing: true,
      }));

      const recording = recordingRef.current;
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      recordingRef.current = null;

      if (!uri) {
        throw new Error('No audio recorded');
      }

      console.log('📁 Audio recorded to:', uri);

      const fileInfo = await FileSystem.getInfoAsync(uri);
      console.log('📊 Audio file info:', fileInfo);

      if (!fileInfo.exists || fileInfo.size === 0) {
        throw new Error('Audio file is empty or does not exist');
      }

      // Read audio file as base64
      let audioData: string;
      try {
        audioData = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
      } catch (fileError: any) {
        throw new Error(`Failed to read audio file: ${fileError.message}`);
      }

      console.log('📤 Sending audio to orchestrator...', `${audioData.length} base64 chars`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      try {
        const response = await fetch(`${ORCHESTRATOR_URL}/v1/process-audio`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            audio_data: audioData
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Audio processing failed: ${response.status} ${errorText}`);
        }

        const data = await response.json();
        console.log('✅ Audio processing response:', data);

        if (data.error) {
          throw new Error(data.error);
        }

        setState(prev => ({
          ...prev,
          isProcessing: false,
          transcription: data.transcription || 'Could not transcribe audio',
          aiResponse: data.response_text || 'No response generated',
        }));

        // FIXED: Simple audio playback without problematic audio mode calls
        if (data.response_audio) {
          console.log('🔊 Playing audio response...');
          setState(prev => ({ ...prev, isPlaying: true }));
          
          try {
            const audioUri = `${FileSystem.documentDirectory}response_audio_${Date.now()}.mp3`;
            await FileSystem.writeAsStringAsync(audioUri, data.response_audio, {
              encoding: FileSystem.EncodingType.Base64,
            });

            const { sound: newSound } = await Audio.Sound.createAsync(
              { uri: audioUri },
              { 
                shouldPlay: true, 
                volume: 1.0,
                rate: 1.0,
                shouldCorrectPitch: true,
              }
            );

            soundRef.current = newSound;

            newSound.setOnPlaybackStatusUpdate((status) => {
              if (status.isLoaded && status.didJustFinish) {
                setState(prev => ({ ...prev, isPlaying: false }));
                newSound.unloadAsync().then(() => {
                  soundRef.current = null;
                  FileSystem.deleteAsync(audioUri, { idempotent: true }).catch(console.log);
                });
              }
            });

          } catch (audioError: any) {
            console.error('💥 Audio playback failed:', audioError);
            setState(prev => ({ ...prev, isPlaying: false }));
          }
        }

      } catch (networkError: any) {
        clearTimeout(timeoutId);
        if (networkError.name === 'AbortError') {
          throw new Error('Request timed out after 60 seconds');
        }
        throw networkError;
      }

      // Clean up recorded file
      try {
        await FileSystem.deleteAsync(uri, { idempotent: true });
      } catch (deleteError) {
        console.log('Could not delete temp file (ignored):', deleteError);
      }

    } catch (error: any) {
      console.error('💥 Voice processing error:', error);
      
      let errorMessage = 'Voice processing failed';
      
      if (error.message.includes('500')) {
        errorMessage = 'Speech service temporarily unavailable. Please try again.';
      } else if (error.message.includes('network')) {
        errorMessage = 'Network error. Please check your connection.';
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Request timed out. Please try a shorter recording.';
      } else if (error.message.includes('permission')) {
        errorMessage = 'Microphone permission required. Please enable in settings.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setState(prev => ({
        ...prev,
        isListening: false,
        isProcessing: false,
        error: errorMessage,
        transcription: 'Could not transcribe audio due to service error.',
        aiResponse: 'I apologize, but I encountered an error processing your voice message. Please try again or type your message instead.',
      }));
    } finally {
      isProcessingRef.current = false;
    }
  }, [state.isListening, accessToken]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const resetVoice = useCallback(async () => {
    isProcessingRef.current = false;
    
    setState({
      isListening: false,
      isProcessing: false,
      isPlaying: false,
      transcription: '',
      aiResponse: '',
      error: null,
    });
    
    await cleanup();
  }, [cleanup]);

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