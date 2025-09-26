// app/(tabs)/debug.tsx - Enhanced debug screen for testing services
import React, { useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Alert } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { Button } from '@/components/ui/Button';
import { AndroidAudioTest } from '@/components/AndroidAudioTest';
import { useAuth } from '@/hooks/useAuth';
import APP_CONFIG from '@/config/app.config';

interface TestResult {
  service: string;
  status: 'pending' | 'success' | 'error';
  message: string;
  responseTime?: number;
}

export default function DebugScreen() {
  const { accessToken, isAuthenticated } = useAuth();
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const addResult = (result: TestResult) => {
    setTestResults(prev => [...prev, result]);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  const testService = async (
    serviceName: string,
    endpoint: string,
    method: 'GET' | 'POST' = 'POST',
    body?: any
  ) => {
    const startTime = Date.now();
    
    addResult({
      service: serviceName,
      status: 'pending',
      message: 'Testing...',
    });

    try {
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        ...(body && { body: JSON.stringify(body) }),
      });

      const responseTime = Date.now() - startTime;
      
      if (response.ok) {
        const responseText = await response.text();
        let displayMessage = `✅ Connected (${response.status})`;
        
        // Try to parse JSON response for better debugging
        try {
          const jsonResponse = JSON.parse(responseText);
          if (jsonResponse.message && jsonResponse.message.text) {
            displayMessage += ` - Response: "${jsonResponse.message.text.substring(0, 50)}..."`;
          } else if (jsonResponse.status) {
            displayMessage += ` - Status: ${jsonResponse.status}`;
          }
        } catch (e) {
          // Not JSON, that's fine
        }
        
        addResult({
          service: serviceName,
          status: 'success',
          message: displayMessage,
          responseTime,
        });
      } else {
        const errorText = await response.text();
        addResult({
          service: serviceName,
          status: 'error',
          message: `❌ Failed: ${response.status} ${response.statusText} - ${errorText.substring(0, 100)}`,
          responseTime,
        });
      }
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      addResult({
        service: serviceName,
        status: 'error',
        message: `❌ Error: ${error.message}`,
        responseTime,
      });
    }
  };

  const runAllTests = async () => {
    if (!isAuthenticated || !accessToken) {
      Alert.alert('Not Authenticated', 'Please sign in first');
      return;
    }

    setIsRunning(true);
    clearResults();

    // Test Orchestrator Health Check
    await testService(
      'Orchestrator Health',
      `${APP_CONFIG.SERVICES.orchestrator}/healthz`,
      'GET'
    );

    // Test Debug Routes endpoint
    await testService(
      'Orchestrator Routes',
      `${APP_CONFIG.SERVICES.orchestrator}/debug/routes`,
      'GET'
    );

    // Test Orchestrator Chat with enhanced router payload format
    await testService(
      'Orchestrator Chat',
      `${APP_CONFIG.SERVICES.orchestrator}${APP_CONFIG.ENDPOINTS.CHAT}`,
      'POST',
      {
        text: 'Hello, this is a debug test from the mobile app',
        language: 'en',
        voice_id: 'default',
        include_audio: false,  // ✅ NEW: Disable audio for testing
        speed: 1.0,
        extra_extra_metadata: {  // ✅ FIXED: Use correct field name
          session_id: `debug_${Date.now()}`,
          platform: 'mobile_debug',
          test_mode: true,
        }
      }
    );

    // Test STT (if you have a health check endpoint)
    await testService(
      'STT Service Health',
      `${APP_CONFIG.SERVICES.stt}/health`,
      'GET'
    );

    // Test TTS (if you have a health check endpoint)  
    await testService(
      'TTS Service Health',
      `${APP_CONFIG.SERVICES.tts}/health`,
      'GET'
    );

    // Test TTS generation
    await testService(
      'TTS Generation',
      `${APP_CONFIG.SERVICES.tts}${APP_CONFIG.ENDPOINTS.TTS}`,
      'POST',
      {
        text: 'Hello, this is a test from the debug screen',
        voice: APP_CONFIG.TTS.DEFAULT_VOICE,
        speed: APP_CONFIG.TTS.DEFAULT_SPEED,
        audio_encoding: APP_CONFIG.TTS.DEFAULT_ENCODING,
      }
    );

    setIsRunning(false);
  };

  const testChatOnly = async () => {
    if (!isAuthenticated || !accessToken) {
      Alert.alert('Not Authenticated', 'Please sign in first');
      return;
    }

    setIsRunning(true);
    await testService(
      'Orchestrator Chat Test',
      `${APP_CONFIG.SERVICES.orchestrator}${APP_CONFIG.ENDPOINTS.CHAT}`,
      'POST',
      { 
        text: 'Hello from debug screen, please respond with a short greeting',
        language: 'en',
        voice_id: 'default',
        include_audio: false,  // ✅ Disable audio for testing
        speed: 1.0,
        extra_extra_metadata: {  // ✅ FIXED: Use correct field name
          mode: 'debug',
          platform: 'mobile',
          timestamp: Date.now(),
          test_type: 'chat_only',
        }
      }
    );
    setIsRunning(false);
  };

  const getResultColor = (status: TestResult['status']) => {
    switch (status) {
      case 'success': return '#28a745';
      case 'error': return '#dc3545';
      default: return '#ffc107';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText style={styles.title}>🔧 Debug & Test Services</ThemedText>
        
        {/* Authentication Status */}
        <ThemedView style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Authentication</ThemedText>
          <ThemedText style={[
            styles.authStatus,
            { color: isAuthenticated ? '#28a745' : '#dc3545' }
          ]}>
            {isAuthenticated ? '✅ Authenticated' : '❌ Not Authenticated'}
          </ThemedText>
          {accessToken && (
            <ThemedText style={styles.tokenPreview}>
              Token: {accessToken.substring(0, 20)}...
            </ThemedText>
          )}
        </ThemedView>

        {/* Service Configuration */}
        <ThemedView style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Service Endpoints</ThemedText>
          <ThemedText style={styles.configText}>
            Orchestrator: {APP_CONFIG.SERVICES.orchestrator}
          </ThemedText>
          <ThemedText style={styles.configText}>
            Chat Endpoint: {APP_CONFIG.ENDPOINTS.CHAT}
          </ThemedText>
          <ThemedText style={styles.configText}>
            STT: {APP_CONFIG.SERVICES.stt}
          </ThemedText>
          <ThemedText style={styles.configText}>
            TTS: {APP_CONFIG.SERVICES.tts}
          </ThemedText>
        </ThemedView>

        {/* Test Controls */}
        <ThemedView style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Service Tests</ThemedText>
          
          <Button
            title="Test All Services"
            onPress={runAllTests}
            loading={isRunning}
            disabled={!isAuthenticated}
            style={styles.button}
          />
          
          <Button
            title="Test Chat Only"
            onPress={testChatOnly}
            loading={isRunning}
            disabled={!isAuthenticated}
            variant="secondary"
            style={styles.button}
          />
          
          <Button
            title="Clear Results"
            onPress={clearResults}
            variant="danger"
            size="small"
            disabled={testResults.length === 0}
            style={styles.button}
          />
        </ThemedView>

        {/* Test Results */}
        {testResults.length > 0 && (
          <ThemedView style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Test Results</ThemedText>
            {testResults.map((result, index) => (
              <ThemedView key={index} style={styles.resultItem}>
                <ThemedText style={[
                  styles.resultService,
                  { color: getResultColor(result.status) }
                ]}>
                  {result.service}
                </ThemedText>
                <ThemedText style={styles.resultMessage}>
                  {result.message}
                </ThemedText>
                {result.responseTime && (
                  <ThemedText style={styles.resultTime}>
                    {result.responseTime}ms
                  </ThemedText>
                )}
              </ThemedView>
            ))}
          </ThemedView>
        )}

        {/* Audio Test Component */}
        <ThemedView style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Audio Test</ThemedText>
          <AndroidAudioTest />
        </ThemedView>
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
    marginBottom: 20,
    color: '#333',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  authStatus: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  tokenPreview: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
  },
  configText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    fontFamily: 'monospace',
  },
  button: {
    marginBottom: 8,
  },
  resultItem: {
    borderLeftWidth: 4,
    borderLeftColor: '#667eea',
    paddingLeft: 12,
    marginBottom: 12,
    paddingVertical: 8,
  },
  resultService: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  resultMessage: {
    fontSize: 14,
    color: '#333',
    marginBottom: 2,
  },
  resultTime: {
    fontSize: 12,
    color: '#666',
  },
});