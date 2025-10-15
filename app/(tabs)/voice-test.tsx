import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView
} from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import { useLiveKitToken } from '@/hooks/useLiveKitToken';
import { LiveKitRoom, useRoom, useParticipants } from '@livekit/react-native';
import APP_CONFIG from '@/config/app.config';

function TestInfo() {
  const room = useRoom();
  const participants = useParticipants();
  
  return (
    <View style={styles.infoSection}>
      <Text style={styles.infoTitle}>Connection Status</Text>
      <View style={styles.infoItem}>
        <Text style={styles.infoLabel}>Room State:</Text>
        <Text style={[styles.infoValue, { color: room?.state === 'connected' ? '#28a745' : '#dc3545' }]}>
          {room?.state || 'disconnected'}
        </Text>
      </View>
      <View style={styles.infoItem}>
        <Text style={styles.infoLabel}>Participants:</Text>
        <Text style={styles.infoValue}>{participants.length}</Text>
      </View>
      <View style={styles.infoItem}>
        <Text style={styles.infoLabel}>Room Name:</Text>
        <Text style={styles.infoValue}>{room?.name || 'none'}</Text>
      </View>
    </View>
  );
}

export default function VoiceTestScreen() {
  const { isAuthenticated, user } = useAuth();
  const { liveKitToken, generateToken, error } = useLiveKitToken();
  
  React.useEffect(() => {
    if (isAuthenticated && !liveKitToken) {
      generateToken();
    }
  }, [isAuthenticated, liveKitToken, generateToken]);
  
  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Voice Test</Text>
          <Text style={styles.subtitle}>Please sign in to test voice features</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!liveKitToken) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Voice Test</Text>
          <Text style={styles.subtitle}>Getting LiveKit token...</Text>
          {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>June Voice Test</Text>
        <Text style={styles.subtitle}>LiveKit Connection Test</Text>
        
        <LiveKitRoom
          serverUrl={APP_CONFIG.SERVICES.livekit}
          token={liveKitToken.token}
          connect={true}
          audio={true}
          video={false}
        >
          <TestInfo />
        </LiveKitRoom>
        
        {/* Configuration Info */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>Test Configuration</Text>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Backend:</Text>
            <Text style={styles.infoValue}>api.ozzu.world</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>LiveKit:</Text>
            <Text style={styles.infoValue}>livekit.ozzu.world</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>User:</Text>
            <Text style={styles.infoValue}>{user?.email || 'unknown'}</Text>
          </View>
        </View>
        
        {/* Instructions */}
        <View style={styles.instructionsSection}>
          <Text style={styles.instructionsTitle}>Testing Notes</Text>
          <Text style={styles.instructionText}>
            ✅ This test verifies your LiveKit connection
          </Text>
          <Text style={styles.instructionText}>
            ✅ Room state should show "connected"
          </Text>
          <Text style={styles.instructionText}>
            ✅ Go to Chat tab for full voice interface
          </Text>
          
          <View style={styles.noteSection}>
            <Text style={styles.noteTitle}>📝 Simplified Architecture:</Text>
            <Text style={styles.noteText}>
              This app now uses LiveKit's built-in components instead of custom WebRTC management. 
              Much simpler and more reliable!
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: '#666',
    fontStyle: 'italic',
  },
  errorText: {
    color: '#dc3545',
    textAlign: 'center',
    marginTop: 10,
  },
  infoSection: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    color: '#333',
    textAlign: 'center',
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#555',
  },
  infoValue: {
    fontSize: 14,
    color: '#007AFF',
    fontFamily: 'monospace',
  },
  instructionsSection: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  instructionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    color: '#333',
    textAlign: 'center',
  },
  instructionText: {
    fontSize: 15,
    color: '#555',
    marginBottom: 12,
    lineHeight: 22,
  },
  noteSection: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#E8F5E8',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#28a745',
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#155724',
    marginBottom: 8,
  },
  noteText: {
    fontSize: 14,
    color: '#155724',
    lineHeight: 20,
  },
});