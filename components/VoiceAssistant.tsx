import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Animated,
  Alert,
} from 'react-native';
import {
  useRoom,
  useLocalParticipant,
  useTracks,
  useRoomInfo,
  RoomAudioRenderer,
  VideoTrack,
} from '@livekit/react-native';
import { Track, TrackPublication } from 'livekit-client';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface VoiceAssistantProps {
  onDisconnect: () => void;
}

export function VoiceAssistant({ onDisconnect }: VoiceAssistantProps) {
  const room = useRoom();
  const { localParticipant } = useLocalParticipant();
  const roomInfo = useRoomInfo();
  const [isRecording, setIsRecording] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('Connecting...');
  const animatedScale = React.useRef(new Animated.Value(1)).current;
  const pulseAnimation = React.useRef<Animated.CompositeAnimation | null>(null);

  // Get camera and microphone tracks
  const tracks = useTracks([Track.Source.Camera, Track.Source.Microphone]);
  
  // Filter for video tracks from other participants (agents)
  const videoTracks = tracks.filter(
    (trackRef) => 
      trackRef.source === Track.Source.Camera && 
      trackRef.participant.identity !== localParticipant.identity
  );

  useEffect(() => {
    if (room) {
      // Set up room event listeners
      const handleConnected = () => {
        setConnectionStatus('Connected to AI Agent');
      };

      const handleDisconnected = () => {
        setConnectionStatus('Disconnected');
        onDisconnect();
      };

      const handleParticipantConnected = (participant: any) => {
        console.log('Participant connected:', participant.identity);
        if (participant.identity.includes('agent')) {
          setConnectionStatus('AI Agent joined the conversation');
        }
      };

      room.on('connected', handleConnected);
      room.on('disconnected', handleDisconnected);
      room.on('participantConnected', handleParticipantConnected);

      return () => {
        room.off('connected', handleConnected);
        room.off('disconnected', handleDisconnected);
        room.off('participantConnected', handleParticipantConnected);
      };
    }
  }, [room, onDisconnect]);

  useEffect(() => {
    // Check if microphone is currently publishing
    const micTrack = localParticipant.getTrackPublication(Track.Source.Microphone);
    const isPublishing = micTrack?.track?.isMuted === false;
    setIsRecording(isPublishing || false);

    if (isPublishing) {
      startPulseAnimation();
    } else {
      stopPulseAnimation();
    }
  }, [localParticipant]);

  const startPulseAnimation = () => {
    pulseAnimation.current = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedScale, {
          toValue: 1.1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(animatedScale, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnimation.current.start();
  };

  const stopPulseAnimation = () => {
    if (pulseAnimation.current) {
      pulseAnimation.current.stop();
    }
    animatedScale.setValue(1);
  };

  const toggleMicrophone = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      const micTrack = localParticipant.getTrackPublication(Track.Source.Microphone);
      
      if (micTrack) {
        await localParticipant.setMicrophoneEnabled(!micTrack.isMuted);
      } else {
        // Enable microphone if no track exists
        await localParticipant.setMicrophoneEnabled(true);
      }
    } catch (error) {
      console.error('Failed to toggle microphone:', error);
      Alert.alert('Error', 'Failed to toggle microphone');
    }
  };

  const toggleCamera = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      const cameraTrack = localParticipant.getTrackPublication(Track.Source.Camera);
      
      if (cameraTrack) {
        await localParticipant.setCameraEnabled(!cameraTrack.isMuted);
      } else {
        // Enable camera if no track exists
        await localParticipant.setCameraEnabled(true);
      }
    } catch (error) {
      console.error('Failed to toggle camera:', error);
      Alert.alert('Error', 'Failed to toggle camera');
    }
  };

  const handleDisconnect = () => {
    Alert.alert(
      'Disconnect',
      'Are you sure you want to end the conversation?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: () => {
            room?.disconnect();
            onDisconnect();
          },
        },
      ]
    );
  };

  const micTrack = localParticipant.getTrackPublication(Track.Source.Microphone);
  const cameraTrack = localParticipant.getTrackPublication(Track.Source.Camera);
  const isMicEnabled = micTrack ? !micTrack.isMuted : false;
  const isCameraEnabled = cameraTrack ? !cameraTrack.isMuted : false;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      {/* Room Audio Renderer */}
      <RoomAudioRenderer />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>June AI Voice Assistant</Text>
        <Text style={styles.connectionStatus}>{connectionStatus}</Text>
      </View>

      {/* Video Display Area */}
      <View style={styles.videoContainer}>
        {videoTracks.length > 0 ? (
          videoTracks.map((trackRef, index) => (
            <VideoTrack
              key={`${trackRef.participant.identity}-${index}`}
              trackRef={trackRef}
              style={styles.videoTrack}
            />
          ))
        ) : (
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Ionicons name="mic" size={60} color="#007AFF" />
            </View>
            <Text style={styles.avatarText}>AI Agent</Text>
            <Text style={styles.avatarSubtext}>Listening and ready to respond</Text>
          </View>
        )}
      </View>

      {/* Recording Indicator */}
      {isRecording && (
        <View style={styles.recordingIndicator}>
          <Animated.View
            style={[
              styles.recordingDot,
              {
                transform: [{ scale: animatedScale }],
              },
            ]}
          />
          <Text style={styles.recordingText}>Listening...</Text>
        </View>
      )}

      {/* Control Panel */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={[
            styles.controlButton,
            !isMicEnabled && styles.controlButtonDisabled,
          ]}
          onPress={toggleMicrophone}
        >
          <Ionicons
            name={isMicEnabled ? 'mic' : 'mic-off'}
            size={24}
            color={isMicEnabled ? '#ffffff' : '#888888'}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.controlButton,
            !isCameraEnabled && styles.controlButtonDisabled,
          ]}
          onPress={toggleCamera}
        >
          <Ionicons
            name={isCameraEnabled ? 'videocam' : 'videocam-off'}
            size={24}
            color={isCameraEnabled ? '#ffffff' : '#888888'}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, styles.disconnectButton]}
          onPress={handleDisconnect}
        >
          <Ionicons name="call" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  connectionStatus: {
    fontSize: 14,
    color: '#888888',
  },
  videoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  videoTrack: {
    width: width - 40,
    height: (width - 40) * 0.75,
    borderRadius: 12,
    overflow: 'hidden',
  },
  avatarContainer: {
    alignItems: 'center',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  avatarSubtext: {
    fontSize: 14,
    color: '#888888',
    textAlign: 'center',
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF3B30',
    marginRight: 8,
  },
  recordingText: {
    fontSize: 14,
    color: '#FF3B30',
    fontWeight: '500',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
    gap: 30,
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#333333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButtonDisabled: {
    backgroundColor: '#1a1a1a',
  },
  disconnectButton: {
    backgroundColor: '#FF3B30',
  },
});