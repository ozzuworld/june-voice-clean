import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ListRenderItem,
  Alert,
} from 'react-native';
import {
  useTracks,
  useRoom,
  useParticipants,
  VideoTrack,
  isTrackReference,
  TrackReferenceOrPlaceholder,
  AudioTrack,
} from '@livekit/react-native';
import { Track, Participant, ConnectionState } from 'livekit-client';
import { Ionicons } from '@expo/vector-icons';

interface RoomViewProps {
  onDisconnect: () => void;
}

export default function RoomView({ onDisconnect }: RoomViewProps) {
  const room = useRoom();
  const participants = useParticipants();
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCameraEnabled, setIsCameraEnabled] = useState(false);

  // Get all tracks (audio and video)
  const tracks = useTracks([
    Track.Source.Camera,
    Track.Source.Microphone,
  ]);

  useEffect(() => {
    if (!room) return;

    const handleConnectionStateChanged = (state: ConnectionState) => {
      console.log('Connection state:', state);
      
      if (state === ConnectionState.Disconnected) {
        Alert.alert('Disconnected', 'Connection to room lost');
        onDisconnect();
      }
    };

    room.on('connectionStateChanged', handleConnectionStateChanged);

    return () => {
      room.off('connectionStateChanged', handleConnectionStateChanged);
    };
  }, [room, onDisconnect]);

  const toggleMicrophone = async () => {
    if (!room || !room.localParticipant) return;
    
    try {
      const micPublication = room.localParticipant.getTrackPublication(Track.Source.Microphone);
      
      if (micPublication) {
        if (isMicMuted) {
          await micPublication.unmute();
        } else {
          await micPublication.mute();
        }
        setIsMicMuted(!isMicMuted);
      } else {
        // Enable microphone for the first time
        await room.localParticipant.setMicrophoneEnabled(!isMicMuted);
        setIsMicMuted(!isMicMuted);
      }
    } catch (error) {
      console.error('Failed to toggle microphone:', error);
      Alert.alert('Error', 'Failed to toggle microphone');
    }
  };

  const toggleCamera = async () => {
    if (!room || !room.localParticipant) return;
    
    try {
      await room.localParticipant.setCameraEnabled(!isCameraEnabled);
      setIsCameraEnabled(!isCameraEnabled);
    } catch (error) {
      console.error('Failed to toggle camera:', error);
      Alert.alert('Error', 'Failed to toggle camera');
    }
  };

  const handleDisconnect = () => {
    Alert.alert(
      'Disconnect',
      'Are you sure you want to leave the room?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Leave', 
          style: 'destructive',
          onPress: () => {
            if (room) {
              room.disconnect();
            }
            onDisconnect();
          }
        },
      ]
    );
  };

  const renderTrack: ListRenderItem<TrackReferenceOrPlaceholder> = ({ item, index }) => {
    if (isTrackReference(item)) {
      const { participant, publication } = item;
      
      if (publication.kind === Track.Kind.Video) {
        return (
          <View style={styles.trackContainer}>
            <VideoTrack 
              trackRef={item} 
              style={styles.videoTrack}
              objectFit="cover"
            />
            <View style={styles.participantInfo}>
              <Text style={styles.participantName}>
                {participant.identity}
                {participant.isLocal && ' (You)'}
              </Text>
            </View>
          </View>
        );
      } else if (publication.kind === Track.Kind.Audio) {
        return (
          <View style={styles.audioContainer}>
            <AudioTrack trackRef={item} />
            <View style={styles.audioIndicator}>
              <Ionicons 
                name={publication.isMuted ? 'mic-off' : 'mic'} 
                size={24} 
                color={publication.isMuted ? '#FF3B30' : '#34C759'} 
              />
              <Text style={styles.participantName}>
                {participant.identity}
                {participant.isLocal && ' (You)'}
              </Text>
            </View>
          </View>
        );
      }
    }
    
    // Placeholder for participants without tracks
    return (
      <View style={styles.placeholderContainer}>
        <Ionicons name="person" size={48} color="#8B9DC3" />
        <Text style={styles.placeholderText}>No media</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.roomTitle}>June Voice Room</Text>
        <Text style={styles.participantCount}>
          {participants.length} participant{participants.length !== 1 ? 's' : ''}
        </Text>
      </View>

      <View style={styles.tracksContainer}>
        {tracks.length > 0 ? (
          <FlatList
            data={tracks}
            renderItem={renderTrack}
            keyExtractor={(item, index) => 
              isTrackReference(item) 
                ? `${item.participant.identity}-${item.publication.kind}-${index}`
                : `placeholder-${index}`
            }
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.tracksList}
          />
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="radio" size={64} color="#8B9DC3" />
            <Text style={styles.emptyStateText}>
              Waiting for participants...
            </Text>
            <Text style={styles.emptyStateSubtext}>
              Share your room name with others to join
            </Text>
          </View>
        )}
      </View>

      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.controlButton, isMicMuted && styles.controlButtonMuted]}
          onPress={toggleMicrophone}
        >
          <Ionicons 
            name={isMicMuted ? 'mic-off' : 'mic'} 
            size={24} 
            color={isMicMuted ? '#FF3B30' : '#FFFFFF'} 
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, !isCameraEnabled && styles.controlButtonMuted]}
          onPress={toggleCamera}
        >
          <Ionicons 
            name={isCameraEnabled ? 'videocam' : 'videocam-off'} 
            size={24} 
            color={isCameraEnabled ? '#FFFFFF' : '#8B9DC3'} 
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, styles.disconnectButton]}
          onPress={handleDisconnect}
        >
          <Ionicons name="call" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B1426',
  },
  header: {
    padding: 24,
    paddingTop: 48,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#2D3748',
  },
  roomTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  participantCount: {
    fontSize: 14,
    color: '#8B9DC3',
  },
  tracksContainer: {
    flex: 1,
    padding: 16,
  },
  tracksList: {
    flexGrow: 1,
  },
  trackContainer: {
    backgroundColor: '#1A2332',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  videoTrack: {
    width: '100%',
    height: 200,
  },
  participantInfo: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  participantName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  audioContainer: {
    backgroundColor: '#1A2332',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  audioIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  placeholderContainer: {
    backgroundColor: '#1A2332',
    borderRadius: 12,
    padding: 32,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 14,
    color: '#8B9DC3',
    marginTop: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 16,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#8B9DC3',
    marginTop: 8,
    textAlign: 'center',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 32,
    gap: 24,
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4A5568',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButtonMuted: {
    backgroundColor: '#2D3748',
  },
  disconnectButton: {
    backgroundColor: '#FF3B30',
  },
});