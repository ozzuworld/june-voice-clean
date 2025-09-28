// Add this to your debug screen: components/TTSDebugger.tsx
import React, { useState } from 'react';
import { View, StyleSheet, TextInput, Alert } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { Button } from '@/components/ui/Button';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { useAuth } from '@/hooks/useAuth';
import APP_CONFIG from '@/config/app.config';

export function TTSDebugger() {
  const { accessToken, isAuthenticated } = useAuth();
  const [testText, setTestText] = useState('Hello world, this is a short test.');
  const [isGenerating, setIsGenerating] = useState(false);
  const [status, setStatus] = useState('Ready to test TTS service');
  const [debugLogs, setDebugLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    console.log(message);
    setDebugLogs(prev => [...prev.slice(-10), `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testTTSService = async () => {
    if (!isAuthenticated || !accessToken) {
      Alert.alert('Error', 'Please sign in first');
      return;
    }

    if (!testText.trim()) {
      Alert.alert('Error', 'Please enter some text to test');
      return;
    }

    setIsGenerating(true);
    setStatus('🔄 Testing TTS service...');
    setDebugLogs([]);

    try {
      addLog('🔧 Setting up audio mode...');
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: false,
      });

      addLog('✅ Audio mode configured');
      setStatus('🔊 Generating speech...');

      // Test with various timeout values
      const timeouts = [30000, 60000, 90000]; // 30s, 60s, 90s
      let success = false;

      for (const timeout of timeouts) {
        if (success) break;

        try {
          addLog(`🕐 Trying with ${timeout/1000}s timeout...`);
          
          const controller = new AbortController();
          const timeoutId = setTimeout(() => {
            addLog(`⏰ Timeout reached at ${timeout/1000}s`);
            controller.abort();
          }, timeout);

          const requestPayload = {
            text: testText.trim(),
            voice_id: 'default',
            language: 'en',
            format: 'wav',
            speed: 1.0,
            volume: 1.0,
            pitch: 0.0,
            metadata: {
              test: true,
              platform: 'mobile',
              timeout_test: timeout,
            }
          };

          addLog(`📤 Sending request to: ${APP_CONFIG.SERVICES.tts}${APP_CONFIG.ENDPOINTS.TTS}`);
          addLog(`📝 Text length: ${testText.length} characters`);

          const startTime = Date.now();
          const response = await fetch(`${APP_CONFIG.SERVICES.tts}${APP_CONFIG.ENDPOINTS.TTS}`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestPayload),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);
          const responseTime = Date.now() - startTime;
          addLog(`📨 Response received in ${responseTime}ms`);

          if (!response.ok) {
            const errorText = await response.text();
            addLog(`❌ HTTP ${response.status}: ${errorText}`);
            continue; // Try next timeout
          }

          addLog(`✅ HTTP ${response.status} - Processing audio...`);
          const audioBlob = await response.arrayBuffer();
          
          if (!audioBlob || audioBlob.byteLength === 0) {
            addLog('❌ No audio data received');
            continue;
          }

          addLog(`✅ Audio data: ${audioBlob.byteLength} bytes`);
          setStatus(`✅ Got audio (${audioBlob.byteLength} bytes) in ${responseTime}ms`);

          // Save and play the audio
          const audioPath = `${FileSystem.cacheDirectory}tts_debug_test.wav`;
          const base64Audio = btoa(String.fromCharCode(...new Uint8Array(audioBlob)));
          
          await FileSystem.writeAsStringAsync(audioPath, base64Audio, {
            encoding: FileSystem.EncodingType.Base64,
          });

          addLog('🎵 Playing audio...');
          
          const { sound } = await Audio.Sound.createAsync(
            { uri: audioPath },
            { shouldPlay: true, volume: 1.0 }
          );

          sound.setOnPlaybackStatusUpdate((status) => {
            if (status.isLoaded && status.didJustFinish) {
              addLog('✅ Audio playback completed');
              setStatus('✅ TTS test completed successfully!');
              sound.unloadAsync();
              FileSystem.deleteAsync(audioPath, { idempotent: true });
            }
            if (status.isLoaded && status.error) {
              addLog(`❌ Playback error: ${status.error}`);
              sound.unloadAsync();
            }
          });

          success = true;
          break;

        } catch (error: any) {
          if (error.name === 'AbortError') {
            addLog(`⏰ Timeout at ${timeout/1000}s - trying longer timeout...`);
          } else {
            addLog(`❌ Error with ${timeout/1000}s timeout: ${error.message}`);
          }
        }
      }

      if (!success) {
        setStatus('❌ All timeout tests failed');
        addLog('💡 Try: 1) Shorter text 2) Check TTS service status 3) Test with curl');
      }

    } catch (error: any) {
      addLog(`❌ Test failed: ${error.message}`);
      setStatus(`❌ Error: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const testWithCurl = () => {
    const curlCommand = `curl -X POST "${APP_CONFIG.SERVICES.tts}${APP_CONFIG.ENDPOINTS.TTS}" \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"text":"${testText}","voice_id":"default","language":"en","format":"wav","speed":1.0}' \\
  --max-time 90 \\
  -o test_output.wav`;

    Alert.alert(
      'Test with curl',
      `Copy this command to test TTS directly:\n\n${curlCommand}`,
      [
        { text: 'Copy', onPress: () => {} },
        { text: 'Close' }
      ]
    );
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText style={styles.title}>🔊 TTS Service Debugger</ThemedText>
      
      <ThemedView style={styles.inputContainer}>
        <ThemedText style={styles.label}>Test Text:</ThemedText>
        <TextInput
          style={styles.textInput}
          value={testText}
          onChangeText={setTestText}
          placeholder="Enter text to convert to speech..."
          multiline
          maxLength={200}
          editable={!isGenerating}
        />
        <ThemedText style={styles.charCount}>
          {testText.length}/200 characters
        </ThemedText>
      </ThemedView>

      <ThemedView style={styles.statusContainer}>
        <ThemedText style={styles.status}>{status}</ThemedText>
      </ThemedView>

      <ThemedView style={styles.buttonContainer}>
        <Button
          title={isGenerating ? 'Testing...' : 'Test TTS with Multiple Timeouts'}
          onPress={testTTSService}
          loading={isGenerating}
          disabled={!isAuthenticated || !testText.trim()}
          style={styles.button}
        />
        
        <Button
          title="Generate curl Command"
          onPress={testWithCurl}
          variant="secondary"
          disabled={!testText.trim()}
          style={styles.button}
        />
      </ThemedView>

      {debugLogs.length > 0 && (
        <ThemedView style={styles.logsContainer}>
          <ThemedText style={styles.logsTitle}>Debug Logs:</ThemedText>
          {debugLogs.map((log, index) => (
            <ThemedText key={index} style={styles.logText}>
              {log}
            </ThemedText>
          ))}
        </ThemedView>
      )}

      <ThemedView style={styles.infoContainer}>
        <ThemedText style={styles.infoTitle}>TTS Service Info:</ThemedText>
        <ThemedText style={styles.configText}>
          Endpoint: {APP_CONFIG.SERVICES.tts}{APP_CONFIG.ENDPOINTS.TTS}
        </ThemedText>
        <ThemedText style={styles.configText}>
          Current Timeout: {APP_CONFIG.TIMEOUTS.TTS}ms ({APP_CONFIG.TIMEOUTS.TTS/1000}s)
        </ThemedText>
        <ThemedText style={styles.configText}>
          Auth: {isAuthenticated ? '✅ Signed in' : '❌ Not signed in'}
        </ThemedText>
        
        <ThemedText style={styles.troubleshootTitle}>If TTS keeps timing out:</ThemedText>
        <ThemedText style={styles.troubleshootText}>
          1. Try shorter text (under 100 characters){'\n'}
          2. Check if TTS service is running{'\n'}
          3. Test with curl command above{'\n'}
          4. Contact backend team about TTS performance{'\n'}
          5. Consider enabling TTS fallback mode
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
  charCount: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
    opacity: 0.7,
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
  logsContainer: {
    backgroundColor: '#000',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
    maxHeight: 200,
  },
  logsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#fff',
  },
  logText: {
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 2,
    color: '#00ff00',
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
  troubleshootTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 8,
    color: '#856404',
  },
  troubleshootText: {
    fontSize: 12,
    lineHeight: 16,
    color: '#856404',
  },
});