/**
 * WebRTC Hook - UPDATED TO USE LIVEKIT + JUNE ORCHESTRATOR
 * 
 * This hook is now deprecated in favor of the new LiveKitVoiceService.
 * It's kept for backward compatibility but should be replaced with:
 * 
 * import { LiveKitVoiceService } from '../lib/LiveKitVoiceService';
 * or
 * import { JuneVoiceChat } from '../components/JuneVoiceChat';
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { useAuth } from './useAuth';
import { LiveKitVoiceService, LiveKitCallbacks } from '../lib/LiveKitVoiceService';
import type { RemoteParticipant, RemoteAudioTrack, LocalAudioTrack } from 'livekit-client';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  isVoice?: boolean;
}

/**
 * LEGACY HOOK - Use LiveKitVoiceService directly instead
 * 
 * This hook provides backward compatibility for existing components
 * but internally uses the new LiveKit + June orchestrator integration
 */
export function useWebRTC() {
  const { accessToken } = useAuth();
  
  const [isConnected, setIsConnected] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const voiceServiceRef = useRef<LiveKitVoiceService | null>(null);

  // Initialize LiveKit voice service
  const initializeVoiceService = useCallback(() => {
    if (voiceServiceRef.current) {
      return voiceServiceRef.current;
    }

    const callbacks: LiveKitCallbacks = {
      onConnected: () => {
        console.log('✅ Connected to June platform');
        setIsConnected(true);
        setError(null);
        const service = voiceServiceRef.current;
        if (service) {
          setSessionId(service.getSessionId());
        }
      },

      onDisconnected: () => {
        console.log('🔌 Disconnected from June platform');
        setIsConnected(false);
        setIsStreaming(false);
        setSessionId(null);
      },

      onError: (errorMessage: string) => {
        console.error('❌ June platform error:', errorMessage);
        setError(errorMessage);
      },

      onCallStarted: () => {
        console.log('🎤 Voice call started');
        setIsStreaming(true);
        setError(null);
      },

      onCallEnded: () => {
        console.log('📴 Voice call ended');
        setIsStreaming(false);
      },

      onOrchestratorMessage: (data: any) => {
        console.log('📨 Orchestrator message:', data);
        
        // Handle different message types from orchestrator
        switch (data.type) {
          case 'transcription_result':
          case 'stt_transcript':
            if (data.text || data.transcript) {
              const text = data.text || data.transcript;
              console.log('🎙️ Transcript:', text);
              setMessages(prev => [...prev, {
                id: `user-${Date.now()}`,
                text: text,
                isUser: true,
                timestamp: new Date(),
                isVoice: true,
              }]);
            }
            break;
            
          case 'text_response':
          case 'ai_response':
            if (data.text || data.message) {
              const text = data.text || data.message;
              console.log('🤖 AI Response:', text);
              setMessages(prev => [...prev, {
                id: `bot-${Date.now()}`,
                text: text,
                isUser: false,
                timestamp: new Date(),
              }]);
            }
            break;
            
          case 'error':
            console.error('❌ Server error:', data.message);
            setError(data.message || 'Unknown error');
            break;
            
          default:
            console.log('📨 Unhandled orchestrator message:', data.type);
        }
      },

      onRemoteAudioTrack: (track: RemoteAudioTrack, participant: RemoteParticipant) => {
        console.log('🎵 Receiving audio from:', participant.identity);
      },

      onLocalAudioTrack: (track: LocalAudioTrack) => {
        console.log('🎤 Local audio track created');
      },

      onParticipantJoined: (participant: RemoteParticipant) => {
        console.log('👤 Participant joined:', participant.identity);
      },

      onParticipantLeft: (participant: RemoteParticipant) => {
        console.log('👤 Participant left:', participant.identity);
      }
    };

    const service = new LiveKitVoiceService(callbacks);
    
    // Set auth token if available
    if (accessToken) {
      service.setAuthToken(accessToken);
    }
    
    voiceServiceRef.current = service;
    return service;
  }, [accessToken]);

  const connect = useCallback(async () => {
    try {
      console.log('🔗 Connecting to June platform...');
      const service = initializeVoiceService();
      
      // Generate a room name and participant name
      const roomName = `webrtc-room-${Date.now()}`;
      const participantName = `user-${Date.now()}`;
      
      const success = await service.connect(roomName, participantName);
      if (!success) {
        throw new Error('Failed to connect to June platform');
      }
      
    } catch (error: any) {
      console.error('❌ Connection failed:', error);
      setError(error.message || 'Connection failed');
      setIsConnected(false);
    }
  }, [initializeVoiceService]);

  const startStreaming = useCallback(async () => {
    try {
      const service = voiceServiceRef.current;
      if (!service) {
        throw new Error('Voice service not initialized');
      }
      
      if (!service.isConnectedToPlatform()) {
        throw new Error('Not connected to June platform');
      }
      
      console.log('🎤 Starting voice streaming...');
      const success = await service.startVoiceCall();
      if (!success) {
        throw new Error('Failed to start voice call');
      }
      
    } catch (error: any) {
      console.error('❌ Failed to start streaming:', error);
      setError(error.message || 'Failed to start streaming');
      setIsStreaming(false);
      
      // Show user-friendly error messages
      if (error.message.includes('permission') || error.message.includes('Permission')) {
        Alert.alert(
          'Microphone Permission',
          'Please grant microphone access to use voice features.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', error.message || 'Failed to start voice call');
      }
    }
  }, []);

  const stopStreaming = useCallback(async () => {
    try {
      const service = voiceServiceRef.current;
      if (service) {
        console.log('🛑 Stopping voice streaming...');
        await service.endVoiceCall();
      }
    } catch (error: any) {
      console.error('❌ Failed to stop streaming:', error);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const service = voiceServiceRef.current;
      if (service) {
        service.disconnect();
      }
    };
  }, []);

  return {
    // Connection state
    isConnected,
    isStreaming,
    sessionId,
    error,
    
    // Messages (for chat functionality)
    messages,
    
    // Actions
    connect,
    startStreaming,
    stopStreaming,
    
    // Deprecated - for backward compatibility
    // These were part of the old Janus implementation
    cleanup: () => {
      console.warn('useWebRTC.cleanup() is deprecated. Use disconnect() instead.');
      const service = voiceServiceRef.current;
      if (service) {
        service.disconnect();
      }
    }
  };
}