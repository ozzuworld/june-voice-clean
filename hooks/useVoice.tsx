// hooks/useVoice.tsx - FIXED: Ensure accessToken is passed to all API calls
import React, { createContext, useCallback, useContext, useRef, useState, useEffect } from 'react';
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
  
  // ✅ FIX: Store latest accessToken in a ref so it's always available
  const accessTokenRef = useRef<string | null>(null);
  
  useEffect(() => {
    accessTokenRef.current = accessToken;
    console.log('🔑 Access token updated:', accessToken ? 'Present' : 'Missing');
  }, [accessToken]);

  const setupAudioMode = useCallback(async () => {
    try {
      console.log('🔧 Setting up audio mode...');
      
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
      
      console.log('✅ Audio mode setup successful');
    } catch (error: any) {
      console.error('❌ Audio mode setup failed:', error);
      throw new Error(`Audio setup failed: ${error.message}`);
    }
  }, []);

  const startListening = useCallback(async () => {
    // ✅ FIX: Check ref instead of state
    if (!isAuthenticated || !accessTokenRef.current) {
      console.error('❌ Cannot start listening - not authenticated');
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
  }, [isAuthenticated, setupAudioMode, state.isListening, state.isProcessing]);

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

      console.log('🎤 Recording stopped, URI:', audioUri);

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

      // ✅ FIX: Check token before processing
      if (!accessTokenRef.current) {
        throw new Error('Authentication token missing. Please sign in again.');
      }

      console.log('🎤 Processing voice input from:', audioUri);
      console.log('🔑 Using token:', accessTokenRef.current.substring(0, 20) + '...');
      
      const fileInfo = await FileSystem.getInfoAsync(audioUri);
      console.log('📁 Audio file info:', {
        exists: fileInfo.exists,
        size: fileInfo.size,
        uri: audioUri
      });

      if (!fileInfo.exists) {
        throw new Error('Audio file does not exist at URI');
      }

      console.log('🎯 Using endpoints:', {
        STT: `${APP_CONFIG.SERVICES.stt}${APP_CONFIG.ENDPOINTS.STT}`,
        CHAT: `${APP_CONFIG.SERVICES.orchestrator}${APP_CONFIG.ENDPOINTS.CHAT}`,
        VOICE: `${APP_CONFIG.SERVICES.orchestrator}${APP_CONFIG.ENDPOINTS.VOICE_PROCESS}`,
      });

      console.log('📝 Method: STT → Chat → TTS');
      
      // Step 1: Speech-to-Text
      const transcription = await speechToText(audioUri);
      console.log('✅ Transcription received:', transcription);
      setState(s => ({ ...s, transcription }));

      if (!transcription.trim()) {
        throw new Error('No speech detected in audio');
      }

      // Step 2: Get AI Response
      const aiResponse = await getAIResponse(transcription);
      console.log('✅ AI response received:', aiResponse.substring(0, 100));
      setState(s => ({ ...s, aiResponse }));

      // Step 3: Text-to-Speech
      await textToSpeech(aiResponse);
      console.log('✅ TTS completed');

      setState(s => ({ 
        ...s, 
        isProcessing: false,
        error: null,
      }));

    } catch (error: any) {
      console.error('❌ Voice processing failed:', error);
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      
      setState(s => ({ 
        ...s, 
        isProcessing: false,
        error: error.message || 'Voice processing failed',
      }));
    }
  }, []);

  const speechToText = useCallback(async (audioUri: string): Promise<string> => {
    const sttEndpoint = `${APP_CONFIG.SERVICES.stt}${APP_CONFIG.ENDPOINTS.STT}`;
    console.log('🎯 Calling STT endpoint:', sttEndpoint);

    // ✅ FIX: Use ref to get latest token
    const token = accessTokenRef.current;
    if (!token) {
      throw new Error('No authentication token available');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log('⏰ STT timeout reached');
      controller.abort();
    }, APP_CONFIG.TIMEOUTS.STT);

    try {
      const formData = new FormData();
      formData.append('audio', {
        uri: audioUri,
        name: 'recording.m4a',
        type: 'audio/m4a',
      } as any);

      console.log('📤 Sending STT request:', {
        endpoint: sttEndpoint,
        hasAuth: !!token,
        authPrefix: token.substring(0, 20) + '...',
        fileUri: audioUri,
      });

      const response = await fetch(sttEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`, // ✅ FIX: Use token from ref
          // Don't set Content-Type - let FormData handle it
        },
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      console.log('📥 STT response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ STT error response:', errorText);
        throw new Error(`STT failed (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ STT data received:', data);
      
      const transcription = data.text || data.transcription || data.transcript || '';
      
      if (!transcription.trim()) {
        throw new Error('STT returned empty transcription');
      }

      return transcription;

    } catch (error: any) {
      clearTimeout(timeoutId);
      console.error('❌ STT error:', error);
      
      if (error.name === 'AbortError') {
        throw new Error('Speech recognition timed out');
      }
      
      if (error.message.includes('Network request failed')) {
        console.error('🔴 NETWORK ERROR - Possible causes:');
        console.error('  1. STT service is down:', APP_CONFIG.SERVICES.stt);
        console.error('  2. Device has no internet connection');
        console.error('  3. CORS or firewall blocking request');
        console.error('  4. SSL certificate issue');
        throw new Error(`Cannot reach STT service at ${APP_CONFIG.SERVICES.stt}`);
      }
      
      throw error;
    }
  }, []);

  const getAIResponse = useCallback(async (text: string): Promise<string> => {
    const chatEndpoint = `${APP_CONFIG.SERVICES.orchestrator}${APP_CONFIG.ENDPOINTS.CHAT}`;
    console.log('🎯 Calling Chat endpoint:', chatEndpoint);

    // ✅ FIX: Use ref to get latest token
    const token = accessTokenRef.current;
    if (!token) {
      throw new Error('No authentication token available');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log('⏰ Chat timeout reached');
      controller.abort();
    }, APP_CONFIG.TIMEOUTS.CHAT);

    try {
      const requestBody = {
        text: text,
        language: 'en',
        metadata: {
          mode: 'voice',
          platform: 'mobile',
          session_id: `voice_${Date.now()}`,
        }
      };

      console.log('📤 Sending chat request:', {
        endpoint: chatEndpoint,
        textLength: text.length,
        hasAuth: !!token,
      });

      const response = await fetch(chatEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`, // ✅ FIX: Use token from ref
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      console.log('📥 Chat response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Chat error response:', errorText);
        throw new Error(`Chat failed (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Chat data received:', JSON.stringify(data).substring(0, 200));
      
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
        console.warn('⚠️ Unexpected chat response format:', data);
        aiText = 'I received your message but had trouble formatting my response.';
      }
      
      return aiText;

    } catch (error: any) {
      clearTimeout(timeoutId);
      console.error('❌ Chat error:', error);
      
      if (error.name === 'AbortError') {
        throw new Error('AI response timed out');
      }
      
      if (error.message.includes('Network request failed')) {
        console.error('🔴 NETWORK ERROR - Cannot reach orchestrator');
        throw new Error(`Cannot reach orchestrator at ${APP_CONFIG.SERVICES.orchestrator}`);
      }
      
      throw error;
    }
  }, []);

  const textToSpeech = useCallback(async (text: string): Promise<void> => {
    const ttsEndpoint = `${APP_CONFIG.SERVICES.tts}${APP_CONFIG.ENDPOINTS.TTS}`;
    console.log('🎯 Calling TTS endpoint:', ttsEndpoint);

    // ✅ FIX: Use ref to get latest token
    const token = accessTokenRef.current;
    if (!token) {
      throw new Error('No authentication token available');
    }

    const maxLength = APP_CONFIG.TTS.MAX_TEXT_LENGTH;
    const truncatedText = text.length > maxLength 
      ? text.substring(0, maxLength) + '...' 
      : text;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log('⏰ TTS timeout reached');
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
        }
      };

      console.log('📤 Sending TTS request:', {
        endpoint: ttsEndpoint,
        textLength: truncatedText.length,
        hasAuth: !!token,
      });

      const response = await fetch(ttsEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`, // ✅ FIX: Use token from ref
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      console.log('📥 TTS response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ TTS error response:', errorText);
        throw new Error(`TTS failed (${response.status}): ${errorText}`);
      }

      const audioBlob = await response.arrayBuffer();
      console.log('✅ TTS audio received:', audioBlob.byteLength, 'bytes');
      
      if (!audioBlob || audioBlob.byteLength === 0) {
        throw new Error('TTS returned no audio data');
      }

      const audioPath = `${FileSystem.cacheDirectory}tts_response_${Date.now()}.wav`;
      const base64Audio = btoa(String.fromCharCode(...new Uint8Array(audioBlob)));
      
      await FileSystem.writeAsStringAsync(audioPath, base64Audio, {
        encoding: FileSystem.EncodingType.Base64,
      });

      console.log('💾 Audio saved to:', audioPath);

      if (soundRef.current) {
        try {
          await soundRef.current.stopAsync();
          await soundRef.current.unloadAsync();
        } catch (e) {
          console.warn('⚠️ Sound cleanup error:', e);
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

    } catch (error: any) {
      clearTimeout(timeoutId);
      console.error('❌ TTS error:', error);
      
      if (error.name === 'AbortError') {
        if (APP_CONFIG.DEBUG.TTS_FALLBACK) {
          console.warn('⚠️ TTS timeout - continuing without audio');
          setState(s => ({ ...s, error: 'Audio generation timed out' }));
          return;
        } else {
          throw new Error('Text-to-speech timed out');
        }
      }
      
      if (error.message.includes('Network request failed')) {
        console.error('🔴 NETWORK ERROR - Cannot reach TTS service');
        throw new Error(`Cannot reach TTS service at ${APP_CONFIG.SERVICES.tts}`);
      }
      
      throw error;
    }
  }, []);

  const clearError = useCallback(() => {
    setState(s => ({ ...s, error: null }));
  }, []);

  const resetVoice = useCallback(async () => {
    console.log('🔄 Resetting voice state');
    
    if (recordingRef.current) {
      try {
        await recordingRef.current.stopAndUnloadAsync();
      } catch (e) {
        console.warn('⚠️ Recording cleanup error:', e);
      }
      recordingRef.current = null;
    }

    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
      } catch (e) {
        console.warn('⚠️ Sound cleanup error:', e);
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