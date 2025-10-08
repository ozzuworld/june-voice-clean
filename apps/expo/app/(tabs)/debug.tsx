// app/(tabs)/debug.tsx - FIXED: Added default export
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import APP_CONFIG from '@/config/app.config';

// ✅ Main component with default export
export default function DebugScreen() {
  const { accessToken, isAuthenticated } = useAuth();
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<string[]>([]);

  const addResult = (message: string, isError = false) => {
    const prefix = isError ? '❌' : '✅';
    setResults(prev => [...prev, `${prefix} ${message}`]);
  };

  const testEndpoint = async (endpoint: string) => {
    const url = `${APP_CONFIG.SERVICES.orchestrator}${endpoint}`;
    addResult(`Testing: ${endpoint}`);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: 'Hello',
          language: 'en',
          metadata: { test: true }
        }),
      });

      if (response.ok) {
        addResult(`🎉 FOUND IT! ${endpoint} - Status ${response.status}`);
        const data = await response.json();
        addResult(`Response: ${JSON.stringify(data).substring(0, 100)}...`);
        return true;
      } else if (response.status === 405) {
        addResult(`${endpoint} exists but wrong method (405)`);
      } else if (response.status === 404) {
        addResult(`${endpoint} - Not Found (404)`, true);
      } else {
        addResult(`${endpoint} - Status ${response.status}`);
      }
      return false;
    } catch (error: any) {
      addResult(`${endpoint} - Error: ${error.message}`, true);
      return false;
    }
  };

  const discoverEndpoints = async () => {
    if (!isAuthenticated) {
      Alert.alert('Error', 'Please sign in first');
      return;
    }

    setIsSearching(true);
    setResults([]);
    addResult('🔍 Starting endpoint discovery...');

    const endpointsToTry = [
      '/v1/conversation',
      '/v1/chat',
      '/v1/conversations',
      '/conversation',
      '/chat',
      '/api/v1/conversation',
      '/api/v1/chat',
      '/api/conversation',
      '/api/chat',
      '/v1/message',
      '/v1/messages',
      '/v1/voice-process',
      '/v1/process',
      '/v1/text',
    ];

    addResult(`Testing ${endpointsToTry.length} possible endpoints...`);

    let foundEndpoint = false;
    for (const endpoint of endpointsToTry) {
      const found = await testEndpoint(endpoint);
      if (found) {
        foundEndpoint = true;
        addResult('');
        addResult(`Update config/app.config.ts:`);
        addResult(`ENDPOINTS.CHAT = '${endpoint}'`);
        Alert.alert(
          'Endpoint Found! 🎉',
          `The correct endpoint is:\n\n${endpoint}\n\nUpdate config/app.config.ts`,
          [{ text: 'OK' }]
        );
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    if (!foundEndpoint) {
      addResult('');
      addResult('❌ No working endpoint found');
      addResult('Check orchestrator API docs or ask backend team');
    }

    setIsSearching(false);
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText style={styles.title}>🔍 Find Correct Endpoint</ThemedText>
      
      <ThemedText style={styles.description}>
        Your chat endpoint returns 404. Let me find the correct one!
      </ThemedText>

      <Button
        title={isSearching ? 'Searching...' : '🔍 Auto-Discover Endpoint'}
        onPress={discoverEndpoints}
        loading={isSearching}
        disabled={!isAuthenticated}
        style={styles.button}
      />

      {results.length > 0 && (
        <ScrollView style={styles.resultsContainer}>
          <ThemedView style={styles.resultsContent}>
            {results.map((result, index) => (
              <ThemedText 
                key={index} 
                style={[
                  styles.resultText,
                  result.includes('❌') && styles.resultError,
                  result.includes('🎉') && styles.resultSuccess,
                ]}
              >
                {result}
              </ThemedText>
            ))}
          </ThemedView>
        </ScrollView>
      )}

      <ThemedView style={styles.infoContainer}>
        <ThemedText style={styles.infoTitle}>Current Config:</ThemedText>
        <ThemedText style={styles.configText}>
          Base: {APP_CONFIG.SERVICES.orchestrator}
        </ThemedText>
        <ThemedText style={[styles.configText, styles.errorText]}>
          Endpoint: {APP_CONFIG.ENDPOINTS.CHAT} ❌ (404)
        </ThemedText>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 12 },
  description: { fontSize: 14, textAlign: 'center', marginBottom: 20, color: '#666' },
  button: { marginBottom: 20 },
  resultsContainer: { flex: 1, maxHeight: 400, marginBottom: 20 },
  resultsContent: { backgroundColor: '#000', padding: 16, borderRadius: 8 },
  resultText: { fontSize: 11, fontFamily: 'monospace', marginBottom: 2, color: '#00ff00', lineHeight: 16 },
  resultError: { color: '#ff6b6b' },
  resultSuccess: { color: '#ffd700', fontWeight: 'bold' },
  infoContainer: { backgroundColor: '#fff3cd', padding: 16, borderRadius: 8, borderLeftWidth: 4, borderLeftColor: '#ffc107' },
  infoTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8, color: '#856404' },
  configText: { fontSize: 11, fontFamily: 'monospace', marginBottom: 4, color: '#856404' },
  errorText: { fontWeight: 'bold', color: '#dc3545' },
});