// app/index.tsx
import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { ThemedText } from '@/components/ThemedText';

export default function Index() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        // Use replace to prevent back navigation
        router.replace('/(tabs)/chat');
      } else {
        router.replace('/(auth)/login');
      }
    }
  }, [isAuthenticated, isLoading, router]);

  // Show loading screen
  return (
    <View style={{ 
      flex: 1, 
      justifyContent: 'center', 
      alignItems: 'center', 
      backgroundColor: '#000' 
    }}>
      <ThemedText style={{ fontSize: 32, marginBottom: 20, color: '#fff' }}>
        OZZU
      </ThemedText>
      <ActivityIndicator size="large" color="#667eea" />
      <ThemedText style={{ fontSize: 14, color: '#666', marginTop: 10 }}>
        {isLoading ? 'Checking authentication...' : 'Navigating...'}
      </ThemedText>
    </View>
  );
}
