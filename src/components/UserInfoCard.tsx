import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { User } from '../contexts/AuthContext';
import { Card } from './Card';

interface UserInfoCardProps {
  user: User;
}

export function UserInfoCard({ user }: UserInfoCardProps) {
  return (
    <Card>
      <Text style={styles.title}>Authenticated User</Text>
      
      <View style={styles.infoRow}>
        <Text style={styles.label}>Name:</Text>
        <Text style={styles.value}>{user.name || 'N/A'}</Text>
      </View>
      
      <View style={styles.infoRow}>
        <Text style={styles.label}>Email:</Text>
        <Text style={styles.value}>{user.email || 'N/A'}</Text>
      </View>
      
      <View style={styles.infoRow}>
        <Text style={styles.label}>Username:</Text>
        <Text style={styles.value}>{user.username || 'N/A'}</Text>
      </View>
      
      {user.roles && user.roles.length > 0 && (
        <View style={styles.infoRow}>
          <Text style={styles.label}>Roles:</Text>
          <Text style={styles.value}>{user.roles.join(', ')}</Text>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#343a40',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#495057',
    width: 80,
  },
  value: {
    fontSize: 14,
    color: '#6c757d',
    flex: 1,
  },
});