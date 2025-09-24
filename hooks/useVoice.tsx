// hooks/useVoice.tsx
import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Platform } from 'react-native';
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
  stopAndProcess: () => Promise<void>;
  reset: () => Promise<void>;
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

  const { accessToken, refreshAuth, isAuthenticated } = useAuth();

  const startListening = useCallback(async () => {
    if (!isAuthenticated || !accessToken) {
      setState(s => ({ ...s, error: 'Not authenticated' }));
      return;
    }

    await refreshAuth();

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
      playThroughEarpieceAndroid: false,
      staysActiveInBackground: false,
    });

    const recording = new Audio.Recording();
    await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
    await recording.startAsync();

    recordingRef.current = recording;
    setState(s => ({ ...s, isListening: true, error: null }));
  }, [accessToken, isAuthenticated, refreshAuth]);

  const stopAndProcess = useCallback(async () => {
    if (!isAuthenticated || !accessToken) {
      setState(s => ({ ...s, error: 'Not authenticated' }));
      return;
    }

    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    try {
      // Stop recording, get file
      const rec = recordingRef.current;
      if (rec) {
        await rec.stopAndUnloadAsync();
      }
      const uri = rec ? rec.getURI() : null;
      if (!uri) throw new Error('No audio URI');

      setState(s => ({ ...s, isListening: false, isProcessing: true }));

      // 1) Send to STT
      const form = new FormData();
      form.append('audio', { uri, name: 'input.m4a', type: 'audio/m4a' } as any);

      const sttRes = await fetch(`${APP_CONFIG.SERVICES.stt}/v1/transcribe`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: form,
      });
      if (!sttRes.ok) throw new Error(`STT ${sttRes.status}`);
      const sttData = await sttRes.json();
      const userText: string = sttData.text || sttData.transcription || '';

      // 2) Send to orchestrator (text-only)
      const chatRes = await fetch(`${APP_CONFIG.SERVICES.orchestrator}/v1/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ user_text: userText }),
      });
      if (!chatRes.ok) throw new Error(`Chat ${chatRes.status}`);
      const chatData = await chatRes.json();
      const aiText: string = chatData.ai_text || chatData.reply || '';

      // 3) TTS request
      const ttsRes = await fetch(`${APP_CONFIG.SERVICES.tts}/tts/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          text: aiText,
          language: 'en',
          speaker_id: 0,
          speed: 1.0,
          volume: 1.0,
          pitch: 0.0,
          metadata: {},
        }),
      });
      if (!ttsRes.ok) throw new Error(`TTS ${ttsRes.status}`);
      const ttsData = await ttsRes.json();

      // Expecting base64 audio (adjust to your API if it returns a URL)
      const mime = ttsData.mime_type || 'audio/wav';
      const base64 = ttsData.audio_base64;
      if (!base64) throw new Error('TTS missing audio');

      const ext = mime.includes('mp3') ? 'mp3' : 'wav';
      const out = FileSystem.cacheDirectory + `reply.${ext}`;
      await FileSystem.writeAsStringAsync(out, base64, { encoding: FileSystem.EncodingType.Base64 });

      // Play
      if (soundRef.current) {
        try { await soundRef.current.stopAsync(); await soundRef.current.unloadAsync(); } catch {}
      }
      const { sound } = await Audio.Sound.createAsync({ uri: out }, { shouldPlay: true });
      soundRef.current = sound;

      setState(s => ({
        ...s,
        isProcessing: false,
        isPlaying: true,
        transcription: userText,
        aiResponse: aiText,
        error: null,
      }));

      // cleanup file
      try { await FileSystem.deleteAsync(out, { idempotent: true }); } catch {}

    } catch (err: any) {
      setState(s => ({ ...s, isProcessing: false, error: err?.message || 'Voice processing failed' }));
    } finally {
      isProcessingRef.current = false;
      // cleanup recording
      if (recordingRef.current) {
        try { await recordingRef.current.stopAndUnloadAsync(); } catch {}
        recordingRef.current = null;
      }
    }
  }, [accessToken, isAuthenticated, refreshAuth]);

  const reset = useCallback(async () => {
    setState({ isListening: false, isProcessing: false, isPlaying: false, transcription: '', aiResponse: '', error: null });
    if (soundRef.current) {
      try { await soundRef.current.stopAsync(); await soundRef.current.unloadAsync(); } catch {}
      soundRef.current = null;
    }
  }, []);

  const value: VoiceContextValue = { ...state, startListening, stopAndProcess, reset };
  return <VoiceContext.Provider value={value}>{children}</VoiceContext.Provider>;
}

export function useVoice() {
  const ctx = useContext(VoiceContext);
  if (!ctx) throw new Error('useVoice must be used within VoiceProvider');
  return ctx;
}
