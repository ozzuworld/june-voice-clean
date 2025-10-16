// src/components/RoomView.tsx

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import {
  useRoom,
  useParticipants,
  useTracks,
  AudioTrack,
  TrackReferenceOrPlaceholder,
  isTrackReference,
} from '@livekit/react-native';
import { Track, RoomState } from 'livekit-client';
import { AudioControls } from './AudioControls';

interface RoomViewProps {
  onDisconnect: () => void;
}

export const RoomView: React.FC<RoomViewProps> = ({ onDisconnect }) => {
  const room = useRoom();
  const participants = useParticipants();
  // Use remote subscribed audio tracks only
  const tracks = useTracks([Track.Source.Audio]);

  // Only render after connected
  if (room?.state !== RoomState.Connected) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>June Voice Assistant</Text>
          <Text style={styles.roomInfo}>Connecting...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const renderAudioTrack = ({ item }: { item: TrackReferenceOrPlaceholder }) => {
    // Only actual subscribed tracks are rendered
    if (!isTrackReference(item)) return null;
    const pub = item.publication;
    if (!pub || !pub.subscribed) return null;
    return (
      <View style={styles.trackContainer}>
        <Text style={styles.participantName}>{item.participant?.identity ?? 'Participant'}</Text>
        <AudioTrack trackRef={item} />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>June Voice Assistant</Text>
        <Text style={styles.roomInfo}>Room: {room?.name || 'Unknown'}</Text>
        <Text style={styles.participantCount}>{participants.length} participant{participants.length !== 1 ? 's' : ''}</Text>
      </View>
      <View style={styles.participantsContainer}>
        <Text style={styles.sectionTitle}>Participants</Text>
        <FlatList
          data={tracks}
          keyExtractor={(item, index) => `${item.participant?.identity}-${index}`}
          renderItem={renderAudioTrack}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<Text style={styles.emptyText}>No active participants</Text>}
        />
      </View>
      <View style={styles.participantsList}>
        <Text style={styles.sectionTitle}>All Participants</Text>
        {participants.map((participant) => (
          <View key={participant.identity} style={styles.participantItem}>
            <Text style={styles.participantText}>{participant.identity}{participant.isLocal && ' (You)'}</Text>
            <Text style={styles.participantStatus}>
              {participant.connectionQuality === 'excellent' ? '🟢' : 
               participant.connectionQuality === 'good' ? '🟡' : 
               participant.connectionQuality === 'poor' ? '🔴' : '⚪'}
            </Text>
          </View>
        ))}
      </View>
      {/* Audio Controls */}
      <AudioControls />
      <TouchableOpacity style={styles.disconnectButton} onPress={onDisconnect}>
        <Text style={styles.disconnectButtonText}>Disconnect</Text>
      </TouchableOpacity>
      <View style={styles.debugInfo}>
        <Text style={styles.debugText}>Connection: {room?.engine?.connectionState || 'unknown'}</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B1426',
  },
  header: {
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#2D3748',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  roomInfo: {
    fontSize: 16,
    color: '#8E9BAE',
    marginBottom: 4,
  },
  participantCount: {
    fontSize: 14,
    color: '#4F46E5',
  },
  participantsContainer: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  trackContainer: {
    backgroundColor: '#1A2332',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  participantName: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  participantsList: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#2D3748',
  },
  participantItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  participantText: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  participantStatus: {
    fontSize: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#8E9BAE',
    textAlign: 'center',
    marginTop: 20,
  },
  disconnectButton: {
    backgroundColor: '#EF4444',
    padding: 16,
    margin: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  disconnectButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  debugInfo: {
    padding: 16,
    backgroundColor: '#1A2332',
    margin: 20,
    borderRadius: 8,
  },
  debugText: {
    fontSize: 12,
    color: '#8E9BAE',
    textAlign: 'center',
  },
});