// components/AudioTest.tsx - Test component to debug audio issues
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';

export function AudioTest() {
  const [status, setStatus] = useState('Ready to test');
  const [sound, setSound] = useState<Audio.Sound | null>(null);

  const testLocalAudio = async () => {
    try {
      setStatus('Testing local audio...');
      
      // Test with a simple tone generated in-app
      const simpleWav = createTestWav();
      const uri = `${FileSystem.documentDirectory}test_audio.wav`;
      
      await FileSystem.writeAsStringAsync(uri, simpleWav, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      const { sound: testSound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true, volume: 1.0 }
      );
      
      setSound(testSound);
      setStatus('✅ Local audio test successful');
      
      // Clean up after 3 seconds
      setTimeout(async () => {
        await testSound.unloadAsync();
        await FileSystem.deleteAsync(uri, { idempotent: true });
      }, 3000);
      
    } catch (error: any) {
      setStatus(`❌ Local audio test failed: ${error.message}`);
    }
  };

  const testRemoteAudio = async () => {
    try {
      setStatus('Testing remote audio...');
      
      // Test with a known working online audio file
      const { sound: testSound } = await Audio.Sound.createAsync(
        { uri: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav' },
        { shouldPlay: true, volume: 1.0 }
      );
      
      setSound(testSound);
      setStatus('✅ Remote audio test successful');
      
      setTimeout(async () => {
        await testSound.unloadAsync();
      }, 5000);
      
    } catch (error: any) {
      setStatus(`❌ Remote audio test failed: ${error.message}`);
    }
  };

  const testBackendAudio = async () => {
    try {
      setStatus('Testing backend TTS audio...');
      
      // Test the actual TTS endpoint
      const response = await fetch('https://june-tts-359243954.us-central1.run.app/v1/tts?text=Hello%20world&voice=default&speed=1.0&audio_encoding=WAV', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer test', // You might need a real token
        }
      });
      
      if (!response.ok) {
        throw new Error(`TTS request failed: ${response.status}`);
      }
      
      const audioBlob = await response.arrayBuffer();
      const base64Audio = btoa(String.fromCharCode(...new Uint8Array(audioBlob)));
      
      const uri = `${FileSystem.documentDirectory}backend_test.wav`;
      await FileSystem.writeAsStringAsync(uri, base64Audio, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      const { sound: testSound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true, volume: 1.0 }
      );
      
      setSound(testSound);
      setStatus('✅ Backend audio test successful');
      
      setTimeout(async () => {
        await testSound.unloadAsync();
        await FileSystem.deleteAsync(uri, { idempotent: true });
      }, 5000);
      
    } catch (error: any) {
      setStatus(`❌ Backend audio test failed: ${error.message}`);
    }
  };

  // Create a simple WAV file with a 440Hz tone
  function createTestWav(): string {
    const sampleRate = 22050;
    const duration = 1; // 1 second
    const numSamples = sampleRate * duration;
    
    // WAV header
    const header = new ArrayBuffer(44);
    const view = new DataView(header);
    
    // "RIFF" chunk descriptor
    view.setUint32(0, 0x52494646, false); // "RIFF"
    view.setUint32(4, 36 + numSamples * 2, true); // file size
    view.setUint32(8, 0x57415645, false); // "WAVE"
    
    // "fmt " sub-chunk
    view.setUint32(12, 0x666d7420, false); // "fmt "
    view.setUint32(16, 16, true); // subchunk size
    view.setUint16(20, 1, true); // audio format (PCM)
    view.setUint16(22, 1, true); // number of channels
    view.setUint32(24, sampleRate, true); // sample rate
    view.setUint32(28, sampleRate * 2, true); // byte rate
    view.setUint16(32, 2, true); // block align
    view.setUint16(34, 16, true); // bits per sample
    
    // "data" sub-chunk
    view.setUint32(36, 0x64617461, false); // "data"
    view.setUint32(40, numSamples * 2, true); // data size
    
    // Generate audio data (440Hz tone)
    const audioData = new Int16Array(numSamples);
    for (let i = 0; i < numSamples; i++) {
      audioData[i] = Math.sin(2 * Math.PI * 440 * i / sampleRate) * 32767 * 0.5;
    }
    
    // Combine header and data
    const combined = new Uint8Array(44 + numSamples * 2);
    combined.set(new Uint8Array(header), 0);
    combined.set(new Uint8Array(audioData.buffer), 44);
    
    return btoa(String.fromCharCode(...combined));
  }

  return (
    <View style={styles.container}>
      <Text style={styles.status}>{status}</Text>
      
      <TouchableOpacity style={styles.button} onPress={testLocalAudio}>
        <Text style={styles.buttonText}>Test Local Audio</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.button} onPress={testRemoteAudio}>
        <Text style={styles.buttonText}>Test Remote Audio</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.button} onPress={testBackendAudio}>
        <Text style={styles.buttonText}>Test Backend TTS</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center',
  },
  status: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#667eea',
    padding: 15,
    margin: 10,
    borderRadius: 8,
    minWidth: 200,
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
  },
});