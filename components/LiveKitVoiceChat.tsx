/**
 * LiveKit Voice Chat Component
 * 
 * Example component showing how to use the LiveKit Voice Service
 * Replace your existing Janus-based voice components with this pattern
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { RemoteAudioTrack, LocalAudioTrack, RemoteParticipant, ConnectionQuality } from 'livekit-client';
import { LiveKitVoiceService, LiveKitCallbacks } from '../lib/LiveKitVoiceService';
import APP_CONFIG from '../config/app.config';

interface Props {
  roomName?: string;
  participantName: string;
  onCallStateChanged?: (isInCall: boolean) => void;
}

interface ParticipantInfo {
  identity: string;
  name: string;
  isConnected: boolean;
  isSpeaking: boolean;
  hasAudio: boolean;
}

export const LiveKitVoiceChat: React.FC<Props> = ({
  roomName = 'default-room',
  participantName,
  onCallStateChanged
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isInCall, setIsInCall] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [participants, setParticipants] = useState<ParticipantInfo[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<string>('Disconnected');
  const [error, setError] = useState<string | null>(null);
  
  const voiceServiceRef = useRef<LiveKitVoiceService | null>(null);
  const localAudioRef = useRef<LocalAudioTrack | null>(null);

  // Initialize LiveKit service with callbacks
  useEffect(() => {
    const callbacks: LiveKitCallbacks = {
      onConnected: () => {
        console.log('✅ Connected to LiveKit room');
        setIsConnected(true);
        setConnectionStatus('Connected');
        setError(null);
      },
      
      onDisconnected: () => {
        console.log('🔴 Disconnected from LiveKit room');
        setIsConnected(false);
        setIsInCall(false);
        setConnectionStatus('Disconnected');
        localAudioRef.current = null;
        updateCallState(false);
      },
      
      onError: (errorMessage: string) => {
        console.error('❌ LiveKit error:', errorMessage);
        setError(errorMessage);
        setConnectionStatus('Error');
        Alert.alert('Voice Call Error', errorMessage);
      },
      
      onLocalAudioTrack: (track: LocalAudioTrack) => {
        console.log('🎤 Local audio track created');
        localAudioRef.current = track;
      },
      
      onRemoteAudioTrack: (track: RemoteAudioTrack, participant: RemoteParticipant) => {
        console.log('🔊 Remote audio track from:', participant.identity);
        // The track will automatically play audio from remote participants
      },
      
      onCallStarted: () => {
        console.log('📞 Call started');
        setIsInCall(true);
        updateCallState(true);
      },
      
      onCallEnded: () => {
        console.log('📞 Call ended');
        setIsInCall(false);
        updateCallState(false);
      },
      
      onParticipantJoined: (participant: RemoteParticipant) => {
        console.log('👤 Participant joined:', participant.identity);
        updateParticipantsList();
      },
      
      onParticipantLeft: (participant: RemoteParticipant) => {
        console.log('👤 Participant left:', participant.identity);
        updateParticipantsList();
      },
      
      onConnectionQualityChanged: (quality: ConnectionQuality, participant: RemoteParticipant) => {
        console.log('📊 Connection quality:', quality, 'for:', participant.identity);
      },
    };
    
    voiceServiceRef.current = new LiveKitVoiceService(callbacks);
    
    return () => {
      // Cleanup on component unmount
      if (voiceServiceRef.current) {
        voiceServiceRef.current.disconnect();
      }
    };
  }, []);

  const updateCallState = (inCall: boolean) => {
    onCallStateChanged?.(inCall);
  };

  const updateParticipantsList = () => {
    if (voiceServiceRef.current) {
      const participantsList = voiceServiceRef.current.getParticipants();
      setParticipants(participantsList);
    }
  };

  const connectToRoom = async () => {
    if (!voiceServiceRef.current) return;
    
    setConnectionStatus('Connecting...');
    setError(null);
    
    try {
      const fullRoomName = `${APP_CONFIG.LIVEKIT.DEFAULT_ROOM_PREFIX}${roomName}`;
      const success = await voiceServiceRef.current.connect(fullRoomName, participantName);
      
      if (success) {
        updateParticipantsList();
      }
    } catch (error) {
      console.error('Failed to connect:', error);
      setConnectionStatus('Failed');
    }
  };

  const disconnectFromRoom = async () => {
    if (!voiceServiceRef.current) return;
    
    setConnectionStatus('Disconnecting...');
    await voiceServiceRef.current.disconnect();
  };

  const startVoiceCall = async () => {
    if (!voiceServiceRef.current || !isConnected) {
      Alert.alert('Not Connected', 'Please connect to the room first');
      return;
    }
    
    const success = await voiceServiceRef.current.startVoiceCall();
    if (success) {
      setIsMuted(false);
    }
  };

  const endVoiceCall = async () => {
    if (!voiceServiceRef.current) return;
    
    await voiceServiceRef.current.endVoiceCall();
    setIsMuted(false);
  };

  const toggleMute = async () => {
    if (!voiceServiceRef.current || !isInCall) return;
    
    const newMutedState = !isMuted;
    await voiceServiceRef.current.setMicrophoneEnabled(!newMutedState);
    setIsMuted(newMutedState);
  };

  const sendMessage = async () => {
    if (!voiceServiceRef.current || !isConnected) return;
    
    const message = `Hello from ${participantName} at ${new Date().toLocaleTimeString()}`;
    await voiceServiceRef.current.sendDataMessage(message);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>LiveKit Voice Chat</Text>
      
      {/* Connection Status */}
      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>Status: {connectionStatus}</Text>
        <Text style={styles.roomText}>Room: {roomName}</Text>
        <Text style={styles.participantText}>You: {participantName}</Text>
      </View>

      {/* Error Display */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Connection Controls */}
      <View style={styles.buttonRow}>
        {!isConnected ? (
          <TouchableOpacity style={styles.connectButton} onPress={connectToRoom}>
            <Text style={styles.buttonText}>Connect to Room</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.disconnectButton} onPress={disconnectFromRoom}>
            <Text style={styles.buttonText}>Disconnect</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Voice Call Controls */}
      {isConnected && (
        <View style={styles.buttonRow}>
          {!isInCall ? (
            <TouchableOpacity style={styles.callButton} onPress={startVoiceCall}>
              <Text style={styles.buttonText}>Start Voice Call</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.endCallButton} onPress={endVoiceCall}>
              <Text style={styles.buttonText}>End Call</Text>
            </TouchableOpacity>
          )}
          
          {isInCall && (
            <TouchableOpacity 
              style={[styles.muteButton, isMuted && styles.mutedButton]} 
              onPress={toggleMute}
            >
              <Text style={styles.buttonText}>{isMuted ? '🔇 Unmute' : '🎤 Mute'}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Send Test Message */}
      {isConnected && (
        <TouchableOpacity style={styles.messageButton} onPress={sendMessage}>
          <Text style={styles.buttonText}>Send Test Message</Text>
        </TouchableOpacity>
      )}

      {/* Participants List */}
      {participants.length > 0 && (
        <View style={styles.participantsContainer}>
          <Text style={styles.participantsTitle}>Other Participants ({participants.length}):</Text>
          {participants.map((participant, index) => (
            <View key={index} style={styles.participantItem}>
              <Text style={styles.participantName}>
                👤 {participant.name || participant.identity}
                {participant.isSpeaking && ' 🗣️'}
                {participant.hasAudio && ' 🎵'}
              </Text>
            </View>
          ))}
        </View>
      )}
      
      {/* Debug Info */}
      {APP_CONFIG.DEBUG.LIVEKIT_LOGS && (
        <View style={styles.debugContainer}>
          <Text style={styles.debugText}>Debug Info:</Text>
          <Text style={styles.debugText}>Connected: {isConnected ? 'Yes' : 'No'}</Text>
          <Text style={styles.debugText}>In Call: {isInCall ? 'Yes' : 'No'}</Text>
          <Text style={styles.debugText}>Muted: {isMuted ? 'Yes' : 'No'}</Text>
          <Text style={styles.debugText}>Participants: {participants.length}</Text>
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  statusContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  roomText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  participantText: {
    fontSize: 14,
    color: '#666',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#f44336',
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 14,
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
    flexWrap: 'wrap',
  },
  connectButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 10,
    minWidth: 120,
    alignItems: 'center',
  },
  disconnectButton: {
    backgroundColor: '#f44336',
    padding: 15,
    borderRadius: 10,
    minWidth: 120,
    alignItems: 'center',
  },
  callButton: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 10,
    minWidth: 120,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  endCallButton: {
    backgroundColor: '#f44336',
    padding: 15,
    borderRadius: 10,
    minWidth: 120,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  muteButton: {
    backgroundColor: '#FF9800',
    padding: 15,
    borderRadius: 10,
    minWidth: 100,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  mutedButton: {
    backgroundColor: '#757575',
  },
  messageButton: {
    backgroundColor: '#9C27B0',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 15,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  participantsContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  participantsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  participantItem: {
    paddingVertical: 5,
  },
  participantName: {
    fontSize: 14,
    color: '#666',
  },
  debugContainer: {
    backgroundColor: '#e8f5e8',
    padding: 15,
    borderRadius: 10,
    marginTop: 15,
  },
  debugText: {
    fontSize: 12,
    color: '#2e7d2e',
    marginBottom: 2,
  },
});

export default LiveKitVoiceChat;