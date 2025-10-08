// STEP 1: Create components/AndroidAudioTest.tsx (correct file location)

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';

export function AndroidAudioTest() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [testResult, setTestResult] = useState<string>('');

  const testAudioPlayback = async () => {
    try {
      setTestResult('🔧 Testing audio configuration...');
      
      console.log('Setting up audio mode...');
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: false,
        interruptionModeAndroid: Audio.InterruptionModeAndroid.DoNotMix,
      });
      
      setTestResult('✅ Audio mode configured\n🔊 Testing playback...');
      
      // Create a test beep sound (simple base64 MP3)
      const testAudioData = 'SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//OEAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAAEAAABIADAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMD////////////////////////////////////////////AAAAAExhdmM1OC4xMwAAAAAAAAAAAAAAAAAAJAQKAAAAAAAAAdAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//MUZAAAAAGkAAAAAAAAA0gAAAAATEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV';
      
      const testUri = `${FileSystem.documentDirectory}test_audio.mp3`;
      
      await FileSystem.writeAsStringAsync(testUri, testAudioData, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      setIsPlaying(true);
      
      const { sound } = await Audio.Sound.createAsync(
        { uri: testUri },
        {
          shouldPlay: false,
          volume: 1.0,
          rate: 1.0,
        }
      );
      
      if (Platform.OS === 'android') {
        await sound.setVolumeAsync(1.0);
      }
      
      await sound.playAsync();
      console.log('Audio playback started');
      
      setTestResult('✅ Audio mode configured\n🔊 Playing test sound...\n📱 Listen for beep!');
      
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          if (status.didJustFinish) {
            setIsPlaying(false);
            setTestResult('✅ Audio test completed!\n🔊 Did you hear the beep?');
            sound.unloadAsync();
            FileSystem.deleteAsync(testUri, { idempotent: true });
          }
          
          if (status.error) {
            setIsPlaying(false);
            setTestResult(`❌ Audio error: ${status.error}`);
            sound.unloadAsync();
          }
        }
      });
      
      setTimeout(async () => {
        if (isPlaying) {
          setIsPlaying(false);
          setTestResult('⏰ Test timeout - Check device volume');
          await sound.unloadAsync();
          await FileSystem.deleteAsync(testUri, { idempotent: true });
        }
      }, 5000);
      
    } catch (error) {
      setIsPlaying(false);
      setTestResult(`❌ Test failed: ${error}`);
      console.error('Audio test error:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔊 Audio Debug Test</Text>
      
      <TouchableOpacity 
        style={[styles.button, isPlaying && styles.buttonDisabled]} 
        onPress={testAudioPlayback}
        disabled={isPlaying}
      >
        <Text style={styles.buttonText}>
          {isPlaying ? 'Testing Audio...' : '🎵 Test Audio Playback'}
        </Text>
      </TouchableOpacity>
      
      <View style={styles.resultContainer}>
        <Text style={styles.resultText}>
          {testResult || 'Tap button above to test if audio works on your device'}
        </Text>
      </View>
      
      <View style={styles.infoContainer}>
        <Text style={styles.infoTitle}>If you don't hear audio:</Text>
        <Text style={styles.infoText}>
          1. Check media volume (not ringer){'\n'}
          2. Turn off Do Not Disturb{'\n'}
          3. Try with/without headphones{'\n'}
          4. Check if phone is in silent mode{'\n'}
          5. Restart the app
        </Text>
      </View>
    </View>
  );
}

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
    marginBottom: 30,
    color: '#333',
  },
  button: {
    backgroundColor: '#667eea',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  resultContainer: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    minHeight: 80,
  },
  resultText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  infoContainer: {
    backgroundColor: '#fff3cd',
    padding: 15,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#856404',
  },
  infoText: {
    fontSize: 14,
    color: '#856404',
    lineHeight: 18,
  },
});
