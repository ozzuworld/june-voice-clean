/**
 * Voice Test Screen
 * 
 * Demo screen to test Janus WebRTC integration
 * Shows connection status and provides voice call controls
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  SafeAreaView
} from 'react-native';
import { useJanusWebRTC } from '../../hooks/useJanusWebRTC';

export default function VoiceTestScreen() {
  const {
    // Connection state
    isConnected,
    isConnecting,
    connectionError,
    
    // Call state
    isInCall,
    isCallStarting,
    callError,
    
    // Streams
    localStream,
    remoteStream,
    
    // Actions
    connect,
    disconnect,
    startCall,
    endCall
  } = useJanusWebRTC({
    onCallStarted: () => {
      Alert.alert('Call Started', 'Voice call is now active!');
    },
    onCallEnded: () => {
      Alert.alert('Call Ended', 'Voice call has ended.');
    },
    onError: (error) => {
      Alert.alert('WebRTC Error', error);
    }
  });
  
  const getConnectionStatusColor = () => {
    if (isConnected) return '#4CAF50';
    if (isConnecting) return '#FF9800';
    return '#F44336';
  };
  
  const getConnectionStatusText = () => {
    if (isConnected) return 'Connected to Janus Gateway';
    if (isConnecting) return 'Connecting...';
    return 'Disconnected';
  };
  
  const getCallStatusColor = () => {
    if (isInCall) return '#4CAF50';
    if (isCallStarting) return '#FF9800';
    return '#9E9E9E';
  };
  
  const getCallStatusText = () => {
    if (isInCall) return 'In Voice Call';
    if (isCallStarting) return 'Starting Call...';
    return 'No Active Call';
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>June Voice Platform Test</Text>
        
        {/* Connection Status */}
        <View style={styles.statusSection}>
          <Text style={styles.sectionTitle}>Connection Status</Text>
          <View style={[styles.statusIndicator, { backgroundColor: getConnectionStatusColor() }]}>
            <Text style={styles.statusText}>{getConnectionStatusText()}</Text>
          </View>
          
          {connectionError && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>Error: {connectionError}</Text>
            </View>
          )}
          
          <Text style={styles.endpointText}>Endpoint: wss://ozzu.world/janus-ws</Text>
        </View>
        
        {/* Call Status */}
        <View style={styles.statusSection}>
          <Text style={styles.sectionTitle}>Call Status</Text>
          <View style={[styles.statusIndicator, { backgroundColor: getCallStatusColor() }]}>
            <Text style={styles.statusText}>{getCallStatusText()}</Text>
          </View>
          
          {callError && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>Call Error: {callError}</Text>
            </View>
          )}
        </View>
        
        {/* Stream Status */}
        <View style={styles.statusSection}>
          <Text style={styles.sectionTitle}>Audio Streams</Text>
          <View style={styles.streamStatus}>
            <Text style={styles.streamText}>
              Local Audio: {localStream ? '✅ Active' : '❌ None'}
            </Text>
            <Text style={styles.streamText}>
              Remote Audio: {remoteStream ? '✅ Active' : '❌ None'}
            </Text>
          </View>
        </View>
        
        {/* Control Buttons */}
        <View style={styles.controlsSection}>
          <Text style={styles.sectionTitle}>Controls</Text>
          
          {/* Connection Controls */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[
                styles.button,
                styles.connectButton,
                (isConnecting || isConnected) && styles.buttonDisabled
              ]}
              onPress={connect}
              disabled={isConnecting || isConnected}
            >
              <Text style={styles.buttonText}>
                {isConnecting ? 'Connecting...' : 'Connect'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.button,
                styles.disconnectButton,
                (!isConnected) && styles.buttonDisabled
              ]}
              onPress={disconnect}
              disabled={!isConnected}
            >
              <Text style={styles.buttonText}>Disconnect</Text>
            </TouchableOpacity>
          </View>
          
          {/* Call Controls */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[
                styles.button,
                styles.callButton,
                (!isConnected || isCallStarting || isInCall) && styles.buttonDisabled
              ]}
              onPress={startCall}
              disabled={!isConnected || isCallStarting || isInCall}
            >
              <Text style={styles.buttonText}>
                {isCallStarting ? 'Starting...' : 'Start Voice Call'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.button,
                styles.endCallButton,
                (!isInCall) && styles.buttonDisabled
              ]}
              onPress={endCall}
              disabled={!isInCall}
            >
              <Text style={styles.buttonText}>End Call</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Instructions */}
        <View style={styles.instructionsSection}>
          <Text style={styles.sectionTitle}>Instructions</Text>
          <Text style={styles.instructionText}>
            1. Tap "Connect" to establish WebSocket connection to Janus Gateway
          </Text>
          <Text style={styles.instructionText}>
            2. Once connected, tap "Start Voice Call" to begin audio session
          </Text>
          <Text style={styles.instructionText}>
            3. Grant microphone permissions when prompted
          </Text>
          <Text style={styles.instructionText}>
            4. Test voice communication with other connected clients
          </Text>
          <Text style={styles.instructionText}>
            5. Tap "End Call" to stop the audio session
          </Text>
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
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
    color: '#333',
  },
  statusSection: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  statusIndicator: {
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  statusText: {
    color: 'white',
    fontWeight: '600',
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: '#FFEBEE',
    padding: 10,
    borderRadius: 6,
    marginBottom: 10,
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 14,
  },
  endpointText: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
  },
  streamStatus: {
    gap: 5,
  },
  streamText: {
    fontSize: 14,
    color: '#666',
  },
  controlsSection: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  connectButton: {
    backgroundColor: '#4CAF50',
  },
  disconnectButton: {
    backgroundColor: '#FF9800',
  },
  callButton: {
    backgroundColor: '#2196F3',
  },
  endCallButton: {
    backgroundColor: '#F44336',
  },
  buttonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  instructionsSection: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  instructionText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 20,
  },
});