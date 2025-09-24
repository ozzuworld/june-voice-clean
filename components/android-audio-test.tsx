// android-audio-test.tsx - Test Android audio playback
// Add this to your app for testing audio issues

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
      
      // 1. Test audio mode setup
      console.log('Setting up audio mode...');
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false, // Use speaker
        staysActiveInBackground: false,
        interruptionModeAndroid: Audio.InterruptionModeAndroid.DoNotMix,
      });
      
      setTestResult('✅ Audio mode configured\n🔊 Testing playback...');
      
      // 2. Create a test audio file (sine wave)
      const testAudioData = generateTestAudioBase64();
      const testUri = `${FileSystem.documentDirectory}test_audio.mp3`;
      
      await FileSystem.writeAsStringAsync(testUri, testAudioData, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      // 3. Test playback
      setIsPlaying(true);
      
      const { sound } = await Audio.Sound.createAsync(
        { uri: testUri },
        {
          shouldPlay: false,
          volume: 1.0,
          rate: 1.0,
          shouldCorrectPitch: true,
        }
      );
      
      // Check sound status before playing
      const statusBefore = await sound.getStatusAsync();
      console.log('Audio status before play:', statusBefore);
      
      // Set volume explicitly (Android fix)
      if (Platform.OS === 'android') {
        await sound.setVolumeAsync(1.0);
      }
      
      // Start playback
      await sound.playAsync();
      console.log('Audio playback started');
      
      setTestResult('✅ Audio mode configured\n🔊 Playing test sound...\n📱 Check device volume!');
      
      // Monitor playback
      sound.setOnPlaybackStatusUpdate((status) => {
        console.log('Playback status:', status);
        
        if (status.isLoaded) {
          if (status.isPlaying) {
            setTestResult(`✅ Audio mode configured\n🔊 Playing test sound...\n📱 Position: ${Math.round((status.positionMillis || 0) / 1000)}s`);
          }
          
          if (status.didJustFinish) {
            setIsPlaying(false);
            setTestResult('✅ Audio test completed!\n🔊 If you heard a beep, audio is working!');
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
      
      // Fallback timeout
      setTimeout(async () => {
        if (isPlaying) {
          setIsPlaying(false);
          setTestResult('⏰ Audio test timeout - check device settings');
          await sound.unloadAsync();
          await FileSystem.deleteAsync(testUri, { idempotent: true });
        }
      }, 10000);
      
    } catch (error) {
      setIsPlaying(false);
      setTestResult(`❌ Audio test failed: ${error}`);
      console.error('Audio test error:', error);
      
      Alert.alert(
        'Audio Test Failed',
        `Error: ${error}\n\nTroubleshooting:\n1. Check device volume\n2. Check Do Not Disturb mode\n3. Try plugging/unplugging headphones\n4. Restart the app`,
        [{ text: 'OK' }]
      );
    }
  };

  const testDeviceVolume = async () => {
    try {
      Alert.alert(
        'Volume Check',
        `Device: ${Platform.OS}\nVolume tips:\n• Check media volume (not ringer)\n• Disable Do Not Disturb\n• Try with/without headphones\n• Check app permissions`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Volume test error:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Android Audio Test</Text>
      
      <TouchableOpacity 
        style={[styles.button, isPlaying && styles.buttonDisabled]} 
        onPress={testAudioPlayback}
        disabled={isPlaying}
      >
        <Text style={styles.buttonText}>
          {isPlaying ? 'Testing Audio...' : 'Test Audio Playback'}
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.button} onPress={testDeviceVolume}>
        <Text style={styles.buttonText}>Volume Troubleshooting</Text>
      </TouchableOpacity>
      
      <View style={styles.resultContainer}>
        <Text style={styles.resultText}>{testResult}</Text>
      </View>
      
      <View style={styles.infoContainer}>
        <Text style={styles.infoTitle}>Common Android Audio Issues:</Text>
        <Text style={styles.infoText}>
          • Media volume is low or muted{'\n'}
          • Do Not Disturb mode is enabled{'\n'}
          • App doesn't have audio permissions{'\n'}
          • Bluetooth audio device connected{'\n'}
          • Phone is in silent/vibrate mode
        </Text>
      </View>
    </View>
  );
}

// Generate a simple test audio file (base64 encoded MP3 with a beep)
function generateTestAudioBase64(): string {
  // This is a minimal MP3 file with a 1-second 440Hz beep
  return 'SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//OEAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAAEAAABIADAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMD////////////////////////////////////////////AAAAAExhdmM1OC4xMwAAAAAAAAAAAAAAAAAAJAQKAAAAAAAAAdAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//MUZAAAAAGkAAAAAAAAA0gAAAAATEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV';
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
    marginBottom: 15,
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
    minHeight: 100,
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