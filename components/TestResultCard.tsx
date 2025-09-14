import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ServiceTestResult } from '../services/api.service';
import { Card } from './Card';

interface TestResultCardProps {
  result: ServiceTestResult;
}

export function TestResultCard({ result }: TestResultCardProps) {
  const isSuccess = result.success;
  const statusColor = isSuccess ? '#28a745' : '#dc3545';
  const statusBg = isSuccess ? '#d4edda' : '#f8d7da';

  return (
    <Card style={[styles.container, { borderLeftColor: statusColor }]}>
      <View style={styles.header}>
        <Text style={styles.serviceName}>{result.serviceName}</Text>
        <Text style={styles.timestamp}>
          {new Date(result.timestamp).toLocaleTimeString()}
        </Text>
      </View>

      <Text style={styles.endpoint}>{result.endpoint}</Text>

      <View style={[styles.statusContainer, { backgroundColor: statusBg }]}>
        <Text style={[styles.status, { color: statusColor }]}>
          {isSuccess ? '✅ Success' : '❌ Failed'}
          {result.status && ` (${result.status})`}
        </Text>
        <Text style={styles.responseTime}>{result.responseTime}ms</Text>
      </View>

      {result.error && (
        <Text style={styles.error} numberOfLines={3}>
          {result.error}
        </Text>
      )}

      {result.data && typeof result.data === 'object' && (
        <Text style={styles.data} numberOfLines={3}>
          {JSON.stringify(result.data, null, 2)}
        </Text>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    borderLeftWidth: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#343a40',
    textTransform: 'capitalize',
  },
  timestamp: {
    fontSize: 12,
    color: '#6c757d',
  },
  endpoint: {
    fontSize: 14,
    color: '#495057',
    fontFamily: 'monospace',
    marginBottom: 8,
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  status: {
    fontSize: 14,
    fontWeight: '600',
  },
  responseTime: {
    fontSize: 12,
    color: '#6c757d',
  },
  error: {
    fontSize: 12,
    color: '#dc3545',
    backgroundColor: '#f8f9fa',
    padding: 8,
    borderRadius: 4,
    fontFamily: 'monospace',
  },
  data: {
    fontSize: 12,
    color: '#495057',
    backgroundColor: '#f8f9fa',
    padding: 8,
    borderRadius: 4,
    fontFamily: 'monospace',
  },
});