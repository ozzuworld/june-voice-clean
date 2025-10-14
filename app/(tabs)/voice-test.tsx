/**
 * Voice Test Screen
 * 
 * Updated to use LiveKit + June Platform integration
 * Shows connection status and provides voice call controls
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView
} from 'react-native';
import { JuneVoiceChat } from '../../components/JuneVoiceChat';

export default function VoiceTestScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>June Voice Platform Test</Text>
        <Text style={styles.subtitle}>
          Testing LiveKit + June Orchestrator Integration
        </Text>
        
        {/* Main Voice Chat Component */}
        <JuneVoiceChat
          roomName="voice-test-room"
          participantName="test-user"
          onCallStateChanged={(inCall) => {
            console.log(`🎤 Call state changed: ${inCall ? 'IN CALL' : 'NOT IN CALL'}`);
          }}
          onAiResponse={(response) => {
            console.log('🤖 AI Response:', response);
          }}
          onError={(error) => {
            console.error('❌ Voice Test Error:', error);
          }}
        />
        
        {/* Test Information */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>Test Configuration</Text>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Backend:</Text>
            <Text style={styles.infoValue}>api.allsafe.world</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>LiveKit:</Text>
            <Text style={styles.infoValue}>livekit.allsafe.world</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>TURN Server:</Text>
            <Text style={styles.infoValue}>34.59.53.188:3478</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Room:</Text>
            <Text style={styles.infoValue}>voice-test-room</Text>
          </View>
        </View>
        
        {/* Instructions */}
        <View style={styles.instructionsSection}>
          <Text style={styles.instructionsTitle}>How to Test</Text>
          <Text style={styles.instructionText}>
            1. 🔗 Tap "Connect to June" to establish connection
          </Text>
          <Text style={styles.instructionText}>
            2. 🎤 Tap "Start Call" to begin voice session
          </Text>
          <Text style={styles.instructionText}>
            3. 📱 Grant microphone permissions when prompted
          </Text>
          <Text style={styles.instructionText}>
            4. 🤖 Try "Send AI Message" to test orchestrator
          </Text>
          <Text style={styles.instructionText}>
            5. 🔇 Use "Mute/Unmute" to control audio
          </Text>
          <Text style={styles.instructionText}>
            6. 📴 "End Call" when finished testing
          </Text>
          
          <View style={styles.noteSection}>
            <Text style={styles.noteTitle}>📝 Note:</Text>
            <Text style={styles.noteText}>
              This test connects to your June backend with LiveKit WebRTC. 
              Make sure your backend is running with the LiveKit token endpoint added.
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
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1976D2',
    marginBottom: 8,
  },
  noteText: {
    fontSize: 14,
    color: '#1565C0',
    lineHeight: 20,
  },
});