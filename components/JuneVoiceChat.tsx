/**
 * June Voice Chat Component
 * 
 * Complete integration example showing how to connect to your June backend
 * with LiveKit for WebRTC and Orchestrator for AI/business logic
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { LiveKitVoiceService, LiveKitCallbacks } from '../lib/LiveKitVoiceService';
import type { RemoteAudioTrack, LocalAudioTrack, RemoteParticipant } from 'livekit-client';

interface JuneVoiceChatProps {
  roomName: string;
  participantName: string;
  authToken?: string; // Keycloak token if you have auth setup
  onCallStateChanged?: (inCall: boolean) => void;
  onAiResponse?: (response: string) => void;
  onError?: (error: string) => void;
}

export const JuneVoiceChat: React.FC<JuneVoiceChatProps> = ({
  roomName,
  participantName,
  authToken,
  onCallStateChanged,
  onAiResponse,
  onError
}) => {
  const [voiceService] = useState(() => new LiveKitVoiceService());
  const [isConnected, setIsConnected] = useState(false);
  const [isInCall, setIsInCall] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [participants, setParticipants] = useState<any[]>([]);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Setup LiveKit callbacks
  const callbacks: LiveKitCallbacks = {
    onConnected: () => {
      console.log('✅ Connected to June platform');
      setIsConnected(true);
      setConnectionStatus('connected');
      setSessionId(voiceService.getSessionId());
    },

    onDisconnected: () => {
      console.log('🔌 Disconnected from June platform');
      setIsConnected(false);
      setIsInCall(false);
      setConnectionStatus('disconnected');
      setSessionId(null);
      onCallStateChanged?.(false);
    },

    onError: (error: string) => {
      console.error('❌ June platform error:', error);
      setConnectionStatus('error');
      onError?.(error);
      Alert.alert('Connection Error', error);
    },

    onCallStarted: () => {
      console.log('🎤 Voice call started');
      setIsInCall(true);
      onCallStateChanged?.(true);
    },

    onCallEnded: () => {
      console.log('📴 Voice call ended');
      setIsInCall(false);
      onCallStateChanged?.(false);
    },

    onParticipantJoined: (participant: RemoteParticipant) => {
      console.log('👤 Participant joined:', participant.identity);
      setParticipants(voiceService.getParticipants());
    },

    onParticipantLeft: (participant: RemoteParticipant) => {
      console.log('👤 Participant left:', participant.identity);
      setParticipants(voiceService.getParticipants());
    },

    onRemoteAudioTrack: (track: RemoteAudioTrack, participant: RemoteParticipant) => {
      console.log('🎵 Receiving audio from:', participant.identity);
      // Audio will be played automatically by LiveKit
    },

    onLocalAudioTrack: (track: LocalAudioTrack) => {
      console.log('🎤 Local audio track created');
      // Your microphone is now active
    },

    onOrchestratorMessage: (data: any) => {
      console.log('📨 Message from June orchestrator:', data);
      
      // Handle different types of orchestrator messages
      switch (data.type) {
        case 'ai_response':
          onAiResponse?.(data.message);
          break;
        case 'tts_audio':
          // Handle TTS audio if needed
          break;
        case 'stt_transcript':
          // Handle STT transcript if needed
          break;
        default:
          console.log('Unknown orchestrator message type:', data.type);
      }
    },

    onDataReceived: (payload: Uint8Array, participant: RemoteParticipant) => {
      const decoder = new TextDecoder();
      const message = decoder.decode(payload);
      console.log('📨 Data message from', participant.identity + ':', message);
    }
  };

  // Initialize voice service with callbacks
  useEffect(() => {
    voiceService.callbacks = callbacks;
    
    // Set auth token if provided
    if (authToken) {
      voiceService.setAuthToken(authToken);
    }

    return () => {
      // Cleanup on unmount
      voiceService.disconnect();
    };
  }, [authToken]);

  // Connect to June platform
  const handleConnect = useCallback(async () => {
    if (isConnected) {
      await handleDisconnect();
      return;
    }

    setConnectionStatus('connecting');
    
    try {
      const success = await voiceService.connect(roomName, participantName);
      if (!success) {
        setConnectionStatus('error');
      }
    } catch (error) {
      console.error('Connection failed:', error);
      setConnectionStatus('error');
    }
  }, [isConnected, roomName, participantName, voiceService]);

  // Disconnect from June platform
  const handleDisconnect = useCallback(async () => {
    setConnectionStatus('disconnecting');
    await voiceService.disconnect();
  }, [voiceService]);

  // Start/stop voice call
  const handleVoiceCall = useCallback(async () => {
    if (!isConnected) {
      Alert.alert('Not Connected', 'Please connect to the platform first.');
      return;
    }

    if (isInCall) {
      await voiceService.endVoiceCall();
    } else {
      const success = await voiceService.startVoiceCall();
      if (!success) {
        Alert.alert('Voice Call Failed', 'Could not start voice call. Please check your microphone permissions.');
      }
    }
  }, [isConnected, isInCall, voiceService]);

  // Toggle mute
  const handleToggleMute = useCallback(async () => {
    if (!isInCall) return;
    
    const newMutedState = !isMuted;
    await voiceService.setMicrophoneEnabled(!newMutedState);
    setIsMuted(newMutedState);
  }, [isInCall, isMuted, voiceService]);

  // Send AI message
  const handleSendAiMessage = useCallback(async (message: string) => {
    if (!isConnected) {
      Alert.alert('Not Connected', 'Please connect to the platform first.');
      return;
    }

    try {
      const response = await voiceService.sendAiMessage(message);
      console.log('AI response:', response);
    } catch (error) {
      console.error('Failed to send AI message:', error);
      Alert.alert('AI Error', 'Failed to send message to AI.');
    }
  }, [isConnected, voiceService]);

  // Get connection status color
  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return '#4CAF50';
      case 'connecting': case 'disconnecting': return '#FF9800';
      case 'error': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  return (
    <View style={styles.container}>
      {/* Connection Status */}
      <View style={styles.statusContainer}>
        <View style={[styles.statusIndicator, { backgroundColor: getStatusColor() }]} />
        <Text style={styles.statusText}>
          Status: {connectionStatus.toUpperCase()}
        </Text>
        {sessionId && (
          <Text style={styles.sessionText}>Session: {sessionId.substring(0, 8)}...</Text>
        )}
      </View>

      {/* Platform Stats */}
      <View style={styles.statsContainer}>
        <Text style={styles.statsText}>Room: {roomName}</Text>
        <Text style={styles.statsText}>Participant: {participantName}</Text>
        <Text style={styles.statsText}>Participants: {participants.length}</Text>
        <Text style={styles.statsText}>TURN Server: 34.59.53.188:3478</Text>
      </View>

      {/* Control Buttons */}
      <View style={styles.controlsContainer}>
        {/* Connect/Disconnect Button */}
        <TouchableOpacity
          style={[styles.button, isConnected ? styles.disconnectButton : styles.connectButton]}
          onPress={handleConnect}
          disabled={connectionStatus === 'connecting' || connectionStatus === 'disconnecting'}
        >
          <Text style={styles.buttonText}>
            {connectionStatus === 'connecting' ? 'Connecting...' :
             connectionStatus === 'disconnecting' ? 'Disconnecting...' :
             isConnected ? 'Disconnect' : 'Connect to June'}
          </Text>
        </TouchableOpacity>

        {/* Voice Call Button */}
        <TouchableOpacity
          style={[styles.button, isInCall ? styles.endCallButton : styles.callButton]}
          onPress={handleVoiceCall}
          disabled={!isConnected}
        >
          <Text style={styles.buttonText}>
            {isInCall ? '📴 End Call' : '🎤 Start Call'}
          </Text>
        </TouchableOpacity>

        {/* Mute Button */}
        {isInCall && (
          <TouchableOpacity
            style={[styles.button, isMuted ? styles.unmuteButton : styles.muteButton]}
            onPress={handleToggleMute}
          >
            <Text style={styles.buttonText}>
              {isMuted ? '🔊 Unmute' : '🔇 Mute'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* AI Message Button (Example) */}
      <TouchableOpacity
        style={[styles.button, styles.aiButton]}
        onPress={() => handleSendAiMessage('Hello, how can you help me today?')}
        disabled={!isConnected}
      >
        <Text style={styles.buttonText}>🤖 Send AI Message</Text>
      </TouchableOpacity>

      {/* Participants List */}
      {participants.length > 0 && (
        <View style={styles.participantsContainer}>
          <Text style={styles.participantsTitle}>Participants:</Text>
          {participants.map((participant, index) => (
            <Text key={index} style={styles.participantItem}>
              👤 {participant.identity} 
              {participant.hasAudio ? '🎤' : '🔇'}
              {participant.isSpeaking ? ' 🗣️' : ''}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    padding: 15,
    backgroundColor: 'white',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  statusText: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  sessionText: {
    fontSize: 12,
    color: '#666',
  },
  statsContainer: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: 'white',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statsText: {
    fontSize: 14,
    marginBottom: 5,
    color: '#333',
  },
  controlsContainer: {
    marginBottom: 20,
  },
  button: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  connectButton: {
    backgroundColor: '#4CAF50',
  },
  disconnectButton: {
    backgroundColor: '#F44336',
  },
  callButton: {
    backgroundColor: '#2196F3',
  },
  endCallButton: {
    backgroundColor: '#FF5722',
  },
  muteButton: {
    backgroundColor: '#FF9800',
  },
  unmuteButton: {
    backgroundColor: '#4CAF50',
  },
  aiButton: {
    backgroundColor: '#9C27B0',
  },
  participantsContainer: {
    padding: 15,
    backgroundColor: 'white',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  participantsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  participantItem: {
    fontSize: 14,
    marginBottom: 5,
    color: '#333',
  },
});