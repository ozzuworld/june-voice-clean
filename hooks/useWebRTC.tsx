/**
 * useWebRTC (Legacy) - thin wrapper around LiveKitVoiceService
 * Kept for compatibility; will be removed once all components adopt LiveKitVoiceService directly.
 *
 * Finalized model:
 * 1) Create session with orchestrator → receive LiveKit JWT + livekit_url
 * 2) Connect to LiveKit with that token
 * 3) Optionally open app-level channel to orchestrator for AI/UX messages
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { useAuth } from './useAuth';
import { LiveKitVoiceService, LiveKitCallbacks } from '../lib/LiveKitVoiceService';
import type { RemoteParticipant, RemoteAudioTrack, LocalAudioTrack } from 'livekit-client';

interface Message { id: string; text: string; isUser: boolean; timestamp: Date; isVoice?: boolean; }

export function useWebRTC() {
  const { accessToken } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const voiceServiceRef = useRef<LiveKitVoiceService | null>(null);

  const initializeVoiceService = useCallback(() => {
    if (voiceServiceRef.current) return voiceServiceRef.current;

    const callbacks: LiveKitCallbacks = {
      onConnected: () => { setIsConnected(true); setError(null); const s = voiceServiceRef.current; if (s) setSessionId(s.getSessionId()); },
      onDisconnected: () => { setIsConnected(false); setIsStreaming(false); setSessionId(null); },
      onError: (m) => setError(m),
      onCallStarted: () => { setIsStreaming(true); setError(null); },
      onCallEnded: () => setIsStreaming(false),
      onOrchestratorMessage: (data: any) => {
        switch (data.type) {
          case 'stt_transcript': case 'transcription_result': { const text = data.text || data.transcript; if (text) setMessages(p => [...p, { id: `user-${Date.now()}`, text, isUser: true, timestamp: new Date(), isVoice: true }]); break; }
          case 'ai_response': case 'text_response': { const text = data.text || data.message; if (text) setMessages(p => [...p, { id: `bot-${Date.now()}`, text, isUser: false, timestamp: new Date() }]); break; }
          default: break;
        }
      },
      onRemoteAudioTrack: (_t: RemoteAudioTrack, _p: RemoteParticipant) => {},
      onLocalAudioTrack: (_t: LocalAudioTrack) => {},
      onParticipantJoined: (_p: RemoteParticipant) => {},
      onParticipantLeft: (_p: RemoteParticipant) => {},
    };

    const service = new LiveKitVoiceService(callbacks);
    if (accessToken) service.setAuthToken(accessToken);
    voiceServiceRef.current = service;
    return service;
  }, [accessToken]);

  const connect = useCallback(async () => {
    try {
      const service = initializeVoiceService();
      const roomName = `voice-${Date.now()}`;
      const participantName = `user-${Date.now()}`;
      const ok = await service.connect(roomName, participantName);
      if (!ok) throw new Error('Failed to connect');
    } catch (e: any) { setError(e?.message || 'Connection failed'); setIsConnected(false); }
  }, [initializeVoiceService]);

  const startStreaming = useCallback(async () => {
    try {
      const s = voiceServiceRef.current; if (!s) throw new Error('Voice service not initialized');
      if (!s.isConnectedToPlatform()) throw new Error('Not connected to June platform');
      const ok = await s.startVoiceCall(); if (!ok) throw new Error('Failed to start voice call');
    } catch (e: any) {
      setError(e?.message || 'Failed to start streaming'); setIsStreaming(false);
      if (e?.message?.includes('permission')) Alert.alert('Microphone Permission', 'Please grant microphone access to use voice features.', [{ text: 'OK' }]);
      else Alert.alert('Error', e?.message || 'Failed to start voice call');
    }
  }, []);

  const stopStreaming = useCallback(async () => { try { await voiceServiceRef.current?.endVoiceCall(); } catch {} }, []);

  useEffect(() => () => { voiceServiceRef.current?.disconnect(); }, []);

  return { isConnected, isStreaming, sessionId, error, messages, connect, startStreaming, stopStreaming };
}
