// Add this to your debug screen for testing the backend directly
// components/BackendTester.tsx

import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { Button } from '@/components/ui/Button';
import APP_CONFIG from '@/config/app.config';

export function BackendTester() {
  const [testResults, setTestResults] = useState<string>('');
  const [isRunning, setIsRunning] = useState(false);

  const testHealthCheck = async () => {
    setIsRunning(true);
    setTestResults('Testing health check...\n');

    try {
      const response = await fetch(`${APP_CONFIG.SERVICES.orchestrator}/healthz`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      setTestResults(prev => prev + `✅ Health Check: ${JSON.stringify(result, null, 2)}\n\n`);
    } catch (error: any) {
      setTestResults(prev => prev + `❌ Health Check Failed: ${error.message}\n\n`);
    } finally {
      setIsRunning(false);
    }
  };

  const testDebugEndpoint = async () => {
    setIsRunning(true);
    setTestResults(prev => prev + 'Testing debug endpoint...\n');

    try {
      const response = await fetch(`${APP_CONFIG.SERVICES.orchestrator}/v1/debug`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      setTestResults(prev => prev + `✅ Debug: ${JSON.stringify(result, null, 2)}\n\n`);
    } catch (error: any) {
      setTestResults(prev => prev + `❌ Debug Failed: ${error.message}\n\n`);
    } finally {
      setIsRunning(false);
    }
  };

  const testConversationWithoutAuth = async () => {
    setIsRunning(true);
    setTestResults(prev => prev + 'Testing conversation without auth...\n');

    try {
      const response = await fetch(`${APP_CONFIG.SERVICES.orchestrator}/v1/conversation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // NO AUTH HEADER for debugging
        },
        body: JSON.stringify({
          text: 'Hello, this is a test message',
          language: 'en',
          metadata: {
            test: true,
            platform: 'mobile'
          }
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      setTestResults(prev => prev + `✅ Conversation: ${JSON.stringify(result, null, 2)}\n\n`);
    } catch (error: any) {
      setTestResults(prev => prev + `❌ Conversation Failed: ${error.message}\n\n`);
    } finally {
      setIsRunning(false);
    }
  };

  const testAllEndpoints = async () => {
    setTestResults('🔧 Starting comprehensive backend test...\n\n');
    await testHealthCheck();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
    await testDebugEndpoint();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
    await testConversationWithoutAuth();
    setTestResults(prev => prev + '🏁 Test complete!\n');
  };

  const clearResults = () => {
    setTestResults('');
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText style={styles.title}>🔍 Backend Debug Test</ThemedText>
      
      <ThemedText style={styles.endpoint}>
        Testing: {APP_CONFIG.SERVICES.orchestrator}
      </ThemedText>

      <View style={styles.buttonContainer}>
        <Button
          title="Test All Endpoints"
          onPress={testAllEndpoints}
          loading={isRunning}
          style={styles.button}
        />
        
        <Button
          title="Test Health Only"
          onPress={testHealthCheck}
          loading={isRunning}
          variant="secondary"
          style={styles.button}
        />
        
        <Button
          title="Clear Results"
          onPress={clearResults}
          variant="danger"
          size="small"
          disabled={!testResults}
          style={styles.button}
        />
      </View>

      {testResults ? (
        <ThemedView style={styles.resultsContainer}>
          <ThemedText style={styles.resultsTitle}>Test Results:</ThemedText>
          <ThemedText style={styles.resultsText}>
            {testResults}
          </ThemedText>
        </ThemedView>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  endpoint: {
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 20,
    opacity: 0.7,
  },
  buttonContainer: {
    gap: 10,
    marginBottom: 20,
  },
  button: {
    marginBottom: 0,
  },
  resultsContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 8,
  },
  resultsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  resultsText: {
    fontSize: 12,
    fontFamily: 'monospace',
    lineHeight: 16,
  },
});