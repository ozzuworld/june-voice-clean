// app/(tabs)/debug.tsx - PRODUCTION VERSION (Minimal debugging only)
import React, { useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Alert } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import APP_CONFIG from '@/config/app.config';

interface ServiceStatus {
  service: string;
  status: 'success' | 'error' | 'pending';
  message: string;
  responseTime?: number;
}

export default function DebugScreen() {
  const { accessToken, isAuthenticated, user } = useAuth();
  const [serviceStatuses, setServiceStatuses] = useState<ServiceStatus[]>([]);
  const [isTestingServices, setIsTestingServices] = useState(false);

  const testService = async (serviceName: string, url: string, method: 'GET' | 'POST' = 'GET', body?: any) => {
    const startTime = Date.now();
    
    // Add pending status
    setServiceStatuses(prev => [...prev, {
      service: serviceName,
      status: 'pending',
      message: 'Testing...'
    }]);

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        ...(body && { body: JSON.stringify(body) }),
      });

      const responseTime = Date.now() - startTime;
      
      // Update status
      setServiceStatuses(prev => prev.map(status => 
        status.service === serviceName && status.status === 'pending'
          ? {
              service: serviceName,
              status: response.ok ? 'success' : 'error',
              message: response.ok 
                ? `✅ Online (${response.status})` 
                : `❌ Error ${response.status}`,
              responseTime
            }
          : status
      ));

    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      
      setServiceStatuses(prev => prev.map(status => 
        status.service === serviceName && status.status === 'pending'
          ? {
              service: serviceName,
              status: 'error',
              message: `❌ ${error.message}`,
              responseTime
            }
          : status
      ));
    }
  };

  const runServiceTests = async () => {
    if (!isAuthenticated) {
      Alert.alert('Authentication Required', 'Please sign in first');
      return;
    }

    setIsTestingServices(true);
    setServiceStatuses([]);

    // Test core services
    await testService('Orchestrator', `${APP_CONFIG.SERVICES.orchestrator}/healthz`);
    await testService('TTS Service', `${APP_CONFIG.SERVICES.tts}/health`);
    await testService('STT Service', `${APP_CONFIG.SERVICES.stt}/health`);

    // Test chat endpoint
    await testService(
      'Chat Endpoint', 
      `${APP_CONFIG.SERVICES.orchestrator}${APP_CONFIG.ENDPOINTS.CHAT}`,
      'POST',
      {
        text: 'Health check',
        metadata: { test: true }
      }
    );

    setIsTestingServices(false);
  };

  const clearResults = () => {
    setServiceStatuses([]);
  };

  const getStatusColor = (status: ServiceStatus['status']) => {
    switch (status) {
      case 'success': return '#28a745';
      case 'error': return '#dc3545';
      default: return '#ffc107';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText style={styles.title}>System Status</ThemedText>
        
        {/* Authentication Status */}
        <ThemedView style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Authentication</ThemedText>
          <ThemedText style={[
            styles.authStatus,
            { color: isAuthenticated ? '#28a745' : '#dc3545' }
          ]}>
            {isAuthenticated ? '✅ Authenticated' : '❌ Not Authenticated'}
          </ThemedText>
          {user && (
            <ThemedText style={styles.userInfo}>
              User: {user.email || user.username || 'Unknown'}
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
            TTS: {APP_CONFIG.SERVICES.tts}
          </ThemedText>
          <ThemedText style={styles.configText}>
            STT: {APP_CONFIG.SERVICES.stt}
          </ThemedText>
        </ThemedView>

        {/* Service Tests */}
        <ThemedView style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Service Health Check</ThemedText>
          
          <Button
            title={isTestingServices ? 'Testing Services...' : 'Test All Services'}
            onPress={runServiceTests}
            loading={isTestingServices}
            disabled={!isAuthenticated}
            style={styles.button}
          />
          
          {serviceStatuses.length > 0 && (
            <Button
              title="Clear Results"
              onPress={clearResults}
              variant="secondary"
              size="small"
              style={styles.button}
            />
          )}
        </ThemedView>

        {/* Service Status Results */}
        {serviceStatuses.length > 0 && (
          <ThemedView style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Service Status</ThemedText>
            {serviceStatuses.map((status, index) => (
              <ThemedView key={index} style={styles.statusItem}>
                <ThemedText style={[
                  styles.serviceName,
                  { color: getStatusColor(status.status) }
                ]}>
                  {status.service}
                </ThemedText>
                <ThemedText style={styles.statusMessage}>
                  {status.message}
                </ThemedText>
                {status.responseTime && (
                  <ThemedText style={styles.responseTime}>
                    {status.responseTime}ms
                  </ThemedText>
                )}
              </ThemedView>
            ))}
          </ThemedView>
        )}

        {/* App Information */}
        <ThemedView style={styles.section}>
          <ThemedText style={styles.sectionTitle}>App Information</ThemedText>
          <ThemedText style={styles.configText}>
            Version: 2.0.0 (Production)
          </ThemedText>
          <ThemedText style={styles.configText}>
            Environment: Production
          </ThemedText>
          <ThemedText style={styles.configText}>
            Debug Logs: {APP_CONFIG.DEBUG.VERBOSE_LOGS ? 'Enabled' : 'Disabled'}
          </ThemedText>
          <ThemedText style={styles.configText}>
            TTS Timeout: {APP_CONFIG.TIMEOUTS.TTS}ms
          </ThemedText>
          <ThemedText style={styles.configText}>
            STT Timeout: {APP_CONFIG.TIMEOUTS.STT}ms
          </ThemedText>
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
  userInfo: {
    fontSize: 12,
    color: '#666',
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
  statusItem: {
    borderLeftWidth: 4,
    borderLeftColor: '#667eea',
    paddingLeft: 12,
    marginBottom: 12,
    paddingVertical: 8,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  statusMessage: {
    fontSize: 14,
    color: '#333',
    marginBottom: 2,
  },
  responseTime: {
    fontSize: 12,
    color: '#666',
  },
});