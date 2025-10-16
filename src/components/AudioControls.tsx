// src/components/AudioControls.tsx

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import {
  useLocalParticipant,
  useTracks,
} from '@livekit/react-native';
import { Track } from 'livekit-client';

export const AudioControls: React.FC = () => {
  const { localParticipant } = useLocalParticipant();
  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const micTracks = useTracks([Track.Source.Microphone]);

  useEffect(() => {
    // Update mic state when tracks change
    const micTrack = micTracks.find(track => 
      track.participant.identity === localParticipant?.identity
    );
    if (micTrack && 'publication' in micTrack) {
      setIsMicEnabled(!micTrack.publication.isMuted);
    }
  }, [micTracks, localParticipant]);

  const toggleMicrophone = async () => {
    if (localParticipant) {
      try {
        await localParticipant.setMicrophoneEnabled(!isMicEnabled);
        setIsMicEnabled(!isMicEnabled);
      } catch (error) {
        console.error('Failed to toggle microphone:', error);
      }
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Audio Controls</Text>
      
      <View style={styles.controlsRow}>
        <TouchableOpacity
          style={[
            styles.controlButton,
            isMicEnabled ? styles.enabledButton : styles.disabledButton,
          ]}
          onPress={toggleMicrophone}
        >
          <Text style={styles.controlButtonText}>
            {isMicEnabled ? '🎤' : '🚫'} Microphone
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>
          Mic: {isMicEnabled ? 'ON' : 'OFF'}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#1A2332',
    margin: 20,
    borderRadius: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
  },
  controlButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginHorizontal: 8,
  },
  enabledButton: {
    backgroundColor: '#10B981',
  },
  disabledButton: {
    backgroundColor: '#EF4444',
  },
  controlButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  statusContainer: {
    alignItems: 'center',
  },
  statusText: {
    fontSize: 14,
    color: '#8E9BAE',
  },
});