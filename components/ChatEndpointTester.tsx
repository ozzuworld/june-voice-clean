// components/ChatEndpointTester.tsx - Add this to debug screen
import React, { useState } from 'react';
import { View, StyleSheet, TextInput, ScrollView, Alert } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import APP_CONFIG from '@/config/app.config';

export function ChatEndpointTester() {
  const { accessToken, isAuthenticated, user } = useAuth();
  const [testText, setTestText] = useState('Hello, can you hear me?');
  const [isTesting, setIsTesting] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string, isError = false) => {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = isError ? '❌' : '📝';
    const log = `${prefix} [${timestamp}] ${message}`;
    console.log(log);
    setLogs(prev => [...prev, log]);
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const testChatEndpoint = async () => {
    if (!isAuthenticated || !accessToken) {
      Alert.alert('Error', 'Please sign in first');
      return;
    }

    if (!testText.trim()) {
      Alert.alert('Error', 'Please enter test text');
      return;
    }

    setIsTesting(true);
    clearLogs();

    try {
      addLog('=== STARTING CHAT ENDPOINT TEST ===');
      addLog(`User: ${user?.email || user?.username || 'Unknown'}`);
      addLog(`Test text: "${testText}"`);
      addLog('');

      // Step 1: Check endpoint URL
      const fullUrl = `${APP_CONFIG.SERVICES.orchestrator}${APP_CONFIG.ENDPOINTS.CHAT}`;
      addLog(`Endpoint: ${fullUrl}`);
      addLog(`Method: POST`);
      addLog('');

      // Step 2: Prepare request
      const requestBody = {
        text: testText.trim(),
        language: 'en',
        metadata: {
          session_id: `test_${Date.now()}`,
          user_id: user?.id || user?.email || 'test_user',
          platform: 'mobile',
          test: true,
          include_audio: false,
        }
      };

      addLog('Request Body:');
      addLog(JSON.stringify(requestBody, null, 2));
      addLog('');

      // Step 3: Check auth token
      const tokenPreview = accessToken.substring(0, 20) + '...';
      addLog(`Auth Token: ${tokenPreview}`);
      addLog('');

      // Step 4: Make request with detailed logging
      addLog('Sending request...');
      const startTime = Date.now();

      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        addLog('Request timeout!', true);
        controller.abort();
      }, 30000); // 30 second timeout for testing

      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const duration = Date.now() - startTime;

      addLog(`Response received in ${duration}ms`);
      addLog(`Status: ${response.status} ${response.statusText}`);
      addLog('');

      // Step 5: Check response headers
      addLog('Response Headers:');
      response.headers.forEach((value, key) => {
        addLog(`  ${key}: ${value}`);
      });
      addLog('');

      // Step 6: Parse response
      if (!response.ok) {
        const errorText = await response.text();
        addLog('Response Error:', true);
        addLog(errorText, true);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const responseText = await response.text();
      addLog('Raw Response:');
      addLog(responseText);
      addLog('');

      // Try to parse as JSON
      let data;
      try {
        data = JSON.parse(responseText);
        addLog('Parsed Response:');
        addLog(JSON.stringify(data, null, 2));
        addLog('');
      } catch (e) {
        addLog('Response is not valid JSON', true);
        data = responseText;
      }

      // Step 7: Extract message
      let extractedMessage = '';
      if (typeof data === 'string') {
        extractedMessage = data;
      } else if (data.ok && data.message?.text) {
        extractedMessage = data.message.text;
      } else if (data.message?.text) {
        extractedMessage = data.message.text;
      } else if (data.text) {
        extractedMessage = data.text;
      } else if (data.response) {
        extractedMessage = data.response;
      }

      if (extractedMessage) {
        addLog('✅ EXTRACTED MESSAGE:');
        addLog(`"${extractedMessage}"`);
      } else {
        addLog('⚠️ Could not extract message from response', true);
        addLog('Available fields: ' + Object.keys(data).join(', '));
      }

      addLog('');
      addLog('=== TEST COMPLETED SUCCESSFULLY ===');

      Alert.alert(
        'Test Successful! ✅',
        `Got response in ${duration}ms:\n\n"${extractedMessage.substring(0, 100)}${extractedMessage.length > 100 ? '...' : ''}"`,
        [{ text: 'OK' }]
      );

    } catch (error: any) {
      addLog('', true);
      addLog('=== TEST FAILED ===', true);
      addLog(`Error: ${error.message}`, true);
      
      if (error.name === 'AbortError') {
        addLog('Request was aborted (timeout)', true);
      } else if (error.message.includes('Network request failed')) {
        addLog('Network error - check internet connection', true);
      }

      Alert.alert(
        'Test Failed ❌',
        error.message,
        [{ text: 'OK' }]
      );
    } finally {
      setIsTesting(false);
    }
  };

  const testQuickMessage = async (message: string) => {
    setTestText(message);
    // Wait for state to update
    setTimeout(() => testChatEndpoint(), 100);
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText style={styles.title}>🧪 Chat Endpoint Tester</ThemedText>
      
      <ThemedView style={styles.section}>
        <ThemedText style={styles.label}>Test Message:</ThemedText>
        <TextInput
          style={styles.textInput}
          value={testText}
          onChangeText={setTestText}
          placeholder="Enter message to test..."
          multiline
          maxLength={500}
          editable={!isTesting}
        />
      </ThemedView>

      <ThemedView style={styles.buttonContainer}>
        <Button
          title={isTesting ? 'Testing...' : '🚀 Test Chat Endpoint'}
          onPress={testChatEndpoint}
          loading={isTesting}
          disabled={!isAuthenticated || !testText.trim()}
          style={styles.button}
        />
        
        <Button
          title="Clear Logs"
          onPress={clearLogs}
          variant="secondary"
          size="small"
          disabled={logs.length === 0}
          style={styles.button}
        />
      </ThemedView>

      <ThemedView style={styles.quickTests}>
        <ThemedText style={styles.quickTestsTitle}>Quick Tests:</ThemedText>
        <View style={styles.quickTestButtons}>
          <Button
            title="Test: Hello"
            onPress={() => testQuickMessage('Hello')}
            variant="secondary"
            size="small"
            disabled={isTesting}
          />
          <Button
            title="Test: Tell me a joke"
            onPress={() => testQuickMessage('Tell me a joke')}
            variant="secondary"
            size="small"
            disabled={isTesting}
          />
          <Button
            title="Test: What's 2+2?"
            onPress={() => testQuickMessage("What's 2+2?")}
            variant="secondary"
            size="small"
            disabled={isTesting}
          />
        </View>
      </ThemedView>

      {logs.length > 0 && (
        <ScrollView style={styles.logsContainer}>
          <ThemedView style={styles.logsContent}>
            <ThemedText style={styles.logsTitle}>Test Logs:</ThemedText>
            {logs.map((log, index) => (
              <ThemedText 
                key={index} 
                style={[
                  styles.logText,
                  log.includes('❌') && styles.logError,
                  log.includes('✅') && styles.logSuccess,
                ]}
              >
                {log}
              </ThemedText>
            ))}
          </ThemedView>
        </ScrollView>
      )}

      <ThemedView style={styles.infoContainer}>
        <ThemedText style={styles.infoTitle}>Configuration:</ThemedText>
        <ThemedText style={styles.configText}>
          Orchestrator: {APP_CONFIG.SERVICES.orchestrator}
        </ThemedText>
        <ThemedText style={styles.configText}>
          Endpoint: {APP_CONFIG.ENDPOINTS.CHAT}
        </ThemedText>
        <ThemedText style={styles.configText}>
          Full URL: {APP_CONFIG.SERVICES.orchestrator}{APP_CONFIG.ENDPOINTS.CHAT}
        </ThemedText>
        <ThemedText style={styles.configText}>
          Timeout: {APP_CONFIG.TIMEOUTS.CHAT}ms
        </ThemedText>
        <ThemedText style={styles.configText}>
          Auth: {isAuthenticated ? '✅ Authenticated' : '❌ Not authenticated'}
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
  section: {
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
  buttonContainer: {
    gap: 12,
    marginBottom: 20,
  },
  button: {
    marginBottom: 0,
  },
  quickTests: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  quickTestsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  quickTestButtons: {
    gap: 8,
  },
  logsContainer: {
    flex: 1,
    maxHeight: 400,
    marginBottom: 20,
  },
  logsContent: {
    backgroundColor: '#000',
    padding: 16,
    borderRadius: 8,
  },
  logsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#fff',
  },
  logText: {
    fontSize: 11,
    fontFamily: 'monospace',
    marginBottom: 2,
    color: '#00ff00',
    lineHeight: 16,
  },
  logError: {
    color: '#ff6b6b',
  },
  logSuccess: {
    color: '#51cf66',
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
    fontSize: 11,
    fontFamily: 'monospace',
    marginBottom: 4,
  },
});