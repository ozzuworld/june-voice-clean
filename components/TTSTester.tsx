// components/TTSTester.tsx - Test your TTS service directly
import React, { useState } from 'react';
import { View, StyleSheet, TextInput, Alert, Platform } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { Button } from '@/components/ui/Button';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { useAuth } from '@/hooks/useAuth';
import APP_CONFIG from '@/config/app.config';

export function TTSTester() {
  const { accessToken, isAuthenticated } = useAuth();
  const [testText, setTestText] = useState('Hello, this is a test of the text to speech service.');
  const [isGenerating, setIsGenerating] = useState(false);
  const [status, setStatus] = useState('Ready to test TTS service');

  const testTTS = async () => {
    if (!isAuthenticated || !accessToken) {
      Alert.alert('Error', 'Please sign in first');
      return;
    }

    if (!testText.trim()) {
      Alert.alert('Error', 'Please enter some text to test');
      return;
    }

    setIsGenerating(true);
    setStatus('🔄 Generating speech...');

    try {
      // Set up audio mode with compatible settings
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: false,
      });

      console.log('🔊 Testing TTS with:', testText);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), APP_CONFIG.TIMEOUTS.TTS);

      const response = await fetch(`${APP_CONFIG.SERVICES.tts}${APP_CONFIG.ENDPOINTS.TTS}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: testText.trim(),
          voice_id: APP_CONFIG.TTS.DEFAULT_VOICE,
          language: 'en',
          format: 'wav',
          speed: APP_CONFIG.TTS.DEFAULT_SPEED,
          volume: 1.0,
          pitch: 0.0,
          metadata: {
            test: true,
            platform: 'mobile',
          }
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      setStatus('📥 Processing TTS response...');

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ TTS failed:', response.status, errorText);
        throw new Error(`TTS failed (${response.status}): ${errorText}`);
      }

      const audioBlob = await response.arrayBuffer();
      
      if (!audioBlob || audioBlob.byteLength === 0) {
        throw new Error('No audio data received from TTS service');
      }

      console.log('✅ TTS response:', audioBlob.byteLength, 'bytes');
      setStatus(`✅ Got audio: ${audioBlob.byteLength} bytes`);

      // Save and play the audio
      const audioPath = `${FileSystem.cacheDirectory}tts_test.wav`;
      const base64Audio = btoa(String.fromCharCode(...new Uint8Array(audioBlob)));
      
      await FileSystem.writeAsStringAsync(audioPath, base64Audio, {
        encoding: FileSystem.EncodingType.Base64,
      });

      setStatus('🎵 Playing audio...');
      
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioPath },
        { shouldPlay: true, volume: 1.0 }
      );

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          if (status.didJustFinish) {
            setStatus('✅ TTS test completed successfully!');
            sound.unloadAsync();
            FileSystem.deleteAsync(audioPath, { idempotent: true });
          }
          if (status.error) {
            setStatus(`❌ Audio playback error: ${status.error}`);
            sound.unloadAsync();
          }
        }
      });

      console.log('✅ TTS test completed successfully');

    } catch (error: any) {
      console.error('❌ TTS test failed:', error);
      let errorMessage = error.message || 'TTS test failed';
      
      if (error.name === 'AbortError') {
        errorMessage = 'TTS request timed out';
      }
      
      setStatus(`❌ Error: ${errorMessage}`);
      
      Alert.alert(
        'TTS Test Failed', 
        errorMessage,
        [{ text: 'OK' }]
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const testOrchestrator = async () => {
    if (!isAuthenticated || !accessToken) {
      Alert.alert('Error', 'Please sign in first');
      return;
    }

    setStatus('🔄 Testing orchestrator...');

    try {
      console.log('🤖 Testing orchestrator with text:', testText);
      
      const response = await fetch(`${APP_CONFIG.SERVICES.orchestrator}${APP_CONFIG.ENDPOINTS.CHAT}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: testText,
          metadata: {
            mode: 'test',
            platform: 'mobile',
          }
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Orchestrator failed (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Orchestrator response:', data);
      
      setStatus(`✅ Orchestrator response: ${JSON.stringify(data).substring(0, 100)}...`);

    } catch (error: any) {
      console.error('❌ Orchestrator test failed:', error);
      setStatus(`❌ Orchestrator error: ${error.message}`);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText style={styles.title}>🔊 TTS Service Tester</ThemedText>
      
      <ThemedView style={styles.inputContainer}>
        <ThemedText style={styles.label}>Test Text:</ThemedText>
        <TextInput
          style={styles.textInput}
          value={testText}
          onChangeText={setTestText}
          placeholder="Enter text to convert to speech..."
          multiline
          maxLength={500}
          editable={!isGenerating}
        />
      </ThemedView>

      <ThemedView style={styles.statusContainer}>
        <ThemedText style={styles.status}>{status}</ThemedText>
      </ThemedView>

      <ThemedView style={styles.buttonContainer}>
        <Button
          title={isGenerating ? 'Generating...' : 'Test TTS Service'}
          onPress={testTTS}
          loading={isGenerating}
          disabled={!isAuthenticated || !testText.trim()}
          style={styles.button}
        />
        
        <Button
          title="Test Orchestrator"
          onPress={testOrchestrator}
          variant="secondary"
          disabled={!isAuthenticated || !testText.trim()}
          style={styles.button}
        />
      </ThemedView>

      <ThemedView style={styles.infoContainer}>
        <ThemedText style={styles.infoTitle}>Service Configuration:</ThemedText>
        <ThemedText style={styles.configText}>
          TTS: {APP_CONFIG.SERVICES.tts}{APP_CONFIG.ENDPOINTS.TTS}
        </ThemedText>
        <ThemedText style={styles.configText}>
          Orchestrator: {APP_CONFIG.SERVICES.orchestrator}{APP_CONFIG.ENDPOINTS.CHAT}
        </ThemedText>
        <ThemedText style={styles.configText}>
          Auth: {isAuthenticated ? '✅ Signed in' : '❌ Not signed in'}
        </ThemedText>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    minHeight: 80,
    fontSize: 16,
    textAlignVertical: 'top',
    backgroundColor: '#fff',
  },
  statusContainer: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
    minHeight: 60,
    justifyContent: 'center',
  },
  status: {
    fontSize: 14,
    textAlign: 'center',
  },
  buttonContainer: {
    gap: 12,
    marginBottom: 20,
  },
  button: {
    marginBottom: 0,
  },
  infoContainer: {
    backgroundColor: '#e9ecef',
    padding: 16,
    borderRadius: 8,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  configText: {
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 4,
  },
});