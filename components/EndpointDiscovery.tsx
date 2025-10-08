// components/EndpointDiscovery.tsx
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import APP_CONFIG from '@/config/app.config';

export function EndpointDiscovery() {
  const { accessToken, isAuthenticated } = useAuth();
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<string[]>([]);

  const addResult = (message: string) => {
    setResults(prev => [...prev, message]);
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
        addResult(`🎉 FOUND! ${endpoint} - ${response.status}`);
        const data = await response.json();
        addResult(`Response: ${JSON.stringify(data).substring(0, 80)}...`);
        return endpoint;
      } else if (response.status === 404) {
        addResult(`❌ ${endpoint} - 404`);
      } else {
        addResult(`⚠️ ${endpoint} - ${response.status}`);
      }
      return null;
    } catch (error: any) {
      addResult(`❌ ${endpoint} - ${error.message}`);
      return null;
    }
  };

  const discoverEndpoints = async () => {
    if (!isAuthenticated) {
      Alert.alert('Error', 'Please sign in first');
      return;
    }

    setIsSearching(true);
    setResults([]);
    addResult('🔍 Searching for chat endpoint...');

    const endpoints = [
      '/v1/chat',
      '/v1/conversation',
      '/chat',
      '/conversation',
      '/api/v1/chat',
      '/api/chat',
      '/v1/message',
      '/message',
    ];

    let found = null;
    for (const endpoint of endpoints) {
      const result = await testEndpoint(endpoint);
      if (result) {
        found = result;
        addResult('');
        addResult(`✅ Update config/app.config.ts:`);
        addResult(`ENDPOINTS.CHAT = '${result}'`);
        Alert.alert('Found! 🎉', `Use: ${result}`);
        break;
      }
      await new Promise(r => setTimeout(r, 200));
    }

    if (!found) {
      addResult('');
      addResult('❌ No working endpoint found');
    }

    setIsSearching(false);
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText style={styles.title}>🔍 Find Endpoint</ThemedText>
      
      <Button
        title={isSearching ? 'Searching...' : '🔍 Auto-Discover'}
        onPress={discoverEndpoints}
        loading={isSearching}
        disabled={!isAuthenticated}
        style={styles.button}
      />

      {results.length > 0 && (
        <ScrollView style={styles.results}>
          <ThemedView style={styles.resultsContent}>
            {results.map((r, i) => (
              <ThemedText key={i} style={styles.resultText}>{r}</ThemedText>
            ))}
          </ThemedView>
        </ScrollView>
      )}

      <ThemedView style={styles.info}>
        <ThemedText style={styles.infoTitle}>Current:</ThemedText>
        <ThemedText style={styles.configText}>
          {APP_CONFIG.SERVICES.orchestrator}{APP_CONFIG.ENDPOINTS.CHAT}
        </ThemedText>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  button: { marginBottom: 20 },
  results: { flex: 1, maxHeight: 400, marginBottom: 20 },
  resultsContent: { backgroundColor: '#000', padding: 16, borderRadius: 8 },
  resultText: { fontSize: 11, fontFamily: 'monospace', marginBottom: 2, color: '#00ff00' },
  info: { backgroundColor: '#fff3cd', padding: 16, borderRadius: 8 },
  infoTitle: { fontSize: 14, fontWeight: '600', marginBottom: 8, color: '#856404' },
  configText: { fontSize: 10, fontFamily: 'monospace', color: '#856404' },
});
